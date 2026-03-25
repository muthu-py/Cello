# Cello Project Documentation (Complete Repository Walkthrough)

## 1. What this repository is
`Cello` is a multi-service workspace with **three separate codebases** focused on operational intelligence:

1. `inventory-intelligence/` (Node.js + Express + MongoDB, CommonJS)
2. `restock/inventory_ml/` (Python + scikit-learn ML pipeline)
3. `snu_hacks/` (Node.js + Express + MongoDB, ESM)

There is also a root-level narrative file: `whole.md`.

This is **not** a single integrated monolith. It is a workspace of related but independently runnable modules.

## 2. Repository layout

```text
Cello/
├── inventory-intelligence/
│   ├── app.js
│   ├── package.json
│   ├── .env
│   ├── scripts/
│   │   ├── runSimulation.js
│   │   └── runEngine.js
│   └── src/
│       ├── config/db.js
│       ├── routes/inventory.routes.js
│       ├── engine/
│       │   ├── decisionEngine.js
│       │   └── integrationEngine.js
│       ├── services/payablesService.js
│       ├── ml/demandPredictor.js
│       ├── simulation/simulate.js
│       ├── utils/
│       │   ├── formatters.js
│       │   └── weightAdjuster.js
│       └── models/
│           ├── medicines.model.js
│           ├── inventory.model.js
│           ├── suppliers.model.js
│           ├── purchase_logs.model.js
│           ├── demand_history.model.js
│           └── engine_weights.model.js
├── restock/
│   └── inventory_ml/
│       ├── requirements.txt
│       ├── config.py
│       ├── run_training.py
│       ├── .gitignore
│       ├── data/simulate.py
│       ├── features/engineer.py
│       ├── training/
│       │   ├── train.py
│       │   └── evaluate.py
│       └── artifacts/
│           ├── demand_model.pkl
│           ├── scaler.pkl
│           ├── feature_columns.json
│           ├── training_report.json
│           ├── actual_vs_predicted.png
│           └── feature_importance.png
├── snu_hacks/
│   ├── app.js
│   ├── package.json
│   ├── README.md
│   ├── seed.js
│   ├── .gitignore
│   └── src/
│       ├── models/Payable.js
│       ├── routes/payableRoutes.js
│       ├── controllers/payableController.js
│       ├── services/payableService.js
│       └── utils/scoring.js
├── whole.md
└── about.md
```

## 3. Service-by-service deep explanation

## 3.1 `inventory-intelligence/` (Hospital inventory priority engine)

### 3.1.1 Runtime and dependencies
- Runtime: Node.js
- Module system: CommonJS (`"type": "commonjs"`)
- Frameworks/libraries: `express`, `mongoose`, `cors`, `dotenv`, `axios`
- Scripts:
  - `npm start` → `node app.js`
  - `npm run simulate` → clears and reseeds DB using simulation logic
  - `npm run engine` → runs decision engine and prints ranked plan

Environment variables used:
- `PORT`
- `MONGO_URI`

### 3.1.2 Entry point and API server flow
File: `app.js`
- Loads env + connects to MongoDB (`connectDB()`)
- Adds middleware: CORS and JSON body parser
- Mounts inventory API at `/api/inventory`
- Exposes health endpoint: `GET /health`
- Includes global error handler returning JSON `{ success: false, error, message }`

### 3.1.3 Database models
All are Mongoose models.

1. `Medicine` (`medicines.model.js`)
- Key fields: `medicine_id`, `name`, `criticality`, `cost_per_unit`, `unit`, `is_active`
- Criticality enum: `life_saving | essential | general`
- Index on `criticality`

2. `Inventory` (`inventory.model.js`)
- Fields: `medicine_id`, `current_stock`, `expiry_date`, `last_updated`
- Virtual `expiry_days` computed from `expiry_date - now`
- Index on `medicine_id`

3. `Supplier` (`suppliers.model.js`)
- Fields: `supplier_id`, `medicine_id[]`, `supplier_name`, `lead_time_days`, `min_order_quantity`, `reliability_score`
- Reliability range constrained `[0,1]`
- Index on `medicine_id`

4. `PurchaseLog` (`purchase_logs.model.js`)
- Fields: `medicine_id`, `quantity`, `cost_per_unit`, `total_cost`, `supplier_id`, `purchased_at`
- Index: `{ medicine_id: 1, purchased_at: -1 }`

5. `DemandHistory` (`demand_history.model.js`)
- Fields: `medicine_id`, `date`, `actual_demand`, `predicted_demand`, `error`, `day_of_week`, `week_of_year`, `month`
- Index: `{ medicine_id: 1, date: -1 }`

