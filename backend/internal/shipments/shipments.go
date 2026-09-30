package shipments

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"agribid-backend/internal/database"
	"agribid-backend/internal/realtime"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Shipment struct {
	ID                string    `json:"id"`
	PaymentID         string    `json:"payment_id"`
	LotID             string    `json:"lot_id"`
	LotNumber         string    `json:"lot_number,omitempty"`
	CropName          string    `json:"crop_name,omitempty"`
	BuyerID           string    `json:"buyer_id"`
	BuyerName         string    `json:"buyer_name,omitempty"`
	FarmerID          string    `json:"farmer_id"`
	FarmerName        string    `json:"farmer_name,omitempty"`
	Origin            string    `json:"origin"`
	Destination       string    `json:"destination"`
	TrackingNumber    string    `json:"tracking_number"`
	Status            string    `json:"status"` // CREATED, PICKED_UP, IN_TRANSIT, DELIVERED
	CurrentLocation   string    `json:"current_location"`
	EstimatedDelivery time.Time `json:"estimated_delivery"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type UpdateShipmentRequest struct {
	Status          string `json:"status"` // PICKED_UP, IN_TRANSIT, DELIVERED
	CurrentLocation string `json:"current_location"`
	UpdatedBy       string `json:"updated_by"`
}

func RegisterRoutes(r chi.Router) {
	r.Get("/shipments", ListShipmentsHandler)
	r.Get("/shipments/{id}", GetShipmentHandler)
	r.Post("/shipments/{id}/status", UpdateShipmentStatusHandler)
}

func ListShipmentsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")

	query := `
		SELECT s.id, s.payment_id, s.lot_id, l.lot_number, l.crop_name,
		       s.buyer_id, b.full_name, s.farmer_id, f.full_name,
		       s.origin, s.destination, s.tracking_number, s.status,
		       COALESCE(s.current_location,''), s.estimated_delivery, s.created_at, s.updated_at
		FROM shipments s
		JOIN lots l ON s.lot_id = l.id
		LEFT JOIN profiles b ON s.buyer_id = b.id
		LEFT JOIN profiles f ON s.farmer_id = f.id
		WHERE 1=1`

	var args []interface{}
	if userID != "" {
		query += " AND (s.buyer_id = ? OR s.farmer_id = ?)"
		args = append(args, userID, userID)
	}

	query += " ORDER BY s.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query shipments: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	shipments := make([]Shipment, 0)
	for rows.Next() {
		var sh Shipment
		var bName, fName sql.NullString
		if err := rows.Scan(&sh.ID, &sh.PaymentID, &sh.LotID, &sh.LotNumber, &sh.CropName,
			&sh.BuyerID, &bName, &sh.FarmerID, &fName,
			&sh.Origin, &sh.Destination, &sh.TrackingNumber, &sh.Status,
			&sh.CurrentLocation, &sh.EstimatedDelivery, &sh.CreatedAt, &sh.UpdatedAt); err == nil {

			if bName.Valid {
				sh.BuyerName = bName.String
			}
			if fName.Valid {
				sh.FarmerName = fName.String
			}
			shipments = append(shipments, sh)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shipments)
}

func GetShipmentHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var sh Shipment
	var bName, fName sql.NullString

	err := database.DB.QueryRow(`
		SELECT s.id, s.payment_id, s.lot_id, l.lot_number, l.crop_name,
		       s.buyer_id, b.full_name, s.farmer_id, f.full_name,
		       s.origin, s.destination, s.tracking_number, s.status,
		       COALESCE(s.current_location,''), s.estimated_delivery, s.created_at, s.updated_at
		FROM shipments s
		JOIN lots l ON s.lot_id = l.id
		LEFT JOIN profiles b ON s.buyer_id = b.id
		LEFT JOIN profiles f ON s.farmer_id = f.id
		WHERE s.id = ? OR s.tracking_number = ? OR s.lot_id = ?`, id, id, id).
		Scan(&sh.ID, &sh.PaymentID, &sh.LotID, &sh.LotNumber, &sh.CropName,
			&sh.BuyerID, &bName, &sh.FarmerID, &fName,
			&sh.Origin, &sh.Destination, &sh.TrackingNumber, &sh.Status,
			&sh.CurrentLocation, &sh.EstimatedDelivery, &sh.CreatedAt, &sh.UpdatedAt)

	if err != nil {
		http.Error(w, "Shipment not found", http.StatusNotFound)
		return
	}

	if bName.Valid {
		sh.BuyerName = bName.String
	}
	if fName.Valid {
		sh.FarmerName = fName.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sh)
}

func UpdateShipmentStatusHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req UpdateShipmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var lotID, trackingNo, destination string
	err = tx.QueryRow(`SELECT lot_id, tracking_number, destination FROM shipments WHERE id = ?`, id).
		Scan(&lotID, &trackingNo, &destination)

	if err != nil {
		http.Error(w, "Shipment record not found", http.StatusNotFound)
		return
	}

	now := time.Now()
	location := req.CurrentLocation
	if location == "" {
		if req.Status == "DELIVERED" {
			location = destination
		} else {
			location = "In Transit Depot"
		}
	}

	_, err = tx.Exec(`UPDATE shipments SET status = ?, current_location = ?, updated_at = ? WHERE id = ?`,
		req.Status, location, now, id)
	if err != nil {
		http.Error(w, "Failed to update shipment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert lot event
	eventID := uuid.New().String()
	eventTitle := fmt.Sprintf("Shipment Status: %s", req.Status)
	eventDesc := fmt.Sprintf("Tracking #%s updated to %s (Location: %s)", trackingNo, req.Status, location)
	_, _ = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, 'DELIVERED', ?, ?, ?, ?)`,
		eventID, lotID, eventTitle, eventDesc, req.UpdatedBy, now,
	)

	// If DELIVERED, transition Lot to COMPLETED state!
	if req.Status == "DELIVERED" {
		_, _ = tx.Exec(`UPDATE lots SET status = 'COMPLETED', updated_at = ? WHERE id = ?`, now, lotID)

		compEventID := uuid.New().String()
		_, _ = tx.Exec(`
			INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
			VALUES (?, ?, 'COMPLETED', 'Crop Lot Lifecycle Completed', 'Final delivery confirmed by buyer. Lot lifecycle closed.', ?, ?)`,
			compEventID, lotID, req.UpdatedBy, now,
		)
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit shipment update", http.StatusInternalServerError)
		return
	}

	realtime.BroadcastEvent("SHIPMENT_UPDATED", map[string]interface{}{
		"shipment_id": id,
		"lot_id":      lotID,
		"status":      req.Status,
		"location":    location,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"status":   req.Status,
		"location": location,
	})
}
