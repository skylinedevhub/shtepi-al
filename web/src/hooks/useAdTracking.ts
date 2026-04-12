"use client";

import { useCallback, useRef, useEffect } from "react";

interface PendingImpression {
  campaign_id: string;
  listing_id: string;
  placement: string;
}

/**
 * Hook that batches ad impressions and sends them to the server.
 * Flushes every 10 seconds or on page unload.
 */
export function useAdTracking(placement: string) {
  const buffer = useRef<PendingImpression[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return;
    const batch = buffer.current.splice(0, buffer.current.length);

    try {
      await fetch("/api/ads/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impressions: batch }),
      });
    } catch {
      // Silent fail — ad tracking should never break the page
    }
  }, []);

  // Flush on unmount or page unload
  useEffect(() => {
    const handleUnload = () => {
      if (buffer.current.length > 0) {
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({ impressions: buffer.current });
        navigator.sendBeacon("/api/ads/impression", data);
        buffer.current = [];
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush();
    };
  }, [flush]);

  const trackImpression = useCallback(
    (campaignId: string, listingId: string) => {
      buffer.current.push({
        campaign_id: campaignId,
        listing_id: listingId,
        placement,
      });

      // Flush after 10 seconds of collecting
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void flush();
        }, 10_000);
      }
    },
    [placement, flush]
  );

  const trackClick = useCallback(
    async (campaignId: string) => {
      try {
        await fetch("/api/ads/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: campaignId }),
        });
      } catch {
        // Silent fail
      }
    },
    []
  );

  return { trackImpression, trackClick };
}
