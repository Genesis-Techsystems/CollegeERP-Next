"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil } from "lucide-react";
import { Select as SearchableSelect } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  getAssignQuestionPaperTemplateList,
  getEvaluationExamRestBundle,
  getQuestionPaperTemplateViewRows,
} from "@/services/evaluation-process";
import { getRegSupBaseFilters } from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

const ALL_VALUE = "0";

function hasAssignedTemplate(row: AnyRow): boolean {
  const qpId = row.fk_exam_qp_template_id;
  if (qpId == null) return num(row.fk_exam_questionpaper_template_id) > 0;
  return num(qpId) > 0;
}

function templateAssignId(row: AnyRow): number {
  return num(
    row.fk_exam_qp_template_id ||
      row.exam_qp_template_assign_id ||
      row.pk_exam_qp_template_assign_id,
  );
}

function templateMasterId(row: AnyRow): number {
  return num(
    row.fk_exam_questionpaper_template_id || row.examQuestionPaperTemplateId,
  );
}

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
  onEdit: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data ?? {};
    if (!hasAssignedTemplate(row)) {
      return (
        <Button
          type="button"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={() => onAssign(row)}
        >
          Assign Template
        </Button>
      );
    }
    const canEdit = num(row.question_paper_exists) === 0;
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onView(row)}
          aria-label="View template"
        >
          <Eye className="h-4 w-4 text-blue-700" />
        </Button>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onEdit(row)}
            aria-label="Edit template assignment"
          >
            <Pencil className="h-4 w-4 text-blue-700" />
          </Button>
        )}
      </div>
    );
  };
}

