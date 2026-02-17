"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import NavLink from "./NavLink";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cityToSlug } from "@/lib/seo/slugs";

const linkBase =
  "rounded-lg px-3 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark hover:text-terracotta";
const linkActive = "bg-cream-dark text-terracotta font-semibold";

function MobileNavLinks({ close }: { close: () => void }) {
  return (
    <>
      <NavLink href="/listings" onClick={close} className={linkBase} activeClassName={linkActive}>
        Të gjitha njoftimet
      </NavLink>
      <NavLink
        href="/listings?transaction_type=sale"
        matchParam="transaction_type=sale"
        onClick={close}
        className={linkBase}
        activeClassName={linkActive}
      >
        Shitje
      </NavLink>
      <NavLink
        href="/listings?transaction_type=rent"
        matchParam="transaction_type=rent"
        onClick={close}
        className={linkBase}
        activeClassName={linkActive}
      >
        Qira
      </NavLink>
    </>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useBodyScrollLock(open);
  useEscapeKey(close, open);

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

      {/* Overlay — always rendered, transition opacity */}
      <div
        className={`fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menuja kryesore"
        className={`fixed right-0 top-0 z-50 h-full w-72 max-w-[80vw] bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-cream-dark px-4 py-4">
          <span className="font-display text-lg font-bold text-navy">
            <span className="text-gold">Shtëpi</span>AL
          </span>
          <button
            onClick={close}
            aria-label="Mbyll menunë"
            className="rounded-lg p-2 text-warm-gray transition hover:bg-cream-dark"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col px-4 py-4">
          <Suspense fallback={
            <>
              <span className={linkBase}>Të gjitha njoftimet</span>
              <span className={linkBase}>Shitje</span>
              <span className={linkBase}>Qira</span>
            </>
          }>
            <MobileNavLinks close={close} />
          </Suspense>
          <hr className="my-3 border-cream-dark" />
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-warm-gray">
            Qytete
          </p>
          {["Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë"].map((city) => (
            <Link
              key={city}
              href={`/${cityToSlug(city)}`}
              onClick={close}
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
