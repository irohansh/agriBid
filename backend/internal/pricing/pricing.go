package pricing

import (
	"encoding/json"
	"net/http"
	"time"

	"agribid-backend/internal/database"

	"github.com/go-chi/chi/v5"
)

type PriceRecord struct {
	ID             string    `json:"id"`
	CropName       string    `json:"crop_name"`
	Date           string    `json:"date"`
	PricePerKg     float64   `json:"price_per_kg"`
	MarketLocation string    `json:"market_location"`
	VolumeKg       float64   `json:"volume_kg"`
	CreatedAt      time.Time `json:"created_at"`
}

type PriceForecastRecord struct {
	ID             string  `json:"id"`
	CropName       string  `json:"crop_name"`
	ForecastDate   string  `json:"forecast_date"`
	PredictedPrice float64 `json:"predicted_price"`
	LowerBound     float64 `json:"lower_bound"`
	UpperBound     float64 `json:"upper_bound"`
	Confidence     float64 `json:"confidence"`
}

func RegisterRoutes(r chi.Router) {
	r.Get("/pricing/history", GetPriceHistoryHandler)
	r.Get("/pricing/forecast", GetPriceForecastHandler)
}

func GetPriceHistoryHandler(w http.ResponseWriter, r *http.Request) {
	crop := r.URL.Query().Get("crop")
	query := `SELECT id, crop_name, date, price_per_kg, market_location, volume_kg, created_at FROM price_history WHERE 1=1`
	var args []interface{}
	if crop != "" {
		query += " AND crop_name LIKE ?"
		args = append(args, "%"+crop+"%")
	}
	query += " ORDER BY date ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query price history", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	records := make([]PriceRecord, 0)
	for rows.Next() {
		var pr PriceRecord
		if err := rows.Scan(&pr.ID, &pr.CropName, &pr.Date, &pr.PricePerKg, &pr.MarketLocation, &pr.VolumeKg, &pr.CreatedAt); err == nil {
			records = append(records, pr)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

func GetPriceForecastHandler(w http.ResponseWriter, r *http.Request) {
	crop := r.URL.Query().Get("crop")
	query := `SELECT id, crop_name, forecast_date, predicted_price, lower_bound, upper_bound, confidence FROM price_forecasts WHERE 1=1`
	var args []interface{}
	if crop != "" {
		query += " AND crop_name LIKE ?"
		args = append(args, "%"+crop+"%")
	}
	query += " ORDER BY forecast_date ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query price forecasts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	forecasts := make([]PriceForecastRecord, 0)
	for rows.Next() {
		var pf PriceForecastRecord
		if err := rows.Scan(&pf.ID, &pf.CropName, &pf.ForecastDate, &pf.PredictedPrice, &pf.LowerBound, &pf.UpperBound, &pf.Confidence); err == nil {
			forecasts = append(forecasts, pf)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(forecasts)
}
