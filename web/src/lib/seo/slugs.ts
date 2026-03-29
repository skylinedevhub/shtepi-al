export const CITY_SLUGS: Record<string, string> = {
  "Tiranë": "tirane",
  "Durrës": "durres",
  "Vlorë": "vlore",
  "Sarandë": "sarande",
  "Shkodër": "shkoder",
  "Korçë": "korce",
  "Elbasan": "elbasan",
  "Berat": "berat",
  "Fier": "fier",
  "Lushnjë": "lushnje",
  "Pogradec": "pogradec",
  "Gjirokastër": "gjirokaster",
  "Kavajë": "kavaje",
  "Lezhë": "lezhe",
  "Kamëz": "kamez",
  "Vorë": "vore",
  "Golem": "golem",
  "Himarë": "himare",
  "Ksamil": "ksamil",
  "Dhërmi": "dhermi",
  "Përmet": "permet",
  "Prishtinë": "prishtine",
};

const SLUG_TO_CITY: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_SLUGS).map(([city, slug]) => [slug, city])
);

const DIACRITICS: Record<string, string> = {
  "ë": "e", "Ë": "E",
  "ç": "c", "Ç": "C",
};

export function stripDiacritics(text: string): string {
  return text.replace(/[ëËçÇ]/g, (ch) => DIACRITICS[ch] ?? ch);
}

export function generateSlug(title: string): string {
  if (!title.trim()) return "listing";

  const slug = stripDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "listing";
}

export function cityToSlug(city: string | null | undefined): string {
  if (!city) return "shqiperi";
  return CITY_SLUGS[city] ?? generateSlug(city);
}

export function slugToCity(slug: string): string | null {
  return SLUG_TO_CITY[slug] ?? null;
}

export function parseSlugId(slug: string): string | null {
  const match = slug.match(/-([0-9a-f]{8})$/);
  return match?.[1] ?? null;
}

export function buildCityFilterHref(city: string | null | undefined): string {
  if (!city) return "/listings";
  return `/listings?city=${encodeURIComponent(city)}`;
}

export function buildListingPath(
  title: string,
  city: string | null | undefined,
  id: string
): string {
  const citySlug = cityToSlug(city);
  const titleSlug = generateSlug(title);
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `/listings/${citySlug}/${titleSlug}-${shortId}`;
}