6. `EngineWeight` (`engine_weights.model.js`)
- Weight fields: `criticality_weight`, `stockout_weight`, `demand_weight`, `expiry_weight`, `supplier_weight`
- Metadata: `version`, `auto_adjusted`, `adjustment_reason`, `created_at`
- Pre-save hook auto-increments `version` if inserting new record

### 3.1.4 Simulation subsystem
Files:
- `src/simulation/simulate.js`
- `scripts/runSimulation.js`

What it does:
- Seeds 10 medicines (`MEDICINES_SEED` equivalent IDs like `INS001` etc.)
- Seeds default engine weights (0.30, 0.28, 0.18, 0.14, 0.10)
- Seeds inventory with criticality-aware stock ranges
- Seeds 1-2 suppliers/medicine with lead time, MOQ, reliability
- Generates 90 days of demand history with:
  - day-of-week effects,
  - monthly spike for first 5 days,
  - random noise,
  - occasional random spikes,
  - trend drift for life-saving medicines
- Generates purchase logs per medicine

`runSimulation.js` also **clears** model collections before reseeding:
- Medicine, Inventory, Supplier, PurchaseLog, DemandHistory, EngineWeight

### 3.1.5 Demand prediction subsystem
File: `src/ml/demandPredictor.js`

Logic:
- Uses last 30 demand history records for a medicine
- If fewer than 7 records: fallback default demand by medicine criticality
- Otherwise computes:
  1. Weighted moving average (recent days weighted higher)
  2. Day-of-week adjustment from historical pattern
  3. Monthly factor (`+10%` in first 5 days)
  4. Confidence from coefficient of variation (CV)

Output includes:
- `predicted_demand_per_day`
- `confidence` (`high`, `medium`, `low`)
- metrics (`wma`, `dowFactor`, `cv`) when enough history

### 3.1.6 Core decision engine
File: `src/engine/decisionEngine.js`

Pipeline summary:
1. Load active medicines and latest weight version
2. Compute global demand baseline (95th percentile over medicine average demand)
3. For each medicine, gather in parallel:
   - inventory,
   - suppliers,
   - demand prediction
4. Calculate scoring features:
   - stockout risk (continuous quadratic curve)
   - criticality score
   - supplier risk score from reliability bands
   - expiry risk score
   - demand urgency score normalized to global 95th percentile
5. Combine weighted score:
   - add criticality, stockout, demand urgency, supplier risk
   - subtract capped expiry penalty (cap depends on criticality)
6. Compute quantities:
   - `ideal_quantity`
   - `min_safe_quantity`
   - stock overage check (`is_overstock`)
7. Assign risk labels:
   - `CRITICAL >= 8`, `HIGH >= 5`, `MEDIUM >= 2.5`, else `LOW`
8. Build human-readable reason string
9. Sort descending by final score and assign rank

Returned object per medicine includes:
- scores, breakdown, weights version used
- supplier and lead time details
- stockout timing, quantities, cost, confidence
- flags: `is_overstock`, `expiry_warning`, `flexibility`

### 3.1.6b Flexibility classification
After scoring and ranking, each item is assigned a `flexibility` label:
- `low`: Life-saving medicine AND (current stock ≤ min safe quantity OR expiry ≤ 7 days)
- `medium`: Priority score ≥ 7
- `high`: Everything else

This field is used by the integration engine to determine cross-domain priority overrides.

### 3.1.7 Integration engine
File: `src/engine/integrationEngine.js`

Purpose:
- Merges inventory restock priorities with financial payables into a single unified priority queue.
- Uses flexibility-based override rules for cross-domain comparison.

Mapping functions:
- `mapInventory(item)`: Normalizes inventory score from 0–10 to 0–1 for cross-domain comparison.
- `mapPayable(item)`: Passes through softmax-normalized payable score (already 0–1).

Comparator rules (in order of precedence):
1. **Both LOW flexibility**: Inventory always wins (medical urgency > financial).
2. **Inventory HIGH vs Payable MEDIUM/HIGH**: Payable wins (flexible stock can wait).
3. **Default**: Sort by normalized score descending.

Output format per item:
```json
{
  "id": "...",
  "name": "...",
  "source": "inventory | payable",
  "score": 0.582,
  "flexibility": "low | medium | high",
  "reason": "...",
  "raw": { /* original item */ }
}
```

### 3.1.8 Payables fetch service
File: `src/services/payablesService.js`

Purpose:
- Fetches prioritized payables from the external Finance Service (`snu_hacks`).
- Graceful degradation: returns empty array on failure (no crash).

