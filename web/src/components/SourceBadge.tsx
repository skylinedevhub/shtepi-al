import { cn } from "@/lib/cn";

interface SourceBadgeProps {
  sources: string[];
  count: number;
}

export default function SourceBadge({ sources, count }: SourceBadgeProps) {
  if (count <= 1) return null;

  const uniqueSources = Array.from(new Set(sources)).filter(Boolean);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium text-navy ring-1 ring-navy/10"
      )}
    >
      <svg
        className="size-3 text-navy/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      Listuar në {count} faqe
      {uniqueSources.length > 0 && (
        <span className="text-warm-gray">
          ({uniqueSources.join(", ")})
        </span>
      )}
    </span>
  );
}
