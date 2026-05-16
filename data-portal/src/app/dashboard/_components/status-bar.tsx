"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StatusBar({
  email,
  generatedAt,
}: {
  email: string | null;
  generatedAt: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<string>("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("sq-AL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const generated = new Date(generatedAt).toLocaleString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

  async function logout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-10 shrink-0 border-b border-line bg-ink-800/80 backdrop-blur-md
      flex items-center px-4 gap-6 font-mono text-2xs uppercase tracking-[0.18em]">
      <div className="flex items-center gap-2 text-fg">
        <span
          aria-hidden
          className="block h-2 w-2 rounded-full bg-acc-mint animate-pulse-dot
            shadow-[0_0_8px_rgba(94,230,160,0.6)]"
        />
        <span className="text-acc-mint">LIVE</span>
        <span className="text-fg-dim">·</span>
        <span className="text-fg-muted">ShtëpiAL Intel Terminal</span>
        <span className="text-fg-dim">·</span>
        <span className="text-fg-muted">v1.0</span>
      </div>

      <div className="hidden md:flex items-center gap-4 text-fg-muted">
        <span>
          <span className="text-fg-dim">sync</span>{" "}
          <span className="text-fg">{generated}</span>
        </span>
        <span>
          <span className="text-fg-dim">utc</span>{" "}
          <span className="text-fg tabular-nums">{now || "—"}</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3 text-fg-muted">
        {email && <span className="hidden sm:inline normal-case tracking-normal text-fg">{email}</span>}
        <button
          type="button"
          onClick={logout}
          disabled={pending}
          className="term-btn h-7 py-0 px-2 text-2xs"
        >
          {pending ? "…" : "Dil"}
        </button>
      </div>
    </header>
  );
}
