/*
  Mongoose schema for Purchase Logs.
  Audit trail for all restocking events.
*/
const mongoose = require('mongoose');

const PurchaseLogSchema = new mongoose.Schema({
    medicine_id: { type: String, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    cost_per_unit: { type: Number, required: true },
    total_cost: { type: Number, required: true },
    supplier_id: { type: String, ref: 'Supplier', required: true },
    purchased_at: { type: Date, default: Date.now }
});

PurchaseLogSchema.index({ medicine_id: 1, purchased_at: -1 });

module.exports = mongoose.model('PurchaseLog', PurchaseLogSchema);
