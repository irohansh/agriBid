"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gavel, Search, ShieldCheck, Sparkles, Filter, ArrowRight, CheckCircle2 } from "lucide-react";
import { Auction, apiFetch } from "@/lib/api";

interface MatchedLot {
  lot_id: string;
  lot_number: string;
  farmer_name: string;
  crop_name: string;
  variety: string;
  quantity_kg: number;
  quality_grade: string;
  quality_score: number;
  current_price: number;
  match_score: number;
  match_reasons: string[];
  status: string;
  auction_id?: string;
}

export default function BuyerDashboard() {
  const [buyerId, setBuyerId] = useState("22222222-2222-2222-2222-111111111111");
  const [buyerName, setBuyerName] = useState("Spice Exports India Ltd");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [matchedLots, setMatchedLots] = useState<MatchedLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  // Search Filter State
  const [cropName, setCropName] = useState("Turmeric");
  const [minGrade, setMinGrade] = useState("Grade A");
  const [maxPrice, setMaxPrice] = useState(160);
  const [minQuantity, setMinQuantity] = useState(1000);

  useEffect(() => {
    const bid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "22222222-2222-2222-2222-111111111111";
    const bname = localStorage.getItem("agribid_user_name") || localStorage.getItem("agrinexus_user_name") || "Spice Exports India Ltd";
    setBuyerId(bid);
    setBuyerName(bname);
    loadData();
    runMatching();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Auction[]>("/auctions?status=LIVE");
      setAuctions(data || []);
    } catch (err) {
      console.error("Failed to load live auctions", err);
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async () => {
    setMatching(true);
    try {
      const res = await apiFetch<MatchedLot[]>("/buyers/match", {
        method: "POST",
        body: JSON.stringify({
          crop_name: cropName,
          min_grade: minGrade,
          max_price: Number(maxPrice),
          min_quantity: Number(minQuantity),
        }),
      });
      setMatchedLots(res || []);
    } catch (err) {
      console.error("Buyer matching error", err);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-semibold border border-amber-800">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Verified Buyer Procurement Portal
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome, {buyerName}</h1>
          <p className="text-xs text-slate-400">Direct Farm & Cold Storage Sourcing • Erode Agricultural Exchange</p>
        </div>

        <Link
          href="/farmer/auctions"
          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Gavel className="w-4 h-4" />
          View All Live Auctions
        </Link>
      </div>

      {/* SMART BUYER MATCHING TOOL */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-6 bg-slate-900/90 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              SMART BUYER MATCHING ENGINE
            </h2>
            <p className="text-xs text-slate-400">Filter harvested lots by quality grade, volume requirement, and budget price per kg</p>
          </div>

          <button
            onClick={runMatching}
            disabled={matching}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors"
          >
            {matching ? "Matching..." : "Re-Calculate Matches"}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Preferred Crop</label>
            <select
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="Turmeric">Erode Turmeric</option>
              <option value="Banana">Banana</option>
              <option value="Sugarcane">Sugarcane</option>
              <option value="Groundnut">Groundnut</option>
              <option value="Cotton">Cotton</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Min Quality Grade</label>
            <select
              value={minGrade}
              onChange={(e) => setMinGrade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Max Price Floor (₹/kg)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Min Required Volume (kg)</label>
            <input
              type="number"
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
            />
          </div>
        </div>

        {/* Matched Results Grid */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Ranked Matching Lots ({matchedLots.length} Found):</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedLots.map((m) => (
              <div key={m.lot_id} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 text-xs">{m.lot_number}</span>
                    <h3 className="font-bold text-white text-sm">{m.crop_name} ({m.variety})</h3>
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 border border-emerald-400">
                      {m.match_score}% MATCH
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Volume</span>
                    <span className="font-bold text-white">{m.quantity_kg.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Price</span>
                    <span className="font-bold text-amber-300">₹{m.current_price}/kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Quality</span>
                    <span className="font-semibold text-emerald-300">{m.quality_grade} ({m.quality_score})</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  {m.match_reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-slate-300">{r}</span>
                    </div>
                  ))}
                </div>

                {m.auction_id ? (
                  <Link
                    href={`/buyer/auctions/${m.auction_id}`}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    Enter Live Auction Room <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href={`/farmer/lots/${m.lot_id}`}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    Inspect Lot Digital Twin <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
