"use client";

import { useState, useEffect } from "react";
import { Warehouse as WarehouseIcon, MapPin, Thermometer, Droplets, CheckCircle2, ShieldAlert, Plus, ShieldCheck } from "lucide-react";
import { Warehouse, Lot, apiFetch } from "@/lib/api";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Reservation Form State
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [requestedCapacity, setRequestedCapacity] = useState<number>(3000);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [whs, lotsData] = await Promise.all([
        apiFetch<Warehouse[]>("/warehouses"),
        apiFetch<Lot[]>("/lots"),
      ]);
      setWarehouses(whs || []);
      setLots(lotsData || []);

      if (lotsData && lotsData.length > 0) {
        setSelectedLotId(lotsData[0].id);
        setRequestedCapacity(lotsData[0].quantity_kg);
      }
    } catch (err) {
      console.error("Failed to load warehouses", err);
    } finally {
      setLoading(false);
    }
  };

  const openReserveModal = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse || !selectedLotId) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const fid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "11111111-1111-1111-1111-111111111111";
      const res: any = await apiFetch("/warehouses/reserve", {
        method: "POST",
        body: JSON.stringify({
          warehouse_id: selectedWarehouse.id,
          lot_id: selectedLotId,
          farmer_id: fid,
          requested_capacity: Number(requestedCapacity),
          duration_days: Number(durationDays),
        }),
      });

      alert(res.message || "Warehouse capacity reserved successfully!");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Reservation failed due to backend transaction error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-amber-400" />
            Certified Warehouses & Cold Storage Network
          </h1>
          <p className="text-xs text-slate-400">Atomic database capacity transactions preventing overbooking in Erode agricultural district</p>
        </div>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {warehouses.map((wh) => {
          const occupied = wh.capacity - wh.available_capacity;
          const pctOccupied = Math.round((occupied / wh.capacity) * 100);

          return (
            <div key={wh.id} className="glass-card p-6 rounded-2xl space-y-5 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{wh.name}</h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {wh.location}
                    </p>
                  </div>
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                    ₹{wh.price_per_kg_per_day} / kg / day
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Available Space:</span>
                    <span className="text-emerald-400 font-extrabold">{wh.available_capacity.toLocaleString()} kg</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${pctOccupied}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Occupied: {occupied.toLocaleString()} kg ({pctOccupied}%)</span>
                    <span>Total: {wh.capacity.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* Climate & Crop Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300">
                    <Thermometer className="w-4 h-4 text-blue-400" />
                    <span>{wh.temperature}°C Temp</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>{wh.humidity}% Humidity</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Supported Commodities:</span>
                  <div className="flex flex-wrap gap-1">
                    {wh.supported_crops.map((c, i) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openReserveModal(wh)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Reserve Capacity for Lot
              </button>
            </div>
          );
        })}
      </div>

      {/* Capacity Reservation Modal with Overbooking Guard */}
      {showModal && selectedWarehouse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-amber-400" />
              Reserve Capacity at {selectedWarehouse.name}
            </h2>

            {errorMsg && (
              <div className="bg-red-950/90 border border-red-500 text-red-200 p-3 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1 text-red-300">
                  <ShieldAlert className="w-4 h-4" />
                  DATABASE TRANSACTION ERROR
                </div>
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleReserve} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Crop Lot to Store</label>
                <select
                  value={selectedLotId}
                  onChange={(e) => {
                    setSelectedLotId(e.target.value);
                    const l = lots.find((item) => item.id === e.target.value);
                    if (l) setRequestedCapacity(l.quantity_kg);
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
                  <label className="block text-slate-300 mb-1">Requested Volume (kg)</label>
                  <input
                    type="number"
                    value={requestedCapacity}
                    onChange={(e) => setRequestedCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Available Warehouse Capacity:</span>
                  <span className="font-bold text-emerald-400">{selectedWarehouse.available_capacity.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Total Cost:</span>
                  <span className="font-bold text-amber-300">₹{(requestedCapacity * selectedWarehouse.price_per_kg_per_day * durationDays).toLocaleString()}</span>
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
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                >
                  {submitting ? "Checking DB Capacity..." : "Confirm DB Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
