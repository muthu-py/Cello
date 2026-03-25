import { useState, useEffect } from 'react';
import axios from 'axios';
import { FINANCE_API } from '../config/api';

export default function useFinance() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        axios.get(`${FINANCE_API}/api/finance/due-priority`)
            .then(r => setData(r.data || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return { data, loading, error };
}
