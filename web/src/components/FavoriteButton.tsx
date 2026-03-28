"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const LOCAL_STORAGE_KEY = "shtepi_favorites";

function getLocalFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setLocalFavorites(ids: string[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
}

interface FavoriteButtonProps {
  listingId: string;
  /** Preloaded favorite state — avoids extra API call */
  initialFavorited?: boolean;
  /** Render variant */
  variant?: "overlay" | "inline";
}

export default function FavoriteButton({
  listingId,
  initialFavorited,
  variant = "overlay",
}: FavoriteButtonProps) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then((res) => {
        const uid = res.data.user?.id ?? null;
        setUserId(uid);

        if (!uid) {
          // Not authenticated — check localStorage
          const local = getLocalFavorites();
          setFavorited(local.includes(listingId));
        }
      });
    } else {
      // No supabase client — use localStorage
      const local = getLocalFavorites();
      setFavorited(local.includes(listingId));
    }
  }, [supabase, listingId]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (loading) return;

      if (!userId) {
        // Not authenticated — toggle in localStorage and show tooltip
        const local = getLocalFavorites();
        const next = local.includes(listingId)
          ? local.filter((id) => id !== listingId)
          : [...local, listingId];
        setLocalFavorites(next);
        setFavorited(next.includes(listingId));

        if (!local.includes(listingId)) {
          setShowTooltip(true);
          setTimeout(() => setShowTooltip(false), 3000);
        }
        return;
      }

      // Optimistic update
      setFavorited((prev) => !prev);
      setLoading(true);

      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });

        if (res.ok) {
          const data = await res.json();
          setFavorited(data.favorited);
        } else {
          // Revert on error
          setFavorited((prev) => !prev);
        }
      } catch {
        setFavorited((prev) => !prev);
      } finally {
        setLoading(false);
      }
    },
    [userId, listingId, loading]
  );

  const isOverlay = variant === "overlay";

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label={favorited ? "Hiq nga të ruajturat" : "Ruaj njoftimin"}
        aria-pressed={favorited}
        className={cn(
          "group/fav transition-all duration-200",
          isOverlay
            ? "flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white hover:shadow-md"
            : "shrink-0 rounded-btn border border-warm-gray-light p-2.5 text-warm-gray transition hover:bg-cream-dark hover:text-navy"
        )}
      >
        <svg
          className={cn(
            "transition-colors duration-200",
            isOverlay ? "h-4.5 w-4.5" : "h-5 w-5",
            favorited
              ? "fill-terracotta text-terracotta"
              : isOverlay
                ? "fill-none text-navy/60 group-hover/fav:text-terracotta"
                : "fill-none text-warm-gray group-hover/fav:text-terracotta"
          )}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </button>

      {showTooltip && (
        <div
          className={cn(
            "absolute z-10 whitespace-nowrap rounded-md bg-navy px-2.5 py-1.5 text-xs text-cream shadow-lg",
            isOverlay
              ? "left-1/2 top-full mt-2 -translate-x-1/2"
              : "bottom-full left-1/2 mb-2 -translate-x-1/2"
          )}
          role="tooltip"
        >
          Krijoni llogari për të ruajtur
        </div>
      )}
    </div>
  );
}
