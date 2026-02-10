"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/listings?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleClear() {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kërko sipas lagjes, qytetit, ose përshkrimit..."
        className="w-full rounded-btn border border-warm-gray-light bg-white px-4 py-3.5 pr-20 text-navy shadow-lg placeholder:text-warm-gray transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Pastro kërkimin"
          className="absolute right-14 top-1/2 -translate-y-1/2 rounded-md p-1 text-warm-gray transition hover:text-navy"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <button
        type="submit"
        aria-label="Kërko"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-btn bg-terracotta p-2.5 text-white transition hover:bg-terracotta-dark"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>
  );
}
