// Write helpers for the evaluation workbench — ports the Angular grading writes
// (evaluation.component.ts: addAnnotation ~1574, updateEvalAssisnmentStatus ~637,
// removeSelect ~1440, rejectSubmit ~2023, ufmSubmit ~2108, finishPaper ~1678).
//
// These are REAL writes against a live student's evaluation record. Only call them
// from a genuine evaluator action. `finalizeAndUpload` is IRREVERSIBLE (finalizes
// the paper) — gate it behind an explicit confirm.

import {
  apiPost,
  apiPostForm,
  apiProc,
  apiPut,
  apiPutBody,
  type ApiEnvelope,
  type ProcTemplateItem,
} from "./api-client";

const S_POP_PROC_URL = "getAllRecords/s_pop_exam_questionpaper_details";

/** Verbatim port of PROCCONSTANTS.s_pop_exam_questionpaper_details. */
const S_POP_EXAM_QUESTIONPAPER_DETAILS: ProcTemplateItem[] = [
  { paramName: "in_flag=", paramValue: "delete_question", id: "in_flag" },
  { paramName: "&in_exam_evaluationassignment_id=", paramValue: 0, id: "in_exam_evaluationassignment_id" },
  { paramName: "&in_questionpaper_marks_id=", paramValue: 0, id: "in_questionpaper_marks_id" },
];

type Id = number | string;

// ---- Annotation pages (mark placement + not-answered) ----------------------

/** One annotation record posted to addExamStudentEvaluationPagesList. */
export type EvaluationPageItem = {
  isActive: boolean;
  questionPaperMarksId: Id;
  iconId?: Id;
  iconValue?: string | number;
  iconType?: "questionBtn" | "marksBtn" | "iconBtn";
  pageNumber: number | null;
  x_Axis: number | null;
  y_Axis: number | null;
  marks: number | null;
  examEvaluationAssignmentId: Id;
  studentAnswerPaper: null;
  studentEvaluationPagePath: null;
  isBlankPage: boolean;
  isViewed: boolean;
  isNotAnswered: boolean;
  comments: null;
};

/** POST /cms/addExamStudentEvaluationPagesList — persist a batch of annotation items. */
export async function saveEvaluationPages(items: EvaluationPageItem[]): Promise<ApiEnvelope> {
  return apiPost("addExamStudentEvaluationPagesList", "", items);
}

/** Build a not-answered page item for a question (no coords, marks null). */
export function notAnsweredItem(
  questionPaperMarksId: Id,
  examEvaluationAssignmentId: Id,
): EvaluationPageItem {
  return {
    isActive: true,
    questionPaperMarksId,
    pageNumber: null,
    x_Axis: null,
    y_Axis: null,
    marks: null,
    examEvaluationAssignmentId,
    studentAnswerPaper: null,
    studentEvaluationPagePath: null,
    isBlankPage: false,
    isViewed: true,
    isNotAnswered: true,
    comments: null,
  };
}

// ---- Start-date stamp ------------------------------------------------------

/**
 * PUT /cms/updateExamEvaluationAssignmentsStartDate — stamp the assignment as started
 * (NewPaper/Assigned → InProgress). Fire once, on the first annotation.
 */
export async function markEvaluationStarted(
  examEvaluationAssignmentId: Id,
): Promise<ApiEnvelope> {
  return apiPutBody("updateExamEvaluationAssignmentsStartDate", {
    examEvaluationAssignmentId,
    evaluationStartDate: new Date().toISOString(),
  });
}

// ---- Delete a question's marks ---------------------------------------------

/** Proc delete_question — remove all saved annotations/marks for one question. */
export async function deleteQuestionMarks(
  examEvaluationAssignmentId: Id,
  questionPaperMarksId: Id,
): Promise<ApiEnvelope> {
  return apiProc(S_POP_PROC_URL, S_POP_EXAM_QUESTIONPAPER_DETAILS, [
    { procKey: "in_flag", procValue: "delete_question" },
    { procKey: "in_exam_evaluationassignment_id", procValue: examEvaluationAssignmentId },
    { procKey: "in_questionpaper_marks_id", procValue: questionPaperMarksId },
  ]);
}

// ---- Reject / UFM ----------------------------------------------------------

const REJECTED_STATUS = 632; // CONSTANTS.Rejected

export type RejectArgs = {
  examEvaluationAssignmentId: Id;
  omrSerialNo?: string | number | null;
  evaluationTime?: number;
  evaluatedTotalMarks?: number | null;
  evaluationStartDate?: string | null;
  reason?: string;
  ufmReasonCatDetId?: number | null;
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10); // yyyy-MM-dd
}

