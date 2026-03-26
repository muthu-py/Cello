/*
  Deterministic Decision Engine.
  Aggregates data and computes prioritized restocking plans based on multi-factor scores.
*/
const Medicine = require('../models/medicines.model');
const Inventory = require('../models/inventory.model');
const Supplier = require('../models/suppliers.model');
const EngineWeight = require('../models/engine_weights.model');
const DemandHistory = require('../models/demand_history.model');
const predictDemand = require('../ml/demandPredictor');
const { formatDays, formatDaysVerbose } = require('../utils/formatters');

/**
 * Determines restock flexibility based on criticality, stock level, and expiry.
 * @param {Object} item - A computed restock item
 * @returns {'low'|'medium'|'high'}
 */
function getInventoryFlexibility(item) {
    // LOW flexibility: life-saving + (low stock OR near expiry)
    if (
        item.criticality === 'life_saving' &&
        (item.current_stock <= item.min_safe_quantity || item.expiry_days <= 7)
    ) {
        return 'low';
    }
    // MEDIUM: high priority score
    if (item.priority_score >= 7) return 'medium';
    // HIGH: everything else
    return 'high';
}

/**
 * Runs the decision engine for all active medicines.
 * @returns {Promise<Array>} Sorted priority queue
 */
async function runDecisionEngine() {
    console.log('→ Engine: Starting Data Aggregation...');

    const medicines = await Medicine.find({ is_active: true });
    const weights = await EngineWeight.findOne().sort({ version: -1 });

    if (!weights) {
        throw new Error('No engine weights found in database!');
    }

    const results = [];

    // STEP 3 (Global Prep): Compute Global 95th Percentile for demand
    const allHistory = await DemandHistory.aggregate([
        { $group: { _id: "$medicine_id", avg_demand: { $avg: "$actual_demand" } } },
        { $sort: { avg_demand: 1 } }
    ]);

    let global_95th_percentile = 100; // default
    if (allHistory.length > 0) {
        const idx = Math.floor(allHistory.length * 0.95);
        global_95th_percentile = allHistory[Math.min(idx, allHistory.length - 1)].avg_demand || 100;
    }

    // STEP 1: Process each medicine
    for (const med of medicines) {
        // Parallel fetch relevant data
        const [inventory, suppliers, prediction] = await Promise.all([
            Inventory.findOne({ medicine_id: med.medicine_id }),
            Supplier.find({ medicine_id: med.medicine_id }),
            predictDemand(med.medicine_id)
        ]);

        if (!inventory || suppliers.length === 0) {
            console.warn(`! Missing data for ${med.medicine_id}, skipping.`);
            continue;
        }

        // Use most reliable supplier for calculation
        const mainSupplier = suppliers.sort((a, b) => b.reliability_score - a.reliability_score)[0];
        const predicted_demand = prediction.predicted_demand_per_day;

        // STEP 2 & 7: Days to Stock-out with Reliability Adjustment
        const effectiveLeadTime = mainSupplier.lead_time_days / mainSupplier.reliability_score;
        const days_to_stockout = inventory.current_stock / (predicted_demand || 0.1);

        // STEP 3: Continuous Stockout Risk Score (0-10)
        const ratio = days_to_stockout / (effectiveLeadTime || 0.1);
        let stockoutScore = 0;
        if (ratio <= 0) stockoutScore = 10;
        else if (ratio >= 3.0) stockoutScore = 0;
        else stockoutScore = 10 * Math.pow(1 - ratio / 3.0, 2);
        stockoutScore = Math.max(0, Math.min(10, stockoutScore));

        // STEP 4: Criticality Score (0-10)
        let criticalityScore = 3;
        if (med.criticality === 'life_saving') criticalityScore = 10;
        else if (med.criticality === 'essential') criticalityScore = 7;

        // FIX 4: Supplier Risk Score (R)
        let supplierRiskScore = 0;
        if (mainSupplier.reliability_score >= 0.9) supplierRiskScore = 0;
        else if (mainSupplier.reliability_score >= 0.75) supplierRiskScore = 3;
        else if (mainSupplier.reliability_score >= 0.6) supplierRiskScore = 6;
        else supplierRiskScore = 9;

        // STEP 5: Expiry Risk Score (0-10, penalty)
        let expiryScore = 0;
        const expiryDays = inventory.expiry_days;
        if (expiryDays < 7) expiryScore = 10;
        else if (expiryDays < 30) expiryScore = 5;

        const demand_urgency_score = Math.max(0, Math.min(10, (predicted_demand / global_95th_percentile) * 10));

        results.push({
            medicine_id: med.medicine_id,
            medicine_name: med.name,
            criticality: med.criticality,
            cost_per_unit: med.cost_per_unit,
            current_stock: inventory.current_stock,
            expiry_days: expiryDays,
            supplier_name: mainSupplier.supplier_name,
            lead_time_days: mainSupplier.lead_time_days,
            effective_lead_time: parseFloat(effectiveLeadTime.toFixed(2)),
            reliability: mainSupplier.reliability_score,
            min_order_qty: mainSupplier.min_order_quantity,
            predicted_demand,
            days_to_stockout: parseFloat(days_to_stockout.toFixed(2)),
            stockout_risk_score: stockoutScore,
            criticality_score: criticalityScore,
            expiry_risk_score: expiryScore,
            demand_urgency_score: demand_urgency_score,
            supplier_risk_score: supplierRiskScore,
            confidence: prediction.confidence,
        });
    }

    // STEP 6: Normalization removed in favor of global baseline above

    console.log('→ Engine: Computing Priority Scores...');

    // STEP 8: Final Priority Scoring
    const finalQueue = results.map(r => {
        // FIX 2: Expiry Penalty with Criticality Guard
        let expiryPenaltyCap = 1.5; // general
        if (r.criticality === 'life_saving') expiryPenaltyCap = 1.0;
        else if (r.criticality === 'essential') expiryPenaltyCap = 0.7;

        const effectiveExpiryPenalty = Math.min(r.expiry_risk_score * weights.expiry_weight, expiryPenaltyCap);

        const rawPriorityScore =
            (r.criticality_score * weights.criticality_weight) +
            (r.stockout_risk_score * weights.stockout_weight) +
            (r.demand_urgency_score * weights.demand_weight) +
            (r.supplier_risk_score * weights.supplier_weight) -
            effectiveExpiryPenalty;

        const finalPriorityScore = Math.max(0, Math.min(10, rawPriorityScore));

        // STEP 9: Quantity Computation
        let safetyBufferDays = 2;
        if (r.criticality === 'life_saving') safetyBufferDays = 5;
        else if (r.criticality === 'essential') safetyBufferDays = 3;

        const targetDays = r.effective_lead_time + safetyBufferDays;

        let idealQty = Math.ceil((targetDays * r.predicted_demand) - r.current_stock);
        idealQty = Math.max(idealQty, r.min_order_qty);

        let minSafeQty = Math.ceil((r.effective_lead_time * r.predicted_demand) - r.current_stock);
        minSafeQty = Math.max(minSafeQty, r.min_order_qty);

        let isOverstock = false;
        if (r.current_stock > targetDays * r.predicted_demand) {
            isOverstock = true;
            idealQty = 0;
            minSafeQty = 0;
        }

        // STEP 10: Risk Level
        let riskLevel = "LOW";
        if (finalPriorityScore >= 8) riskLevel = "CRITICAL";
        else if (finalPriorityScore >= 5) riskLevel = "HIGH";
        else if (finalPriorityScore >= 2.5) riskLevel = "MEDIUM";

        // STEP 11: Reason Generation
        const reasonParts = [];
        if (r.days_to_stockout <= 0) {
            reasonParts.push('STOCKOUT NOW');
            reasonParts.push('immediate action required');
        } else {
            reasonParts.push(`Stock-out ${formatDaysVerbose(r.days_to_stockout)}`);
        }
        reasonParts.push(`${r.criticality.replace('_', '-')} medicine`);
        if (r.demand_urgency_score > 7) reasonParts.push('High demand signal detected');
        if (r.reliability < 0.8) reasonParts.push(`Low supplier reliability (${r.reliability}) extending effective lead time`);
        if (r.expiry_days < 30) reasonParts.push(`Near expiry (${r.expiry_days} days remaining)`);

        const expiryWarning = (r.expiry_days < 30 && !isOverstock);

        return {
            rank: 0, // Placeholder
            medicine_id: r.medicine_id,
            medicine_name: r.medicine_name,
            priority_score: parseFloat(finalPriorityScore.toFixed(2)),
            risk_level: riskLevel,
            days_to_stockout_raw: parseFloat(r.days_to_stockout.toFixed(2)),
            days_to_stockout: formatDays(r.days_to_stockout),
            predicted_demand_per_day: r.predicted_demand,
            ideal_quantity: idealQty,
            min_safe_quantity: minSafeQty,
            total_cost: parseFloat((idealQty * r.cost_per_unit).toFixed(2)),
            expiry_days: r.expiry_days,
            supplier_name: r.supplier_name,
            reliability: parseFloat(r.reliability.toFixed(3)),
            lead_time_days: r.lead_time_days,
            effective_lead_time_raw: parseFloat(r.effective_lead_time.toFixed(2)),
            effective_lead_time: formatDays(r.effective_lead_time),
            confidence: r.confidence,
            reason: reasonParts.join('; '),
            is_overstock: isOverstock,
            expiry_warning: expiryWarning,
            current_stock: r.current_stock,
            criticality: r.criticality,
            engine_weights_version: weights.version,
            score_breakdown: {
                criticality_score: parseFloat(r.criticality_score.toFixed(2)),
                stockout_risk_score: parseFloat(r.stockout_risk_score.toFixed(2)),
                demand_urgency_score: parseFloat(r.demand_urgency_score.toFixed(2)),
                supplier_risk_score: parseFloat(r.supplier_risk_score.toFixed(2)),
                expiry_risk_score: parseFloat(r.expiry_risk_score.toFixed(2)),
                effective_expiry_penalty: parseFloat(effectiveExpiryPenalty.toFixed(2)),
                raw_priority_score: parseFloat(rawPriorityScore.toFixed(2)),
                final_priority_score: parseFloat(finalPriorityScore.toFixed(2)),
                weights_used: {
                    W_c: weights.criticality_weight,
                    W_s: weights.stockout_weight,
                    W_d: weights.demand_weight,
                    W_r: weights.supplier_weight,
                    W_e: weights.expiry_weight
                }
            }
        };
    });

    // STEP 12: Sort and Rank
    console.log('→ Engine: Sorting Priority Queue...');
    finalQueue.sort((a, b) => b.score_breakdown.final_priority_score - a.score_breakdown.final_priority_score);
    finalQueue.forEach((item, index) => {
        item.rank = index + 1;
        item.flexibility = getInventoryFlexibility(item);
    });

    return finalQueue;
}

module.exports = runDecisionEngine;
