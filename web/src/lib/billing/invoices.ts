/**
 * Invoice queries.
 */

import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { invoices } from "@/lib/db/schema";
import type { Invoice } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbRowToInvoice(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    subscription_id: row.subscriptionId,
    stripe_invoice_id: row.stripeInvoiceId,
    amount_eur: row.amountEur,
    status: row.status,
    pdf_url: row.pdfUrl,
    hosted_invoice_url: row.hostedInvoiceUrl,
    period_start: row.periodStart?.toISOString() ?? null,
    period_end: row.periodEnd?.toISOString() ?? null,
    paid_at: row.paidAt?.toISOString() ?? null,
    created_at: row.createdAt?.toISOString() ?? "",
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get paginated invoices for a subscription.
 */
export async function getInvoices(
  subscriptionId: string,
  page = 1,
  limit = 20
): Promise<{ invoices: Invoice[]; total: number; page: number; has_more: boolean }> {
  const db = getDb();
  if (!db) {
    return { invoices: [], total: 0, page, has_more: false };
  }

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.subscriptionId, subscriptionId));

  const total = Number(countResult?.count ?? 0);

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, subscriptionId))
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    invoices: rows.map(dbRowToInvoice),
    total,
    page,
    has_more: offset + rows.length < total,
  };
}
