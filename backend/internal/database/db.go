package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(dbPath string, schemaPath string, seedPath string) (*sql.DB, error) {
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		pgURL = os.Getenv("SUPABASE_DB_URL")
	}

	var db *sql.DB
	var err error
	var isPostgres bool

	if pgURL != "" {
		log.Println("🔌 Connecting to External Supabase PostgreSQL Database...")
		db, err = sql.Open("postgres", pgURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open external PostgreSQL database: %w", err)
		}
		isPostgres = true
	} else {
		log.Println("📦 Connecting to Embedded Relational Database (SQLite)...")
		dir := filepath.Dir(dbPath)
		if dir != "" && dir != "." {
			_ = os.MkdirAll(dir, 0755)
		}

		db, err = sql.Open("sqlite", dbPath+"?_pragma=foreign_keys(0)&_pragma=journal_mode(WAL)")
		if err != nil {
			return nil, fmt.Errorf("failed to open local database: %w", err)
		}
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db

	// Load & Run Schema if needed
	if !isPostgres {
		if err := runMigrationScript(db, schemaPath, false); err != nil {
			log.Printf("Migration notice: %v", err)
		}

		var profileCount int
		err = db.QueryRow("SELECT COUNT(*) FROM profiles").Scan(&profileCount)
		if err != nil || profileCount == 0 {
			log.Println("Seeding database with initial Erode agriculture market data...")
			if err := runMigrationScript(db, seedPath, false); err != nil {
				log.Printf("Seed notice: %v", err)
			}
		}
	} else {
		// Run PostgreSQL schema migrations and seed scripts directly
		if err := runMigrationScript(db, schemaPath, true); err != nil {
			log.Printf("PostgreSQL Schema Migration notice: %v", err)
		}
		var profileCount int
		err = db.QueryRow("SELECT COUNT(*) FROM profiles").Scan(&profileCount)
		if err != nil || profileCount == 0 {
			log.Println("⚡ Seeding PostgreSQL database with Erode market seed data...")
			if err := runMigrationScript(db, seedPath, true); err != nil {
				log.Printf("PostgreSQL Seed notice: %v", err)
			}
		}
	}

	log.Println("✅ Database initialized successfully.")
	return db, nil
}

func runMigrationScript(db *sql.DB, filePath string, isPostgres bool) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("could not read sql file %s: %w", filePath, err)
	}

	lines := strings.Split(string(content), "\n")
	var cleanedLines []string
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		cleanedLines = append(cleanedLines, l)
	}

	sqlStr := strings.Join(cleanedLines, "\n")

	if !isPostgres {
		// Strip PostgreSQL-specific function definitions for SQLite compatibility
		if idx := strings.Index(sqlStr, "CREATE OR REPLACE FUNCTION"); idx != -1 {
			sqlStr = sqlStr[:idx]
		}

		// PostgreSQL to SQLite conversions
		sqlStr = strings.ReplaceAll(sqlStr, "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";", "")
		sqlStr = strings.ReplaceAll(sqlStr, "UUID PRIMARY KEY DEFAULT gen_random_uuid()", "TEXT PRIMARY KEY")
		sqlStr = strings.ReplaceAll(sqlStr, "DEFAULT gen_random_uuid()", "")
		sqlStr = strings.ReplaceAll(sqlStr, "UUID PRIMARY KEY", "TEXT PRIMARY KEY")
		sqlStr = strings.ReplaceAll(sqlStr, "UUID REFERENCES", "TEXT REFERENCES")
		sqlStr = strings.ReplaceAll(sqlStr, "UUID", "TEXT")
		sqlStr = strings.ReplaceAll(sqlStr, "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP", "DATETIME DEFAULT CURRENT_TIMESTAMP")
		sqlStr = strings.ReplaceAll(sqlStr, "TIMESTAMP WITH TIME ZONE", "DATETIME")
		sqlStr = strings.ReplaceAll(sqlStr, "NUMERIC(12, 2)", "REAL")
		sqlStr = strings.ReplaceAll(sqlStr, "NUMERIC(10, 2)", "REAL")
		sqlStr = strings.ReplaceAll(sqlStr, "NUMERIC(5, 2)", "REAL")
		sqlStr = strings.ReplaceAll(sqlStr, "TEXT[] DEFAULT '{}'", "TEXT DEFAULT '[]'")
		sqlStr = strings.ReplaceAll(sqlStr, "TEXT[]", "TEXT")
		sqlStr = strings.ReplaceAll(sqlStr, "ARRAY['Turmeric', 'Banana', 'Groundnut']", "'[\"Turmeric\", \"Banana\", \"Groundnut\"]'")
		sqlStr = strings.ReplaceAll(sqlStr, "ARRAY['Sugarcane', 'Turmeric', 'Cotton']", "'[\"Sugarcane\", \"Turmeric\", \"Cotton\"]'")
		sqlStr = strings.ReplaceAll(sqlStr, "ARRAY['Groundnut', 'Cotton', 'Turmeric']", "'[\"Groundnut\", \"Cotton\", \"Turmeric\"]'")

		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '30 minutes'", "DATETIME('now', '-30 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() + INTERVAL '2 hours'", "DATETIME('now', '+2 hours')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '15 minutes'", "DATETIME('now', '-15 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() + INTERVAL '1 hour'", "DATETIME('now', '+1 hour')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '2 hours'", "DATETIME('now', '-2 hours')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '10 minutes'", "DATETIME('now', '-10 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '25 minutes'", "DATETIME('now', '-25 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '18 minutes'", "DATETIME('now', '-18 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '12 minutes'", "DATETIME('now', '-12 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '5 minutes'", "DATETIME('now', '-5 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() - INTERVAL '2 minutes'", "DATETIME('now', '-2 minutes')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW() + INTERVAL '1 day'", "DATETIME('now', '+1 day')")
		sqlStr = strings.ReplaceAll(sqlStr, "NOW()", "DATETIME('now')")
	}

	if isPostgres {
		log.Println("⚡ Running PostgreSQL schema migration & seed on Supabase...")
		_, err := db.Exec(sqlStr)
		if err != nil {
			log.Printf("PostgreSQL Migration exec error: %v", err)
		}
		return nil
	}

	statements := strings.Split(sqlStr, ";")
	for i, stmt := range statements {
		trimmed := strings.TrimSpace(stmt)
		if trimmed == "" {
			continue
		}
		_, err := db.Exec(trimmed)
		if err != nil {
			log.Printf("Migration exec notice [stmt #%d]: %v", i, err)
		}
	}
	return nil
}