export default function AssignQuestionPaperTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("Template View");
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([]);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(regulationRows, (r) =>
        num(r.fk_regulation_id || r.regulationId),
      ),
    [regulationRows],
  );

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code),
      })),
    [courses],
  );
  const academicYearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );
  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: txt(r.exam_name),
      })),
    [exams],
  );
  const courseYearOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_VALUE, label: "All" },
      ...courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label: txt(r.course_year_code),
      })),
    ],
    [courseYears],
  );
  const regulationOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_VALUE, label: "All" },
      ...regulations.map((r) => ({
        value: String(num(r.fk_regulation_id || r.regulationId)),
        label: txt(r.regulation_code || r.regulationCode),
      })),
    ],
    [regulations],
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId).catch(() => []);
        setBaseRows(Array.isArray(list) ? list : []);
        const qpCourse = num(searchParams.get("courseId"));
        setCourseId(qpCourse || num(list?.[0]?.fk_course_id) || null);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId, searchParams]);

  useEffect(() => {
    const qpYear = num(searchParams.get("academicYearId"));
    setAcademicYearId(
      qpYear || num(academicYears[0]?.fk_academic_year_id) || null,
    );
  }, [academicYears, searchParams]);

  useEffect(() => {
    const qpExam = num(searchParams.get("examId"));
    setExamId(qpExam || num(exams[0]?.fk_exam_id) || null);
  }, [exams, searchParams]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !examId || !academicYearId) return;
      const bundle = await getEvaluationExamRestBundle({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => ({
        restFilters: [],
        regulations: [],
      }));
      const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
      const regs = Array.isArray(bundle.regulations) ? bundle.regulations : [];
      setRestRows(rest);
      setRegulationRows(regs);
      const qpCourseYear = searchParams.get("courseYearId");
      const qpRegulation = searchParams.get("regulationId");
      setCourseYearId(
        qpCourseYear != null
          ? num(qpCourseYear)
          : num(rest[0]?.fk_course_year_id) || 0,
      );
      setRegulationId(
        qpRegulation != null
          ? num(qpRegulation)
          : num(regs[0]?.fk_regulation_id || regs[0]?.regulationId) || 0,
      );
    }
    void loadRest();
  }, [courseId, examId, academicYearId, employeeId, searchParams]);

  async function getList() {
    if (!examId) return;
    setLoading(true);
    try {
      // Angular getTemplateDetails always sends in_course_year_id: 0
      const list = await getAssignQuestionPaperTemplateList({
        examId,
        courseYearId: 0,
        regulationId: regulationId || 0,
        subjectId: 0,
      });
      let nextRows = Array.isArray(list) ? list : [];
      if (courseYearId && courseYearId > 0) {
        nextRows = nextRows.filter(
          (r) => num(r.fk_course_year_id) === courseYearId,
        );
      }
      setRows(nextRows);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }

  const navigateToAssign = useCallback(
    (row: AnyRow, isEdit: boolean) => {
      const existingTemplateAssignId = templateAssignId(row);
      const existingTemplateId = templateMasterId(row);
      const params = new URLSearchParams({
        from: "assign-questionpaper-template",
        examId: String(num(examId)),
        courseId: String(num(courseId)),
        academicYearId: String(num(academicYearId)),
        courseYearId: String(num(row.fk_course_year_id || courseYearId)),
        regulationId: String(num(row.fk_regulation_id || regulationId)),
        subjectId: String(num(row.fk_subject_id)),
        examName: txt(row.exam_name),
        subjectCode: txt(row.subject_code),
        subjectName: txt(row.subject_name),
        existingTemplateAssignId: isEdit
          ? String(existingTemplateAssignId)
          : "0",
        existingTemplateId: isEdit ? String(existingTemplateId) : "0",
      });
      router.push(
        `/admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template?${params.toString()}`,
      );
    },
    [router, examId, courseId, academicYearId, courseYearId, regulationId],
  );

  const openViewTemplate = useCallback(async (row: AnyRow) => {
    const templateId = templateMasterId(row) || templateAssignId(row);
    setTemplateTitle(
      `Template View - ${txt(row.subject_code) || txt(row.subject_name) || ""}`.trim(),
    );
    const details = await getQuestionPaperTemplateViewRows(templateId).catch(
      () => [],
    );
    setTemplateRows(details);
    setTemplateOpen(true);
  }, []);

  const cols = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 72, flex: 0 },
      {
        headerName: "Group Code",
        valueGetter: (p) => txt(p.data?.group_codes),
        minWidth: 140,
      },
      {
        headerName: "Course Year Code",
        valueGetter: (p) => txt(p.data?.course_year_code),
        minWidth: 130,
      },
      {
        headerName: "Regulation Code",
        valueGetter: (p) => txt(p.data?.regulation_code),
        minWidth: 130,
      },
      {
        headerName: "Subject",
        valueGetter: (p) =>
          `${txt(p.data?.subject_code)} - ${txt(p.data?.subject_name)}`,
        minWidth: 220,
        flex: 1,
      },
      {
        colId: "actions",
        headerName: "Actions",
        minWidth: 180,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeActionsRenderer(
          (row) => navigateToAssign(row, false),
          (row) => void openViewTemplate(row),
          (row) => navigateToAssign(row, true),
        ),
      },
    ],
    [navigateToAssign, openViewTemplate],
  );

  return (
    <FilteredListPage
      title="Assign Template"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-1.5 space-y-1">
            <Label className="text-[12px] text-muted-foreground">Course</Label>
            <SearchableSelect
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(num(v) || null)}
              options={courseOptions}
              placeholder="Course"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px] text-muted-foreground">Exam Year</Label>
            <SearchableSelect
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(num(v) || null)}
              options={academicYearOptions}
              placeholder="Exam Year"
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <Label className="text-[12px] text-muted-foreground">Exam Master</Label>
            <SearchableSelect
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(num(v) || null)}
              options={examOptions}
              placeholder="Search exam…"
              searchable
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px] text-muted-foreground">Regulation</Label>
            <SearchableSelect
              value={regulationId != null ? String(regulationId) : ALL_VALUE}
              onChange={(v) => setRegulationId(num(v))}
              options={regulationOptions}
              placeholder="Regulation"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px] text-muted-foreground">Course Years</Label>
            <SearchableSelect
              value={courseYearId != null ? String(courseYearId) : ALL_VALUE}
              onChange={(v) => setCourseYearId(num(v))}
              options={courseYearOptions}
              placeholder="Course Year"
            />
          </div>
          <div className="md:col-span-1 flex justify-end">
            <Button
              type="button"
              className="h-8 text-[12px]"
              onClick={() => void getList()}
              disabled={loading || !examId}
            >
              Get List
            </Button>
          </div>
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={cols}
      pagination
      loading={loading}
      toolbar={{
        search: true,
        searchPlaceholder: "Search subject, group, course year…",
        pdfDocumentTitle: "Assign Question Paper Template",
      }}
    >
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[hsl(var(--primary))]">
              {templateTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-[14px]">
            {templateRows.map((row, i) => {
              const level = num(row.level1no);
              const group = num(row.groupno);
              const subgroup = num(row.subgroupno);
              const title = txt(
                row.QuestionTitle || row.question_title || row.title,
              );
              const qCode = txt(row.questioncode || row.question_code);
              const qMarks = txt(row.individual_question_marks);
              const groupMarks = txt(row.question_marks || row.total_marks);
              const downText = txt(
                row.displaydowntext || row.display_down_text,
              );

              return (
                <div
                  key={`template-${i}-${qCode}-${title}`}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  {level > 0 && group === 0 && subgroup === 0 && (
                    <div className="col-span-12 text-center font-medium py-1">
                      {title}
                    </div>
                  )}
                  {level > 0 && group > 0 && subgroup === 0 && (
                    <>
                      <div className="col-span-1 font-semibold">{group}.</div>
                      <div className="col-span-9">{title}</div>
                      <div className="col-span-2 text-right font-semibold">
                        {groupMarks}
                      </div>
                    </>
                  )}
                  {qCode && (
                    <>
                      <div className="col-span-1" />
                      <div className="col-span-2">{qCode}</div>
                      <div className="col-span-7" />
                      <div className="col-span-2 text-right">{qMarks}</div>
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
            {templateRows.length === 0 && (
              <div className="text-[13px] text-muted-foreground">
                No template details found.
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
