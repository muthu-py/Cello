import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payable from './src/models/Payable.js';

dotenv.config();

const mongoURI = process.env.MONGO_URI;

/** Minutes until due (positive) or past-due window for simulation */
const M = {
  HOUR: 60,
  DAY: 1440,
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding...');

    console.log('Clearing old payable records...');
    await Payable.deleteMany({});

    const now = new Date();

    const seedData = [
      {
        business_id: 'HSP-DEL-01',
        type: 'supplier',
        name: 'Apex Pharma Distributors Pvt Ltd',
        reference: 'INV-APH-2025-0144',
        amount: 425_000,
        accumulated_amount: 425_000,
        remaining_minutes: 4 * M.HOUR,
        flexibility: 'low',
        operational_category: 'core',
        is_critical_supplier: true,
        is_recurring: false,
        recurrence_interval_minutes: 0,
        status: 'pending',
        penalty: { type: 'percentage', value: 1.5 },
        last_updated_time: now,
      },
      {
        business_id: 'HSP-DEL-01',
        type: 'supplier',
        name: 'MedEquip Solutions — critical care rental',
        reference: 'PO-MEQ-2025-2091',
        amount: 892_500,
        accumulated_amount: 892_500,
        remaining_minutes: -3 * M.HOUR,
        flexibility: 'low',
        operational_category: 'core',
        is_critical_supplier: true,
        is_recurring: false,
        recurrence_interval_minutes: 0,
        status: 'overdue',
        penalty: { type: 'fixed', value: 15000 },
        last_updated_time: now,
      },
      {
        business_id: 'HSP-DEL-01',
        type: 'utilities',
        name: 'North Delhi Power Ltd — hospital wing',
        reference: 'UTL-NDP-MAR-2025',
        amount: 186_400,
        remaining_minutes: 2 * M.DAY,
        flexibility: 'medium',
        operational_category: 'core',
        is_recurring: false,
        recurrence_interval_minutes: 0,
        status: 'pending',
        penalty: { type: 'none', value: 0 },
        last_updated_time: now,
      },
      {
        business_id: 'HSP-DEL-01',
        type: 'salary',
        name: 'March 2025 — clinical & nursing payroll',
        reference: 'PAY-HR-2025-03',
        amount: 1_248_000,
        accumulated_amount: 1_248_000,
        remaining_minutes: 5 * M.DAY,
        flexibility: 'medium',
        operational_category: 'core',
        is_recurring: false,
        recurrence_interval_minutes: 0,
        status: 'pending',
        penalty: { type: 'none', value: 0 },
        last_updated_time: now,
      },
      {
        business_id: 'HSP-DEL-01',
        type: 'rent',
        name: 'Krishna Heights LLP — OPD block lease',
        reference: 'RENT-KH-Q1-2025',
        amount: 580_000,
        accumulated_amount: 580_000,
        remaining_minutes: 12 * M.DAY,
        flexibility: 'high',
        operational_category: 'support',
        is_recurring: true,
        recurrence_interval_minutes: 30 * M.DAY,
        status: 'pending',
        penalty: { type: 'percentage', value: 0.75 },
        last_updated_time: now,
      },
      {
        business_id: 'HSP-DEL-01',
        type: 'maintenance',
        name: 'Arctic HVAC — annual AMC instalment',
        reference: 'AMC-ARC-2025-B',
        amount: 94_000,
        accumulated_amount: 94_000,
        remaining_minutes: 9 * M.DAY,
        flexibility: 'high',
        operational_category: 'support',
        is_recurring: false,
        recurrence_interval_minutes: 0,
        status: 'pending',
        penalty: { type: 'none', value: 0 },
        last_updated_time: now,
      },
    ];

    await Payable.insertMany(seedData);

    console.log('Finance payables seed loaded (hospital-realistic data).');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
