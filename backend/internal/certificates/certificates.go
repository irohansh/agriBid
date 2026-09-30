package certificates

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

type QualityCertificate struct {
	ID            string    `json:"id"`
	LotID         string    `json:"lot_id"`
	CertificateNo string    `json:"certificate_no"`
	Moisture      float64   `json:"moisture"`
	Purity        float64   `json:"purity"`
	ForeignMatter float64   `json:"foreign_matter"`
	Weight        float64   `json:"weight"`
	Grade         string    `json:"grade"`
	QualityScore  float64   `json:"quality_score"`
	InspectorName string    `json:"inspector_name"`
	QRCodeURL     string    `json:"qr_code_url"`
	DocumentURL   string    `json:"document_url,omitempty"`
	VerifiedAt    time.Time `json:"verified_at"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateCertificateRequest struct {
	LotID         string  `json:"lot_id"`
	Moisture      float64 `json:"moisture"`
	Purity        float64 `json:"purity"`
	ForeignMatter float64 `json:"foreign_matter"`
	Weight        float64 `json:"weight"`
	Grade         string  `json:"grade"`
	QualityScore  float64 `json:"quality_score"`
	InspectorName string  `json:"inspector_name"`
	DocumentURL   string  `json:"document_url"`
	InspectorID   string  `json:"inspector_id"`
}

type PublicVerificationResponse struct {
	LotNumber         string  `json:"lot_number"`
	CropName          string  `json:"crop_name"`
	Variety           string  `json:"variety"`
	QuantityKg        float64 `json:"quantity_kg"`
	QualityGrade      string  `json:"quality_grade"`
	QualityScore      float64 `json:"quality_score"`
	CertificateNo     string  `json:"certificate_no"`
	Moisture          float64 `json:"moisture"`
	Purity            float64 `json:"purity"`
	ForeignMatter     float64 `json:"foreign_matter"`
	CertificateStatus string  `json:"certificate_status"`
	LifecycleStatus   string  `json:"lifecycle_status"`
	VerifiedAt        string  `json:"verified_at"`
	InspectorName     string  `json:"inspector_name"`
}

func RegisterRoutes(r chi.Router) {
	r.Post("/certificates", CreateCertificateHandler)
	r.Get("/certificates/lot/{lotId}", GetCertificateByLotHandler)
	r.Get("/verify/{lotId}", PublicVerifyHandler)
}

func CreateCertificateHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateCertificateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.LotID == "" || req.InspectorName == "" {
		http.Error(w, "Lot ID and Inspector Name are required", http.StatusBadRequest)
		return
	}

	certID := uuid.New().String()
	certNo := fmt.Sprintf("CERT-%d-ERD-%04d", time.Now().Year(), time.Now().Unix()%10000)
	qrURL := fmt.Sprintf("/verify/%s", req.LotID)
	now := time.Now()

	tx, err := database.DB.Begin()
	if err != nil {
		http.Error(w, "Database transaction failed", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var existingID string
	err = tx.QueryRow("SELECT id FROM quality_certificates WHERE lot_id = ?", req.LotID).Scan(&existingID)
	if err == nil && existingID != "" {
		certID = existingID
		_, err = tx.Exec(`
			UPDATE quality_certificates 
			SET moisture = ?, purity = ?, foreign_matter = ?, weight = ?, grade = ?, quality_score = ?, inspector_name = ?, document_url = ?, verified_at = ?
			WHERE id = ?`,
			req.Moisture, req.Purity, req.ForeignMatter, req.Weight, req.Grade, req.QualityScore, req.InspectorName, req.DocumentURL, now, certID,
		)
	} else {
		_, err = tx.Exec(`
			INSERT INTO quality_certificates (id, lot_id, certificate_no, moisture, purity, foreign_matter, weight, grade, quality_score, inspector_name, qr_code_url, document_url, verified_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			certID, req.LotID, certNo, req.Moisture, req.Purity, req.ForeignMatter, req.Weight, req.Grade, req.QualityScore, req.InspectorName, qrURL, req.DocumentURL, now, now,
		)
	}
	if err != nil {
		http.Error(w, "Failed to record quality certificate: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update Lot quality info and stage
	_, err = tx.Exec(`
		UPDATE lots SET quality_grade = ?, quality_score = ?, status = 'QUALITY_VERIFIED', updated_at = ?
		WHERE id = ?`, req.Grade, req.QualityScore, now, req.LotID,
	)
	if err != nil {
		http.Error(w, "Failed to update lot quality: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert lot event
	eventID := uuid.New().String()
	eventDesc := fmt.Sprintf("Verified by Inspector %s. Grade: %s, Score: %.1f/100, Moisture: %.1f%%, Purity: %.1f%%",
		req.InspectorName, req.Grade, req.QualityScore, req.Moisture, req.Purity)
	_, err = tx.Exec(`
		INSERT INTO lot_events (id, lot_id, stage, title, description, updated_by, created_at)
		VALUES (?, ?, 'QUALITY_VERIFIED', 'Quality Certificate Issued', ?, ?, ?)`,
		eventID, req.LotID, eventDesc, req.InspectorID, now,
	)
	if err != nil {
		http.Error(w, "Failed to insert event log: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit certificate transaction", http.StatusInternalServerError)
		return
	}

	cert := QualityCertificate{
		ID:            certID,
		LotID:         req.LotID,
		CertificateNo: certNo,
		Moisture:      req.Moisture,
		Purity:        req.Purity,
		ForeignMatter: req.ForeignMatter,
		Weight:        req.Weight,
		Grade:         req.Grade,
		QualityScore:  req.QualityScore,
		InspectorName: req.InspectorName,
		QRCodeURL:     qrURL,
		DocumentURL:   req.DocumentURL,
		VerifiedAt:    now,
		CreatedAt:     now,
	}

	realtime.BroadcastEvent("CERTIFICATE_ISSUED", cert)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(cert)
}

func GetCertificateByLotHandler(w http.ResponseWriter, r *http.Request) {
	lotID := chi.URLParam(r, "lotId")

	var cert QualityCertificate
	var docURL sql.NullString
	err := database.DB.QueryRow(`
		SELECT id, lot_id, certificate_no, moisture, purity, foreign_matter, weight, grade, quality_score, inspector_name, qr_code_url, COALESCE(document_url,''), verified_at, created_at
		FROM quality_certificates WHERE lot_id = ?`, lotID).
		Scan(&cert.ID, &cert.LotID, &cert.CertificateNo, &cert.Moisture, &cert.Purity, &cert.ForeignMatter, &cert.Weight, &cert.Grade, &cert.QualityScore, &cert.InspectorName, &cert.QRCodeURL, &docURL, &cert.VerifiedAt, &cert.CreatedAt)

	if err != nil {
		http.Error(w, "Certificate not found for this lot", http.StatusNotFound)
		return
	}

	if docURL.Valid {
		cert.DocumentURL = docURL.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cert)
}

func PublicVerifyHandler(w http.ResponseWriter, r *http.Request) {
	lotID := chi.URLParam(r, "lotId")

	var res PublicVerificationResponse
	var verifiedAtTime time.Time

	// Query lot details (no private farmer information)
	err := database.DB.QueryRow(`
		SELECT l.lot_number, l.crop_name, l.variety, l.quantity_kg, l.quality_grade, l.quality_score, l.status,
		       c.certificate_no, c.moisture, c.purity, c.foreign_matter, c.inspector_name, c.verified_at
		FROM lots l
		JOIN quality_certificates c ON l.id = c.lot_id
		WHERE l.id = ? OR l.lot_number = ?`, lotID, lotID).
		Scan(&res.LotNumber, &res.CropName, &res.Variety, &res.QuantityKg, &res.QualityGrade, &res.QualityScore, &res.LifecycleStatus,
			&res.CertificateNo, &res.Moisture, &res.Purity, &res.ForeignMatter, &res.InspectorName, &verifiedAtTime)

	if err != nil {
		http.Error(w, "Quality Certificate not found or unverified lot", http.StatusNotFound)
		return
	}

	res.CertificateStatus = "VERIFIED & AUTHENTICATED"
	res.VerifiedAt = verifiedAtTime.Format("02 Jan 2006, 15:04 MST")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
