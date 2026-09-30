# agriBID
### Smart Agricultural Trading, Storage & Auction Platform (Erode Hub)

[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

**agriBID** is a production-grade, full-stack agricultural commodity trading and storage platform engineered for farmers, cold storage operators, and commercial produce buyers in the Erode and Tamil Nadu agricultural regions.

It establishes a **Digital Crop Twin** for harvested produce lots, tracks their end-to-end lifecycle, analyzes spot prices against storage costs via a deterministic **SELL vs STORE Intelligence Engine**, enforces **atomic overbooking guards** for cold storage capacity, and powers **real-time live auctions** with anti-sniping protection, payment settlement, and shipment logistics.

---

## Key Platform Features

### 1. Smart Sell vs Store Intelligence Engine
- **Input Parameters**: Current spot market price, 30-day historical pricing trend, 10-day price forecast model, daily cold storage rate (₹/kg/day), quality moisture score, and warehouse degradation risk.
- **Deterministic ROI Model**: Calculates the exact net gain margin (`forecasted_price - storage_cost - degradation_penalty`) against immediate liquidation value.
- **Actionable Advice**: Emits explicit decision recommendations (`STORE`, `SELL_NOW`, `WAIT`) with human-readable economic rationale.

### 2. Digital Crop Twin Ledger
- Assigns unique, standardized lot numbers formatted as `ERD-CROP-YEAR-SEQ` (e.g., `ERD-TUR-2026-0001`).
- Implements an auditable event ledger tracking the full lot state machine:
  `HARVESTED` → `QUALITY_VERIFIED` → `STORED` → `AUCTION` → `SOLD` → `PAYMENT` → `DELIVERED` → `COMPLETED`.

### 3. Atomic Warehouse Reservation Guard
- Integrates cold storage depots and grain yards across Erode (Erode Central Cold Storage, Gobichettipalayam Agri Depot, Perundurai Logistics Yard).
- **Concurrency & Overbooking Guard**: Database transaction checks prevent over-allocation (`available_capacity >= requested_capacity`), returning a strict HTTP 400 Overbooking Error on violations.

### 4. Real-Time Live Auction & Anti-Sniping Engine
- Real-time bid streaming broadcast across all active browser sessions via WebSocket connections without requiring page reloads.
- **Anti-Sniping Safeguard**: Valid bids received within 30 seconds of auction closing automatically trigger a 30-second auction extension.

### 5. Payment Simulation & Logistics Workflow
- Full transaction state machine (`PENDING` → `PAID` → `SETTLED`) with simulated payment gateway integration.
- End-to-end logistics tracking (`CREATED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED`). Marking a shipment as `DELIVERED` automatically completes the lot's Digital Twin lifecycle.

### 6. Quality Certification & Public QR Verification
- Licensed quality inspectors issue digital quality certificates (moisture %, purity %, grade, quality score).
- Generates public verification URLs (`/verify/[lotId]`) displaying crop grade and certification details while preserving farmer privacy.

---

## System Architecture Flow

```
                      Next.js 16 (TypeScript + Tailwind CSS)
                                         │
                                         ▼
                             Go REST API (Chi Router)
                                         │
                                         ▼
                                Supabase Platform
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                     PostgreSQL        Auth           Storage
                         │
                         ▼
                 WebSocket Engine (Realtime Event Hub)
                         │
                         ▼
              Synchronized Live Auction Updates across Clients
```

---

## Tech Stack

- **Frontend**: Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend Engine**: Go 1.25+, Chi Router, Gorilla WebSockets, JWT Authentication, dual-mode PostgreSQL / SQLite database driver
- **Database & Services**: Supabase PostgreSQL Schema, Auth, Realtime WebSockets, Storage

---

## Core API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health & environment status |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT token |
| `GET` | `/api/lots` | List all crop lot twins |
| `POST` | `/api/lots` | Create a new crop lot twin |
| `GET` | `/api/lots/{id}` | Retrieve crop lot detail & event ledger |
| `POST` | `/api/certificates` | Issue digital quality certificate |
| `GET` | `/api/verify/{lotId}` | Public QR certificate verification |
| `GET` | `/api/warehouses` | List warehouses & available capacities |
| `POST` | `/api/warehouses/reserve` | Atomic warehouse capacity reservation |
| `GET` | `/api/decisions/evaluate` | Run Sell vs Store Intelligence Engine |
| `GET` | `/api/auctions` | List active & past live auctions |
| `POST` | `/api/auctions` | Create live auction for crop lot |
| `POST` | `/api/auctions/{id}/bids` | Place real-time bid on active auction |
| `POST` | `/api/auctions/{id}/close` | Conclude auction & trigger payment record |
| `POST` | `/api/payments/process` | Execute simulated payment settlement |
| `POST` | `/api/shipments/{id}/status` | Update logistics shipment status |

---

## Quick Start & Running Locally

### Prerequisites
- **Go**: Version 1.25 or higher
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher

### 1. Backend Setup & Startup
```bash
cd backend
go build -o server ./cmd/server
./server
# Go API Server listens on http://localhost:8080
```

### 2. Frontend Setup & Startup
```bash
cd frontend
npm install
npm run dev
# Next.js Application available at http://localhost:3000
```

### 3. Backend Test Verification
```bash
cd backend
go test ./...
```

---

## Demo Access Profiles

The platform includes pre-configured demo profiles for testing all roles:

| Role | Name | Email | Default Dashboard |
| :--- | :--- | :--- | :--- |
| **Farmer** | Karuppusamy M. | `farmer1@agribid.in` | `/farmer/dashboard` |
| **Buyer** | Spice Exports India Ltd | `buyer1@agribid.in` | `/buyer/dashboard` |
| **Admin / Inspector** | Dr. K. Arumugam | `admin@agribid.in` | `/admin` |

---

## Step-by-Step Walkthrough Guide

1. **Access Portal**: Navigate to `http://localhost:3000` and sign in or use the 1-Click Role Switcher in the navigation bar.
2. **Crop Lot Registration**: As a Farmer (`farmer1@agribid.in`), go to **Crop Lots** (`/farmer/lots`) and register a new lot (e.g. 2,000 kg Turmeric).
3. **Quality Certification**: Switch to Inspector role (`admin@agribid.in`) on the **Inspector Portal** (`/admin`), set moisture/purity ratings, and issue the Quality Certificate.
4. **QR Verification**: Click **Verify QR Code** to view the public verification certificate page (`/verify/[lotId]`).
5. **Capacity Reservation**: Switch back to Farmer role, navigate to **Warehouses** (`/farmer/warehouses`), and reserve storage space. Attempting to reserve over maximum capacity will trigger the overbooking guard error.
6. **Sell vs Store Analysis**: View the lot details (`/farmer/lots/[id]`) to consult the **Smart Sell vs Store Intelligence Engine** for ROI forecasts.
7. **Live Auction Bidding**: Create a live auction (`/farmer/auctions`), open a second browser window as Buyer (`buyer1@agribid.in`), and place real-time bids with anti-sniping protection.
8. **Settlement & Shipment**: Close the auction, execute the simulated payment (`/buyer/auctions/[id]`), and update shipment progress to `DELIVERED` on `/admin` to complete the lot lifecycle.
