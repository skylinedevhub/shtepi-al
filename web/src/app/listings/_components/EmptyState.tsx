"use client";

interface EmptyStateProps {
  onClear: () => void;
}

export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <svg
        className="mb-4 size-20 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
        />
      </svg>
      <p className="text-lg font-medium text-navy">
        Nuk u gjetën njoftime
      </p>
      <p className="mt-1 text-sm text-warm-gray">
        Provo të ndryshosh filtrat ose të kërkosh diçka tjetër.
      </p>
      <button
        onClick={onClear}
        className="btn-press mt-4 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md"
      >
        Pastro filtrat
      </button>
    </div>
  );
}
