"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-navy">
        Gabim në ngarkimin e panelit
      </h1>
      <p className="mt-2 text-sm text-warm-gray">
        Ndodhi një gabim i papritur. Provoni përsëri.
      </p>
      <button
        onClick={reset}
        className="btn-press mt-6 rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
      >
        Provo përsëri
      </button>
    </div>
  );
}
