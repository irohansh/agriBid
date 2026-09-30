"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sprout, Plus, ArrowRight, CheckCircle2, Search, Filter, ShieldCheck } from "lucide-react";
import { Lot, apiFetch } from "@/lib/api";

export default function LotsPage() {
  const [farmerId, setFarmerId] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // New Lot Form State
  const [cropName, setCropName] = useState("Turmeric");
  const [variety, setVariety] = useState("Erode Finger (Viral Manjal)");
  const [quantityKg, setQuantityKg] = useState(2000);
  const [harvestDate, setHarvestDate] = useState("2026-09-30");
  const [qualityGrade, setQualityGrade] = useState("Grade A");
  const [qualityScore, setQualityScore] = useState(92.5);
  const [currentPrice, setCurrentPrice] = useState(145.0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "11111111-1111-1111-1111-111111111111";
    setFarmerId(fid);
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Lot[]>("/lots");
      setLots(data || []);
    } catch (err) {
      console.error("Failed to load lots", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newLot = await apiFetch<Lot>("/lots", {
        method: "POST",
        body: JSON.stringify({
          farmer_id: farmerId,
          crop_name: cropName,
          variety,
          quantity_kg: Number(quantityKg),
          harvest_date: harvestDate,
          quality_grade: qualityGrade,
          quality_score: Number(qualityScore),
          current_price: Number(currentPrice),
        }),
      });

      setShowModal(false);
      fetchLots();
    } catch (err: any) {
      alert("Failed to create lot: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLots = lots.filter(
    (l) =>
      l.crop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.variety.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-400" />
            Digital Crop Twins & Harvest Lots
          </h1>
          <p className="text-xs text-slate-400">Unique lot identifiers tracking full lifecycle from farm to final settlement</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Register New Crop Lot
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Lot ID (e.g. ERD-TUR-2026), Crop, or Variety..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Lots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLots.map((lot) => (
          <div key={lot.id} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono font-bold text-sm text-emerald-400">{lot.lot_number}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{lot.crop_name}</h3>
                <p className="text-xs text-slate-400">{lot.variety}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block">Quantity</span>
                  <span className="font-bold text-white">{lot.quantity_kg.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Price</span>
                  <span className="font-bold text-amber-300">₹{lot.current_price}/kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Quality Grade</span>
                  <span className="font-semibold text-emerald-300">{lot.quality_grade}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Score</span>
                  <span className="font-bold text-emerald-400">{lot.quality_score} / 100</span>
                </div>
              </div>
            </div>

            <Link
              href={`/farmer/lots/${lot.id}`}
              className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700/80"
            >
              View Digital Twin & Decision Engine <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-400" />
              Register Harvest Crop Lot
            </h2>

            <form onSubmit={handleCreateLot} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Crop Type</label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Turmeric">Erode Turmeric (Manjal)</option>
                  <option value="Banana">Banana (Sevazhai/Poovan)</option>
                  <option value="Sugarcane">Sugarcane (Karumbu)</option>
                  <option value="Groundnut">Groundnut (Kadalai)</option>
                  <option value="Cotton">Cotton (MCU-5 Fiber)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Variety / Sub-type</label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Current Spot Price (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Grade</label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Quality Score (0-100)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qualityScore}
                    onChange={(e) => setQualityScore(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold"
                >
                  {submitting ? "Generating ID..." : "Generate Lot ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
