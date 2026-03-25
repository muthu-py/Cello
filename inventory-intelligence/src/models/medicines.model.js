/*
  Mongoose schema for Medicines.
  Stores medicine metadata and criticality.
*/
const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    medicine_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    criticality: {
        type: String,
        enum: ['life_saving', 'essential', 'general'],
        required: true
    },
    cost_per_unit: { type: Number, required: true },
    unit: { type: String, required: true },
    is_active: { type: Boolean, default: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

MedicineSchema.index({ criticality: 1 });

module.exports = mongoose.model('Medicine', MedicineSchema);
