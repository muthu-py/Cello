/*
  Standalone script to trigger the data simulation.
*/
const connectDB = require('../src/config/db');
const simulate = require('../src/simulation/simulate');
const mongoose = require('mongoose');

const run = async () => {
    await connectDB();

    console.log('=== DATA SIMULATION START ===');

    const models = ['Medicine', 'Inventory', 'Supplier', 'PurchaseLog', 'DemandHistory', 'EngineWeight'];
    for (const modelName of models) {
        const Model = mongoose.model(modelName);
        await Model.deleteMany({});
        console.log(`✓ cleared ${modelName}`);
    }

    try {
        await simulate();
        console.log('=== DATA SIMULATION COMPLETE ===');

        // Status check
        for (const modelName of models) {
            const Model = mongoose.model(modelName);
            const count = await Model.countDocuments();
            console.log(`${modelName}: ${count} documents`);
        }

    } catch (err) {
        console.error('✗ Simulation Failed:', err);
    } finally {
        mongoose.connection.close();
    }
};

run();
