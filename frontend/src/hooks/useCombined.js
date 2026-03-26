import { useEffect, useState, useCallback } from 'react';
import { inventoryApi } from '../config/api';

export function useCombined() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(false);
      try {
        const res = await inventoryApi.get('/api/inventory/combined-priority');
        const ok = res.data?.success;
        const list = res.data?.data ?? null;
        if (!cancelled) {
          setData(ok ? list : null);
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
  }, [tick]);

  return { data, error, loading, refetch };
}
