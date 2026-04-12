/**
 * Fair Price Score — compares a listing's price/m² to market averages.
 *
 * For now uses hardcoded averages per city. In the future these will be
 * computed from a market_stats table.
 */

import type { FairPriceScore } from "@/lib/types";

// Hardcoded market averages (EUR per m²) — will migrate to DB later
const MARKET_AVERAGES: Record<string, { sale: number; rent: number }> = {
  "Tiranë": { sale: 1200, rent: 8 },
  "Durrës": { sale: 900, rent: 6 },
  "Vlorë": { sale: 1100, rent: 7 },
};

const DEFAULT_AVERAGE = { sale: 800, rent: 5 };

function getMarketAverage(
  city: string | null,
  transactionType: string
): number {
  const averages = (city && MARKET_AVERAGES[city]) || DEFAULT_AVERAGE;
  return transactionType === "rent" ? averages.rent : averages.sale;
}

/**
 * Calculate a fair price score for a listing.
 *
 * @param pricePerSqm - The listing's price per square metre (EUR)
 * @param city - City name (Albanian)
 * @param _propertyType - Property type (reserved for future use)
 * @param transactionType - "sale" or "rent"
 * @returns FairPriceScore with percentage deviation, Albanian label, and color
 */
export function calculateFairPriceScore(
  pricePerSqm: number | null,
  city: string | null,
  _propertyType: string | null,
  transactionType: string
): FairPriceScore | null {
  if (pricePerSqm == null || pricePerSqm <= 0) {
    return null;
  }

  const marketAvg = getMarketAverage(city, transactionType);

  // Percentage above (+) or below (-) market average
  const deviation = ((pricePerSqm - marketAvg) / marketAvg) * 100;
  const score = Math.round(deviation);
  const absScore = Math.abs(score);

  if (score < -5) {
    return {
      score,
      label: `${absScore}% nën mesataren`,
      color: "green",
    };
  }

  if (score > 5) {
    return {
      score,
      label: `${absScore}% mbi mesataren`,
      color: "red",
    };
  }

  return {
    score,
    label: "afër mesatares",
    color: "yellow",
  };
}

export { MARKET_AVERAGES, DEFAULT_AVERAGE };
