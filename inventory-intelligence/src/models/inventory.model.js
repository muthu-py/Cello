/*
  Mongoose schema for Inventory.
  Tracks current stock levels and expiry information.
*/
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    medicine_id: { type: String, ref: 'Medicine', required: true },
    current_stock: { type: Number, required: true },
    expiry_date: { type: Date, required: true },
    last_updated: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

InventorySchema.virtual('expiry_days').get(function () {
    const diff = this.expiry_date - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

InventorySchema.index({ medicine_id: 1 });

module.exports = mongoose.model('Inventory', InventorySchema);
