import logging
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from app.config import settings

logger = logging.getLogger("performance_service")

# Machine learning feature definitions
FEATURE_COLUMNS = [
    "avg_exam_pct",
    "min_exam_pct",
    "max_exam_pct",
    "total_exams_taken",
    "failed_exams_count",
    "failed_exams_ratio",
    "attendance_pct",
    "has_attendance_data",
    "current_semester",
]


def extract_student_features(
    student: Dict[str, Any],
    examinations: List[Dict[str, Any]],
    attendance: List[Dict[str, Any]],
) -> Dict[str, float]:
    """
    Constructs an anonymized, objective feature vector for a student.
    Does NOT use names, emails, roll numbers, or IDs as features.
    """
    # 1. Examination marks and percentages
    valid_exams = [
        e for e in examinations
        if e.get("marks_obtained") is not None
        and e.get("max_marks") is not None
        and float(e.get("max_marks", 0)) > 0
    ]

    percentages = [
        (float(e["marks_obtained"]) / float(e["max_marks"])) * 100.0
        for e in valid_exams
    ]

    if percentages:
        avg_exam_pct = float(np.mean(percentages))
        min_exam_pct = float(np.min(percentages))
        max_exam_pct = float(np.max(percentages))
        total_exams = len(percentages)

        # Count failed exams based on official 'Fail' result or percentage < 40%
        failed_count = sum(
            1 for e in valid_exams
            if str(e.get("result", "")).lower() == "fail"
            or (float(e["marks_obtained"]) / float(e["max_marks"])) < 0.40
        )
        failed_ratio = failed_count / total_exams
    else:
        avg_exam_pct = 0.0
        min_exam_pct = 0.0
        max_exam_pct = 0.0
        total_exams = 0
        failed_count = 0
        failed_ratio = 0.0

    # 2. Attendance percentage
    if attendance:
        present_count = sum(
            1 for a in attendance
            if str(a.get("status", "")).lower() == "present"
        )
        attendance_pct = (present_count / len(attendance)) * 100.0
        has_attendance = 1.0
    else:
        attendance_pct = 75.0  # neutral imputation when no attendance records exist
        has_attendance = 0.0

    # 3. Academic progress
    current_semester = float(student.get("current_semester") or 1)

    return {
        "avg_exam_pct": round(avg_exam_pct, 2),
        "min_exam_pct": round(min_exam_pct, 2),
        "max_exam_pct": round(max_exam_pct, 2),
        "total_exams_taken": float(total_exams),
        "failed_exams_count": float(failed_count),
        "failed_exams_ratio": round(failed_ratio, 3),
        "attendance_pct": round(attendance_pct, 2),
        "has_attendance_data": has_attendance,
        "current_semester": current_semester,
    }


def prepare_training_dataframe(
    examinations: List[Dict[str, Any]],
    students: List[Dict[str, Any]],
    attendance: List[Dict[str, Any]],
    at_risk_threshold: float = 50.0,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Aggregates student records into a tabular training dataset.
    Target variable: at_risk (1 = At Risk, 0 = Satisfactory).
    A student is classified as at_risk if:
      - Average exam percentage < at_risk_threshold (default 50%), OR
      - Has 2 or more failed examinations.

    Returns: (X, y, groups) where groups is student_id for leakage-free GroupKFold.
    """
    # Group examinations and attendance by student_id
    exams_by_student: Dict[str, List[Dict[str, Any]]] = {}
    for exam in examinations:
        sid = exam.get("student_id")
        if sid:
            exams_by_student.setdefault(sid, []).append(exam)

    attendance_by_student: Dict[str, List[Dict[str, Any]]] = {}
    for att in attendance:
        sid = att.get("student_id")
        if sid:
            attendance_by_student.setdefault(sid, []).append(att)

    rows = []
    targets = []
    groups = []

    for student in students:
        sid = student.get("student_id")
        if not sid:
            continue

        s_exams = exams_by_student.get(sid, [])
        # Only students with at least 1 recorded exam can be genuinely labeled
        valid_exams = [
            e for e in s_exams
            if e.get("marks_obtained") is not None
            and e.get("max_marks") is not None
            and float(e.get("max_marks", 0)) > 0
        ]

        if not valid_exams:
            continue

        s_att = attendance_by_student.get(sid, [])
        features = extract_student_features(student, s_exams, s_att)

        # Target label definition
        avg_pct = features["avg_exam_pct"]
        failed_count = features["failed_exams_count"]

        # Meaningful academic target:
        # 1 = At Risk (low performance or failed examinations)
        # 0 = Satisfactory
        is_at_risk = int(avg_pct < at_risk_threshold or failed_count >= 1)

        rows.append(features)
        targets.append(is_at_risk)
        groups.append(sid)

    if not rows:
        return pd.DataFrame(), pd.Series(dtype=int), pd.Series(dtype=str)

    df_x = pd.DataFrame(rows)[FEATURE_COLUMNS]
    df_y = pd.Series(targets, name="at_risk")
    df_groups = pd.Series(groups, name="student_id")

    return df_x, df_y, df_groups


def rule_based_fallback_predict(
    features: Dict[str, float],
    threshold: float = 50.0,
) -> Dict[str, Any]:
    """
    Transparent rule-based fallback when no trained model is available.
    Never claims to be a machine learning prediction.
    """
    avg = features.get("avg_exam_pct", 0.0)
    failed = features.get("failed_exams_count", 0.0)
    att = features.get("attendance_pct", 100.0)
    has_att = features.get("has_attendance_data", 0.0)

    factors = []
    if avg < threshold:
        factors.append(f"Average exam marks ({avg:.1f}%) is below the {threshold}% threshold.")
    if failed > 0:
        factors.append(f"Recorded {int(failed)} failed examination(s).")
    if has_att and att < 75.0:
        factors.append(f"Attendance ({att:.1f}%) is below recommended 75%.")

    if avg < threshold or failed >= 2:
        risk_category = "High Risk"
        risk_prob = 0.85
    elif avg < threshold + 10 or failed == 1:
        risk_category = "Moderate Risk"
        risk_prob = 0.50
    else:
        risk_category = "Low Risk"
        risk_prob = 0.15
        if not factors:
            factors.append("Consistent performance across recorded examinations.")

    return {
        "predicted_risk": risk_category,
        "risk_probability": risk_prob,
        "confidence_score": 0.70,
        "is_model_prediction": False,
        "contributing_factors": factors,
    }