Configuration:
- `PAYABLES_API_URL` env var (default: `http://localhost:5002/api/finance/due-priority`)
- Uses `axios` for HTTP requests.

### 3.1.9 Weight auto-adjuster
File: `src/utils/weightAdjuster.js`

Purpose:
- Auto-tune score weights based on recent performance signals.

Rules implemented:
- Rule 1: high prediction error in life-saving medicines
- Rule 2: recurring stockout events
- Rule 3: expiry wastage detected
- Rule 4: supplier failure pattern

If adjustments are meaningful (`totalDelta > 0.01`):
- renormalize weights to sum to 1,
- save a new `EngineWeight` version,
- return old/new weights with reasons.

Important implementation note:
- `Rule 4` queries `Supplier` model for unreliable suppliers. The `Supplier` model is imported at the top of the file.

### 3.1.10 REST API surface
File: `src/routes/inventory.routes.js`

Endpoints:
- `GET /api/inventory/restock-plan`
  - Query params: `risk_level`, `limit`
  - Returns ranked plan
  - Triggers background `runWeightAdjustment()`

- `GET /api/inventory/medicine/:id/forecast`
  - Returns 7-day extrapolated forecast + inventory snapshot

- `GET /api/inventory/dashboard`
  - Aggregated summary: totals, risk distribution, cost, top criticals

- `POST /api/inventory/weights/adjust`
  - Forces explicit weight adjustment run

- `GET /api/inventory/weights/history`
  - Returns historical engine weights sorted by newest

- `GET /api/inventory/simulation/status`
  - Returns document counts per loaded mongoose model

- `GET /api/inventory/combined-priority`
  - Runs the decision engine and fetches payables from the Finance Service
  - Merges both lists using `integrationEngine.integrate()`
  - Returns unified priority queue sorted by flexibility rules + score
  - Debug logs: inventory count, payables count, combined count

### 3.1.11 Utility helpers
File: `src/utils/formatters.js`
- `formatDays(days)` → compact labels (`STOCKOUT NOW`, `~1 day`, etc.)
- `formatDaysVerbose(days)` → sentence-friendly phrase used in reasons

### 3.1.12 Operational behavior summary
- Service expects MongoDB reachable via `MONGO_URI`.
- Integration endpoint requires the Finance Service (`snu_hacks`) running on port 5002.
- Simulation is destructive to module collections (full clear then reseed).
- No test suite present in this module.

## 3.2 `restock/inventory_ml/` (Python ML training pipeline)

### 3.2.1 Runtime and dependencies
Defined in `requirements.txt`:
- `pymongo`, `pandas`, `numpy`, `scikit-learn`, `joblib`, `python-dotenv`, `matplotlib`

### 3.2.2 Configuration and domain constants
File: `config.py`
Contains:
- dataset simulation settings (`SIMULATION_DAYS=60`)
- 20-medicine master config (category, criticality, demand baseline, costs)
- season definitions and category season multipliers
- weekday/hour multipliers
- random behavior parameters (`NOISE_FACTOR`, spike probabilities)
- supplier catalog
- model hyperparams (`RandomForestRegressor`) in `ML_CONFIG`
- artifacts output dir (`artifacts/`)

### 3.2.3 End-to-end pipeline entrypoint
File: `run_training.py`
Flow:
1. Load env
2. Simulate training data (Mongo collections)
3. Build engineered feature dataset
4. Train RandomForest model
5. Evaluate metrics + model health
6. Save model/scaler/feature/report artifacts

Mongo env:
- `MONGO_URI` (default `mongodb://localhost:27017`)
- `DB_NAME` (default `inventory_intelligence`)

### 3.2.4 Data simulation for training
File: `data/simulate.py`
What it generates:
- drops and recreates `medicines`, `inventory`, `suppliers`, `purchase_logs`
- inserts medicine and supplier configs
- simulates per-day demand with seasonality + weekday + gaussian noise + spikes
- creates hourly purchase events with emergency probability
- tracks stock-before/after per purchase
- inserts one final inventory snapshot per medicine

### 3.2.5 Feature engineering
File: `features/engineer.py`
Feature groups include:
- time features (`day_of_week`, `hour_of_day`, `month`, `week_of_year`, weekend, quarter)
- encoded season tag
- rolling daily aggregates (`rolling_7d_demand`, `rolling_30d_demand`, std)
- lag features (`lag_1d_demand`, `lag_7d_demand`)
- growth rate
- stock context (`stock_ratio`)
- emergency flag
- normalized cost z-score
- encoded medicine category + criticality

