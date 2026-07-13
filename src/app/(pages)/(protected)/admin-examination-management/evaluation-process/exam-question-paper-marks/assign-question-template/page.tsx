"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/common/components/search";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  createQuestionPaperTemplateAssignment,
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
      row.pk_exam_questionpaper_template_id ||
      row.pk_exam_qp_template_id,
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
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<AnyRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0);
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([]);

  const examId = num(searchParams.get("examId"));
  const regulationId = num(searchParams.get("regulationId"));
  const subjectId = num(searchParams.get("subjectId"));
  const courseYearId = num(searchParams.get("courseYearId"));
  const subjectCode = txt(searchParams.get("subjectCode"));
  const subjectName = txt(searchParams.get("subjectName"));
  const existingTemplateAssignId = num(
    searchParams.get("existingTemplateAssignId"),
  );
  const existingTemplateId = num(searchParams.get("existingTemplateId"));
  const isEdit = existingTemplateAssignId > 0;
  const subjectLabel = subjectName
    ? `${subjectCode} - ${subjectName}`
    : subjectCode;

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await listQuestionPaperTemplates().catch(() => []);
        setTemplates(Array.isArray(list) ? list : []);
        // Match Angular interaction: keep preview empty until explicit template click.
        const initialTemplateId = isEdit ? existingTemplateId : 0;
        if (initialTemplateId > 0) {
          setSelectedTemplateId(initialTemplateId);
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [isEdit, existingTemplateId]);

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
    return templates.filter((t) =>
      getTemplateTitle(t).toLowerCase().includes(q),
    );
  }, [templates, search]);

  async function saveAssignment() {
    if (
      !examId ||
      !regulationId ||
      !subjectId ||
      !courseYearId ||
      !selectedTemplateId
    )
      return;
    setLoading(true);
    try {
      if (isEdit) {
        await updateQuestionPaperTemplateAssignment(existingTemplateAssignId, {
          examQptempAssignId: existingTemplateAssignId,
          examMasterId: examId,
          regulationId,
          subjectId,
          examQuestionpaperTemplateId: selectedTemplateId,
          courseYearId,
          isActive: true,
        });
      } else {
        await createQuestionPaperTemplateAssignment({
          examMasterId: examId,
          regulationId,
          subjectId,
          examQuestionpaperTemplateId: selectedTemplateId,
          courseYearId,
          isActive: true,
        });
      }
      router.push(
        `/admin-examination-management/evaluation-process/assign-questionpaper-template?courseId=${searchParams.get("courseId") ?? ""}&academicYearId=${searchParams.get("academicYearId") ?? ""}&examId=${examId}&courseYearId=${courseYearId}&regulationId=${regulationId}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title={isEdit ? "Update Template" : "Assign Template"}
        subtitle={`Subject: ${subjectLabel}`}
      />

      <div className="app-card p-3 space-y-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={() => void saveAssignment()}
            disabled={!selectedTemplateId || loading}
          >
            {isEdit ? "Update Template" : "Assign Template"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 border rounded">
            <div className="p-2 border-b">
              <SearchInput
                className="w-full max-w-sm"
                value={search}
                onChange={setSearch}
                placeholder="Search template…"
              />
            </div>
            <div className="max-h-[560px] overflow-auto">
              {filteredTemplates.map((t, i) => {
                const templateId = getTemplateId(t);
                const active = templateId === selectedTemplateId;
                return (
                  <button
                    key={`tpl-${templateId}-${i}`}
                    type="button"
                    className={`w-full px-3 py-2 text-left text-[13px] border-b ${active ? "bg-blue-700 text-white" : "hover:bg-muted/40"}`}
                    onClick={() => {
                      setSelectedTemplateId(templateId);
                    }}
                  >
                    {getTemplateTitle(t)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-8 border rounded p-2 max-h-[560px] overflow-auto">
            {!selectedTemplateId && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Select a template from the left panel to view details.
              </div>
            )}
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
                <div
                  key={`row-${i}-${groupNo}-${questionCode}`}
                  className="grid grid-cols-12 gap-2 text-[14px]"
                >
                  {!questionCode && (
                    <>
                      <div className="col-span-10 bg-slate-200 px-2 py-1 font-semibold">
                        <span>{groupNo}.</span> {title}
                      </div>
                      <div className="col-span-2 bg-slate-200 px-2 py-1 text-right font-semibold">
                        {questionMarks}
                      </div>
                    </>
                  )}
                  {questionCode && (
                    <>
                      <div className="col-span-1" />
                      <div className="col-span-2">{questionCode}</div>
                      <div className="col-span-7" />
                      <div className="col-span-2 text-right">
                        {individualMarks}
                      </div>
                    </>
                  )}
                  {downText && (
                    <div className="col-span-12 text-center font-semibold py-1">
                      {downText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
