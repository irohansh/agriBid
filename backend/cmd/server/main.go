package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"agribid-backend/internal/auctions"
	"agribid-backend/internal/auth"
	"agribid-backend/internal/certificates"
	"agribid-backend/internal/database"
	"agribid-backend/internal/decisions"
	"agribid-backend/internal/lots"
	"agribid-backend/internal/matching"
	"agribid-backend/internal/payments"
	"agribid-backend/internal/pricing"
	"agribid-backend/internal/realtime"
	"agribid-backend/internal/shipments"
	"agribid-backend/internal/warehouses"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	loadEnvFile(".env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	workDir, _ := os.Getwd()
	dbPath := filepath.Join(workDir, "agribid.db")
	schemaPath := filepath.Join(workDir, "..", "supabase", "migrations", "001_initial_schema.sql")
	seedPath := filepath.Join(workDir, "..", "supabase", "seed.sql")

	// Initialize Relational DB Engine
	db, err := database.InitDB(dbPath, schemaPath, seedPath)
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.Close()

	// Initialize Realtime WebSocket Hub
	realtime.GlobalHub = realtime.NewHub()
	go realtime.GlobalHub.Run()

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Configure CORS for Next.js client
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","app":"AgriBid API Server","location":"Erode, TN"}`))
	})

	// WebSocket endpoint for Supabase Realtime live updates
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		realtime.ServeWS(realtime.GlobalHub, w, r)
	})

	// Register API Sub-routes
	r.Route("/api", func(api chi.Router) {
		auth.RegisterRoutes(api)
		lots.RegisterRoutes(api)
		certificates.RegisterRoutes(api)
		warehouses.RegisterRoutes(api)
		decisions.RegisterRoutes(api)
		auctions.RegisterRoutes(api)
		payments.RegisterRoutes(api)
		shipments.RegisterRoutes(api)
		matching.RegisterRoutes(api)
		pricing.RegisterRoutes(api)
	})

	log.Printf("🚀 AgriBid Server running on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server exited unexpectedly: %v", err)
	}
}

func loadEnvFile(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}
