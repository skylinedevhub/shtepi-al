"use client";

import { useEffect, useState, useCallback } from "react";

interface Subscription {
  id: string;
  userId: string;
  agencyId: string | null;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string | null;
  planName: string | null;
  planPriceEur: number | null;
  planType: string | null;
  agencyName: string | null;
}

interface PlanBreakdown {
  planId: string;
  planName: string | null;
  count: number;
}

interface SubStats {
  activeCount: number;
  mrr: number;
  planBreakdown: PlanBreakdown[];
}

interface Invoice {
  id: string;
  amountEur: number;
  status: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string | null;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Te gjitha" },
  { value: "active", label: "Aktive" },
  { value: "trialing", label: "Ne prove" },
  { value: "past_due", label: "Ne pritje" },
  { value: "canceled", label: "Anuluara" },
  { value: "incomplete", label: "Te paplota" },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-yellow-100 text-yellow-700",
  canceled: "bg-red-100 text-red-700",
  incomplete: "bg-warm-gray/10 text-warm-gray",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Ne prove",
  past_due: "Ne pritje",
  canceled: "Anuluar",
  incomplete: "I paplote",
};

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("sq-AL");
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const limit = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions);
        setTotal(data.total);
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleStatusChange(status: string) {
    setStatusFilter(status);
    setPage(1);
    setSelectedSub(null);
  }

  async function handleRowClick(sub: Subscription) {
    if (selectedSub?.id === sub.id) {
      setSelectedSub(null);
      return;
    }
    setSelectedSub(sub);
    setInvoicesLoading(true);
    // Invoices are fetched client-side via subscriptions API
    // For now we show the subscription details; invoices would need a dedicated endpoint
    // This is a placeholder since we don't have an invoices endpoint yet
    setInvoices([]);
    setInvoicesLoading(false);
  }

  const totalPages = Math.ceil(total / limit);

  if (loading && subs.length === 0) return null;

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center">
          <h1 className="font-display text-2xl font-bold text-red-700">
            Akses i refuzuar
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Nuk keni leje per te aksesuar kete faqe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-navy">
        Pasqyra e abonimeve
      </h1>

      {/* Summary stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Active subscriptions */}
          <div className="rounded-card border border-warm-gray-light bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-5 w-5 text-green-600"
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
              </div>
              <div>
                <p className="text-sm text-warm-gray">Abonime aktive</p>
                <p className="font-display text-2xl font-bold text-navy">
                  {stats.activeCount}
                </p>
              </div>
            </div>
          </div>

          {/* MRR */}
          <div className="rounded-card border border-warm-gray-light bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-dark">
                <svg
                  className="h-5 w-5 text-terracotta"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-warm-gray">MRR (te ardhura mujore)</p>
                <p className="font-display text-2xl font-bold text-navy">
                  &euro;{formatPrice(stats.mrr)}
                </p>
              </div>
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="rounded-card border border-warm-gray-light bg-white p-6 shadow-sm">
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-warm-gray">Ndarja sipas planeve</p>
                {stats.planBreakdown.length === 0 ? (
                  <p className="text-sm text-warm-gray/60">Asnje abonent</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {stats.planBreakdown.map((bp) => (
                      <div
                        key={bp.planId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate text-navy">
                          {bp.planName ?? "Pa emer"}
                        </span>
                        <span className="ml-2 font-medium tabular-nums text-terracotta">
                          {bp.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.value}
            onClick={() => handleStatusChange(sf.value)}
            className={`rounded-btn px-4 py-2 text-sm font-medium transition ${
              statusFilter === sf.value
                ? "bg-navy text-white shadow-sm"
                : "border border-warm-gray-light text-navy hover:bg-cream-dark"
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-warm-gray-light bg-cream-dark/50">
                <th className="px-5 py-3 font-medium text-navy">Agjencia</th>
                <th className="px-5 py-3 font-medium text-navy">Plani</th>
                <th className="px-5 py-3 font-medium text-navy">Statusi</th>
                <th className="px-5 py-3 font-medium text-navy">Cmimi</th>
                <th className="px-5 py-3 font-medium text-navy">Perfundon</th>
                <th className="px-5 py-3 font-medium text-navy">Krijuar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-light">
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-warm-gray">
                    {loading ? "Po ngarkohet..." : "Nuk ka abonime per kete filter."}
                  </td>
                </tr>
              ) : (
                subs.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => handleRowClick(sub)}
                    className="cursor-pointer transition hover:bg-cream-dark/30"
                  >
                    <td className="px-5 py-3 font-medium text-navy">
                      {sub.agencyName ?? "Individ"}
                    </td>
                    <td className="px-5 py-3 text-warm-gray">
                      {sub.planName ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[sub.status] ?? STATUS_STYLES.incomplete
                        }`}
                      >
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums font-medium text-terracotta">
                      {sub.planPriceEur != null
                        ? `\u20AC${formatPrice(sub.planPriceEur)}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-warm-gray">
                      {formatDate(sub.currentPeriodEnd)}
                    </td>
                    <td className="px-5 py-3 text-warm-gray">
                      {formatDate(sub.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded row detail */}
        {selectedSub && (
          <div className="border-t border-warm-gray-light bg-cream-dark/30 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-navy">
                Detajet e abonimit
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-xs text-warm-gray hover:text-navy"
              >
                Mbyll
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <span className="text-warm-gray">ID:</span>
                <span className="ml-1 font-mono text-xs text-navy">
                  {selectedSub.id.slice(0, 8)}...
                </span>
              </div>
              <div>
                <span className="text-warm-gray">Periudha:</span>
                <span className="ml-1 text-navy">
                  {formatDate(selectedSub.currentPeriodStart)} -{" "}
                  {formatDate(selectedSub.currentPeriodEnd)}
                </span>
              </div>
              {selectedSub.canceledAt && (
                <div>
                  <span className="text-warm-gray">Anuluar:</span>
                  <span className="ml-1 text-red-600">
                    {formatDate(selectedSub.canceledAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Invoices section */}
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-navy">Faturat</h4>
              {invoicesLoading ? (
                <p className="text-xs text-warm-gray">Po ngarkohen faturat...</p>
              ) : invoices.length === 0 ? (
                <p className="text-xs text-warm-gray">
                  Nuk ka fatura per kete abonim.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-warm-gray-light">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-3 py-2 font-medium text-navy">Shuma</th>
                        <th className="px-3 py-2 font-medium text-navy">Statusi</th>
                        <th className="px-3 py-2 font-medium text-navy">Periudha</th>
                        <th className="px-3 py-2 font-medium text-navy">Paguar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-gray-light">
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="px-3 py-2 tabular-nums font-medium text-terracotta">
                            &euro;{formatPrice(inv.amountEur)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                inv.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : inv.status === "open"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-warm-gray/10 text-warm-gray"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-warm-gray">
                            {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                          </td>
                          <td className="px-3 py-2 text-warm-gray">
                            {formatDate(inv.paidAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-warm-gray">
            Faqja {page} nga {totalPages} ({total} gjithsej)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-btn border border-warm-gray-light px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-50"
            >
              Para
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-btn border border-warm-gray-light px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-50"
            >
              Tjetra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
