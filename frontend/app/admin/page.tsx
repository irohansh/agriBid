"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Truck, Plus, QrCode, CheckCircle2, ArrowRight, MapPin, ExternalLink } from "lucide-react";
import { Lot, QualityCertificate, Shipment, apiFetch } from "@/lib/api";

export default function AdminPortalPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Quality Certificate Form State
  const [selectedLotId, setSelectedLotId] = useState("");
  const [moisture, setMoisture] = useState(8.5);
  const [purity, setPurity] = useState(98.2);
  const [foreignMatter, setForeignMatter] = useState(0.4);
  const [weight, setWeight] = useState(2000);
  const [grade, setGrade] = useState("Grade A");
  const [qualityScore, setQualityScore] = useState(94.5);
  const [inspectorName, setInspectorName] = useState("Dr. K. Arumugam, Senior Inspector");
  const [submittingCert, setSubmittingCert] = useState(false);

  // Logistics Update Form State
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("IN_TRANSIT");
  const [currentLocation, setCurrentLocation] = useState("Erode SIPCOT Highway Toll");
  const [updatingLogistics, setUpdatingLogistics] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lotsData, shipmentsData] = await Promise.all([
        apiFetch<Lot[]>("/lots"),
        apiFetch<Shipment[]>("/shipments"),
      ]);
      setLots(lotsData || []);
      setShipments(shipmentsData || []);

      if (lotsData && lotsData.length > 0) {
        setSelectedLotId(lotsData[0].id);
        setWeight(lotsData[0].quantity_kg);
      }

      if (shipmentsData && shipmentsData.length > 0) {
        setSelectedShipmentId(shipmentsData[0].id);
        setShipmentStatus(shipmentsData[0].status);
        setCurrentLocation(shipmentsData[0].current_location);
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId) return;

    setSubmittingCert(true);
    try {
      const inspectorId = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "33333333-3333-3333-3333-333333333333";
      const cert = await apiFetch<QualityCertificate>("/certificates", {
        method: "POST",
        body: JSON.stringify({
          lot_id: selectedLotId,
          moisture: Number(moisture),
          purity: Number(purity),
          foreign_matter: Number(foreignMatter),
          weight: Number(weight),
          grade,
          quality_score: Number(qualityScore),
          inspector_name: inspectorName,
          document_url: "https://agribid.in/docs/cert-001.pdf",
          inspector_id: inspectorId,
        }),
      });

      alert(`Quality Certificate ${cert.certificate_no} generated! QR verify URL created.`);
      loadData();
    } catch (err: any) {
      alert("Failed to issue certificate: " + err.message);
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentId) return;

    setUpdatingLogistics(true);
    try {
      const updatedBy = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "33333333-3333-3333-3333-333333333333";
      await apiFetch(`/shipments/${selectedShipmentId}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: shipmentStatus,
          current_location: currentLocation,
          updated_by: updatedBy,
        }),
      });

      alert("Shipment status updated cleanly!");
      loadData();
    } catch (err: any) {
      alert("Failed to update shipment: " + err.message);
    } finally {
      setUpdatingLogistics(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            Quality Inspector & Logistics Portal
          </h1>
          <p className="text-xs text-slate-400">Issue official digital quality certificates with QR code verification and track shipment logistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Quality Certificate Issuer Form */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-purple-500/30 bg-slate-900/90 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Issue Digital Quality Certificate
          </h2>

          <form onSubmit={handleCreateCertificate} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Select Harvest Crop Lot</label>
              <select
                value={selectedLotId}
                onChange={(e) => {
                  setSelectedLotId(e.target.value);
                  const l = lots.find((item) => item.id === e.target.value);
                  if (l) setWeight(l.quantity_kg);
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Moisture (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={moisture}
                  onChange={(e) => setMoisture(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Purity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={purity}
                  onChange={(e) => setPurity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Foreign Matter (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={foreignMatter}
                  onChange={(e) => setForeignMatter(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Certified Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Inspector Authority Name</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingCert}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              <QrCode className="w-4 h-4" />
              {submittingCert ? "Issuing Certificate..." : "Issue Quality Certificate & QR Link"}
            </button>
          </form>
        </div>

        {/* Logistics Shipment Status Tracker Form */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-blue-500/30 bg-slate-900/90 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Update Shipment Logistics Status
          </h2>

          <form onSubmit={handleUpdateShipment} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Select Active Shipment</label>
              <select
                value={selectedShipmentId}
                onChange={(e) => {
                  setSelectedShipmentId(e.target.value);
                  const s = shipments.find((item) => item.id === e.target.value);
                  if (s) {
                    setShipmentStatus(s.status);
                    setCurrentLocation(s.current_location);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                required
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.tracking_number} ({s.crop_name} - {s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">New Workflow Status</label>
              <select
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="CREATED">CREATED</option>
                <option value="PICKED_UP">PICKED UP</option>
                <option value="IN_TRANSIT">IN TRANSIT</option>
                <option value="DELIVERED">DELIVERED (COMPLETES LOT LIFECYCLE)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Current Transit Location</label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={updatingLogistics}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              <Truck className="w-4 h-4" />
              {updatingLogistics ? "Updating Status..." : "Update Shipment Status"}
            </button>
          </form>

          {/* Active Shipments List */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase">Active Logistics Orders:</div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {shipments.map((s) => (
                <div key={s.id} className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-blue-400 mr-2">#{s.tracking_number}</span>
                    <span className="font-semibold text-white">{s.crop_name}</span>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" /> {s.current_location}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === "DELIVERED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-blue-950 text-blue-300 border border-blue-800"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
