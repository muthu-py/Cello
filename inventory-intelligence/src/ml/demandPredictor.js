/*
  Demand Prediction Layer.
  A rule-based statistical engine to forecast daily demand for medicines.
*/
const DemandHistory = require('../models/demand_history.model');
const Medicine = require('../models/medicines.model');

/**
 * Predicts the daily demand for a specific medicine.
 * @param {string} medicine_id 
 * @returns {Promise<Object>} prediction result
 */
async function predictDemand(medicine_id) {
    // 1. Fetch last 30 days of history
    const history = await DemandHistory.find({ medicine_id })
        .sort({ date: -1 })
        .limit(30);

    // Fallback for edge case: < 7 days of history
    if (history.length < 7) {
        const medicine = await Medicine.findOne({ medicine_id });
        let defaultDemand = 20;
        if (medicine) {
            if (medicine.criticality === 'life_saving') defaultDemand = 8;
            else if (medicine.criticality === 'essential') defaultDemand = 30;
            else defaultDemand = 80;
        }
        return {
            medicine_id,
            predicted_demand_per_day: defaultDemand,
            confidence: 'low',
            reason: 'Insufficient history, using criticality defaults'
        };
    }

    // 2. Weighted Moving Average
    // Most recent day has weight 30, oldest weight 1
    const sumWeights = (history.length * (history.length + 1)) / 2;
    let weightedSum = 0;

    history.forEach((h, index) => {
        const weight = history.length - index; // index 0 is most recent
        weightedSum += h.actual_demand * weight;
    });

    const wma = weightedSum / sumWeights;

    // 3. Temporal Adjustments
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // Day of week factor (compute from history)
    const dowAverages = {};
    history.forEach(h => {
        if (!dowAverages[h.day_of_week]) dowAverages[h.day_of_week] = { sum: 0, count: 0 };
        dowAverages[h.day_of_week].sum += h.actual_demand;
        dowAverages[h.day_of_week].count += 1;
    });

    const currentDowAvg = dowAverages[dayOfWeek] ? (dowAverages[dayOfWeek].sum / dowAverages[dayOfWeek].count) : wma;
    const globalAvg = history.reduce((acc, h) => acc + h.actual_demand, 0) / history.length;
    const dowFactor = currentDowAvg / (globalAvg || 1);

    // Monthly position factor
    const monthlyFactor = (dayOfMonth <= 5) ? 1.1 : 1.0;

    // Final prediction
    let prediction = wma * dowFactor * monthlyFactor;
    prediction = Math.max(0.1, prediction);

    // 4. Confidence Score
    // Calculated based on Variance (CV - Coefficient of Variation)
    const variance = history.reduce((acc, h) => acc + Math.pow(h.actual_demand - globalAvg, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (globalAvg || 1);

    let confidence = 'high';
    if (cv > 0.4) confidence = 'low';
    else if (cv > 0.2) confidence = 'medium';

    return {
        medicine_id,
        predicted_demand_per_day: parseFloat(prediction.toFixed(2)),
        confidence,
        metrics: {
            wma: parseFloat(wma.toFixed(2)),
            dowFactor: parseFloat(dowFactor.toFixed(2)),
            cv: parseFloat(cv.toFixed(2))
        }
    };
}

module.exports = predictDemand;
