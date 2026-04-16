"use client";

interface FetchErrorStateProps {
  onRetry: () => void;
}

export function FetchErrorState({ onRetry }: FetchErrorStateProps) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <svg
        className="mb-4 size-16 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <p className="text-lg font-medium text-navy">
        Gabim në ngarkimin e njoftimeve
      </p>
      <p className="mt-1 text-sm text-warm-gray">
        Nuk mundëm të lidhemi me serverin. Provoni përsëri.
      </p>
      <button
        onClick={onRetry}
        className="btn-press mt-4 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
      >
        Provo përsëri
      </button>
    </div>
  );
}
