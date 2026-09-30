const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "FARMER" | "BUYER" | "ADMIN";
  phone: string;
  location: string;
  avatar_url?: string;
}

export interface Lot {
  id: string;
  lot_number: string;
  farmer_id: string;
  farmer_name?: string;
  crop_name: string;
  variety: string;
  quantity_kg: number;
  harvest_date: string;
  quality_grade: string;
  quality_score: number;
  warehouse_id?: string;
  current_price: number;
  status: "HARVESTED" | "QUALITY_VERIFIED" | "STORED" | "AUCTION" | "SOLD" | "COMPLETED";
  created_at: string;
  updated_at: string;
  events?: LotEvent[];
}

export interface LotEvent {
  id: string;
  lot_id: string;
  stage: string;
  title: string;
  description: string;
  updated_by?: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  available_capacity: number;
  price_per_kg_per_day: number;
  temperature: number;
  humidity: number;
  supported_crops: string[];
  created_at: string;
}

export interface DecisionResponse {
  recommendation: "STORE" | "SELL_NOW" | "WAIT";
  current_price: number;
  expected_price: number;
  storage_cost: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  net_gain_per_kg: number;
  net_profit_total: number;
  recommended_days: number;
  reasons: string[];
  breakdown: Record<string, any>;
}

export interface Auction {
  id: string;
  lot_id: string;
  lot_number?: string;
  crop_name?: string;
  variety?: string;
  quantity_kg?: number;
  quality_grade?: string;
  farmer_id: string;
  farmer_name?: string;
  starting_price: number;
  reserve_price: number;
  start_time: string;
  end_time: string;
  current_bid: number;
  highest_bidder_id?: string;
  highest_bidder_name?: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "SOLD" | "UNSOLD";
  created_at: string;
  updated_at: string;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  auction_id: string;
  buyer_id: string;
  buyer_name: string;
  amount: number;
  is_winning: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  auction_id: string;
  lot_id: string;
  lot_number?: string;
  crop_name?: string;
  buyer_id: string;
  buyer_name?: string;
  farmer_id: string;
  farmer_name?: string;
  amount: number;
  status: "PENDING" | "PAID" | "SETTLED";
  simulated_gateway_ref: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  payment_id: string;
  lot_id: string;
  lot_number?: string;
  crop_name?: string;
  buyer_id: string;
  buyer_name?: string;
  farmer_id: string;
  farmer_name?: string;
  origin: string;
  destination: string;
  tracking_number: string;
  status: "CREATED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";
  current_location: string;
  estimated_delivery: string;
  created_at: string;
  updated_at: string;
}

export interface QualityCertificate {
  id: string;
  lot_id: string;
  certificate_no: string;
  moisture: number;
  purity: number;
  foreign_matter: number;
  weight: number;
  grade: string;
  quality_score: number;
  inspector_name: string;
  qr_code_url: string;
  document_url?: string;
  verified_at: string;
  created_at: string;
}

export interface PublicVerification {
  lot_number: string;
  crop_name: string;
  variety: string;
  quantity_kg: number;
  quality_grade: string;
  quality_score: number;
  certificate_no: string;
  moisture: number;
  purity: number;
  foreign_matter: number;
  certificate_status: string;
  lifecycle_status: string;
  verified_at: string;
  inspector_name: string;
}

// API Helper Methods
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `API error (${res.status})`);
  }

  return res.json();
}

// Realtime WebSocket Helper
export function connectRealtime(onMessage: (event: { type: string; payload: any }) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let ws: WebSocket | null = null;
  let isClosedManually = false;
  let reconnectTimeout: any = null;

  const connect = () => {
    if (isClosedManually) return;
    try {
      ws = new WebSocket(WS_BASE_URL);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          // Ignore non-JSON or parse errors
        }
      };

      ws.onclose = () => {
        if (!isClosedManually) {
          reconnectTimeout = setTimeout(connect, 3000); // Reconnect after 3s
        }
      };

      ws.onerror = () => {
        // Quietly handle connection errors; ws.onclose handles reconnect retry
      };
    } catch (err) {
      // Ignored
    }
  };

  connect();

  return () => {
    isClosedManually = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
  };
}
