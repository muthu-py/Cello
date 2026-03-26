/*
  Express API Routes.
  Exposes the Inventory Intelligence module functionality via REST endpoints.
*/
const express = require('express');
const router = express.Router();
const runDecisionEngine = require('../engine/decisionEngine');
const predictDemand = require('../ml/demandPredictor');
const { runWeightAdjustment } = require('../utils/weightAdjuster');
const Medicine = require('../models/medicines.model');
const Inventory = require('../models/inventory.model');
const EngineWeight = require('../models/engine_weights.model');
const mongoose = require('mongoose');
const DemandHistory = require('../models/demand_history.model');

// GET /api/inventory/service-health — lightweight ping (works behind Vite /api proxy)
router.get('/service-health', (req, res) => {
    res.json({ ok: true, service: 'inventory-intelligence' });
});

// GET /api/inventory/restock-plan
router.get('/restock-plan', async (req, res) => {
    try {
        const { risk_level, limit } = req.query;
        let plan = await runDecisionEngine();

        if (risk_level) {
            plan = plan.filter(p => p.risk_level === risk_level.toUpperCase());
        }

        if (limit) {
            plan = plan.slice(0, parseInt(limit));
        }

        // Trigger weight adjustment in background
        runWeightAdjustment().catch(err => console.error('Weight adj error:', err));

        res.json({ success: true, count: plan.length, data: plan });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/inventory/medicine/:id/forecast
router.get('/medicine/:id/forecast', async (req, res) => {
    try {
        const medicine_id = req.params.id;
        const prediction = await predictDemand(medicine_id);
        const inventory = await Inventory.findOne({ medicine_id });

        const histRows = await DemandHistory.find({ medicine_id })
            .sort({ date: -1 })
            .limit(90)
            .lean();
        const historical_avg_daily = histRows.length > 0
            ? histRows.reduce((s, r) => s + r.actual_demand, 0) / histRows.length
            : null;

        // Simple 30-day forecast (extrapolating average + jitter)
        const forecast = [];
        for (let i = 1; i <= 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            // Add some jitter if history is low to make the simulation look realistic
            const jitter = prediction.confidence === 'low' ? (Math.random() * 0.2 - 0.1) * prediction.predicted_demand_per_day : 0;
            const val = Math.max(0.1, prediction.predicted_demand_per_day + jitter);

            forecast.push({
                date: date.toISOString().split('T')[0],
                predicted_demand: parseFloat(val.toFixed(2))
            });
        }

        res.json({
            success: true,
            medicine_id,
            current_stock: inventory ? inventory.current_stock : 0,
            expiry_days: inventory ? inventory.expiry_days : null,
            daily_prediction: prediction.predicted_demand_per_day,
            historical_avg_daily,
            confidence: prediction.confidence,
            forecast_30_days: forecast,
            forecast_7_days: forecast.slice(0, 7) // Backward compatibility
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/inventory/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const plan = await runDecisionEngine();
        const totalMeds = await Medicine.countDocuments();

        const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        let totalRestockCost = 0;

        plan.forEach(p => {
            riskCounts[p.risk_level]++;
            totalRestockCost += p.total_cost;
        });

        res.json({
            success: true,
            summary: {
                total_medicines: totalMeds,
                risk_distribution: riskCounts,
                total_estimated_restock_cost: totalRestockCost,
                critical_items: plan.filter(p => p.risk_level === 'CRITICAL').slice(0, 3)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/inventory/weights/adjust
router.post('/weights/adjust', async (req, res) => {
    try {
        const result = await runWeightAdjustment();
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/inventory/weights/history
router.get('/weights/history', async (req, res) => {
    try {
        const history = await EngineWeight.find().sort({ created_at: -1 });
        res.json({ success: true, count: history.length, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/inventory/simulation/status
router.get('/simulation/status', async (req, res) => {
    try {
        const status = {};
        const models = mongoose.modelNames();
        for (const model of models) {
            status[model] = await mongoose.model(model).countDocuments();
        }
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- INTEGRATION ENDPOINT ---
const { integrate } = require('../engine/integrationEngine');
const { fetchPayables } = require('../services/payablesService');
const { generateExecutiveBrief } = require('../services/geminiSummary');
const { buildExecutiveBriefPdf } = require('../services/executiveBriefPdf');

// POST /api/inventory/ai-summary — Google Gemini executive brief (requires GEMINI_API_KEY)
router.post('/ai-summary', async (req, res) => {
    try {
        const [plan, payables] = await Promise.all([
            runDecisionEngine(),
            fetchPayables(),
        ]);
        const integrated = integrate(plan, payables);
        const { summary, source, warning } = await generateExecutiveBrief({
            plan,
            payables,
            combinedCount: integrated.length,
        });
        res.json({ success: true, summary, source, warning });
    } catch (err) {
        if (err.code === 'MISSING_API_KEY') {
            return res.status(503).json({
                success: false,
                error: err.message,
                code: 'MISSING_API_KEY',
            });
        }
        console.error('AI summary error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to generate summary',
        });
    }
});

// POST /api/inventory/ai-summary/pdf — Gemini narrative converted to PDF download
router.post('/ai-summary/pdf', async (req, res) => {
    try {
        const [plan, payables] = await Promise.all([
            runDecisionEngine(),
            fetchPayables(),
        ]);
        const integrated = integrate(plan, payables);
        const { summary, payload, source, warning } = await generateExecutiveBrief({
            plan,
            payables,
            combinedCount: integrated.length,
        });

        const pdf = buildExecutiveBriefPdf({
            summary,
            generatedAt: new Date(),
            riskCounts: payload.riskCounts,
            totalRestockCost: payload.totalRestockCost,
            topInventory: payload.topInventory,
            topPayables: payload.topPayables,
        });

        const stamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="inventory-executive-report-${stamp}.pdf"`);
        res.setHeader('Content-Length', pdf.length);
        res.setHeader('X-Report-Source', source || 'unknown');
        if (warning) {
            res.setHeader('X-Report-Warning', warning);
        }
        res.send(pdf);
    } catch (err) {
        if (err.code === 'MISSING_API_KEY') {
            return res.status(503).json({
                success: false,
                error: err.message,
                code: 'MISSING_API_KEY',
            });
        }
        console.error('AI summary PDF error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to generate PDF report',
        });
    }
});

// GET /api/inventory/combined-priority
router.get('/combined-priority', async (req, res) => {
    try {
        const inventory = await runDecisionEngine();
        const payables = await fetchPayables();

        console.log('Inventory:', inventory.length);
        console.log('Payables:', payables.length);

        const combined = integrate(inventory, payables);

        console.log('Combined:', combined.length);

        res.json({
            success: true,
            count: combined.length,
            data: combined
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- PAYMENT SCHEDULER ENDPOINT ---
const { runPaymentScheduler } = require('../services/paymentService');

// GET /api/inventory/payment-schedule
router.get('/payment-schedule', async (req, res) => {
    try {
        const payables = await fetchPayables();

        // Predicted daily profits (mock for now; replace with real forecast)
        const predictedProfits = [2000, 1500, 3000, 2500, 1800];
        const initialCash = parseFloat(req.query.initial_cash || 0);

        const result = await runPaymentScheduler(payables, predictedProfits, initialCash);

        res.json({
            success: true,
            data: {
                ...result,
                daily_profits: predictedProfits,
                initial_cash: initialCash
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
