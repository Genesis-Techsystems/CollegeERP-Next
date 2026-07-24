"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QK } from "@/lib/query-keys";
import { toastInfo } from "@/lib/toast";
import {
  getSurveyFormById,
  listSurveyFeedbackDetails,
  listSurveyFeedbackForStudent,
} from "@/services";

type AnyRow = Record<string, unknown>;

type Props = {
  open: boolean;
  row: AnyRow | null;
  surveyFormId: number;
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  studentId: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: AnyRow) => void | Promise<void>;
};

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

type QuestionRow = AnyRow & {
  surveyDetailsId?: number;
  fbQuestion?: string;
  fbOptionchoiceId?: number | null;
  feedbackQuestionDTO?: AnyRow | null;
};

export function StudentFeedbackModal({
  open,
  row,
  surveyFormId,
  collegeId,
  academicYearId,
  groupSectionId,
  studentId,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [headerInfo, setHeaderInfo] = useState("");
  const [headerInfo1, setHeaderInfo1] = useState("");
  const [formCollegeId, setFormCollegeId] = useState(collegeId);
  const [reason, setReason] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const empId = positiveId(row?.pk_emp_id, row?.employeeId);
  const subjectId = positiveId(row?.pk_subject_id, row?.subjectId);

  const formQuery = useQuery({
    queryKey: [...QK.studentSurveyFeedback.all, "form", surveyFormId],
    queryFn: () => getSurveyFormById(surveyFormId),
    enabled: open && surveyFormId > 0,
  });

  const existingQuery = useQuery({
    queryKey: [
      ...QK.studentSurveyFeedback.all,
      "existing",
      surveyFormId,
      studentId,
      empId,
      subjectId,
    ],
    queryFn: () =>
      listSurveyFeedbackForStudent({
        surveyFormId,
        studentId,
        employeeId: empId,
        subjectId,
      }),
    enabled: open && surveyFormId > 0 && studentId > 0 && empId > 0,
  });

  useEffect(() => {
    if (!open || !formQuery.data) return;
    const form = formQuery.data;
    setHeaderInfo(txt(form, ["headerinfo", "headerInfo"]));
    setHeaderInfo1(txt(form, ["headerinfo1", "headerInfo1"]));
    setFormCollegeId(positiveId(form.collegeId, collegeId));

    const details = Array.isArray(form.surveyDetailDTOs)
      ? ([...form.surveyDetailDTOs] as QuestionRow[])
      : [];
    const active = details.filter((d) => {
      const q = d.feedbackQuestionDTO as AnyRow | null | undefined;
      return q == null || q.isActive !== false;
    });
    setQuestions(active.map((q) => ({ ...q, fbOptionchoiceId: null })));
  }, [open, formQuery.data, collegeId]);

  useEffect(() => {
    if (!open || !existingQuery.data) return;
    const existing = existingQuery.data;
    if (existing.length === 0) {
      setIsCompleted(false);
      return;
    }
    const first = existing[0];
    const completed = Boolean(first.iscompleted);
    setIsCompleted(completed);
    setReason(txt(first, ["reason"]));
    if (completed && !row?.iscompleted) {
      toastInfo("Feedback Already Taken.");
    }

    const surveryFbId = positiveId(first.surveryFbId, first.surveyFbId);
    if (!surveryFbId) return;

    void (async () => {
      const answers = await listSurveyFeedbackDetails(surveryFbId);
      setQuestions((prev) =>
        prev.map((q) => {
          const match = answers.find(
            (a) =>
              Number(a.surveyDetailsId) === Number(q.surveyDetailsId),
          );
          if (!match) return q;
          return {
            ...q,
            fbOptionchoiceId: positiveId(match.fbOptionchoiceId) || null,
          };
        }),
      );
    })();
  }, [open, existingQuery.data, row?.iscompleted]);

  const employeeLabel = txt(row, ["Faculty", "firstName"]);
  const subjectLabel = txt(row, ["subject_name", "subjectName"]);

  const allAnswered = useMemo(
    () =>
      questions.length > 0 &&
      questions.every((q) => positiveId(q.fbOptionchoiceId) > 0),
    [questions],
  );

  async function handleSubmit() {
    if (isCompleted) {
      onClose();
      return;
    }
    if (!allAnswered) return;

    const detailDTOs: AnyRow[] = [];
    for (const item of questions) {
      const choiceId = positiveId(item.fbOptionchoiceId);
      if (!choiceId) continue;
      const fq = item.feedbackQuestionDTO as AnyRow | null | undefined;
      const group = fq?.fbOptionGroupDTO as AnyRow | null | undefined;
      const choices = Array.isArray(group?.fbOptionchoiceDTOs)
        ? (group!.fbOptionchoiceDTOs as AnyRow[])
        : [];
      const choice = choices.find(
        (c) => Number(c.fbOptionchoiceId) === choiceId,
      );
      detailDTOs.push({
        collegeId: formCollegeId,
        surveyDetailsId: item.surveyDetailsId,
        fbOptionchoiceId: choiceId,
        fbAnswer: choice?.optionchoice ?? null,
        fbAnswerRating: choice?.optionchoiceRating ?? null,
        isActive: true,
        iscompleted: true,
      });
    }

    await onSubmit({
      collegeId,
      surveyFormId,
      fromStudentId: studentId,
      forEmployeeId: empId,
      feedbackDate: new Date().toISOString(),
      isActive: true,
      iscompleted: true,
      academicYearId,
      groupSectionId,
      subjectId,
      reason,
      surveyFeedbackDetailDTOs: detailDTOs,
    });
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Student Feedback On Employee"
      size="xl"
      isSubmitting={isSubmitting}
      submitLabel={isCompleted ? "Close" : "Save"}
      cancelLabel="Close"
      showCancelButton={!isCompleted}
      onSubmit={handleSubmit}
    >
      {formQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading form…</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions found.</p>
      ) : (
        <div className="space-y-4">
          {headerInfo ? <h2 className="text-lg font-semibold">{headerInfo}</h2> : null}
          {headerInfo1 ? <h3 className="text-sm text-muted-foreground">{headerInfo1}</h3> : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2 text-sm">
            <span>
              Employee :{" "}
              <span className="font-medium text-blue-700">{employeeLabel}</span>
            </span>
            <span>
              Subject :{" "}
              <span className="font-medium text-blue-700">{subjectLabel}</span>
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((item, i) => {
              const fq = item.feedbackQuestionDTO as AnyRow | null | undefined;
              const group = fq?.fbOptionGroupDTO as AnyRow | null | undefined;
              const choices = Array.isArray(group?.fbOptionchoiceDTOs)
                ? (group!.fbOptionchoiceDTOs as AnyRow[])
                : [];
              return (
                <div key={String(item.surveyDetailsId ?? i)} className="space-y-2">
                  <p className="text-sm font-medium">
                    {i + 1}. {txt(item, ["fbQuestion"])}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {choices.map((obj) => {
                      const id = positiveId(obj.fbOptionchoiceId);
                      return (
                        <label
                          key={id}
                          className="inline-flex items-center gap-1.5 text-sm"
                        >
                          <input
                            type="radio"
                            name={`q-${item.surveyDetailsId ?? i}`}
                            checked={Number(item.fbOptionchoiceId) === id}
                            disabled={isCompleted}
                            onChange={() =>
                              setQuestions((prev) =>
                                prev.map((q, idx) =>
                                  idx === i
                                    ? { ...q, fbOptionchoiceId: id }
                                    : q,
                                ),
                              )
                            }
                          />
                          {txt(obj, ["optionchoice"])}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5 border-t border-slate-300 pt-3">
            <Label>Suggestions</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Write your suggestion"
              rows={3}
              disabled={isCompleted}
            />
          </div>
        </div>
      )}
    </FormModal>
  );
}
