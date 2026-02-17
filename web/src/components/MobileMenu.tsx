"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Hap menunë"
        className="rounded-lg p-2 text-cream/70 transition hover:text-cream"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-72 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-cream-dark px-4 py-4">
          <span className="font-display text-lg font-bold text-navy">
            <span className="text-terracotta">Shtëpi</span>AL
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Mbyll menunë"
            className="rounded-lg p-2 text-warm-gray transition hover:bg-cream-dark"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col px-4 py-4">
          <Link
            href="/listings"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark hover:text-terracotta"
          >
            Të gjitha njoftimet
          </Link>
          <Link
            href="/listings?transaction_type=sale"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark hover:text-terracotta"
          >
            Shitje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark hover:text-terracotta"
          >
            Qira
          </Link>
          <hr className="my-3 border-cream-dark" />
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-warm-gray">
            Qytete
          </p>
          {["Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë"].map((city) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-warm-gray transition hover:bg-cream-dark hover:text-terracotta"
            >
              {city}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
