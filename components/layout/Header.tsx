"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, PlusCircle, FlaskConical, History, Info } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Research", icon: Compass },
    { href: "/experiments", label: "Experiments", icon: FlaskConical },
    { href: "/experiments?view=history", label: "History", icon: History },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-all group-hover:border-emerald-500/60 group-hover:bg-emerald-500/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-slate-100">TradeLens AI</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-400 border border-emerald-500/20">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Turn trading ideas into testable research</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-slate-100 border border-slate-700"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/70"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Experiment</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
