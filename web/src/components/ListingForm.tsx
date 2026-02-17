"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImageUploader from "./ImageUploader";
import { CITIES, PROPERTY_TYPES } from "@/lib/constants";

const MapPinPicker = dynamic(() => import("@/components/MapPinPicker"), { ssr: false });

interface ListingFormProps {
  initialData?: Partial<FormData>;
  listingId?: string;
  mode: "create" | "edit";
}

interface FormData {
  title: string;
  description: string;
  price: string;
  currency_original: string;
  price_period: string;
  transaction_type: string;
  property_type: string;
  room_config: string;
  area_sqm: string;
  floor: string;
  total_floors: string;
  rooms: string;
  bathrooms: string;
  city: string;
  neighborhood: string;
  address_raw: string;
  latitude: number | null;
  longitude: number | null;
  has_elevator: boolean;
  has_parking: boolean;
  is_furnished: boolean;
  is_new_build: boolean;
  poster_name: string;
  poster_phone: string;
  images: string[];
}

const defaultData: FormData = {
  title: "",
  description: "",
  price: "",
  currency_original: "EUR",
  price_period: "total",
  transaction_type: "",
  property_type: "",
  room_config: "",
  area_sqm: "",
  floor: "",
  total_floors: "",
  rooms: "",
  bathrooms: "",
  city: "",
  neighborhood: "",
  address_raw: "",
  latitude: null,
  longitude: null,
  has_elevator: false,
  has_parking: false,
  is_furnished: false,
  is_new_build: false,
  poster_name: "",
  poster_phone: "",
  images: [],
};

