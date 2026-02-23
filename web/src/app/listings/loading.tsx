function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-warm-gray-light/40 bg-white">
      <div className="skeleton-shimmer aspect-[4/3]" />
      <div className="space-y-3 p-4">
        <div className="skeleton-shimmer h-5 w-24 rounded" />
        <div className="skeleton-shimmer h-4 w-36 rounded" />
        <div className="skeleton-shimmer h-4 w-28 rounded" />
      </div>
    </div>
  );
}

export default function ListingsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Search bar skeleton */}
      <div className="skeleton-shimmer mx-auto mb-8 h-12 max-w-2xl rounded-btn" />

      <div className="flex gap-8">
        {/* Filter sidebar skeleton (desktop) */}
        <aside className="hidden w-64 shrink-0 space-y-6 md:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton-shimmer h-4 w-20 rounded" />
              <div className="skeleton-shimmer h-10 w-full rounded-btn" />
            </div>
          ))}
        </aside>

        {/* Listing grid skeleton */}
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
