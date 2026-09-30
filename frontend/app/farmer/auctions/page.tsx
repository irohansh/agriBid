"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gavel, Plus, Clock, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { Auction, Lot, apiFetch } from "@/lib/api";

export default function FarmerAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Auction Form State
  const [selectedLotId, setSelectedLotId] = useState("");
  const [startingPrice, setStartingPrice] = useState(140);
  const [reservePrice, setReservePrice] = useState(148);
  const [durationMins, setDurationMins] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aucs, lotsData] = await Promise.all([
        apiFetch<Auction[]>("/auctions"),
        apiFetch<Lot[]>("/lots"),
      ]);
      setAuctions(aucs || []);
      setLots(lotsData || []);

      if (lotsData && lotsData.length > 0) {
        setSelectedLotId(lotsData[0].id);
        setStartingPrice(lotsData[0].current_price);
        setReservePrice(lotsData[0].current_price * 1.05);
      }
    } catch (err) {
      console.error("Failed to load auctions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId) return;

    setSubmitting(true);
    try {
      const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "11111111-1111-1111-1111-111111111111";
      const res: any = await apiFetch("/auctions", {
        method: "POST",
        body: JSON.stringify({
          lot_id: selectedLotId,
          farmer_id: fid,
          starting_price: Number(startingPrice),
          reserve_price: Number(reservePrice),
          duration_mins: Number(durationMins),
        }),
      });

      setShowModal(false);
      loadData();
      if (res && res.id) {
        window.location.href = `/buyer/auctions/${res.id}`;
      }
    } catch (err: any) {
      alert("Failed to create auction: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Gavel className="w-6 h-6 text-teal-400" />
            Online Live Auctions Ledger
          </h1>
          <p className="text-xs text-slate-400">Server-authoritative bidding with real-time WebSocket broadcast & anti-sniping protection</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Online Auction
        </button>
      </div>

      {/* Auctions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {auctions.map((auc) => (
          <div key={auc.id} className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono font-bold text-sm text-emerald-400">{auc.lot_number || "LOT"}</span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    auc.status === "LIVE"
                      ? "bg-teal-500 text-slate-950 border-teal-300 animate-pulse"
                      : auc.status === "SOLD"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-700/50"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {auc.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{auc.crop_name} ({auc.variety})</h3>
                <p className="text-xs text-slate-400">Volume: {auc.quantity_kg?.toLocaleString()} kg • Grade {auc.quality_grade}</p>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Starting Price:</span>
                  <span className="font-semibold text-slate-200">₹{auc.starting_price}/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reserve Guard:</span>
                  <span className="font-semibold text-slate-200">₹{auc.reserve_price}/kg</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-300 font-bold">Highest Current Bid:</span>
                  <span className="font-extrabold text-teal-400 text-sm">₹{auc.current_bid}/kg</span>
                </div>
                {auc.highest_bidder_name && (
                  <div className="text-[10px] text-teal-300/80 pt-0.5">
                    Highest Bidder: <span className="font-semibold">{auc.highest_bidder_name}</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              href={`/buyer/auctions/${auc.id}`}
              className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700/80"
            >
              Enter Auction Room <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* Auction Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-teal-400" />
              Create Live Online Auction
            </h2>

            <form onSubmit={handleCreateAuction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Crop Lot</label>
                <select
                  value={selectedLotId}
                  onChange={(e) => {
                    setSelectedLotId(e.target.value);
                    const l = lots.find((item) => item.id === e.target.value);
                    if (l) {
                      setStartingPrice(l.current_price);
                      setReservePrice(l.current_price * 1.05);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                >
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lot_number} ({l.crop_name} - {l.quantity_kg} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Starting Price (₹/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Reserve Floor Price (₹/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Auction Duration (Minutes)</label>
                <input
                  type="number"
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold"
                >
                  {submitting ? "Opening Room..." : "Open Live Auction Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
