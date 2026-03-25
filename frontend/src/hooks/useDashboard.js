import { useState, useEffect } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function useDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        axios.get(`${INVENTORY_API}/api/inventory/dashboard`)
            .then(r => setData(r.data?.summary || null))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}
