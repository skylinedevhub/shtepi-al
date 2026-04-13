"use client";

export default function ValuationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center">
      <svg
        className="mx-auto mb-4 size-16 text-warm-gray-light"
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
      <h1 className="font-display text-2xl font-bold text-navy">
        Gabim ne ngarkimin e llogaritesit
      </h1>
      <p className="mt-2 text-sm text-warm-gray">
        Nuk mundem te ngarkojme llogaritesin e vleresimit. Provoni perseri.
      </p>
      <button
        onClick={reset}
        className="btn-press mt-6 rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
      >
        Provo perseri
      </button>
    </div>
  );
}
