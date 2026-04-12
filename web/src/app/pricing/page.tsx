"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Static plan data for the pricing page (matches DB seed)
// ---------------------------------------------------------------------------

interface PricingPlan {
  name: string;
  slug: string;
  priceLabel: string;
  priceSubtext: string;
  highlighted: boolean;
  badge: string | null;
  cta: string;
  isEnterprise: boolean;
  features: Record<string, string>;
}

const FEATURE_KEYS = [
  { key: "listings", label: "Njoftimet" },
  { key: "leads", label: "Leads/muaj" },
  { key: "analytics", label: "Analitike" },
  { key: "cities", label: "Qytete te zgjedhura" },
  { key: "crm", label: "Eksporti CRM" },
  { key: "whatsapp", label: "WhatsApp routing" },
  { key: "boost", label: "Boost i renditjes" },
  { key: "api", label: "Aksesi API" },
  { key: "seats", label: "Vende ekipi" },
  { key: "sla", label: "Mbeshtetje SLA" },
] as const;

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    slug: "starter",
    priceLabel: "\u20ac49",
    priceSubtext: "/muaj",
    highlighted: false,
    badge: null,
    cta: "Fillo tani",
    isEnterprise: false,
    features: {
      listings: "30",
      leads: "20",
      analytics: "Bazik",
      cities: "1",
      crm: "\u2717",
      whatsapp: "\u2717",
      boost: "\u2717",
      api: "\u2717",
      seats: "1",
      sla: "\u2717",
    },
  },
  {
    name: "Growth",
    slug: "growth",
    priceLabel: "\u20ac149",
    priceSubtext: "/muaj",
    highlighted: true,
    badge: "Rekomanduar",
    cta: "Fillo tani",
    isEnterprise: false,
    features: {
      listings: "200",
      leads: "Pa limit",
      analytics: "Avancuar",
      cities: "3",
      crm: "\u2713",
      whatsapp: "\u2713",
      boost: "\u2713",
      api: "\u2717",
      seats: "3",
      sla: "\u2717",
    },
  },
  {
    name: "Premium",
    slug: "premium",
    priceLabel: "\u20ac399",
    priceSubtext: "/muaj",
    highlighted: false,
    badge: null,
    cta: "Fillo tani",
    isEnterprise: false,
    features: {
      listings: "Pa limit",
      leads: "Pa limit",
      analytics: "Dashboard",
      cities: "Pa limit",
      crm: "\u2713",
      whatsapp: "\u2713",
      boost: "\u2713\u2713",
      api: "\u2713",
      seats: "10",
      sla: "\u2713",
    },
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    priceLabel: "Na kontaktoni",
    priceSubtext: "",
    highlighted: false,
    badge: null,
    cta: "Na kontaktoni",
    isEnterprise: true,
    features: {
      listings: "Custom",
      leads: "Pa limit",
      analytics: "Custom",
      cities: "Pa limit",
      crm: "\u2713",
      whatsapp: "\u2713",
      boost: "\u2713\u2713\u2713",
      api: "\u2713",
      seats: "Custom",
      sla: "\u2713",
    },
  },
];

