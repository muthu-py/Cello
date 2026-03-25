"""
Model training module.
"""
import os
import json
import joblib
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
import logging

from config import ARTIFACTS_DIR

logger = logging.getLogger(__name__)

def train_model(X: pd.DataFrame, y: pd.Series, config: dict):
    """
    Train model pipeline.
    """
    # 1. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=config.get("test_size", 0.2), 
        shuffle=True, 
        random_state=config.get("random_state", 42)
    )
    
    # 2. Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    X_train_scaled = pd.DataFrame(X_train_scaled, columns=X_train.columns)
    X_test_scaled = pd.DataFrame(X_test_scaled, columns=X_test.columns)
    
    # 3. Train RandomForestRegressor
    model = RandomForestRegressor(
        n_estimators=config.get("n_estimators", 200),
        max_depth=config.get("max_depth", 10),
        min_samples_leaf=config.get("min_samples_leaf", 5),
        random_state=config.get("random_state", 42)
    )
    
    model.fit(X_train_scaled, y_train)
    
    return model, X_test_scaled, y_test, X_train_scaled, y_train, scaler

def save_artifacts(model, scaler, feature_columns: list, report: dict):
    """
    Save artifacts to disk.
    """
    artifacts_path = Path(ARTIFACTS_DIR)
    artifacts_path.mkdir(parents=True, exist_ok=True)
    
    # Save model
    joblib.dump(model, artifacts_path / "demand_model.pkl")
    
    # Save scaler
    joblib.dump(scaler, artifacts_path / "scaler.pkl")
    
    # Save feature columns
    with open(artifacts_path / "feature_columns.json", "w") as f:
        json.dump(feature_columns, f, indent=4)
        
    # Save report
    with open(artifacts_path / "training_report.json", "w") as f:
        json.dump(report, f, indent=4)
        
    print("✓ All artifacts saved to artifacts/")
