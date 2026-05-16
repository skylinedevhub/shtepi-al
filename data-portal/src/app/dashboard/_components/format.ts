export function fmtEur(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("sq-AL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("sq-AL").format(value);
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("sq-AL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function fmtTime(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Map a numeric value to a color ramp (deep blue → cyan → mint → gold → terra). */
export function priceColor(value: number | null, min: number, max: number): string {
  if (value === null || !Number.isFinite(value) || max <= min) return "#26314F";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const stops = [
    [0, [38, 49, 79]],      // ink-400
    [0.2, [91, 192, 222]],  // cyan
    [0.45, [94, 230, 160]], // mint
    [0.75, [244, 184, 96]], // gold
    [1, [224, 122, 79]],    // terra
  ] as const;
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i - 1];
    const [p2, c2] = stops[i];
    if (t <= p2) {
      const k = (t - p1) / (p2 - p1);
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * k);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * k);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * k);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return "#E07A4F";
}

/** Logarithmic radius scale for marker sizing by count. */
export function radiusFor(count: number, maxCount: number, min = 6, max = 22): number {
  if (count <= 0 || maxCount <= 0) return min;
  const t = Math.log(1 + count) / Math.log(1 + maxCount);
  return min + (max - min) * t;
}