const FAQ = [
  {
    q: "A mund ta ndryshoj planin tim me vone?",
    a: "Po, mund te permiresoni ose te ulni planin tuaj ne cdo kohe. Ndryshimet hyjne ne fuqi menjehere dhe do te faturoheni ne baze te proporcionale.",
  },
  {
    q: "Cfare ndodh kur arrij limitin e njoftimeve?",
    a: "Do te njoftoheni kur jeni afer limitit. Mund te permiresoni planin ose te fshini njoftime te vjetra per te liruar hapesire.",
  },
  {
    q: "A ka nje periudhe prove?",
    a: "Po, te gjithe planet perfshijne nje prove falas 14-ditore. Nuk do te faturoheni derisa te perfundoje periudha e proves.",
  },
  {
    q: "Si funksionon faturimi?",
    a: "Faturimi behet mujor nepermjet Stripe. Pranojme karta debiti/krediti. Mund te anuloni ne cdo kohe.",
  },
  {
    q: "A mund te marr nje rimbursim?",
    a: "Po, ofrojme garanci 30-ditore per te gjithe planet. Nese nuk jeni te kenaqur, na kontaktoni per nje rimbursim te plote.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function handleCheckout(slug: string) {
    setError(null);
    setLoadingSlug(slug);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: slug,
          successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          window.location.href = "/auth/login?redirect=/pricing";
          return;
        }
        setError(data.error || "Dicka shkoi keq. Provoni perseri.");
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      setError("Nuk mund te lidhemi me serverin. Provoni perseri.");
    } finally {
      setLoadingSlug(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 pb-4 pt-16 sm:pt-24"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 15%, rgba(212,168,67,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 15% 80%, rgba(199,91,57,0.06) 0%, transparent 70%),
            #FDF8F0
          `,
        }}
      >
        <div className="pointer-events-none absolute left-6 top-16 h-24 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent sm:left-12 sm:h-32" />
        <div className="pointer-events-none absolute bottom-16 right-6 h-24 w-px bg-gradient-to-b from-transparent via-terracotta/20 to-transparent sm:right-12 sm:h-32" />

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Planet tona
            </span>
            <span className="h-px w-8 bg-gold/50" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-navy sm:text-5xl">
            Zgjidhni planin tuaj
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-warm-gray sm:text-lg">
            Rritni agjensinë tuaj me mjete profesionale per menaxhimin e
            njoftimeve, leads dhe analitikes.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                plan.highlighted
                  ? "border-gold ring-2 ring-gold/30"
                  : "border-warm-gray-light/60"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                  {plan.badge}
                </span>
              )}

              <h3 className="font-display text-lg font-bold text-navy">
                {plan.name}
              </h3>

              <div className="mt-3">
                <span
                  className={`font-display text-3xl font-bold ${
                    plan.isEnterprise ? "text-2xl" : ""
                  } text-navy`}
                >
                  {plan.priceLabel}
                </span>
                {plan.priceSubtext && (
                  <span className="ml-1 text-sm text-warm-gray">
                    {plan.priceSubtext}
                  </span>
                )}
              </div>

              {/* Feature list */}
              <ul className="mt-6 flex-1 space-y-3">
                {FEATURE_KEYS.map(({ key, label }) => {
                  const val = plan.features[key];
                  const isCheck = val === "\u2713" || val === "\u2713\u2713" || val === "\u2713\u2713\u2713";
                  const isCross = val === "\u2717";

                  return (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      {isCheck ? (
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : isCross ? (
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-warm-gray/40"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-navy/60"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      <span className={isCross ? "text-warm-gray/50" : "text-navy/80"}>
                        <span className="font-medium">{label}:</span>{" "}
                        {isCross ? "Nuk perfshihet" : val}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {plan.isEnterprise ? (
                  <Link
                    href="mailto:info@shtepi.al?subject=Enterprise%20Plan"
                    className="btn-press block w-full rounded-btn border-2 border-navy bg-transparent py-3 text-center text-sm font-medium text-navy transition-all duration-200 hover:bg-navy hover:text-white"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.slug)}
                    disabled={loadingSlug !== null}
                    className={`btn-press block w-full rounded-btn py-3 text-center text-sm font-medium transition-all duration-200 disabled:opacity-60 ${
                      plan.highlighted
                        ? "bg-gold text-white shadow-sm hover:bg-gold/90 hover:shadow-md"
                        : "bg-terracotta text-white shadow-sm hover:bg-terracotta-dark hover:shadow-md"
                    }`}
                  >
                    {loadingSlug === plan.slug ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Duke u ngarkuar...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy">
          Krahasimi i plotë i veçorive
        </h2>
        <div className="overflow-x-auto rounded-xl border border-warm-gray-light/60 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-warm-gray-light/40 bg-cream/50">
                <th className="px-4 py-3 text-left font-medium text-warm-gray">
                  Veçoria
                </th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.slug}
                    className={`px-4 py-3 text-center font-semibold ${
                      plan.highlighted ? "text-gold" : "text-navy"
                    }`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map(({ key, label }, i) => (
                <tr
                  key={key}
                  className={
                    i % 2 === 0
                      ? "bg-white"
                      : "bg-cream/30"
                  }
                >
                  <td className="px-4 py-3 font-medium text-navy/80">
                    {label}
                  </td>
                  {PLANS.map((plan) => {
                    const val = plan.features[key];
                    const isCross = val === "\u2717";
                    return (
                      <td
                        key={plan.slug}
                        className={`px-4 py-3 text-center ${
                          isCross ? "text-warm-gray/40" : "text-navy/70"
                        } ${plan.highlighted ? "bg-gold/5" : ""}`}
                      >
                        {isCross ? (
                          <svg
                            className="mx-auto h-4 w-4 text-warm-gray/30"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        ) : val === "\u2713" || val === "\u2713\u2713" || val === "\u2713\u2713\u2713" ? (
                          <span className="inline-flex items-center justify-center gap-0.5 text-green-600">
                            {val.split("").map((_, ci) => (
                              <svg
                                key={ci}
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ))}
                          </span>
                        ) : (
                          <span className="font-medium">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="px-4 py-16"
        style={{ background: "#FDF8F0" }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-navy">
            Pyetjet e shpeshta
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-warm-gray-light/60 bg-white shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-navy">{item.q}</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-warm-gray transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="border-t border-warm-gray-light/40 px-5 pb-4 pt-3 text-sm leading-relaxed text-warm-gray">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
