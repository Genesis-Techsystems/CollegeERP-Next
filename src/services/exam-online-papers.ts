/**
 * Angular `staff-examinations/exam-online-paper` (OnlineExamsComponent) API parity.
 */
import { EXAM_ONLINE_API } from "@/config/constants/api";
import {
  domainList,
  postDetailsEnvelope,
} from "./crud";
import { buildQuery } from "./query";
import {
  formatClassDateYmdSlash,
  getStaffSubjectsForToday,
  type StaffSubjectClass,
} from "./staff-dashboard";

export type ExamOnlinePaperRow = Record<string, unknown> & {
  examOnlinePaperId?: number;
  paperName?: string;
  setno?: number | string;
  preparedOn?: string;
  examPaperUrl?: string | null;
  isPublished?: boolean;
  exampapertypeCatdetCode?: string;
  exampapertypeCatdetName?: string;
  examOnlineQuestionDTOS?: Record<string, unknown>[];
  examId?: number;
};

export type ExamMasterOnlineRow = Record<string, unknown> & {
  examId?: number;
  examName?: string;
  fromDate?: string;
  toDate?: string;
  isInternalExam?: boolean;
  isRegularExam?: boolean;
  isSupplyExam?: boolean;
};

/** Angular `staffSubjects?employeeId=&status=true&classDate=YYYY/MM/DD`. */
export async function listStaffCoursesForExamOnlinePapers(
  employeeId: number,
): Promise<StaffSubjectClass[]> {
  return getStaffSubjectsForToday({
    employeeId,
    classDate: formatClassDateYmdSlash(),
  });
}

/**
 * Angular ExamMaster:
 * Course.courseId + AcademicYear.academicYearId + isActive + isInternalExam, createdDt DESC.
 */
export async function listInternalExamsForOnlinePapers(params: {
  courseId: number;
  academicYearId: number;
}): Promise<ExamMasterOnlineRow[]> {
  return domainList<ExamMasterOnlineRow>(
    "ExamMaster",
    buildQuery(
      {
        "Course.courseId": params.courseId,
        "AcademicYear.academicYearId": params.academicYearId,
        isActive: true,
        isInternalExam: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/**
 * Angular ExamOnlinePaper:
 * College.collegeId + examMaster.examId + preparedbyEmpId.employeeId
 */
export async function listExamOnlinePapers(params: {
  collegeId: number;
  examId: number;
  employeeId: number;
}): Promise<ExamOnlinePaperRow[]> {
  const rows = await domainList<ExamOnlinePaperRow>(
    EXAM_ONLINE_API.EXAM_ONLINE_PAPER,
    buildQuery({
      "College.collegeId": params.collegeId,
      "examMaster.examId": params.examId,
      "preparedbyEmpId.employeeId": params.employeeId,
    }),
  );

  return rows.map((paper) => {
    const ques = Array.isArray(paper.examOnlineQuestionDTOS)
      ? paper.examOnlineQuestionDTOS
      : [];
    const activeQues = ques.filter((q) => Boolean(q?.isActive));
    return { ...paper, examOnlineQuestionDTOS: activeQues };
  });
}

/** Angular POST `examOnline/publishExam`. */
export async function publishExamOnlinePaper(
  row: ExamOnlinePaperRow,
): Promise<{ success: boolean; message?: string }> {
  const envelope = await postDetailsEnvelope(
    EXAM_ONLINE_API.PUBLISH_EXAM,
    row,
  );
  return {
    success: Boolean(envelope.success),
    message: envelope.message,
  };
}
