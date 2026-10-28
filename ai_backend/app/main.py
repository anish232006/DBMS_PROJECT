import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Header, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.model import (
    ModelStatusResponse,
    ModelTrainRequest,
    ModelTrainResponse,
    StudentPredictRequest,
    PredictionResponse,
)
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.supabase_service import supabase_service
from app.services.performance_service import (
    extract_student_features,
    prepare_training_dataframe,
    FEATURE_COLUMNS,
)
from app.services.xgboost_service import (
    xgboost_service,
    InsufficientDataException,
)
from app.services.chat_service import chat_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_backend")

app = FastAPI(
    title="UniVerse AI - University Performance & Assistant API",
    description="Supervised XGBoost Student Performance Prediction & Groq Grounded University Chatbot",
    version="1.0.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # safe dev configuration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    """Simple authorization guard for model training triggers."""
    if settings.ADMIN_SECRET_TOKEN and settings.ADMIN_SECRET_TOKEN != "admin-secret-dev-key":
        if x_admin_token != settings.ADMIN_SECRET_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized. A valid X-Admin-Token header is required.",
            )
    return True


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "UniVerse AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": supabase_service.is_connected(),
        "model_trained": xgboost_service.is_trained(),
        "groq_configured": chat_service.is_configured(),
    }


@app.get("/model/status", response_model=ModelStatusResponse, tags=["ML Model"])
async def get_model_status():
    """Returns the current state, version, and training metrics of the XGBoost model."""
    status_dict = xgboost_service.get_status()
    return status_dict


@app.get("/model/metrics", tags=["ML Model"])
async def get_model_metrics():
    """Returns evaluation metrics from the most recent training run."""
    if not xgboost_service.is_trained():
        return {
            "trained": False,
            "message": "Model has not been trained yet. No metrics available.",
            "metrics": None,
        }
    return {
        "trained": True,
        "model_version": xgboost_service.metadata.get("version"),
        "trained_at": xgboost_service.metadata.get("trained_at"),
        "metrics": xgboost_service.metrics,
    }


@app.post("/model/train", response_model=ModelTrainResponse, tags=["ML Model"])
async def train_model(
    req: ModelTrainRequest = ModelTrainRequest(),
    authorized: bool = Depends(verify_admin_token),
):
    """
    Fetches genuine historical examination and attendance records from Supabase,
    validates the dataset, prevents data leakage via student grouping,
    trains the XGBoost classifier, and evaluates it on a held-out test split.
    """
    # 1. Fetch real historical data from Supabase
    db_data = supabase_service.fetch_training_dataset()
    if not db_data.get("success"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database data retrieval failed: {db_data.get('error')}. Please verify Supabase connection.",
        )

    exams = db_data.get("examinations", [])
    students = db_data.get("students", [])
    attendance = db_data.get("attendance", [])

    if not exams or not students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot train model: Database contains zero examination or student records.",
        )

    # 2. Build feature matrix and target
    threshold = req.at_risk_threshold or settings.AT_RISK_THRESHOLD
    df_x, df_y, groups = prepare_training_dataframe(
        examinations=exams,
        students=students,
        attendance=attendance,
        at_risk_threshold=threshold,
    )

    if len(df_x) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot train model: No student records have recorded examination marks.",
        )

    # 3. Train with XGBoost service
    try:
        train_result = xgboost_service.train(
            df_x=df_x,
            df_y=df_y,
            groups=groups,
            test_size=req.test_size,
            random_state=req.random_state,
            at_risk_threshold=threshold,
        )
        return {
            "success": True,
            "message": "Supervised XGBoost model trained and evaluated successfully on historical data.",
            "model_version": train_result["model_version"],
            "dataset_size": train_result["dataset_size"],
            "metrics": train_result["metrics"],
            "features_used": train_result["features_used"],
        }
    except InsufficientDataException as ide:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ide),
        )
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training encountered an unexpected error: {str(e)}",
        )


@app.post("/model/predict", response_model=PredictionResponse, tags=["ML Model"])
async def predict_student_risk(req: StudentPredictRequest):
    """
    Computes an academic risk assessment for a student using XGBoost.
    Falls back gracefully to transparent rule-based analysis if the model is not yet trained.
    """
    # Option A: Manual feature input (for simulations or offline testing)
    if req.features:
        prediction = xgboost_service.predict(
            features=req.features,
            student_id=req.student_id,
            roll_number=req.roll_number,
        )
        return prediction

    # Option B: Student identifier lookup in Supabase
    identifier = req.student_id or req.roll_number
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'student_id', 'roll_number', or 'features' must be provided.",
        )

    rec = supabase_service.fetch_student_records(identifier)
    if not rec.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record retrieval failed: {rec.get('error')}",
        )

    student = rec["student"]
    exams = rec["examinations"]
    attendance = rec["attendance"]

    # Extract objective features
    features = extract_student_features(student, exams, attendance)

    # Predict risk
    prediction = xgboost_service.predict(
        features=features,
        student_id=student.get("student_id"),
        roll_number=student.get("roll_number"),
    )

    return prediction


@app.get("/students/at-risk", tags=["Performance Analytics"])
async def get_at_risk_overview(limit: int = Query(50, ge=1, le=200)):
    """
    Scans students across the institution to identify those flagged at risk,
    combining real database performance with XGBoost predictive probability.
    """
    client = supabase_service.get_client()
    if not client:
        return {
            "success": False,
            "message": "Database not currently connected.",
            "students": [],
        }

    try:
        students_res = client.table("students").select(
            "student_id, register_number, full_name, department, batch_year, current_semester, status"
        ).eq("status", "active").limit(limit).execute()

        students = students_res.data or []
        if not students:
            return {"success": True, "students": [], "summary": {"total": 0, "at_risk": 0}}

        exam_res = client.table("examinations").select(
            "student_id, course_code, marks_obtained, max_marks, grade, result"
        ).execute()

        att_res = client.table("attendance").select(
            "student_id, status"
        ).execute()

        # Group by student_id
        exams_by_student: Dict[str, List[Dict[str, Any]]] = {}
        for ex in (exam_res.data or []):
            sid = ex.get("student_id")
            if sid:
                exams_by_student.setdefault(sid, []).append(ex)

        att_by_student: Dict[str, List[Dict[str, Any]]] = {}
        for a in (att_res.data or []):
            sid = a.get("student_id")
            if sid:
                att_by_student.setdefault(sid, []).append(a)

        results = []
        for s in students:
            sid = s["student_id"]
            s_exams = exams_by_student.get(sid, [])
            s_att = att_by_student.get(sid, [])

            features = extract_student_features(s, s_exams, s_att)
            roll_no = s.get("register_number") or s.get("roll_number", "Unknown")
            pred = xgboost_service.predict(features, student_id=sid, roll_number=roll_no)

            # Find weak courses (< 50%)
            weak_courses = []
            for ex in s_exams:
                m = ex.get("marks_obtained")
                mm = ex.get("max_marks") or 100
                if m is not None and mm > 0:
                    pct = (m / mm) * 100
                    if pct < 50 or str(ex.get("result", "")).lower() == "fail":
                        weak_courses.append({
                            "course_code": ex.get("course_code"),
                            "marks": f"{m}/{mm}",
                            "percentage": round(pct),
                        })

            results.append({
                "student_id": sid,
                "roll_number": roll_no,
                "full_name": s["full_name"],
                "department": s["department"],
                "semester": s["current_semester"],
                "avg_marks": features["avg_exam_pct"],
                "attendance_pct": features["attendance_pct"],
                "total_exams": int(features["total_exams_taken"]),
                "failed_exams": int(features["failed_exams_count"]),
                "predicted_risk": pred["predicted_risk"],
                "risk_probability": pred["risk_probability"],
                "is_model_prediction": pred["is_model_prediction"],
                "contributing_factors": pred["contributing_factors"],
                "weak_courses": weak_courses,
            })

        # Sort so high-risk students appear first
        risk_order = {"High Risk": 0, "Moderate Risk": 1, "Low Risk": 2}
        results.sort(key=lambda x: (risk_order.get(x["predicted_risk"], 3), -x["risk_probability"]))

        at_risk_count = sum(1 for r in results if r["predicted_risk"] in ("High Risk", "Moderate Risk"))

        return {
            "success": True,
            "students": results,
            "summary": {
                "total_evaluated": len(results),
                "high_risk_count": sum(1 for r in results if r["predicted_risk"] == "High Risk"),
                "moderate_risk_count": sum(1 for r in results if r["predicted_risk"] == "Moderate Risk"),
                "low_risk_count": sum(1 for r in results if r["predicted_risk"] == "Low Risk"),
            },
        }
    except Exception as e:
        logger.error(f"Error compiling at-risk overview: {e}")
        return {"success": False, "error": str(e), "students": []}


@app.post("/chat", response_model=ChatResponse, tags=["AI Chatbot"])
async def chat_with_assistant(req: ChatRequest):
    """
    University assistant chatbot powered by Groq LLM and strictly grounded
    in real university database records.
    """
    history_dicts = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    result = await chat_service.generate_response(
        message=req.message,
        history=history_dicts,
        student_id_context=req.student_id_context,
    )
    return result
