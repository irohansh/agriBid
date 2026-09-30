package warehouses

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"agribid-backend/internal/database"
	"agribid-backend/internal/realtime"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Warehouse struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Location          string   `json:"location"`
	Capacity          float64  `json:"capacity"`
	AvailableCapacity float64  `json:"available_capacity"`
	PricePerKgPerDay  float64  `json:"price_per_kg_per_day"`
	Temperature       float64  `json:"temperature"`
	Humidity          float64  `json:"humidity"`
	SupportedCrops    []string `json:"supported_crops"`
	CreatedAt         time.Time`json:"created_at"`
}

type ReservationRequest struct {
	WarehouseID       string  `json:"warehouse_id"`
	LotID             string  `json:"lot_id"`
	FarmerID          string  `json:"farmer_id"`
	RequestedCapacity float64 `json:"requested_capacity"`
	DurationDays      int     `json:"duration_days"`
}

type ReservationResponse struct {
	Success           bool    `json:"success"`
	ReservationID     string  `json:"reservation_id"`
	WarehouseID       string  `json:"warehouse_id"`
	WarehouseName     string  `json:"warehouse_name"`
	ReservedCapacity  float64 `json:"reserved_capacity"`
	RemainingCapacity float64 `json:"remaining_capacity"`
	TotalCost         float64 `json:"total_cost"`
	Message           string  `json:"message"`
}

func RegisterRoutes(r chi.Router) {
	r.Get("/warehouses", ListWarehousesHandler)
	r.Get("/warehouses/{id}", GetWarehouseHandler)
	r.Post("/warehouses/reserve", ReserveCapacityHandler)
}

func ListWarehousesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(`
		SELECT id, name, location, capacity, available_capacity, price_per_kg_per_day, temperature, humidity, COALESCE(supported_crops,'[]'), created_at
		FROM warehouses ORDER BY name ASC`)
	if err != nil {
		http.Error(w, "Failed to query warehouses: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	warehouses := make([]Warehouse, 0)
	for rows.Next() {
		var wh Warehouse
		var cropsRaw string
		if err := rows.Scan(&wh.ID, &wh.Name, &wh.Location, &wh.Capacity, &wh.AvailableCapacity, &wh.PricePerKgPerDay, &wh.Temperature, &wh.Humidity, &cropsRaw, &wh.CreatedAt); err == nil {
			wh.SupportedCrops = parseCropsJSON(cropsRaw)
			warehouses = append(warehouses, wh)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(warehouses)
}

func GetWarehouseHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var wh Warehouse
	var cropsRaw string
	err := database.DB.QueryRow(`
		SELECT id, name, location, capacity, available_capacity, price_per_kg_per_day, temperature, humidity, COALESCE(supported_crops,'[]'), created_at
		FROM warehouses WHERE id = ?`, id).
		Scan(&wh.ID, &wh.Name, &wh.Location, &wh.Capacity, &wh.AvailableCapacity, &wh.PricePerKgPerDay, &wh.Temperature, &wh.Humidity, &cropsRaw, &wh.CreatedAt)

	if err != nil {
		http.Error(w, "Warehouse not found", http.StatusNotFound)
		return
	}

	wh.SupportedCrops = parseCropsJSON(cropsRaw)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wh)
}

func ReserveCapacityHandler(w http.ResponseWriter, r *http.Request) {
	var req ReservationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.WarehouseID == "" || req.LotID == "" || req.RequestedCapacity <= 0 {
		http.Error(w, "Warehouse ID, Lot ID, and positive Requested Capacity are required", http.StatusBadRequest)
		return
	}

	if req.DurationDays <= 0 {
		req.DurationDays = 7 // Default 7 days
	}

	// ATOMIC TRANSACTION FOR OVERBOOKING PREVENTION
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var available float64
	var whName string
	var pricePerKg float64

	// Lock warehouse record for update checking
	err = tx.QueryRow(`SELECT available_capacity, name, price_per_kg_per_day FROM warehouses WHERE id = ?`, req.WarehouseID).
		Scan(&available, &whName, &pricePerKg)

	if err != nil {
		http.Error(w, "Warehouse not found", http.StatusNotFound)
		return
	}

	// STRICT OVERBOOKING PREVENTION CHECK
	if req.RequestedCapacity > available {
		errMsg := fmt.Sprintf("Overbooking Error: Requested %.2f kg exceeds available capacity %.2f kg at %s",
			req.RequestedCapacity, available, whName)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	// Deduct capacity
	newAvailable := available - req.RequestedCapacity
	_, err = tx.Exec(`UPDATE warehouses SET available_capacity = ? WHERE id = ?`, newAvailable, req.WarehouseID)
	if err != nil {
		http.Error(w, "Failed to update warehouse capacity: "+err.Error(), http.StatusInternalServerError)
		return
	}

	totalCost := req.RequestedCapacity * pricePerKg * float64(req.DurationDays)
	resID := uuid.New().String()
	now := time.Now()

	_, err = tx.Exec(`
		INSERT INTO warehouse_reservations (id, warehouse_id, lot_id, farmer_id, reserved_capacity, total_cost, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
		resID, req.WarehouseID, req.LotID, req.FarmerID, req.RequestedCapacity, totalCost, now,
	)
	if err != nil {
		http.Error(w, "Failed to create warehouse reservation: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update lot with warehouse assignment and status
	_, err = tx.Exec(`UPDATE lots SET warehouse_id = ?, status = 'STORED', updated_at = ? WHERE id = ?`,
		req.WarehouseID, now, req.LotID)
	if err != nil {
		http.Error(w, "Failed to update lot status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Log lot event
	eventID := uuid.New().String()
	eventDesc := fmt.Sprintf("Reserved %.2f kg capacity at %s for %d days (Est. cost: ₹%.2f)",
		req.RequestedCapacity, whName, req.DurationDays, totalCost)
	_, err = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, 'STORED', 'Stored in Warehouse', ?, ?, ?)`,
		eventID, req.LotID, eventDesc, req.FarmerID, now,
	)
	if err != nil {
		http.Error(w, "Failed to insert event record: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit warehouse reservation", http.StatusInternalServerError)
		return
	}

	resp := ReservationResponse{
		Success:           true,
		ReservationID:     resID,
		WarehouseID:       req.WarehouseID,
		WarehouseName:     whName,
		ReservedCapacity:  req.RequestedCapacity,
		RemainingCapacity: newAvailable,
		TotalCost:         totalCost,
		Message:           "Warehouse capacity reserved successfully",
	}

	realtime.BroadcastEvent("WAREHOUSE_RESERVED", resp)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func parseCropsJSON(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" {
		return []string{}
	}
	var res []string
	if err := json.Unmarshal([]byte(raw), &res); err == nil {
		return res
	}
	// Fallback split by comma
	parts := strings.Split(raw, ",")
	clean := make([]string, 0)
	for _, p := range parts {
		str := strings.Trim(p, " []'\"")
		if str != "" {
			clean = append(clean, str)
		}
	}
	return clean
}
