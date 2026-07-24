"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createQuestionPaperMarks,
  getSubjectCodeById,
  getSubjectCodeByQuestionPaperId,
  listAssessmentsBySubjectCode,
  listQuestionDifficultyLevels,
  listQuestionTaxonomyLevels,
} from "@/services/evaluation-process";
import { ChevronDown, ChevronRight } from "lucide-react";

type AnyRow = Record<string, any>;

export default function QuestionBankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  const employeeId = Number(
    user?.employeeId ?? globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const params = useMemo(
    () => ({
      questionPaperId: Number(searchParams?.get("questionPaperId") ?? 0),
      templateId: Number(
        searchParams?.get("examQuestionPaperTemplateId") ??
          searchParams?.get("pkEQPTid") ??
          0,
      ),
      questionPaperTitle:
        searchParams?.get("questionpaper_title") ??
        searchParams?.get("questionPaperTitle") ??
        "",
      examName: searchParams?.get("examName") ?? "",
      subjectName: searchParams?.get("subjectName") ?? "",
      subjectCode: searchParams?.get("subjectCode") ?? "",
      subjectId: Number(searchParams?.get("subjectId") ?? 0),
      level0no: searchParams?.get("level0no") ?? "",
      level1no: searchParams?.get("level1no") ?? "",
      groupno: searchParams?.get("groupno") ?? "",
      subgroupno: searchParams?.get("subgroupno") ?? "",
      questionnumber: searchParams?.get("questionnumber") ?? "",
      questioncode: searchParams?.get("questioncode") ?? "",
      subquestioncode: searchParams?.get("subquestioncode") ?? "",
      iqm: Number(searchParams?.get("iqm") ?? 0),
    }),
    [searchParams],
  );

  const [banks, setBanks] = useState<AnyRow[]>([]);
  const [bankId, setBankId] = useState<number>(0);
  const [questions, setQuestions] = useState<AnyRow[]>([]);
  const [pickedQuestionId, setPickedQuestionId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Question Type modal (mirrors Angular QuestionTypeModalComponent): pick a
  // Difficulty Level + Taxonomy Level before the question is added.
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [difficultyList, setDifficultyList] = useState<AnyRow[]>([]);
  const [taxonomyList, setTaxonomyList] = useState<AnyRow[]>([]);
  const [difficultyId, setDifficultyId] = useState<number>(0);
  const [taxonomyId, setTaxonomyId] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // subjectCode normally arrives in the URL; if it's missing (the
      // evaluation subject-filter proc doesn't always expose it), resolve it
      // from subjectId via the Subject entity so the Assessment list still fires.
      // Last resort: derive it from the question-paper id.
      let code = params.subjectCode;
      if (!code && params.subjectId) {
        code = await getSubjectCodeById(params.subjectId).catch(() => "");
      }
      if (!code && params.questionPaperId) {
        code = await getSubjectCodeByQuestionPaperId(
          params.questionPaperId,
        ).catch(() => "");
      }
      const rows = code
        ? await listAssessmentsBySubjectCode(code).catch(() => [])
        : [];
      if (cancelled) return;
      setBanks(Array.isArray(rows) ? rows : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.subjectCode, params.subjectId, params.questionPaperId]);

  // Load difficulty + taxonomy lists the first time the modal opens, then
  // default-select the first option of each (Angular getGeneralDetails).
  useEffect(() => {
    if (!typeModalOpen) return;
    let cancelled = false;
    void (async () => {
      const [diff, tax] = await Promise.all([
        listQuestionDifficultyLevels().catch(() => []),
        listQuestionTaxonomyLevels().catch(() => []),
      ]);
      if (cancelled) return;
      const diffRows = Array.isArray(diff) ? diff : [];
      const taxRows = Array.isArray(tax) ? tax : [];
      setDifficultyList(diffRows);
      setTaxonomyList(taxRows);
      setDifficultyId(
        (prev) => prev || Number(diffRows[0]?.generalDetailId ?? 0),
      );
      setTaxonomyId((prev) => prev || Number(taxRows[0]?.generalDetailId ?? 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [typeModalOpen]);

  function handleBankPick(id: number) {
    setBankId(id);
    const bank = banks.find((b) => Number(b.assessmentId) === id);
    const list = Array.isArray(bank?.assessmentQuestionDTOs)
      ? bank.assessmentQuestionDTOs
      : [];
    setQuestions(list);
    setPickedQuestionId(null);
    // Default-expand the first question (mirrors Angular's [expanded]="step === 0").
    const opened: Record<number, boolean> = {};
    if (list[0]) {
      const firstId = Number(
        list[0].assessmentQuestionId ??
          list[0].courseQuestionDTO?.courseQuestionId ??
          list[0].courseQuestionId ??
          0,
      );
      if (firstId) opened[firstId] = true;
    }
    setExpanded(opened);
  }

  function navigateBack() {
    const qp = new URLSearchParams();
    qp.set("questionPaperId", String(params.questionPaperId));
    qp.set("examQuestionPaperTemplateId", String(params.templateId));
    qp.set("pkEQPTid", String(params.templateId));
    qp.set("questionpaper_title", params.questionPaperTitle);
    qp.set("questionPaperTitle", params.questionPaperTitle);
    qp.set("examName", params.examName);
    qp.set("subjectName", params.subjectName);
    qp.set("subjectCode", params.subjectCode);
    const carry = [
      "courseId",
      "academicYearId",
      "examId",
      "subjectId",
      "regulationId",
      "totalmarks",
    ];
    for (const k of carry) {
      const v = searchParams?.get(k);
      if (v) qp.set(k, v);
    }
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks/manage-questions-paper?${qp.toString()}`,
    );
  }

  // Angular addQuestionsList(): opens the Question Type modal with the picked
  // question. The modal collects difficulty + taxonomy before the POST.
  function openTypeModal() {
    const picked = questions.find((q) => qid(q) === pickedQuestionId) ?? null;
    if (!picked) {
      toastError("Pick a question first.");
      return;
    }
    setTypeModalOpen(true);
  }

  async function submitQuestion() {
    const picked = questions.find((q) => qid(q) === pickedQuestionId) ?? null;
    if (!picked) {
      toastError("Pick a question first.");
      return;
    }
    const courseQ = picked.courseQuestionDTO ?? picked;
    const options = Array.isArray(courseQ?.courseQuestionOptionDTOs)
      ? courseQ.courseQuestionOptionDTOs
      : [];
    const modelAnswer = options[0]?.options ? String(options[0].options) : "";
    // Positional fields: a number when the slot supplies one, otherwise null
    // (NOT 0 — the detail proc matches slots on these and 0 breaks the join).
    const numOrNull = (v: string | null | undefined) =>
      v != null && String(v).trim() !== "" ? Number(v) : null;
    setSaving(true);
    try {
      await createQuestionPaperMarks({
        questionPaperId: params.questionPaperId,
        level0No: numOrNull(params.level0no),
        level1No: numOrNull(params.level1no),
        groupNo: numOrNull(params.groupno),
        subGroupNo: numOrNull(params.subgroupno),
        questionNumber: numOrNull(params.questionnumber),
        questionCode: params.questioncode || null,
        subQuestionCode: params.subquestioncode || null,
        question: courseQ?.question ?? "",
        questionMarks: params.iqm || Number(courseQ?.marks) || 0,
        modelAnswer1: modelAnswer,
        courseQuestionId: Number(courseQ?.courseQuestionId) || 0,
        assessmentId: bankId || null,
        // Angular: questionOwnerProfileId = +localStorage employeeId (login user).
        questionOwnerProfileId: employeeId || null,
        // From the Question Type modal (Angular submit() merges these in).
        questionDifficultyCatDetId: difficultyId || null,
        taxonomyLevelCatDetId: taxonomyId || null,
        isActive: true,
      });
      toastSuccess("Question added to question paper.");
      setTypeModalOpen(false);
      navigateBack();
    } catch (e: any) {
      toastError(e?.message ?? "Failed to add question to paper.");
    } finally {
      setSaving(false);
    }
  }

  function qid(q: AnyRow): number {
    return Number(
      q?.assessmentQuestionId ??
        q?.courseQuestionDTO?.courseQuestionId ??
        q?.courseQuestionId ??
        0,
    );
  }

  const bankOptions = useMemo(
    () =>
      banks.map((b) => ({
        value: String(b.assessmentId),
        label: String(
          b.assessmentName ?? b.assessmentCode ?? b.assessmentTitle ?? "-",
        ),
      })),
    [banks],
  );

  return (
    <FilteredPage
      title={
        params.questionPaperTitle
          ? `Question Bank (${params.questionPaperTitle})`
          : "Question Bank"
      }
      bodyClassName="border-t-0"
      filters={
        <div className="space-y-3">
          <div className="rounded-sm bg-[#b3ddff] px-3 py-2">
            <h4 className="m-0 text-center text-[16px] font-semibold uppercase tracking-wide text-slate-900">
              Add Questions in &lsquo;{params.questionPaperTitle || "—"}&rsquo;
            </h4>
          </div>
          <div className="w-full max-w-[360px]">
            <GlobalFilterBarRow>
              <GlobalFilterField label="Select Question Bank">
                <Select
                  value={bankId ? String(bankId) : null}
                  onChange={(v) => handleBankPick(Number(v) || 0)}
                  options={bankOptions}
                  placeholder="Select Question Bank"
                  searchable
                />
              </GlobalFilterField>
            </GlobalFilterBarRow>
          </div>
        </div>
      }
      body={
        <div className="space-y-3">
          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="border-b-2 border-amber-400 bg-white px-3 py-2 text-[16px] font-semibold text-slate-800">
                List of <span className="text-blue-700">Questions</span>
              </div>
              <ul className="space-y-2">
                {questions.map((qu) => {
                  const id = qid(qu) || Math.random();
                  const courseQ = qu.courseQuestionDTO ?? qu;
                  const isOpen = Boolean(expanded[id]);
                  const isPicked = pickedQuestionId === id;
                  const options = Array.isArray(
                    courseQ?.courseQuestionOptionDTOs,
                  )
                    ? courseQ.courseQuestionOptionDTOs
                    : [];
                  return (
                    <li
                      key={`qb-${id}`}
                      className={`rounded border ${isPicked ? "border-blue-400 bg-blue-50/50" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="radio"
                          name="qb-pick"
                          checked={isPicked}
                          onChange={() => setPickedQuestionId(id)}
                          className="shrink-0"
                        />
                        <button
                          type="button"
                          className="flex-1 text-left flex items-start gap-2 min-w-0"
                          onClick={() =>
                            setExpanded((s) => ({ ...s, [id]: !s[id] }))
                          }
                        >
                          {isOpen ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                          )}
                          <span className="flex-1 min-w-0">
                            <span
                              className="font-semibold text-[14px] text-slate-800"
                              dangerouslySetInnerHTML={{
                                __html: String(courseQ?.question ?? ""),
                              }}
                            />
                            <span className="ml-2 font-semibold text-[12px] text-slate-600">
                              ({courseQ?.marks ?? "-"} marks)
                            </span>
                          </span>
                        </button>
                      </div>
                      {isOpen ? (
                        <div className="border-t border-border bg-muted/20 px-3 py-2">
                          {options.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground">
                              No options for this question.
                            </p>
                          ) : (
                            <ul className="space-y-1 pl-6 list-disc text-[13px]">
                              {options.map((opt: AnyRow, i: number) => (
                                <li
                                  key={`opt-${id}-${i}`}
                                  className={
                                    opt.isCorrectAnswer
                                      ? "text-emerald-700 font-semibold"
                                      : "text-slate-700"
                                  }
                                >
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: String(opt.options ?? ""),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 text-[12px]"
              onClick={navigateBack}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-8 text-[12px]"
              onClick={openTypeModal}
              disabled={!pickedQuestionId}
            >
              Add
            </Button>
          </div>
        </div>
      }
    >
      <Dialog
        open={typeModalOpen}
        onOpenChange={(v) => {
          if (!saving) setTypeModalOpen(v);
        }}
      >
        <DialogContent className="max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-[16px] text-[hsl(var(--primary))]">
              Add Question
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
            <div className="space-y-1">
              <Label className="text-[12px]">Difficulty Level</Label>
              <Select
                value={difficultyId ? String(difficultyId) : null}
                onChange={(v) => setDifficultyId(Number(v) || 0)}
                options={difficultyList.map((d) => ({
                  value: String(d.generalDetailId),
                  label: String(
                    d.generalDetailDisplayName ?? d.generalDetailName ?? "-",
                  ),
                }))}
                placeholder="Difficulty Level"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Taxonomy Level</Label>
              <Select
                value={taxonomyId ? String(taxonomyId) : null}
                onChange={(v) => setTaxonomyId(Number(v) || 0)}
                options={taxonomyList.map((t) => ({
                  value: String(t.generalDetailId),
                  label: String(
                    t.generalDetailDisplayName ?? t.generalDetailName ?? "-",
                  ),
                }))}
                placeholder="Taxonomy Level"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTypeModalOpen(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void submitQuestion()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
