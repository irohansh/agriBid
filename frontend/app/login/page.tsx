"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sprout, UserCheck, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";

const QUICK_LOGINS = [
  { id: "11111111-1111-1111-1111-111111111111", email: "farmer1@agribid.in", name: "Karuppusamy M.", role: "FARMER", key: "FARMER_1" },
  { id: "22222222-2222-2222-2222-111111111111", email: "buyer1@agribid.in", name: "Spice Exports India Ltd", role: "BUYER", key: "BUYER_1" },
  { id: "33333333-3333-3333-3333-333333333333", email: "admin@agribid.in", name: "Dr. K. Arumugam (Inspector)", role: "ADMIN", key: "ADMIN_1" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("farmer1@agribid.in");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res: any = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: "demo" }),
      });

      localStorage.setItem("agribid_token", res.token);
      localStorage.setItem("agribid_user_id", res.profile.id);
      localStorage.setItem("agribid_user_role", res.profile.role);
      localStorage.setItem("agribid_user_name", res.profile.full_name);

      if (res.profile.role === "BUYER") {
        router.push("/buyer/dashboard");
      } else if (res.profile.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/farmer/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const selectQuickLogin = (user: typeof QUICK_LOGINS[0]) => {
    setEmail(user.email);
    localStorage.setItem("agribid_user_key", user.key);
    localStorage.setItem("agribid_user_id", user.id);
    localStorage.setItem("agribid_user_role", user.role);
    localStorage.setItem("agribid_user_name", user.name);

    if (user.role === "BUYER") {
      router.push("/buyer/dashboard");
    } else if (user.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/farmer/dashboard");
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl space-y-6 border border-slate-800">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto text-slate-950 font-black shadow-lg">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Sign In to agriBID</h1>
          <p className="text-xs text-slate-400">Smart Agricultural Trading & Auction Platform</p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-300 px-4 py-2.5 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* One-Click Demo Role Login Buttons */}
        <div className="space-y-2 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            Quick Demo 1-Click Login
          </div>
          <div className="space-y-1.5 pt-1">
            {QUICK_LOGINS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectQuickLogin(u)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs flex items-center justify-between transition-colors border border-slate-700/60"
              >
                <div>
                  <div className="font-semibold text-white">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{u.email}</div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    u.role === "FARMER"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50"
                      : u.role === "BUYER"
                      ? "bg-amber-950 text-amber-400 border border-amber-700/50"
                      : "bg-purple-950 text-purple-400 border border-purple-700/50"
                  }`}
                >
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. farmer1@agribid.in"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {loading ? "Signing in..." : "Continue to Dashboard"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Don't have an account?{" "}
          <Link href="/register" className="text-emerald-400 hover:underline font-semibold">
            Create Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
