"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface RevenueData {
  mrr: number;
  mrr_growth: number;
  active_subscriptions: number;
  churn_rate: number;
  arpa: number;
  ltv: number;
  revenue_by_source: {
    agency_subscriptions: number;
    ads: number;
    buyer_plus: number;
    data: number;
  };
  top_agencies: {
    name: string;
    plan: string;
    mrr: number;
    status: string;
  }[];
  recent_invoices: {
    id: string;
    amount_eur: number;
    status: string;
    created_at: string | null;
    paid_at: string | null;
    agency_name: string | null;
    user_name: string | null;
  }[];
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
    open: "bg-yellow-100 text-yellow-700",
    draft: "bg-warm-gray/10 text-warm-gray",
    void: "bg-red-100 text-red-700",
    uncollectible: "bg-red-100 text-red-700",
    canceled: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    paid: "Paguar",
    active: "Aktiv",
    open: "Hapur",
    draft: "Draft",
    void: "Anuluar",
    uncollectible: "I pambledhshëm",
    canceled: "Anuluar",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-warm-gray/10 text-warm-gray"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

const METRIC_CARDS: {
  key: keyof Pick<
    RevenueData,
    "mrr" | "mrr_growth" | "active_subscriptions" | "churn_rate" | "arpa" | "ltv"
  >;
  label: string;
  format: (v: number) => string;
  accent?: boolean;
  icon: string;
}[] = [
  {
    key: "mrr",
    label: "MRR",
    format: formatEur,
    accent: true,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    key: "mrr_growth",
    label: "Rritja MRR",
    format: (v) => `${v > 0 ? "+" : ""}${v}%`,
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    key: "active_subscriptions",
    label: "Abonime aktive",
    format: (v) => v.toLocaleString("de-DE"),
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    key: "churn_rate",
    label: "Shkalla e largimit",
    format: (v) => `${v}%`,
    icon: "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6",
  },
  {
    key: "arpa",
    label: "ARPA",
    format: formatEur,
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    key: "ltv",
    label: "LTV",
    format: formatEur,
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
];

const REVENUE_SOURCES: {
  key: keyof RevenueData["revenue_by_source"];
  label: string;
  color: string;
  bgColor: string;
}[] = [
  {
    key: "agency_subscriptions",
    label: "Abonime agjencish",
    color: "bg-navy",
    bgColor: "bg-navy/10",
  },
  {
    key: "ads",
    label: "Reklama",
    color: "bg-terracotta",
    bgColor: "bg-terracotta/10",
  },
  {
    key: "buyer_plus",
    label: "Buyer Plus",
    color: "bg-[#D4A843]",
    bgColor: "bg-[#D4A843]/10",
  },
  {
    key: "data",
    label: "Te dhena",
    color: "bg-[#8B8178]",
    bgColor: "bg-[#8B8178]/10",
  },
];

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/revenue");
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return null;

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center">
          <h1 className="font-display text-2xl font-bold text-red-700">
            Akses i refuzuar
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Nuk keni leje per te aksesuar te dhenat e te ardhurave.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalRevenue = Object.values(data.revenue_by_source).reduce(
    (sum, v) => sum + v,
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-warm-gray transition hover:text-navy"
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
              strokeWidth={1.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Paneli i administrimit
        </Link>
      </div>

      <h1 className="mb-8 font-display text-3xl font-bold text-navy">
        Te ardhurat
      </h1>

      {/* Metric Cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_CARDS.map(({ key, label, format, accent, icon }) => (
          <div
            key={key}
            className={`rounded-card border bg-white p-6 shadow-sm ${
              accent
                ? "border-[#D4A843]/30 ring-1 ring-[#D4A843]/20"
                : "border-warm-gray-light"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  accent ? "bg-[#D4A843]/10" : "bg-cream-dark"
                }`}
              >
                <svg
                  className={`h-5 w-5 ${accent ? "text-[#D4A843]" : "text-navy"}`}
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
              <div className="min-w-0">
                <p className="text-sm text-warm-gray">{label}</p>
                <p
                  className={`font-display text-2xl font-bold tabular-nums ${
                    accent ? "text-[#D4A843]" : "text-navy"
                  }`}
                >
                  {format(data[key])}
                </p>
                {key === "mrr_growth" && (
                  <p className="mt-0.5 text-xs text-warm-gray">
                    krahasuar me muajin e kaluar
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <h2 className="mb-4 font-display text-xl font-semibold text-navy">
        Ndarja e te ardhurave
      </h2>
      <div className="mb-10 rounded-card border border-warm-gray-light bg-white p-6 shadow-sm">
        {totalRevenue === 0 ? (
          <p className="py-4 text-center text-sm text-warm-gray">
            Nuk ka te ardhura per te shfaqur.
          </p>
        ) : (
          <div className="space-y-4">
            {REVENUE_SOURCES.map(({ key, label, color, bgColor }) => {
              const amount = data.revenue_by_source[key];
              const pct =
                totalRevenue > 0
                  ? Math.round((amount / totalRevenue) * 1000) / 10
                  : 0;
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-navy">{label}</span>
                    <span className="tabular-nums text-warm-gray">
                      {formatEur(amount)}{" "}
                      <span className="text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div
                    className={`h-3 w-full overflow-hidden rounded-full ${bgColor}`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="mt-4 border-t border-warm-gray-light pt-3 text-right">
              <span className="text-sm text-warm-gray">Total: </span>
              <span className="font-display text-lg font-bold tabular-nums text-navy">
                {formatEur(totalRevenue)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Agencies Table */}
      <h2 className="mb-4 font-display text-xl font-semibold text-navy">
        Agjencite kryesore
      </h2>
      <div className="mb-10 overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm">
        {data.top_agencies.length === 0 ? (
          <div className="p-12 text-center">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">
              Asnje agjenci
            </h3>
            <p className="mt-2 text-sm text-warm-gray">
              Nuk ka abonime aktive nga agjencite.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-gray-light bg-cream-dark/50">
                  <th className="px-5 py-3 text-left font-medium text-navy">
                    Agjencia
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-navy">
                    Plani
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-navy">
                    MRR
                  </th>
                  <th className="px-5 py-3 text-center font-medium text-navy">
                    Statusi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {data.top_agencies.map((agency, i) => (
                  <tr key={i} className="transition hover:bg-cream-dark/30">
                    <td className="px-5 py-3 font-medium text-navy">
                      {agency.name}
                    </td>
                    <td className="px-5 py-3 text-warm-gray">{agency.plan}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-navy">
                      {formatEur(agency.mrr)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={agency.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Invoices Table */}
      <h2 className="mb-4 font-display text-xl font-semibold text-navy">
        Faturat e fundit
      </h2>
      <div className="overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm">
        {data.recent_invoices.length === 0 ? (
          <div className="p-12 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">
              Asnje fature
            </h3>
            <p className="mt-2 text-sm text-warm-gray">
              Nuk ka fatura per te shfaqur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-gray-light bg-cream-dark/50">
                  <th className="px-5 py-3 text-left font-medium text-navy">
                    Data
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-navy">
                    Agjencia / Perdoruesi
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-navy">
                    Shuma
                  </th>
                  <th className="px-5 py-3 text-center font-medium text-navy">
                    Statusi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-light">
                {data.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="transition hover:bg-cream-dark/30">
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-warm-gray">
                      {inv.created_at
                        ? new Date(inv.created_at).toLocaleDateString("sq-AL", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-5 py-3 font-medium text-navy">
                      {inv.agency_name ?? inv.user_name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-navy">
                      {formatEur(inv.amount_eur)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={inv.status} />
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
