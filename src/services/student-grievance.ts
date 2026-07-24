/**
 * Student grievances — Angular `student-grevievances-and-feedback/new-grievance`.
 * Uses existing GRIEVANCE_API / WORKFLOW_API / GM_CODES via domain + post helpers.
 */

import {
  DASHBOARD_API,
  FEEDBACK_API,
  GRIEVANCE_API,
  WORKFLOW_API,
} from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  postDetailsEnvelope,
  uploadFile,
} from "@/services/crud";
import { listGeneralDetailsByCode } from "@/services/student-information";

type AnyRow = Record<string, unknown>;

function asRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.result)) {
      const first = obj.result[0];
      if (Array.isArray(first)) return first as AnyRow[];
      return obj.result as AnyRow[];
    }
  }
  return [];
}

/** Angular `listDetailsById(Complaint, studentId, 'StudentDetail.studentId')`. */
export async function listStudentGrievances(
  studentId: number,
): Promise<AnyRow[]> {
  if (!studentId) return [];
  return domainList<AnyRow>(
    GRIEVANCE_API.COMPLAINT,
    buildQuery({ "StudentDetail.studentId": studentId }),
  );
}

/** Angular `listDetailsById(Complaint, complaintId, 'complaintId')`. */
export async function getGrievanceById(
  complaintId: number,
): Promise<AnyRow | null> {
  if (!complaintId) return null;
  const rows = await domainList<AnyRow>(
    GRIEVANCE_API.COMPLAINT,
    buildQuery({ complaintId }),
  );
  return rows[0] ?? null;
}

/** Angular `listDetailsById(GrievanceCategory, 'true', isActive)`. */
export async function listGrievanceCategories(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    GRIEVANCE_API.CATEGORY,
    buildQuery({ isActive: true }),
  );
}

/** Angular `listAllDetails(GrievanceCommittee)`. */
export async function listGrievanceCommittees(): Promise<AnyRow[]> {
  return domainList<AnyRow>(GRIEVANCE_API.COMMITTEE, buildQuery({}));
}

/** Angular `listDetailsById(ComplaintsList, categoryId, 'GrievanceCategory.categoryId')`. */
export async function listComplaintTypesByCategory(
  categoryId: number,
): Promise<AnyRow[]> {
  if (!categoryId) return [];
  return domainList<AnyRow>(
    GRIEVANCE_API.COMPLAINTS_LIST,
    buildQuery({ "GrievanceCategory.categoryId": categoryId }),
  );
}

/** Angular `listDetailsByTwoIds(WorkflowStage, 'COMPLAINT', 'true', 'wfForCode', isActive)`. */
export async function listComplaintWorkflowStages(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    WORKFLOW_API.WORKFLOW_STAGE,
    buildQuery({ wfForCode: "COMPLAINT", isActive: true }),
  );
}

/** Angular general details for grievance hierarchy codes (UNVSR / CLG / DEPT). */
export async function listGrievanceHierarchyCats(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.GRIEVANCE) as Promise<AnyRow[]>;
}

/** Angular `POST complaint`. Returns created complaintId from `data`. */
export async function createComplaint(payload: AnyRow): Promise<{
  complaintId: number | string;
  message?: string;
}> {
  const envelope = await postDetailsEnvelope<number | string>(
    GRIEVANCE_API.COMPLAINT_POST,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to create grievance");
  }
  return {
    complaintId: envelope.data as number | string,
    message: envelope.message,
  };
}

/** Angular `POST complaintreopen`. */
export async function reopenComplaint(
  payload: AnyRow,
): Promise<string | undefined> {
  const envelope = await postDetailsEnvelope(
    GRIEVANCE_API.COMPLAINT_REOPEN,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to reopen grievance");
  }
  return envelope.message;
}

/** Angular close grievance — `POST complaint` with updated row. */
export async function updateComplaint(
  payload: AnyRow,
): Promise<string | undefined> {
  const envelope = await postDetailsEnvelope(
    GRIEVANCE_API.COMPLAINT_POST,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to update grievance");
  }
  return envelope.message;
}

/** Angular `updateDetails(ComplaintsWf, …, grvWfId)`. */
export async function updateComplaintWorkflow(row: AnyRow): Promise<void> {
  const grvWfId = Number(row.grvWfId ?? 0);
  if (!grvWfId) throw new Error("Missing workflow id");
  await domainUpdate(GRIEVANCE_API.COMPLAINTS_WF, "grvWfId", grvWfId, row);
}

