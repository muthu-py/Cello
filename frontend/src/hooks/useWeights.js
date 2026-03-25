import { useState, useEffect } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function useWeights() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetch = () => {
        setLoading(true);
        axios.get(`${INVENTORY_API}/api/inventory/weights/history`)
            .then(r => setData(r.data?.data || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(fetch, []);
    return { data, loading, error, refetch: fetch };
}
