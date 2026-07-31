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
  GeneralDetailDataSchema,
  EvaluationProcResultSchema,
  type EvaluatorSubjectRow,
  type EvaluatorSubjectsSplit,
  type AnswerPaperRow,
  type AssignmentMeta,
  type EvalQuestion,
  type GeneralDetail,
} from "./api-types";

// Log a parse mismatch at most once per schema.
const loggedMismatches = new Set<string>();
function logMismatchOnce(scope: string, error: unknown): void {
  if (loggedMismatches.has(scope)) return;
  loggedMismatches.add(scope);
  console.warn(`[queries] ${scope} response did not match schema; using raw payload.`, error);
}

/** Angular evaluatorRoleId for Evaluator role (Moderator / other roles ≠ 64). */
const EVALUATOR_ROLE_ID = 64;

function toBool(v: unknown): boolean {
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  return false;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Angular evaluation-subjects-list `EvaluatorDetails()`:
 * enrich profile details with courseName, then split by evaluatorRoleId / isReEvaluation.
 */
function splitEvaluatorSubjects(rawData: any): EvaluatorSubjectsSplit {
  const parsed = EvaluatorDetailsDataSchema.safeParse(rawData);
  const data = parsed.success ? parsed.data : rawData;
  if (!parsed.success) logMismatchOnce("getevaluatordetails", parsed.error);

  const profileDetails: any[] = Array.isArray(data?.exam_evaluator_profileDetails)
    ? data.exam_evaluator_profileDetails
    : [];
  const subjectDetails: any[] = Array.isArray(data?.subject_details) ? data.subject_details : [];
  const profilesDetails: any = data?.exam_evaluatorProfiles_details ?? {};

  const enriched = profileDetails.map((ev: any) => {
    const subject =
      subjectDetails.find(
        (s: any) =>
          Number(s?.subjectId ?? s?.subject_id) === Number(ev?.subjectId ?? ev?.subject_id) ||
          String(s?.subjectCode ?? "") === String(ev?.subjectCode ?? ""),
      ) ?? null;
    const assigned = numOrNull(ev?.noOfStudentsAssigned);
    const completed = numOrNull(ev?.noOfEvaluationsCompleted);
    const pending =
      assigned != null && completed != null ? assigned - completed : null;
    return {
      examEvaluatorProfileId:
        ev?.examEvaluatorProfileId ?? profilesDetails?.examEvaluatorProfileId ?? null,
      examEvaluatorProfileDetId: ev?.examEvaluatorProfileDetId ?? null,
      subjectId: ev?.subjectId ?? null,
      subjectName: ev?.subjectName ?? subject?.subjectName ?? null,
      subjectCode: ev?.subjectCode ?? subject?.subjectCode ?? null,
      courseName: subject?.courseName ?? ev?.courseName ?? "-",
      noOfStudentsAssigned: assigned,
      noOfEvaluationsCompleted: completed,
      evaluationsPending: pending,
      rejectedCount: numOrNull(ev?.rejectedCount),
      validityStartDate: ev?.validityStartDate ?? null,
      validityEndDate: ev?.validityEndDate ?? null,
      evaluatorRoleId: numOrNull(ev?.evaluatorRoleId ?? ev?.evaluator_role_id),
      isReEvaluation: toBool(ev?.isReEvaluation ?? ev?.is_re_evaluation),
      examId: ev?.examId ?? null,
      maxNoOfEvaluationsAssign: numOrNull(ev?.maxNoOfEvaluationsAssign),
      maxNoOfReevaluationsAssign: numOrNull(ev?.maxNoOfReevaluationsAssign),
    } satisfies EvaluatorSubjectRow;
  });

  const evaluatorDetails = enriched.filter((x) => Number(x.evaluatorRoleId) === EVALUATOR_ROLE_ID);
  const moderator = enriched.filter((x) => Number(x.evaluatorRoleId) !== EVALUATOR_ROLE_ID);
  const evaluation = evaluatorDetails.filter((x) => !x.isReEvaluation);
  const reEvaluation = evaluatorDetails.filter((x) => !!x.isReEvaluation);

  if (typeof window !== "undefined" && profilesDetails?.email) {
    try {
      localStorage.setItem("email", String(profilesDetails.email));
    } catch {
      /* ignore */
    }
  }

  return { evaluation, reEvaluation, moderator };
}

export function useEvaluatorSubjects(userId?: string) {
  return useQuery({
    queryKey: ["evaluatorSubjects", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EvaluatorSubjectsSplit> => {
      const res = await apiGet<any>("getevaluatordetails", "", [
        { paramName: "userId=", paramValue: userId },
      ]);
      return splitEvaluatorSubjects(res?.data);
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

export function useAssignedPapers(
  profileId?: string,
  profileDetId?: string,
  opts?: { isValidator?: boolean },
) {
  const isValidator = !!opts?.isValidator;
  return useQuery({
    queryKey: ["assignedPapers", profileId, profileDetId, isValidator],
    enabled: isValidator ? !!profileDetId : !!profileId && !!profileDetId,
    queryFn: async (): Promise<AnswerPaperRow[]> => {
      if (isValidator) {
        return fetchModeratorAssignedPapers(profileDetId!);
      }
      const res = await apiGet<any>("getstudentanswerpapers", "", [
        { paramName: "examEvaluatorProfileId=", paramValue: profileId },
        { paramName: "&examEvaluatorProfileDetId=", paramValue: profileDetId },
      ]);
      return flattenAnswerPapers(res?.data);
    },
  });
}

/**
 * Angular evaluator-assigned-anspapers-moderation `getAnswerPaper()`:
 * getAllRecords/s_get_examevaluation_bycodes with in_flag=moderation_assignments
 * and in_evalutor_profileid = examEvaluatorProfileDetId.
 */
async function fetchModeratorAssignedPapers(profileDetId: string): Promise<AnswerPaperRow[]> {
  const orgId = Number(globalThis?.localStorage?.getItem("organizationId") ?? 0);
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
  const res = await apiGet<any>("getAllRecords/s_get_examevaluation_bycodes", "", [
    { paramName: "in_flag=", paramValue: "moderation_assignments" },
    { paramName: "&in_orgid=", paramValue: orgId },
    { paramName: "&in_fdate=", paramValue: "1990-01-01" },
    { paramName: "&in_tdate=", paramValue: "1990-01-01" },
    { paramName: "&in_evalutor_profileid=", paramValue: profileDetId },
    { paramName: "&in_exam_date=", paramValue: "1990-01-01" },
    { paramName: "&in_emp_id=", paramValue: 0 },
    { paramName: "&in_questionpaper_id=", paramValue: 0 },
    { paramName: "&in_evaluator_role_id=", paramValue: 0 },
    { paramName: "&in_academic_year=", paramValue: "" },
    { paramName: "&in_exam_short_name=", paramValue: "" },
    { paramName: "&in_affiliatedto_catdet_id=", paramValue: 0 },
    { paramName: "&in_exam_id=", paramValue: 0 },
    { paramName: "&in_course_year_id=", paramValue: 0 },
    { paramName: "&in_subject_id=", paramValue: 0 },
    { paramName: "&in_regulation_id=", paramValue: 0 },
    { paramName: "&in_course_id=", paramValue: 0 },
    { paramName: "&in_academic_year_id=", paramValue: 0 },
    { paramName: "&in_loginuser_empid=", paramValue: empId },
  ]);
  const rows: any[] = Array.isArray(res?.data?.result?.[0]) ? res.data.result[0] : [];
  const mapped: AnswerPaperRow[] = rows.map((row) => {
    const statusId = row?.fk_evaluationstatus_catdet_id ?? null;
    // Angular paper?prevEvaluatorAnswerPath=row.prev_evaluator_answerpath
    const prevPath =
      row?.prev_evaluator_answerpath ??
      row?.prevEvaluatorAnswerPath ??
      row?.evaluated_answerpaper_path ??
      row?.evaluatedAnswerPaperPath ??
      null;
    return {
      examEvaluationAssignmentId:
        row?.pk_exam_evaluationassignment_id ?? row?.examEvaluationAssignmentId ?? null,
      studentAnswerPaperId: row?.fk_std_answerpaper_id ?? row?.studentAnswerPaperId ?? null,
      studentAnswerPath: row?.studentanswer_path ?? row?.studentAnswerPath ?? null,
      omrSerialNo: row?.omr_serial_no ?? row?.omrSerialNo ?? null,
      evaluatedTotalMarks: row?.evaluatedTotalMarks ?? row?.evaluated_totalmarks ?? null,
      prevEvaluatorTotalMarks:
        row?.prev_evaluator_totalmarks ?? row?.prevEvaluatorTotalMarks ?? null,
      answerSheetCheckDate: row?.answerSheetCheckDate ?? row?.answer_sheet_check_date ?? null,
      evaluatedAnswerPaperPath:
        row?.evaluatedAnswerPaperPath ?? row?.evaluated_answerpaper_path ?? null,
      prevEvaluatorAnswerPath: prevPath != null && String(prevPath).trim() !== "" ? String(prevPath) : null,
      evaluationStatusCatDetId: statusId,
      evaluationStatusCatDetCode: statusCodeFromId(statusId),
    };
  });
  mapped.sort(
    (a, b) =>
      (Number(a.evaluationStatusCatDetId) || 0) - (Number(b.evaluationStatusCatDetId) || 0),
  );
  return mapped;
}

function statusCodeFromId(id: unknown): string | null {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const map: Record<number, string> = {
    626: "Assigned",
    627: "Assigned",
    628: "InProgress",
    629: "Evaluated",
    630: "Approved",
    631: "Finalized",
    632: "Rejected",
  };
  return map[n] ?? null;
}

/**
 * Angular answerPaper() — next Assigned/InProgress script for Finish & Next,
 * excluding the paper just completed.
 */
export async function fetchNextAssignablePaper(
  profileId: string | number,
  profileDetId: string | number,
  excludeStudentAnswerPaperId?: string | number | null,
): Promise<AnswerPaperRow | null> {
  const res = await apiGet<any>("getstudentanswerpapers", "", [
    { paramName: "examEvaluatorProfileId=", paramValue: profileId },
    { paramName: "&examEvaluatorProfileDetId=", paramValue: profileDetId },
  ]);
  const rows = flattenAnswerPapers(res?.data);
  const exclude = excludeStudentAnswerPaperId != null ? String(excludeStudentAnswerPaperId) : null;
  const next = rows.find((r) => {
    const code = String(r.evaluationStatusCatDetCode ?? "");
    if (code !== "Assigned" && code !== "InProgress") return false;
    if (exclude != null && String(r.studentAnswerPaperId ?? "") === exclude) return false;
    return true;
  });
  return next ?? null;
}

/* ------------------------------------------------------------------ *
 * MarksIntervals + UFMREASON — fetched once on workbench load
 * ------------------------------------------------------------------ */

export function useMarksIntervalSetting() {
  return useQuery({
    queryKey: ["marksIntervalSetting"],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<string> => {
      const res = await apiGet<any>("GeneralSetting", "domain/list/", [
        { paramName: "size=", paramValue: "99999" },
        { paramName: "&query=settingCode==", paramValue: "MarksIntervals" },
      ]);
      const parsed = GeneralSettingDataSchema.safeParse(res?.data);
      const data = parsed.success ? parsed.data : res?.data;
      if (!parsed.success) logMismatchOnce("GeneralSetting(MarksIntervals)", parsed.error);
      const list = data?.resultList ?? [];
      return list.length > 0 ? String(list[0]?.settingValue ?? "0") : "0";
    },
  });
}

/** Angular EVALPDFSTARTEND / MODLPDFSTARTEND — pages to hide on the answer PDF. */
export function useEvalPdfStartEndSetting(isValidator = false) {
  const settingCode = isValidator ? "MODLPDFSTARTEND" : "EVALPDFSTARTEND";
  return useQuery({
    queryKey: ["evalPdfStartEndSetting", settingCode],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<string | null> => {
      const res = await apiGet<any>("GeneralSetting", "domain/list/", [
        { paramName: "size=", paramValue: "99999" },
        { paramName: "&query=settingCode==", paramValue: settingCode },
      ]);
      const parsed = GeneralSettingDataSchema.safeParse(res?.data);
      const data = parsed.success ? parsed.data : res?.data;
      if (!parsed.success) logMismatchOnce(`GeneralSetting(${settingCode})`, parsed.error);
      const list = data?.resultList ?? [];
      return list.length > 0 ? (list[0]?.settingValue ?? null) : null;
    },
  });
}

/**
 * Angular `savePdfWithMasking` GeneralSetting — fetched once on evaluation load
 * (evaluator + moderator).
 * `"1"` → finish PDF keeps UI masking (skip hidden pages).
 * `"0"` → finish PDF includes every page (render masked pages off-screen).
 * Default `"1"` matches Angular when the setting is missing.
 */
export function useSavePdfWithMaskingSetting() {
  return useQuery({
    queryKey: ["savePdfWithMaskingSetting"],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<string> => {
      const res = await apiGet<any>("GeneralSetting", "domain/list/", [
        { paramName: "size=", paramValue: "99999" },
        { paramName: "&query=settingCode==", paramValue: "savePdfWithMasking" },
      ]);
      const parsed = GeneralSettingDataSchema.safeParse(res?.data);
      const data = parsed.success ? parsed.data : res?.data;
      if (!parsed.success) logMismatchOnce("GeneralSetting(savePdfWithMasking)", parsed.error);
      const list = data?.resultList ?? [];
      if (list.length > 0 && list[0]?.settingValue != null) {
        return String(list[0].settingValue);
      }
      return "1";
    },
  });
}

export function useUfmReasons() {
  return useQuery({
    queryKey: ["ufmReasons"],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<GeneralDetail[]> => {
      // Angular getUfmSettings: domain/list/GeneralDetail?size=99999&query=GeneralMaster.generalMasterCode==UFMREASON
      const res = await apiGet<any>("GeneralDetail", "domain/list/", [
        { paramName: "size=", paramValue: "99999" },
        { paramName: "&query=GeneralMaster.generalMasterCode==", paramValue: "UFMREASON" },
      ]);
      const parsed = GeneralDetailDataSchema.safeParse(res?.data);
      const data = parsed.success ? parsed.data : res?.data;
      if (!parsed.success) logMismatchOnce("GeneralDetail(UFMREASON)", parsed.error);
      const list = (data?.resultList ?? []) as Array<Record<string, unknown>>;
      // Normalize id/code so the Reject/UFM Select always has usable options.
      return list
        .map((row) => {
          const id =
            row.generalDetailId ??
            row.general_detail_id ??
            row.gd_id ??
            null;
          const code =
            row.generalDetailCode ??
            row.general_detail_code ??
            row.generalDetailDisplayName ??
            row.general_detail_display_name ??
            null;
          return {
            ...row,
            generalDetailId: id as GeneralDetail["generalDetailId"],
            generalDetailCode:
              code != null ? String(code) : (null as GeneralDetail["generalDetailCode"]),
          } as GeneralDetail;
        })
        .filter((row) => row.generalDetailId != null && row.generalDetailId !== "");
    },
  });
}

/* ------------------------------------------------------------------ *
 * useAnswerSheetPdf — Angular getPdfPath():
 *   isValidator === 'true' → GET sheetDataWithPath?path=<prevEvaluatorAnswerPath>
 *   else                   → GET sheetData?id=<studentAnswerPaperId>
 * ------------------------------------------------------------------ */

export function useAnswerSheetPdf(
  studentAnswerPaperId?: string | number,
  opts?: { isValidator?: boolean; answerPaperPath?: string | null },
) {
  const isValidator = !!opts?.isValidator;
  const answerPaperPath = String(opts?.answerPaperPath ?? "").trim();

  return useQuery({
    queryKey: [
      "answerSheetPdf",
      isValidator ? "sheetDataWithPath" : "sheetData",
      isValidator ? answerPaperPath : studentAnswerPaperId,
    ],
    enabled: isValidator
      ? answerPaperPath.length > 0
      : studentAnswerPaperId != null && studentAnswerPaperId !== "",
    // The scanned sheet never changes in-session; never refetch/churn (a background
    // refetch of the 5+ MB base64 would cancel the in-flight PDF render).
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<string> => {
      // Endpoint returns text; JSON.parse → { success, message: <base64 pdf> }.
      const text = isValidator
        ? await apiGetText("sheetDataWithPath", "", [
            { paramName: "path=", paramValue: answerPaperPath },
          ])
        : await apiGetText("sheetData", "", [
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
 * useQpOrModelAnswerPdf — GET downloadQPAndAnswerSheet?id=<questionPaperId>
 * Angular getModelPath(questionPaperId, 'QP' | 'ANS'):
 *   QP  → data.questionPaperBase64
 *   ANS → data.modelAnswerBase64
 * Param name is `id`; value is pk_exam_questionpaper_id (questionPaperId).
 * ------------------------------------------------------------------ */

export type PaperModalType = "QP" | "ANS";

export function useQpOrModelAnswerPdf(
  questionPaperId?: string | number | null,
  type: PaperModalType | null = null,
) {
  return useQuery({
    queryKey: ["downloadQPAndAnswerSheet", questionPaperId, type],
    enabled: type != null && questionPaperId != null && questionPaperId !== "",
    queryFn: async (): Promise<string> => {
      const text = await apiGetText("downloadQPAndAnswerSheet", "", [
        { paramName: "id=", paramValue: questionPaperId },
      ]);
      let result: {
        data?: { questionPaperBase64?: string; modelAnswerBase64?: string };
      };
      try {
        result = JSON.parse(text);
      } catch {
        return "";
      }
      const b64 =
        type === "ANS"
          ? result?.data?.modelAnswerBase64
          : result?.data?.questionPaperBase64;
      return typeof b64 === "string" ? b64 : "";
    },
  });
}

/** @deprecated Prefer useQpOrModelAnswerPdf(id, 'QP'). Kept for existing imports. */
export function useQuestionPaperPdf(
  questionPaperId?: string | number | null,
  enabled = true,
) {
  return useQpOrModelAnswerPdf(questionPaperId, enabled ? "QP" : null);
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
  /** Angular is_consider === 0 → gray mark on paper. */
  isConsider: boolean;
};

export type EvaluationData = {
  assignment: AssignmentMeta | null;
  questions: EvalQuestion[];
  qpTotalMarks: number;
  /** Marks already saved for this paper, for rendering as badges on load. */
  savedMarks: SavedMark[];
};

/**
 * Angular is_consider === 0 → not counted in total (gray marks).
 * Accepts 0 / "0" / false; null/undefined means considering.
 */
function readIsConsiderFlag(x: any): unknown {
  return x?.is_consider ?? x?.isConsider;
}

function isConsideringValue(raw: unknown): boolean {
  if (raw == null || raw === "") return true;
  if (raw === false || raw === "false") return false;
  return Number(raw) !== 0;
}

/**
 * The draftmarks proc JOINs annotations, so the same pk_questionpaper_marks_id
 * can appear many times. Collapse to one entry per marks id and apply Angular's
 * priority: mbtn (marks) wins over isnotans (NA). Bare join rows only refresh
 * metadata — they must not wipe marks/NA already seen on a sibling row.
 */
function collapseQuestionRows(rows: any[]): any[] {
  const byId = new Map<
    string,
    {
      row: any;
      hasMark: boolean;
      hasNa: boolean;
      evaluatedMarks: unknown;
      mbtnId: unknown;
      isnotansId: unknown;
      isConsiderRaw: unknown;
    }
  >();
  const order: string[] = [];

  for (const x of rows) {
    const id = x?.pk_questionpaper_marks_id;
    if (id == null || id === "") continue;
    const key = String(id);

    let cur = byId.get(key);
    if (!cur) {
      cur = {
        row: { ...x },
        hasMark: false,
        hasNa: false,
        evaluatedMarks: null,
        mbtnId: null,
        isnotansId: null,
        isConsiderRaw: readIsConsiderFlag(x),
      };
      byId.set(key, cur);
      order.push(key);
    } else {
      cur.row = {
        ...cur.row,
        questionnumber: x?.questionnumber ?? cur.row.questionnumber,
        questioncode: x?.questioncode ?? cur.row.questioncode,
        question: x?.question ?? cur.row.question,
        max_question_marks: x?.max_question_marks ?? cur.row.max_question_marks,
        lvl: x?.lvl ?? cur.row.lvl,
        grp: x?.grp ?? cur.row.grp,
        calculated_total_marks:
          x?.calculated_total_marks ?? cur.row.calculated_total_marks,
        rgb_color: x?.rgb_color ?? cur.row.rgb_color,
        error_message: x?.error_message ?? cur.row.error_message,
        no_action_yet: x?.no_action_yet ?? cur.row.no_action_yet,
      };
    }

    const considerRaw = readIsConsiderFlag(x);

    if (x?.mbtn_pk_std_evaluationpage_id != null) {
      // Angular: if (mbtn) → marks win; take is_consider from this row.
      cur.hasMark = true;
      cur.hasNa = false;
      const markVal = x.evaluated_marks ?? x.mbtn_iconvalue;
      if (markVal != null && markVal !== "") {
        cur.evaluatedMarks = markVal;
      } else if (cur.evaluatedMarks == null) {
        cur.evaluatedMarks = 0;
      }
      cur.mbtnId = x.mbtn_pk_std_evaluationpage_id;
      cur.isnotansId = null;
      if (considerRaw != null && considerRaw !== "") {
        cur.isConsiderRaw = considerRaw;
      }
    } else if (x?.isnotans_pk_std_evaluationpage_id != null && !cur.hasMark) {
      cur.hasNa = true;
      cur.isnotansId = x.isnotans_pk_std_evaluationpage_id;
      if (considerRaw != null && considerRaw !== "") {
        cur.isConsiderRaw = considerRaw;
      }
    } else if (
      (cur.isConsiderRaw == null || cur.isConsiderRaw === "") &&
      considerRaw != null &&
      considerRaw !== ""
    ) {
      // Bare join row — only fill is_consider if we don't have one yet.
      cur.isConsiderRaw = considerRaw;
    }
  }

  return order.map((key) => {
    const cur = byId.get(key)!;
    return {
      ...cur.row,
      mbtn_pk_std_evaluationpage_id: cur.hasMark ? cur.mbtnId : null,
      evaluated_marks: cur.hasMark ? cur.evaluatedMarks : null,
      isnotans_pk_std_evaluationpage_id: cur.hasNa ? cur.isnotansId : null,
      is_consider: cur.isConsiderRaw,
    };
  });
}

function mapEvaluationData(rawData: any): EvaluationData {
  const parsed = EvaluationProcResultSchema.safeParse(rawData);
  const data: any = parsed.success ? parsed.data : rawData;
  if (!parsed.success) logMismatchOnce("s_get_examquestionpaper_details", parsed.error);

  const rows: any[] = data?.result?.[0] ?? [];
  const assignment: AssignmentMeta | null = data?.result?.[1]?.[0] ?? null;

  // One button per questionPaperMarksId (Angular questionMarksList semantics).
  const questionRows = collapseQuestionRows(rows);

  const questions: EvalQuestion[] = questionRows.map((x: any) => {
    // Angular if/else: mbtn marks win; else isnotans → NA; never both.
    const hasMark = x?.mbtn_pk_std_evaluationpage_id != null;
    const hasNa = !hasMark && x?.isnotans_pk_std_evaluationpage_id != null;
    const rawMark = x?.evaluated_marks ?? x?.mbtn_iconvalue;
    const answeredMarks =
      hasMark && rawMark != null && rawMark !== ""
        ? Number(rawMark)
        : hasMark
          ? 0
          : 0;
    return {
      questionPaperMarksId: x?.pk_questionpaper_marks_id,
      qno: x?.questionnumber,
      qvalue: x?.questioncode,
      question: x?.question,
      questionMarks: x?.max_question_marks,
      level1No: x?.lvl,
      groupNo: x?.grp,
      answeredMarks: Number.isFinite(answeredMarks) ? answeredMarks : 0,
      hasMark,
      isConsider: isConsideringValue(readIsConsiderFlag(x)),
      calculated_total_marks:
        x?.calculated_total_marks != null ? Number(x.calculated_total_marks) : 0,
      isNotAnswered: hasNa,
      noActionYet: Number(x?.no_action_yet) === 1 ? 1 : 0,
      rgb_color: x?.rgb_color,
    };
  });

  const qpTotalMarks =
    assignment?.questionpaper_total_marks != null ? Number(assignment.questionpaper_total_marks) : 0;

  // is_consider by marks-id from the collapsed question list (authoritative).
  const considerByMarksId = new Map(
    questions.map((q) => [String(q.questionPaperMarksId), q.isConsider]),
  );

  // Previously-saved mark badges — keep every mbtn row (all annotation points).
  const savedMarks: SavedMark[] = [];
  for (const x of rows) {
    if (x?.mbtn_pk_std_evaluationpage_id == null) continue;
    const page = Number(x?.mbtn_pagenumber);
    if (!Number.isFinite(page)) continue;
    const marksId = String(x?.pk_questionpaper_marks_id ?? "");
    const fromQuestion = considerByMarksId.get(marksId);
    savedMarks.push({
      page,
      x: Number(x?.mbtn_x_axis) || 0,
      y: Number(x?.mbtn_y_axis) || 0,
      qid: String(x?.questioncode ?? ""),
      mark: x?.mbtn_iconvalue ?? x?.evaluated_marks ?? "",
      isConsider:
        fromQuestion ?? isConsideringValue(readIsConsiderFlag(x)),
    });
  }

  return { assignment, questions, qpTotalMarks, savedMarks };
}

export function useEvaluationData(
  examEvaluationAssignmentId?: string | number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["evaluationData", examEvaluationAssignmentId],
    enabled: enabled && examEvaluationAssignmentId != null && examEvaluationAssignmentId !== "",
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
