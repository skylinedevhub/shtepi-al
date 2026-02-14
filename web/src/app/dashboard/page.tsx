"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface DashboardListing {
  id: string;
  title: string;
  city: string | null;
  price: number | null;
  status: string;
  images: string[];
  createdAt: string | null;
  transactionType: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Skicë", color: "bg-warm-gray/20 text-warm-gray" },
  pending: { label: "Në pritje", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "Aktiv", color: "bg-green-100 text-green-800" },
  rejected: { label: "Refuzuar", color: "bg-red-100 text-red-800" },
  expired: { label: "Skaduar", color: "bg-orange-100 text-orange-800" },
  archived: { label: "Arkivuar", color: "bg-gray-100 text-gray-600" },
};

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    async function load() {
      try {
        const res = await fetch("/api/listings/my");
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase.auth]);

  async function handleDelete(id: string) {
    if (!confirm("Jeni i sigurt që doni ta fshini këtë njoftim?")) return;

    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">
            Paneli im
          </h1>
          <p className="mt-1 text-sm text-warm-gray">
            Mirë se vini, {user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "Përdorues"}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="inline-flex items-center gap-2 rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Posto njoftim
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-shimmer h-48 rounded-card"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-card border border-warm-gray-light bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-warm-gray/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
            />
          </svg>
          <h2 className="mt-4 font-display text-lg font-semibold text-navy">
            Nuk keni njoftime
          </h2>
          <p className="mt-2 text-sm text-warm-gray">
            Postoni njoftimin tuaj të parë për ta shfaqur këtu.
          </p>
          <Link
            href="/listings/new"
            className="mt-4 inline-block rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark"
          >
            Posto njoftim
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const statusInfo = STATUS_LABELS[listing.status] ?? STATUS_LABELS.draft;
            const firstImage = listing.images?.[0];

            return (
              <div
                key={listing.id}
                className="overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[16/10] bg-cream-dark">
                  {firstImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={firstImage}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-warm-gray/30">
                      <svg
                        className="h-10 w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-1 font-medium text-navy">
                    {listing.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-warm-gray">
                    {listing.city && <span>{listing.city}</span>}
                    {listing.price && (
                      <span className="font-medium text-terracotta">
                        €{listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/listings/edit/${listing.id}`}
                      className="rounded-btn border border-warm-gray-light px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-cream-dark"
                    >
                      Ndrysho
                    </Link>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="rounded-btn border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Fshi
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
