export default function RootLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex flex-col items-center gap-4">
        <div className="skeleton-shimmer size-10 rounded-full" />
        <div className="skeleton-shimmer h-4 w-48 rounded" />
      </div>
    </div>
  );
}
