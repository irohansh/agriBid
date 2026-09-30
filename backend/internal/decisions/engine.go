package decisions

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"

	"agribid-backend/internal/database"

	"github.com/go-chi/chi/v5"
)

type DecisionRequest struct {
	LotID         string  `json:"lot_id"`
	CropName      string  `json:"crop_name"`
	QuantityKg    float64 `json:"quantity_kg"`
	CurrentPrice  float64 `json:"current_price"`
	QualityScore  float64 `json:"quality_score"`
	StorageCost   float64 `json:"storage_cost"` // ₹/kg/day
	HoldingDays   int     `json:"holding_days"` // e.g. 7 to 10 days
	WarehouseRisk string  `json:"warehouse_risk"`
	DemandLevel   string  `json:"demand_level"`
}

type DecisionResponse struct {
	Recommendation  string   `json:"recommendation"` // STORE, SELL_NOW, WAIT
	CurrentPrice    float64  `json:"current_price"`
	ExpectedPrice   float64  `json:"expected_price"`
	StorageCost     float64  `json:"storage_cost"`
	Risk            string   `json:"risk"`
	NetGainPerKg    float64  `json:"net_gain_per_kg"`
	NetProfitTotal  float64  `json:"net_profit_total"`
	RecommendedDays int      `json:"recommended_days"`
	Reasons         []string `json:"reasons"`
	Breakdown       map[string]interface{} `json:"breakdown"`
}

func RegisterRoutes(r chi.Router) {
	r.Post("/decisions/evaluate", EvaluateDecisionHandler)
	r.Get("/decisions/lot/{lotId}", GetDecisionForLotHandler)
}

