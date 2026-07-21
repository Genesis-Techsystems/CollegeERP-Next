// zod schemas + inferred types for the two main read responses.
// Parse defensively: callers use safeParse and fall back to the raw payload on
// mismatch (logging once) so a backend shape drift never blanks the UI.

import { z } from "zod";

/* ------------------------------------------------------------------ *
 * getevaluatordetails
 * ------------------------------------------------------------------ */

export const EvaluatorProfileDetailSchema = z
  .object({
    examEvaluatorProfileDetId: z.union([z.string(), z.number()]).nullish(),
    subjectCode: z.union([z.string(), z.number()]).nullish(),
    noOfStudentsAssigned: z.number().nullish(),
    noOfEvaluationsCompleted: z.number().nullish(),
    validityStartDate: z.string().nullish(),
    validityEndDate: z.string().nullish(),
  })
  .passthrough();

export const SubjectDetailSchema = z
  .object({
    subjectCode: z.union([z.string(), z.number()]).nullish(),
    subjectName: z.string().nullish(),
    courseName: z.string().nullish(),
  })
  .passthrough();

export const EvaluatorProfilesDetailsSchema = z
  .object({
    examEvaluatorProfileId: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

export const EvaluatorDetailsDataSchema = z
  .object({
    exam_evaluator_profileDetails: z.array(EvaluatorProfileDetailSchema).nullish(),
    subject_details: z.array(SubjectDetailSchema).nullish(),
    exam_evaluatorProfiles_details: EvaluatorProfilesDetailsSchema.nullish(),
  })
  .passthrough();

export type EvaluatorProfileDetail = z.infer<typeof EvaluatorProfileDetailSchema>;
export type SubjectDetail = z.infer<typeof SubjectDetailSchema>;
export type EvaluatorDetailsData = z.infer<typeof EvaluatorDetailsDataSchema>;

/** Aggregated dashboard row (output of the evaluation-dashboard aggregation). */
export type EvaluatorSubjectRow = {
  examEvaluatorProfileId: string | number | null | undefined;
  examEvaluatorProfileDetId: string | number | null | undefined;
  subjectName: string | null | undefined;
  subjectCode: string | number | null | undefined;
  courseName: string | null | undefined;
  noOfStudentsAssigned: number;
  noOfEvaluationsCompleted: number;
  evaluationsPending: number;
  validityStartDate: string | null | undefined;
  validityEndDate: string | null | undefined;
};

/* ------------------------------------------------------------------ *
 * getstudentanswerpapers
 * ------------------------------------------------------------------ */

export const EvaluationAssignmentDetailsSchema = z
  .object({
    examEvaluationAssignmentId: z.union([z.string(), z.number()]).nullish(),
    studentAnswerPaperId: z.union([z.string(), z.number()]).nullish(),
    evaluationStatusCatDetId: z.union([z.string(), z.number()]).nullish(),
    evaluationStatusCatDetCode: z.string().nullish(),
    evaluatedTotalMarks: z.union([z.string(), z.number()]).nullish(),
    answerSheetCheckDate: z.string().nullish(),
    evaluatedAnswerPaperPath: z.string().nullish(),
  })
  .passthrough();

export const StdAnswerPaperDetailsSchema = z
  .object({
    studentAnswerPath: z.string().nullish(),
    omrSerialNo: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

export const AnswerPaperItemSchema = z
  .object({
    exam_evauation_assignment_details: EvaluationAssignmentDetailsSchema.nullish(),
    exam_std_answer_paper_details: StdAnswerPaperDetailsSchema.nullish(),
  })
  .passthrough();

export const AnswerPapersDataSchema = z.array(AnswerPaperItemSchema);

export type AnswerPaperItem = z.infer<typeof AnswerPaperItemSchema>;

/** Flattened answer-paper row (output of the assigned-papers flatten). */
export type AnswerPaperRow = {
  examEvaluationAssignmentId: string | number | null | undefined;
  studentAnswerPaperId: string | number | null | undefined;
  studentAnswerPath: string | null | undefined;
  omrSerialNo: string | number | null | undefined;
  evaluatedTotalMarks: string | number | null | undefined;
  answerSheetCheckDate: string | null | undefined;
  evaluatedAnswerPaperPath: string | null | undefined;
  // 'Path' sentinel when studentAnswerPath is null (Angular parity), else the numeric id.
  evaluationStatusCatDetId: string | number | null | undefined;
  evaluationStatusCatDetCode: string | null | undefined;
};

/* ------------------------------------------------------------------ *
 * GeneralSetting (EVALPDFSTARTEND)
 * ------------------------------------------------------------------ */

export const GeneralSettingSchema = z
  .object({
    settingValue: z.string().nullish(),
  })
  .passthrough();

export const GeneralSettingDataSchema = z
  .object({
    resultList: z.array(GeneralSettingSchema).nullish(),
  })
  .passthrough();

export type GeneralSettingData = z.infer<typeof GeneralSettingDataSchema>;

/* ------------------------------------------------------------------ *
 * s_get_examquestionpaper_details_new (list_exam_questionpaper_draftmarks_new)
 *
 * Envelope: { statusCode, success, data: { result: [ QUESTION_ROWS, [ META ] ] } }
 *   - result[0]    = QuestionMarkRow[]
 *   - result[1][0] = AssignmentMeta
 * ------------------------------------------------------------------ */

const numeric = z.union([z.string(), z.number()]).nullish();

/** result[1][0] — assignment metadata. */
export const AssignmentMetaSchema = z
  .object({
    fk_evaluationstatus_catdet_id: numeric,
    omr_serial_no: numeric,
    evaluation_enddate: z.string().nullish(),
    evaluationtime_sec: numeric,
    studentanswer_path: z.string().nullish(),
    fk_exam_id: numeric,
    questionpaper_path: z.string().nullish(),
    pk_exam_questionpaper_id: numeric,
    modelanswersheet_path: z.string().nullish(),
    questionpaper_total_marks: numeric,
  })
  .passthrough();

/** result[0][i] — one question/marks row. Annotation columns kept via passthrough. */
export const QuestionMarkRowSchema = z
  .object({
    pk_questionpaper_marks_id: numeric,
    questionnumber: numeric,
    questioncode: z.string().nullish(),
    question: z.string().nullish(),
    max_question_marks: numeric,
    lvl: z.union([z.string(), z.number()]).nullish(),
    grp: z.union([z.string(), z.number()]).nullish(),
    calculated_total_marks: numeric,
    evaluated_marks: numeric,
    no_action_yet: z.union([z.string(), z.number(), z.boolean()]).nullish(),
    rgb_color: z.string().nullish(),
    error_message: z.string().nullish(),
    isnotans_pk_std_evaluationpage_id: numeric,
  })
  .passthrough();

export const EvaluationProcResultSchema = z
  .object({
    result: z.tuple([z.array(QuestionMarkRowSchema), z.array(AssignmentMetaSchema)]).rest(z.any()),
  })
  .passthrough();

export type AssignmentMeta = z.infer<typeof AssignmentMetaSchema>;
export type QuestionMarkRow = z.infer<typeof QuestionMarkRowSchema>;

/** Derived per-question output for the workbench marks list (Angular questionMarksList parity). */
export type EvalQuestion = {
  questionPaperMarksId: string | number | null | undefined;
  qno: string | number | null | undefined;
  qvalue: string | null | undefined;
  question: string | null | undefined;
  questionMarks: string | number | null | undefined;
  level1No: string | number | null | undefined;
  groupNo: string | number | null | undefined;
  answeredMarks: number;
  calculated_total_marks: number;
  isNotAnswered: boolean;
  rgb_color: string | null | undefined;
};
