"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardControls({
  cities,
  city,
  transactionType,
}: {
  cities: string[];
  city: string | null;
  transactionType: "sale" | "rent";
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <label className="block">
        <span className="block text-xs text-warmgray mb-1">Qyteti</span>
        <select
          value={city ?? ""}
          onChange={(e) => setParam("city", e.target.value)}
          className="border border-warmgray/30 rounded px-3 py-2 bg-white"
        >
          <option value="">Të gjitha (mesatare kombëtare)</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-1 border border-warmgray/30 rounded overflow-hidden">
        <button
          onClick={() => setParam("tx", "sale")}
          className={`px-4 py-2 ${transactionType === "sale" ? "bg-navy text-cream" : "bg-white text-navy"}`}
        >
          Shitje
        </button>
        <button
          onClick={() => setParam("tx", "rent")}
          className={`px-4 py-2 ${transactionType === "rent" ? "bg-navy text-cream" : "bg-white text-navy"}`}
        >
          Qira
        </button>
      </div>
    </div>
  );
}
