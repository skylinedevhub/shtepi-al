/**
 * Lead scoring algorithm.
 *
 * Assigns a 1-100 score to each inquiry based on signal quality.
 * Higher scores indicate higher likelihood of conversion.
 */

interface LeadScoringInput {
  hasPhone: boolean;
  hasEmail: boolean;
  messageLength: number;
  listingPrice: number | null; // EUR
  hoursAfterListing: number | null; // hours between listing post and inquiry
  isReturningVisitor: boolean;
}

interface LeadScore {
  score: number;
  label: string;
  color: "green" | "yellow" | "red";
}

export function calculateLeadScore(input: LeadScoringInput): LeadScore {
  let score = 10; // base

  // Contact info quality
  if (input.hasPhone) score += 30;
  if (input.hasEmail) score += 20;

  // Message quality
  if (input.messageLength > 50) score += 15;
  else if (input.messageLength > 20) score += 8;

  // High-value listing
  if (input.listingPrice != null && input.listingPrice > 100_000) score += 15;
  else if (input.listingPrice != null && input.listingPrice > 50_000) score += 8;

  // Timing — inquiries within 24h of listing post are more serious
  if (input.hoursAfterListing != null && input.hoursAfterListing <= 24) {
    score += 10;
  }

  // Returning visitor
  if (input.isReturningVisitor) score += 10;

  // Clamp to 1-100
  score = Math.max(1, Math.min(100, score));

  // Classify
  if (score >= 60) return { score, label: "I lartë", color: "green" };
  if (score >= 30) return { score, label: "Mesatar", color: "yellow" };
  return { score, label: "I ulët", color: "red" };
}

/**
 * Quick score from raw inquiry fields (used in API routes).
 */
export function scoreInquiry(inquiry: {
  senderPhone?: string | null;
  senderEmail: string;
  message: string;
  listingPrice?: number | null;
  listingCreatedAt?: string | null;
}): number {
  const now = Date.now();
  const listingTime = inquiry.listingCreatedAt
    ? new Date(inquiry.listingCreatedAt).getTime()
    : null;
  const hoursAfter =
    listingTime != null ? (now - listingTime) / (1000 * 60 * 60) : null;

  const result = calculateLeadScore({
    hasPhone: !!inquiry.senderPhone,
    hasEmail: !!inquiry.senderEmail,
    messageLength: inquiry.message.length,
    listingPrice: inquiry.listingPrice ?? null,
    hoursAfterListing: hoursAfter,
    isReturningVisitor: false, // TODO: track via fingerprint
  });

  return result.score;
}
