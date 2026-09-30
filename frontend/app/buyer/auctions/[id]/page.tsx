"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Gavel, Clock, ArrowLeft, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, UserCheck, DollarSign, CreditCard, Truck } from "lucide-react";
import { Auction, Bid, Payment, apiFetch, connectRealtime } from "@/lib/api";

export default function AuctionRoomPage() {
  const params = useParams();
  const id = params?.id as string;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [buyerId, setBuyerId] = useState("22222222-2222-2222-2222-111111111111");
  const [buyerName, setBuyerName] = useState("Spice Exports India Ltd");

  // Bidding Form State
  const [bidAmount, setBidAmount] = useState<number>(150);
  const [bidding, setBidding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [antiSnipingAlert, setAntiSnipingAlert] = useState(false);
  const [paying, setPaying] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    const bid = localStorage.getItem("agribid_user_id") || localStorage.getItem("agrinexus_user_id") || "22222222-2222-2222-2222-111111111111";
    const bname = localStorage.getItem("agribid_user_name") || localStorage.getItem("agrinexus_user_name") || "Spice Exports India Ltd";
    setBuyerId(bid);
    setBuyerName(bname);

    if (id) {
      loadAuctionData();
    }

    // Subscribe to Supabase Realtime WebSocket Events across browser tabs
    const cleanupWS = connectRealtime((event) => {
      if (event.type === "BID_PLACED" && event.payload.auction_id === id) {
        const p = event.payload;
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                current_bid: p.current_bid,
                highest_bidder_id: p.highest_bidder_id,
                highest_bidder_name: p.highest_bidder_name,
                end_time: p.end_time || prev.end_time,
              }
            : null
        );

        if (p.bid) {
          setBids((prev) => [p.bid, ...prev]);
        }

        if (p.anti_sniping_extended) {
          setAntiSnipingAlert(true);
          setTimeout(() => setAntiSnipingAlert(false), 8000);
        }
      } else if (event.type === "AUCTION_CLOSED" && event.payload.auction_id === id) {
        loadAuctionData();
      }
    });

    return () => cleanupWS();
  }, [id]);

  // Countdown timer effect
  useEffect(() => {
    if (!auction || auction.status !== "LIVE") return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.end_time).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeftStr("AUCTION ENDED");
        clearInterval(interval);
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const loadAuctionData = async () => {
    try {
      const data = await apiFetch<Auction>(`/auctions/${id}`);
      setAuction(data);
      setBids(data.bids || []);
      setBidAmount(Math.ceil((data.current_bid || data.starting_price) + 2.0));

      if (data.status === "SOLD") {
        try {
          const pay = await apiFetch<Payment>(`/payments/${data.id}`);
          setPayment(pay);
        } catch (e) {
          console.log("Payment record query error", e);
        }
      }
    } catch (err) {
      console.error("Failed to load auction room", err);
    }
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;

    setBidding(true);
    setErrorMsg("");

    try {
      await apiFetch(`/auctions/${auction.id}/bids`, {
        method: "POST",
        body: JSON.stringify({
          buyer_id: buyerId,
          buyer_name: buyerName,
          amount: Number(bidAmount),
        }),
      });

      setBidAmount((prev) => prev + 2.0);
    } catch (err: any) {
      setErrorMsg(err.message || "Bid validation failed");
    } finally {
      setBidding(false);
    }
  };

  const handleCloseAuction = async () => {
    if (!auction) return;
    try {
      await apiFetch(`/auctions/${auction.id}/close`, { method: "POST" });
      loadAuctionData();
    } catch (err: any) {
      alert("Failed to close auction: " + err.message);
    }
  };

  const handleSimulatePayment = async () => {
    if (!payment) return;
    setPaying(true);
    try {
      await apiFetch("/payments/process", {
        method: "POST",
        body: JSON.stringify({
          payment_id: payment.id,
          action: "PAY",
        }),
      });

      alert("Simulated Payment Cleared! Shipment logistics order generated.");
      loadAuctionData();
    } catch (err: any) {
      alert("Payment failed: " + err.message);
    } finally {
      setPaying(false);
    }
  };

  if (!auction) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-xs text-slate-400">Entering Realtime Auction Room...</div>;
  }

  const isHighestBidder = auction.highest_bidder_id === buyerId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/farmer/auctions" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{auction.crop_name} ({auction.variety})</h1>
              <span
                className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                  auction.status === "LIVE"
                    ? "bg-teal-500 text-slate-950 border-teal-300 animate-pulse shadow-lg shadow-teal-900/50"
                    : auction.status === "SOLD"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                STATUS: {auction.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Lot #{auction.lot_number} • {auction.quantity_kg?.toLocaleString()} kg • Grade {auction.quality_grade}</p>
          </div>
        </div>

        {auction.status === "LIVE" && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseAuction}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs"
            >
              End Auction Now
            </button>

            <div className="bg-slate-900 border border-teal-500/40 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
              <Clock className="w-4 h-4 text-teal-400 animate-spin" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">TIME REMAINING</span>
                <span className="text-sm font-mono font-extrabold text-teal-300">{timeLeftStr || "LIVE"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ANTI-SNIPING TRIGGER ALERT */}
      {antiSnipingAlert && (
        <div className="bg-amber-950/90 border border-amber-500/80 text-amber-200 p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-bounce">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="text-xs space-y-0.5">
            <div className="font-extrabold text-amber-300 uppercase">ANTI-SNIPING GUARD TRIGGERED!</div>
            <p>A valid last-second bid was detected in the final 30 seconds. Auction extended by 30 seconds!</p>
          </div>
        </div>
      )}

      {/* SIMULATED PAYMENT BANNER FOR SOLD AUCTION */}
      {auction.status === "SOLD" && payment && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/50 p-6 rounded-2xl space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  AUCTION WON & SETTLEMENT PENDING
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] px-2 py-0.5 rounded font-mono font-bold">SIMULATED PAYMENT GATEWAY</span>
                </h2>
                <p className="text-xs text-slate-400">Ref: {payment.simulated_gateway_ref} • Total Amount: ₹{payment.amount?.toLocaleString()}</p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black border ${
                payment.status === "PAID"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-amber-500 text-slate-950 border-amber-400"
              }`}
            >
              PAYMENT STATUS: {payment.status}
            </span>
          </div>

          {payment.status === "PENDING" && (
            <div className="flex items-center justify-between bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-300">
                <span className="font-bold text-emerald-400 block">Winning Buyer: {payment.buyer_name || buyerName}</span>
                Click below to execute simulated gateway payment settlement.
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={paying}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <CreditCard className="w-4 h-4" />
                {paying ? "Clearing..." : "Pay Now (Simulated Gateway)"}
              </button>
            </div>
          )}

          {payment.status === "PAID" && (
            <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <span>Payment cleared! Shipment tracking order created in status <strong className="text-white">CREATED / IN TRANSIT</strong>.</span>
              </div>
              <Link href="/admin" className="text-emerald-400 underline font-semibold">
                Track Shipment
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main Bidding Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Auction Info & Bidding Panel */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Current Bid Header Card */}
          <div className="glass-panel p-6 rounded-2xl border border-teal-500/40 bg-gradient-to-r from-slate-900 to-slate-950 space-y-4 shadow-xl">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Starting Floor Price: ₹{auction.starting_price}/kg</span>
              <span>Reserve Floor Price: ₹{auction.reserve_price}/kg</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-b border-slate-800/80 py-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">Current Highest Bid</span>
                <span className="text-4xl font-extrabold text-teal-400 font-mono">₹{auction.current_bid} <span className="text-sm font-normal text-slate-400">/ kg</span></span>
              </div>

              <div className="text-sm">
                <span className="text-xs text-slate-400 block">Highest Bidder:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {auction.highest_bidder_name || "No bids placed yet"}
                </span>
              </div>
            </div>

            {/* Bidding Form (Only if LIVE) */}
            {auction.status === "LIVE" && (
              <form onSubmit={handlePlaceBid} className="space-y-3 pt-2">
                {errorMsg && (
                  <div className="bg-red-950/90 border border-red-500 text-red-200 px-3 py-2 rounded-lg text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bidding}
                    className="bg-teal-600 hover:bg-teal-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Gavel className="w-4 h-4" />
                    {bidding ? "Broadcasting..." : "Place Realtime Bid"}
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  Bidding as: <span className="font-bold text-slate-200">{buyerName}</span> • Realtime WebSocket active
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Right: Live Bid History List */}
        <div className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Live Bid History Ledger</span>
            <span className="text-[10px] bg-teal-950 text-teal-400 border border-teal-800 px-2 py-0.5 rounded font-mono">
              {bids.length} BIDS
            </span>
          </h2>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {bids.map((b, idx) => (
              <div
                key={b.id || idx}
                className={`p-3 rounded-xl border text-xs space-y-0.5 transition-all ${
                  idx === 0
                    ? "bg-teal-950/60 border-teal-500/50 text-white font-semibold shadow-md"
                    : "bg-slate-900/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{b.buyer_name}</span>
                  <span className="font-mono font-extrabold text-teal-300 text-sm">₹{b.amount}/kg</span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{idx === 0 ? "Highest Active Bid" : "outbid"}</span>
                  <span>{new Date(b.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
