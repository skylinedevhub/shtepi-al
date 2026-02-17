"use client";

import { Suspense } from "react";
import NavLink from "./NavLink";

const linkBase =
  "rounded-lg px-3 py-2 text-cream/70 transition-colors duration-200 hover:bg-white/5 hover:text-cream";
const linkActive = "bg-white/10 text-cream font-semibold";

function NavLinks() {
  return (
    <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
      <NavLink href="/listings" className={linkBase} activeClassName={linkActive}>
        Të gjitha
      </NavLink>
      <NavLink
        href="/listings?transaction_type=sale"
        matchParam="transaction_type=sale"
        className={linkBase}
        activeClassName={linkActive}
      >
        Shitje
      </NavLink>
      <NavLink
        href="/listings?transaction_type=rent"
        matchParam="transaction_type=rent"
        className={linkBase}
        activeClassName={linkActive}
      >
        Qira
      </NavLink>
    </nav>
  );
}

export default function DesktopNav() {
  return (
    <Suspense fallback={
      <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
        <span className="rounded-lg px-3 py-2 text-cream/70">Të gjitha</span>
        <span className="rounded-lg px-3 py-2 text-cream/70">Shitje</span>
        <span className="rounded-lg px-3 py-2 text-cream/70">Qira</span>
      </nav>
    }>
      <NavLinks />
    </Suspense>
  );
}
