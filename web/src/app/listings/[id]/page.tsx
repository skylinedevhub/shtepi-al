import { notFound, redirect } from "next/navigation";
import { getListingById } from "@/lib/db/queries";
import { buildListingPath } from "@/lib/seo/slugs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingRedirectPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  const canonicalPath = buildListingPath(listing.title, listing.city, listing.id);
  redirect(canonicalPath);
}
