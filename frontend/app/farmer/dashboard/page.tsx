"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sprout, Warehouse, Gavel, TrendingUp, Sparkles, Plus, ArrowRight, CheckCircle2, ShieldCheck, ChevronRight, Activity } from "lucide-react";
import { Lot, Warehouse as WarehouseType, DecisionResponse, apiFetch } from "@/lib/api";

export default function FarmerDashboard() {
  const [farmerId, setFarmerId] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [farmerName, setFarmerName] = useState<string>("Karuppusamy M.");
  const [lots, setLots] = useState<Lot[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "11111111-1111-1111-1111-111111111111";
    const fname = localStorage.getItem("agribid_user_name") || localStorage.getItem("agrinexus_user_name") || "Karuppusamy M.";
    setFarmerId(fid);
    setFarmerName(fname);
    loadDashboardData(fid);
  }, []);

  const loadDashboardData = async (fid: string) => {
    setLoading(true);
    try {
      const [lotsData, whData] = await Promise.all([
        apiFetch<Lot[]>(`/lots?farmer_id=${fid}`),
        apiFetch<WarehouseType[]>("/warehouses"),
      ]);
      setLots(lotsData || []);
      setWarehouses(whData || []);

      // Load Sell/Store Recommendation for first lot if exists
      if (lotsData && lotsData.length > 0) {
        try {
          const dec = await apiFetch<DecisionResponse>(`/decisions/lot/${lotsData[0].id}`);
          setDecision(dec);
        } catch (e) {
          console.warn("Decision engine load error", e);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const storedLotsCount = lots.filter((l) => l.status === "STORED").length;
  const totalQuantityKg = lots.reduce((acc, l) => acc + l.quantity_kg, 0);
  const auctionLotsCount = lots.filter((l) => l.status === "AUCTION").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-800">
            <Sprout className="w-3.5 h-3.5" />
            Farmer Command Center
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome back, {farmerName}</h1>
          <p className="text-xs text-slate-400">Modakurichi Turmeric & Agro Hub • Erode Region</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/farmer/lots"
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Harvest Lot
          </Link>

          <Link
            href="/farmer/warehouses"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            <Warehouse className="w-4 h-4 text-amber-400" />
            Reserve Storage
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl space-y-1 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Registered Crop Lots</div>
          <div className="text-2xl font-extrabold text-white">{lots.length}</div>
          <div className="text-[10px] text-emerald-400">Active lot twins</div>
        </div>

        <div className="glass-card p-4 rounded-xl space-y-1 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Total Produce Volume</div>
          <div className="text-2xl font-extrabold text-emerald-400">{totalQuantityKg.toLocaleString()} <span className="text-xs font-normal">kg</span></div>
          <div className="text-[10px] text-slate-400">Harvested & stored</div>
        </div>

        <div className="glass-card p-4 rounded-xl space-y-1 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Stored in Warehouse</div>
          <div className="text-2xl font-extrabold text-amber-400">{storedLotsCount} <span className="text-xs font-normal">lots</span></div>
          <div className="text-[10px] text-amber-300/80">Erode Cold Storage</div>
        </div>

        <div className="glass-card p-4 rounded-xl space-y-1 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Live Online Auctions</div>
          <div className="text-2xl font-extrabold text-teal-400">{auctionLotsCount}</div>
          <div className="text-[10px] text-teal-300">Receiving live bids</div>
        </div>
      </div>

      {/* Smart SELL vs STORE Intelligence Recommendation Card */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                SMART SELL vs STORE ENGINE
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">DETERMINISTIC PREDICTION</span>
              </h2>
              <p className="text-xs text-slate-400">Market Price Forecast vs Storage Cost & Quality Risk Analysis</p>
            </div>
          </div>

          {decision && (
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide border shadow-lg ${
                decision.recommendation === "STORE"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : decision.recommendation === "SELL_NOW"
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-blue-500 text-white border-blue-400"
              }`}
            >
              RECOMMENDATION: {decision.recommendation} FOR {decision.recommended_days} DAYS
            </span>
          )}
        </div>

        {decision ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase">Economics Breakdown</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Spot Market Price:</span>
                  <span className="font-bold text-white">₹{decision.current_price} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Predicted 10-Day Price:</span>
                  <span className="font-bold text-emerald-400">₹{decision.expected_price} / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Rate (10 days):</span>
                  <span className="font-bold text-amber-400">₹{decision.storage_cost} / kg</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-300 font-semibold">Net Expected Margin:</span>
                  <span className="font-extrabold text-emerald-300">+₹{decision.net_gain_per_kg} / kg</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase">Decision Reasons & Risk Assessment</div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {decision.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-4 text-center">Loading decision model prediction...</div>
        )}
      </div>

      {/* Farmer Crop Lots Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            My Crop Lots Ledger
          </h2>
          <Link href="/farmer/lots" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
            View All Lots <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Lot Number</th>
                  <th className="px-4 py-3">Crop / Variety</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Quality Score</th>
                  <th className="px-4 py-3">Current Price</th>
                  <th className="px-4 py-3">Lifecycle Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{lot.lot_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{lot.crop_name}</div>
                      <div className="text-[10px] text-slate-400">{lot.variety}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{lot.quantity_kg.toLocaleString()} kg</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-800/60">
                        {lot.quality_grade} ({lot.quality_score}/100)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-300">₹{lot.current_price}/kg</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          lot.status === "STORED"
                            ? "bg-amber-950 text-amber-300 border-amber-700/50"
                            : lot.status === "AUCTION"
                            ? "bg-teal-950 text-teal-300 border-teal-700/50"
                            : lot.status === "SOLD"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-700/50"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {lot.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/farmer/lots/${lot.id}`}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-3 py-1 rounded text-[11px] transition-colors inline-flex items-center gap-1"
                      >
                        Digital Twin <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
