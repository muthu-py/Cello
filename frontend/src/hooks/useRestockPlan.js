import { useState, useEffect } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function useRestockPlan() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        axios.get(`${INVENTORY_API}/api/inventory/restock-plan`)
            .then(r => setData(r.data?.data || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}