Target variable:
- `y = quantity`

Final feature set size:
- 19 columns (stored in `artifacts/feature_columns.json`)

### 3.2.6 Model training and persistence
File: `training/train.py`
- train/test split
- `StandardScaler` on features
- `RandomForestRegressor` fit using config hyperparams
- persists:
  - `artifacts/demand_model.pkl`
  - `artifacts/scaler.pkl`
  - `artifacts/feature_columns.json`
  - `artifacts/training_report.json`

### 3.2.7 Evaluation and health checks
File: `training/evaluate.py`
Metrics:
- train/test R²
- MAE
- RMSE
- MAPE

Also outputs plots:
- `actual_vs_predicted.png`
- `feature_importance.png`

Health gate (`check_model_health`):
- fail if `test_r2 <= 0.60`
- fail if `mae >= 20`
- fail if `mape >= 35`

Current artifact report (`training_report.json`) shows:
- `test_r2 = 0.5864` (below threshold)
- `mae = 7.03`
- `mape = 30.73`

So current run likely fails strict R² health criterion while passing MAE and MAPE.

### 3.2.8 Operational notes
- Uses synthetic data, not production ETL.
- `venv/` exists in repo but is environment state, not project source.
- No test suite files present.

## 3.3 `snu_hacks/` (Finance due-priority/payables microservice)

### 3.3.1 Runtime and dependencies
- Runtime: Node.js
- Module system: ESM (`"type": "module"`)
- Frameworks/libraries: `express`, `mongoose`, `cors`, `dotenv`
- Dev tool: `nodemon`
- Scripts:
  - `npm run dev`
  - `npm start`
  - `npm run seed`

### 3.3.2 App bootstrap
File: `app.js`
- Loads env
- Connects to MongoDB (`mongoose.connect`)
- Mounts routes under `/api/finance/payables`
- Exposes direct route `GET /api/finance/due-priority`
- Health route: `GET /health`
- Default port: `5002`

### 3.3.3 Payable data model
File: `src/models/Payable.js`
Key fields:
- identity/context: `business_id`, `type`, `name`
- amounts: `amount`, `accumulated_amount`
- timing/status: `remaining_minutes`, `status`, `last_updated_time`
- risk/behavior: `penalty`, `flexibility`, `is_critical_supplier`
- recurrence: `is_recurring`, `recurrence_interval_minutes`
- operations: `operational_category`
- optional `metadata`

Collection explicitly set to `payables`.

### 3.3.4 Routing layer
File: `src/routes/payableRoutes.js`
Endpoints:
- `POST /simulate` → trigger time accumulation step
- `POST /` → create payable
- `GET /` → list all payables
- `GET /:id` → fetch one payable
- `PUT /:id` → update payable
- `DELETE /:id` → delete payable

### 3.3.5 Controller behavior
File: `src/controllers/payableController.js`
Highlights:
- Validation on create/update (`amount > 0`, required fields)
- Prevents API clients from directly setting `accumulated_amount`
- `getDuePriority`:
  - first runs recurrence update
  - fetches pending + overdue payables
  - computes raw priority via scoring utility
  - maps risk levels from raw score
  - applies softmax normalization across fetched set
  - sorts descending by normalized priority

### 3.3.6 Recurrence/accumulation engine
File: `src/services/payableService.js`
Core logic:
- For unpaid payables, compute elapsed minutes since `last_updated_time`
- Decrement `remaining_minutes`
- If recurring with positive interval:
  - while overdue, roll cycles and add `amount` to `accumulated_amount`
  - adjust status (`pending`/`overdue`)
- Non-recurring/no valid interval:
  - mark overdue when `remaining_minutes <= 0`

Includes optional `simulatedMinutes` fast-forward mode.

### 3.3.7 Priority scoring model
File: `src/utils/scoring.js`
Weighted formula components:
- urgency (20%)
- penalty (20%)
- operational impact (20%)
- supplier dependency (15%)
- overdue state (10%)
- accumulation ratio (10%)
- minus flexibility penalty (15%)

Score clamped 0-10; reasons generated as semicolon-delimited explanation tags.

### 3.3.8 Seed data
File: `seed.js`
Seeds three demonstrative cases, including:
- one-time overdue-style case (`remaining_minutes=-1`)
- 2-minute recurring case
- 5-minute recurring case

### 3.3.9 Operational notes
- Requires `MONGO_URI` in env.
- No automated tests present.
- Contains its **own nested `.git/` directory** (independent git history inside subfolder).

## 4. Cross-project relationship (how modules align)

