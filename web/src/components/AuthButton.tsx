"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-cream/20" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark"
      >
        Hyr
      </Link>
    );
  }

  const initials = (session.user.name ?? session.user.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-white transition hover:bg-terracotta-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Menuja e llogarisë"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-card border border-warm-gray-light bg-white py-1 shadow-lg">
          <div className="border-b border-warm-gray-light/50 px-4 py-2">
            <p className="text-sm font-medium text-navy">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-warm-gray">
              {session.user.email}
            </p>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2 text-sm text-navy transition hover:bg-cream-dark"
          >
            Paneli im
          </Link>
          <Link
            href="/listings/new"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2 text-sm text-navy transition hover:bg-cream-dark"
          >
            Posto njoftim
          </Link>

          <div className="border-t border-warm-gray-light/50">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              Dil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
