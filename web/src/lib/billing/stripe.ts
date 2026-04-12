/**
 * Stripe client singletons (server + client).
 *
 * Returns null gracefully when env vars are missing, following the same
 * pattern as getDb() in drizzle.ts.
 */

import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

// ---------------------------------------------------------------------------
// Server-side Stripe instance (lazy singleton)
// ---------------------------------------------------------------------------

let _stripe: Stripe | null | undefined;

/**
 * Returns the server-side Stripe SDK instance, or null if STRIPE_SECRET_KEY
 * is not configured.
 */
export function getStripeServer(): Stripe | null {
  if (_stripe === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      _stripe = null;
    } else {
      _stripe = new Stripe(key, {
        apiVersion: "2026-03-25.dahlia",
        typescript: true,
      });
    }
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Client-side Stripe.js (lazy promise singleton)
// ---------------------------------------------------------------------------

let _stripePromise: Promise<StripeClient | null> | null = null;

/**
 * Returns a promise that resolves to the Stripe.js client instance, or null
 * if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set.
 */
export function getStripeClient(): Promise<StripeClient | null> {
  if (!_stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      _stripePromise = Promise.resolve(null);
    } else {
      _stripePromise = loadStripe(key);
    }
  }
  return _stripePromise;
}
