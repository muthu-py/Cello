/*
  Standalone script to run the Decision Engine and print restock plan.
*/
const connectDB = require('../src/config/db');
const runDecisionEngine = require('../src/engine/decisionEngine');
const mongoose = require('mongoose');

const run = async () => {
    try {
        await connectDB();

        console.log('=== INVENTORY INTELLIGENCE ENGINE RUN ===');
        const plan = await runDecisionEngine();

        console.log('\n--- TARGET RESTOCK PLAN ---\n');
        console.table(plan.map(p => ({
            Rank: p.rank,
            Medicine: p.medicine_name,
            Score: p.priority_score,
            Risk: p.risk_level,
            Flex: p.flexibility,
            'Stock-Out In': p.days_to_stockout,
            LeadTime: p.effective_lead_time,
            OrderQty: p.ideal_quantity,
            Cost: `₹${p.total_cost}`,
            Reason: p.reason.substring(0, 50) + '...'
        })));

        console.log('\n--- FLEXIBILITY VERIFICATION ---\n');
        console.table(plan.map(p => ({
            Medicine: p.medicine_name,
            Score: p.priority_score,
            Flexibility: p.flexibility
        })));

        console.log('\n=== ENGINE RUN COMPLETE ===');
    } catch (err) {
        console.error('✗ Engine Error:', err);
    } finally {
        mongoose.connection.close();
    }
};

run();
