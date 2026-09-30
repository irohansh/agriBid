"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, Warehouse, Gavel, TrendingUp, ShieldCheck, CheckCircle2, Clock, QrCode, ArrowLeft, Plus, Play, ExternalLink } from "lucide-react";
import { Lot, QualityCertificate, DecisionResponse, Warehouse as WarehouseType, apiFetch } from "@/lib/api";

const TIMELINE_STAGES = [
  { stage: "HARVESTED", label: "Produce Harvested", icon: Sprout },
  { stage: "QUALITY_VERIFIED", label: "Quality Verified", icon: ShieldCheck },
  { stage: "STORED", label: "Warehouse Stored", icon: Warehouse },
  { stage: "AUCTION", label: "Auction Opened", icon: Gavel },
  { stage: "SOLD", label: "Auction Sold", icon: CheckCircle2 },
  { stage: "PAYMENT", label: "Payment Settled", icon: CheckCircle2 },
  { stage: "DELIVERED", label: "Logistics Delivered", icon: CheckCircle2 },
  { stage: "COMPLETED", label: "Lot Completed", icon: CheckCircle2 },
];

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lot, setLot] = useState<Lot | null>(null);
  const [cert, setCert] = useState<QualityCertificate | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Action states
  const [reserving, setReserving] = useState(false);
  const [creatingAuction, setCreatingAuction] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lotData, whs] = await Promise.all([
        apiFetch<Lot>(`/lots/${id}`),
        apiFetch<WarehouseType[]>("/warehouses"),
      ]);
      setLot(lotData);
      setWarehouses(whs || []);

      if (whs && whs.length > 0) {
        setSelectedWarehouseId(whs[0].id);
      }

      // Try fetching Quality Certificate
      try {
        const certData = await apiFetch<QualityCertificate>(`/certificates/lot/${lotData.id}`);
        setCert(certData);
      } catch (e) {
        console.log("No certificate issued yet", e);
      }

      // Fetch Decision Engine prediction
      try {
        const dec = await apiFetch<DecisionResponse>(`/decisions/lot/${lotData.id}`);
        setDecision(dec);
      } catch (e) {
        console.warn("Decision engine error", e);
      }

    } catch (err) {
      console.error("Failed to load lot detail", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserveStorage = async () => {
    if (!lot || !selectedWarehouseId) return;
    setReserving(true);
    try {
      const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || lot.farmer_id;
      const res: any = await apiFetch("/warehouses/reserve", {
        method: "POST",
        body: JSON.stringify({
          warehouse_id: selectedWarehouseId,
          lot_id: lot.id,
          farmer_id: fid,
          requested_capacity: lot.quantity_kg,
          duration_days: 10,
        }),
      });

      alert(res.message || "Storage capacity reserved successfully!");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to reserve capacity");
    } finally {
      setReserving(false);
    }
  };

  const handleCreateAuction = async () => {
    if (!lot) return;
    setCreatingAuction(true);
    try {
      const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || lot.farmer_id;
      const res: any = await apiFetch("/auctions", {
        method: "POST",
        body: JSON.stringify({
          lot_id: lot.id,
          farmer_id: fid,
          starting_price: lot.current_price,
          reserve_price: lot.current_price * 1.05,
          duration_mins: 60,
        }),
      });

      alert("Auction opened successfully!");
      router.push(`/buyer/auctions/${res.id}`);
    } catch (err: any) {
      alert("Failed to create auction: " + err.message);
    } finally {
      setCreatingAuction(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-xs text-slate-400">Loading Digital Twin Ledger...</div>;
  }

  if (!lot) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-xs text-red-400">Lot not found</div>;
  }

  // Determine current timeline index
  const stageOrder = ["HARVESTED", "QUALITY_VERIFIED", "STORED", "AUCTION", "SOLD", "PAYMENT", "DELIVERED", "COMPLETED"];
  const currentStageIndex = stageOrder.indexOf(lot.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/farmer/lots" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-extrabold text-emerald-400">{lot.lot_number}</h1>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {lot.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{lot.crop_name} ({lot.variety}) • Harvested {lot.harvest_date}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {cert && (
            <Link
              href={`/verify/${lot.id}`}
              target="_blank"
              className="bg-purple-950/80 text-purple-300 border border-purple-700/50 hover:bg-purple-900 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-4 h-4 text-purple-400" />
              Public QR Verify <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {lot.status === "QUALITY_VERIFIED" && (
            <button
              onClick={handleReserveStorage}
              disabled={reserving}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <Warehouse className="w-4 h-4" />
              {reserving ? "Reserving..." : "Reserve Cold Storage"}
            </button>
          )}

          {(lot.status === "STORED" || lot.status === "QUALITY_VERIFIED") && (
            <button
              onClick={handleCreateAuction}
              disabled={creatingAuction}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <Gavel className="w-4 h-4" />
              {creatingAuction ? "Opening..." : "Create Live Auction"}
            </button>
          )}
        </div>
      </div>

      {/* DIGITAL CROP TWIN TIMELINE */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          DIGITAL CROP TWIN LIFECYCLE JOURNEY
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {TIMELINE_STAGES.map((s, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const Icon = s.icon;

            return (
              <div
                key={s.stage}
                className={`p-3 rounded-xl border flex flex-col items-center text-center space-y-1.5 transition-all ${
                  isCurrent
                    ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400"
                    : isCompleted
                    ? "bg-slate-900 border-slate-700 text-slate-200"
                    : "bg-slate-950/40 border-slate-800/60 text-slate-600 opacity-60"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"
                }`}>
                  {idx + 1}
                </div>
                <div className="text-[11px] font-bold line-clamp-1">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Audit Event History */}
        {lot.events && lot.events.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase">Lot Audit Trail Ledger:</div>
            <div className="space-y-1.5">
              {lot.events.map((ev) => (
                <div key={ev.id} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs flex items-start justify-between">
                  <div>
                    <span className="font-bold text-emerald-400 mr-2">[{ev.stage}]</span>
                    <span className="font-semibold text-white">{ev.title}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{ev.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SMART SELL vs STORE RECOMMENDATION ENGINE CARD */}
      {decision && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/80 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Decision Engine Analysis</div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                SELL vs STORE RECOMMENDATION:
                <span className="text-emerald-400 underline decoration-emerald-500/50">{decision.recommendation}</span>
              </h2>
            </div>

            <button
              onClick={handleCreateAuction}
              disabled={creatingAuction}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                decision.recommendation === "STORE"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300"
              }`}
            >
              <Gavel className="w-4 h-4" />
              {creatingAuction
                ? "Opening Auction..."
                : decision.recommendation === "STORE"
                ? `RECOMMENDATION: HOLD FOR ${decision.recommended_days} DAYS (Click to Auction)`
                : "LIQUIDATE IMMEDIATELY (Click to Open Auction)"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">Spot Market Price</span>
              <span className="text-lg font-bold text-white">₹{decision.current_price} / kg</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">Predicted Forecast Price</span>
              <span className="text-lg font-bold text-emerald-400">₹{decision.expected_price} / kg</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">10-Day Storage Cost</span>
              <span className="text-lg font-bold text-amber-400">₹{decision.storage_cost} / kg</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">Net Expected ROI Boost</span>
              <span className="text-lg font-extrabold text-emerald-300">+₹{decision.net_profit_total.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
            <div className="text-xs font-bold text-slate-300 uppercase">Reasoning & Risk Breakdown:</div>
            <ul className="space-y-2 text-xs text-slate-300">
              {decision.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Produce & Certificate Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Produce Info */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            Produce Specifications
          </h2>

          <div className="space-y-2.5 text-xs text-slate-300 divide-y divide-slate-800/80">
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Farmer Owner:</span>
              <span className="font-semibold text-white">{lot.farmer_name || "Karuppusamy M."}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Crop Category:</span>
              <span className="font-semibold text-white">{lot.crop_name}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Variety / Cultivar:</span>
              <span className="font-semibold text-white">{lot.variety}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Harvest Volume:</span>
              <span className="font-bold text-emerald-400">{lot.quantity_kg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Harvest Date:</span>
              <span className="font-semibold text-white">{lot.harvest_date}</span>
            </div>
          </div>
        </div>

        {/* Digital Quality Certificate */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Digital Quality Certificate
          </h2>

          {cert ? (
            <div className="space-y-3 text-xs">
              <div className="bg-purple-950/60 p-3 rounded-xl border border-purple-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300 uppercase block font-bold">Certificate Number</span>
                  <span className="font-mono font-bold text-white text-sm">{cert.certificate_no}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-purple-300 block font-bold">Score</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{cert.quality_score}/100</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Moisture</span>
                  <span className="font-bold text-white">{cert.moisture}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Purity</span>
                  <span className="font-bold text-white">{cert.purity}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Foreign Matter</span>
                  <span className="font-bold text-white">{cert.foreign_matter}%</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1">
                Verified by <span className="font-semibold text-white">{cert.inspector_name}</span> on {new Date(cert.verified_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-center space-y-2">
              <p>Quality inspection pending certification by Erode Quality Inspector.</p>
              <Link href="/admin" className="text-purple-400 hover:underline font-semibold text-[11px] inline-flex items-center gap-1">
                Go to Inspector Portal <ArrowLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
