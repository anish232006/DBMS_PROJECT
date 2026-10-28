/**
 * UniVerse AI API Client
 * Typed helpers for interacting with the Python FastAPI backend
 */

const AI_BACKEND_URL =
  import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:8000';

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: Record<string, any>;
  feature_importances: Record<string, number>;
  train_samples: number;
  test_samples: number;
}

export interface ModelStatus {
  is_trained: boolean;
  model_version: string | null;
  trained_at: string | null;
  samples_count: number | null;
  features: string[];
  at_risk_threshold: number;
  metrics: ModelMetrics | null;
  note: string;
}

export interface PredictionResult {
  student_id?: string;
  roll_number?: string;
  predicted_risk: 'High Risk' | 'Moderate Risk' | 'Low Risk';
  risk_probability: number;
  confidence_score: number;
  is_model_prediction: boolean;
  contributing_factors: string[];
  model_version: string;
  prediction_timestamp: string;
  features_evaluated: Record<string, number>;
  disclaimer: string;
}

export interface AtRiskStudentSummary {
  student_id: string;
  roll_number: string;
  full_name: string;
  department: string;
  semester: number;
  avg_marks: number;
  attendance_pct: number;
  total_exams: number;
  failed_exams: number;
  predicted_risk: 'High Risk' | 'Moderate Risk' | 'Low Risk';
  risk_probability: number;
  is_model_prediction: boolean;
  contributing_factors: string[];
  weak_courses: Array<{
    course_code: string;
    marks: string;
    percentage: number;
  }>;
}

export interface AtRiskOverviewResponse {
  success: boolean;
  students: AtRiskStudentSummary[];
  summary: {
    total_evaluated: number;
    high_risk_count: number;
    moderate_risk_count: number;
    low_risk_count: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  response: string;
  grounded_in_db: boolean;
  context_sources: string[];
  tokens_used?: number;
  model: string;
}

let activeBackendBase: string | null = null;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const configuredUrl = import.meta.env.VITE_AI_BACKEND_URL;
  
  // Potential hosts to attempt in Windows environments
  const candidateUrls = configuredUrl 
    ? [configuredUrl] 
    : [
        activeBackendBase || 'http://127.0.0.1:8000',
        activeBackendBase === 'http://localhost:8000' ? 'http://127.0.0.1:8000' : 'http://localhost:8000'
      ];

  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        let errorDetail = `Request failed with status ${res.status}`;
        try {
          const body = await res.json();
          if (body.detail) errorDetail = body.detail;
        } catch {
          // ignore
        }
        throw new Error(errorDetail);
      }

      // Store working URL for subsequent requests
      activeBackendBase = baseUrl;
      return await res.json();
    } catch (err: any) {
      lastError = err;
      // If error is an HTTP error returned from the server (not network failure), don't retry candidate URL
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('fetch')) {
        throw err;
      }
    }
  }

  throw new Error(
    `Cannot connect to AI Backend. Ensure the FastAPI backend is running at http://127.0.0.1:8000 or http://localhost:8000. (${lastError?.message || 'Connection refused'})`
  );
}

export const aiApiClient = {
  getBackendUrl: () => AI_BACKEND_URL,

  async checkHealth(): Promise<{
    status: string;
    database_connected: boolean;
    model_trained: boolean;
    groq_configured: boolean;
  }> {
    return request('/health');
  },

  async getModelStatus(): Promise<ModelStatus> {
    return request('/model/status');
  },

  async getModelMetrics(): Promise<{
    trained: boolean;
    model_version?: string;
    trained_at?: string;
    metrics: ModelMetrics | null;
  }> {
    return request('/model/metrics');
  },

  async trainModel(adminToken?: string): Promise<{
    success: boolean;
    message: string;
    model_version?: string;
    dataset_size: number;
    metrics?: ModelMetrics;
    features_used: string[];
  }> {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['X-Admin-Token'] = adminToken;
    }
    return request('/model/train', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
  },

  async predictStudentRisk(
    studentId?: string,
    rollNumber?: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    return request('/model/predict', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        roll_number: rollNumber,
        features,
      }),
    });
  },

  async getAtRiskStudents(limit = 50): Promise<AtRiskOverviewResponse> {
    return request(`/students/at-risk?limit=${limit}`);
  },

  async sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    studentIdContext?: string
  ): Promise<ChatResponse> {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history,
        student_id_context: studentIdContext,
      }),
    });
  },
};
