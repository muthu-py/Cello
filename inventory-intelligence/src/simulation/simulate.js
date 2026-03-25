/*
  Data Simulation Engine.
  Populates MongoDB with realistic medical inventory, demand, and supply chain data.
*/
const mongoose = require('mongoose');
const Medicine = require('../models/medicines.model');
const Inventory = require('../models/inventory.model');
const Supplier = require('../models/suppliers.model');
const PurchaseLog = require('../models/purchase_logs.model');
const DemandHistory = require('../models/demand_history.model');
const EngineWeight = require('../models/engine_weights.model');

const MEDICINES_SEED = [
    { medicine_id: 'INS001', name: 'Insulin', criticality: 'life_saving', cost_per_unit: 150, unit: 'vial' },
    { medicine_id: 'AMO002', name: 'Amoxicillin', criticality: 'essential', cost_per_unit: 12, unit: 'tablet' },
    { medicine_id: 'PCM003', name: 'Paracetamol', criticality: 'general', cost_per_unit: 2, unit: 'tablet' },
    { medicine_id: 'MOR004', name: 'Morphine', criticality: 'life_saving', cost_per_unit: 500, unit: 'vial' },
    { medicine_id: 'MET005', name: 'Metformin', criticality: 'essential', cost_per_unit: 8, unit: 'tablet' },
    { medicine_id: 'SAL006', name: 'Salbutamol', criticality: 'life_saving', cost_per_unit: 180, unit: 'inhaler' },
    { medicine_id: 'ATR007', name: 'Atropine', criticality: 'life_saving', cost_per_unit: 300, unit: 'vial' },
    { medicine_id: 'ORS008', name: 'ORS Sachets', criticality: 'general', cost_per_unit: 5, unit: 'sachet' },
    { medicine_id: 'CIP009', name: 'Ciprofloxacin', criticality: 'essential', cost_per_unit: 25, unit: 'tablet' },
    { medicine_id: 'DIG010', name: 'Digoxin', criticality: 'life_saving', cost_per_unit: 220, unit: 'tablet' }
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

const simulate = async () => {
    console.log('→ Seeding Medicines...');
    for (const med of MEDICINES_SEED) {
        await Medicine.findOneAndUpdate({ medicine_id: med.medicine_id }, med, { upsert: true });
    }

    console.log('→ Seeding Default Weights...');
    await EngineWeight.findOneAndUpdate(
        { version: 1 },
        {
            criticality_weight: 0.30,
            stockout_weight: 0.28,
            demand_weight: 0.18,
            expiry_weight: 0.14,
            supplier_weight: 0.10
        },
        { upsert: true }
    );

    const medicines = await Medicine.find();

    console.log('→ Seeding Inventory & Suppliers...');
    for (const med of medicines) {
        // Inventory
        let stockRange = { min: 100, max: 500 };
        if (med.criticality === 'life_saving') stockRange = { min: 5, max: 40 };
        else if (med.criticality === 'essential') stockRange = { min: 20, max: 150 };

        const current_stock = randomInt(stockRange.min, stockRange.max);
        const expiry_date = new Date();
        expiry_date.setDate(expiry_date.getDate() + randomInt(2, 60)); // Random expiry within 60 days

        await Inventory.findOneAndUpdate(
            { medicine_id: med.medicine_id },
            { current_stock, expiry_date, last_updated: new Date() },
            { upsert: true }
        );

        // Suppliers (1-2 per medicine)
        const numSuppliers = randomInt(1, 2);
        for (let i = 1; i <= numSuppliers; i++) {
            let leadTimeRange = { min: 5, max: 7 };
            if (med.criticality === 'life_saving') leadTimeRange = { min: 1, max: 3 };
            else if (med.criticality === 'essential') leadTimeRange = { min: 3, max: 5 };

            await Supplier.findOneAndUpdate(
                { supplier_id: `SUP_${med.medicine_id}_${i}` },
                {
                    supplier_name: `${med.name} Global Supply ${i}`,
                    medicine_id: [med.medicine_id],
                    lead_time_days: randomInt(leadTimeRange.min, leadTimeRange.max),
                    min_order_quantity: randomInt(10, 50),
                    reliability_score: randomFloat(0.6, 1.0)
                },
                { upsert: true }
            );
        }
    }

    console.log('→ Generating 90 Days of Demand History...');
    for (const med of medicines) {
        let baseDemand = 100;
        if (med.criticality === 'life_saving') baseDemand = 10;
        else if (med.criticality === 'essential') baseDemand = 40;

        for (let d = 0; d < 90; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);

            let multiplier = 1.0;
            const day = date.getDay();
            if (day === 1 || day === 2) multiplier *= 1.3; // Mon/Tue peak
            if (day === 0 || day === 6) multiplier *= 0.8; // Weekend low

            if (date.getDate() <= 5) multiplier *= 1.2; // Monthly spike

            // Random Gaussian noise (simplified as uniform for script)
            multiplier *= randomFloat(0.85, 1.15);

            // Occasional spikes
            if (Math.random() < 0.05) multiplier *= randomFloat(2.0, 2.5);

            // Trend drift
            if (med.criticality === 'life_saving') multiplier *= (1 + (90 - d) * 0.005);

            const actualDemand = Math.max(1, Math.round(baseDemand * multiplier));
            const predictedDemand = Math.max(1, Math.round(actualDemand * randomFloat(0.9, 1.1))); // Dummy prediction

            await DemandHistory.findOneAndUpdate(
                { medicine_id: med.medicine_id, date: date.setHours(0, 0, 0, 0) },
                {
                    actual_demand: actualDemand,
                    predicted_demand: predictedDemand,
                    error: actualDemand - predictedDemand,
                    day_of_week: day,
                    month: date.getMonth() + 1
                },
                { upsert: true }
            );
        }
    }

    console.log('→ Generating Purchase Logs...');
    const suppliers = await Supplier.find();
    for (const med of medicines) {
        const numLogs = randomInt(3, 8);
        const medSuppliers = suppliers.filter(s => s.medicine_id.includes(med.medicine_id));

        for (let i = 0; i < numLogs; i++) {
            const supplier = medSuppliers[randomInt(0, medSuppliers.length - 1)];
            const qty = supplier.min_order_quantity * randomInt(1, 5);
            const date = new Date();
            date.setDate(date.getDate() - randomInt(1, 90));

            await PurchaseLog.create({
                medicine_id: med.medicine_id,
                quantity: qty,
                cost_per_unit: med.cost_per_unit,
                total_cost: qty * med.cost_per_unit,
                supplier_id: supplier.supplier_id,
                purchased_at: date
            });
        }
    }
};

module.exports = simulate;
