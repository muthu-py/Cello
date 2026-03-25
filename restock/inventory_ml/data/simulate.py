"""
Data simulator for inventory purchase logs.
"""
import os
import random
import uuid
from datetime import datetime, timedelta
import numpy as np
from pymongo import MongoClient
import logging

from config import (
    SIMULATION_DAYS, MEDICINES, SEASON_MONTHS, CATEGORY_SEASON_MULTIPLIERS,
    DAY_OF_WEEK_MULTIPLIER, HOUR_MULTIPLIER, NOISE_FACTOR, SPIKE_PROBABILITY,
    SPIKE_MULTIPLIER_RANGE, EMERGENCY_PURCHASE_PROBABILITY, SUPPLIERS
)

logger = logging.getLogger(__name__)

def get_season_tag(month: int) -> str:
    """Determine the season from config.SEASON_MONTHS"""
    for season, months in SEASON_MONTHS.items():
        if month in months:
            return season
    return "normal"

def get_seasonal_multiplier(category: str, season_tag: str) -> float:
    """Look up from config.CATEGORY_SEASON_MULTIPLIERS"""
    return CATEGORY_SEASON_MULTIPLIERS.get(category, {}).get(season_tag, 1.0)

def simulate_daily_demand(medicine: dict, date: datetime) -> float:
    """Compute simulated demand for one medicine on one date."""
    demand = medicine["base_daily_demand"]
    season_tag = get_season_tag(date.month)
    demand *= get_seasonal_multiplier(medicine["category"], season_tag)
    demand *= DAY_OF_WEEK_MULTIPLIER.get(date.weekday(), 1.0)
    demand *= (1 + np.random.normal(0, NOISE_FACTOR))
    if random.random() < SPIKE_PROBABILITY:
        demand *= random.uniform(*SPIKE_MULTIPLIER_RANGE)
    demand = max(0.5, demand)
    return round(demand, 2)

def generate_hourly_purchase(medicine: dict, date: datetime, daily_demand: float, 
                             suppliers: list, current_stock: float) -> dict:
    """Generate a single hourly purchase log."""
    hours = list(HOUR_MULTIPLIER.keys())
    weights = list(HOUR_MULTIPLIER.values())
    hour = random.choices(hours, weights=weights, k=1)[0]
    
    qty = max(medicine.get("min_order_qty", 1), daily_demand * HOUR_MULTIPLIER[hour])
    quantity = int(np.ceil(qty))
    
    supplier = random.choice(suppliers)
    is_emergency = random.random() < EMERGENCY_PURCHASE_PROBABILITY
    
    cost_per_unit = medicine["cost_per_unit"] * (1 + random.uniform(-0.05, 0.10))
    total_cost = cost_per_unit * quantity
    
    purchased_at = datetime(date.year, date.month, date.day, hour, 
                            random.randint(0, 59), random.randint(0, 59))
    
    stock_before = max(0.0, current_stock)
    stock_after = stock_before + quantity
    
    return {
        "_id": f"PUR{uuid.uuid4().hex[:8].upper()}",
        "medicine_id": medicine["id"],
        "quantity": quantity,
        "cost_per_unit": round(cost_per_unit, 2),
        "total_cost": round(total_cost, 2),
        "supplier_id": supplier["id"],
        "purchased_at": purchased_at,
        "day_of_week": date.weekday(),
        "hour_of_day": hour,
        "month": date.month,
        "season_tag": get_season_tag(date.month),
        "is_emergency_purchase": is_emergency,
        "stock_before_purchase": round(stock_before, 2),
        "stock_after_purchase": round(stock_after, 2)
    }

def run_simulation():
    """Main simulation driver."""
    np.random.seed(42)
    random.seed(42)
    
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "inventory_intelligence")
    
    with MongoClient(mongo_uri) as client:
        db = client[db_name]
        
        # Drop and recreate collections
        db.medicines.drop()
        db.inventory.drop()
        db.suppliers.drop()
        db.purchase_logs.drop()
        
        db.medicines.insert_many(MEDICINES)
        db.suppliers.insert_many(SUPPLIERS)
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = today - timedelta(days=SIMULATION_DAYS)
        
        total_logs = 0
        medicine_counts = {}
        batch = []
        
        for medicine in MEDICINES:
            current_stock = 50.0 * medicine["base_daily_demand"]
            logs_count = 0
            
            for day_offset in range(SIMULATION_DAYS):
                current_date = start_date + timedelta(days=day_offset)
                daily_demand = simulate_daily_demand(medicine, current_date)
                
                # Subtract daily demand
                current_stock -= daily_demand
                current_stock = max(0.0, current_stock)
                
                # Check for events
                if current_date.weekday() < 6:
                    num_events = random.randint(1, 3)
                else:
                    num_events = 1 if random.random() < 0.3 else 0
                    
                daily_events = []
                for _ in range(num_events):
                    log = generate_hourly_purchase(medicine, current_date, daily_demand, SUPPLIERS, current_stock)
                    current_stock = log["stock_after_purchase"]
                    daily_events.append(log)
                    
                batch.extend(daily_events)
                logs_count += len(daily_events)
            
            if logs_count < 5:
                logger.warning(f"Medicine {medicine['id']} has < 5 purchase events!")
                
            medicine_counts[medicine["id"]] = logs_count
            
            expiry_date = today + timedelta(days=random.randint(30, 180))
            db.inventory.insert_one({
                "medicine_id": medicine["id"],
                "current_stock": round(current_stock, 2),
                "expiry_date": expiry_date,
                "expiry_days": (expiry_date - today).days,
                "safety_stock": medicine["base_daily_demand"] * 7,
                "last_restocked_at": batch[-1]["purchased_at"] if logs_count > 0 else today
            })
            
        if batch:
            db.purchase_logs.insert_many(batch)
            
        print(f"Simulation complete: inserted {len(batch)} logs.")
        for mid, cnt in medicine_counts.items():
            print(f"  {mid}: {cnt} events")

if __name__ == "__main__":
    run_simulation()
