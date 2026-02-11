"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ListingForm from "@/components/ListingForm";

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/listings?id=${id}`);
        if (!res.ok) {
          setError("Njoftimi nuk u gjet");
          setLoading(false);
          return;
        }
        const listing = await res.json();
        // Map snake_case API response to form fields
        setInitialData({
          title: listing.title,
          description: listing.description ?? "",
          price: listing.price ? String(listing.price) : "",
          currency_original: listing.currency_original ?? "EUR",
          price_period: listing.price_period ?? "total",
          transaction_type: listing.transaction_type,
          property_type: listing.property_type ?? "",
          room_config: listing.room_config ?? "",
          area_sqm: listing.area_sqm ? String(listing.area_sqm) : "",
          floor: listing.floor != null ? String(listing.floor) : "",
          total_floors: listing.total_floors ? String(listing.total_floors) : "",
          rooms: listing.rooms != null ? String(listing.rooms) : "",
          bathrooms: listing.bathrooms != null ? String(listing.bathrooms) : "",
          city: listing.city ?? "",
          neighborhood: listing.neighborhood ?? "",
          address_raw: listing.address_raw ?? "",
          has_elevator: listing.has_elevator ?? false,
          has_parking: listing.has_parking ?? false,
          is_furnished: listing.is_furnished ?? false,
          is_new_build: listing.is_new_build ?? false,
          poster_name: listing.poster_name ?? "",
          poster_phone: listing.poster_phone ?? "",
          images: listing.images ?? [],
        });
      } catch {
        setError("Diçka shkoi gabim");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="skeleton-shimmer h-8 w-64 rounded-btn" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-12 rounded-input" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-card border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-navy">
        Ndrysho njoftimin
      </h1>
      <ListingForm
        mode="edit"
        listingId={id}
        initialData={initialData as Record<string, unknown> | undefined}
      />
    </div>
  );
}
