import { useState, useEffect } from 'react';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';

export default function useForecast(medicineId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!medicineId) return;
        setLoading(true);
        axios.get(`${INVENTORY_API}/api/inventory/medicine/${medicineId}/forecast`)
            .then(r => setData(r.data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [medicineId]);
    return { data, loading, error };
}
