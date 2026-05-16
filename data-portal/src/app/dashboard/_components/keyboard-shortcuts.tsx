"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Global keyboard shortcuts: S=Shitje, R=Qira, Esc=Clear city, ?=help (TODO). */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const next = new URLSearchParams(params);
      let changed = false;

      if (e.key === "s" || e.key === "S") {
        next.set("tx", "sale");
        changed = true;
      } else if (e.key === "r" || e.key === "R") {
        next.set("tx", "rent");
        changed = true;
      } else if (e.key === "Escape") {
        if (next.has("city")) {
          next.delete("city");
          changed = true;
        }
      }

      if (changed) {
        e.preventDefault();
        router.push(`${pathname}?${next.toString()}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname, params]);

  return null;
}
