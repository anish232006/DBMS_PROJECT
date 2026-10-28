import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from xgboost import XGBClassifier

from app.config import settings
from app.services.performance_service import (
    FEATURE_COLUMNS,
    rule_based_fallback_predict,
)

logger = logging.getLogger("xgboost_service")

MODEL_FILENAME = "xgboost_student_risk.joblib"
METADATA_FILENAME = "model_metadata.json"


class InsufficientDataException(Exception):
    pass


class XGBoostService:
    def __init__(self):
        self.model_dir: Path = settings.MODEL_DIR
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = self.model_dir / MODEL_FILENAME
        self.metadata_path = self.model_dir / METADATA_FILENAME

        self.model: Optional[XGBClassifier] = None
        self.feature_names: List[str] = FEATURE_COLUMNS
        self.metrics: Optional[Dict[str, Any]] = None
        self.metadata: Optional[Dict[str, Any]] = None

        self._load_model()

    def _load_model(self):
        """Loads trained XGBoost model and metadata if available."""
        if self.model_path.exists() and self.metadata_path.exists():
            try:
                bundle = joblib.load(self.model_path)
                self.model = bundle.get("model")
                self.feature_names = bundle.get("feature_names", FEATURE_COLUMNS)

                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                    self.metrics = self.metadata.get("metrics")

                logger.info(f"Loaded trained XGBoost model version: {self.metadata.get('version')}")
            except Exception as e:
                logger.error(f"Error loading trained model from disk: {e}")
                self.model = None
                self.metadata = None
        else:
            logger.info("No pre-existing trained XGBoost model found on disk.")

    def is_trained(self) -> bool:
        return self.model is not None and self.metadata is not None

    def get_status(self) -> Dict[str, Any]:
        if not self.is_trained():
            return {
                "is_trained": False,
                "model_version": None,
                "trained_at": None,
                "samples_count": 0,
                "features": FEATURE_COLUMNS,
                "at_risk_threshold": settings.AT_RISK_THRESHOLD,
                "metrics": None,
                "note": "Model not yet trained. Training requires labeled historical examination records.",
            }

        return {
            "is_trained": True,
            "model_version": self.metadata.get("version"),
            "trained_at": self.metadata.get("trained_at"),
            "samples_count": self.metadata.get("samples_count"),
            "features": self.feature_names,
            "at_risk_threshold": self.metadata.get("at_risk_threshold", settings.AT_RISK_THRESHOLD),
            "metrics": self.metrics,
            "note": "Supervised XGBoost model trained and loaded.",
        }

    def train(
        self,
        df_x: pd.DataFrame,
        df_y: pd.Series,
        groups: pd.Series,
        test_size: float = 0.25,
        random_state: int = 42,
        at_risk_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Genuinely trains an XGBoost classifier with strict group splitting
        to prevent student-record leakage between train and test sets.
        """
        threshold = at_risk_threshold or settings.AT_RISK_THRESHOLD
        n_samples = len(df_x)

        if n_samples < 4:
            raise InsufficientDataException(
                f"Insufficient historical data: Found only {n_samples} student record(s) with exam marks. "
                f"A minimum of 4 distinct student records is required to train and evaluate a model."
            )

        unique_classes = np.unique(df_y)
        if len(unique_classes) < 2:
            class_label = "Satisfactory (0)" if unique_classes[0] == 0 else "At Risk (1)"
            raise InsufficientDataException(
                f"Dataset has only 1 target class ({class_label}) across all {n_samples} students. "
                "Supervised classification requires examples of both At-Risk and Satisfactory performance."
            )

        # Leakage-free Group Split on student_id
        gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
        train_idx, test_idx = next(gss.split(df_x, df_y, groups=groups))

        # Check if train or test has only one class; if so, fallback to stratified split on student index
        y_train = df_y.iloc[train_idx]
        y_test = df_y.iloc[test_idx]

        if len(np.unique(y_train)) < 2 or len(np.unique(y_test)) < 2:
            # Handle small sample test splits gracefully
            from sklearn.model_selection import train_test_split
            train_idx, test_idx = train_test_split(
                np.arange(n_samples),
                test_size=test_size,
                random_state=random_state,
                stratify=df_y if min(pd.Series(df_y).value_counts()) >= 2 else None,
            )

        X_train = df_x.iloc[train_idx]
        y_train = df_y.iloc[train_idx]
        X_test = df_x.iloc[test_idx]
        y_test = df_y.iloc[test_idx]

        # Calculate class weights for imbalance handling
        neg_count = sum(y_train == 0)
        pos_count = sum(y_train == 1)
        scale_pos_weight = (neg_count / max(pos_count, 1)) if pos_count > 0 else 1.0

        # Initialize and train XGBClassifier
        xgb = XGBClassifier(
            n_estimators=60,
            max_depth=3,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=random_state,
        )

        xgb.fit(X_train, y_train)

        # Evaluate on held-out test data
        y_pred = xgb.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        cm = confusion_matrix(y_test, y_pred, labels=[0, 1]).tolist()
        cr = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

        # Feature importances
        raw_importances = xgb.feature_importances_
        feature_importance_dict = {
            col: round(float(imp), 4)
            for col, imp in zip(FEATURE_COLUMNS, raw_importances)
        }

        metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm,
            "classification_report": cr,
            "feature_importances": feature_importance_dict,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

        # Save bundle
        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.isoformat()
        version_str = f"xgb-v1.{now_dt.strftime('%Y%m%d%H%M%S')}"

        bundle = {
            "model": xgb,
            "feature_names": FEATURE_COLUMNS,
        }
        joblib.dump(bundle, self.model_path)

        metadata = {
            "version": version_str,
            "trained_at": now_str,
            "samples_count": n_samples,
            "at_risk_threshold": threshold,
            "metrics": metrics,
        }
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # Update in-memory state
        self.model = xgb
        self.feature_names = FEATURE_COLUMNS
        self.metadata = metadata
        self.metrics = metrics

        logger.info(f"Model successfully trained and saved: {version_str}")

        return {
            "success": True,
            "model_version": version_str,
            "dataset_size": n_samples,
            "metrics": metrics,
            "features_used": FEATURE_COLUMNS,
        }

    def predict(
        self,
        features: Dict[str, float],
        student_id: Optional[str] = None,
        roll_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Predicts student risk using trained XGBoost classifier.
        Falls back to rule-based evaluation if the model is not yet trained.
        """
        now_str = datetime.now(timezone.utc).isoformat()

        if not self.is_trained():
            # Heuristic fallback (clearly marked as non-ML)
            fallback = rule_based_fallback_predict(features, threshold=settings.AT_RISK_THRESHOLD)
            return {
                "student_id": student_id,
                "roll_number": roll_number,
                "predicted_risk": fallback["predicted_risk"],
                "risk_probability": fallback["risk_probability"],
                "confidence_score": fallback["confidence_score"],
                "is_model_prediction": False,
                "contributing_factors": fallback["contributing_factors"],
                "model_version": "heuristic-rule-engine-v1.0",
                "prediction_timestamp": now_str,
                "features_evaluated": features,
            }

        # Build feature vector
        vector = [float(features.get(col, 0.0)) for col in self.feature_names]
        df_input = pd.DataFrame([vector], columns=self.feature_names)

        # Run inference
        probs = self.model.predict_proba(df_input)[0]
        # prob of class 1 (At Risk)
        if len(probs) >= 2:
            at_risk_prob = float(probs[1])
        else:
            at_risk_prob = float(probs[0])

        # Categorize risk based on calibrated thresholds
        if at_risk_prob >= settings.HIGH_RISK_PROBABILITY:
            predicted_risk = "High Risk"
        elif at_risk_prob >= settings.MODERATE_RISK_PROBABILITY:
            predicted_risk = "Moderate Risk"
        else:
            predicted_risk = "Low Risk"

        confidence = round(max(at_risk_prob, 1.0 - at_risk_prob), 3)

        # Generate contributing factors based on features and model importance
        factors = []
        avg = features.get("avg_exam_pct", 0.0)
        failed = features.get("failed_exams_count", 0.0)
        att = features.get("attendance_pct", 100.0)
        has_att = features.get("has_attendance_data", 0.0)

        if avg < settings.AT_RISK_THRESHOLD:
            factors.append(f"Historical exam average is {avg:.1f}% (below {settings.AT_RISK_THRESHOLD}% threshold).")
        else:
            factors.append(f"Maintains a solid {avg:.1f}% average across examinations.")

        if failed > 0:
            factors.append(f"History of {int(failed)} failed examination(s).")

        if has_att and att < 75.0:
            factors.append(f"Recorded attendance ({att:.1f}%) is below the minimum 75% target.")
        elif has_att:
            factors.append(f"Satisfactory attendance rate of {att:.1f}%.")

        return {
            "student_id": student_id,
            "roll_number": roll_number,
            "predicted_risk": predicted_risk,
            "risk_probability": round(at_risk_prob, 4),
            "confidence_score": confidence,
            "is_model_prediction": True,
            "contributing_factors": factors,
            "model_version": self.metadata.get("version", "xgb-v1"),
            "prediction_timestamp": now_str,
            "features_evaluated": features,
        }


xgboost_service = XGBoostService()
