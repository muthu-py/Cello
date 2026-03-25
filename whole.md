# Cello Ecosystem: Comprehensive Project Documentation

This document provides a holistic overview of the three core modules within the `Cello` development environment. These modules represent a suite of intelligence-driven services for hospital management, machine learning research, and financial prioritization.

---

## 1. Hospital Inventory Intelligence (`/inventory-intelligence`)
**Status:** Production-Ready Backend (Node.js/MongoDB)

The flagship module of this ecosystem, designed to solve the critical problem of medical supply chain management. It moves away from simple "low stock" alerts to a proactive, multi-factor decision engine.

### Core Architecture
- **Data Simulation Engine (`/src/simulation`)**: Generates 90 days of synthetic medical data, including seasonal demand spikes, supplier reliability fluctuations, and noise.
- **Demand Predictor (`/src/ml`)**: A rule-based statistical layer using **Weighted Moving Averages** and temporal adjustments to forecast future needs.
- **Refined Decision Engine (`/src/engine`)**: The primary coordinator that generates prioritized restock plans.
- **Adaptive Weight Adjuster (`/src/utils`)**: A self-correcting utility that recalibrates the engine's scoring weights based on historical errors and wastage events.

### The Priority Scoring Formula
Priority is calculated on a scale of **0–10** using the following weighted components:
1. **Criticality (30%)**: Life-saving, Essential, or General medical classification.
2. **Stockout Risk (28%)**: Continuous quadratic decay based on `days_to_stockout` vs `lead_time`.
3. **Demand Urgency (18%)**: Percentile-based scoring against a global hospital baseline.
4. **Supplier Risk (10%)**: Dynamic risk addition based on historical supplier reliability.
5. **Expiry Penalty (14%)**: A guarded penalty that prevents over-ordering while protecting life-saving stock.

---

## 2. Inventory ML Pipeline (`/restock`)
**Status:** Research & Reference (Python/Scikit-Learn)

A data-science-heavy module focused on building high-accuracy predictive models for inventory demand. This served as the conceptual foundation for the statistical predictor in the Node.js module.

### Key Features
- **ML Methodology**: Utilizes `RandomForestRegressor` to predict demand based on historical purchase logs.
- **Feature Engineering**: Implements sophisticated lag features, rolling windows (7d, 21d), and day-of-week encoding.
- **Simulation Suite**: A Python-based simulation engine that creates complex, noisy time-series data for training models.
- **Artifact Management**: Includes pipelines for saving trained models (`.joblib`) and precomputed features for inference.

---

## 3. Finance Payables Service (`/snu_hacks`)
**Status:** Specialized Tooling (Node.js ESM)

A dedicated service for managing a business's "Accounts Payable" (debts and invoices). It applies a similar intelligence-driven approach to cash flow management.

### The Problem Solved
Debt management often fails because businesses lose track of recurring obligations and the accumulating risk of penalty interest. This service treats debt as a time-sensitive resource.

### Scoring Logic
It uses a **Debt Prioritization Engine** similar to the Inventory engine but tuned for finance:
- **Urgency**: Points added as the "remaining minutes" until the due date approaches zero.
- **Accumulation**: A unique feature where missed recurring payments (e.g., weekly rent) "stack up," increasing their priority multiplier.
- **Operational Impact**: Expenses are categorized as "Core" or "Support" to ensure essential lights stay on.
- **Flexibility**: Points are **deducted** if a supplier is known to be lenient with payment windows.

---

## Technical Summary

| Feature | Inventory-Intelligence | Inventory-ML | SNU-Hacks |
| :--- | :--- | :--- | :--- |
| **Language** | Node.js (CommonJS) | Python 3.x | Node.js (ESM) |
| **Database** | MongoDB (`new_inventory`) | CSV / In-memory | MongoDB (`test`) |
| **Core Logic** | Deterministic Multi-Factor | Statistical Machine Learning | Time-based Accumulation |
| **Key Metric** | `priority_score` | `mean_absolute_error` | `accumulation_cycles` |

### Getting Started
To view the full operational flow of the ecosystem, refer to the individual `README.md` and `walkthrough.md` files within each directory. To run the primary engine:
```bash
cd inventory-intelligence && npm run engine
```
