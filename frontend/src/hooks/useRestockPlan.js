import { useEffect, useState } from 'react';
import { inventoryApi } from '../config/api';

/**
 * @param {string} [riskLevel]
 * @param {number} [limit]
 */
export function useRestockPlan(riskLevel, limit) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(false);
      try {
        const params = {};
        if (riskLevel != null) params.risk_level = riskLevel;
        if (limit != null) params.limit = limit;
        const res = await inventoryApi.get('/api/inventory/restock-plan', {
          params,
        });
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
  }, [riskLevel, limit]);

  return { data, error, loading };
}
