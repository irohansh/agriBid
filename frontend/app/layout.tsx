import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "agriBID | Smart Agricultural Trading, Storage & Auction Platform",
  description: "Digital twin for crop lots, market price forecasting, smart SELL vs STORE engine, and real-time auction platform for Erode farmers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-6 text-xs text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-bold text-emerald-400">agriBID</span> • Smart Agricultural Trading & Auction Platform
            </div>
            <div className="text-slate-500">
              Erode Agricultural Market Hub • Tamil Nadu, India
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
