import { useState, useCallback } from "react";

interface GeolocationState {
  position: [number, number] | null;
  loading: boolean;
  error: string | null;
  locate: () => void;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Shfletuesi nuk mbështet vendndodhjen");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("Nuk mundëm të gjejmë vendndodhjen tuaj");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, loading, error, locate };
}
