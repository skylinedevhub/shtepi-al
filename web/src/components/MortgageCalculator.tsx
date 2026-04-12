"use client";

import { useState, useMemo } from "react";

interface MortgageCalculatorProps {
  /** Property price in EUR (pre-filled from listing) */
  price: number | null;
  /** Optional partner click URL for the CTA button */
  partnerUrl?: string | null;
}

const TERM_OPTIONS = [10, 15, 20, 25, 30];

/**
 * Standard amortization formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * Where:
 *   P = loan principal
 *   r = monthly interest rate (annual / 12)
 *   n = total number of payments (years * 12)
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return principal / (years * 12);

  const r = annualRate / 100 / 12;
  const n = years * 12;
  const factor = Math.pow(1 + r, n);

  return principal * (r * factor) / (factor - 1);
}

export default function MortgageCalculator({
  price,
  partnerUrl,
}: MortgageCalculatorProps) {
  const defaultPrice = price ?? 100_000;

  const [propertyPrice, setPropertyPrice] = useState(defaultPrice);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRate, setInterestRate] = useState(4.5);
  const [termYears, setTermYears] = useState(20);

  const results = useMemo(() => {
    const downPayment = propertyPrice * (downPaymentPct / 100);
    const principal = propertyPrice - downPayment;
    const monthly = calculateMonthlyPayment(principal, interestRate, termYears);
    const totalCost = monthly * termYears * 12;
    const totalInterest = totalCost - principal;

    return {
      monthly: Math.round(monthly),
      totalInterest: Math.round(totalInterest),
      totalCost: Math.round(totalCost),
      principal: Math.round(principal),
    };
  }, [propertyPrice, downPaymentPct, interestRate, termYears]);

  const fmt = (n: number) =>
    n.toLocaleString("de-DE", { maximumFractionDigits: 0 });

  return (
    <div className="rounded-xl border border-warm-gray-light/40 bg-cream p-5">
      <h3 className="font-display text-lg font-semibold text-navy">
        Llogaritësi i kredisë
      </h3>

      <div className="mt-4 space-y-4">
        {/* Property price */}
        <div>
          <label
            htmlFor="calc-price"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Çmimi i pronës (EUR)
          </label>
          <input
            id="calc-price"
            type="number"
            min={0}
            step={1000}
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(Number(e.target.value) || 0)}
            className="w-full rounded-input border border-warm-gray-light px-3 py-2 text-navy tabular-nums transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>

        {/* Down payment slider */}
        <div>
          <label
            htmlFor="calc-down"
            className="mb-1 flex items-baseline justify-between text-sm font-medium text-navy"
          >
            <span>Kësti fillestar</span>
            <span className="tabular-nums text-terracotta">
              {downPaymentPct}% &mdash; {fmt(Math.round(propertyPrice * downPaymentPct / 100))} EUR
            </span>
          </label>
          <input
            id="calc-down"
            type="range"
            min={0}
            max={90}
            step={5}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="w-full accent-terracotta"
          />
          <div className="flex justify-between text-xs text-warm-gray">
            <span>0%</span>
            <span>90%</span>
          </div>
        </div>

        {/* Interest rate */}
        <div>
          <label
            htmlFor="calc-rate"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Norma e interesit (%)
          </label>
          <input
            id="calc-rate"
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
            className="w-full rounded-input border border-warm-gray-light px-3 py-2 text-navy tabular-nums transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>

        {/* Loan term */}
        <div>
          <label
            htmlFor="calc-term"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Afati (vite)
          </label>
          <select
            id="calc-term"
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value))}
            className="w-full rounded-input border border-warm-gray-light px-3 py-2 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          >
            {TERM_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y} vjet
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-5 space-y-2 rounded-lg bg-white p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-warm-gray">Kësti mujor</span>
          <span className="text-xl font-bold tabular-nums text-terracotta">
            {fmt(results.monthly)} EUR
          </span>
        </div>
        <div className="flex items-baseline justify-between border-t border-warm-gray-light/30 pt-2">
          <span className="text-sm text-warm-gray">Interesi total</span>
          <span className="text-sm font-medium tabular-nums text-navy">
            {fmt(results.totalInterest)} EUR
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-warm-gray">Kostoja totale</span>
          <span className="text-sm font-medium tabular-nums text-navy">
            {fmt(results.totalCost)} EUR
          </span>
        </div>
      </div>

      {/* CTA */}
      <a
        href={partnerUrl ?? "#"}
        target={partnerUrl ? "_blank" : undefined}
        rel={partnerUrl ? "noopener noreferrer sponsored" : undefined}
        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-gold px-5 py-3 text-sm font-medium text-navy shadow-sm transition-all duration-200 hover:bg-gold/90 hover:shadow-md"
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Apliko për kredi
      </a>
    </div>
  );
}
