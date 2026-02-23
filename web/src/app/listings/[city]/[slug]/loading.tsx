export default function DetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="skeleton-shimmer mb-6 h-4 w-48 rounded" />

      {/* Image gallery skeleton */}
      <div className="skeleton-shimmer aspect-[16/9] rounded-card" />

      {/* Title + price */}
      <div className="mt-6 space-y-3">
        <div className="skeleton-shimmer h-8 w-3/4 rounded" />
        <div className="skeleton-shimmer h-6 w-32 rounded" />
      </div>

      {/* Details grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-20 rounded-card" />
        ))}
      </div>

      {/* Description */}
      <div className="mt-8 space-y-2">
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}
