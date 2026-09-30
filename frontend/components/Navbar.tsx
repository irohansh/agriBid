"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sprout, Warehouse, Gavel, ShieldCheck, Truck, Sparkles, UserCheck, ChevronDown } from "lucide-react";
import { Profile, apiFetch } from "@/lib/api";

const DEMO_PROFILES: Record<string, { id: string; name: string; role: "FARMER" | "BUYER" | "ADMIN"; email: string }> = {
  FARMER_1: { id: "11111111-1111-1111-1111-111111111111", name: "Karuppusamy M. (Farmer)", role: "FARMER", email: "farmer1@agribid.in" },
  BUYER_1: { id: "22222222-2222-2222-2222-111111111111", name: "Spice Exports Ltd (Buyer)", role: "BUYER", email: "buyer1@agribid.in" },
  ADMIN_1: { id: "33333333-3333-3333-3333-333333333333", name: "Dr. K. Arumugam (Inspector)", role: "ADMIN", email: "admin@agribid.in" },
};

export default function Navbar() {
  const pathname = usePathname();
  const [activeUserKey, setActiveUserKey] = useState<string>("FARMER_1");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("agribid_user_key") || localStorage.getItem("agrinexus_user_key");
    if (saved && DEMO_PROFILES[saved]) {
      setActiveUserKey(saved);
    } else {
      localStorage.setItem("agribid_user_key", "FARMER_1");
      localStorage.setItem("agribid_user_id", DEMO_PROFILES["FARMER_1"].id);
      localStorage.setItem("agribid_user_role", DEMO_PROFILES["FARMER_1"].role);
      localStorage.setItem("agribid_user_name", DEMO_PROFILES["FARMER_1"].name);
    }
  }, []);

  const switchRole = (key: string) => {
    const p = DEMO_PROFILES[key];
    if (p) {
      setActiveUserKey(key);
      localStorage.setItem("agribid_user_key", key);
      localStorage.setItem("agribid_user_id", p.id);
      localStorage.setItem("agribid_user_role", p.role);
      localStorage.setItem("agribid_user_name", p.name);
      setDropdownOpen(false);
      window.location.reload();
    }
  };

  const currentRole = DEMO_PROFILES[activeUserKey]?.role || "FARMER";

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-emerald-400 hover:text-emerald-300 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-extrabold shadow-md">
            <Sprout className="w-5 h-5 text-slate-950" />
          </div>
          <span>agri<span className="text-white font-extrabold">BID</span></span>
          <span className="text-[10px] font-semibold tracking-wide bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full ml-1 hidden sm:inline-block">
            ERODE HUB
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/farmer/dashboard"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/farmer/dashboard") || pathname === "/"
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Dashboard
          </Link>

          <Link
            href="/farmer/lots"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/farmer/lots")
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Sprout className="w-4 h-4" />
            Crop Lots
          </Link>

          <Link
            href="/farmer/warehouses"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/farmer/warehouses")
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Warehouses
          </Link>

          <Link
            href="/farmer/auctions"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/farmer/auctions") || pathname.startsWith("/buyer/auctions")
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Gavel className="w-4 h-4" />
            Live Auctions
          </Link>

          <Link
            href="/buyer/dashboard"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/buyer/dashboard")
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Buyer Portal
          </Link>

          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Truck className="w-4 h-4" />
            Inspector & Logistics
          </Link>
        </nav>

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-semibold text-emerald-300">{DEMO_PROFILES[activeUserKey]?.name.split(" ")[0]}</span>
            <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-800">
              {currentRole}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-xl">
              <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Switch Demo User Profile
              </div>

              {Object.entries(DEMO_PROFILES).map(([key, prof]) => (
                <button
                  key={key}
                  onClick={() => switchRole(key)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    activeUserKey === key ? "bg-emerald-950/40 text-emerald-400 font-semibold" : "text-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-100">{prof.name}</div>
                    <div className="text-[10px] text-slate-400">{prof.email}</div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      prof.role === "FARMER"
                        ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
                        : prof.role === "BUYER"
                        ? "bg-amber-900/60 text-amber-300 border border-amber-700/50"
                        : "bg-purple-900/60 text-purple-300 border border-purple-700/50"
                    }`}
                  >
                    {prof.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
