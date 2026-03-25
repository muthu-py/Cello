import { useState } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function usePayments() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetch = (initialCash = 0) => {
        setLoading(true);
        setError(null);
        axios.get(`${INVENTORY_API}/api/inventory/payment-schedule?initial_cash=${initialCash}`)
            .then(r => setData(r.data?.data || null))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };
    return { data, loading, error, fetch };
}
