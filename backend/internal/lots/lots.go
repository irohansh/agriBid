package lots

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"agribid-backend/internal/database"
	"agribid-backend/internal/realtime"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

var seqMu sync.Mutex

type Lot struct {
	ID           string     `json:"id"`
	LotNumber    string     `json:"lot_number"`
	FarmerID     string     `json:"farmer_id"`
	FarmerName   string     `json:"farmer_name,omitempty"`
	CropID       *string    `json:"crop_id,omitempty"`
	CropName     string     `json:"crop_name"`
	Variety      string     `json:"variety"`
	QuantityKg   float64    `json:"quantity_kg"`
	HarvestDate  string     `json:"harvest_date"`
	QualityGrade string     `json:"quality_grade"`
	QualityScore float64    `json:"quality_score"`
	WarehouseID  *string    `json:"warehouse_id,omitempty"`
	CurrentPrice float64    `json:"current_price"`
	Status       string     `json:"status"` // HARVESTED, QUALITY_VERIFIED, STORED, AUCTION, SOLD, COMPLETED
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Events       []LotEvent `json:"events,omitempty"`
}

type LotEvent struct {
	ID          string    `json:"id"`
	LotID       string    `json:"lot_id"`
	Stage       string    `json:"stage"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	UpdatedBy   *string   `json:"updated_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateLotRequest struct {
	FarmerID     string  `json:"farmer_id"`
	CropName     string  `json:"crop_name"`
	Variety      string  `json:"variety"`
	QuantityKg   float64 `json:"quantity_kg"`
	HarvestDate  string  `json:"harvest_date"`
	QualityGrade string  `json:"quality_grade"`
	QualityScore float64 `json:"quality_score"`
	CurrentPrice float64 `json:"current_price"`
}

type UpdateStatusRequest struct {
	Status      string `json:"status"`
	Title       string `json:"title"`
	Description string `json:"description"`
	UpdatedBy   string `json:"updated_by"`
}

func RegisterRoutes(r chi.Router) {
	r.Get("/lots", ListLotsHandler)
	r.Post("/lots", CreateLotHandler)
	r.Get("/lots/{id}", GetLotHandler)
	r.Post("/lots/{id}/status", UpdateLotStatusHandler)
}

func GenerateLotNumber(cropName string) string {
	seqMu.Lock()
	defer seqMu.Unlock()

	cropCode := "CRP"
	upper := strings.ToUpper(cropName)
	if strings.Contains(upper, "TURMERIC") || strings.Contains(upper, "TUR") {
		cropCode = "TUR"
	} else if strings.Contains(upper, "BANANA") || strings.Contains(upper, "BAN") {
		cropCode = "BAN"
	} else if strings.Contains(upper, "SUGAR") || strings.Contains(upper, "SUG") {
		cropCode = "SUG"
	} else if strings.Contains(upper, "GROUND") || strings.Contains(upper, "GND") {
		cropCode = "GND"
	} else if strings.Contains(upper, "COTTON") || strings.Contains(upper, "COT") {
		cropCode = "COT"
	}

	year := time.Now().Year()

	var count int
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM lots").Scan(&count)
	nextSeq := count + 1

	return fmt.Sprintf("ERD-%s-%d-%04d", cropCode, year, nextSeq)
}

func CreateLotHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateLotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.FarmerID == "" || req.CropName == "" || req.QuantityKg <= 0 {
		http.Error(w, "Farmer ID, Crop Name, and positive Quantity are required", http.StatusBadRequest)
		return
	}

	lotID := uuid.New().String()
	lotNumber := GenerateLotNumber(req.CropName)
	now := time.Now()

	if req.QualityGrade == "" {
		req.QualityGrade = "PENDING"
	}
	if req.HarvestDate == "" {
		req.HarvestDate = now.Format("2006-01-02")
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Failed to start database transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO lots (id, lot_number, farmer_id, crop_name, variety, quantity_kg, harvest_date, quality_grade, quality_score, current_price, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HARVESTED', ?, ?)`,
		lotID, lotNumber, req.FarmerID, req.CropName, req.Variety, req.QuantityKg, req.HarvestDate, req.QualityGrade, req.QualityScore, req.CurrentPrice, now, now,
	)
	if err != nil {
		http.Error(w, "Failed to create crop lot: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert initial lot event
	eventID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, 'HARVESTED', 'Produce Harvested', ?, ?, ?)`,
		eventID, lotID, fmt.Sprintf("Harvested %v kg of %s (%s)", req.QuantityKg, req.CropName, req.Variety), req.FarmerID, now,
	)
	if err != nil {
		http.Error(w, "Failed to record lot event: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit lot transaction", http.StatusInternalServerError)
		return
	}

	createdLot := Lot{
		ID:           lotID,
		LotNumber:    lotNumber,
		FarmerID:     req.FarmerID,
		CropName:     req.CropName,
		Variety:      req.Variety,
		QuantityKg:   req.QuantityKg,
		HarvestDate:  req.HarvestDate,
		QualityGrade: req.QualityGrade,
		QualityScore: req.QualityScore,
		CurrentPrice: req.CurrentPrice,
		Status:       "HARVESTED",
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	realtime.BroadcastEvent("LOT_CREATED", createdLot)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdLot)
}

func ListLotsHandler(w http.ResponseWriter, r *http.Request) {
	farmerID := r.URL.Query().Get("farmer_id")
	status := r.URL.Query().Get("status")
	crop := r.URL.Query().Get("crop")

	query := `
		SELECT l.id, l.lot_number, l.farmer_id, p.full_name, l.crop_id, l.crop_name, l.variety, 
		       l.quantity_kg, l.harvest_date, l.quality_grade, l.quality_score, l.warehouse_id, 
		       l.current_price, l.status, l.created_at, l.updated_at
		FROM lots l
		LEFT JOIN profiles p ON l.farmer_id = p.id
		WHERE 1=1`

	var args []interface{}
	if farmerID != "" {
		query += " AND l.farmer_id = ?"
		args = append(args, farmerID)
	}
	if status != "" {
		query += " AND l.status = ?"
		args = append(args, status)
	}
	if crop != "" {
		query += " AND l.crop_name LIKE ?"
		args = append(args, "%"+crop+"%")
	}

	query += " ORDER BY l.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query lots: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	lots := make([]Lot, 0)
	for rows.Next() {
		var l Lot
		var farmerName sql.NullString
		var cropID, whID sql.NullString
		if err := rows.Scan(&l.ID, &l.LotNumber, &l.FarmerID, &farmerName, &cropID, &l.CropName, &l.Variety,
			&l.QuantityKg, &l.HarvestDate, &l.QualityGrade, &l.QualityScore, &whID,
			&l.CurrentPrice, &l.Status, &l.CreatedAt, &l.UpdatedAt); err == nil {
			if farmerName.Valid {
				l.FarmerName = farmerName.String
			}
			if cropID.Valid {
				str := cropID.String
				l.CropID = &str
			}
			if whID.Valid {
				str := whID.String
				l.WarehouseID = &str
			}
			lots = append(lots, l)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lots)
}

func GetLotHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var l Lot
	var farmerName sql.NullString
	var cropID, whID sql.NullString

	err := database.DB.QueryRow(`
		SELECT l.id, l.lot_number, l.farmer_id, p.full_name, l.crop_id, l.crop_name, l.variety, 
		       l.quantity_kg, l.harvest_date, l.quality_grade, l.quality_score, l.warehouse_id, 
		       l.current_price, l.status, l.created_at, l.updated_at
		FROM lots l
		LEFT JOIN profiles p ON l.farmer_id = p.id
		WHERE l.id = ? OR l.lot_number = ?`, id, id).
		Scan(&l.ID, &l.LotNumber, &l.FarmerID, &farmerName, &cropID, &l.CropName, &l.Variety,
			&l.QuantityKg, &l.HarvestDate, &l.QualityGrade, &l.QualityScore, &whID,
			&l.CurrentPrice, &l.Status, &l.CreatedAt, &l.UpdatedAt)

	if err != nil {
		http.Error(w, "Lot not found", http.StatusNotFound)
		return
	}

	if farmerName.Valid {
		l.FarmerName = farmerName.String
	}
	if cropID.Valid {
		str := cropID.String
		l.CropID = &str
	}
	if whID.Valid {
		str := whID.String
		l.WarehouseID = &str
	}

	// Fetch Events for Digital Twin Timeline
	eventRows, err := database.DB.Query(`
		SELECT id, lot_id, stage, title, description, updated_by, created_at
		FROM lot_events WHERE lot_id = ? ORDER BY created_at ASC`, l.ID)
	if err == nil {
		defer eventRows.Close()
		events := make([]LotEvent, 0)
		for eventRows.Next() {
			var ev LotEvent
			var updatedBy sql.NullString
			if err := eventRows.Scan(&ev.ID, &ev.LotID, &ev.Stage, &ev.Title, &ev.Description, &updatedBy, &ev.CreatedAt); err == nil {
				if updatedBy.Valid {
					str := updatedBy.String
					ev.UpdatedBy = &str
				}
				events = append(events, ev)
			}
		}
		l.Events = events
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

func UpdateLotStatusHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	now := time.Now()
	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE lots SET status = ?, updated_at = ? WHERE id = ?", req.Status, now, id)
	if err != nil {
		http.Error(w, "Failed to update lot status", http.StatusInternalServerError)
		return
	}

	eventID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		eventID, id, req.Status, req.Title, req.Description, req.UpdatedBy, now,
	)
	if err != nil {
		http.Error(w, "Failed to insert lot event", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit status change", http.StatusInternalServerError)
		return
	}

	realtime.BroadcastEvent("LOT_STATUS_UPDATED", map[string]interface{}{
		"lot_id": id,
		"status": req.Status,
		"title":  req.Title,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status":  req.Status,
	})
}
