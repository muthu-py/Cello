import { useEffect, useState } from 'react';
import { inventoryApi } from '../config/api';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(false);
      try {
        const res = await inventoryApi.get('/api/inventory/dashboard');
        const ok = res.data?.success;
        const summary = res.data?.summary ?? null;
        if (!cancelled) {
          setData(ok ? summary : null);
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
  }, []);

  return { data, error, loading };
}
