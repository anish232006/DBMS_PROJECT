export interface PerformanceResult {
  courseCode: string;
  courseName: string;
  averageMarks: number;
  attendancePercentage: number;
  performanceLevel: "Good" | "Average" | "Needs Improvement";
}

export interface StudyRecommendation {
  courseCode: string;
  courseName: string;
  performance: number;
  priority: "High" | "Medium" | "Low";
  topics: string[];
  resources: {
    type: "Video" | "Study Material" | "Practice";
    title: string;
    url: string;
  }[];
}

export function analyzePerformance(
  averageMarks: number,
  attendancePercentage: number
): PerformanceResult["performanceLevel"] {
  if (averageMarks >= 70 && attendancePercentage >= 75) {
    return "Good";
  }

  if (averageMarks >= 50 && attendancePercentage >= 60) {
    return "Average";
  }

  return "Needs Improvement";
}

export function generateStudyRecommendation(
  courseCode: string,
  courseName: string,
  averageMarks: number,
  attendancePercentage: number
): StudyRecommendation {
  const performanceLevel = analyzePerformance(
    averageMarks,
    attendancePercentage
  );

  let priority: "High" | "Medium" | "Low";

  if (performanceLevel === "Needs Improvement") {
    priority = "High";
  } else if (performanceLevel === "Average") {
    priority = "Medium";
  } else {
    priority = "Low";
  }

  const searchCourse = encodeURIComponent(courseName);

  return {
    courseCode,
    courseName,
    performance: Math.round(averageMarks),
    priority,

    topics: [
      `${courseName} fundamentals`,
      `${courseName} important concepts`,
      `${courseName} problem solving`,
    ],

    resources: [
      {
        type: "Video",
        title: `${courseName} Video Lessons`,
        url: `https://www.youtube.com/results?search_query=${searchCourse}+tutorial`,
      },
      {
        type: "Study Material",
        title: `${courseName} Study Materials`,
        url: `https://www.google.com/search?q=${searchCourse}+study+materials`,
      },
      {
        type: "Practice",
        title: `${courseName} Practice Questions`,
        url: `https://www.google.com/search?q=${searchCourse}+practice+questions`,
      },
    ],
  };
}