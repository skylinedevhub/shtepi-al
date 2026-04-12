"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { SubscriptionWithPlan, UsageSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "bg-green-100 text-green-800" },
  trialing: { label: "Prove", color: "bg-blue-100 text-blue-800" },
  past_due: { label: "Ne pritje", color: "bg-yellow-100 text-yellow-800" },
  canceled: { label: "Anuluar", color: "bg-red-100 text-red-800" },
  incomplete: { label: "I paplotesuar", color: "bg-orange-100 text-orange-800" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  return `\u20ac${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function usagePercent(used: number, limit: number | null): number {
  if (!limit || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function usageBarColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch {
      setError("Nuk mund te ngarkojme te dhenat e abonimit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Nuk mund te hapim portalin e faturimit.");
    } catch {
      setError("Nuk mund te lidhemi me serverin.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setShowCancelModal(false);
        await loadSubscription();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Anulimi desshtoi. Provoni perseri.");
    } catch {
      setError("Nuk mund te lidhemi me serverin.");
    } finally {
      setCancelLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="skeleton-shimmer mb-2 h-8 w-48 rounded" />
        <div className="skeleton-shimmer mb-8 h-4 w-64 rounded" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // No subscription
  // ---------------------------------------------------------------------------

  if (!subscription) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Abonimi</h1>
        <p className="mt-1 text-sm text-warm-gray">
          Menaxhoni planin dhe faturimin tuaj
        </p>

        <div className="mt-8 rounded-card border border-warm-gray-light bg-white p-12 text-center">
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
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
          <h2 className="mt-4 font-display text-lg font-semibold text-navy">
            Nuk keni nje abonim aktiv
          </h2>
          <p className="mt-2 text-sm text-warm-gray">
            Zgjidhni nje plan per te filluar me mjetet profesionale te agjencise.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-block rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark"
          >
            Shiko planet
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Active subscription
  // ---------------------------------------------------------------------------

  const status = STATUS_MAP[subscription.status] ?? STATUS_MAP.active;
  const plan = subscription.plan;
  const isCanceled = !!subscription.canceled_at;

  const listingsPct = usage ? usagePercent(usage.listings_used, usage.listings_limit) : 0;
  const leadsPct = usage ? usagePercent(usage.leads_used, usage.leads_limit) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Abonimi</h1>
          <p className="mt-1 text-sm text-warm-gray">
            Menaxhoni planin dhe faturimin tuaj
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-btn border border-warm-gray-light px-5 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark"
        >
          <svg
            className="h-4 w-4 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
          Permirëso
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plan + Status card */}
      <div className="rounded-card border border-warm-gray-light bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-bold text-navy">
                {plan.name}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-warm-gray">
              {formatPrice(plan.price_eur)}/muaj
              {plan.billing_interval === "yearly" && " (vjetor)"}
            </p>
          </div>
          {isCanceled && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              Anuluar me {formatDate(subscription.canceled_at)}. Aktiv deri me{" "}
              {formatDate(subscription.current_period_end)}.
            </div>
          )}
        </div>

        {/* Billing period */}
        <div className="mt-4 flex flex-wrap gap-6 border-t border-warm-gray-light/40 pt-4 text-sm">
          <div>
            <span className="text-warm-gray">Periudha aktuale:</span>{" "}
            <span className="font-medium text-navy">
              {formatDate(subscription.current_period_start)} -{" "}
              {formatDate(subscription.current_period_end)}
            </span>
          </div>
          {subscription.current_period_end && !isCanceled && (
            <div>
              <span className="text-warm-gray">Fatura tjeter:</span>{" "}
              <span className="font-medium text-navy">
                {formatDate(subscription.current_period_end)}{" "}
                ({formatPrice(plan.price_eur)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Usage meters */}
      {usage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Listings usage */}
          <div className="rounded-card border border-warm-gray-light bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-navy">Njoftimet</h3>
              <span className="text-xs text-warm-gray">
                {usage.listings_used}
                {usage.listings_limit ? ` / ${usage.listings_limit}` : " (pa limit)"}
              </span>
            </div>
            {usage.listings_limit ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${usageBarColor(listingsPct)}`}
                  style={{ width: `${listingsPct}%` }}
                />
              </div>
            ) : (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-full rounded-full bg-green-500/30" />
              </div>
            )}
            {usage.listings_limit && listingsPct >= 90 && (
              <p className="mt-2 text-xs text-red-600">
                Jeni afer limitit. Konsideroni te permiresoni planin.
              </p>
            )}
          </div>

          {/* Leads usage */}
          <div className="rounded-card border border-warm-gray-light bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-navy">Leads/muaj</h3>
              <span className="text-xs text-warm-gray">
                {usage.leads_used}
                {usage.leads_limit ? ` / ${usage.leads_limit}` : " (pa limit)"}
              </span>
            </div>
            {usage.leads_limit ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${usageBarColor(leadsPct)}`}
                  style={{ width: `${leadsPct}%` }}
                />
              </div>
            ) : (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-full rounded-full bg-green-500/30" />
              </div>
            )}
            {usage.leads_limit && leadsPct >= 90 && (
              <p className="mt-2 text-xs text-red-600">
                Jeni afer limitit te leads. Konsideroni te permiresoni planin.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="inline-flex items-center gap-2 rounded-btn border border-warm-gray-light px-5 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-60"
        >
          {portalLoading ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-warm-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          )}
          Menaxho faturimin
        </button>

        {!isCanceled && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-2 rounded-btn border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Anulo
          </button>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-navy">
              Anuloni abonimin?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-warm-gray">
              Abonimi juaj do te mbetet aktiv deri ne fund te periudhes aktuale
              ({formatDate(subscription.current_period_end)}). Pas kesaj, nuk do
              te keni akses ne vecorite premium.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-60"
              >
                Kthehu
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="inline-flex items-center gap-2 rounded-btn bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {cancelLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Duke u anuluar...
                  </>
                ) : (
                  "Po, anulo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
