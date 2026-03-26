import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../config/api';

export function usePayments() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (initialCash = 0) => {
    setLoading(true);
    setError(false);
    try {
      const res = await inventoryApi.get('/api/inventory/payment-schedule', {
        params: { initial_cash: initialCash },
      });
      const ok = res.data?.success;
      const payload = res.data?.data ?? null;
      setData(ok ? payload : null);
      setError(!ok);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  return { data, error, loading, load };
}