/** PUT domain/update/ExamEvaluationAssignments — reject (isUfm:false). */
export async function rejectEvaluation(args: RejectArgs): Promise<ApiEnvelope> {
  const dataObj = {
    evaluationStatusCatDetId: REJECTED_STATUS,
    omrSerialNo: args.omrSerialNo ?? null,
    evaluationTime: args.evaluationTime ?? 0,
    evaluatedTotalMarks: args.evaluatedTotalMarks ?? null,
    answerSheetCheckDate: todayISODate(),
    evaluationStartDate: args.evaluationStartDate ?? null,
    evaluationEndDate: todayISODate(),
    isUfm: false,
    ufmreasonCatdetId: args.ufmReasonCatDetId || null,
    ufmReason: "",
    evaluatedAnswerPaperPath: null,
    isActive: true,
    reason: args.reason ?? "",
  };
  return apiPut(
    "ExamEvaluationAssignments",
    "domain/update/",
    `query=examEvaluationAssignmentId==${args.examEvaluationAssignmentId}`,
    dataObj,
  );
}

/** PUT domain/update/ExamEvaluationAssignments — UFM (isUfm:true). */
export async function ufmEvaluation(args: RejectArgs): Promise<ApiEnvelope> {
  const dataObj = {
    evaluationStatusCatDetId: REJECTED_STATUS,
    omrSerialNo: args.omrSerialNo ?? null,
    evaluationTime: args.evaluationTime ?? 0,
    evaluatedTotalMarks: args.evaluatedTotalMarks ?? null,
    answerSheetCheckDate: todayISODate(),
    evaluationStartDate: args.evaluationStartDate ?? null,
    evaluationEndDate: todayISODate(),
    isUfm: true,
    ufmReason: args.reason ?? "",
    ufmreasonCatdetId: args.ufmReasonCatDetId || null,
    evaluatedAnswerPaperPath: null,
    isActive: true,
    reason: args.reason ?? "",
  };
  return apiPut(
    "ExamEvaluationAssignments",
    "domain/update/",
    `query=examEvaluationAssignmentId==${args.examEvaluationAssignmentId}`,
    dataObj,
  );
}

// ---- Finish: finalize marks + compose & upload the annotated PDF -----------

/**
 * PUT updateExamEvaluationAssignments — mark the paper InProgress (draft/Save & Exit).
 * Marks themselves are already persisted per-annotation; this updates the status so
 * the assigned-papers list reflects "in progress".
 */
export async function saveEvaluationDraft(
  examEvaluationAssignmentId: Id,
  evaluationTimeSec = 0,
): Promise<ApiEnvelope> {
  return apiPutBody("updateExamEvaluationAssignments", {
    examEvaluationAssignmentId,
    evaluationStatusCatDetId: 628, // CONSTANTS.InProgress
    evaluationTime: evaluationTimeSec,
  });
}

/** Proc exam_questionpaper_finalmarks_update — finalize the marks (IRREVERSIBLE). */
export async function finalizeMarks(examEvaluationAssignmentId: Id): Promise<ApiEnvelope> {
  return apiProc(S_POP_PROC_URL, S_POP_EXAM_QUESTIONPAPER_DETAILS, [
    { procKey: "in_flag", procValue: "exam_questionpaper_finalmarks_update" },
    { procKey: "in_exam_evaluationassignment_id", procValue: examEvaluationAssignmentId },
  ]);
}

/** POST saveFinalExamStdEvaluationpdf — upload the composed annotated PDF. */
export async function uploadFinalEvaluatedPdf(
  examEvaluationAssignmentId: Id,
  file: File,
): Promise<ApiEnvelope> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("examEvaluationAssignmentId", String(examEvaluationAssignmentId));
  return apiPostForm("saveFinalExamStdEvaluationpdf", fd);
}

/** PUT updateEvaluationsCompletedCount — bump the evaluator's completed counter. */
export async function updateEvaluationsCompletedCount(payload: {
  examEvaluatorProfileDetId?: Id;
  examEvaluationAssignmentId?: Id;
}): Promise<ApiEnvelope> {
  return apiPutBody("updateEvaluationsCompletedCount", payload);
}

/**
 * Compose the annotated page canvases into a PDF (pdf-lib), upload it, then run
 * the finalize proc. Page geometry matches Angular finishPaper ([300,400] page,
 * image at 10/25/280×365). IRREVERSIBLE — the finalize proc closes the paper.
 *
 * @param pageJpegs data-URL JPEGs of each page (already annotation-baked)
 */
export async function finalizeAndUpload(
  examEvaluationAssignmentId: Id,
  fileName: string,
  pageJpegs: string[],
): Promise<ApiEnvelope> {
  // pdf-lib is client-only; import lazily so it never hits the SSR bundle.
  const { PDFDocument } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  for (const dataUrl of pageJpegs) {
    const bytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
    const jpg = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([300, 400]);
    page.drawImage(jpg, { x: 10, y: 25, width: 280, height: 365 });
  }
  const pdfBytes = await pdfDoc.save();
  const file = new File([pdfBytes as BlobPart], fileName || "evaluated.pdf", {
    type: "application/pdf",
  });

  const uploadRes = await uploadFinalEvaluatedPdf(examEvaluationAssignmentId, file);
  if (!uploadRes?.success) {
    throw new Error(uploadRes?.message || "Failed to upload evaluated PDF");
  }
  // Finalize only after a successful upload (Angular order).
  return finalizeMarks(examEvaluationAssignmentId);
}