func EvaluateDecisionHandler(w http.ResponseWriter, r *http.Request) {
	var req DecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	res := PerformSellStoreCalculation(req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func GetDecisionForLotHandler(w http.ResponseWriter, r *http.Request) {
	lotID := chi.URLParam(r, "lotId")

	var cropName string
	var quantityKg, currentPrice, qualityScore float64
	var whID string

	err := database.DB.QueryRow(`
		SELECT crop_name, quantity_kg, current_price, quality_score, COALESCE(warehouse_id,'')
		FROM lots WHERE id = ? OR lot_number = ?`, lotID, lotID).
		Scan(&cropName, &quantityKg, &currentPrice, &qualityScore, &whID)

	if err != nil {
		http.Error(w, "Lot not found", http.StatusNotFound)
		return
	}

	storageCost := 1.20 // Default cold storage rate per kg/day in Erode
	if whID != "" {
		_ = database.DB.QueryRow("SELECT price_per_kg_per_day FROM warehouses WHERE id = ?", whID).Scan(&storageCost)
	}

	req := DecisionRequest{
		LotID:        lotID,
		CropName:     cropName,
		QuantityKg:   quantityKg,
		CurrentPrice: currentPrice,
		QualityScore: qualityScore,
		StorageCost:  storageCost,
		HoldingDays:  10,
	}

	res := PerformSellStoreCalculation(req)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func PerformSellStoreCalculation(req DecisionRequest) DecisionResponse {
	if req.HoldingDays <= 0 {
		req.HoldingDays = 10
	}
	if req.StorageCost <= 0 {
		req.StorageCost = 1.20
	}

	// Fetch historical price trend for this crop
	rows, err := database.DB.Query(`
		SELECT price_per_kg FROM price_history 
		WHERE crop_name LIKE ? ORDER BY date DESC LIMIT 10`, "%"+req.CropName+"%")
	
	history := make([]float64, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p float64
			if err := rows.Scan(&p); err == nil {
				history = append(history, p)
			}
		}
	}

	// Fetch predicted price forecast
	var forecastPrice float64
	err = database.DB.QueryRow(`
		SELECT predicted_price FROM price_forecasts 
		WHERE crop_name LIKE ? ORDER BY forecast_date DESC LIMIT 1`, "%"+req.CropName+"%").
		Scan(&forecastPrice)

	// If no price history or forecast found, calculate moving average trend
	if req.CurrentPrice <= 0 && len(history) > 0 {
		req.CurrentPrice = history[0]
	} else if req.CurrentPrice <= 0 {
		req.CurrentPrice = 145.0 // Turmeric default fallback
	}

	if forecastPrice <= 0 {
		if len(history) >= 2 {
			// Trend calculation: weighted price growth
			trend := (history[0] - history[len(history)-1]) / float64(len(history))
			forecastPrice = req.CurrentPrice + (trend * float64(req.HoldingDays))
		} else {
			forecastPrice = req.CurrentPrice * 1.08 // +8% forecast estimation
		}
	}

	// Calculate Storage Cost
	totalStorageCostPerKg := req.StorageCost * float64(req.HoldingDays)
	totalStorageCostAll := totalStorageCostPerKg * req.QuantityKg

	// Calculate Risk Penalty based on Quality Score
	// High quality score (>90) = Low Risk
	// Medium quality score (75-90) = Medium Risk
	// Low quality score (<75) = High Risk (crop degrades quickly)
	var riskRating string
	var riskPenaltyPerKg float64

	if req.QualityScore >= 90 {
		riskRating = "LOW"
		riskPenaltyPerKg = (100.0 - req.QualityScore) * 0.05
	} else if req.QualityScore >= 75 {
		riskRating = "MEDIUM"
		riskPenaltyPerKg = (100.0 - req.QualityScore) * 0.12
	} else {
		riskRating = "HIGH"
		riskPenaltyPerKg = (100.0 - req.QualityScore) * 0.25
	}

	if req.WarehouseRisk != "" {
		riskRating = req.WarehouseRisk
	}

	// Calculate Expected Net Return
	grossGainPerKg := forecastPrice - req.CurrentPrice
	netGainPerKg := grossGainPerKg - totalStorageCostPerKg - riskPenaltyPerKg
	netProfitTotal := netGainPerKg * req.QuantityKg

	// Determine Recommendation
	var recommendation string
	reasons := make([]string, 0)

	// Thresholds for decision:
	if netGainPerKg > 4.0 && riskRating != "HIGH" {
		recommendation = "STORE"
		reasons = append(reasons, "Historical & predicted price trend indicates upward price movement.")
		reasons = append(reasons, "Storage cost (₹"+formatFloat(totalStorageCostPerKg)+"/kg) is lower than expected price gain (₹"+formatFloat(grossGainPerKg)+"/kg).")
		reasons = append(reasons, "Current quality score ("+formatFloat(req.QualityScore)+"/100) presents LOW degradation risk during storage.")
		reasons = append(reasons, "Net projected gain after storage costs: ₹"+formatFloat(netGainPerKg)+"/kg (Total profit boost: ₹"+formatFloat(netProfitTotal)+").")
	} else if riskRating == "HIGH" || netGainPerKg < 0 {
		recommendation = "SELL_NOW"
		if riskRating == "HIGH" {
			reasons = append(reasons, "Quality score/moisture risk is high; holding produce will lead to degradation losses.")
		}
		if netGainPerKg < 0 {
			reasons = append(reasons, "Storage costs exceed projected price appreciation, creating a negative net return.")
		}
		reasons = append(reasons, "Current market price of ₹"+formatFloat(req.CurrentPrice)+"/kg represents optimal immediate liquidation value.")
	} else {
		recommendation = "WAIT"
		reasons = append(reasons, "Price trend is neutral; net gain margin (₹"+formatFloat(netGainPerKg)+"/kg) is close to breakeven.")
		reasons = append(reasons, "Monitor spot market auctions over the next 2-3 days before committing to long storage.")
	}

	sort.Strings(reasons)

	return DecisionResponse{
		Recommendation:  recommendation,
		CurrentPrice:    round2(req.CurrentPrice),
		ExpectedPrice:   round2(forecastPrice),
		StorageCost:     round2(totalStorageCostPerKg),
		Risk:            riskRating,
		NetGainPerKg:    round2(netGainPerKg),
		NetProfitTotal:  round2(netProfitTotal),
		RecommendedDays: req.HoldingDays,
		Reasons:         reasons,
		Breakdown: map[string]interface{}{
			"current_price":          req.CurrentPrice,
			"predicted_price":        forecastPrice,
			"gross_gain_per_kg":      grossGainPerKg,
			"storage_rate_per_day":   req.StorageCost,
			"holding_days":           req.HoldingDays,
			"total_storage_cost_per_kg": totalStorageCostPerKg,
			"risk_penalty_per_kg":    riskPenaltyPerKg,
			"total_storage_cost_all": totalStorageCostAll,
		},
	}
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}

func formatFloat(val float64) string {
	return strings.TrimRight(strings.TrimRight(jsonFloat(round2(val)), "0"), ".")
}

func jsonFloat(val float64) string {
	b, _ := json.Marshal(val)
	return string(b)
}
