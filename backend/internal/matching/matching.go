package matching

import (
	"encoding/json"
	"net/http"
	"strings"

	"agribid-backend/internal/database"

	"github.com/go-chi/chi/v5"
)

type BuyerMatchRequest struct {
	CropName    string  `json:"crop_name"`
	MinGrade    string  `json:"min_grade"`  // Grade A, Grade B, Premium
	MaxPrice    float64 `json:"max_price"`
	MinQuantity float64 `json:"min_quantity"`
}

type MatchedLot struct {
	LotID         string  `json:"lot_id"`
	LotNumber     string  `json:"lot_number"`
	FarmerName    string  `json:"farmer_name"`
	CropName      string  `json:"crop_name"`
	Variety       string  `json:"variety"`
	QuantityKg    float64 `json:"quantity_kg"`
	QualityGrade  string  `json:"quality_grade"`
	QualityScore  float64 `json:"quality_score"`
	CurrentPrice  float64 `json:"current_price"`
	MatchScore    int     `json:"match_score"` // 0 to 100%
	MatchReasons  []string`json:"match_reasons"`
	Status        string  `json:"status"`
	AuctionID     string  `json:"auction_id,omitempty"`
}

func RegisterRoutes(r chi.Router) {
	r.Post("/buyers/match", MatchBuyerLotsHandler)
}

func MatchBuyerLotsHandler(w http.ResponseWriter, r *http.Request) {
	var req BuyerMatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	rows, err := database.DB.Query(`
		SELECT l.id, l.lot_number, COALESCE(p.full_name,'Farmer'), l.crop_name, l.variety, 
		       l.quantity_kg, l.quality_grade, l.quality_score, l.current_price, l.status,
		       COALESCE(a.id, '')
		FROM lots l
		LEFT JOIN profiles p ON l.farmer_id = p.id
		LEFT JOIN auctions a ON l.id = a.lot_id AND a.status = 'LIVE'
		WHERE l.status IN ('QUALITY_VERIFIED', 'STORED', 'AUCTION')
		ORDER BY l.created_at DESC`)

	if err != nil {
		http.Error(w, "Failed to query matching lots: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	matched := make([]MatchedLot, 0)
	for rows.Next() {
		var m MatchedLot
		if err := rows.Scan(&m.LotID, &m.LotNumber, &m.FarmerName, &m.CropName, &m.Variety,
			&m.QuantityKg, &m.QualityGrade, &m.QualityScore, &m.CurrentPrice, &m.Status, &m.AuctionID); err == nil {

			score := 0
			reasons := make([]string, 0)

			// Crop match (40%)
			if req.CropName == "" || strings.EqualFold(req.CropName, m.CropName) || strings.Contains(strings.ToLower(m.CropName), strings.ToLower(req.CropName)) {
				score += 40
				reasons = append(reasons, "Exact Crop Match ("+m.CropName+")")
			}

			// Grade compatibility (20%)
			if req.MinGrade == "" || isGradeCompatible(m.QualityGrade, req.MinGrade) {
				score += 20
				reasons = append(reasons, "Grade Requirement Satisfied ("+m.QualityGrade+")")
			}

			// Price compatibility (20%)
			if req.MaxPrice <= 0 || m.CurrentPrice <= req.MaxPrice {
				score += 20
				reasons = append(reasons, "Price within Buyer Budget (₹"+jsonFloat(m.CurrentPrice)+"/kg)")
			}

			// Quantity compatibility (20%)
			if req.MinQuantity <= 0 || m.QuantityKg >= req.MinQuantity {
				score += 20
				reasons = append(reasons, "Available Quantity ("+jsonFloat(m.QuantityKg)+" kg) meets volume requirement")
			}

			m.MatchScore = score
			m.MatchReasons = reasons

			if score >= 40 {
				matched = append(matched, m)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(matched)
}

func isGradeCompatible(actualGrade string, minGrade string) bool {
	if minGrade == "" {
		return true
	}
	actual := strings.ToUpper(actualGrade)
	min := strings.ToUpper(minGrade)
	if actual == "PREMIUM" || min == "GRADE B" || min == "GRADE C" {
		return true
	}
	if actual == "GRADE A" && (min == "GRADE A" || min == "GRADE B" || min == "GRADE C") {
		return true
	}
	return actual == min
}

func jsonFloat(val float64) string {
	b, _ := json.Marshal(val)
	return string(b)
}
