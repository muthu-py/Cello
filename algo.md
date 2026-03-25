# Cello.Ops — Algorithm Reference

All deterministic algorithms used across the system. No ML/AI APIs — every score is reproducible and auditable.

---

## 1. Inventory Priority Scoring (`decisionEngine.js`)

### Purpose
Ranks medicines by restock urgency using a weighted multi-factor score (0–10).

### Inputs
| Input | Source |
|:---|:---|
| Medicine metadata | `medicines` collection (criticality, cost) |
| Current stock & expiry | `inventory` collection |
| Demand history (90 days) | `demand_history` collection |
| Supplier reliability | `suppliers` collection |
| Weight config | `engine_weights` collection |

### Step 1 — Global Demand Baseline
```
allAvgDemands = [avg daily demand of each medicine]
globalP95     = 95th percentile of allAvgDemands
```
This creates a stable, comparable baseline across all medicines.

### Step 2 — Per-Medicine Scoring (5 factors)

#### Factor A: Criticality Score
```
life_saving → 10
essential   → 6
general     → 3
```

#### Factor B: Stockout Risk (Continuous Quadratic Decay)
```
daysUntilStockout = currentStock / predictedDailyDemand
ratio             = clamp(daysUntilStockout / leadTimeDays, 0, 1)
stockoutScore     = 10 × (1 − ratio)²
```
The quadratic `(1 − ratio)²` creates a smooth curve — risk accelerates as stock approaches zero, eliminating score cliffs from discrete levels.

#### Factor C: Demand Urgency (Normalized to P95)
```
demandScore = clamp((avgDailyDemand / globalP95) × 10, 0, 10)
```

#### Factor D: Supplier Risk
```
reliability = supplier.reliability_score   // 0–1
if reliability < 0.5  → supplierScore = 9
if reliability < 0.7  → supplierScore = 6
if reliability < 0.85 → supplierScore = 3
else                   → supplierScore = 1
```

#### Factor E: Expiry Penalty (Criticality-Guarded)
```
expiryDays = inventory.expiry_date − now
if expiryDays ≤ 7   → rawExpiry = 10
if expiryDays ≤ 30  → rawExpiry = 6
if expiryDays ≤ 90  → rawExpiry = 3
else                 → rawExpiry = 0

// Cap protects life-saving medicines from over-penalization
cap = { life_saving: 2, essential: 4, general: 10 }
expiryScore = min(rawExpiry, cap[criticality])
```

### Step 3 — Weighted Combination
```
score = (criticalityScore × W₁)
      + (stockoutScore    × W₂)
      + (demandScore      × W₃)
      + (supplierScore    × W₅)
      − (expiryScore      × W₄)

where W = [0.30, 0.28, 0.18, 0.10, 0.14]  (sum = 1.0)
```

### Step 4 — Risk Classification
```
score ≥ 8   → CRITICAL
score ≥ 5   → HIGH
score ≥ 2.5 → MEDIUM
else        → LOW
```

### Step 5 — Flexibility Labeling
```
if criticality = "life_saving" AND (stock ≤ minSafe OR expiry ≤ 7 days):
    flexibility = "low"
else if score ≥ 7:
    flexibility = "medium"
else:
    flexibility = "high"
```

### Complexity
- Time: **O(M × H)** where M = medicines, H = history records per medicine
- Space: **O(M)** — one score object per medicine

---

## 2. Adaptive Weight Adjustment (`weightAdjuster.js`)

### Purpose
Auto-tunes the 5 scoring weights based on recent performance signals.

### Rules

| # | Trigger | Action |
|:--|:--------|:-------|
| 1 | High prediction error in life-saving medicines | ↑ demand weight +0.04 |
| 2 | Recurring stockout events (≥2 in 14 days) | ↑ stockout weight +0.05 |
| 3 | Expiry wastage detected (stock > 0 at expiry) | ↑ expiry weight +0.03 |
| 4 | Supplier failures (reliability < 0.5) | ↑ supplier weight +0.04 |

### Renormalization
```
if totalDelta > 0.01:
    newWeights = adjustedWeights / sum(adjustedWeights)   // re-normalize to 1.0
    save as new EngineWeight version
```

---

## 3. Finance Priority Scoring (`scoring.js` — snu_hacks)

### Purpose
Scores each payable (bill/debt) by payment urgency (0–10).

### Formula
```
score = (urgency       × 0.20)
      + (penalty       × 0.20)
      + (opsImpact     × 0.20)
      + (supplierDep   × 0.15)
      + (overdueBonus  × 0.10)
      + (accumRatio    × 0.10)
      − (flexPenalty   × 0.15)

score = clamp(score, 0, 10)
```

### Softmax Normalization (API output)
```
for each payable:
    softmax_score = e^(raw_score) / Σ e^(all raw_scores)

// Converts absolute scores to relative probabilities (0–1)
```

---

## 4. Integration Engine (`integrationEngine.js`)

### Purpose
Merges inventory priorities (0–10 scale) and finance payables (0–1 softmax) into a single unified queue.

### Step 1 — Score Normalization
```
inventory items:  score = priority_score / 10    → maps 0–10 to 0–1
payable items:    score = priority_score          → already 0–1 (softmax)
```

### Step 2 — Flexibility-Based Sorting Rules

```
RULE 1 — Both items have LOW flexibility:
    → Inventory wins (medical urgency > financial debt)
    
RULE 2 — Inventory is HIGH flex, Payable is MEDIUM or HIGH:
    → Payable wins (flexible stock can wait)
    
DEFAULT — Same flexibility tier:
    → Sort by normalized score descending
```

### Complexity
- Time: **O(N log N)** — dominated by the sort
- Space: **O(N)** — one unified object per item

