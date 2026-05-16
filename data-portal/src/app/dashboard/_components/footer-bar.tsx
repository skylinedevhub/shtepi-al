import { fmtTime } from "./format";

const KEYS = [
  { k: "↑↓", label: "Lëviz" },
  { k: "↵", label: "Zgjidh" },
  { k: "ESC", label: "Pastro" },
  { k: "S", label: "Shitje" },
  { k: "R", label: "Qira" },
];

export default function FooterBar({
  totalListings,
  cityCount,
  apiVersion,
  generatedAt,
}: {
  totalListings: number;
  cityCount: number;
  apiVersion: string;
  generatedAt: string;
}) {
  return (
    <footer className="h-7 shrink-0 border-t border-line bg-ink-800/80 backdrop-blur
      flex items-center px-4 gap-6 font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
      <div className="flex items-center gap-4 overflow-x-auto">
        {KEYS.map((k) => (
          <span key={k.k} className="flex items-center gap-1.5">
            <kbd className="px-1 py-px rounded bg-ink-700 border border-line text-fg text-2xs">
              {k.k}
            </kbd>
            <span>{k.label}</span>
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span>
          <span className="text-fg-dim">listings</span>{" "}
          <span className="text-fg tabular-nums">{totalListings.toLocaleString("sq-AL")}</span>
        </span>
        <span>
          <span className="text-fg-dim">qytete</span>{" "}
          <span className="text-fg tabular-nums">{cityCount}</span>
        </span>
        <span>
          <span className="text-fg-dim">api</span>{" "}
          <span className="text-fg normal-case tracking-normal">{apiVersion}</span>
        </span>
        <span>
          <span className="text-fg-dim">snapshot</span>{" "}
          <span className="text-fg normal-case tracking-normal">{fmtTime(generatedAt)}</span>
        </span>
      </div>
    </footer>
  );
}
