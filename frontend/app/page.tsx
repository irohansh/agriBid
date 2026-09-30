import Link from "next/link";
import { Sprout, Warehouse, Gavel, ShieldCheck, TrendingUp, Sparkles, CheckCircle2, ArrowRight, Activity, LineChart, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI-Driven Crop Economics for Erode Farmers</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Smart Agricultural Trading, Storage & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">Live Auction Platform</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            agriBID empowers farmers with a Digital Crop Twin lifecycle, real-time warehouse capacity reservation, market price forecasting, and our proprietary <strong className="text-emerald-400">SELL vs STORE Intelligence Engine</strong>.
          </p>

          {/* Quick Start Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/farmer/dashboard"
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Sprout className="w-5 h-5 text-slate-950" />
              Enter Farmer Portal
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/buyer/dashboard"
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Gavel className="w-5 h-5 text-amber-400" />
              Enter Live Buyer Auction
            </Link>

            <Link
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Quality Inspection & Logistics
            </Link>
          </div>

          {/* Key Stat Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
            <div className="glass-card p-4 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-emerald-400">ERD-TUR-2026</div>
              <div className="text-xs text-slate-400 mt-1">Digital Lot Tracking</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-amber-400">₹158/kg</div>
              <div className="text-xs text-slate-400 mt-1">Forecast Price Model</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-teal-400">30 Sec</div>
              <div className="text-xs text-slate-400 mt-1">Anti-Sniping Engine</div>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-purple-400">100% Real</div>
              <div className="text-xs text-slate-400 mt-1">PostgreSQL & Realtime</div>
            </div>
          </div>

        </div>
      </section>

      {/* Unique Differentiator: SELL vs STORE Engine Demo Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                <TrendingUp className="w-3.5 h-3.5" />
                KEY DIFFERENTIATOR: SELL vs STORE INTELLIGENCE
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Empowering Farmers with Explainable Holding ROI
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Instead of forcing immediate liquidation or blind auctions, our backend evaluates historical price trends, storage cost algorithms, quality moisture scores, and warehouse degradation risk to generate a deterministic <span className="text-emerald-400 font-semibold">STORE FOR 7–10 DAYS</span> or <span className="text-amber-400 font-semibold">SELL NOW</span> recommendation with complete reasoning.
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Current Price: ₹145/kg
                </span>
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Predicted: ₹158/kg
                </span>
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Storage: ₹1.20/kg/day
                </span>
              </div>
            </div>

            {/* Live Recommendation Badge Simulation */}
            <div className="w-full lg:w-96 glass-panel p-5 rounded-xl border border-emerald-500/40 space-y-4 bg-slate-900/90 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Decision Output</span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 border border-emerald-400 shadow-md">
                  RECOMMENDATION: STORE
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-b border-slate-800 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Holding Duration:</span>
                  <span className="font-bold text-emerald-300">10 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Expected Gain:</span>
                  <span className="font-bold text-emerald-300">+₹8.50 / kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Profit Boost (2,000 kg):</span>
                  <span className="font-bold text-amber-300">+₹17,000</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Decision Reasonings:</div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    Historical 30-day price trend indicates steady +8.9% price growth.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    Storage cost (₹12.00/kg) is lower than expected price gain (₹13.00/kg).
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    Curcumin 4.8% & moisture 8.5% presents low storage degradation risk.
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Workflow Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Complete End-to-End Agriculture Platform</h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            From field harvest to final settlement and logistics, every step is recorded transparently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center text-emerald-400 font-bold">
              1
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-400" />
              Digital Crop Twin
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate unique IDs like <code className="text-emerald-300 font-mono">ERD-TUR-2026-0001</code> for harvested produce. Tracks complete lot lifecycle transitions in an auditable event ledger.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-amber-400 font-bold">
              2
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-amber-400" />
              Atomic Warehouse Guard
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Farmer selects certified Erode cold storages and reserves capacity. Strict database transaction enforcement guarantees zero overbooking failures.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-teal-900/50 border border-teal-700/50 flex items-center justify-center text-teal-400 font-bold">
              3
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-teal-400" />
              Real-time Bidding & Anti-Sniping
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open live online auctions with real-time bid updates broadcast via Supabase Realtime WebSocket across tabs. Anti-sniping engine extends auction by 30 seconds for late bids.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
