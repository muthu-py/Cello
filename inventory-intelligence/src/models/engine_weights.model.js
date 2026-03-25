/*
  Mongoose schema for Engine Weights.
  Stores the configuration weights for the priority scoring engine.
*/
const mongoose = require('mongoose');

const EngineWeightSchema = new mongoose.Schema({
    version: { type: Number, default: 1 },
    criticality_weight: { type: Number, required: true },
    stockout_weight: { type: Number, required: true },
    demand_weight: { type: Number, required: true },
    expiry_weight: { type: Number, required: true },
    supplier_weight: { type: Number, required: true },
    auto_adjusted: { type: Boolean, default: false },
    adjustment_reason: { type: String },
    created_at: { type: Date, default: Date.now }
});

// Auto-increment version on save (simplified approach)
EngineWeightSchema.pre('save', async function (next) {
    if (this.isNew) {
        const latest = await this.constructor.findOne().sort({ version: -1 });
        if (latest) {
            this.version = latest.version + 1;
        }
    }
    next();
});

module.exports = mongoose.model('EngineWeight', EngineWeightSchema);
