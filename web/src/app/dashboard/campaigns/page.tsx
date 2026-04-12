"use client";

import { useState, useEffect, useCallback } from "react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  bid_type: string;
  bid_amount_eur: number;
  budget_eur: number | null;
  spent_eur: number | null;
  target_cities: string[] | null;
  start_date: string;
  end_date: string;
  status: string;
  listing_ids: string[] | null;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Aktive",
  paused: "Në pauzë",
  completed: "Përfunduar",
  draft: "Skicë",
  rejected: "Refuzuar",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-600",
  draft: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  sponsored_listing: "Njoftim i sponsorizuar",
  banner: "Banner",
  hero_carousel: "Hero carousel",
  city_takeover: "Qyteti sponsorizuar",
  sidebar: "Sidebar",
};

function formatEurCents(cents: number | null): string {
  if (cents == null) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Gabim gjatë ngarkimit të fushatave.");
      const data = await res.json();
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const toggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    setTogglingId(campaign.id);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaign.id ? { ...c, status: newStatus } : c
          )
        );
      } else {
        const data = await res.json();
        setError(data.error ?? "Gabim gjatë ndryshimit të statusit.");
      }
    } catch {
      setError("Gabim gjatë ndryshimit të statusit.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              Fushatat
            </h1>
            <p className="text-sm text-warm-gray">
              Menaxhoni fushatat tuaja reklamuese
            </p>
          </div>
          <a
            href="/dashboard/campaigns/new"
            className="rounded-lg bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta/90"
          >
            Krijo fushatë
          </a>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-medium underline"
            >
              Mbyll
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-white"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center">
            <p className="mb-2 text-warm-gray">
              Nuk keni asnjë fushatë akoma.
            </p>
            <a
              href="/dashboard/campaigns/new"
              className="inline-block rounded-lg bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta/90"
            >
              Krijo fushatën e parë
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10">
                  <th className="px-4 py-3 font-medium text-navy">Emri</th>
                  <th className="px-4 py-3 font-medium text-navy">Lloji</th>
                  <th className="px-4 py-3 font-medium text-navy">Statusi</th>
                  <th className="px-4 py-3 font-medium text-navy">
                    Buxheti / Shpenzuar
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-navy sm:table-cell">
                    Periudha
                  </th>
                  <th className="px-4 py-3 font-medium text-navy">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-navy/5 last:border-0 hover:bg-cream/50"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium text-navy hover:text-terracotta"
                      >
                        {c.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-warm-gray">
                      {TYPE_LABELS[c.type] ?? c.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[c.status] ?? STATUS_COLORS.draft
                        }`}
                      >
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-warm-gray">
                      {formatEurCents(c.budget_eur)} /{" "}
                      {formatEurCents(c.spent_eur)}
                    </td>
                    <td className="hidden px-4 py-3 text-warm-gray sm:table-cell">
                      {formatDate(c.start_date)} – {formatDate(c.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      {(c.status === "active" ||
                        c.status === "paused" ||
                        c.status === "draft") && (
                        <button
                          onClick={() => toggleStatus(c)}
                          disabled={togglingId === c.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            c.status === "active"
                              ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {c.status === "active" ? "Pauzë" : "Aktivizo"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
