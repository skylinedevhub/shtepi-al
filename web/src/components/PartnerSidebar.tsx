"use client";

import { useState, useEffect, useCallback } from "react";

interface Partner {
  id: string;
  partnerName: string;
  partnerType: string;
  logoUrl: string | null;
  description: string | null;
  clickUrl: string;
}

interface PartnerSidebarProps {
  city?: string | null;
  placement?: string;
}

export default function PartnerSidebar({
  city,
  placement = "detail_sidebar",
}: PartnerSidebarProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPartners() {
      try {
        const params = new URLSearchParams({ placement });
        if (city) params.set("city", city);

        const res = await fetch(`/api/partners?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setPartners(data.partners ?? []);
        }
      } catch {
        // Silently fail — partner ads are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPartners();
    return () => {
      cancelled = true;
    };
  }, [city, placement]);

  const handleClick = useCallback((partnerId: string) => {
    // Fire-and-forget click tracking
    fetch("/api/partners/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId }),
    }).catch(() => {
      // Ignore tracking errors
    });
  }, []);

  if (loading || partners.length === 0) return null;

  return (
    <div className="rounded-xl border border-warm-gray-light/40 bg-cream p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-warm-gray">
        Shërbime të rekomanduara
      </h3>

      <div className="mt-3 space-y-3">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="rounded-lg border border-warm-gray-light/30 bg-white p-3"
          >
            <div className="flex items-center gap-3">
              {partner.logoUrl && (
                <img
                  src={partner.logoUrl}
                  alt={partner.partnerName}
                  className="h-8 w-auto shrink-0 rounded object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy">
                  {partner.partnerName}
                </p>
                <p className="text-xs text-warm-gray">{partner.partnerType}</p>
              </div>
            </div>

            {partner.description && (
              <p className="mt-2 text-xs leading-relaxed text-warm-gray">
                {partner.description}
              </p>
            )}

            <a
              href={partner.clickUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handleClick(partner.id)}
              className="btn-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-btn border border-terracotta/30 bg-terracotta-light px-3 py-2 text-xs font-medium text-terracotta transition hover:bg-terracotta hover:text-white"
            >
              Mëso më shumë
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] text-warm-gray/60">
        Reklama e sponsorizuar
      </p>
    </div>
  );
}
