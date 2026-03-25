/*
  Payment Service.
  Wraps the payment scheduler with data transformation from the payables API format.
*/
const { schedulePayments } = require('../engine/paymentScheduler');

/**
 * Runs the payment scheduler on fetched payables data.
 * @param {Array} payables - Raw payables from the Finance API
 * @param {Array<number>} predictedProfits - Daily profit predictions
 * @param {number} [initialCash=0] - Starting cash balance
 * @returns {Object} Schedule result
 */
async function runPaymentScheduler(payables, predictedProfits, initialCash = 0) {
    const payments = payables.map(p => ({
        id: p.id,
        name: p.name,
        amount: p.accumulated_amount || p.base_amount || 0,
        priority_score: p.priority_score,
        flexibility: p.flexibility
    }));

    return schedulePayments({
        payments,
        dailyProfits: predictedProfits,
        initialCash
    });
}

module.exports = { runPaymentScheduler };