---

## 5. Hybrid Payment Scheduler (`paymentScheduler.js`)

### Purpose
Assigns each payable to a specific calendar day based on predicted daily cash inflow.

### Inputs
```
payments:     [{ id, name, amount, priority_score, flexibility }]
dailyProfits: [2000, 1500, 3000, ...]    // predicted cash per day
initialCash:  0                           // starting balance
```

### Algorithm — 3-Phase Daily Loop

```
for each day in [0 .. N-1]:

    currentCash += dailyProfits[day]

    ┌─────────────────────────────────────────────┐
    │ PHASE 1 — LOW Payments (Full Only)          │
    │                                             │
    │ Sort LOW-flexibility payments by priority   │
    │ descending. For each:                       │
    │   if cash ≥ amount → pay in FULL            │
    │   else → skip (no partial for LOW)          │
    │                                             │
    │ Repeat until no more LOWs can be paid       │
    │ (greedy loop with re-check)                 │
    └─────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │ PHASE 2 — Guard                             │
    │                                             │
    │ if any LOW payment has amount ≤ cash:       │
    │   → SKIP Phase 3 (hold cash for LOW)        │
    │                                             │
    │ This prevents MED/HIGH from consuming cash  │
    │ that could complete a LOW payment.          │
    └─────────────────────────────────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────────────┐
    │ PHASE 3 — MED / HIGH Allocation             │
    │                                             │
    │ Sort remaining by flexibility then priority │
    │ For each:                                   │
    │   if cash ≥ amount → pay FULL               │
    │   else if cash > 0 → pay PARTIAL            │
    │                                             │
    │ Partial payments are ONLY allowed here      │
    └─────────────────────────────────────────────┘
```

### Key Invariants
| Rule | Guarantee |
|:-----|:----------|
| LOW = full only | LOW payments are never partially paid |
| LOW-first | LOW is always checked before MED/HIGH |
| Guard clause | MED/HIGH blocked if a LOW payment is affordable |
| No idle cash | If no LOW is affordable, cash flows to MED/HIGH |
| Cash ≥ 0 | Balance never goes negative |
| Deterministic | Same input always produces same output |

### Worked Example
```
Payments:  LOW = ₹3,000 (priority 0.9)
           MED = ₹5,000 (priority 0.5)

Daily Profits: [₹2,000, ₹2,000, ₹2,000, ₹2,000, ₹2,000]

Day 0: cash = ₹2,000
  Phase 1: LOW needs ₹3,000 → can't pay (skip)
  Phase 2: No LOW affordable → proceed
  Phase 3: MED gets ₹2,000 partial → MED remaining = ₹3,000
  
Day 1: cash = ₹2,000
  Phase 1: LOW needs ₹3,000 → can't pay
  Phase 3: MED gets ₹2,000 partial → MED remaining = ₹1,000

Day 2: cash = ₹2,000
  Phase 1: LOW needs ₹3,000 → can't pay
  Phase 3: MED gets ₹1,000 full → MED DONE, cash left = ₹1,000

Day 3: cash = ₹1,000 + ₹2,000 = ₹3,000
  Phase 1: LOW needs ₹3,000 → ✅ FULL PAYMENT → LOW DONE

Day 4: cash = ₹2,000 → no payments left → surplus
```

### Complexity
- Time: **O(D × P)** where D = days, P = payments
- Space: **O(P)** — mutates a copy of the payment list

---

## 6. Demand Prediction (`demandPredictor.js`)

### Purpose
Predicts daily demand for each medicine using statistical methods (no ML model).

### Algorithm
```
history = last 30 demand records for medicine

if records < 7:
    return fallback defaults by criticality

// Weighted Moving Average (recent days weighted higher)
weights = [1, 1, 1, ..., 2, 2, 3, 3, 4, 5]  // last 5 days get higher weight
wma     = Σ(demand[i] × weight[i]) / Σ(weight[i])

// Day-of-Week Adjustment
dowFactor = avg demand on target weekday / overall avg demand

// Monthly Spike (first 5 days of month get +10%)
monthFactor = isFirst5Days ? 1.10 : 1.00

predicted = wma × dowFactor × monthFactor

// Confidence from Coefficient of Variation
cv = stddev(demands) / mean(demands)
confidence = cv < 0.3 ? "high" : cv < 0.6 ? "medium" : "low"
```

---

## 7. Recurrence Accumulation Engine (`payableService.js` — snu_hacks)

### Purpose
Simulates time progression for recurring payments, accumulating debt.

### Algorithm
```
for each unpaid payable:
    elapsed = now - last_updated_time (in minutes)
    remaining_minutes -= elapsed

    if is_recurring AND interval > 0:
        while remaining_minutes ≤ 0:
            accumulated_amount += base_amount    // debt grows each cycle
            remaining_minutes  += interval       // reset timer
        status = remaining_minutes ≤ 0 ? "overdue" : "pending"
    else:
        status = remaining_minutes ≤ 0 ? "overdue" : "pending"
```

---

## Algorithm Relationship Map

```
┌──────────────────┐     ┌──────────────────┐
│  Decision Engine │     │  Finance Scoring  │
│  (inventory)     │     │  (payables)       │
│  Score: 0–10     │     │  Score: 0–1       │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         │    ┌───────────────┐   │
         └───►│  Integration  │◄──┘
              │  Engine       │
              │  Normalize +  │
              │  Flex Rules   │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │   Payment     │
              │   Scheduler   │
              │   3-Phase     │
              │   Daily Loop  │
              └───────────────┘
```

Each algorithm feeds into the next. The system is fully deterministic — given the same database state and timestamp, every output is identical.
