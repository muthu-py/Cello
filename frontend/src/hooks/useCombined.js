import { useState, useEffect } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function useCombined() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        axios.get(`${INVENTORY_API}/api/inventory/combined-priority`)
            .then(r => setData(r.data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}
