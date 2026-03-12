"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!supabase ? false : true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase?.auth.signOut();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="size-8 animate-pulse rounded-full bg-cream/20" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark"
      >
        Hyr
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "?";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        className="flex size-9 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-white transition hover:bg-terracotta-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Menuja e llogarisë"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-card border border-warm-gray-light bg-white py-1 shadow-lg">
          <div className="border-b border-warm-gray-light/50 px-4 py-2">
            <p className="text-sm font-medium text-navy">
              {displayName}
            </p>
            <p className="truncate text-xs text-warm-gray">
              {user.email}
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
              onClick={handleSignOut}
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
