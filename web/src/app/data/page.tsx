import { notFound } from "next/navigation";

// The public /data dashboard moved to the separate B2B intel portal
// (shtepial-intel) on 2026-05-16. This page exists only to shadow the
// dynamic /[city] route so /data doesn't render as "city = data".
export default function DataGone() {
  notFound();
}
