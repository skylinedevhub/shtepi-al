"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!supabase) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError("Ndodhi një gabim. Provoni përsëri.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-card border border-warm-gray-light bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-center font-display text-2xl font-bold text-navy">
            Kontrolloni emailin tuaj
          </h1>
          <p className="mb-6 text-center text-sm text-warm-gray">
            Kemi dërguar një link për rivendosjen e fjalëkalimit në{" "}
            <strong className="text-navy">{email}</strong>
          </p>
          <p className="text-center text-sm text-warm-gray">
            Nuk e morët?{" "}
            <button
              onClick={() => setSent(false)}
              className="font-medium text-terracotta transition hover:text-terracotta-dark"
            >
              Dërgo përsëri
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-card border border-warm-gray-light bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-navy">
          Keni harruar fjalëkalimin?
        </h1>
        <p className="mb-8 text-center text-sm text-warm-gray">
          Shkruani emailin tuaj dhe do t&apos;ju dërgojmë një link për
          rivendosjen
        </p>

        {error && (
          <div className="mb-4 rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
              placeholder="email@shembull.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50"
          >
            {loading ? "Po dërgohet..." : "Dërgo linkun"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-warm-gray">
          <Link
            href="/auth/signin"
            className="font-medium text-terracotta transition hover:text-terracotta-dark"
          >
            Kthehu te hyrja
          </Link>
        </p>
      </div>
    </div>
  );
}
