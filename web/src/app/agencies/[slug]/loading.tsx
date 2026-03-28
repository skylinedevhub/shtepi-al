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

export default function AgencyProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="skeleton-shimmer h-4 w-14 rounded" />
        <span className="text-warm-gray-light">/</span>
        <div className="skeleton-shimmer h-4 w-20 rounded" />
        <span className="text-warm-gray-light">/</span>
        <div className="skeleton-shimmer h-4 w-32 rounded" />
      </div>

      {/* Agency header skeleton */}
      <div className="mb-8 rounded-2xl border border-warm-gray-light/50 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-5">
          <div className="skeleton-shimmer size-16 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-7 w-48 rounded" />
            <div className="skeleton-shimmer h-4 w-32 rounded" />
          </div>
        </div>
        <div className="mt-6 border-t border-cream-dark pt-6">
          <div className="flex gap-4">
            <div className="skeleton-shimmer h-10 w-36 rounded-btn" />
            <div className="skeleton-shimmer h-10 w-36 rounded-btn" />
          </div>
        </div>
      </div>

      {/* Section title skeleton */}
      <div className="skeleton-shimmer mb-4 h-6 w-40 rounded" />

      {/* Listing grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
