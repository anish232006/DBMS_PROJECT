import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.performance_service import extract_student_features, rule_based_fallback_predict

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "timestamp" in data


def test_model_status_endpoint():
    response = client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_trained" in data
    assert "at_risk_threshold" in data
    assert "features" in data
    assert len(data["features"]) > 0


def test_predict_with_feature_vector():
    test_features = {
        "avg_exam_pct": 38.5,
        "min_exam_pct": 30.0,
        "max_exam_pct": 45.0,
        "total_exams_taken": 3.0,
        "failed_exams_count": 2.0,
        "failed_exams_ratio": 0.667,
        "attendance_pct": 62.0,
        "has_attendance_data": 1.0,
        "current_semester": 3.0,
    }
    response = client.post("/model/predict", json={
        "student_id": "test-student-123",
        "features": test_features
    })
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_risk"] in ["High Risk", "Moderate Risk", "Low Risk"]
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert len(data["contributing_factors"]) > 0
    assert "disclaimer" in data


def test_predict_good_standing_student():
    good_features = {
        "avg_exam_pct": 85.0,
        "min_exam_pct": 78.0,
        "max_exam_pct": 92.0,
        "total_exams_taken": 4.0,
        "failed_exams_count": 0.0,
        "failed_exams_ratio": 0.0,
        "attendance_pct": 90.0,
        "has_attendance_data": 1.0,
        "current_semester": 4.0,
    }
    response = client.post("/model/predict", json={
        "student_id": "good-student-456",
        "features": good_features
    })
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_risk"] == "Low Risk"
    assert data["risk_probability"] < 0.40


def test_chat_endpoint_graceful_response():
    response = client.post("/chat", json={
        "message": "Which subjects have the weakest average performance?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
    assert "model" in data


def test_feature_extraction_logic():
    student = {"current_semester": 2}
    exams = [
        {"marks_obtained": 45, "max_marks": 100, "result": "Pass"},
        {"marks_obtained": 30, "max_marks": 100, "result": "Fail"},
    ]
    attendance = [
        {"status": "Present"},
        {"status": "Absent"},
    ]
    features = extract_student_features(student, exams, attendance)
    assert features["avg_exam_pct"] == 37.5
    assert features["min_exam_pct"] == 30.0
    assert features["max_exam_pct"] == 45.0
    assert features["failed_exams_count"] == 1.0
    assert features["attendance_pct"] == 50.0
    assert features["current_semester"] == 2.0
