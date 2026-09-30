package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"agribid-backend/internal/database"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var JWTSecret = []byte("agribid-secret-jwt-key-erode-2026")

type Profile struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"` // FARMER, BUYER, ADMIN
	Phone     string    `json:"phone"`
	Location  string    `json:"location"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
	Phone    string `json:"phone"`
	Location string `json:"location"`
}

type AuthResponse struct {
	Token   string  `json:"token"`
	Profile Profile `json:"profile"`
}

func RegisterRoutes(r chi.Router) {
	r.Post("/auth/signup", SignupHandler)
	r.Post("/auth/login", LoginHandler)
	r.Get("/auth/profile", GetProfileHandler)
	r.Get("/auth/profiles", ListProfilesHandler)
}

func SignupHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Role == "" {
		req.Role = "FARMER"
	}

	userID := uuid.New().String()
	now := time.Now()

	_, err := database.DB.Exec(`
		INSERT INTO profiles (id, email, full_name, role, phone, location, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, req.Email, req.FullName, req.Role, req.Phone, req.Location, now,
	)
	if err != nil {
		http.Error(w, "Failed to create user profile: "+err.Error(), http.StatusInternalServerError)
		return
	}

	prof := Profile{
		ID:        userID,
		Email:     req.Email,
		FullName:  req.FullName,
		Role:      req.Role,
		Phone:     req.Phone,
		Location:  req.Location,
		CreatedAt: now,
	}

	tokenStr, _ := generateToken(prof)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: tokenStr, Profile: prof})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	var prof Profile
	var createdAtStr string
	err := database.DB.QueryRow(`
		SELECT id, email, full_name, role, COALESCE(phone,''), COALESCE(location,''), COALESCE(avatar_url,''), created_at
		FROM profiles WHERE email = ?`, req.Email).
		Scan(&prof.ID, &prof.Email, &prof.FullName, &prof.Role, &prof.Phone, &prof.Location, &prof.AvatarURL, &createdAtStr)

	if err != nil {
		http.Error(w, "User not found with this email", http.StatusUnauthorized)
		return
	}

	tokenStr, _ := generateToken(prof)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: tokenStr, Profile: prof})
}

func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Profile ID required", http.StatusBadRequest)
		return
	}

	var prof Profile
	var createdAtStr string
	err := database.DB.QueryRow(`
		SELECT id, email, full_name, role, COALESCE(phone,''), COALESCE(location,''), COALESCE(avatar_url,''), created_at
		FROM profiles WHERE id = ?`, id).
		Scan(&prof.ID, &prof.Email, &prof.FullName, &prof.Role, &prof.Phone, &prof.Location, &prof.AvatarURL, &createdAtStr)

	if err != nil {
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prof)
}

func ListProfilesHandler(w http.ResponseWriter, r *http.Request) {
	role := r.URL.Query().Get("role")
	query := `SELECT id, email, full_name, role, COALESCE(phone,''), COALESCE(location,''), COALESCE(avatar_url,''), created_at FROM profiles`
	var args []interface{}
	if role != "" {
		query += ` WHERE role = ?`
		args = append(args, role)
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to query profiles", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	profiles := make([]Profile, 0)
	for rows.Next() {
		var prof Profile
		var createdAtStr string
		if err := rows.Scan(&prof.ID, &prof.Email, &prof.FullName, &prof.Role, &prof.Phone, &prof.Location, &prof.AvatarURL, &createdAtStr); err == nil {
			profiles = append(profiles, prof)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profiles)
}

func generateToken(prof Profile) (string, error) {
	claims := jwt.MapClaims{
		"sub":   prof.ID,
		"email": prof.Email,
		"role":  prof.Role,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}
