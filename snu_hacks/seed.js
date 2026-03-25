import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payable from './src/models/Payable.js';

dotenv.config();

const mongoURI = process.env.MONGO_URI;

const seedDatabase = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding...');

    console.log('Clearing old table records...');
    await Payable.deleteMany({}); 

    const seedData = [
      {
        business_id: 'TEST-BIZ',
        type: 'other',
        name: 'Case 1: -1 Time (No Interval bypass)',
        amount: 1000,
        remaining_minutes: -1, // Begins below zero natively
        flexibility: 'low',
        operational_category: 'core',
        is_recurring: false,
        recurrence_interval_minutes: -1, // No accumulation
        status: 'pending' // Engine should immediately catch and transition to 'overdue' on first fetch
      },
      {
        business_id: 'TEST-BIZ',
        type: 'salary',
        name: 'Case 2: 2 Mins Recurring',
        amount: 5000,
        remaining_minutes: 2,
        flexibility: 'medium',
        operational_category: 'core',
        is_recurring: true,
        recurrence_interval_minutes: 2, // Accumulates every 2 mins
        status: 'pending'
      },
      {
        business_id: 'TEST-BIZ',
        type: 'rent',
        name: 'Case 3: 5 Mins Recurring',
        amount: 8000,
        remaining_minutes: 5,
        flexibility: 'high',
        operational_category: 'support',
        is_recurring: true,
        recurrence_interval_minutes: 5, // Accumulates every 5 mins
        status: 'pending'
      }
    ];

    await Payable.insertMany(seedData);
    
    console.log('New simulation test cases directly loaded!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