/** Angular `upload(complaintupload, FormData)`. */
export async function uploadComplaintDoc(
  complaintId: number | string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("complaintId", String(complaintId));
  formData.append("complaintDoc", file, file.name);
  await uploadFile(GRIEVANCE_API.COMPLAINT_UPLOAD, formData);
}

/** Angular `addDetails(ComplaintDetail, msg)`. */
export async function createComplaintDetail(payload: AnyRow): Promise<void> {
  await domainCreate(GRIEVANCE_API.COMPLAINT_DETAIL, payload);
}

// ─── Student survey feedback (same Angular module) ───────────────────────────

/** Angular `listByThreeIds(surveyformdetailsbyenddate, Students, collegeId, true, …)`. */
export async function listStudentSurveyForms(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  const data = await fetchDetails<unknown>(FEEDBACK_API.GET_SURVEY_FORM, {
    fbfromCode: "Students",
    collegeId,
    isActive: "true",
  });
  return asRows(data);
}

/**
 * Angular `listBySevenIds(s_get_survey_status, …)` for lecturer feedback rows.
 * Returns `data.result[0]` when present.
 */
export async function listSurveyStatusEmployees(params: {
  surveyFormId: number;
  studentId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { surveyFormId, studentId, academicYearId, groupSectionId } = params;
  if (!surveyFormId || !studentId || !groupSectionId) return [];
  const data = await getAllRecords<{ result?: unknown[] } | unknown>(
    DASHBOARD_API.GET_SURVEY_STATUS,
    {
      in_falg: "",
      in_survey_form_id: surveyFormId,
      in_studentId: studentId,
      in_academicYearId: academicYearId,
      in_group_sectionId: groupSectionId,
      in_emp_id: 0,
      in_not_complete: -1,
    },
  );
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { result?: unknown }).result)
  ) {
    const result = (data as { result: unknown[] }).result;
    const first = result[0];
    if (Array.isArray(first)) return first as AnyRow[];
    return result as AnyRow[];
  }
  return asRows(data);
}

/** Angular `listDetailsById(SurveyForm, surveyFormId, 'surveyFormId')`. */
export async function getSurveyFormById(
  surveyFormId: number,
): Promise<AnyRow | null> {
  if (!surveyFormId) return null;
  const rows = await domainList<AnyRow>(
    FEEDBACK_API.SURVEY_FORM,
    buildQuery({ surveyFormId }),
  );
  return rows[0] ?? null;
}

/**
 * Angular `listDetailsByFourIds(SurveyFeedback, surveyFormId, studentId, empId, subjectId, …)`.
 */
export async function listSurveyFeedbackForStudent(params: {
  surveyFormId: number;
  studentId: number;
  employeeId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  const { surveyFormId, studentId, employeeId, subjectId } = params;
  if (!surveyFormId || !studentId) return [];
  return domainList<AnyRow>(
    FEEDBACK_API.SURVEY_FEEDBACK_LIST,
    buildQuery({
      "surveyForm.surveyFormId": surveyFormId,
      "fromStudentDetail.studentId": studentId,
      "forEmployeeDetail.employeeId": employeeId,
      "subject.subjectId": subjectId,
    }),
  );
}

/** Angular `listDetailsById(SurveyFeedbackDetail, surveryFbId, 'surveyFeedback.surveryFbId')`. */
export async function listSurveyFeedbackDetails(
  surveryFbId: number,
): Promise<AnyRow[]> {
  if (!surveryFbId) return [];
  return domainList<AnyRow>(
    FEEDBACK_API.SURVEY_FEEDBACK_DETAIL,
    buildQuery({ "surveyFeedback.surveryFbId": surveryFbId }),
  );
}

/** Angular `POST surveyfeedback`. */
export async function submitSurveyFeedback(
  payload: AnyRow,
): Promise<string | undefined> {
  const envelope = await postDetailsEnvelope(
    FEEDBACK_API.SURVEY_FEEDBACK,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to submit feedback");
  }
  return envelope.message;
}

/** Convenience — postDetails without envelope when caller only needs throw-on-fail. */
export async function postSurveyFeedback(payload: AnyRow): Promise<unknown> {
  return postDetails(FEEDBACK_API.SURVEY_FEEDBACK, payload);
}
