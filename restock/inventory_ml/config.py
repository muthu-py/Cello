"""
Central configuration for Inventory Intelligence ML Pipeline.
"""

SIMULATION_DAYS = 60            # days of purchase history to generate

MEDICINES = [
    {"id": "MED001", "name": "Insulin", "category": "diabetes", "criticality": "life_saving", "cost_per_unit": 150.0, "unit": "vial", "base_daily_demand": 15.0},
    {"id": "MED002", "name": "Metformin", "category": "diabetes", "criticality": "essential", "cost_per_unit": 8.0, "unit": "tablet", "base_daily_demand": 25.0},
    {"id": "MED003", "name": "Atorvastatin", "category": "cardiac", "criticality": "essential", "cost_per_unit": 12.0, "unit": "tablet", "base_daily_demand": 18.0},
    {"id": "MED004", "name": "Amlodipine", "category": "cardiac", "criticality": "essential", "cost_per_unit": 6.0, "unit": "tablet", "base_daily_demand": 20.0},
    {"id": "MED005", "name": "Aspirin", "category": "cardiac", "criticality": "standard", "cost_per_unit": 2.0, "unit": "tablet", "base_daily_demand": 30.0},
    {"id": "MED006", "name": "Amoxicillin", "category": "antibiotic", "criticality": "essential", "cost_per_unit": 10.0, "unit": "capsule", "base_daily_demand": 22.0},
    {"id": "MED007", "name": "Azithromycin", "category": "antibiotic", "criticality": "essential", "cost_per_unit": 14.0, "unit": "tablet", "base_daily_demand": 12.0},
    {"id": "MED008", "name": "Ciprofloxacin", "category": "antibiotic", "criticality": "essential", "cost_per_unit": 18.0, "unit": "tablet", "base_daily_demand": 10.0},
    {"id": "MED009", "name": "Paracetamol", "category": "analgesic", "criticality": "standard", "cost_per_unit": 3.0, "unit": "tablet", "base_daily_demand": 50.0},
    {"id": "MED010", "name": "Ibuprofen", "category": "analgesic", "criticality": "standard", "cost_per_unit": 2.0, "unit": "tablet", "base_daily_demand": 35.0},
    {"id": "MED011", "name": "Omeprazole", "category": "standard", "criticality": "standard", "cost_per_unit": 5.0, "unit": "capsule", "base_daily_demand": 20.0},
    {"id": "MED012", "name": "Pantoprazole", "category": "standard", "criticality": "standard", "cost_per_unit": 4.5, "unit": "tablet", "base_daily_demand": 18.0},
    {"id": "MED013", "name": "Levothyroxine", "category": "neurological", "criticality": "essential", "cost_per_unit": 8.0, "unit": "tablet", "base_daily_demand": 15.0},
    {"id": "MED014", "name": "Amlodipine + Olmesartan", "category": "cardiac", "criticality": "essential", "cost_per_unit": 7.0, "unit": "tablet", "base_daily_demand": 10.0},
    {"id": "MED015", "name": "Salbutamol", "category": "respiratory", "criticality": "essential", "cost_per_unit": 9.0, "unit": "vial", "base_daily_demand": 8.0},
    {"id": "MED016", "name": "Montelukast", "category": "respiratory", "criticality": "standard", "cost_per_unit": 4.0, "unit": "tablet", "base_daily_demand": 12.0},
    {"id": "MED017", "name": "Glibenclamide", "category": "diabetes", "criticality": "essential", "cost_per_unit": 6.0, "unit": "tablet", "base_daily_demand": 16.0},
    {"id": "MED018", "name": "Morphine", "category": "emergency", "criticality": "life_saving", "cost_per_unit": 200.0, "unit": "vial", "base_daily_demand": 5.0},
    {"id": "MED019", "name": "Adrenaline", "category": "emergency", "criticality": "life_saving", "cost_per_unit": 250.0, "unit": "vial", "base_daily_demand": 3.0},
    {"id": "MED020", "name": "Ondansetron", "category": "standard", "criticality": "essential", "cost_per_unit": 22.0, "unit": "tablet", "base_daily_demand": 14.0},
]

SEASON_MONTHS = {
    "flu_season": [11, 12, 1, 2],
    "monsoon": [6, 7, 8, 9],
    "summer": [4, 5],
    "normal": [3, 10]
}

CATEGORY_SEASON_MULTIPLIERS = {
    "respiratory": {"flu_season": 1.8, "monsoon": 1.5, "summer": 0.9, "normal": 1.0},
    "antibiotic":  {"flu_season": 1.5, "monsoon": 1.4, "summer": 1.0, "normal": 1.0},
    "analgesic":   {"flu_season": 1.3, "monsoon": 1.1, "summer": 1.2, "normal": 1.0},
    "diabetes":    {"flu_season": 1.0, "monsoon": 1.0, "summer": 1.0, "normal": 1.0},
    "cardiac":     {"flu_season": 1.1, "monsoon": 1.0, "summer": 1.0, "normal": 1.0},
    "emergency":   {"flu_season": 1.2, "monsoon": 1.3, "summer": 1.0, "normal": 1.0},
    "neurological":{"flu_season": 1.0, "monsoon": 1.0, "summer": 1.0, "normal": 1.0},
    "standard":    {"flu_season": 1.0, "monsoon": 1.0, "summer": 1.0, "normal": 1.0},
}

DAY_OF_WEEK_MULTIPLIER = {
    0: 1.2,   # Monday — high
    1: 1.1,
    2: 1.0,
    3: 1.0,
    4: 1.1,
    5: 0.7,   # Saturday — low
    6: 0.5    # Sunday — very low
}

HOUR_MULTIPLIER = {
    9:  0.6, 10: 0.9, 11: 1.1,
    12: 1.0, 13: 0.7, 14: 1.2,
    15: 1.3, 16: 1.1, 17: 0.9,
    18: 0.6
}  # operating hours only

NOISE_FACTOR = 0.25             # ±25% gaussian noise on demand
SPIKE_PROBABILITY = 0.04        # 4% chance of a demand spike on any given day
SPIKE_MULTIPLIER_RANGE = (2.5, 5.0)
EMERGENCY_PURCHASE_PROBABILITY = 0.05

SUPPLIERS = [
    {"id": "SUP001", "name": "ABC Pharma",    "lead_time_days": 3,  "min_order_qty": 10, "reliability": 0.95},
    {"id": "SUP002", "name": "MedSupply Co",  "lead_time_days": 5,  "min_order_qty": 20, "reliability": 0.88},
    {"id": "SUP003", "name": "QuickMeds",     "lead_time_days": 1,  "min_order_qty": 5,  "reliability": 0.80},
    {"id": "SUP004", "name": "PharmaHub",     "lead_time_days": 7,  "min_order_qty": 50, "reliability": 0.92},
    {"id": "SUP005", "name": "Generic World", "lead_time_days": 10, "min_order_qty": 100,"reliability": 0.75},
]

ML_CONFIG = {
    "test_size": 0.2,
    "random_state": 42,
    "n_estimators": 200,
    "max_depth": 10,
    "min_samples_leaf": 5,
}

ARTIFACTS_DIR = "artifacts/"
