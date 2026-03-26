import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import payableRoutes from './src/routes/payableRoutes.js';
import { getDuePriority } from './src/controllers/payableController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/finance/payables', payableRoutes);
app.get('/api/finance/due-priority', getDuePriority);
app.get('/api/finance/service-health', (req, res) => {
  res.status(200).json({ ok: true, service: 'finance-engine' });
});

// Database connection
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Health Route
app.get('/health', (req, res) => {
  res.status(200).send('Finance Service Running');
});

app.listen(PORT, () => {
  console.log(`Finance Service listening on port ${PORT}`);
});
