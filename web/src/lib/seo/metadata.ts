import type { Metadata } from "next";
import type { Listing } from "@/lib/types";
import { SITE_URL, SITE_NAME, PROPERTY_TYPE_SQ, PROPERTY_TYPE_EN, TRANSACTION_TYPE_SQ, TRANSACTION_TYPE_EN } from "./constants";
import { buildListingPath, cityToSlug } from "./slugs";

function formatPrice(price: number): string {
  return `€${price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}

export function generateListingTitle(listing: Listing, lang: "sq" | "en"): string {
  const parts: string[] = [];

  if (lang === "sq") {
    if (listing.room_config) parts.push(listing.room_config);
    const type = listing.property_type ? PROPERTY_TYPE_SQ[listing.property_type] : null;
    if (type && !listing.room_config) parts.push(type);
    if (listing.city) parts.push(`në ${listing.city}`);
    if (listing.price != null) parts.push(`— ${formatPrice(listing.price)}`);
  } else {
    const type = listing.property_type ? PROPERTY_TYPE_EN[listing.property_type] ?? listing.property_type : null;
    if (listing.room_config && type) parts.push(`${listing.room_config} ${type}`);
    else if (type) parts.push(type);
    else if (listing.room_config) parts.push(listing.room_config);
    if (listing.city) parts.push(`in ${listing.city}`);
    if (listing.price != null) parts.push(`— ${formatPrice(listing.price)}`);
  }

  return parts.join(" ") || listing.title;
}

export function generateListingDescription(listing: Listing, lang: "sq" | "en"): string {
  const details: string[] = [];
  if (listing.room_config) details.push(listing.room_config);
  if (listing.area_sqm != null) details.push(`${listing.area_sqm} m²`);
  if (listing.city) details.push(lang === "sq" ? `në ${listing.city}` : `in ${listing.city}`);
  if (listing.neighborhood) details.push(listing.neighborhood);

  const priceStr = listing.price != null ? (lang === "sq"
    ? `Çmimi: ${formatPrice(listing.price)}.`
    : `Price: ${formatPrice(listing.price)}.`) : "";

  const suffix = lang === "sq"
    ? `Shiko foto dhe detaje në ${SITE_NAME}.`
    : `View photos and details on ${SITE_NAME}.`;

  return [details.join(", "), priceStr, suffix].filter(Boolean).join(" ");
}

export function generateCityTitle(
  city: string,
  transactionType: string | undefined,
  lang: "sq" | "en"
): string {
  if (lang === "sq") {
    if (transactionType) {
      const txLabel = TRANSACTION_TYPE_SQ[transactionType] ?? transactionType;
      return `${txLabel} në ${city} — Apartamente, shtëpi, vila`;
    }
    return `Pasuri të paluajtshme në ${city}`;
  }
  if (transactionType) {
    const txLabel = TRANSACTION_TYPE_EN[transactionType] ?? transactionType;
    return `Property for ${txLabel} in ${city}, Albania`;
  }
  return `Real Estate in ${city}, Albania`;
}

export function buildListingMetadata(listing: Listing): Metadata {
  const canonicalPath = buildListingPath(listing.title, listing.city, listing.id);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const sqTitle = generateListingTitle(listing, "sq");
  const enTitle = generateListingTitle(listing, "en");
  const sqDesc = generateListingDescription(listing, "sq");
  const enDesc = generateListingDescription(listing, "en");
  const image = listing.images[0];

  return {
    title: sqTitle,
    description: sqDesc,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: enTitle,
      description: enDesc,
      url: canonicalUrl,
      type: "website",
      locale: "sq_AL",
      ...(image && { images: [{ url: image, alt: listing.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: enTitle,
      description: enDesc,
      ...(image && { images: [image] }),
    },
  };
}

export function buildCityMetadata(
  city: string,
  transactionType?: string
): Metadata {
  const citySlug = cityToSlug(city);
  const canonicalPath = transactionType
    ? `/${citySlug}/${transactionType === "sale" ? "shitje" : "qira"}`
    : `/${citySlug}`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const sqTitle = generateCityTitle(city, transactionType, "sq");
  const enTitle = generateCityTitle(city, transactionType, "en");

  return {
    title: sqTitle,
    description: `${sqTitle}. Kërko njoftimet më të fundit në ${SITE_NAME}.`,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: enTitle,
      description: enTitle,
      url: canonicalUrl,
      locale: "sq_AL",
    },
  };
}
