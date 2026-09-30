package payments

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

type Payment struct {
	ID                  string    `json:"id"`
	AuctionID           string    `json:"auction_id"`
	LotID               string    `json:"lot_id"`
	LotNumber           string    `json:"lot_number,omitempty"`
	CropName            string    `json:"crop_name,omitempty"`
	BuyerID             string    `json:"buyer_id"`
	BuyerName           string    `json:"buyer_name,omitempty"`
	FarmerID            string    `json:"farmer_id"`
	FarmerName          string    `json:"farmer_name,omitempty"`
	Amount              float64   `json:"amount"`
	Status              string    `json:"status"` // PENDING, PAID, SETTLED
	SimulatedGatewayRef string    `json:"simulated_gateway_ref"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type ProcessPaymentRequest struct {
	PaymentID string `json:"payment_id"`
	Action    string `json:"action"` // "PAY" or "SETTLE"
}

func RegisterRoutes(r chi.Router) {
	r.Get("/payments", ListPaymentsHandler)
	r.Get("/payments/{id}", GetPaymentHandler)
	r.Post("/payments/process", ProcessPaymentHandler)
}

func ListPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	role := r.URL.Query().Get("role")

	query := `
		SELECT p.id, p.auction_id, p.lot_id, l.lot_number, l.crop_name,
		       p.buyer_id, b.full_name, p.farmer_id, f.full_name,
		       p.amount, p.status, p.simulated_gateway_ref, p.created_at, p.updated_at
		FROM payments p
		JOIN lots l ON p.lot_id = l.id
		LEFT JOIN profiles b ON p.buyer_id = b.id
		LEFT JOIN profiles f ON p.farmer_id = f.id
		WHERE 1=1`

	var args []interface{}
	if userID != "" {
		if role == "BUYER" {
			query += " AND p.buyer_id = ?"
			args = append(args, userID)
		} else if role == "FARMER" {
			query += " AND p.farmer_id = ?"
			args = append(args, userID)
		} else {
			query += " AND (p.buyer_id = ? OR p.farmer_id = ?)"
			args = append(args, userID, userID)
		}
	}

	query += " ORDER BY p.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query payments: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	payments := make([]Payment, 0)
	for rows.Next() {
		var pay Payment
		var bName, fName sql.NullString
		if err := rows.Scan(&pay.ID, &pay.AuctionID, &pay.LotID, &pay.LotNumber, &pay.CropName,
			&pay.BuyerID, &bName, &pay.FarmerID, &fName,
			&pay.Amount, &pay.Status, &pay.SimulatedGatewayRef, &pay.CreatedAt, &pay.UpdatedAt); err == nil {

			if bName.Valid {
				pay.BuyerName = bName.String
			}
			if fName.Valid {
				pay.FarmerName = fName.String
			}
			payments = append(payments, pay)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payments)
}

func GetPaymentHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var pay Payment
	var bName, fName sql.NullString

	err := database.DB.QueryRow(`
		SELECT p.id, p.auction_id, p.lot_id, l.lot_number, l.crop_name,
		       p.buyer_id, b.full_name, p.farmer_id, f.full_name,
		       p.amount, p.status, p.simulated_gateway_ref, p.created_at, p.updated_at
		FROM payments p
		JOIN lots l ON p.lot_id = l.id
		LEFT JOIN profiles b ON p.buyer_id = b.id
		LEFT JOIN profiles f ON p.farmer_id = f.id
		WHERE p.id = ? OR p.auction_id = ?`, id, id).
		Scan(&pay.ID, &pay.AuctionID, &pay.LotID, &pay.LotNumber, &pay.CropName,
			&pay.BuyerID, &bName, &pay.FarmerID, &fName,
			&pay.Amount, &pay.Status, &pay.SimulatedGatewayRef, &pay.CreatedAt, &pay.UpdatedAt)

	if err != nil {
		http.Error(w, "Payment not found", http.StatusNotFound)
		return
	}

	if bName.Valid {
		pay.BuyerName = bName.String
	}
	if fName.Valid {
		pay.FarmerName = fName.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pay)
}

func ProcessPaymentHandler(w http.ResponseWriter, r *http.Request) {
	var req ProcessPaymentRequest
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

	var currentStatus, lotID, buyerID, farmerID string
	var amount float64

	err = tx.QueryRow(`
		SELECT status, lot_id, buyer_id, farmer_id, amount 
		FROM payments WHERE id = ?`, req.PaymentID).
		Scan(&currentStatus, &lotID, &buyerID, &farmerID, &amount)

	if err != nil {
		http.Error(w, "Payment record not found", http.StatusNotFound)
		return
	}

	now := time.Now()
	newStatus := currentStatus

	if req.Action == "PAY" {
		if currentStatus != "PENDING" {
			http.Error(w, fmt.Sprintf("Cannot pay. Payment is currently %s", currentStatus), http.StatusBadRequest)
			return
		}
		newStatus = "PAID"

		// Create Shipment in CREATED status
		shipmentID := uuid.New().String()
		trkNum := fmt.Sprintf("TRK-ERD-%d-%04d", time.Now().Year(), time.Now().Unix()%10000)

		var origin string = "Farmer Farm / Warehouse Yard"
		var destination string = "Buyer Processing Unit"

		// Check if lot has a warehouse location
		_ = tx.QueryRow(`
			SELECT w.name || ', ' || w.location 
			FROM lots l JOIN warehouses w ON l.warehouse_id = w.id 
			WHERE l.id = ?`, lotID).Scan(&origin)

		_ = tx.QueryRow(`SELECT location FROM profiles WHERE id = ?`, buyerID).Scan(&destination)

		estDelivery := now.Add(48 * time.Hour)

		_, err = tx.Exec(`
			INSERT INTO shipments (id, payment_id, lot_id, buyer_id, farmer_id, origin, destination, tracking_number, status, current_location, estimated_delivery, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?, ?, ?)`,
			shipmentID, req.PaymentID, lotID, buyerID, farmerID, origin, destination, trkNum, origin, estDelivery, now, now,
		)
		if err != nil {
			http.Error(w, "Failed to create shipment record: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Log lot event
		eventID := uuid.New().String()
		eventDesc := fmt.Sprintf("Payment of ₹%.2f received (Simulated Gateway Ref: %s). Shipment created: %s",
			amount, req.PaymentID, trkNum)
		_, _ = tx.Exec(`
			INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
			VALUES (?, ?, 'PAYMENT', 'Payment Cleared & Shipment Initialized', ?, ?, ?)`,
			eventID, lotID, eventDesc, buyerID, now,
		)

	} else if req.Action == "SETTLE" {
		if currentStatus != "PAID" {
			http.Error(w, fmt.Sprintf("Cannot settle payment. Payment must be PAID first, currently %s", currentStatus), http.StatusBadRequest)
			return
		}
		newStatus = "SETTLED"
	}

	_, err = tx.Exec(`UPDATE payments SET status = ?, updated_at = ? WHERE id = ?`, newStatus, now, req.PaymentID)
	if err != nil {
		http.Error(w, "Failed to update payment status", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit payment transition", http.StatusInternalServerError)
		return
	}

	realtime.BroadcastEvent("PAYMENT_UPDATED", map[string]interface{}{
		"payment_id": req.PaymentID,
		"status":     newStatus,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status":  newStatus,
	})
}
