"""
Model evaluation module.
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from pathlib import Path
import logging

from config import ARTIFACTS_DIR

logger = logging.getLogger(__name__)

def evaluate_model(model, scaler, X_test, y_test, X_train, y_train) -> dict:
    """
    Evaluate trained model.
    """
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    
    mae = mean_absolute_error(y_test, y_pred_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    
    # MAPE handling y=0 safely
    y_test_safe = np.maximum(y_test, 1e-5)
    mape = np.mean(np.abs((y_test - y_pred_test) / y_test_safe)) * 100
    
    print(f"Train R² : {train_r2:.3f}")
    print(f"Test R²  : {test_r2:.3f}")
    print(f"MAE      : {mae:.2f}")
    print(f"RMSE     : {rmse:.2f}")
    print(f"MAPE     : {mape:.2f}%")
    
    importances = model.feature_importances_
    feat_imp = pd.DataFrame({
        'feature': X_train.columns,
        'importance': importances
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Feature Importances:")
    print(feat_imp.head(10).to_string(index=False))
    
    artifacts_path = Path(ARTIFACTS_DIR)
    artifacts_path.mkdir(parents=True, exist_ok=True)
    
    # Plot 1: Actual vs Predicted
    plt.figure(figsize=(10, 6))
    plt.scatter(y_test, y_pred_test, alpha=0.5, color='blue')
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Actual Quantity')
    plt.ylabel('Predicted Quantity')
    plt.title('Actual vs Predicted Demand')
    plt.grid(True, alpha=0.3)
    plt.savefig(artifacts_path / "actual_vs_predicted.png")
    plt.close()
    
    # Plot 2: Feature Importance
    top_feats = feat_imp.head(10).sort_values('importance', ascending=True)
    plt.figure(figsize=(10, 6))
    plt.barh(top_feats['feature'], top_feats['importance'], color='teal')
    plt.xlabel('Importance Score')
    plt.title('Top 10 Feature Importances')
    plt.grid(True, axis='x', alpha=0.3)
    plt.tight_layout()
    plt.savefig(artifacts_path / "feature_importance.png")
    plt.close()
    
    # Build report dict
    report = {
        "timestamp": pd.Timestamp.utcnow().isoformat(),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "metrics": {
            "train_r2": float(train_r2),
            "test_r2": float(test_r2),
            "mae": float(mae),
            "rmse": float(rmse),
            "mape": float(mape)
        },
        "feature_importances_top10": feat_imp.head(10).to_dict('records')
    }
    
    return report

def check_model_health(metrics: dict) -> bool:
    """
    Fail-fast checks for model quality.
    """
    passed = True
    m = metrics["metrics"]
    
    if m["test_r2"] <= 0.60:
        print(f"WARNING: Test R² is too low ({m['test_r2']:.3f} <= 0.60)")
        passed = False
        
    if m["mae"] >= 20.0:
        print(f"WARNING: MAE is too high ({m['mae']:.2f} >= 20.0)")
        passed = False
        
    if m["mape"] >= 35.0:
        print(f"WARNING: MAPE is too high ({m['mape']:.2f}% >= 35.0%)")
        passed = False
        
    if passed:
        print("✓ Model health checks passed")
        
    return passed
