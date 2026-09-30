package auctions

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

type Auction struct {
	ID                string    `json:"id"`
	LotID             string    `json:"lot_id"`
	LotNumber         string    `json:"lot_number,omitempty"`
	CropName          string    `json:"crop_name,omitempty"`
	Variety           string    `json:"variety,omitempty"`
	QuantityKg        float64   `json:"quantity_kg,omitempty"`
	QualityGrade      string    `json:"quality_grade,omitempty"`
	FarmerID          string    `json:"farmer_id"`
	FarmerName        string    `json:"farmer_name,omitempty"`
	StartingPrice     float64   `json:"starting_price"`
	ReservePrice      float64   `json:"reserve_price"`
	StartTime         time.Time `json:"start_time"`
	EndTime           time.Time `json:"end_time"`
	CurrentBid        float64   `json:"current_bid"`
	HighestBidderID   *string   `json:"highest_bidder_id,omitempty"`
	HighestBidderName *string   `json:"highest_bidder_name,omitempty"`
	Status            string    `json:"status"` // SCHEDULED, LIVE, ENDED, SOLD, UNSOLD
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	Bids              []Bid     `json:"bids,omitempty"`
}

type Bid struct {
	ID          string    `json:"id"`
	AuctionID   string    `json:"auction_id"`
	BuyerID     string    `json:"buyer_id"`
	BuyerName   string    `json:"buyer_name"`
	Amount      float64   `json:"amount"`
	IsWinning   bool      `json:"is_winning"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateAuctionRequest struct {
	LotID         string  `json:"lot_id"`
	FarmerID      string  `json:"farmer_id"`
	StartingPrice float64 `json:"starting_price"`
	ReservePrice  float64 `json:"reserve_price"`
	DurationMins  int     `json:"duration_mins"`
}

type PlaceBidRequest struct {
	BuyerID   string  `json:"buyer_id"`
	BuyerName string  `json:"buyer_name"`
	Amount    float64 `json:"amount"`
}

func RegisterRoutes(r chi.Router) {
	r.Get("/auctions", ListAuctionsHandler)
	r.Post("/auctions", CreateAuctionHandler)
	r.Get("/auctions/{id}", GetAuctionHandler)
	r.Post("/auctions/{id}/bids", PlaceBidHandler)
	r.Post("/auctions/{id}/close", CloseAuctionHandler)
}

func CreateAuctionHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateAuctionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.LotID == "" || req.StartingPrice <= 0 {
		http.Error(w, "Lot ID and positive Starting Price are required", http.StatusBadRequest)
		return
	}

	if req.DurationMins <= 0 {
		req.DurationMins = 60 // 1 hour default
	}

	auctionID := uuid.New().String()
	now := time.Now()
	startTime := now
	endTime := now.Add(time.Duration(req.DurationMins) * time.Minute)

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO auctions (id, lot_id, farmer_id, starting_price, reserve_price, start_time, end_time, current_bid, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LIVE', ?, ?)`,
		auctionID, req.LotID, req.FarmerID, req.StartingPrice, req.ReservePrice, startTime, endTime, req.StartingPrice, now, now,
	)
	if err != nil {
		http.Error(w, "Failed to create auction: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update Lot status to AUCTION
	_, err = tx.Exec(`UPDATE lots SET status = 'AUCTION', current_price = ?, updated_at = ? WHERE id = ?`,
		req.StartingPrice, now, req.LotID)
	if err != nil {
		http.Error(w, "Failed to update lot status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert lot event
	eventID := uuid.New().String()
	eventDesc := fmt.Sprintf("Auction listed at starting price ₹%.2f/kg (Reserve: ₹%.2f/kg)", req.StartingPrice, req.ReservePrice)
	_, err = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, 'AUCTION', 'Live Online Auction Created', ?, ?, ?)`,
		eventID, req.LotID, eventDesc, req.FarmerID, now,
	)
	if err != nil {
		http.Error(w, "Failed to record event log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit auction transaction", http.StatusInternalServerError)
		return
	}

	auc := Auction{
		ID:            auctionID,
		LotID:         req.LotID,
		FarmerID:      req.FarmerID,
		StartingPrice: req.StartingPrice,
		ReservePrice:  req.ReservePrice,
		StartTime:     startTime,
		EndTime:       endTime,
		CurrentBid:    req.StartingPrice,
		Status:        "LIVE",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	realtime.BroadcastEvent("AUCTION_CREATED", auc)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(auc)
}

func ListAuctionsHandler(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	query := `
		SELECT a.id, a.lot_id, l.lot_number, l.crop_name, l.variety, l.quantity_kg, l.quality_grade,
		       a.farmer_id, p.full_name, a.starting_price, a.reserve_price, a.start_time, a.end_time,
		       a.current_bid, a.highest_bidder_id, a.highest_bidder_name, a.status, a.created_at, a.updated_at
		FROM auctions a
		JOIN lots l ON a.lot_id = l.id
		LEFT JOIN profiles p ON a.farmer_id = p.id
		WHERE 1=1`

	var args []interface{}
	if status != "" {
		query += " AND a.status = ?"
		args = append(args, status)
	}

	query += " ORDER BY a.end_time ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query auctions: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	auctions := make([]Auction, 0)
	for rows.Next() {
		var a Auction
		var farmerName, hbID, hbName sql.NullString
		if err := rows.Scan(&a.ID, &a.LotID, &a.LotNumber, &a.CropName, &a.Variety, &a.QuantityKg, &a.QualityGrade,
			&a.FarmerID, &farmerName, &a.StartingPrice, &a.ReservePrice, &a.StartTime, &a.EndTime,
			&a.CurrentBid, &hbID, &hbName, &a.Status, &a.CreatedAt, &a.UpdatedAt); err == nil {

			if farmerName.Valid {
				a.FarmerName = farmerName.String
			}
			if hbID.Valid {
				str := hbID.String
				a.HighestBidderID = &str
			}
			if hbName.Valid {
				str := hbName.String
				a.HighestBidderName = &str
			}
			auctions = append(auctions, a)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(auctions)
}

func GetAuctionHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var a Auction
	var farmerName, hbID, hbName sql.NullString

	err := database.DB.QueryRow(`
		SELECT a.id, a.lot_id, l.lot_number, l.crop_name, l.variety, l.quantity_kg, l.quality_grade,
		       a.farmer_id, p.full_name, a.starting_price, a.reserve_price, a.start_time, a.end_time,
		       a.current_bid, a.highest_bidder_id, a.highest_bidder_name, a.status, a.created_at, a.updated_at
		FROM auctions a
		JOIN lots l ON a.lot_id = l.id
		LEFT JOIN profiles p ON a.farmer_id = p.id
		WHERE a.id = ? OR a.lot_id = ?`, id, id).
		Scan(&a.ID, &a.LotID, &a.LotNumber, &a.CropName, &a.Variety, &a.QuantityKg, &a.QualityGrade,
			&a.FarmerID, &farmerName, &a.StartingPrice, &a.ReservePrice, &a.StartTime, &a.EndTime,
			&a.CurrentBid, &hbID, &hbName, &a.Status, &a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		http.Error(w, "Auction not found", http.StatusNotFound)
		return
	}

	if farmerName.Valid {
		a.FarmerName = farmerName.String
	}
	if hbID.Valid {
		str := hbID.String
		a.HighestBidderID = &str
	}
	if hbName.Valid {
		str := hbName.String
		a.HighestBidderName = &str
	}

	// Fetch bids history
	bidRows, err := database.DB.Query(`
		SELECT id, auction_id, buyer_id, buyer_name, amount, is_winning, created_at
		FROM bids WHERE auction_id = ? ORDER BY created_at DESC`, a.ID)

	if err == nil {
		defer bidRows.Close()
		bids := make([]Bid, 0)
		for bidRows.Next() {
			var b Bid
			if err := bidRows.Scan(&b.ID, &b.AuctionID, &b.BuyerID, &b.BuyerName, &b.Amount, &b.IsWinning, &b.CreatedAt); err == nil {
				bids = append(bids, b)
			}
		}
		a.Bids = bids
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(a)
}

func PlaceBidHandler(w http.ResponseWriter, r *http.Request) {
	auctionID := chi.URLParam(r, "id")
	var req PlaceBidRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.BuyerID == "" || req.Amount <= 0 {
		http.Error(w, "Buyer ID and positive Bid Amount are required", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var currentBid, startingPrice float64
	var status string
	var endTime time.Time

	// Lock auction record for atomic validation
	err = tx.QueryRow(`
		SELECT current_bid, starting_price, status, end_time 
		FROM auctions WHERE id = ?`, auctionID).
		Scan(&currentBid, &startingPrice, &status, &endTime)

	if err != nil {
		http.Error(w, "Auction not found", http.StatusNotFound)
		return
	}

	// Validation checks
	if status != "LIVE" {
		http.Error(w, fmt.Sprintf("Cannot place bid. Auction status is %s", status), http.StatusBadRequest)
		return
	}

	if time.Now().After(endTime) {
		http.Error(w, "Auction has already ended", http.StatusBadRequest)
		return
	}

	if req.Amount <= currentBid {
		http.Error(w, fmt.Sprintf("Bid amount ₹%.2f must be strictly higher than current bid ₹%.2f", req.Amount, currentBid), http.StatusBadRequest)
		return
	}

	if req.Amount < startingPrice {
		http.Error(w, fmt.Sprintf("Bid amount ₹%.2f cannot be less than starting price ₹%.2f", req.Amount, startingPrice), http.StatusBadRequest)
		return
	}

	now := time.Now()
	bidID := uuid.New().String()

	// Insert bid record
	_, err = tx.Exec(`
		INSERT INTO bids (id, auction_id, buyer_id, buyer_name, amount, is_winning, created_at)
		VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
		bidID, auctionID, req.BuyerID, req.BuyerName, req.Amount, now,
	)
	if err != nil {
		http.Error(w, "Failed to record bid: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update auction current bid & highest bidder
	newEndTime := endTime
	extended := false

	// ANTI-SNIPING ENGINE: If bid arrives in final 30 seconds before end_time, extend auction by 30 seconds
	timeLeft := time.Until(endTime)
	if timeLeft > 0 && timeLeft <= 30*time.Second {
		newEndTime = now.Add(30 * time.Second)
		extended = true
	}

	_, err = tx.Exec(`
		UPDATE auctions SET current_bid = ?, highest_bidder_id = ?, highest_bidder_name = ?, end_time = ?, updated_at = ?
		WHERE id = ?`,
		req.Amount, req.BuyerID, req.BuyerName, newEndTime, now, auctionID,
	)
	if err != nil {
		http.Error(w, "Failed to update auction bid: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit bid transaction", http.StatusInternalServerError)
		return
	}

	bidObj := Bid{
		ID:        bidID,
		AuctionID: auctionID,
		BuyerID:   req.BuyerID,
		BuyerName: req.BuyerName,
		Amount:    req.Amount,
		IsWinning: false,
		CreatedAt: now,
	}

	// Broadcast Realtime Event to all connected tabs
	realtime.BroadcastEvent("BID_PLACED", map[string]interface{}{
		"auction_id":          auctionID,
		"bid":                 bidObj,
		"current_bid":         req.Amount,
		"highest_bidder_id":   req.BuyerID,
		"highest_bidder_name": req.BuyerName,
		"end_time":            newEndTime,
		"anti_sniping_extended": extended,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":               true,
		"bid":                   bidObj,
		"current_bid":           req.Amount,
		"end_time":              newEndTime,
		"anti_sniping_extended": extended,
	})
}

func CloseAuctionHandler(w http.ResponseWriter, r *http.Request) {
	auctionID := chi.URLParam(r, "id")

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var lotID, farmerID string
	var currentBid, reservePrice float64
	var hbID, hbName sql.NullString

	err = tx.QueryRow(`
		SELECT lot_id, farmer_id, current_bid, reserve_price, highest_bidder_id, highest_bidder_name
		FROM auctions WHERE id = ?`, auctionID).
		Scan(&lotID, &farmerID, &currentBid, &reservePrice, &hbID, &hbName)

	if err != nil {
		http.Error(w, "Auction not found", http.StatusNotFound)
		return
	}

	newStatus := "UNSOLD"
	var paymentID string
	now := time.Now()

	if hbID.Valid && currentBid >= reservePrice {
		newStatus = "SOLD"

		// Mark highest bid as winning
		_, _ = tx.Exec(`UPDATE bids SET is_winning = TRUE WHERE auction_id = ? AND buyer_id = ? AND amount = ?`,
			auctionID, hbID.String, currentBid)

		// Create Payment record (PENDING)
		paymentID = uuid.New().String()
		simRef := fmt.Sprintf("SIM-PAY-%d-%05d", time.Now().Year(), time.Now().Unix()%100000)

		var quantityKg float64
		_ = tx.QueryRow("SELECT quantity_kg FROM lots WHERE id = ?", lotID).Scan(&quantityKg)
		totalAmount := currentBid * quantityKg

		_, err = tx.Exec(`
			INSERT INTO payments (id, auction_id, lot_id, buyer_id, farmer_id, amount, status, simulated_gateway_ref, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
			paymentID, auctionID, lotID, hbID.String, farmerID, totalAmount, simRef, now, now,
		)
		if err != nil {
			http.Error(w, "Failed to create payment record: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Update Lot status to SOLD
		_, _ = tx.Exec("UPDATE lots SET status = 'SOLD', current_price = ?, updated_at = ? WHERE id = ?", currentBid, now, lotID)

		// Log lot event
		eventID := uuid.New().String()
		eventDesc := fmt.Sprintf("Auction won by %s at ₹%.2f/kg. Total Amount: ₹%.2f. Payment pending.",
			hbName.String, currentBid, totalAmount)
		_, _ = tx.Exec(`
			INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
			VALUES (?, ?, 'SOLD', 'Auction Sold to Buyer', ?, ?, ?)`,
			eventID, lotID, eventDesc, hbID.String, now,
		)
	} else {
		_, _ = tx.Exec("UPDATE lots SET status = 'STORED', updated_at = ? WHERE id = ?", now, lotID)
	}

	_, err = tx.Exec("UPDATE auctions SET status = ?, updated_at = ? WHERE id = ?", newStatus, now, auctionID)
	if err != nil {
		http.Error(w, "Failed to close auction", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit auction close", http.StatusInternalServerError)
		return
	}

	realtime.BroadcastEvent("AUCTION_CLOSED", map[string]interface{}{
		"auction_id": auctionID,
		"status":     newStatus,
		"payment_id": paymentID,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"status":     newStatus,
		"payment_id": paymentID,
	})
}
