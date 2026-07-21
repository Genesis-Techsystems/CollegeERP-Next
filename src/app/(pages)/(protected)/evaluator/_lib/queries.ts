// Typed react-query hooks for the evaluator read-path.
// Aggregation/flatten logic is ported faithfully from the Angular components:
//   - evaluation-dashboard.component.ts (subject aggregation)
//   - evaluator-assigned-answer-papers.component.ts (getAnswerPaper flatten + sort)

import { useQuery } from "@tanstack/react-query";
import { apiGet, apiGetText, apiProc } from "./api-client";
import { S_GET_EXAMQUESTIONPAPER_DETAILS_NEW } from "./eval-proc-template";
import {
  EvaluatorDetailsDataSchema,
  AnswerPapersDataSchema,
  GeneralSettingDataSchema,
  EvaluationProcResultSchema,
  type EvaluatorSubjectRow,
  type AnswerPaperRow,
  type AssignmentMeta,
  type EvalQuestion,
} from "./api-types";

// Log a parse mismatch at most once per schema.
const loggedMismatches = new Set<string>();
function logMismatchOnce(scope: string, error: unknown): void {
  if (loggedMismatches.has(scope)) return;
  loggedMismatches.add(scope);
  console.warn(`[queries] ${scope} response did not match schema; using raw payload.`, error);
}

/* ------------------------------------------------------------------ *
 * useEvaluatorSubjects — GET getevaluatordetails, aggregated rows
 * ------------------------------------------------------------------ */

function aggregateEvaluatorSubjects(rawData: any): EvaluatorSubjectRow[] {
  const parsed = EvaluatorDetailsDataSchema.safeParse(rawData);
  const data = parsed.success ? parsed.data : rawData;
  if (!parsed.success) logMismatchOnce("getevaluatordetails", parsed.error);

  const profileDetails: any[] = data?.exam_evaluator_profileDetails ?? [];
  const subjectDetails: any[] = data?.subject_details ?? [];
  const profilesDetails: any = data?.exam_evaluatorProfiles_details ?? {};

  const rows: EvaluatorSubjectRow[] = [];
  for (let i = 0; i < subjectDetails.length; i++) {
    const matches = profileDetails.filter(
      (x: any) => x.subjectCode === subjectDetails[i].subjectCode,
    );
    let ettdID: any = "";
    let sa = 0;
    let ec = 0;
    let ep = 0;
    let vsd: any;
    let ved: any;
    for (let j = 0; j < matches.length; j++) {
      const sa1 = matches[j]?.noOfStudentsAssigned == null ? 0 : matches[j].noOfStudentsAssigned;
      const ec1 =
        matches[j]?.noOfEvaluationsCompleted == null ? 0 : matches[j].noOfEvaluationsCompleted;
      // Angular assigns the same field in both branches — effectively the last match's id.
      ettdID = matches[j]?.examEvaluatorProfileDetId;
      sa = sa + sa1;
      ec = ec + ec1;
      ep = sa - ec;
      vsd = matches[j]?.validityStartDate;
      ved = matches[j]?.validityEndDate;
    }
    if (sa !== 0) {
      rows.push({
        examEvaluatorProfileDetId: ettdID,
        validityStartDate: vsd,
        validityEndDate: ved,
        noOfStudentsAssigned: sa,
        noOfEvaluationsCompleted: ec,
        evaluationsPending: ep,
        courseName: subjectDetails[i]?.courseName,
        subjectName: subjectDetails[i]?.subjectName,
        subjectCode: subjectDetails[i]?.subjectCode,
        examEvaluatorProfileId: profilesDetails?.examEvaluatorProfileId,
      });
    }
  }
  return rows;
}