export default function ListingForm({
  initialData,
  listingId,
  mode,
}: ListingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ ...defaultData, ...initialData });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof FormData, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      transaction_type: form.transaction_type,
      property_type: form.property_type || undefined,
      room_config: form.room_config || undefined,
      city: form.city || undefined,
      neighborhood: form.neighborhood || undefined,
      address_raw: form.address_raw || undefined,
      currency_original: form.currency_original,
      price_period: form.price_period,
      has_elevator: form.has_elevator || undefined,
      has_parking: form.has_parking || undefined,
      is_furnished: form.is_furnished || undefined,
      is_new_build: form.is_new_build || undefined,
      poster_name: form.poster_name || undefined,
      poster_phone: form.poster_phone || undefined,
      images: form.images,
    };

    if (form.latitude != null) body.latitude = form.latitude;
    if (form.longitude != null) body.longitude = form.longitude;
    if (form.price) body.price = Number(form.price);
    if (form.area_sqm) body.area_sqm = Number(form.area_sqm);
    if (form.floor) body.floor = Number(form.floor);
    if (form.total_floors) body.total_floors = Number(form.total_floors);
    if (form.rooms) body.rooms = Number(form.rooms);
    if (form.bathrooms) body.bathrooms = Number(form.bathrooms);

    try {
      const url =
        mode === "edit" ? `/api/listings/${listingId}` : "/api/listings";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Diçka shkoi gabim");
        setLoading(false);
        return;
      }

      if (mode === "create") {
        router.push("/dashboard");
      } else {
        router.push(`/listings/${listingId}`);
      }
    } catch {
      setError("Diçka shkoi gabim. Provoni përsëri.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";
  const labelClass = "mb-1 block text-sm font-medium text-navy";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Images */}
      <ImageUploader
        images={form.images}
        onChange={(imgs) => updateField("images", imgs)}
      />

      {/* Basic info */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-navy">
          Informacione bazë
        </legend>

        <div>
          <label htmlFor="title" className={labelClass}>
            Titulli *
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            required
            minLength={5}
            maxLength={200}
            className={inputClass}
            placeholder="p.sh. Apartament 2+1 në qendër të Tiranës"
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Përshkrimi
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={5}
            maxLength={5000}
            className={inputClass}
            placeholder="Përshkruani pronën tuaj..."
          />
        </div>

        {/* Transaction type */}
        <div>
          <span className={labelClass}>Lloji i transaksionit *</span>
          <div className="mt-1 flex gap-3">
            {[
              { value: "sale", label: "Shitje" },
              { value: "rent", label: "Qira" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField("transaction_type", value)}
                className={`rounded-btn px-6 py-2.5 text-sm font-medium transition ${
                  form.transaction_type === value
                    ? "bg-terracotta text-white"
                    : "border border-warm-gray-light text-navy hover:bg-cream-dark"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Property type */}
        <div>
          <label htmlFor="property_type" className={labelClass}>
            Lloji i pronës
          </label>
          <select
            id="property_type"
            value={form.property_type}
            onChange={(e) => updateField("property_type", e.target.value)}
            className={inputClass}
          >
            <option value="">Zgjidhni...</option>
            {PROPERTY_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Price */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-navy">
          Çmimi
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className={labelClass}>
              Çmimi
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="any"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="currency" className={labelClass}>
              Monedha
            </label>
            <select
              id="currency"
              value={form.currency_original}
              onChange={(e) => updateField("currency_original", e.target.value)}
              className={inputClass}
            >
              <option value="EUR">EUR</option>
              <option value="ALL">ALL (Lekë)</option>
            </select>
          </div>
          <div>
            <label htmlFor="period" className={labelClass}>
              Periudha
            </label>
            <select
              id="period"
              value={form.price_period}
              onChange={(e) => updateField("price_period", e.target.value)}
              className={inputClass}
            >
              <option value="total">Total</option>
              <option value="monthly">Mujore</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Details */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-navy">
          Detaje
        </legend>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label htmlFor="rooms" className={labelClass}>
              Dhoma
            </label>
            <input
              id="rooms"
              type="number"
              min="0"
              max="50"
              value={form.rooms}
              onChange={(e) => updateField("rooms", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bathrooms" className={labelClass}>
              Banjot
            </label>
            <input
              id="bathrooms"
              type="number"
              min="0"
              max="20"
              value={form.bathrooms}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="room_config" className={labelClass}>
              Konfiguracioni
            </label>
            <input
              id="room_config"
              type="text"
              value={form.room_config}
              onChange={(e) => updateField("room_config", e.target.value)}
              className={inputClass}
              placeholder="p.sh. 2+1"
            />
          </div>
          <div>
            <label htmlFor="area_sqm" className={labelClass}>
              Sipërfaqja (m²)
            </label>
            <input
              id="area_sqm"
              type="number"
              min="0"
              value={form.area_sqm}
              onChange={(e) => updateField("area_sqm", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="floor" className={labelClass}>
              Kati
            </label>
            <input
              id="floor"
              type="number"
              min="-2"
              max="100"
              value={form.floor}
              onChange={(e) => updateField("floor", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="total_floors" className={labelClass}>
              Total kate
            </label>
            <input
              id="total_floors"
              type="number"
              min="1"
              max="100"
              value={form.total_floors}
              onChange={(e) => updateField("total_floors", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Boolean features */}
        <div className="flex flex-wrap gap-4">
          {[
            { field: "has_elevator" as const, label: "Ashensor" },
            { field: "has_parking" as const, label: "Parking" },
            { field: "is_furnished" as const, label: "I mobiluar" },
            { field: "is_new_build" as const, label: "Ndërtim i ri" },
          ].map(({ field, label }) => (
            <label
              key={field}
              className="flex cursor-pointer items-center gap-2 rounded-btn border border-warm-gray-light px-4 py-2 text-sm transition hover:bg-cream-dark"
            >
              <input
                type="checkbox"
                checked={form[field]}
                onChange={(e) => updateField(field, e.target.checked)}
                className="h-4 w-4 rounded border-warm-gray-light text-terracotta focus:ring-terracotta/20"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-navy">
          Vendndodhja
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className={labelClass}>
              Qyteti
            </label>
            <select
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClass}
            >
              <option value="">Zgjidhni...</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="neighborhood" className={labelClass}>
              Lagja
            </label>
            <input
              id="neighborhood"
              type="text"
              value={form.neighborhood}
              onChange={(e) => updateField("neighborhood", e.target.value)}
              className={inputClass}
              placeholder="p.sh. Blloku"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address_raw" className={labelClass}>
            Adresa e plotë
          </label>
          <input
            id="address_raw"
            type="text"
            value={form.address_raw}
            onChange={(e) => updateField("address_raw", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-navy">
            Vendndodhja në hartë
          </label>
          <div className="mt-1">
            <MapPinPicker
              city={form.city}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
            />
          </div>
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-semibold text-navy">
          Kontakti
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="poster_name" className={labelClass}>
              Emri
            </label>
            <input
              id="poster_name"
              type="text"
              value={form.poster_name}
              onChange={(e) => updateField("poster_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="poster_phone" className={labelClass}>
              Telefoni
            </label>
            <input
              id="poster_phone"
              type="tel"
              value={form.poster_phone}
              onChange={(e) => updateField("poster_phone", e.target.value)}
              className={inputClass}
              placeholder="+355..."
            />
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex flex-col gap-3 border-t border-warm-gray-light pt-6 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full rounded-btn bg-terracotta px-8 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50 sm:w-auto"
        >
          {loading
            ? "Po ruhet..."
            : mode === "create"
              ? "Posto njoftimin"
              : "Ruaj ndryshimet"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full rounded-btn border border-warm-gray-light px-6 py-3 text-sm font-medium text-navy transition hover:bg-cream-dark sm:w-auto"
        >
          Anullo
        </button>
      </div>
    </form>
  );
}
