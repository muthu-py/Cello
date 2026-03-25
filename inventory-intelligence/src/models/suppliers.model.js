/*
  Mongoose schema for Suppliers.
  Stores supply chain availability and reliability metrics.
*/
const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    supplier_id: { type: String, required: true, unique: true },
    medicine_id: [{ type: String, ref: 'Medicine' }], // A supplier can supply multiple medicines
    supplier_name: { type: String, required: true },
    lead_time_days: { type: Number, required: true },
    min_order_quantity: { type: Number, required: true },
    reliability_score: { type: Number, default: 0.8, min: 0, max: 1 },
    last_updated: { type: Date, default: Date.now }
});

SupplierSchema.index({ medicine_id: 1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
