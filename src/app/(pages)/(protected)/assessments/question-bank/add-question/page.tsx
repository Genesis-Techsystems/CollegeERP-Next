"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MonitorIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RichTextEditor } from "@/common/components/rich-text-editor";
import {
  listQuestionsByBank,
  listQuestionTypes,
  addOrUpdateQuestion,
} from "@/services";
import { QK } from "@/lib/query-keys";
import type {
  AssessmentQuestion,
  CourseQuestion,
  CourseQuestionOption,
  QuestionType,
} from "@/types/question-bank";
import { cn } from "@/lib/utils";

// ─── Type chips — app primary blue when selected ─────────────────────────────

function QuestionTypeSelector({
  types,
  selected,
  onChange,
}: {
  types: QuestionType[];
  selected: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0">
      <h3 className="mr-5 text-base font-semibold text-foreground">Type :-</h3>
      <ul className="m-2 flex list-none flex-wrap gap-0 p-0">
        {types.map((t) => (
          <li key={t.generalDetailId} className="list-none">
            <button
              type="button"
              onClick={() => onChange(t.generalDetailCode)}
              className={cn(
                "cursor-pointer border px-3 py-2 text-center text-sm font-semibold transition-colors",
                selected === t.generalDetailCode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-muted",
              )}
            >
              {t.generalDetailDisplayName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── MC option row (Angular layout) ───────────────────────────────────────────

interface McOption {
  id: number;
  inputHead: string;
  options: string;
  isCorrectAnswer: boolean;
  courseQuestionOptionId: number | null;
  isActive: boolean;
}

function McOptionRow({
  opt,
  onChange,
}: {
  opt: McOption;
  onChange: (updated: McOption) => void;
}) {
  return (
    <div className="my-4 w-full max-w-[60%]">
      {/* Angular: Choice label + Correct Answer checkbox on the same row */}
      <p className="relative mb-2 px-2 text-base font-semibold text-foreground">
        {opt.inputHead}
        <span className="absolute right-0 top-0 flex items-center gap-1.5 text-sm font-semibold">
          <input
            type="checkbox"
            checked={opt.isCorrectAnswer}
            onChange={(e) =>
              onChange({ ...opt, isCorrectAnswer: e.target.checked })
            }
            className="h-4 w-4 cursor-pointer"
          />
          Correct Answer
        </span>
      </p>
      {/* Angular quill-editor for each choice — Quill snow toolbar */}
      <RichTextEditor
        value={opt.options}
        onChange={(html) => onChange({ ...opt, options: html })}
        toolbarVariant="quill"
        minHeight={110}
        placeholder="Enter Choice"
      />
    </div>
  );
}

function makeMcOptions(): McOption[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    inputHead: `Choice ${i + 1}`,
    options: "",
    isCorrectAnswer: false,
    courseQuestionOptionId: null,
    isActive: true,
  }));
}

function makeTfOptions(): {
  id: number;
  options: string;
  isCorrectAnswer: boolean;
  courseQuestionOptionId: number | null;
  isActive: boolean;
}[] {
  return [
    {
      id: 1,
      options: "True",
      isCorrectAnswer: false,
      courseQuestionOptionId: null,
      isActive: true,
    },
    {
      id: 2,
      options: "False",
      isCorrectAnswer: false,
      courseQuestionOptionId: null,
      isActive: true,
    },
  ];
}

function makeFbAnswers() {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Answer ${i + 1}`,
    options: "",
    courseQuestionOptionId: null as number | null,
    isActive: true,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddQuestionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const assessmentId = Number(params.get("assessmentId"));
  const rawAqId = params.get("assessmentQuestionId");
  const assessmentQuestionId =
    rawAqId != null && rawAqId !== "" && rawAqId !== "null"
      ? Number(rawAqId)
      : null;
  const permission = params.get("permission") ?? "Add";
  const returnPage = params.get("page") ?? "assessments/question-bank";

  const isEditing =
    assessmentQuestionId !== null && !Number.isNaN(assessmentQuestionId);

  const evaluatorProfileId = (() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("examEvaluatorProfileId");
    const n = raw != null ? Number(raw) : 0;
    return n !== 0 ? n : null;
  })();

  const { data: questionTypes = [] } = useQuery<QuestionType[]>({
    queryKey: QK.questionBanks.questionTypes(),
    queryFn: listQuestionTypes,
    staleTime: Infinity,
    enabled: !isEditing,
  });

  const [selectedType, setSelectedType] = useState<string>("TF");
  const [typeDisplayName, setTypeDisplayName] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [marks, setMarks] = useState<number | "">(0);
  const [mcOptions, setMcOptions] = useState<McOption[]>(makeMcOptions());
  const [tfCheck, setTfCheck] = useState<1 | 2>(1);
  const [tfOptions, setTfOptions] = useState(makeTfOptions());
  const [fbAnswers, setFbAnswers] = useState(makeFbAnswers());
  const [subExplanation, setSubExplanation] = useState("");
  const [subOptionId, setSubOptionId] = useState<number | null>(null);
  const [existingQuestion, setExistingQuestion] =
    useState<AssessmentQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadExisting = useCallback(async () => {
    if (!isEditing || !assessmentId || !assessmentQuestionId) return;
    const rows = await listQuestionsByBank(assessmentId);
    const aq = rows.find(
      (r) => r.assessmentQuestionId === assessmentQuestionId,
    );
    if (!aq) return;

    setExistingQuestion(aq);
    const q: CourseQuestion = aq.courseQuestionDTO;
    setSelectedType(q.fbInputTypeCatCode);
    setTypeDisplayName(q.fbInputTypeCatDisplayName ?? q.fbInputTypeCatCode);
    setQuestion(q.question);
    setMarks(q.marks);

    if (q.fbInputTypeCatCode === "MC") {
      setMcOptions(
        q.courseQuestionOptionDTOs.map((o, i) => ({
          id: i + 1,
          inputHead: `Choice ${i + 1}`,
          options: o.options,
          isCorrectAnswer: o.isCorrectAnswer,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        })),
      );
    } else if (q.fbInputTypeCatCode === "TF") {
      const opts = q.courseQuestionOptionDTOs.map((o, i) => ({
        id: i + 1,
        options: o.options,
        isCorrectAnswer: o.isCorrectAnswer,
        courseQuestionOptionId: o.courseQuestionOptionId,
        isActive: o.isActive,
      }));
      setTfOptions(opts.length >= 2 ? opts : makeTfOptions());
      const correctIdx = opts.findIndex((o) => o.isCorrectAnswer);
      setTfCheck(correctIdx === 1 ? 2 : 1);
    } else if (q.fbInputTypeCatCode === "FB") {
      setFbAnswers(
        q.courseQuestionOptionDTOs.map((o, i) => ({
          id: i + 1,
          name: `Answer ${i + 1}`,
          options: o.options,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        })),
      );
    } else {
      setSubExplanation(q.courseQuestionOptionDTOs[0]?.options ?? "");
      setSubOptionId(
        q.courseQuestionOptionDTOs[0]?.courseQuestionOptionId ?? null,
      );
    }
  }, [isEditing, assessmentId, assessmentQuestionId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  function buildOptions(): Partial<CourseQuestionOption>[] {
    switch (selectedType) {
      case "MC":
        return mcOptions.map((o) => ({
          options: o.options,
          isCorrectAnswer: o.isCorrectAnswer,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        }));
      case "TF":
        return tfOptions.map((o, i) => ({
          options: o.options,
          isCorrectAnswer: tfCheck === i + 1,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        }));
      case "FB":
        return fbAnswers
          .filter((a) => a.options !== "")
          .map((a) => ({
            options: a.options,
            isCorrectAnswer: true,
            courseQuestionOptionId: a.courseQuestionOptionId,
            isActive: a.isActive,
          }));
      default:
        return [
          {
            options: subExplanation,
            isCorrectAnswer: true,
            courseQuestionOptionId: subOptionId,
            isActive: true,
          },
        ];
    }
  }

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error("Question content is required");
      return;
    }

    let fbInputTypeCatId: number;
    if (isEditing && existingQuestion) {
      fbInputTypeCatId = existingQuestion.courseQuestionDTO.fbInputTypeCatId;
    } else {
      const qTypeObj = questionTypes.find(
        (t) => t.generalDetailCode === selectedType,
      );
      if (!qTypeObj) {
        toast.error("Question type not found");
        return;
      }
      fbInputTypeCatId = qTypeObj.generalDetailId;
    }

    const payload: Parameters<typeof addOrUpdateQuestion>[0] = {
      assessmentId,
      questionOwnerProfileId: evaluatorProfileId,
      question,
      marks: Number(marks) || 0,
      fbInputTypeCatId,
      isActive: true,
      correctAnswerIds: [],
      courseQuestionOptionDTOs: buildOptions() as CourseQuestionOption[],
      onlineCourseId: null,
      courseLessonId: null,
      courseLessonTopicId: null,
    };

    if (isEditing && existingQuestion) {
      payload.assessmentQuestionId = existingQuestion.assessmentQuestionId;
      payload.courseQuestionId =
        existingQuestion.courseQuestionDTO.courseQuestionId;
      payload.onlineCourseId =
        existingQuestion.courseQuestionDTO.onlineCourseId;
      payload.courseLessonId =
        existingQuestion.courseQuestionDTO.courseLessonId;
      payload.courseLessonTopicId =
        existingQuestion.courseQuestionDTO.courseLessonTopicId;
    }

    setSubmitting(true);
    try {
      await addOrUpdateQuestion(payload);
      toast.success(isEditing ? "Question updated" : "Question added");
      await queryClient.invalidateQueries({ queryKey: QK.questionBanks.all });
      const path = returnPage.startsWith("/") ? returnPage : `/${returnPage}`;
      router.push(`${path}?assessmentId=${assessmentId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save question",
      );
      setSubmitting(false);
    }
  };

  return (
    <PageContainer className="max-w-none space-y-4">
      {/* Angular card: white background, elevation */}
      <div className="rounded-sm border border-border bg-white px-4 py-2 shadow-sm">
        {/* Sub-header: computer icon + Add/Edit Question */}
        <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
          <MonitorIcon className="h-5 w-5 text-[hsl(var(--primary))]" />
          <span className="text-base font-semibold text-foreground">
            {permission} Question
          </span>
        </div>

        <div className="space-y-4">
          {/* Type :- chips */}
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold">Type :-</h3>
              <span className="font-semibold text-blue-700">
                {typeDisplayName || selectedType}
              </span>
            </div>
          ) : (
            <QuestionTypeSelector
              types={questionTypes}
              selected={selectedType}
              onChange={setSelectedType}
            />
          )}

          {/* Question editor */}
          <div className="space-y-1">
            <RichTextEditor
              value={question}
              onChange={setQuestion}
              placeholder="Enter Question"
              minHeight={160}
            />
          </div>

          {/* Marks : inline like Angular */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">Marks :</p>
            <input
              type="text"
              name="marks"
              value={marks}
              onChange={(e) =>
                setMarks(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mb-0 h-[35px] w-[100px] border border-[#aaa] bg-white px-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Correct Answer section */}
          <div className="mb-4 rounded-sm border border-[#dddddd] p-4">
            {/* Angular assets/images/correct.jpg ribbon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/correct.jpg"
              alt="Correct Answer"
              className="my-2 ml-1 h-[60px] w-[28%] max-w-[280px] object-contain object-left"
            />

            {/* MC */}
            {selectedType === "MC" && (
              <div>
                {mcOptions.map((opt) => (
                  <McOptionRow
                    key={opt.id}
                    opt={opt}
                    onChange={(updated) =>
                      setMcOptions((prev) =>
                        prev.map((o) => (o.id === updated.id ? updated : o)),
                      )
                    }
                  />
                ))}
              </div>
            )}

            {/* TF */}
            {selectedType === "TF" && (
              <div className="max-w-[60%] py-2">
                <div className="flex flex-wrap gap-8">
                  {tfOptions.map((opt, i) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                    >
                      <input
                        type="radio"
                        name="tfCorrect"
                        checked={tfCheck === i + 1}
                        onChange={() => setTfCheck((i + 1) as 1 | 2)}
                        className="h-4 w-4 cursor-pointer"
                      />
                      {opt.options}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* FB */}
            {selectedType === "FB" && (
              <div className="max-w-[60%] space-y-3 py-2">
                {fbAnswers.map((ans) => (
                  <div key={ans.id} className="flex flex-wrap items-center">
                    <span className="font-semibold">{ans.name}</span>
                    <input
                      type="text"
                      value={ans.options}
                      onChange={(e) =>
                        setFbAnswers((prev) =>
                          prev.map((a) =>
                            a.id === ans.id
                              ? { ...a, options: e.target.value }
                              : a,
                          ),
                        )
                      }
                      className="ml-3 mb-2 h-[35px] w-1/2 min-w-[180px] border border-[#aaa] bg-white px-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* SUB */}
            {selectedType === "SUB" && (
              <div className="max-w-[60%] py-2">
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  value={subExplanation}
                  onChange={(e) => setSubExplanation(e.target.value)}
                  placeholder="Explanation"
                />
              </div>
            )}
          </div>

          {/* Angular: Submit then Back */}
          <div className="flex flex-wrap items-center gap-3 pb-2 pt-1">
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
