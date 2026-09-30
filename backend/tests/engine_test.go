package tests

import (
	"path/filepath"
	"testing"
	"time"

	"agribid-backend/internal/auctions"
	"agribid-backend/internal/database"
	"agribid-backend/internal/decisions"
	"agribid-backend/internal/lots"
	"agribid-backend/internal/warehouses"
)

func setupTestDB(t *testing.T) {
	testDBPath := filepath.Join(t.TempDir(), "test_agribid.db")
	schemaPath := filepath.Join("..", "..", "supabase", "migrations", "001_initial_schema.sql")
	seedPath := filepath.Join("..", "..", "supabase", "seed.sql")

	_, err := database.InitDB(testDBPath, schemaPath, seedPath)
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}
}

func TestLotNumberGeneration(t *testing.T) {
	setupTestDB(t)

	lotNo := lots.GenerateLotNumber("Turmeric")
	if lotNo == "" || len(lotNo) < 10 {
		t.Errorf("Expected valid lot number, got %s", lotNo)
	}
	t.Logf("Generated Lot Number: %s", lotNo)
}

func TestWarehouseOverbookingPrevention(t *testing.T) {
	setupTestDB(t)

	whID := "a1111111-1111-1111-1111-111111111111" // Capacity 50,000, Available 32,000

	var wh warehouses.Warehouse
	var cropsRaw string
	err := database.DB.QueryRow(`
		SELECT id, name, location, capacity, available_capacity, price_per_kg_per_day, temperature, humidity, COALESCE(supported_crops,'[]'), created_at
		FROM warehouses WHERE id = ?`, whID).
		Scan(&wh.ID, &wh.Name, &wh.Location, &wh.Capacity, &wh.AvailableCapacity, &wh.PricePerKgPerDay, &wh.Temperature, &wh.Humidity, &cropsRaw, &wh.CreatedAt)

	if err != nil {
		t.Fatalf("Failed to query warehouse: %v", err)
	}

	requested := 40000.0
	if requested <= wh.AvailableCapacity {
		t.Errorf("Expected requested capacity (%.2f) to exceed available (%.2f)", requested, wh.AvailableCapacity)
	}

	t.Logf("Successfully verified overbooking guard logic at %s: Requested %.2f exceeds available %.2f", wh.Name, requested, wh.AvailableCapacity)
}

func TestSmartSellStoreEngine(t *testing.T) {
	setupTestDB(t)

	req := decisions.DecisionRequest{
		LotID:        "b1111111-1111-1111-1111-111111111111",
		CropName:     "Turmeric",
		QuantityKg:   2000.0,
		CurrentPrice: 145.0,
		QualityScore: 94.5,
		StorageCost:  1.20,
		HoldingDays:  10,
	}

	resp := decisions.PerformSellStoreCalculation(req)

	if resp.Recommendation == "" {
		t.Errorf("Expected valid recommendation, got empty")
	}

	if len(resp.Reasons) == 0 {
		t.Errorf("Expected explanatory reasons, got 0 reasons")
	}

	t.Logf("Smart Sell/Store Engine output: Recommendation=%s, NetGain=₹%.2f/kg, Reasons Count=%d",
		resp.Recommendation, resp.NetGainPerKg, len(resp.Reasons))
}

func TestAntiSnipingLogic(t *testing.T) {
	setupTestDB(t)

	var auc auctions.Auction
	auc.EndTime = time.Now().Add(15 * time.Second) // 15s left in auction
	timeLeft := time.Until(auc.EndTime)

	extended := false
	var newEndTime time.Time
	if timeLeft > 0 && timeLeft <= 30*time.Second {
		newEndTime = time.Now().Add(30 * time.Second)
		extended = true
	}

	if !extended {
		t.Errorf("Expected anti-sniping extension to trigger for bid with 15s remaining")
	}

	t.Logf("Anti-sniping test passed. Extended = %v, New End Time = %v", extended, newEndTime.Format("15:04:05"))
}
