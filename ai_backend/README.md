# UniVerse AI Backend

This is the dedicated Python AI service for **UniVerse — University Management System**. It provides:
1. **Supervised Student Performance Prediction** using **XGBoost** (`XGBClassifier`)
2. **Personalized Academic Risk Analytics & Evaluation Metrics**
3. **Retrieval-Grounded University Assistant Chatbot** powered by **Groq Cloud LLM**

---

## 🛠️ Architecture & Technology Stack

- **Framework**: FastAPI (asynchronous, OpenAPI-documented REST API)
- **Machine Learning**:
  - `xgboost.XGBClassifier` for non-linear, robust classification
  - `scikit-learn` for leakage-safe grouped data splitting (`GroupShuffleSplit`), metrics, and confusion matrix
  - `pandas` & `numpy` for data manipulation
  - `joblib` for model persistence
- **LLM Integration**:
  - `groq` SDK for lightning-fast inference
  - Grounded database retrieval from Supabase before prompting
- **Database Client**: `supabase-py` for live PostgreSQL connection

---

## 🚀 Setup & Running Locally

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Edit `.env` with your credentials:
```env
# Groq API Key (free from https://console.groq.com/keys)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Supabase Credentials (from Supabase Project Settings -> API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_or_anon_key

# Thresholds
AT_RISK_THRESHOLD=50.0
ADMIN_SECRET_TOKEN=admin-secret-dev-key
```

### 4. Start the Backend Server
```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 5. Run the Standalone Training Pipeline
To train or evaluate the XGBoost model directly from CLI:
```powershell
python training/train_model.py
```

### 6. Run Backend Tests
```powershell
pytest tests/
```

---

## 📊 Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health status and database/Groq connectivity |
| `GET` | `/model/status` | Current model status, training version, and metrics |
| `GET` | `/model/metrics` | Detailed evaluation metrics, confusion matrix, feature importances |
| `POST` | `/model/train` | Administrative endpoint to retrain model on historical Supabase data |
| `POST` | `/model/predict` | Predict academic risk category and calibrated probability for a student |
| `GET` | `/students/at-risk` | Overview of all institution students with predicted risk and weak courses |
| `POST` | `/chat` | Grounded AI assistant chatbot powered by Groq and live database context |

---

## 🔒 Security & Data Leakage Prevention

1. **Student Grouping**: Features are split using student-level groupings so that multiple exam records for the same student never leak across training and test partitions.
2. **Zero Identifier Features**: Student names, roll numbers, and contact details are completely stripped prior to model ingestion.
3. **Database Grounding**: Groq prompts are constrained strictly to verified database facts, preventing hallucination and unauthorized data exposure.
