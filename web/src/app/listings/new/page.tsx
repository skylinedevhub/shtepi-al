import ListingForm from "@/components/ListingForm";

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-navy">
        Posto njoftim të ri
      </h1>
      <ListingForm mode="create" />
    </div>
  );
}
