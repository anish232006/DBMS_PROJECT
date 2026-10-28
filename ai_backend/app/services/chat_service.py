import re
import logging
from typing import List, Dict, Any, Optional
from groq import Groq

from app.config import settings
from app.services.supabase_service import supabase_service
from app.services.performance_service import extract_student_features
from app.services.xgboost_service import xgboost_service

logger = logging.getLogger("chat_service")


class ChatService:
    def __init__(self):
        self._groq_client: Optional[Groq] = None
        self._courses_cache: Optional[Dict[str, Dict[str, Any]]] = None
        self._faculty_cache: Optional[List[Dict[str, Any]]] = None
        self._departments_cache: Optional[List[Dict[str, Any]]] = None
        self._classrooms_cache: Optional[List[Dict[str, Any]]] = None
        self._hostels_cache: Optional[List[Dict[str, Any]]] = None
        self._library_cache: Optional[List[Dict[str, Any]]] = None
        self._placements_cache: Optional[List[Dict[str, Any]]] = None
        self._clubs_cache: Optional[List[Dict[str, Any]]] = None
        self._init_groq()

    def _init_groq(self):
        api_key = settings.GROQ_API_KEY
        if api_key and api_key != "your_groq_api_key_here":
            try:
                self._groq_client = Groq(api_key=api_key)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")
                self._groq_client = None
        else:
            logger.info("GROQ_API_KEY not configured. Chatbot will operate in database factual fallback mode.")

    def is_configured(self) -> bool:
        return self._groq_client is not None

    def _get_all_courses(self, client) -> Dict[str, Dict[str, Any]]:
        """Loads and caches all university courses for bidirectional name/code lookup."""
        if self._courses_cache is not None:
            return self._courses_cache

        try:
            res = client.table("courses").select("course_code, course_name, department, credits, semester").execute()
            course_map = {}
            for c in (res.data or []):
                code = (c.get("course_code") or "").strip()
                if code:
                    course_map[code] = {
                        "name": c.get("course_name") or code,
                        "department": c.get("department") or "General",
                        "credits": c.get("credits") or 3,
                        "semester": c.get("semester") or 1,
                    }
            self._courses_cache = course_map
            return course_map
        except Exception as e:
            logger.warning(f"Could not load courses catalog: {e}")
            return {}

    def _get_faculty(self, client) -> List[Dict[str, Any]]:
        if self._faculty_cache is not None:
            return self._faculty_cache
        try:
            res = client.table("faculty").select("faculty_id, full_name, email, phone, department, designation").limit(50).execute()
            self._faculty_cache = res.data or []
            return self._faculty_cache
        except Exception as e:
            logger.debug(f"Faculty cache load skipped: {e}")
            return []

    def _get_departments(self, client) -> List[Dict[str, Any]]:
        if self._departments_cache is not None:
            return self._departments_cache
        try:
            res = client.table("departments").select("department_id, department_name, established_year, building, hod_faculty_id").execute()
            fac_map = {f["faculty_id"]: f["full_name"] for f in self._get_faculty(client)}
            dept_list = []
            for d in (res.data or []):
                dept_list.append({
                    "name": d.get("department_name"),
                    "building": d.get("building"),
                    "hod": fac_map.get(d.get("hod_faculty_id"), "Department Chair"),
                    "established": d.get("established_year"),
                })
            self._departments_cache = dept_list
            return dept_list
        except Exception as e:
            logger.debug(f"Departments cache load skipped: {e}")
            return []

    def _get_classrooms(self, client) -> List[Dict[str, Any]]:
        if self._classrooms_cache is not None:
            return self._classrooms_cache
        try:
            res = client.table("classrooms").select("classroom_id, room_number, building, capacity, room_type").limit(30).execute()
            self._classrooms_cache = res.data or []
            return self._classrooms_cache
        except Exception as e:
            logger.debug(f"Classrooms cache load skipped: {e}")
            return []

    def _get_hostels(self, client) -> List[Dict[str, Any]]:
        if self._hostels_cache is not None:
            return self._hostels_cache
        try:
            res = client.table("hostel_rooms").select("room_id, block, room_number, capacity, occupied_count").limit(40).execute()
            self._hostels_cache = res.data or []
            return self._hostels_cache
        except Exception as e:
            logger.debug(f"Hostels cache load skipped: {e}")
            return []

    def _get_library_books(self, client) -> List[Dict[str, Any]]:
        if self._library_cache is not None:
            return self._library_cache
        try:
            res = client.table("library_books").select("book_id, title, author, isbn, total_copies, available_copies").limit(30).execute()
            self._library_cache = res.data or []
            return self._library_cache
        except Exception as e:
            logger.debug(f"Library cache load skipped: {e}")
            return []

    def _get_placement_drives(self, client) -> List[Dict[str, Any]]:
        if self._placements_cache is not None:
            return self._placements_cache
        try:
            res = client.table("placement_drives").select("drive_id, role_offered, package_lpa, drive_date, eligibility_criteria").limit(20).execute()
            self._placements_cache = res.data or []
            return self._placements_cache
        except Exception as e:
            logger.debug(f"Placement cache load skipped: {e}")
            return []

    def _get_clubs(self, client) -> List[Dict[str, Any]]:
        if self._clubs_cache is not None:
            return self._clubs_cache
        try:
            res = client.table("clubs").select("club_id, club_name, category, faculty_advisor_id").limit(20).execute()
            fac_map = {f["faculty_id"]: f["full_name"] for f in self._get_faculty(client)}
            clubs_list = []
            for cl in (res.data or []):
                clubs_list.append({
                    "name": cl.get("club_name"),
                    "category": cl.get("category"),
                    "advisor": fac_map.get(cl.get("faculty_advisor_id"), "Faculty Advisor"),
                })
            self._clubs_cache = clubs_list
            return clubs_list
        except Exception as e:
            logger.debug(f"Clubs cache load skipped: {e}")
            return []

    def retrieve_context_for_query(
        self,
        query: str,
        student_id_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves comprehensive institutional facts from Supabase based on the user's inquiry:
        - Exact student marks with course names mapped (e.g. CO301 -> Data Structures)
        - Attendance records and subject-wise attendance percentages
        - Course catalog & faculty directory
        - Timetable, classrooms, library, hostel, placement, and clubs
        - Institutional regulations (50% passing, 75% attendance)
        """
        client = supabase_service.get_client()
        if not client:
            return {
                "grounded": False,
                "context_text": "Note: Database is currently in offline/disconnected mode.",
                "sources": []
            }

        q_lower = query.lower()
        context_parts = []
        sources = []

        try:
            # Step A: Load courses catalog for accurate name-to-code mapping
            course_map = self._get_all_courses(client)

            # Step B: Determine target student
            # Only match explicit institutional roll number pattern (URK\d{2}[A-Za-z]{2}\d{4}) or full UUID
            # DO NOT match generic numbers like 2026, 2024, or room numbers!
            roll_match = re.search(
                r'\b(URK\d{2}[A-Za-z]{2}\d{4}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b',
                query,
                re.IGNORECASE
            )
            if roll_match:
                target_id = roll_match.group(1)
            elif student_id_context and student_id_context.strip():
                target_id = student_id_context.strip()
            else:
                target_id = "URK24CS1092"

            # Step C: Retrieve Complete Student Profile & Academic History
            if target_id:
                rec = supabase_service.fetch_student_records(target_id)
                if rec.get("success"):
                    stu = rec["student"]
                    exams = rec.get("examinations", [])
                    att = rec.get("attendance", [])
                    hostel = rec.get("hostel", [])
                    clubs = rec.get("clubs", [])
                    placements = rec.get("placements", [])
                    grievances = rec.get("grievances", [])

                    # Compute features & ML risk prediction
                    features = extract_student_features(stu, exams, att)
                    prediction = xgboost_service.predict(
                        features,
                        student_id=stu["student_id"],
                        roll_number=stu["roll_number"]
                    )

                    # Build detailed examination history with course names
                    exam_table_rows = []
                    passed_subjects = []
                    failed_subjects = []

                    for e in exams:
                        c_code = (e.get("course_code") or "Unknown").strip()
                        c_info = course_map.get(c_code, {})
                        c_name = c_info.get("name") or c_code
                        m = e.get("marks_obtained")
                        max_m = e.get("max_marks") or 100
                        pct = (m / max_m * 100) if (m is not None and max_m > 0) else 0.0
                        grade = e.get("grade") or "N/A"
                        result = e.get("result") or ("Pass" if pct >= 50 else "Fail")
                        exam_type = e.get("exam_type") or "Semester Final"
                        exam_date = e.get("exam_date") or ""

                        row_str = f"| **{c_name}** | `{c_code}` | {m}/{max_m} | {pct:.1f}% | **{grade}** | **{result}** | {exam_type} | {exam_date} |"
                        exam_table_rows.append(row_str)

                        if pct < 50 or str(result).lower() == "fail":
                            failed_subjects.append(f"{c_name} (`{c_code}`): {m}/{max_m} ({pct:.1f}%, Grade {grade})")
                        else:
                            passed_subjects.append(f"{c_name} (`{c_code}`): {m}/{max_m} ({pct:.1f}%, Grade {grade})")

                    # Build attendance summary by course
                    att_by_course: Dict[str, Dict[str, Any]] = {}
                    for a in att:
                        c_code = (a.get("course_code") or "General").strip()
                        c_name = a.get("course_name") or course_map.get(c_code, {}).get("name") or c_code
                        att_by_course.setdefault(c_code, {"total": 0, "present": 0, "name": c_name})
                        att_by_course[c_code]["total"] += 1
                        if str(a.get("status")).strip().lower() == "present":
                            att_by_course[c_code]["present"] += 1

                    attendance_table_rows = []
                    for c_code, counts in att_by_course.items():
                        c_name = counts["name"]
                        tot = counts["total"]
                        pres = counts["present"]
                        pct = (pres / tot * 100) if tot > 0 else 0
                        status_badge = "⚠️ Shortage (<75%)" if pct < 75 else "✅ Satisfactory"
                        attendance_table_rows.append(
                            f"| **{c_name}** | `{c_code}` | {pres} | {tot} | **{pct:.1f}%** | {status_badge} |"
                        )

                    # Student Campus Life Context
                    hostel_str = "Day Scholar (No hostel room assigned)"
                    if hostel:
                        h0 = hostel[0]
                        rm = h0.get("hostel_rooms", {}) or {}
                        hostel_str = f"{rm.get('block', 'Hostel Block')} - Room {rm.get('room_number', 'N/A')} (Status: {h0.get('status', 'Active')})"

                    clubs_str = "None registered"
                    if clubs:
                        c_items = []
                        for cl in clubs:
                            cl_info = cl.get("clubs", {}) or {}
                            c_items.append(f"{cl_info.get('club_name', 'Club')} ({cl.get('role', 'Member')})")
                        clubs_str = ", ".join(c_items)

                    placements_str = "No active placement applications"
                    if placements:
                        p_items = []
                        for p in placements:
                            dr = p.get("placement_drives", {}) or {}
                            p_items.append(f"{dr.get('role_offered', 'Role')} ({dr.get('package_lpa', 0)} LPA) - Status: {p.get('status', 'Applied')}")
                        placements_str = "; ".join(p_items)

                    grievances_str = "No filed grievances"
                    if grievances:
                        g_items = []
                        for g in grievances:
                            g_items.append(f"[{g.get('category')}] {g.get('description')} (Status: {g.get('status')})")
                        grievances_str = "; ".join(g_items)

                    # Complete Student Profile Markdown Block
                    stu_context = (
                        f"### Verified Student Profile: {stu.get('full_name')} (Reg No: {stu.get('roll_number')})\n"
                        f"- **Full Name**: {stu.get('full_name')}\n"
                        f"- **Registration / Roll No**: `{stu.get('roll_number')}`\n"
                        f"- **Department**: {stu.get('department')} | **Current Semester**: Semester {stu.get('current_semester')} | **Batch Year**: {stu.get('batch_year')}\n"
                        f"- **Email**: {stu.get('email')} | **Phone**: {stu.get('phone') or 'N/A'}\n"
                        f"- **Academic Status**: {stu.get('status', 'active').capitalize()}\n"
                        f"- **Overall Exam Average**: **{features['avg_exam_pct']}%**\n"
                        f"- **Overall Attendance**: **{features['attendance_pct']}%**\n"
                        f"- **AI Performance Risk**: **{prediction['predicted_risk']}** (Risk Probability: {prediction['risk_probability']:.1%})\n"
                        f"- **Contributing Factors**: {', '.join(prediction.get('contributing_factors', [])) or 'None'}\n"
                        f"- **Hostel Accommodation**: {hostel_str}\n"
                        f"- **Club Memberships**: {clubs_str}\n"
                        f"- **Placement Applications**: {placements_str}\n"
                        f"- **Grievances Filed**: {grievances_str}\n"
                        f"- **Arrears / Failed Courses**: {', '.join(failed_subjects) if failed_subjects else 'None (All clear! 🟢)'}\n"
                        f"- **Passed Courses**: {', '.join(passed_subjects) if passed_subjects else 'None'}\n\n"
                        f"#### Official Examination Records Table:\n"
                        f"| Course Name | Course Code | Marks Obtained | Max Marks | Percentage | Grade | Result | Exam Type | Exam Date |\n"
                        f"|:---|:---|:---|:---|:---|:---|:---|:---|:---|\n" +
                        ("\n".join(exam_table_rows) if exam_table_rows else "| No examination records on file | - | - | - | - | - | - | - | - |") + "\n\n"
                        f"#### Subject-Wise Attendance Breakdown Table:\n"
                        f"| Course Name | Course Code | Attended Sessions | Total Sessions | Attendance % | Eligibility Status |\n"
                        f"|:---|:---|:---|:---|:---|:---|\n" +
                        ("\n".join(attendance_table_rows) if attendance_table_rows else "| No attendance sessions logged | - | - | - | - | - |")
                    )
                    context_parts.append(stu_context)
                    sources.append(f"student profile ({stu.get('roll_number')})")

                    # Step C1: Retrieve Syllabus Topics & Verified Resources for Student's Courses
                    try:
                        c_codes = list({(e.get("course_code") or "").strip() for e in exams if e.get("course_code")})
                        if c_codes:
                            topics_res = client.table("syllabus_topics").select(
                                "course_code, unit_number, topic_title, difficulty_level"
                            ).in_("course_code", c_codes[:6]).limit(25).execute()
                            if topics_res.data:
                                topic_rows = [
                                    f"- **{t.get('course_code')} (Unit {t.get('unit_number')})**: {t.get('topic_title')} [{str(t.get('difficulty_level', 'intermediate')).capitalize()}]"
                                    for t in topics_res.data
                                ]
                                context_parts.append(
                                    "### Official University Syllabus Topics for Registered Courses:\n" + "\n".join(topic_rows)
                                )
                                sources.append("syllabus_topics")

                            res_res = client.table("study_resources").select(
                                "course_code, title, resource_type, url, channel_or_source"
                            ).in_("course_code", c_codes[:6]).limit(20).execute()
                            if res_res.data:
                                r_rows = [
                                    f"- **[{r.get('resource_type')}] {r.get('title')}** (`{r.get('course_code')}`) - *{r.get('channel_or_source')}*: {r.get('url')}"
                                    for r in res_res.data
                                ]
                                context_parts.append(
                                    "### Verified Educational Study Resources & Direct Video Links:\n" + "\n".join(r_rows)
                                )
                                sources.append("study_resources")
                    except Exception as s_err:
                        logger.debug(f"Syllabus topics / resources lookup skipped: {s_err}")

            # Step D: Complete Course Catalog (All courses across departments)
            all_courses_rows = []
            for code, info in sorted(course_map.items()):
                all_courses_rows.append(
                    f"| **{info['name']}** | `{code}` | {info['department']} | Sem {info['semester']} | {info['credits']} Credits |"
                )

            if all_courses_rows:
                context_parts.append(
                    "### Complete University Course Catalog:\n"
                    "| Course Name | Course Code | Department | Semester | Credits |\n"
                    "|:---|:---|:---|:---|:---|\n" +
                    "\n".join(all_courses_rows)
                )
                sources.append("courses catalog")

            # Step E: University Class Timetable Excerpt
            try:
                tt_res = client.table("timetable").select(
                    "day_of_week, start_time, end_time, course_code, classroom_id, semester_section"
                ).limit(40).execute()

                if tt_res.data:
                    tt_rows = []
                    for row in tt_res.data[:20]:
                        c_code = (row.get("course_code") or "").strip()
                        c_info = course_map.get(c_code, {})
                        c_name = c_info.get("name") or c_code
                        day = row.get("day_of_week") or "Weekday"
                        start = row.get("start_time") or ""
                        end = row.get("end_time") or ""
                        room = row.get("classroom_id") or "Classroom"
                        tt_rows.append(f"| **{day}** | {start} - {end} | **{c_name}** (`{c_code}`) | Room {room} |")

                    context_parts.append(
                        "### University Class Timetable:\n"
                        "| Day | Time Slot | Course Name & Code | Venue |\n"
                        "|:---|:---|:---|:---|\n" +
                        "\n".join(tt_rows)
                    )
                    sources.append("timetable")
            except Exception as tt_err:
                logger.debug(f"Timetable lookup skipped: {tt_err}")

            # Step F: Faculty & Academic Departments Directory
            try:
                faculty_list = self._get_faculty(client)
                dept_list = self._get_departments(client)

                if dept_list:
                    dept_rows = [f"| **{d['name']}** | {d['building']} | **{d['hod']}** | Est. {d['established']} |" for d in dept_list]
                    context_parts.append(
                        "### University Academic Departments & HODs:\n"
                        "| Department Name | Campus Building | Head of Department (HOD) | Established |\n"
                        "|:---|:---|:---|:---|\n" +
                        "\n".join(dept_rows)
                    )
                    sources.append("departments")

                if faculty_list:
                    fac_rows = [
                        f"| **{f.get('full_name')}** | {f.get('designation')} | {f.get('department')} | `{f.get('email')}` |"
                        for f in faculty_list[:15]
                    ]
                    context_parts.append(
                        "### Faculty Directory Excerpt:\n"
                        "| Faculty Name | Designation | Department | Official Email |\n"
                        "|:---|:---|:---|:---|\n" +
                        "\n".join(fac_rows)
                    )
                    sources.append("faculty")
            except Exception as fac_err:
                logger.debug(f"Faculty lookup skipped: {fac_err}")

            # Step G: Campus Infrastructure, Hostels, Library, Placements, Clubs
            try:
                # Hostels
                hostels = self._get_hostels(client)
                if hostels:
                    h_rows = [f"- **{h.get('block')} - Room {h.get('room_number')}**: Capacity {h.get('capacity')} (Occupied: {h.get('occupied_count')})" for h in hostels[:8]]
                    context_parts.append("### Campus Hostels Overview:\n" + "\n".join(h_rows) + "\n- Hostel Rules: Mandatory 9:00 PM curfew; Warden permission required for night-outs.")
                    sources.append("hostels")

                # Library Books
                books = self._get_library_books(client)
                if books:
                    b_rows = [f"| **{b.get('title')}** | {b.get('author')} | {b.get('available_copies')}/{b.get('total_copies')} available | `{b.get('isbn')}` |" for b in books[:10]]
                    context_parts.append(
                        "### Central Library Catalog (Sample Books):\n"
                        "| Book Title | Author(s) | Availability | ISBN |\n"
                        "|:---|:---|:---|:---|\n" +
                        "\n".join(b_rows)
                    )
                    sources.append("library")

                # Placements
                drives = self._get_placement_drives(client)
                if drives:
                    p_rows = [f"| **{d.get('role_offered')}** | **{d.get('package_lpa')} LPA** | {d.get('eligibility_criteria')} | {d.get('drive_date')} |" for d in drives[:8]]
                    context_parts.append(
                        "### Upcoming Placement Drives:\n"
                        "| Role Offered | Package (CTC) | Eligibility Criteria | Drive Date |\n"
                        "|:---|:---|:---|:---|\n" +
                        "\n".join(p_rows)
                    )
                    sources.append("placements")

                # Clubs
                clubs = self._get_clubs(client)
                if clubs:
                    c_rows = [f"- **{cl['name']}** ({cl['category']}): Faculty Advisor: {cl['advisor']}" for cl in clubs[:8]]
                    context_parts.append("### Active Student Clubs:\n" + "\n".join(c_rows))
                    sources.append("clubs")

                # Classrooms
                rooms = self._get_classrooms(client)
                if rooms:
                    r_rows = [f"- Room **{r.get('room_number')}** in **{r.get('building')}** ({r.get('room_type').capitalize()}, Capacity: {r.get('capacity')})" for r in rooms[:8]]
                    context_parts.append("### Classrooms & Campus Buildings:\n" + "\n".join(r_rows))
                    sources.append("classrooms")

            except Exception as campus_err:
                logger.debug(f"Campus extra lookup skipped: {campus_err}")

            # Step H: University Academic Guidelines & Official Regulations
            context_parts.append(
                "### University Official Academic Regulations (Karunya / UniVerse Standards):\n"
                "- **Minimum Passing Threshold**: 50.0% marks in each course examination (internal + semester final).\n"
                "- **Mandatory Attendance**: 75.0% minimum class presence required in every registered subject to sit for semester examinations.\n"
                "- **Condonation / Shortage**: Attendance between 65% - 74% requires valid medical condonation. Attendance below 65% results in detention.\n"
                "- **Arrear Policy**: An examination score below 50.0% or grade D/F constitutes an arrear. Arrears can be cleared by registering for supplementary examinations in the subsequent cycle.\n"
                "- **Official Grading Scale**: A+ (90-100%), A (80-89%), B (70-79%), C (60-69%), D/Pass (50-59%), F/Fail (<50%)."
            )

        except Exception as e:
            logger.error(f"Error retrieving context for query: {e}")
            context_parts.append(f"Context retrieval error: {str(e)}")

        grounded = len(context_parts) > 0
        context_text = "\n\n".join(context_parts) if context_parts else "No specific matching records retrieved."

        return {
            "grounded": grounded,
            "context_text": context_text,
            "sources": sources,
        }

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        student_id_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Coordinates context retrieval and Groq LLM response generation.
        """
        # Step 1: Retrieve comprehensive database context
        context_data = self.retrieve_context_for_query(message, student_id_context)
        db_context = context_data["context_text"]
        sources = context_data["sources"]
        is_grounded = context_data["grounded"]

        # Step 2: Ensure Groq client is initialized
        if not self._groq_client:
            self._init_groq()

        if not self._groq_client:
            return self._generate_fallback_response(message, db_context, sources)

        # Step 3: Construct comprehensive, conversational prompt
        system_instruction = (
            "You are UniVerse AI, the official, highly intelligent and omniscient university academic assistant for Karunya Institute of Technology and Sciences (UniVerse).\n"
            "You are directly embedded within the UniVerse Student Portal and have direct, full access to the institutional database provided below.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. YOU KNOW EVERYTHING IN THE PORTAL. All official student records, examination marks, grades, courses, syllabus, attendance, timetable, faculty, hostel, library, placements, clubs, and university regulations are in the database context.\n"
            "2. NEVER SAY: 'The database does not contain a specific entry...' or 'Log into the portal to check' or 'Check the mobile app'. You ARE the student portal assistant. Answer the user's question directly with the verified facts from the context.\n"
            "3. WHEN ASKED ABOUT A SUBJECT OR MARK:\n"
            "   - E.g., 'What is my mark in Data Structures?' or 'What grade did I get in CO301?':\n"
            "   - Immediately provide the exact course name, course code, marks obtained / max marks, percentage, grade, and pass/fail result.\n"
            "   - If they passed, congratulate them. If their mark is low or an arrear, offer encouraging, actionable concept review tips.\n"
            "4. WHEN ASKED ABOUT ALL MARKS OR EXAMS:\n"
            "   - Provide the complete Examination Records Table in clean Markdown, along with their overall average and arrears summary.\n"
            "5. WHEN ASKED ABOUT ATTENDANCE:\n"
            "   - Provide their overall attendance percentage and the subject-wise breakdown table, highlighting any subject below 75% with a warning.\n"
            "6. WHEN ASKED ABOUT TIMETABLE / CLASSES:\n"
            "   - Detail their schedule with day, times, course names, and classrooms.\n"
            "7. WHEN ASKED ABOUT HOSTEL, LIBRARY, FACULTY, PLACEMENTS, OR CLUBS:\n"
            "   - Provide the exact details from the database context.\n"
            "8. FORMATTING REQUIREMENTS:\n"
            "   - Always format responses in clean, neat, beautifully structured GitHub-flavored Markdown.\n"
            "   - Use clean Markdown Tables (| Header | Header |) for lists of grades, courses, attendance, or schedules.\n"
            "   - Use bold bullet points for concise factual answers.\n"
            "   - Use numbered lists (1., 2., 3.) for action plans and study tips.\n"
            "   - Keep your tone respectful, encouraging, clear, and professional.\n"
            "9. WHEN ASKED WHAT TO STUDY OR HOW TO IMPROVE (STUDY RECOMMENDATIONS):\n"
            "   - Check the student's actual marks and identify low-scoring or failed courses (e.g. Data Structures, Algorithms).\n"
            "   - Look at the syllabus topics and verified study resources in the context.\n"
            "   - Provide concrete syllabus units and verified video/document titles from the context.\n"
            "   - NEVER fabricate or invent URLs or YouTube search links. Direct the student to their 'Study Resources' portal page for one-click access.\n"
            "   - Strictly protect privacy: NEVER reveal other students' marks or faculty payroll/salary details under any circumstances.\n\n"
            f"=== VERIFIED INSTITUTIONAL DATABASE CONTEXT ===\n"
            f"{db_context}\n"
            "================================================"
        )

        messages = [{"role": "system", "content": system_instruction}]

        # Append last 4 messages from history for conversational continuity
        if history:
            for h in history[-4:]:
                role = "assistant" if h.get("role") == "assistant" else "user"
                messages.append({"role": role, "content": h.get("content", "")})

        messages.append({"role": "user", "content": message})

        # Step 4: Generate completion via Groq LLM
        model_name = settings.GROQ_MODEL
        try:
            response = self._groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.2,
                max_tokens=1000,
            )

            reply_text = response.choices[0].message.content
            tokens = response.usage.total_tokens if response.usage else None

            return {
                "response": reply_text,
                "grounded_in_db": is_grounded,
                "context_sources": sources,
                "tokens_used": tokens,
                "model": model_name,
            }
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            # Try fallback model if model selection was rejected
            if "model" in str(e).lower() and settings.GROQ_MODEL != "qwen/qwen3.8-27b":
                try:
                    response = self._groq_client.chat.completions.create(
                        model="qwen/qwen3.8-27b",
                        messages=messages,
                        temperature=0.2,
                        max_tokens=1000,
                    )
                    return {
                        "response": response.choices[0].message.content,
                        "grounded_in_db": is_grounded,
                        "context_sources": sources,
                        "tokens_used": response.usage.total_tokens if response.usage else None,
                        "model": "qwen/qwen3.8-27b",
                    }
                except Exception as inner_e:
                    logger.error(f"Fallback Groq model also failed: {inner_e}")

            # Graceful error reporting
            return {
                "response": (
                    f"⚠️ **Assistant Notice**: Unable to reach Groq LLM API ({str(e)}).\n\n"
                    f"**Database Grounding Summary**:\n{db_context}\n\n"
                    "*Please verify that a valid GROQ_API_KEY is configured in your backend `.env` file.*"
                ),
                "grounded_in_db": is_grounded,
                "context_sources": sources,
                "tokens_used": 0,
                "model": "offline-fallback",
            }

    def _generate_fallback_response(
        self,
        query: str,
        db_context: str,
        sources: List[str]
    ) -> Dict[str, Any]:
        """Provides an informative answer using database context when Groq API key is not yet set."""
        reply = (
            "🤖 **UniVerse Assistant (Database Direct Mode)**\n\n"
            f"{db_context}\n\n"
            "💡 *Tip: Configure `GROQ_API_KEY` in `ai_backend/.env` for natural language conversational synthesis.*"
        )
        return {
            "response": reply,
            "grounded_in_db": len(sources) > 0,
            "context_sources": sources,
            "tokens_used": 0,
            "model": "database-direct",
        }


chat_service = ChatService()