export function useEvaluatorSubjects(userId?: string) {
  return useQuery({
    queryKey: ["evaluatorSubjects", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EvaluatorSubjectRow[]> => {
      const res = await apiGet<any>("getevaluatordetails", "", [
        { paramName: "userId=", paramValue: userId },
      ]);
      return aggregateEvaluatorSubjects(res?.data);
    },
  });
}

/* ------------------------------------------------------------------ *
 * useAssignedPapers — GET getstudentanswerpapers, flattened + sorted rows
 * ------------------------------------------------------------------ */

function flattenAnswerPapers(rawData: any): AnswerPaperRow[] {
  const parsed = AnswerPapersDataSchema.safeParse(rawData);
  const data: any[] = parsed.success ? parsed.data : Array.isArray(rawData) ? rawData : [];
  if (!parsed.success && Array.isArray(rawData)) logMismatchOnce("getstudentanswerpapers", parsed.error);

  const rows: AnswerPaperRow[] = [];
  for (let i = 0; i < data.length; i++) {
    const assignment = data[i]?.exam_evauation_assignment_details ?? {};
    const paper = data[i]?.exam_std_answer_paper_details ?? {};
    // Angular parity: when studentAnswerPath is null the status id becomes the 'Path' sentinel.
    const evaluationStatusCatDetId =
      paper?.studentAnswerPath == null ? "Path" : assignment?.evaluationStatusCatDetId;
    rows.push({
      examEvaluationAssignmentId: assignment?.examEvaluationAssignmentId,
      studentAnswerPaperId: assignment?.studentAnswerPaperId,
      studentAnswerPath: paper?.studentAnswerPath,
      omrSerialNo: paper?.omrSerialNo,
      evaluatedTotalMarks: assignment?.evaluatedTotalMarks,
      answerSheetCheckDate: assignment?.answerSheetCheckDate,
      evaluatedAnswerPaperPath: assignment?.evaluatedAnswerPaperPath,
      evaluationStatusCatDetId,
      evaluationStatusCatDetCode: assignment?.evaluationStatusCatDetCode,
    });
  }
  // InProgress (628) papers float to the top; the rest follow ascending by status.
  const rank = (v: any) => (Number(v) === 628 ? 0 : 1);
  rows.sort((a, b) => {
    const ra = rank(a.evaluationStatusCatDetId);
    const rb = rank(b.evaluationStatusCatDetId);
    if (ra !== rb) return ra - rb;
    return (Number(a.evaluationStatusCatDetId) || 0) - (Number(b.evaluationStatusCatDetId) || 0);
  });
  return rows;
}

export function useAssignedPapers(profileId?: string, profileDetId?: string) {
  return useQuery({
    queryKey: ["assignedPapers", profileId, profileDetId],
    enabled: !!profileId && !!profileDetId,
    queryFn: async (): Promise<AnswerPaperRow[]> => {
      const res = await apiGet<any>("getstudentanswerpapers", "", [
        { paramName: "examEvaluatorProfileId=", paramValue: profileId },
        { paramName: "&examEvaluatorProfileDetId=", paramValue: profileDetId },
      ]);
      return flattenAnswerPapers(res?.data);
    },
  });
}

/* ------------------------------------------------------------------ *
 * useEvalPdfStartEndSetting — GET GeneralSetting settingValue
 * ------------------------------------------------------------------ */

export function useEvalPdfStartEndSetting() {
  return useQuery({
    queryKey: ["evalPdfStartEndSetting"],
    queryFn: async (): Promise<string | null> => {
      const res = await apiGet<any>("GeneralSetting", "domain/list/", [
        { paramName: "size=", paramValue: "99999" },
        { paramName: "&query=settingCode==", paramValue: "EVALPDFSTARTEND" },
      ]);
      const parsed = GeneralSettingDataSchema.safeParse(res?.data);
      const data = parsed.success ? parsed.data : res?.data;
      if (!parsed.success) logMismatchOnce("GeneralSetting", parsed.error);
      const list = data?.resultList ?? [];
      return list.length > 0 ? (list[0]?.settingValue ?? null) : null;
    },
  });
}

/* ------------------------------------------------------------------ *
 * useAnswerSheetPdf — GET sheetData → base64 PDF string (Angular getPdfPath)
 * ------------------------------------------------------------------ */

export function useAnswerSheetPdf(studentAnswerPaperId?: string | number) {
  return useQuery({
    queryKey: ["answerSheetPdf", studentAnswerPaperId],
    enabled: studentAnswerPaperId != null && studentAnswerPaperId !== "",
    // The scanned sheet never changes in-session; never refetch/churn (a background
    // refetch of the 5+ MB base64 would cancel the in-flight PDF render).
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<string> => {
      // Endpoint returns text; JSON.parse → { success, message: <base64 pdf> }.
      const text = await apiGetText("sheetData", "", [
        { paramName: "id=", paramValue: studentAnswerPaperId },
      ]);
      let result: { success?: boolean; message?: string };
      try {
        result = JSON.parse(text);
      } catch {
        return "";
      }
      // Angular: on success uses result.message; empty message → "no paper to load".
      return result?.success && typeof result.message === "string" ? result.message : "";
    },
  });
}

/* ------------------------------------------------------------------ *
 * useQuestionPaperPdf — GET downloadQPAndAnswerSheet → question-paper base64
 * (Angular getModelPath, type 'QP'). Fetched on demand (when the dialog opens).
 * ------------------------------------------------------------------ */

export function useQuestionPaperPdf(
  questionPaperId?: string | number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["questionPaperPdf", questionPaperId],
    enabled: enabled && questionPaperId != null && questionPaperId !== "",
    queryFn: async (): Promise<string> => {
      const text = await apiGetText("downloadQPAndAnswerSheet", "", [
        { paramName: "id=", paramValue: questionPaperId },
      ]);
      let result: { data?: { questionPaperBase64?: string } };
      try {
        result = JSON.parse(text);
      } catch {
        return "";
      }
      const b64 = result?.data?.questionPaperBase64;
      return typeof b64 === "string" ? b64 : "";
    },
  });
}

