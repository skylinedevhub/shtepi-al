import { notFound, redirect } from "next/navigation";
import { getListingById } from "@/lib/db/queries";
import { buildListingPath } from "@/lib/seo/slugs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ city: string }>;
}

export default async function ListingRedirectPage({ params }: Props) {
  const { city: id } = await params;

  // Only look up if it's a valid UUID — city slugs like "tirane" are not listing IDs
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  const canonicalPath = buildListingPath(listing.title, listing.city, listing.id);
  redirect(canonicalPath);
}
