"""
Feature engineering module.
"""
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

def load_logs_for_medicine(db, medicine_id: str) -> pd.DataFrame:
    """
    Query purchase_logs where medicine_id matches.
    Sort by purchased_at ascending.
    """
    cursor = db.purchase_logs.find({"medicine_id": medicine_id}).sort("purchased_at", 1)
    logs = list(cursor)
    if len(logs) < 3:
        return pd.DataFrame()
    return pd.DataFrame(logs)

def engineer_features(df: pd.DataFrame, base_daily_demand: float) -> pd.DataFrame:
    """
    Engineer features for ML.
    """
    if df.empty:
        return df
        
    df = df.copy()
    
    # Time Features
    df['day_of_week'] = df['purchased_at'].dt.dayofweek
    df['hour_of_day'] = df['purchased_at'].dt.hour
    df['month'] = df['purchased_at'].dt.month
    df['week_of_year'] = df['purchased_at'].dt.isocalendar().week.astype(int)
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['quarter'] = df['purchased_at'].dt.quarter
    
    # Season Features
    season_map = {"normal": 0, "flu_season": 1, "monsoon": 2, "summer": 3}
    df['season_tag_encoded'] = df['season_tag'].map(season_map).fillna(0).astype(int)
    
    # Rolling Demand Features
    df_date = df.set_index('purchased_at')
    daily_sums = df_date.resample('D')['quantity'].sum().reset_index()
    daily_sums['date_only'] = daily_sums['purchased_at'].dt.normalize()
    daily_sums = daily_sums.sort_values('date_only')
    
    # Compute rolling on daily aggregates
    daily_sums['rolling_7d_demand'] = daily_sums['quantity'].rolling(window=7, min_periods=7).mean()
    daily_sums['rolling_30d_demand'] = daily_sums['quantity'].rolling(window=30, min_periods=30).mean()
    daily_sums['rolling_7d_std'] = daily_sums['quantity'].rolling(window=7, min_periods=7).std()
    daily_sums['lag_1d_demand'] = daily_sums['quantity'].shift(1)
    daily_sums['lag_7d_demand'] = daily_sums['quantity'].shift(7)
    
    # Trend Features
    num = daily_sums['rolling_7d_demand'] - daily_sums['rolling_30d_demand']
    den = daily_sums['rolling_30d_demand'] + 1e-5
    growth = num / den
    daily_sums['demand_growth_rate'] = growth.clip(-1, 1)
    
    # Merge back to original df based on date (day level)
    df['date_only'] = df['purchased_at'].dt.normalize()
    daily_sums_subset = daily_sums[['date_only', 'rolling_7d_demand', 'rolling_30d_demand', 
                                   'rolling_7d_std', 'lag_1d_demand', 'lag_7d_demand',
                                   'demand_growth_rate']]
                                   
    df = df.merge(daily_sums_subset, on='date_only', how='left')
    df = df.drop(columns=['date_only'])
    
    # Cleaning: Drop rows where rolling features are NaN (first 7 days)
    df = df.dropna(subset=['rolling_7d_demand'])
    
    # Fill remaining NaN with 0
    df = df.fillna(0)
    
    # Stock Features
    df['stock_ratio'] = df['stock_before_purchase'] / (base_daily_demand * 30.0 + 1e-5)
    
    # Contextual Features
    df['is_emergency_purchase'] = df['is_emergency_purchase'].astype(int)
    
    # Normalized cost per unit
    cost_mean = df['cost_per_unit'].mean()
    cost_std = df['cost_per_unit'].std()
    if np.isnan(cost_std) or cost_std == 0:
        df['cost_per_unit_zscore'] = 0.0
    else:
        df['cost_per_unit_zscore'] = (df['cost_per_unit'] - cost_mean) / cost_std
        
    # Clip all feature values
    feature_cols = [
        "day_of_week", "hour_of_day", "month", "week_of_year",
        "is_weekend", "quarter", "season_tag_encoded",
        "rolling_7d_demand", "rolling_30d_demand", "rolling_7d_std",
        "lag_1d_demand", "lag_7d_demand", "demand_growth_rate",
        "stock_before_purchase", "stock_ratio",
        "is_emergency_purchase", "cost_per_unit_zscore"
    ]
    for col in feature_cols:
        if col in df.columns:
            df[col] = df[col].clip(-10, 1000)
            
    return df

def build_training_dataset(db) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """
    Build dataset from all medicines.
    """
    medicines = list(db.medicines.find({}))
    if not medicines:
        raise ValueError("No medicines found in database!")
        
    categories = sorted(list(set([m['category'] for m in medicines])))
    criticalities = sorted(list(set([m['criticality'] for m in medicines])))
    
    cat_map = {c: i for i, c in enumerate(categories)}
    crit_map = {c: i for i, c in enumerate(criticalities)}
    
    all_dfs = []
    
    for medicine in medicines:
        df_raw = load_logs_for_medicine(db, medicine['id'])
        if df_raw.empty:
            continue
            
        df_feats = engineer_features(df_raw, medicine.get('base_daily_demand', 1.0))
        if df_feats.empty:
            continue
            
        df_feats['medicine_category_encoded'] = cat_map.get(medicine['category'], 0)
        df_feats['criticality_encoded'] = crit_map.get(medicine['criticality'], 0)
        
        all_dfs.append(df_feats)
        logger.info(f"Medicine {medicine['id']} contributed {len(df_feats)} rows.")
        
    if not all_dfs:
        raise ValueError("No valid rows generated for training!")
        
    final_df = pd.concat(all_dfs, ignore_index=True)
    
    feature_columns = [
        "day_of_week", "hour_of_day", "month", "week_of_year",
        "is_weekend", "quarter", "season_tag_encoded",
        "rolling_7d_demand", "rolling_30d_demand", "rolling_7d_std",
        "lag_1d_demand", "lag_7d_demand", "demand_growth_rate",
        "stock_before_purchase", "stock_ratio",
        "is_emergency_purchase", "cost_per_unit_zscore",
        "medicine_category_encoded", "criticality_encoded"
    ]
    
    X = final_df[feature_columns]
    y = final_df['quantity']
    
    return X, y, feature_columns
