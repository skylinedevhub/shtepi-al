import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/drizzle";
import { inquiries, listings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const limiter = createRateLimiter({ limit: 5, windowMs: 3600_000 });

const inquirySchema = z.object({
  listing_id: z.string().uuid(),
  sender_name: z.string().min(2).max(255),
  sender_email: z.string().email().max(255),
  sender_phone: z.string().max(50).optional().default(""),
  message: z.string().min(10).max(5000),
  website: z.string().optional(), // honeypot
});

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Keni dërguar shumë mesazhe. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const body = await request.json();

  // Honeypot: if "website" is filled, silently accept (fool bots)
  if (body.website) {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { error: `Gabim: ${firstError.path.join(".")} — ${firstError.message}` },
      { status: 400 }
    );
  }

  const { listing_id, sender_name, sender_email, sender_phone, message } =
    parsed.data;

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Shërbimi nuk është i disponueshëm" },
      { status: 503 }
    );
  }

  // Verify listing exists
  const [listing] = await db
    .select({
      id: listings.id,
      title: listings.title,
      posterName: listings.posterName,
      posterPhone: listings.posterPhone,
      sourceUrl: listings.sourceUrl,
      userId: listings.userId,
    })
    .from(listings)
    .where(eq(listings.id, listing_id))
    .limit(1);

  if (!listing) {
    return NextResponse.json(
      { error: "Njoftimi nuk u gjet" },
      { status: 404 }
    );
  }

  // Insert inquiry
  await db.insert(inquiries).values({
    listingId: listing_id,
    senderName: sender_name,
    senderEmail: sender_email,
    senderPhone: sender_phone || null,
    message,
  });

  // Try to send email notification
  // For user-submitted listings, check if poster has an email via profile
  // For scraped listings, we store the inquiry and admin can forward
  if (listing.userId) {
    try {
      const { profiles } = await import("@/lib/db/schema");
      const [profile] = await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, listing.userId))
        .limit(1);

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: `Mesazh i ri për: ${listing.title}`,
          html: buildInquiryEmail(
            sender_name,
            sender_email,
            sender_phone || "",
            message,
            listing.title
          ),
        });
      }
    } catch {
      // Email send failure shouldn't block the inquiry from being stored
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

function buildInquiryEmail(
  name: string,
  email: string,
  phone: string,
  message: string,
  listingTitle: string
): string {
  return `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F0;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:#1B2A4A;padding:24px 32px;text-align:center;">
            <span style="color:#D4A843;font-size:28px;font-weight:bold;">ShtëpiAL</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1B2A4A;font-size:16px;line-height:1.6;">
            <h2 style="margin:0 0 16px;color:#1B2A4A;">Mesazh i ri për njoftimin tuaj</h2>
            <p><strong>Njoftimi:</strong> ${listingTitle}</p>
            <div style="margin:16px 0;padding:16px;background-color:#FDF8F0;border-radius:8px;border-left:4px solid #C75B39;">
              <p style="margin:0;white-space:pre-line;">${message}</p>
            </div>
            <p><strong>Emri:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}" style="color:#C75B39;">${email}</a></p>
            ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background-color:#1B2A4A;padding:16px 32px;text-align:center;">
            <span style="color:#FDF8F0;font-size:13px;">&copy; ShtëpiAL — Platforma e pasurive të paluajtshme në Shqipëri</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