/* ------------------------------------------------------------------ *
 * useEvaluationData — stored-proc questions + marks + assignment meta
 * (Angular getQuestionsAnnotations, list_exam_questionpaper_draftmarks_new)
 * ------------------------------------------------------------------ */

/** A mark previously saved on the answer sheet (from the proc's mbtn_* columns). */
export type SavedMark = {
  page: number;
  x: number;
  y: number;
  qid: string;
  mark: string | number;
};

export type EvaluationData = {
  assignment: AssignmentMeta | null;
  questions: EvalQuestion[];
  qpTotalMarks: number;
  /** Marks already saved for this paper, for rendering as badges on load. */
  savedMarks: SavedMark[];
};

function mapEvaluationData(rawData: any): EvaluationData {
  const parsed = EvaluationProcResultSchema.safeParse(rawData);
  const data: any = parsed.success ? parsed.data : rawData;
  if (!parsed.success) logMismatchOnce("s_get_examquestionpaper_details", parsed.error);

  const rows: any[] = data?.result?.[0] ?? [];
  const assignment: AssignmentMeta | null = data?.result?.[1]?.[0] ?? null;

  const questions: EvalQuestion[] = rows.map((x: any) => ({
    questionPaperMarksId: x?.pk_questionpaper_marks_id,
    qno: x?.questionnumber,
    qvalue: x?.questioncode,
    question: x?.question,
    questionMarks: x?.max_question_marks,
    level1No: x?.lvl,
    groupNo: x?.grp,
    answeredMarks: x?.evaluated_marks != null ? Number(x.evaluated_marks) : 0,
    calculated_total_marks: x?.calculated_total_marks != null ? Number(x.calculated_total_marks) : 0,
    isNotAnswered: x?.isnotans_pk_std_evaluationpage_id != null,
    rgb_color: x?.rgb_color,
  }));

  const qpTotalMarks =
    assignment?.questionpaper_total_marks != null ? Number(assignment.questionpaper_total_marks) : 0;

  // Previously-saved mark badges (the mbtn_* annotation columns).
  const savedMarks: SavedMark[] = [];
  for (const x of rows) {
    if (x?.mbtn_pk_std_evaluationpage_id == null) continue;
    const page = Number(x?.mbtn_pagenumber);
    if (!Number.isFinite(page)) continue;
    savedMarks.push({
      page,
      x: Number(x?.mbtn_x_axis) || 0,
      y: Number(x?.mbtn_y_axis) || 0,
      qid: String(x?.questioncode ?? ""),
      mark: x?.mbtn_iconvalue ?? "",
    });
  }

  return { assignment, questions, qpTotalMarks, savedMarks };
}

export function useEvaluationData(examEvaluationAssignmentId?: string | number) {
  return useQuery({
    queryKey: ["evaluationData", examEvaluationAssignmentId],
    enabled: examEvaluationAssignmentId != null && examEvaluationAssignmentId !== "",
    // Refreshed explicitly (refetch) after each mark save; no auto-refetch churn.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<EvaluationData> => {
      const res = await apiProc<any>(
        "getAllRecords/s_get_examquestionpaper_details",
        S_GET_EXAMQUESTIONPAPER_DETAILS_NEW,
        [
          { procKey: "in_flag", procValue: "list_exam_questionpaper_draftmarks_new" },
          { procKey: "in_orgid", procValue: 1 },
          { procKey: "in_exam_evaluationassignment_id", procValue: examEvaluationAssignmentId },
        ],
      );
      return mapEvaluationData(res?.data);
    },
  });
}
