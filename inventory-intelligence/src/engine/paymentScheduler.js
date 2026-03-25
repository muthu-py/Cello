/*
  Hybrid Payment Scheduler Engine.
  Assigns payables to specific days based on predicted daily profit and flexibility rules.

  KEY RULES:
  - LOW flexibility → full payment ONLY (no partial), always checked first
  - MED/HIGH only get cash if no LOW payment is currently payable
  - Partial payments allowed ONLY for MEDIUM and HIGH
  - Cash never goes negative, never sits idle
*/

/**
 * Sorts payments by flexibility tier first (LOW→MED→HIGH), then by priority score descending.
 * @param {Array} list
 * @returns {Array} Sorted list
 */
function sortByPriority(list) {
    const flexOrder = { low: 0, medium: 1, high: 2 };

    return list.sort((a, b) => {
        if (flexOrder[a.flexibility] !== flexOrder[b.flexibility]) {
            return flexOrder[a.flexibility] - flexOrder[b.flexibility];
        }
        return b.priority_score - a.priority_score;
    });
}

/**
 * Hybrid payment scheduler.
 *
 * @param {Object} params
 * @param {Array} params.payments - List of { id, name, amount, priority_score, flexibility }
 * @param {Array<number>} params.dailyProfits - Predicted profit per day (cash inflow)
 * @param {number} [params.initialCash=0] - Starting cash balance
 * @returns {Object} { schedule, unpaid }
 */
function schedulePayments({ payments, dailyProfits, initialCash = 0 }) {
    let currentCash = initialCash;

    const schedule = [];

    // Deep copy to avoid mutating input
    const remaining = payments.map(p => ({ ...p }));

    for (let day = 0; day < dailyProfits.length; day++) {
        currentCash += dailyProfits[day];

        // ──────────────────────────────────────────
        // PHASE 1: Complete LOW payments (full only)
        // ──────────────────────────────────────────
        let lowPending = sortByPriority(
            remaining.filter(p => p.flexibility === 'low' && p.amount > 0)
        );

        let paidSomething = true;

        while (paidSomething) {
            paidSomething = false;

            for (const payment of lowPending) {
                if (payment.amount <= 0) continue;

                if (currentCash >= payment.amount) {
                    schedule.push({
                        payment_id: payment.id,
                        name: payment.name,
                        flexibility: payment.flexibility,
                        priority_score: payment.priority_score,
                        day,
                        paid: parseFloat(payment.amount.toFixed(2)),
                        type: 'full'
                    });

                    currentCash -= payment.amount;
                    payment.amount = 0;
                    paidSomething = true;
                }
            }
        }

        // ──────────────────────────────────────────────────────
        // PHASE 2: Guard — block MED/HIGH if any LOW is payable
        // ──────────────────────────────────────────────────────
        const lowStillPayable = remaining.some(
            p => p.flexibility === 'low' && p.amount > 0 && currentCash >= p.amount
        );

        if (lowStillPayable) continue; // Hold cash for LOW

        // ──────────────────────────────────────────────────────
        // PHASE 3: Allocate remaining cash to MED/HIGH
        //          Full or partial payments allowed
        // ──────────────────────────────────────────────────────
        const others = sortByPriority(
            remaining.filter(p => p.flexibility !== 'low' && p.amount > 0)
        );

        for (const next of others) {
            if (currentCash <= 0) break;
            if (next.amount <= 0) continue;

            if (currentCash >= next.amount) {
                // Full payment
                schedule.push({
                    payment_id: next.id,
                    name: next.name,
                    flexibility: next.flexibility,
                    priority_score: next.priority_score,
                    day,
                    paid: parseFloat(next.amount.toFixed(2)),
                    type: 'full'
                });

                currentCash -= next.amount;
                next.amount = 0;
            } else {
                // Partial payment (MED/HIGH only)
                schedule.push({
                    payment_id: next.id,
                    name: next.name,
                    flexibility: next.flexibility,
                    priority_score: next.priority_score,
                    day,
                    paid: parseFloat(currentCash.toFixed(2)),
                    type: 'partial'
                });

                next.amount -= currentCash;
                currentCash = 0;
            }
        }
    }

    // Remaining unpaid
    const unpaid = remaining
        .filter(p => p.amount > 0)
        .map(p => ({
            id: p.id,
            name: p.name,
            flexibility: p.flexibility,
            remaining: parseFloat(p.amount.toFixed(2))
        }));

    // Summary
    const totalScheduled = schedule.reduce((sum, s) => sum + s.paid, 0);
    const totalUnpaid = unpaid.reduce((sum, u) => sum + u.remaining, 0);

    return {
        schedule,
        unpaid,
        summary: {
            total_payments: payments.length,
            scheduled_transactions: schedule.length,
            fully_paid: remaining.filter(p => p.amount <= 0).length,
            total_cash_allocated: parseFloat(totalScheduled.toFixed(2)),
            total_remaining_debt: parseFloat(totalUnpaid.toFixed(2)),
            remaining_cash: parseFloat(currentCash.toFixed(2)),
            days_planned: dailyProfits.length
        }
    };
}

module.exports = { schedulePayments, sortByPriority };
