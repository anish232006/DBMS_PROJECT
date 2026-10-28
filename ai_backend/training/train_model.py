"""
Standalone Training Pipeline for XGBoost Student Performance Prediction.
Can be executed directly from terminal:
    python training/train_model.py
"""

import sys
import logging
from pathlib import Path

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import settings
from app.services.supabase_service import supabase_service
from app.services.performance_service import prepare_training_dataframe
from app.services.xgboost_service import xgboost_service, InsufficientDataException

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_model")


def run_training_pipeline(force: bool = False):
    print("=" * 65)
    print("  UniVerse AI - XGBoost Student Performance Training Pipeline")
    print("=" * 65)
    print(f"Target Threshold: Student Exam Average < {settings.AT_RISK_THRESHOLD}%")
    print(f"Model Storage Path: {settings.MODEL_DIR}")
    print("-" * 65)

    # 1. Fetch data from Supabase
    print("[1/4] Fetching genuine historical records from Supabase...")
    db_data = supabase_service.fetch_training_dataset()

    if not db_data.get("success"):
        print(f"[!] Failed to fetch database records: {db_data.get('error')}")
        print("Note: Please verify SUPABASE_URL and SUPABASE_KEY in your configuration.")
        return False

    exams = db_data.get("examinations", [])
    students = db_data.get("students", [])
    attendance = db_data.get("attendance", [])

    print(f"      Retrieved {len(students)} students, {len(exams)} exam records, {len(attendance)} attendance entries.")

    if not exams or not students:
        print("[!] Incomplete historical dataset: Both student records and exam results are required.")
        return False

    # 2. Build dataset and check leakage
    print("[2/4] Constructing feature matrix and risk targets...")
    df_x, df_y, groups = prepare_training_dataframe(
        examinations=exams,
        students=students,
        attendance=attendance,
        at_risk_threshold=settings.AT_RISK_THRESHOLD,
    )

    n_samples = len(df_x)
    print(f"      Valid labeled student samples: {n_samples}")

    if n_samples == 0:
        print("[!] No students found with completed examination marks.")
        return False

    class_distribution = df_y.value_counts().to_dict()
    print(f"      Class distribution (0=Satisfactory, 1=At-Risk): {class_distribution}")

    # 3. Train XGBoost model
    print("[3/4] Training XGBClassifier with Group-Shuffle Leakage Prevention...")
    try:
        result = xgboost_service.train(
            df_x=df_x,
            df_y=df_y,
            groups=groups,
            test_size=0.25,
            random_state=42,
            at_risk_threshold=settings.AT_RISK_THRESHOLD,
        )
    except InsufficientDataException as e:
        print(f"[!] Training halted gracefully: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Training error: {e}")
        return False

    # 4. Report evaluation metrics
    print("[4/4] Model Evaluation Metrics on Held-out Validation Split:")
    metrics = result["metrics"]
    print(f"      Accuracy:  {metrics['accuracy'] * 100:.2f}%")
    print(f"      Precision: {metrics['precision'] * 100:.2f}%")
    print(f"      Recall:    {metrics['recall'] * 100:.2f}%")
    print(f"      F1-Score:  {metrics['f1_score'] * 100:.2f}%")
    print(f"      Train Samples: {metrics['train_samples']} | Test Samples: {metrics['test_samples']}")
    print(f"      Confusion Matrix:\n        {metrics['confusion_matrix']}")
    print("\n      Top Feature Importances:")
    for feat, imp in sorted(metrics['feature_importances'].items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"        - {feat:22s}: {imp:.4f}")

    print("-" * 65)
    print(f"[SUCCESS] Model saved successfully as version: {result['model_version']}")
    print("=" * 65)
    return True


if __name__ == "__main__":
    success = run_training_pipeline()
    sys.exit(0 if success else 1)
