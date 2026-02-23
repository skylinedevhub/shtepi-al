export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div className="skeleton-shimmer h-8 w-48 rounded" />
        <div className="skeleton-shimmer h-10 w-32 rounded-btn" />
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-card" />
        ))}
      </div>

      {/* Listing rows */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 rounded-card border border-warm-gray-light/40 bg-white p-4"
          >
            <div className="skeleton-shimmer size-20 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-5 w-3/4 rounded" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
              <div className="skeleton-shimmer h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
