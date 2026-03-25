/*
  Mongoose schema for Demand History.
  Stores historical actual vs predicted demand for model evaluation.
*/
const mongoose = require('mongoose');

const DemandHistorySchema = new mongoose.Schema({
    medicine_id: { type: String, ref: 'Medicine', required: true },
    date: { type: Date, required: true },
    actual_demand: { type: Number, required: true },
    predicted_demand: { type: Number },
    error: { type: Number },
    day_of_week: { type: Number },
    week_of_year: { type: Number },
    month: { type: Number }
});

DemandHistorySchema.index({ medicine_id: 1, date: -1 });

module.exports = mongoose.model('DemandHistory', DemandHistorySchema);
