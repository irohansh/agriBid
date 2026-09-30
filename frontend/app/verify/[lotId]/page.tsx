"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, QrCode, ArrowLeft, ExternalLink, Award } from "lucide-react";
import { PublicVerification, apiFetch } from "@/lib/api";

export default function PublicVerifyPage() {
  const params = useParams();
  const lotId = params?.lotId as string;

  const [verifyData, setVerifyData] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lotId) {
      loadVerifyData();
    }
  }, [lotId]);

  const loadVerifyData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<PublicVerification>(`/verify/${lotId}`);
      setVerifyData(data);
    } catch (err: any) {
      setError("Digital Quality Certificate not found or unverified lot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-emerald-500 flex items-center justify-center mx-auto text-slate-950 font-black shadow-xl">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Public Quality Verification Ledger</h1>
        <p className="text-xs text-slate-400">Cryptographically verifiable produce quality certificate for Erode Agriculture Market</p>
      </div>

      {loading && (
        <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-400">
          Verifying certificate authenticity against Supabase ledger...
        </div>
      )}

      {error && (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3 border border-red-500/30">
          <div className="text-red-400 font-bold text-sm">{error}</div>
          <p className="text-xs text-slate-400">The requested Lot ID does not have a verified Quality Certificate issued yet.</p>
          <Link href="/" className="text-emerald-400 hover:underline text-xs font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to agriBID
          </Link>
        </div>
      )}

      {verifyData && (
        <div className="glass-panel p-8 rounded-2xl space-y-6 border border-emerald-500/40 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Certificate Number</span>
              <div className="text-xl font-mono font-extrabold text-emerald-400">{verifyData.certificate_no}</div>
            </div>

            <span className="px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 border border-emerald-300 shadow-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {verifyData.certificate_status}
            </span>
          </div>

          {/* Produce Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[10px]">Lot Number</span>
              <span className="font-mono font-bold text-white">{verifyData.lot_number}</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[10px]">Crop / Variety</span>
              <span className="font-bold text-white">{verifyData.crop_name} ({verifyData.variety})</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[10px]">Quantity</span>
              <span className="font-bold text-emerald-400">{verifyData.quantity_kg?.toLocaleString()} kg</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block text-[10px]">Lifecycle Status</span>
              <span className="font-bold text-amber-300">{verifyData.lifecycle_status}</span>
            </div>
          </div>

          {/* Inspection Metrics */}
          <div className="bg-slate-950/90 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase border-b border-slate-800 pb-2">Certified Inspection Metrics:</div>
            
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Moisture Content</span>
                <span className="text-base font-extrabold text-white">{verifyData.moisture}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Purity Index</span>
                <span className="text-base font-extrabold text-white">{verifyData.purity}%</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Foreign Matter</span>
                <span className="text-base font-extrabold text-white">{verifyData.foreign_matter}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-xs">
              <div>
                <span className="text-slate-400">Quality Grade: </span>
                <span className="font-bold text-emerald-400 text-sm">{verifyData.quality_grade}</span>
              </div>

              <div>
                <span className="text-slate-400">Quality Score: </span>
                <span className="font-extrabold text-emerald-300 text-sm">{verifyData.quality_score} / 100</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <div>
              Verified by <span className="font-semibold text-white">{verifyData.inspector_name}</span>
            </div>
            <div>{verifyData.verified_at}</div>
          </div>

        </div>
      )}

    </div>
  );
}
