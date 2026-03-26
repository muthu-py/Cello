import { useEffect, useState } from 'react';
import { inventoryApi } from '../config/api';

export function useForecast(medicineId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!medicineId) {
      setData(null);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(false);
      try {
        const res = await inventoryApi.get(
          `/api/inventory/medicine/${encodeURIComponent(medicineId)}/forecast`
        );
        const ok = res.data?.success;
        if (!cancelled) {
          setData(ok ? res.data : null);
          setError(!ok);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [medicineId]);

  return { data, error, loading };
}
