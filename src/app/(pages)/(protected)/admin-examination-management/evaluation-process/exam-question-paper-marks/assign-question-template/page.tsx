"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Search } from "lucide-react";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createQuestionPaperTemplateAssignment,
  findExamQpTempAssignRow,
  getQuestionPaperTemplateViewRows,
  listQuestionPaperTemplates,
  updateQuestionPaperTemplateAssignment,
} from "@/services/evaluation-process";
import { num, txt } from "@/common/utils/data-helpers";

type AnyRow = Record<string, unknown>;

function getTemplateId(row: AnyRow): number {
  return num(
    row.examQuestionPaperTemplateId ||
      row.examQuestionpaperTemplateId ||
      row.examQpTemplateId ||
      row.pk_exam_questionpaper_template_id,
  );
}

function getTemplateTitle(row: AnyRow): string {
  return txt(
    row.templateTitle ||
      row.template_title ||
      row.questionpaper_template_title ||
      row.title,
  );
}

export default function AssignQuestionTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<AnyRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0);
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([]);
  /** Real ExamQPtempAssign.examQptempAssignId (not SP template FK). */
  const [resolvedAssignId, setResolvedAssignId] = useState<number>(0);

  const examId = num(searchParams.get("examId"));
  const courseId = num(searchParams.get("courseId"));
  const academicYearId = num(searchParams.get("academicYearId"));
  const regulationId = num(searchParams.get("regulationId"));
  const subjectId = num(searchParams.get("subjectId"));
  const courseYearId = num(searchParams.get("courseYearId"));
  const subjectCode = txt(searchParams.get("subjectCode"));
  const subjectName = txt(searchParams.get("subjectName"));
  // Angular: isEdit when row.fk_exam_questionpaper_template_id !== null.
  // That SP value is the assigned *template* id (preselect), not always the assign PK.
  const existingTemplateId =
    num(searchParams.get("existingTemplateId")) ||
    num(searchParams.get("examQuestionPaperTemplateId")) ||
    num(searchParams.get("pkEQPTid"));
  const existingTemplateAssignId =
    num(searchParams.get("existingTemplateAssignId")) || existingTemplateId;
  const isEdit = existingTemplateId > 0 || existingTemplateAssignId > 0;
  const pageTitle = isEdit ? "Update Template" : "Assign Template";
  // Angular breadcrumb last segment is Assign/Update Template (not nav "Question Papers")
  useBreadcrumbLabel(pageTitle);
  // Angular: (Subject: {{data.subject_code}} - {{data.subject_name}})
  const subjectLabel =
    subjectCode || subjectName
      ? `${subjectCode}${subjectCode && subjectName ? " - " : ""}${subjectName}`
      : "";

  function listReturnUrl() {
    const from = txt(searchParams.get("from"));
    if (from === "assign-questionpaper-template" || courseId || examId) {
      const q = new URLSearchParams({
        courseId: String(courseId || searchParams.get("courseId") || ""),
        academicYearId: String(
          academicYearId || searchParams.get("academicYearId") || "",
        ),
        examId: String(examId || ""),
        courseYearId: String(courseYearId || ""),
        regulationId: String(regulationId || ""),
      });
      return `/admin-examination-management/evaluation-process/assign-questionpaper-template?${q.toString()}`;
    }
    return "/admin-examination-management/evaluation-process/exam-question-paper-marks";
  }

  useEffect(() => {
    // Angular: missing ParametersService payload → redirect to assign list
    if (!examId && !subjectId && !searchParams.get("examQuestionPaperId")) {
      router.replace(
        "/admin-examination-management/evaluation-process/assign-questionpaper-template",
      );
    }
  }, [examId, subjectId, router, searchParams]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await listQuestionPaperTemplates().catch(() => []);
        const rows = Array.isArray(list) ? list : [];
        setTemplates(rows);

        // Angular getTemplateList:
        // - edit → selectionTemplate(fk_exam_questionpaper_template_id)
        // - assign → selectionTemplate(TemplateList[0])
        if (isEdit && existingTemplateId > 0) {
          const match = rows.find(
            (t) => getTemplateId(t) === existingTemplateId,
          );
          // Also match by templateTitle when SP title equals master title (e.g. "2549")
          const byTitle = !match
            ? rows.find(
                (t) => getTemplateTitle(t) === String(existingTemplateId),
              )
            : null;
          const preselectId = match
            ? existingTemplateId
            : byTitle
              ? getTemplateId(byTitle)
              : getTemplateId(rows[0] ?? {}) || 0;
          setSelectedTemplateId(preselectId);
        } else if (rows[0]) {
          setSelectedTemplateId(getTemplateId(rows[0]));
        }

        // Resolve real assign PK (Angular incorrectly uses template FK as PK)
        if (isEdit && examId && subjectId) {
          const assignRow = await findExamQpTempAssignRow({
            examMasterId: examId,
            regulationId,
            subjectId,
            courseYearId,
            templateId: existingTemplateId || existingTemplateAssignId,
          }).catch(() => null);
          setResolvedAssignId(num(assignRow?.examQptempAssignId));
        } else {
          setResolvedAssignId(0);
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [
    isEdit,
    existingTemplateId,
    existingTemplateAssignId,
    examId,
    subjectId,
    regulationId,
    courseYearId,
  ]);

  useEffect(() => {
    async function loadTemplate() {
      if (!selectedTemplateId) {
        setTemplateRows([]);
        return;
      }
      const rows = await getQuestionPaperTemplateViewRows(
        selectedTemplateId,
      ).catch(() => []);
      setTemplateRows(Array.isArray(rows) ? rows : []);
    }
    void loadTemplate();
  }, [selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const title = getTemplateTitle(t).toLowerCase();
      const id = String(getTemplateId(t));
      return title.includes(q) || id.includes(q);
    });
  }, [templates, search]);

  async function saveAssignment() {
    // Angular posts with params from ParametersService + selected templateId
    if (!selectedTemplateId) {
      toastError("Please select a template.");
      return;
    }
    if (!examId || !subjectId || !courseYearId) {
      toastError(
        "Missing exam / subject / course year. Go back and try again.",
      );
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        // Prefer resolved ExamQPtempAssign PK; service re-looks-up using template FK
        const assignPk =
          resolvedAssignId || existingTemplateAssignId || existingTemplateId;
        await updateQuestionPaperTemplateAssignment(
          assignPk,
          {
            examQptempAssignId: assignPk,
            examMasterId: examId,
            regulationId,
            subjectId,
            examQuestionpaperTemplateId: selectedTemplateId,
            courseYearId,
            isActive: true,
          },
          existingTemplateId || existingTemplateAssignId,
        );
        toastSuccess("Template updated successfully.");
      } else {
        // Angular assigntemplate()
        await createQuestionPaperTemplateAssignment({
          examMasterId: examId,
          regulationId,
          subjectId,
          examQuestionpaperTemplateId: selectedTemplateId,
          courseYearId,
          isActive: true,
        });
        toastSuccess("Template assigned successfully.");
      }
      router.push(listReturnUrl());
    } catch (error: unknown) {
      toastError(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Failed to update template."
            : "Failed to assign template.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer className="space-y-3">
      {/* Angular expansion-panel header: book + title + blue (Subject: …) */}
      <div className="rounded-md border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
          <h1 className="text-base font-semibold text-foreground sm:text-lg">
            {pageTitle}
          </h1>
          {subjectLabel ? (
            <span className="text-[13px] font-bold text-blue-700">
              (Subject: {subjectLabel})
            </span>
          ) : null}
        </div>

        {/* Angular savebtn-align: search (~30%) + Assign/Update + Back */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:mr-auto sm:w-[30%]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Template ..."
              className="h-10 w-full rounded-md border-2 border-amber-400 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              className="bg-[#0c51a4] hover:bg-[#0a4288]"
              onClick={() => void saveAssignment()}
              disabled={!selectedTemplateId || loading || saving}
            >
              {saving ? (isEdit ? "Updating…" : "Assigning…") : pageTitle}
            </Button>
            <Button
              type="button"
              className="bg-amber-400 text-black hover:bg-amber-500 hover:text-black"
              onClick={() => router.push(listReturnUrl())}
            >
              Back
            </Button>
          </div>
        </div>

        {/* Angular mat-tab-group vertical: labels 30% / body 70% */}
        <div className="mt-3 flex min-h-[480px] flex-col overflow-hidden rounded-md border border-[#ccc] bg-white md:flex-row">
          <div className="max-h-[560px] w-full overflow-auto border-b border-[#ccc] md:w-[30%] md:border-b-0 md:border-r">
            {filteredTemplates.map((t, i) => {
              const templateId = getTemplateId(t);
              const active = templateId === selectedTemplateId;
              return (
                <button
                  key={`tpl-${templateId}-${i}`}
                  type="button"
                  className={`w-full border-b border-[#ccc] px-8 py-2.5 text-left text-[13px] ${
                    active
                      ? "border-r-[5px] border-r-amber-400 bg-[#0c51a4] text-white"
                      : "bg-white text-foreground hover:bg-muted/40"
                  }`}
                  onClick={() => setSelectedTemplateId(templateId)}
                >
                  {getTemplateTitle(t) || String(templateId)}
                </button>
              );
            })}
            {!loading && filteredTemplates.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No templates found.
              </div>
            )}
          </div>

          <div className="max-h-[560px] flex-1 overflow-auto p-4 md:w-[70%] md:p-7">
            {!selectedTemplateId && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Select a template from the left panel to view details.
              </div>
            )}
            {/* Angular assign-question-template.html: #ccc group rows + sub-questions */}
            <div className="w-full text-[14px]">
              {templateRows.map((row, i) => {
                const questionCode = txt(row.questioncode);
                const groupNo = num(row.groupno);
                const title = txt(
                  row.QuestionTitle || row.question_title || row.title,
                );
                const questionMarks = txt(row.question_marks);
                const individualMarks = txt(row.individual_question_marks);
                const downText = txt(row.displaydowntext);

                return (
                  <div key={`row-${i}-${groupNo}-${questionCode}`}>
                    {!questionCode ? (
                      <div className="flex items-center bg-[#ccc]">
                        <div className="min-w-0 flex-1 px-2.5 py-1">
                          <b>{groupNo}.</b>
                          {title ? `\u00a0${title}` : ""}
                        </div>
                        <div className="shrink-0 px-5 py-1 text-right font-bold">
                          {questionMarks}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-6 shrink-0" />
                        <div className="w-14 shrink-0 py-0.5">
                          {questionCode}
                        </div>
                        <div className="min-w-0 flex-1" />
                        <div className="shrink-0 px-5 py-0.5 text-right">
                          {individualMarks}
                        </div>
                      </div>
                    )}
                    {downText ? (
                      <div className="py-1 text-center font-semibold">
                        {downText}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {selectedTemplateId > 0 &&
              templateRows.length === 0 &&
              !loading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No template details found.
                </div>
              )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
