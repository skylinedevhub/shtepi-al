"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Fjalëkalimet nuk përputhen");
      return;
    }

    if (password.length < 8) {
      setError("Fjalëkalimi duhet të ketë të paktën 8 karaktere");
      return;
    }

    setLoading(true);

    if (!supabase) return;

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Ndodhi një gabim. Provoni përsëri.");
      setLoading(false);
      return;
    }

    router.push("/auth/signin?message=password_updated");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-card border border-warm-gray-light bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-navy">
          Vendosni fjalëkalimin e ri
        </h1>
        <p className="mb-8 text-center text-sm text-warm-gray">
          Zgjidhni një fjalëkalim të ri për llogarinë tuaj
        </p>

        {error && (
          <div className="mb-4 rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Fjalëkalimi i ri
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
              placeholder="Të paktën 8 karaktere"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Konfirmo fjalëkalimin
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
              placeholder="Shkruani përsëri fjalëkalimin"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50"
          >
            {loading ? "Po ruhet..." : "Ruaj fjalëkalimin e ri"}
          </button>
        </form>
      </div>
    </div>
  );
}
