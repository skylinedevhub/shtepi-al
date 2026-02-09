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
        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <span className="text-lg font-bold text-primary">ShtëpiAL</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Mbyll menunë"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
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
            className="rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Të gjitha njoftimet
          </Link>
          <Link
            href="/listings?transaction_type=sale"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Shitje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Qira
          </Link>
          <hr className="my-3 border-gray-100" />
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Qytete
          </p>
          {["Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë"].map((city) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              {city}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
