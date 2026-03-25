/*
  Main Entry Point for the Inventory Intelligence API.
  Sets up Express, middleware, and database connection.
*/
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./src/config/db');
const inventoryRoutes = require('./src/routes/inventory.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/inventory', inventoryRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Inventory Intelligence Service is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
    });
});

// Listen
app.listen(PORT, () => {
    console.log(`
🚀 Server running on port ${PORT}
📦 Module: Hospital Inventory Intelligence
🔗 Endpoint: http://localhost:${PORT}/api/inventory
  `);
});

module.exports = app;
