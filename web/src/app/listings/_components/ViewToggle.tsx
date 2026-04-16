"use client";

function GridIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

interface ViewToggleProps {
  viewMode: "grid" | "map";
  onGrid: () => void;
  onMap: () => void;
  onMapHover: () => void;
}

export function ViewToggle({ viewMode, onGrid, onMap, onMapHover }: ViewToggleProps) {
  return (
    <div className="flex overflow-hidden rounded-btn border border-warm-gray-light">
      <button
        onClick={onGrid}
        aria-label="Shfaq si rrjetë"
        aria-pressed={viewMode === "grid"}
        className={
          viewMode === "grid"
            ? "cursor-pointer bg-terracotta p-2.5 text-white transition"
            : "cursor-pointer bg-white p-2.5 text-warm-gray transition hover:text-navy"
        }
      >
        <GridIcon />
      </button>
      <button
        onClick={onMap}
        onMouseEnter={onMapHover}
        aria-label="Shfaq në hartë"
        aria-pressed={viewMode === "map"}
        className={
          viewMode === "map"
            ? "cursor-pointer bg-terracotta p-2.5 text-white transition"
            : "cursor-pointer bg-white p-2.5 text-warm-gray transition hover:text-navy"
        }
      >
        <MapIcon />
      </button>
    </div>
  );
}
