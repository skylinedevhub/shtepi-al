export default function PricingLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero skeleton */}
      <section className="px-4 pb-4 pt-16 sm:pt-24" style={{ background: "#FDF8F0" }}>
        <div className="mx-auto max-w-3xl text-center">
          <div className="skeleton-shimmer mx-auto h-5 w-28 rounded" />
          <div className="skeleton-shimmer mx-auto mt-5 h-10 w-72 rounded" />
          <div className="skeleton-shimmer mx-auto mt-4 h-5 w-96 max-w-full rounded" />
        </div>

        {/* Card skeletons */}
        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-xl border border-warm-gray-light/60 bg-white p-6"
            >
              <div className="skeleton-shimmer h-6 w-24 rounded" />
              <div className="skeleton-shimmer mt-3 h-8 w-20 rounded" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="skeleton-shimmer h-4 w-full rounded" />
                ))}
              </div>
              <div className="skeleton-shimmer mt-6 h-12 w-full rounded-btn" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
