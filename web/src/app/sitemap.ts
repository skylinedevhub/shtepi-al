import type { MetadataRoute } from "next";
import { SITE_URL, TRANSACTION_TYPE_URL } from "@/lib/seo/constants";
import { CITY_SLUGS, buildListingPath } from "@/lib/seo/slugs";
import { getAllActiveListingSlugs } from "@/lib/db/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

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

  const listingSlugs = await getAllActiveListingSlugs();
  const listingPages: MetadataRoute.Sitemap = listingSlugs.map((l) => ({
    url: `${SITE_URL}${buildListingPath(l.title, l.city, l.id)}`,
    lastModified: l.last_seen ? new Date(l.last_seen) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...cityPages, ...listingPages];
}
