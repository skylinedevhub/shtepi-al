"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminStats {
  pending_count: number;
  active_user_listings: number;
  total_users: number;
}

interface PendingListing {
  id: string;
  title: string;
  city: string | null;
  price: number | null;
  transaction_type: string;
  images: string[];
  created_at: string | null;
  user_email: string | null;
}

const STAT_CARDS: {
  key: keyof AdminStats;
  label: string;
  icon: string;
}[] = [
  { key: "pending_count", label: "Në pritje", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "active_user_listings", label: "Njoftime aktive", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "total_users", label: "Përdorues total", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [unauthorized, setUnauthorized] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, listingsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/listings"),
      ]);

      if (statsRes.status === 403 || listingsRes.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.listings);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_count: prev.pending_count - 1,
              active_user_listings: prev.active_user_listings + 1,
            }
          : prev
      );
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setActionLoading(id);

    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        reason: rejectReason.trim(),
      }),
    });

    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      setStats((prev) =>
        prev
          ? { ...prev, pending_count: prev.pending_count - 1 }
          : prev
      );
    }
    setRejectId(null);
    setRejectReason("");
    setActionLoading(null);
  }

  if (loading) return null; // layout shows loading.tsx

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center">
          <h1 className="font-display text-2xl font-bold text-red-700">
            Akses i refuzuar
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Nuk keni leje për të aksesuar panelin e administrimit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-navy">
        Paneli i administrimit
      </h1>

      {/* Stats cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAT_CARDS.map(({ key, label, icon }) => (
            <div
              key={key}
              className="rounded-card border border-warm-gray-light bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-dark">
                  <svg
                    className="h-5 w-5 text-navy"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={icon}
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-warm-gray">{label}</p>
                  <p className="font-display text-2xl font-bold text-navy">
                    {stats[key]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending listings queue */}
      <h2 className="mb-4 font-display text-xl font-semibold text-navy">
        Njoftime në pritje
      </h2>

      {listings.length === 0 ? (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 font-display text-lg font-semibold text-navy">
            Asnjë njoftim në pritje
          </h3>
          <p className="mt-2 text-sm text-warm-gray">
            Të gjitha njoftimet janë shqyrtuar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm"
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {/* Thumbnail */}
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-cream-dark">
                  {listing.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-warm-gray/30">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 font-medium text-navy">
                    {listing.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-warm-gray">
                    {listing.city && <span>{listing.city}</span>}
                    {listing.price != null && (
                      <span className="font-medium tabular-nums text-terracotta">
                        &euro;{listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    <span className="capitalize">{listing.transaction_type}</span>
                    {listing.created_at && (
                      <span>
                        {new Date(listing.created_at).toLocaleDateString("sq-AL")}
                      </span>
                    )}
                  </div>
                  {listing.user_email && (
                    <p className="mt-1 text-xs text-warm-gray">
                      Nga: {listing.user_email}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 sm:flex-shrink-0">
                  <button
                    onClick={() => handleApprove(listing.id)}
                    disabled={actionLoading === listing.id}
                    className="btn-press rounded-btn bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === listing.id ? "..." : "Aprovo"}
                  </button>
                  <button
                    onClick={() => setRejectId(listing.id)}
                    disabled={actionLoading === listing.id}
                    className="btn-press rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-50"
                  >
                    Refuzo
                  </button>
                </div>
              </div>

              {/* Reject reason form */}
              {rejectId === listing.id && (
                <div className="border-t border-warm-gray-light bg-cream-dark/50 px-5 py-4">
                  <label className="mb-1 block text-sm font-medium text-navy">
                    Arsyeja e refuzimit
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="mb-3 w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                    placeholder="Shkruani arsyen..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(listing.id)}
                      disabled={!rejectReason.trim() || actionLoading === listing.id}
                      className="rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
                    >
                      {actionLoading === listing.id ? "..." : "Konfirmo refuzimin"}
                    </button>
                    <button
                      onClick={() => {
                        setRejectId(null);
                        setRejectReason("");
                      }}
                      className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-white"
                    >
                      Anulo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
