"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ose fjalëkalim i pasaktë.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-sm mb-1">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-warmgray/30 rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="block text-sm mb-1">Fjalëkalimi</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-warmgray/30 rounded px-3 py-2"
        />
      </label>
      {error && <p className="text-terracotta text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-cream py-2 rounded hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Duke hyrë..." : "Hyni"}
      </button>
      <p className="text-xs text-warmgray text-center pt-2">
        Llogaritë krijohen vetëm me ftesë.
      </p>
    </form>
  );
}
