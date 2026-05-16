import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The public /data dashboard moved to the separate B2B intel portal
// (shtepial-intel) on 2026-05-16. Redirect any lingering traffic — and
// shadow the /[city] dynamic route so /data doesn't render as city=data.
export default function DataMoved() {
  permanentRedirect("/");
}
