"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { StudentSearchSelect } from "@/common/components/student-search";
import {
  deactivateRegisteredExamSubject,
  listExamStdCourseYearSubjects,
  listExamMastersByCourse,
  listRegisteredExamSubjects,
  listStudentSubjects,
  listStudents,
  saveRegisteredExamSubjects,
} from "@/services/pre-examination";
import { FilteredPage } from "@/components/layout";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { listCourseYears } from "@/services/examination";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function text(...values: unknown[]): string {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function subjectIdOf(row: AnyRow): number {
  return num(row.subjectId ?? row.fk_subject_id ?? row.subject_id);
}

function subjectLabel(row: AnyRow): string {
  return (
    text(row.shortName, row.subjectName, row.subject_name, row.Subject_name) ||
    "-"
  );
}

function subjectTypeCode(row: AnyRow): string {
  return text(
    row.subjecttypeCode,
    row.subjectTypeCode,
    row.subject_type_code,
    row.subjectTypeName,
    row.subjecttypeName,
    row.subject_type_name,
  );
}

function registeredSubjectCell(row: AnyRow) {
  const name = text(row.subjectName, row.subject_name) || "-";
  const type = subjectTypeCode(row);
  if (!type) return name;
  return (
    <>
      {name} <span className="font-medium text-blue-600">({type})</span>
    </>
  );
}

function registeredSubjectRenderer(p: ICellRendererParams<AnyRow>) {
  if (!p.data) return null;
  return registeredSubjectCell(p.data);
}

function makeSubjectCheckRenderer(
  checkedSubjects: Set<number>,
  onToggle: (id: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const sid = subjectIdOf(row);
    if (!sid) return null;
    return (
      <Checkbox
        checked={checkedSubjects.has(sid)}
        onCheckedChange={(v) => onToggle(sid, !!v)}
        aria-label={`Select ${subjectLabel(row)}`}
      />
    );
  };
}

function makeDeleteRenderer(onDelete: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => void onDelete(row)}
        aria-label="Delete subject"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

function fmtDate(v: unknown): string {
  if (!v) return "";
  try {
    const d =
      typeof v === "string" || typeof v === "number" ? new Date(v) : null;
    if (!d || Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
}

function examOptionLabel(e: AnyRow): string {
  const name =
    text(e.examName, e.exam_name) || `Exam ${num(e.examId ?? e.fk_exam_id)}`;
  const from = fmtDate(e.fromDate ?? e.from_date);
  const to = fmtDate(e.toDate ?? e.to_date);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    e.isRegularExam || e.is_regular_exam ? "(Regular)" : "",
    e.isSupplyExam || e.is_supply_exam ? "(Supple)" : "",
  ]
    .filter(Boolean)
    .join("");
  return `${name}${range}${tags ? ` ${tags}` : ""}`;
}

const STATUS_CLASS: Record<string, string> = {
  DTND: "text-red-600 font-bold",
  INCOLLEGE: "text-green-700 font-bold",
  PASSEDOUT: "text-[#461eb6] font-bold",
  DETAINRECOMMENDED: "text-orange-600 font-bold",
  DISCONTINUED: "text-red-600 font-bold",
};

/**
 * Angular exam-registration-without-fee:
 * - Exams: ExamMaster by Course.courseId (exclude internal)
 * - Course years: CourseYear by course, ASC, keep semNo <= student's current sem
 * - Subjects (same year as student): StudentSubject domain list
 * - Subjects (other year): examstdcourseyrsub
 * - UI section shown only after exam selected (flag)
 */
export default function ExamRegisterSubjectsPage() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(
    null,
  );
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [registeredSubjects, setRegisteredSubjects] = useState<AnyRow[]>([]);
  const [checkedSubjects, setCheckedSubjects] = useState<Set<number>>(
    new Set(),
  );
  const [checkAll, setCheckAll] = useState(true);

  const [studentId, setStudentId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examSelected, setExamSelected] = useState(false);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const selectedStudent =
    selectedStudentRow ??
    students.find((s) => num(s.studentId ?? s.id) === num(studentId)) ??
    null;

  const studentCurrentCourseYearId = num(
    selectedStudent?.courseYearId ?? selectedStudent?.fk_course_year_id,
  );

  const selectedSubjectRows = useMemo(
    () => subjects.filter((s) => checkedSubjects.has(subjectIdOf(s))),
    [subjects, checkedSubjects],
  );

  const allSubjectsSelected =
    subjects.length > 0 &&
    subjects.every((s) => {
      const sid = subjectIdOf(s);
      return sid > 0 && checkedSubjects.has(sid);
    });

  async function onSearchStudents(q: string) {
    const term = q.trim();
    if (!term) {
      setStudents([]);
      return;
    }
    if (term.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const rows = await listStudents(term).catch(() => []);
      setStudents(Array.isArray(rows) ? rows : []);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  /** Angular: trim course years to semNo <= student's current semester */
  function trimCourseYearsBySem(years: AnyRow[], student: AnyRow): AnyRow[] {
    const studentCode = text(student.courseYearCode, student.course_year_code);
    const current =
      years.find(
        (y) =>
          text(y.courseYearCode, y.course_year_code) === studentCode ||
          num(y.courseYearId ?? y.fk_course_year_id) ===
            num(student.courseYearId ?? student.fk_course_year_id),
      ) ?? null;
    const semNo = num(current?.semNo ?? current?.sem_no);
    if (!semNo) return years;
    return years.filter((y) => {
      const sn = num(y.semNo ?? y.sem_no);
      return !sn || sn <= semNo;
    });
  }

  function normalizeSubjects(
    rows: AnyRow[],
    cyId: number,
    examType: "Regular" | "Supple",
  ): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: subjectIdOf(r),
      courseYearId: cyId || num(r.courseYearId ?? r.fk_course_year_id),
      examType,
      shortName:
        text(r.shortName) || text(r.subjectCode, r.subject_code) || null,
      subjectName: text(r.subjectName, r.subject_name),
      subjectCode: text(r.subjectCode, r.subject_code),
      Subject_name: text(r.subjectName, r.subject_name),
      Subject_code: text(r.subjectCode, r.subject_code),
      checked: true,
      isSelected: true,
    }));
  }

  function applyChecks(list: AnyRow[], registered: AnyRow[]) {
    const already = new Set(
      registered
        .map((r) => subjectIdOf(r) || num(r.fk_subject_id))
        .filter((x) => x > 0),
    );
    // Also match by subjectCode + courseYearId like Angular addExamSubjects
    const alreadyCodes = new Set(
      registered.map(
        (r) =>
          `${text(r.subjectCode, r.subject_code)}::${num(r.courseYearId ?? r.fk_course_year_id)}`,
      ),
    );
    const next = new Set<number>();
    for (const s of list) {
      const sid = subjectIdOf(s);
      if (!sid) continue;
      const codeKey = `${text(s.subjectCode, s.subject_code)}::${num(s.courseYearId)}`;
      if (already.has(sid) || alreadyCodes.has(codeKey)) continue;
      next.add(sid);
    }
    setCheckedSubjects(next);
    setCheckAll(
      next.size > 0 &&
        next.size === list.filter((s) => subjectIdOf(s) > 0).length,
    );
  }

  /**
   * Angular getStudentSubjects(courseYearId):
   * same year → StudentSubject; other year → examstdcourseyrsub
   */
  async function loadStudentSubjects(
    student: AnyRow,
    cyId: number,
    _eid: number | null,
    registered: AnyRow[],
  ) {
    if (!cyId || !student) {
      setSubjects([]);
      setCheckedSubjects(new Set());
      return;
    }
    setLoading(true);
    try {
      const collegeId = num(student.collegeId ?? student.fk_college_id);
      const academicYearId = num(
        student.academicYearId ?? student.fk_academic_year_id,
      );
      const studentDetailId = num(
        student.studentId ?? student.id ?? student.fk_student_id,
      );
      const currentCy = num(student.courseYearId ?? student.fk_course_year_id);
      let rows: AnyRow[] = [];

      if (currentCy === cyId) {
        if (collegeId && academicYearId && studentDetailId) {
          rows = await listStudentSubjects({
            collegeId,
            academicYearId,
            studentId: studentDetailId,
            courseYearId: cyId,
          }).catch(() => []);
        }
        rows = normalizeSubjects(
          Array.isArray(rows) ? rows : [],
          cyId,
          "Regular",
        );
      } else {
        if (collegeId && studentDetailId) {
          rows = await listExamStdCourseYearSubjects({
            collegeId,
            courseYearId: cyId,
            studentId: studentDetailId,
          }).catch(() => []);
        }
        rows = normalizeSubjects(
          Array.isArray(rows) ? rows : [],
          cyId,
          "Supple",
        ).map((r) => ({
          ...r,
          credits: r.subCredits ?? r.creditPoints ?? r.credits,
        }));
      }

      setSubjects(rows);
      applyChecks(rows, registered);
    } finally {
      setLoading(false);
    }
  }

  async function onStudentSelect(
    nextStudentId: number | null,
    row: AnyRow | null,
  ) {
    if (!nextStudentId || !row) {
      setStudentId(null);
      setSelectedStudentRow(null);
      setExamId(null);
      setExamSelected(false);
      setCourseYearId(null);
      setExamsList([]);
      setCourseYears([]);
      setSubjects([]);
      setRegisteredSubjects([]);
      setCheckedSubjects(new Set());
      return;
    }

    setStudentId(nextStudentId);
    setSelectedStudentRow(row);
    setPhotoError(false);
    setStudents((prev) =>
      prev.some((x) => num(x.studentId ?? x.id) === nextStudentId)
        ? prev
        : [...prev, row],
    );
    setExamId(null);
    setExamSelected(false);
    setSubjects([]);
    setRegisteredSubjects([]);
    setCheckedSubjects(new Set());

    const cid = num(row.courseId ?? row.fk_course_id);
    if (!cid) return;

    setLoading(true);
    try {
      // Angular getExamsList — ExamMaster by course, exclude internal
      const exams = await listExamMastersByCourse(cid).catch(() => []);
      setExamsList(
        (Array.isArray(exams) ? exams : []).filter(
          (e) => !(e.isInternalExam ?? e.is_internal_exam),
        ),
      );

      // Angular course years ASC, trim by student semNo
      const yearsRaw = await listCourseYears(cid).catch(() => []);
      const yearsSorted = [...(Array.isArray(yearsRaw) ? yearsRaw : [])].sort(
        (a, b) => num(a.semNo ?? a.sem_no) - num(b.semNo ?? b.sem_no),
      );
      const years = trimCourseYearsBySem(yearsSorted, row);
      setCourseYears(years);

      const defaultCy =
        num(row.courseYearId ?? row.fk_course_year_id) ||
        num(years[0]?.courseYearId ?? years[0]?.fk_course_year_id) ||
        null;
      setCourseYearId(defaultCy);

      // Angular loads subjects as soon as course year is known (exam not required for regular list)
      if (defaultCy) {
        await loadStudentSubjects(row, defaultCy, null, []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onExamSelect(nextExamId: number) {
    if (!selectedStudent || !nextExamId) return;
    setExamId(nextExamId);
    setExamSelected(true);
    setLoading(true);
    try {
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        nextExamId,
      ).catch(() => []);
      const registered = Array.isArray(reg) ? reg : [];
      setRegisteredSubjects(registered);

      const cy =
        courseYearId ||
        num(
          selectedStudent.courseYearId ?? selectedStudent.fk_course_year_id,
        ) ||
        null;
      if (cy) {
        if (!courseYearId) setCourseYearId(cy);
        await loadStudentSubjects(selectedStudent, cy, nextExamId, registered);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onCourseYearSelect(nextCourseYearId: number) {
    setCourseYearId(nextCourseYearId);
    if (!selectedStudent || !nextCourseYearId) {
      setSubjects([]);
      setCheckedSubjects(new Set());
      return;
    }
    await loadStudentSubjects(
      selectedStudent,
      nextCourseYearId,
      examId,
      registeredSubjects,
    );
  }

  function toggleSubject(sid: number, checked: boolean) {
    if (!sid) return;
    setCheckedSubjects((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sid);
      else next.delete(sid);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckAll(checked);
    setCheckedSubjects((prev) => {
      const next = new Set(prev);
      for (const s of subjects) {
        const sid = subjectIdOf(s);
        if (!sid) continue;
        if (checked) next.add(sid);
        else next.delete(sid);
      }
      return next;
    });
  }

  async function onSave() {
    if (
      !selectedStudent ||
      !examId ||
      checkedSubjects.size === 0 ||
      !courseYearId
    )
      return;
    const selected = subjects.filter((s) =>
      checkedSubjects.has(subjectIdOf(s)),
    );
    if (selected.length === 0) return;

    const isSameYear = courseYearId === studentCurrentCourseYearId;
    const examTypeCode = isSameYear ? "Regular" : "Supple";

    const payload: AnyRow[] = [
      {
        collegeId: num(
          selectedStudent.collegeId ?? selectedStudent.fk_college_id,
        ),
        courseGroupId: num(
          selectedStudent.courseGroupId ?? selectedStudent.fk_course_group_id,
        ),
        courseYearId: num(courseYearId),
        regulationId: num(
          selectedStudent.regulationId ?? selectedStudent.fk_regulation_id,
        ),
        studentId: num(selectedStudent.studentId ?? selectedStudent.id),
        examId: num(examId),
        examtypeCatCode: examTypeCode,
        isActive: true,
        isFeePaid: false,
        examStudentDetailDTOs: selected.map((s) => ({
          ...s,
          courseYearId: num(courseYearId),
          subjectId: subjectIdOf(s),
          subjectCode: text(s.subjectCode, s.subject_code),
          subjectName: text(s.subjectName, s.subject_name, s.shortName),
        })),
      },
    ];

    setSaving(true);
    try {
      await saveRegisteredExamSubjects(payload);
      toastSuccess("Subjects saved successfully");
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        num(examId),
      ).catch(() => []);
      const registered = Array.isArray(reg) ? reg : [];
      setRegisteredSubjects(registered);
      applyChecks(subjects, registered);
    } catch (e: unknown) {
      toastError(e, "Failed to save subjects");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteRegistered(row: AnyRow) {
    const detailId = num(
      row.examStudentDetailId ??
        row.examStdDetailId ??
        row.exam_student_detail_id ??
        row.id,
    );
    if (!detailId || !selectedStudent || !examId) return;
    try {
      await deactivateRegisteredExamSubject(detailId);
      toastSuccess("Subject removed");
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        num(examId),
      ).catch(() => []);
      setRegisteredSubjects(Array.isArray(reg) ? reg : []);
    } catch (e: unknown) {
      toastError(e, "Failed to delete subject");
    }
  }

  const selectSubjectColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "All",
        width: 90,
        flex: 0,
        sortable: false,
        cellRenderer: makeSubjectCheckRenderer(checkedSubjects, toggleSubject),
      },
      {
        headerName: "Subjects",
        flex: 1,
        minWidth: 200,
        valueGetter: (p) => subjectLabel(p.data ?? {}),
      },
    ],
    [checkedSubjects],
  );

  const registeredColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: "SI No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Course Year",
        minWidth: 120,
        valueGetter: (p) =>
          text(p.data?.courseYearName, p.data?.course_year_name) || "-",
      },
      {
        headerName: "Subject Code",
        minWidth: 120,
        valueGetter: (p) =>
          text(p.data?.subjectCode, p.data?.subject_code) || "-",
      },
      {
        headerName: "Subject",
        minWidth: 220,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => {
          const row = p.data ?? {};
          const name = text(row.subjectName, row.subject_name) || "-";
          const type = subjectTypeCode(row);
          return type ? `${name} (${type})` : name;
        },
        cellRenderer: registeredSubjectRenderer,
      },
      {
        headerName: "Exam Type",
        minWidth: 110,
        valueGetter: (p) =>
          text(
            p.data?.examtypeCatCode,
            p.data?.exam_type_code,
            p.data?.examType,
          ) || "-",
      },
      {
        headerName: "Actions",
        width: 90,
        flex: 0,
        sortable: false,
        cellRenderer: makeDeleteRenderer(onDeleteRegistered),
      },
    ],
    // onDeleteRegistered closes over selectedStudent / examId
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStudent, examId],
  );

  return (
    <FilteredPage
      title="Exam Register Subjects Update"
      filters={
        <GlobalFilterBarRow>
          <div className="md:col-span-5 space-y-1">
            <StudentSearchSelect
              label="Student"
              value={studentId}
              students={students}
              selectedStudent={selectedStudent}
              isLoading={studentSearchLoading}
              onSearch={(term) => void onSearchStudents(term)}
              onChange={(id, row) => void onStudentSelect(id, row)}
            />
          </div>
          <div className="md:col-span-7 space-y-1">
            <Label>Exam *</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => {
                if (v) void onExamSelect(Number(v));
              }}
              options={examsList.map((e) => ({
                value: String(num(e.examId ?? e.fk_exam_id)),
                label: examOptionLabel(e),
              }))}
              placeholder="Select Exam"
              searchable
              disabled={!selectedStudent}
            />
          </div>
        </GlobalFilterBarRow>
      }
    >
      {!!selectedStudent && examSelected && (
        <>
          <div className="rounded border-2 border-[#c3d9ff] p-3">
            <div className="flex gap-4">
              <div className="w-[120px] shrink-0">
                {selectedStudent.studentPhotoPath && !photoError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedStudent.studentPhotoPath}
                    alt="student"
                    className="w-full bg-[#c3d9ff] p-1.5"
                    style={{ maxHeight: 110 }}
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <div
                    className="flex w-full items-center justify-center bg-[#c3d9ff] p-1.5 text-[28px] font-semibold text-white"
                    style={{ height: 110 }}
                  >
                    {String(
                      text(
                        selectedStudent.firstName,
                        selectedStudent.studentName,
                      ) || "?",
                    )
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 text-[13px] leading-5">
                <p className="font-medium">
                  {text(
                    selectedStudent.firstName,
                    selectedStudent.studentName,
                  ) || "-"}{" "}
                  (
                  <span className="text-blue-600">
                    {selectedStudent.isLateral ? "LATERAL" : "REGULAR"}
                  </span>
                  )
                </p>
                <p className="text-[#8c8c8c]">
                  {text(
                    selectedStudent.hallticketNumber,
                    selectedStudent.rollNumber,
                  ) || "-"}
                </p>
                <p className="text-[#8c8c8c]">
                  {text(selectedStudent.collegeCode) || "-"} /{" "}
                  {text(
                    selectedStudent.academicYear,
                    selectedStudent.academic_year,
                  ) || "-"}{" "}
                  / {text(selectedStudent.courseCode) || "-"} /{" "}
                  {text(selectedStudent.groupCode) || "-"} /{" "}
                  {text(selectedStudent.courseYearName) || "-"} / Section{" "}
                  {text(selectedStudent.section) || "-"}
                </p>
                <p className="text-[#8c8c8c]">
                  {text(selectedStudent.mobile, selectedStudent.mobileNumber) ||
                    "-"}
                </p>
              </div>
              <div className="text-[14px]">
                <div className="py-1">
                  Quota :{" "}
                  <span className="text-blue-600">
                    {text(selectedStudent.quotaDisplayName) || "-"}
                  </span>
                </div>
                <div className="py-1">
                  Student Status :{" "}
                  <span
                    className={
                      STATUS_CLASS[
                        String(selectedStudent.studentStatusCode ?? "")
                      ] ?? "text-green-700 font-medium"
                    }
                  >
                    {text(selectedStudent.studentStatusDisplayName) || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded border-2 border-[#89c5ff] p-2.5">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
              <h2 className="app-card-title">Select Exam Subjects</h2>
            </div>
            <div className="p-3 grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="rounded border bg-white p-3 md:col-span-3">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => {
                    if (v) void onCourseYearSelect(Number(v));
                  }}
                  options={courseYears.map((y) => ({
                    value: String(num(y.courseYearId ?? y.fk_course_year_id)),
                    label:
                      text(
                        y.courseYearName,
                        y.course_year_name,
                        y.courseYearCode,
                      ) || "Course Year",
                  }))}
                  placeholder="Course Year"
                />
              </div>

              <div className="md:col-span-9 min-w-0">
                <DataTable
                  bordered={false}
                  rowData={subjects}
                  columnDefs={selectSubjectColumnDefs}
                  loading={loading}
                  height="260px"
                  pagination={false}
                  toolbar={SEARCH_ONLY_TOOLBAR}
                  toolbarLeading={
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                      <Checkbox
                        checked={
                          allSubjectsSelected ||
                          (checkAll && subjects.length > 0)
                        }
                        onCheckedChange={(v) => toggleAllFiltered(!!v)}
                      />
                      All
                    </label>
                  }
                  toolbarTrailing={
                    <span className="whitespace-nowrap text-[12px]">
                      Total Subjects:{" "}
                      <span className="font-semibold text-muted-foreground">
                        {loading ? "…" : subjects.length}
                      </span>
                    </span>
                  }
                />
              </div>

              {selectedSubjectRows.length > 0 && (
                <div className="overflow-hidden rounded border md:col-span-3">
                  <div className="bg-[#C3D9FF] px-2 py-2 text-[14px]">
                    Selected Subjects : {selectedSubjectRows.length}
                  </div>
                  <div className="max-h-[220px] divide-y overflow-auto">
                    {selectedSubjectRows.map((s, i) => (
                      <div key={`sel-${i}`} className="px-2 py-2 text-[12px]">
                        {subjectLabel(s)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubjectRows.length > 0 && (
                <div className="flex items-end justify-end md:col-span-1">
                  <Button
                    type="button"
                    className="h-8 px-5 text-[12px]"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {registeredSubjects.length > 0 && (
            <div className="space-y-2">
              <DataTable
                rowData={registeredSubjects}
                columnDefs={registeredColumnDefs}
                pagination
                toolbar={SEARCH_ONLY_TOOLBAR}
              />
            </div>
          )}
        </>
      )}
    </FilteredPage>
  );
}
