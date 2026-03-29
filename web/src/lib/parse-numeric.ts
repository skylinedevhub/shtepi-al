/** Parse a string query param to a number, returning undefined if invalid. */
export function parseNumericParam(
  value: string | null | undefined
): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return undefined;
  return num;
}
