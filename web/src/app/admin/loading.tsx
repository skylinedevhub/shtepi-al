export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="skeleton-shimmer mb-8 h-10 w-64 rounded-card" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-28 rounded-card"
          />
        ))}
      </div>

      <div className="skeleton-shimmer mb-4 h-8 w-48 rounded-card" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-32 rounded-card"
          />
        ))}
      </div>
    </div>
  );
}
