"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/constants";

interface MyListing {
  id: string;
  title: string;
  city: string | null;
}

const CAMPAIGN_TYPES = [
  { value: "sponsored_listing", label: "Njoftim i sponsorizuar" },
  { value: "banner", label: "Banner" },
];

const BID_TYPES = [
  { value: "cpm", label: "CPM (për 1000 shfaqje)" },
  { value: "cpc", label: "CPC (për klikim)" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("sponsored_listing");
  const [bidType, setBidType] = useState("cpm");
  const [bidAmount, setBidAmount] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  // Fetch user's active listings for sponsored_listing type
  useEffect(() => {
    if (type !== "sponsored_listing") return;
    setLoadingListings(true);
    fetch("/api/listings/my?limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setMyListings(
          (data.listings ?? []).map((l: Record<string, unknown>) => ({
            id: l.id as string,
            title: l.title as string,
            city: l.city as string | null,
          }))
        );
      })
      .catch(() => {
        // Silent — listings optional
      })
      .finally(() => setLoadingListings(false));
  }, [type]);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const toggleListing = (id: string) => {
    setSelectedListings((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Emri i fushatës kërkohet.");
      return;
    }
    if (selectedCities.length === 0) {
      setError("Zgjidhni të paktën një qytet.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Data e fillimit dhe përfundimit kërkohen.");
      return;
    }

    const bidAmountNum = parseFloat(bidAmount);
    const budgetNum = parseFloat(budget);

    if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
      setError("Shuma e ofertës duhet të jetë pozitive.");
      return;
    }
    if (isNaN(budgetNum) || budgetNum < 50) {
      setError("Buxheti minimal është 50 EUR.");
      return;
    }
    if (bidType === "cpm" && bidAmountNum < 4) {
      setError("Oferta minimale CPM është 4 EUR.");
      return;
    }
    if (bidType === "cpc" && bidAmountNum < 0.2) {
      setError("Oferta minimale CPC është 0.20 EUR.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          bid_type: bidType,
          bid_amount_eur: bidAmountNum,
          budget_eur: budgetNum,
          target_cities: selectedCities,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          listing_ids:
            type === "sponsored_listing" ? selectedListings : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gabim gjatë krijimit.");
      }

      router.push("/dashboard/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/dashboard/campaigns"
            className="mb-2 inline-block text-sm text-warm-gray hover:text-navy"
          >
            &larr; Kthehu te fushatat
          </a>
          <h1 className="font-display text-2xl font-bold text-navy">
            Krijo fushatë të re
          </h1>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 font-medium underline"
            >
              Mbyll
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl bg-white p-6 shadow-sm"
        >
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Emri i fushatës
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p.sh. Prona Tiranë Qershor"
              className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Lloji i fushatës
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bid type + amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bidType"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Lloji i ofertës
              </label>
              <select
                id="bidType"
                value={bidType}
                onChange={(e) => setBidType(e.target.value)}
                className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
              >
                {BID_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="bidAmount"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Shuma e ofertës (EUR)
              </label>
              <input
                id="bidAmount"
                type="number"
                step="0.01"
                min={bidType === "cpm" ? "4" : "0.20"}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={bidType === "cpm" ? "min. 4.00" : "min. 0.20"}
                className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label
              htmlFor="budget"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Buxheti total (EUR)
            </label>
            <input
              id="budget"
              type="number"
              step="1"
              min="50"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="min. 50"
              className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>

          {/* Target cities multi-select */}
          <div>
            <label className="mb-2 block text-sm font-medium text-navy">
              Qytetet e synuara
            </label>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-navy/10 p-3">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleCity(city)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedCities.includes(city)
                      ? "bg-navy text-cream"
                      : "bg-cream text-navy ring-1 ring-navy/10 hover:bg-navy/5"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
            {selectedCities.length > 0 && (
              <p className="mt-1 text-xs text-warm-gray">
                {selectedCities.length} qytete te zgjedhura
              </p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Data e fillimit
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Data e përfundimit
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-navy/20 px-3 py-2 text-sm text-navy focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
              />
            </div>
          </div>

          {/* Listing selection (for sponsored_listing type) */}
          {type === "sponsored_listing" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-navy">
                Zgjidhni njoftimet
              </label>
              {loadingListings ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-cream"
                    />
                  ))}
                </div>
              ) : myListings.length === 0 ? (
                <p className="rounded-lg bg-cream p-3 text-sm text-warm-gray">
                  Nuk keni njoftime aktive. Krijoni njoftime para se te krijoni
                  fushatë.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-navy/10 p-2">
                  {myListings.map((listing) => (
                    <label
                      key={listing.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        selectedListings.includes(listing.id)
                          ? "bg-navy/5 text-navy"
                          : "text-warm-gray hover:bg-cream"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedListings.includes(listing.id)}
                        onChange={() => toggleListing(listing.id)}
                        className="h-4 w-4 rounded border-navy/20 text-terracotta focus:ring-terracotta"
                      />
                      <span className="flex-1 truncate">{listing.title}</span>
                      {listing.city && (
                        <span className="text-xs text-warm-gray">
                          {listing.city}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <a
              href="/dashboard/campaigns"
              className="rounded-lg bg-cream px-5 py-2.5 text-sm font-medium text-navy transition hover:bg-navy/5"
            >
              Anulo
            </a>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta/90 disabled:opacity-50"
            >
              {loading ? "Duke krijuar..." : "Krijo fushatën"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
