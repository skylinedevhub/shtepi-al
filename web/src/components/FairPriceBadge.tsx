"use client";

import Link from "next/link";
import { calculateFairPriceScore } from "@/lib/pricing/fair-price";

interface FairPriceBadgeProps {
  price: number | null;
  areaSqm: number | null;
  city: string | null;
  propertyType: string | null;
  transactionType: string;
  isBuyerPlus: boolean;
}

const COLOR_MAP = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: "text-green-500",
  },
  yellow: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: "text-red-500",
  },
} as const;

export default function FairPriceBadge({
  price,
  areaSqm,
  city,
  propertyType,
  transactionType,
  isBuyerPlus,
}: FairPriceBadgeProps) {
  // Need both price and area to calculate price/m²
  if (price == null || areaSqm == null || areaSqm <= 0) {
    return null;
  }

  const pricePerSqm = price / areaSqm;
  const result = calculateFairPriceScore(
    pricePerSqm,
    city,
    propertyType,
    transactionType
  );

  if (!result) return null;

  // Non-subscriber: show blurred teaser
  if (!isBuyerPlus) {
    return (
      <Link
        href="/buyer-plus"
        className="group relative inline-flex items-center gap-1.5 rounded-md border border-warm-gray-light/60 bg-cream/50 px-2.5 py-1 text-xs transition-colors hover:border-gold/40 hover:bg-gold/5"
      >
        <svg
          className="h-3.5 w-3.5 text-gold"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="font-medium text-warm-gray group-hover:text-navy">
          Aktivizo Buyer Plus
        </span>
      </Link>
    );
  }

  const colors = COLOR_MAP[result.color as keyof typeof COLOR_MAP];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.border} ${colors.text}`}
    >
      {result.color === "green" && (
        <svg
          className={`h-3.5 w-3.5 ${colors.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      )}
      {result.color === "yellow" && (
        <svg
          className={`h-3.5 w-3.5 ${colors.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14"
          />
        </svg>
      )}
      {result.color === "red" && (
        <svg
          className={`h-3.5 w-3.5 ${colors.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
          />
        </svg>
      )}
      <span>{result.label}</span>
    </div>
  );
}