- `inventory-intelligence` and `restock/inventory_ml` both model medicine demand/inventory dynamics, but in different forms:
  - Node module: deterministic real-time decision engine
  - Python module: offline ML experimentation/training pipeline
- `snu_hacks` applies similar prioritization ideas to finance payables instead of medical stock.

**Cross-service integration:**
- `inventory-intelligence` now includes an **Integration Engine** (`integrationEngine.js`) that fetches payables from `snu_hacks` via HTTP and merges them with inventory priorities using flexibility-based override rules.
- The integration is accessible via `GET /api/inventory/combined-priority`.
- If the Finance Service is unavailable, the endpoint gracefully degrades to inventory-only results.

## 5. Build/run commands

From repository root:

### Inventory Intelligence
```bash
cd inventory-intelligence
npm install
npm run simulate
npm run engine
npm start
```

### Restock ML
```bash
cd restock/inventory_ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_training.py
```

### Finance Engine (`snu_hacks`)
```bash
cd snu_hacks
npm install
npm run seed
npm start
```

## 6. API quick reference

### Inventory intelligence
- `GET /health`
- `GET /api/inventory/restock-plan?risk_level=CRITICAL&limit=10`
- `GET /api/inventory/medicine/:id/forecast`
- `GET /api/inventory/dashboard`
- `POST /api/inventory/weights/adjust`
- `GET /api/inventory/weights/history`
- `GET /api/inventory/simulation/status`
- `GET /api/inventory/combined-priority`

### Finance service
- `GET /health`
- `GET /api/finance/due-priority?business_id=TEST-BIZ`
- `POST /api/finance/payables/simulate`
- `POST /api/finance/payables`
- `GET /api/finance/payables`
- `GET /api/finance/payables/:id`
- `PUT /api/finance/payables/:id`
- `DELETE /api/finance/payables/:id`

## 7. Important caveats and current gaps

1. No test suites were found across modules.
2. `inventory-intelligence` checks in `node_modules/` (normally should be excluded).
3. `restock/inventory_ml` contains checked-in `venv/` and model artifacts (usually environment/artifacts are excluded or versioned separately by policy).
4. Root git currently tracks subprojects in an unusual state, and `snu_hacks` has an internal nested git repository.

## 8. File-by-file purpose index (first-party files only)

### Root
- `whole.md`: Existing narrative overview of the ecosystem.
- `about.md`: This comprehensive technical walkthrough.

### inventory-intelligence
- `package.json`: Node metadata, scripts, dependencies.
- `.env`: runtime environment values (`PORT`, `MONGO_URI`).
- `app.js`: HTTP service entrypoint.
- `scripts/runSimulation.js`: destructive reseed runner.
- `scripts/runEngine.js`: decision engine CLI runner.
- `src/config/db.js`: MongoDB connector.
- `src/routes/inventory.routes.js`: inventory API routes + combined-priority integration endpoint.
- `src/engine/decisionEngine.js`: core ranking, quantity logic, and flexibility classification.
- `src/engine/integrationEngine.js`: cross-domain merge engine with flexibility-based comparator.
- `src/services/payablesService.js`: external Finance API fetch with graceful fallback.
- `src/ml/demandPredictor.js`: statistical demand predictor.
- `src/simulation/simulate.js`: synthetic data generator.
- `src/utils/formatters.js`: stock timing string formatters.
- `src/utils/weightAdjuster.js`: adaptive weight tuning engine.
- `src/models/*.js`: Mongoose schemas for all inventory domain entities.

### restock/inventory_ml
- `requirements.txt`: Python dependencies.
- `.gitignore`: ignores pycache/pyc/.env.
- `config.py`: simulation, domain, model, and artifact config.
- `run_training.py`: orchestrates full ML pipeline.
- `data/simulate.py`: synthetic event generation into MongoDB.
- `features/engineer.py`: feature engineering + dataset assembly.
- `training/train.py`: model training + artifact save.
- `training/evaluate.py`: metrics, plots, health checks.
- `artifacts/*`: trained model/scaler/reports/plots from latest run.

### snu_hacks
- `package.json`: Node metadata/scripts/dependencies.
- `.gitignore`: ignores `node_modules`, `.env`, `.DS_Store`.
- `README.md`: minimal placeholder.
- `app.js`: finance API entrypoint.
- `seed.js`: test scenario seeding script.
- `src/models/Payable.js`: payable schema.
- `src/routes/payableRoutes.js`: route map.
- `src/controllers/payableController.js`: CRUD + due-priority handling.
- `src/services/payableService.js`: recurrence/accumulation updater.
- `src/utils/scoring.js`: priority score and reason generation.

