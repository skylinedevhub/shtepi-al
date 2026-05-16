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
        <span className="block font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim mb-1.5">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-ink-900 border border-line rounded px-3 py-2 font-mono text-sm
            text-fg placeholder:text-fg-dim
            focus:outline-none focus:border-acc-mint/50 focus:ring-1 focus:ring-acc-mint/30
            transition"
        />
      </label>
      <label className="block">
        <span className="block font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim mb-1.5">
          Fjalëkalimi
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-ink-900 border border-line rounded px-3 py-2 font-mono text-sm
            text-fg placeholder:text-fg-dim
            focus:outline-none focus:border-acc-mint/50 focus:ring-1 focus:ring-acc-mint/30
            transition"
        />
      </label>
      {error && (
        <p className="font-mono text-xs text-acc-rose border-l-2 border-acc-rose pl-2 py-0.5">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-acc-mint/10 border border-acc-mint/40 text-acc-mint
          font-mono text-xs uppercase tracking-[0.18em] py-2.5 rounded
          hover:bg-acc-mint/20 hover:border-acc-mint/60 transition
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Duke hyrë…" : "Hyni"}
      </button>
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim text-center pt-2">
        Llogaritë krijohen vetëm me ftesë
      </p>
    </form>
  );
}
