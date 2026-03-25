"""
Main entry point for ML Training Pipeline.
"""
import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

from config import ML_CONFIG

def main():
    load_dotenv()
    
    print("=== Inventory Intelligence — ML Training Pipeline ===")
    
    print("\n→ Simulating purchase logs...")
    from data.simulate import run_simulation
    run_simulation()
    print("✓ Simulation complete")
    
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "inventory_intelligence")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    try:
        print("\n→ Engineering features...")
        from features.engineer import build_training_dataset
        X, y, feature_columns = build_training_dataset(db)
        
        print(f"  Shape of X: {X.shape}")
        print(f"  Distribution of y:")
        print(f"    Min:  {y.min():.2f}")
        print(f"    Max:  {y.max():.2f}")
        print(f"    Mean: {y.mean():.2f}")
        print(f"    Std:  {y.std():.2f}")
        
        print("\n→ Training RandomForest model...")
        from training.train import train_model, save_artifacts
        model, X_test, y_test, X_train, y_train, scaler = train_model(X, y, ML_CONFIG)
        
        print("\n→ Evaluating model...")
        from training.evaluate import evaluate_model, check_model_health
        report = evaluate_model(model, scaler, X_test, y_test, X_train, y_train)
        healthy = check_model_health(report)
        
        print("\n→ Saving artifacts...")
        save_artifacts(model, scaler, feature_columns, report)
        
        print("\n┌────────────────────────────────────┐")
        print("│  Training complete                 │")
        print(f"│  Total samples    : {len(X):<14} │")
        print(f"│  Test R²          : {report['metrics']['test_r2']:<14.3f} │")
        print(f"│  MAE              : {report['metrics']['mae']:<14.2f} │")
        health_mark = '✓' if healthy else '✗'
        print(f"│  Model healthy    : {health_mark:<14} │")
        print("└────────────────────────────────────┘")
        
    finally:
        client.close()

if __name__ == "__main__":
    main()
