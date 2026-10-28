import logging
import uuid
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("supabase_service")


class SupabaseService:
    def __init__(self):
        self._client: Optional[Client] = None
        self._init_client()

    def _init_client(self):
        url = settings.get_supabase_url()
        key = settings.get_supabase_key()

        if url and key:
            try:
                self._client = create_client(url, key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize Supabase client: {e}")
                self._client = None
        else:
            logger.warning("Supabase credentials missing. SupabaseService in offline mode.")

    def is_connected(self) -> bool:
        return self._client is not None

    def get_client(self) -> Optional[Client]:
        if not self._client:
            self._init_client()
        return self._client

    def fetch_training_dataset(self) -> Dict[str, Any]:
        """
        Fetches authorized historical examinations and attendance data
        from Supabase for genuine ML training.
        """
        client = self.get_client()
        if not client:
            return {
                "success": False,
                "error": "Supabase client not connected. Check SUPABASE_URL and SUPABASE_KEY.",
                "data": []
            }

        try:
            # 1. Fetch examinations
            exam_res = client.table("examinations").select(
                "exam_id, course_code, student_id, exam_type, exam_date, marks_obtained, max_marks, grade, result, department_id"
            ).execute()

            # 2. Fetch students metadata
            student_res = client.table("students").select(
                "student_id, register_number, department, department_id, batch_year, current_semester, status"
            ).execute()

            # 3. Fetch attendance summary
            attendance_res = client.table("attendance").select(
                "student_id, course_code, status"
            ).execute()

            return {
                "success": True,
                "examinations": exam_res.data or [],
                "students": student_res.data or [],
                "attendance": attendance_res.data or [],
            }
        except Exception as e:
            logger.error(f"Error fetching data from Supabase: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": []
            }

    def fetch_student_records(self, student_id: str) -> Dict[str, Any]:
        """
        Fetches records for a specific student to compute features for prediction.
        Supports both UUID student_id and register_number lookup.
        """
        client = self.get_client()
        if not client:
            return {"success": False, "error": "Database connection not available"}

        try:
            # Check if student exists safely (UUID vs register_number)
            query = client.table("students").select("*")
            is_uuid = False
            clean_id = str(student_id).strip()
            try:
                uuid.UUID(clean_id)
                is_uuid = True
            except (ValueError, AttributeError):
                is_uuid = False

            if is_uuid:
                query = query.eq("student_id", clean_id)
            else:
                query = query.ilike("register_number", clean_id)

            res = query.execute()
            if not res.data:
                return {"success": False, "error": f"Student with ID/Register No '{student_id}' not found"}

            student = res.data[0]
            # Ensure roll_number attribute exists for downstream code
            student["roll_number"] = student.get("register_number") or student.get("roll_number")
            actual_id = student["student_id"]

            # Fetch exams
            exams = client.table("examinations").select("*").eq("student_id", actual_id).execute()
            # Fetch attendance
            attendance = client.table("attendance").select("*").eq("student_id", actual_id).execute()

            # Fetch hostel allocation
            hostel = []
            try:
                h_res = client.table("hostel_allocations").select("*, hostel_rooms(*)").eq("student_id", actual_id).execute()
                hostel = h_res.data or []
            except Exception as h_err:
                logger.debug(f"Hostel fetch skipped: {h_err}")

            # Fetch club memberships
            clubs = []
            try:
                cl_res = client.table("club_memberships").select("*, clubs(*)").eq("student_id", actual_id).execute()
                clubs = cl_res.data or []
            except Exception as cl_err:
                logger.debug(f"Clubs fetch skipped: {cl_err}")

            # Fetch placement applications
            placements = []
            try:
                pl_res = client.table("placement_applications").select("*, placement_drives(*)").eq("student_id", actual_id).execute()
                placements = pl_res.data or []
            except Exception as pl_err:
                logger.debug(f"Placements fetch skipped: {pl_err}")

            # Fetch grievances
            grievances = []
            try:
                gr_res = client.table("grievances").select("*").eq("student_id", actual_id).execute()
                grievances = gr_res.data or []
            except Exception as gr_err:
                logger.debug(f"Grievances fetch skipped: {gr_err}")

            return {
                "success": True,
                "student": student,
                "examinations": exams.data or [],
                "attendance": attendance.data or [],
                "hostel": hostel,
                "clubs": clubs,
                "placements": placements,
                "grievances": grievances,
            }
        except Exception as e:
            logger.error(f"Error fetching student records: {e}")
            return {"success": False, "error": str(e)}


supabase_service = SupabaseService()
