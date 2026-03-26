/*
  Payables Service.
  Fetches financial payables from the external snu_hacks Finance API.
  Provides graceful fallback if the service is unavailable.
*/
const axios = require('axios');

const PAYABLES_API_URL = process.env.PAYABLES_API_URL || 'http://localhost:5002/api/finance/due-priority';

/**
 * Fetches prioritized payables from the Finance Service.
 * Returns an empty array on failure (graceful degradation).
 * @returns {Promise<Array>} Payable items with priority scores
 */
async function fetchPayables() {
    try {
        const res = await axios.get(PAYABLES_API_URL);

        if (!res.data) return [];

        return res.data.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            reference: item.reference || '',
            priority_score: item.priority_score,
            flexibility: item.flexibility,
            reason: item.reason,
            accumulated_amount: item.accumulated_amount,
            base_amount: item.base_amount,
            remaining_minutes: item.remaining_minutes,
            risk_level: item.risk_level,
            status: item.status
        }));
    } catch (err) {
        console.warn('⚠ Payables fetch failed, using fallback:', err.message);
        return [];
    }
}

module.exports = { fetchPayables };
