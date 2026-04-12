"use client";

export default function PricingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <svg
        className="mb-6 size-24 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h1 className="font-display text-3xl font-bold text-navy">
        Dicka shkoi keq
      </h1>
      <p className="mt-3 max-w-md text-warm-gray">
        Ndodhi nje gabim gjate ngarkimit te planeve. Ju lutemi provoni perseri.
      </p>
      <button
        onClick={reset}
        className="mt-8 cursor-pointer rounded-btn bg-terracotta px-6 py-3 font-medium text-white transition hover:bg-terracotta-dark"
      >
        Provo perseri
      </button>
    </div>
  );
}
