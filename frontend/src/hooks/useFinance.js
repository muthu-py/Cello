import { useEffect, useState } from 'react';
import { financeApi } from '../config/api';

/**
 * @param {string} [businessId]
 */
export function useFinance(businessId) {
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
        if (businessId != null) params.business_id = businessId;
        const res = await financeApi.get('/api/finance/due-priority', {
          params,
        });
        if (!cancelled) {
          setData(Array.isArray(res.data) ? res.data : []);
          setError(false);
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
  }, [businessId]);

  return { data, error, loading };
}
