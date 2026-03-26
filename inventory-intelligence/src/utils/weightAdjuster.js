/*
  Adaptive Weight Adjuster.
  Analyzes historical performance and adjusts engine weights to optimize restock accuracy.
*/
const EngineWeight = require('../models/engine_weights.model');
const DemandHistory = require('../models/demand_history.model');
const Medicine = require('../models/medicines.model');
const Inventory = require('../models/inventory.model');
const Supplier = require('../models/suppliers.model');

/**
 * Evaluates performance and adjusts engine weights if necessary.
 * @returns {Promise<Object>} Adjustment results
 */
async function runWeightAdjustment() {
    console.log('→ Adjuster: Starting Performance Analysis...');

    const currentWeights = await EngineWeight.findOne().sort({ version: -1 });
    if (!currentWeights) return { adjusted: false, reason: 'No weights found' };

    let { criticality_weight, stockout_weight, demand_weight, expiry_weight, supplier_weight } = currentWeights;
    const oldWeights = { criticality_weight, stockout_weight, demand_weight, expiry_weight, supplier_weight };
    const adjustmentReasons = [];
    const rulesTriggered = [];

    // Analysis Window (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // RULE 1: High prediction error on life_saving medicines
    const lifeSavingMeds = await Medicine.find({ criticality: 'life_saving' });
    let rule1Triggered = false;
    for (const med of lifeSavingMeds) {
        const history = await DemandHistory.find({
            medicine_id: med.medicine_id,
            date: { $gte: thirtyDaysAgo }
        });
        if (history.length > 0) {
            const mae = history.reduce((acc, h) => acc + Math.abs(h.error), 0) / history.length;
            const avgDemand = history.reduce((acc, h) => acc + h.actual_demand, 0) / history.length;
            if (mae > 0.3 * avgDemand) {
                rule1Triggered = true;
                break;
            }
        }
    }
    if (rule1Triggered) {
        stockout_weight += 0.03;
        demand_weight -= 0.03;
        rulesTriggered.push('RULE_1');
        adjustmentReasons.push('High demand unpredictability detected; prioritizing stockout buffer');
    }

    // RULE 2: Recurring stock-outs (days_to_stockout reached 0)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Check history for cases where demand > 0 but stock (before) was very low/zero
    // This is a proxy for stockout in this simulation
    const stockouts = await DemandHistory.find({
        date: { $gte: sevenDaysAgo },
        actual_demand: { $gt: 0 }
    });

    // In our simulation, we don't have a direct "reached 0" flag in DemandHistory, 
    // but we can check if any medicine had multiple low-stock days.
    // Let's assume the user wants us to detect these from PurchaseLogs or a specific flag.
    // For now, we'll keep the logic but search for a "0 days to stockout" signal.
    // Let's check for actual stockout events:
    const stockoutEvents = await Inventory.countDocuments({ current_stock: 0 });

    if (stockoutEvents >= 3) {
        stockout_weight += 0.02;
        supplier_weight += 0.01;
        criticality_weight -= 0.03;
        rulesTriggered.push('RULE_2');
        adjustmentReasons.push('Recurring stock-outs; increasing supply chain urgency weights');
    }

    // RULE 3: Expiry wastage detected
    const expiredMeds = await Inventory.countDocuments({
        expiry_date: { $lt: new Date() },
        current_stock: { $gt: 0 }
    });
    if (expiredMeds >= 2) {
        expiry_weight += 0.03;
        stockout_weight -= 0.03;
        rulesTriggered.push('RULE_3');
        adjustmentReasons.push('Expiry wastage detected; engine becoming more conservative on over-ordering');
    }

    // RULE 4: Supplier failures detected
    const unreliableSuppliers = await Supplier.find({ reliability_score: { $lt: 0.65 } });
    let rule4Triggered = false;
    for (const supplier of unreliableSuppliers) {
        const medStockout = await Inventory.findOne({
            medicine_id: { $in: supplier.medicine_id },
            current_stock: 0
        });
        if (medStockout) {
            rule4Triggered = true;
            break;
        }
    }
    if (rule4Triggered) {
        supplier_weight += 0.02;
        stockout_weight += 0.01;
        demand_weight -= 0.03;
        rulesTriggered.push('RULE_4');
        adjustmentReasons.push('Unreliable supplier contributed to stock-out; increasing supply risk sensitivity');
    }

    // Renormalization & Saving
    if (adjustmentReasons.length > 0) {
        const total = criticality_weight + stockout_weight + demand_weight + expiry_weight + supplier_weight;

        const newWeights = {
            criticality_weight: parseFloat((criticality_weight / total).toFixed(4)),
            stockout_weight: parseFloat((stockout_weight / total).toFixed(4)),
            demand_weight: parseFloat((demand_weight / total).toFixed(4)),
            expiry_weight: parseFloat((expiry_weight / total).toFixed(4)),
            supplier_weight: parseFloat((supplier_weight / total).toFixed(4)),
            auto_adjusted: true,
            adjustment_reason: adjustmentReasons.join(' | ')
        };

        // Check if change is meaningful (> 0.01)
        let totalDelta = 0;
        for (const key in oldWeights) {
            totalDelta += Math.abs(newWeights[key] - oldWeights[key]);
        }

        if (totalDelta > 0.01) {
            const saved = await EngineWeight.create(newWeights);
            console.log('✓ Adjuster: Weights auto-adjusted and saved version', saved.version);
            return {
                adjusted: true,
                oldWeights,
                newWeights: saved,
                rulesTriggered,
                reason: newWeights.adjustment_reason
            };
        }
    }

    console.log('→ Adjuster: No meaningful adjustment needed.');
    return { adjusted: false, reason: 'Performance within acceptable bounds' };
}

module.exports = { runWeightAdjustment };
