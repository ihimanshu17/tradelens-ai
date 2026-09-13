import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeLens AI — Turn Trading Ideas into Testable Research",
  description: "AI-native quantitative trading research platform implementing ASK -> CLARIFY -> DEFINE -> TEST -> LEARN.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 terminal-grid">{children}</main>
          <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>TradeLens AI — Technical Prototype for SUAS Enterprises Intern Assignment</p>
              <p className="text-slate-600">Simulated Research Data • Not Financial Advice</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
