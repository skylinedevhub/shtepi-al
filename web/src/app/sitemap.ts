import type { MetadataRoute } from "next";
import { SITE_URL, TRANSACTION_TYPE_URL } from "@/lib/seo/constants";
import { CITY_SLUGS, buildListingPath } from "@/lib/seo/slugs";
import { getAllActiveListingSlugs } from "@/lib/db/queries";

const SITEMAP_BATCH_SIZE = 5000;

export async function generateSitemaps() {
  const slugs = await getAllActiveListingSlugs();
  const count = slugs.length;
  const numBatches = Math.max(1, Math.ceil(count / SITEMAP_BATCH_SIZE));
  return Array.from({ length: numBatches }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static + city pages only in first batch
  if (id === 0) {
    entries.push(
      { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 }
    );
    const cityPages: MetadataRoute.Sitemap = Object.values(CITY_SLUGS).flatMap(
      (slug) => [
        { url: `${SITE_URL}/${slug}`, changeFrequency: "daily" as const, priority: 0.8 },
        ...Object.values(TRANSACTION_TYPE_URL).map((tx) => ({
          url: `${SITE_URL}/${slug}/${tx}`,
          changeFrequency: "daily" as const,
          priority: 0.7,
        })),
      ]
    );
    entries.push(...cityPages);
  }

  const allSlugs = await getAllActiveListingSlugs();
  const start = id * SITEMAP_BATCH_SIZE;
  const batch = allSlugs.slice(start, start + SITEMAP_BATCH_SIZE);

  for (const l of batch) {
    entries.push({
      url: `${SITE_URL}${buildListingPath(l.title, l.city, l.id)}`,
      lastModified: l.last_seen ? new Date(l.last_seen) : undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
