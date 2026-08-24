"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, IHeaderParams } from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  Select as CommonSelect,
} from "@/common/components/select";
import {
  getInternalExamAverageMarks,
  getRegulationById,
  listInternalExamAverageAcademicYears,
  listInternalExamAverageColleges,
  listInternalExamAverageCourseGroups,
  listInternalExamAverageCourses,
  listInternalExamAverageCourseYears,
  listInternalExamAverageExams,
  listInternalExamAverageExamTypes,
  saveInternalExamAverageMarks,
} from "@/services/post-examination";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? "").trim();
    if (val) return val;
  }
  return "";
}

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (isValid(iso)) return iso;
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

/** Angular mat-option date pipe: `MMM d, y` */
function formatExamOptionDate(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "MMM d, yyyy") : "";
}

/** Angular CONSTANTS.dateFormate for table header: `d MMM, y` */
function formatExamHeaderDate(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "d MMM, yyyy") : "";
}

function examDateRaw(row: AnyRow, which: "from" | "to"): string {
  const master = (row?.examMaster ?? row?.exam_master ?? {}) as AnyRow;
  if (which === "from") {
    return (
      strFrom(row, ["examFromDate", "from_date", "fromDate"]) ||
      strFrom(master, ["fromDate", "from_date", "examFromDate"])
    );
  }
  return (
    strFrom(row, ["examToDate", "to_date", "toDate"]) ||
    strFrom(master, ["toDate", "to_date", "examToDate"])
  );
}

/** Angular option label: `examName (MMM d, y - MMM d, y)` */
function examOptionLabel(row: AnyRow): string {
  const name = strFrom(row, ["examName", "exam_name"]) || "Exam";
  const from = formatExamOptionDate(examDateRaw(row, "from"));
  const to = formatExamOptionDate(examDateRaw(row, "to"));
  if (from && to) return `${name} (${from} - ${to})`;
  return name;
}

/** Angular tempV element: `examName ( d MMM, y-d MMM, y ) ` */
function examHeaderLabel(row: AnyRow): string {
  const name = strFrom(row, ["examName", "exam_name"]) || "Exam";
  const from = formatExamHeaderDate(examDateRaw(row, "from"));
  const to = formatExamHeaderDate(examDateRaw(row, "to"));
  if (from && to) return `${name} ( ${from}-${to} ) `;
  return `${name} `;
}

/** Angular: M-1 | T / M-1 | M-2 | T / … based on examNames.length */
function markBannerForExamCount(count: number): string {
  if (count <= 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < count - 1; i += 1) parts.push(`M-${i + 1}`);
  parts.push("T");
  return parts.join(" | ");
}

/** Single-row header: subject + (code) + blue M-1 | T — no group row (avoids overlap) */
function AvgSubjectHeader(
  props: IHeaderParams & {
    subjectName?: string;
    subjectCode?: string;
    markBanner?: string;
  },
) {
  return (
    <div className="box-border flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center leading-snug">
      <span className="block text-[12px] font-semibold text-slate-900">
        {props.subjectName ?? ""}
      </span>
      {props.subjectCode ? (
        <span className="block text-[11px] text-slate-800">
          ({props.subjectCode})
        </span>
      ) : null}
      {props.markBanner ? (
        <span className="block text-[11px] font-medium text-blue-600">
          {props.markBanner}
        </span>
      ) : null}
    </div>
  );
}

function resolveRegulationMeta(first: AnyRow): {
  regulationId: number;
  regulationCode: string;
} {
  const details = (first?.examStudentDetailDTOs ??
    first?.exam_student_detail_dtos ??
    []) as AnyRow[];
  const regulationId =
    numFrom(details[0] ?? {}, ["regulationId", "fk_regulation_id"]) ||
    numFrom(first ?? {}, ["regulationId", "fk_regulation_id"]);
  const regulationCode =
    strFrom(details[0] ?? {}, ["regulationName", "regulation_code"]) ||
    strFrom(first ?? {}, ["regulationName", "regulation_code"]);
  return { regulationId, regulationCode };
}

function resolveTypeId(regulation: AnyRow | null, first: AnyRow): number {
  return (
    numFrom(regulation ?? {}, ["examIntMarkTypeId", "exam_int_mark_type_id"]) ||
    numFrom(first ?? {}, ["examIntMarkTypeId", "exam_int_mark_type_id"])
  );
}

function buildAverageMatrix(rows: AnyRow[], selectedExams: AnyRow[]) {
  const normalized: AnyRow[] = rows.map((r) => ({
    ...r,
    marks: Number(r.marks ?? 0),
  }));
  const examNameList = [
    ...selectedExams.map((e) =>
      strFrom(e, ["examShortName", "examName", "exam_name"]),
    ),
    "Final",
  ];
  const subjectMap = new Map<
    string,
    { subject_code: string; subject_name: string; subject_short?: string }
  >();
  for (const row of normalized) {
    const code = strFrom(row, ["subject_code", "subjectCode"]);
    const name = strFrom(row, ["subject_name", "subjectName"]);
    const short = strFrom(row, [
      "short_name",
      "shortName",
      "subject_short_name",
    ]);
    if (code && !subjectMap.has(code))
      subjectMap.set(code, {
        subject_code: code,
        subject_name: short || name,
        subject_short: short || undefined,
      });
  }
  const subjects = [...subjectMap.values()];
  const templateCells: AnyRow[] = subjects.flatMap((s) =>
    examNameList.map(
      (examName): AnyRow => ({
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        exam_name: examName,
        marks: 0,
        pk_exam_final_int_mark_id: null,
        created_dt: null,
        fk_student_id: null,
        fk_subject_id: null,
        fk_course_year_id: null,
      }),
    ),
  );
  const byRoll = new Map<string, AnyRow>();
  for (const row of normalized) {
    const roll = strFrom(row, ["roll_number", "rollNumber"]);
    if (!roll) continue;
    if (!byRoll.has(roll)) {
      const studentRow: AnyRow = {
        rollNumber: roll,
        firstName: strFrom(row, ["first_name", "firstName"]),
        studentMarksCount: templateCells.map((c) => ({ ...c })) as AnyRow[],
      };
      byRoll.set(roll, studentRow);
    }
    const student = byRoll.get(roll);
    if (!student) continue;
    const marksArrUnknown = student.studentMarksCount;
    const marksArr = (
      Array.isArray(marksArrUnknown) ? marksArrUnknown : []
    ) as AnyRow[];
    const subjectCode = strFrom(row, ["subject_code", "subjectCode"]);
    const examName = strFrom(row, ["exam_name", "examName"]);
    let cellIdx = marksArr.findIndex(
      (c) => c.subject_code === subjectCode && c.exam_name === examName,
    );
    if (cellIdx < 0) continue;
    const cell: any = marksArr[cellIdx];
    cell.marks = Number(row.marks ?? 0);
    cell.pk_exam_final_int_mark_id = row.pk_exam_final_int_mark_id ?? null;
    cell.created_dt = row.created_dt ?? null;
    cell.fk_student_id = row.fk_student_id ?? null;
    cell.fk_subject_id = row.fk_subject_id ?? null;
    cell.fk_course_year_id = row.fk_course_year_id ?? null;
  }
  return { normalized, examNameList, subjects, students: [...byRoll.values()] };
}

export default function InternalExamsAveragePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flag, setFlag] = useState(false);

  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [years, setYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [groups, setGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examTypes, setExamTypes] = useState<AnyRow[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);
  const [selectedExams, setSelectedExams] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [markCalTypeId, setMarkCalTypeId] = useState<number | null>(null);
  const [examIntMarkTypeId, setExamIntMarkTypeId] = useState<number | null>(
    null,
  );
  const [regulationCode, setRegulationCode] = useState("");
  const [internalType, setInternalType] = useState("");

  const [finalInternalMarks, setFinalInternalMarks] = useState<AnyRow[]>([]);
  const [midExamMarks, setMidExamMarks] = useState<AnyRow[]>([]);
  const [keys, setKeys] = useState<
    Array<{ subject_code: string; subject_name: string }>
  >([]);
  const [examNames, setExamNames] = useState<string[]>([]);
  const regulationReqRef = useRef(0);

  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const [c, t] = await Promise.all([
          listInternalExamAverageColleges(),
          listInternalExamAverageExamTypes(),
        ]);
        setColleges(c ?? []);
        setExamTypes(t ?? []);
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  async function onSelectCollege(value: number) {
    setCollegeId(value);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setMarkCalTypeId(null);
    setExamIntMarkTypeId(null);
    setSelectedExamIds([]);
    setSelectedExams([]);
    setExams([]);
    setMidExamMarks([]);
    setFlag(false);
    const selectedCollege = colleges.find(
      (c) => numFrom(c, ["collegeId", "fk_college_id"]) === value,
    );
    const universityId = numFrom(selectedCollege ?? {}, [
      "universityId",
      "fk_university_id",
    ]);
    if (!universityId) return;
    const [y, c] = await Promise.all([
      listInternalExamAverageAcademicYears(universityId).catch(() => []),
      listInternalExamAverageCourses(universityId).catch(() => []),
    ]);
    setYears(y);
    setCourses(c);
  }

  async function onSelectCourse(value: number) {
    setCourseId(value);
    setCourseGroupId(null);
    setCourseYearId(null);
    setMarkCalTypeId(null);
    setExamIntMarkTypeId(null);
    setSelectedExamIds([]);
    setSelectedExams([]);
    setExams([]);
    setMidExamMarks([]);
    setFlag(false);
    const g = await listInternalExamAverageCourseGroups(value).catch(() => []);
    setGroups(g);
  }

  async function onSelectGroup(value: number) {
    setCourseGroupId(value);
    setCourseYearId(null);
    setMarkCalTypeId(null);
    setExamIntMarkTypeId(null);
    setSelectedExamIds([]);
    setSelectedExams([]);
    setExams([]);
    setMidExamMarks([]);
    setFlag(false);
    if (!courseId) return;
    const y = await listInternalExamAverageCourseYears(courseId).catch(
      () => [],
    );
    setCourseYears(y);
  }

  async function onSelectCourseYear(value: number) {
    setCourseYearId(value);
    setMarkCalTypeId(null);
    setExamIntMarkTypeId(null);
    setSelectedExamIds([]);
    setSelectedExams([]);
    setExams([]);
    setMidExamMarks([]);
    setFlag(false);
    if (!collegeId || !courseId || !academicYearId || !courseGroupId) return;
    const examRows = await listInternalExamAverageExams({
      collegeId,
      courseId,
      academicYearId,
      courseGroupId,
      courseYearId: value,
    }).catch(() => []);
    const map = new Map<number, AnyRow>();
    for (const row of examRows) {
      const id = numFrom(row, ["examId", "fk_exam_id"]);
      if (id > 0 && !map.has(id)) map.set(id, row);
    }
    setExams([...map.values()]);
  }

  async function onSelectExams(values: number[]) {
    const uniqueIds = [
      ...new Set(values.filter((id) => Number.isFinite(id) && id > 0)),
    ];
    setSelectedExamIds(uniqueIds);
    setSelectedExams(
      exams.filter((e) =>
        uniqueIds.includes(numFrom(e, ["examId", "fk_exam_id"])),
      ),
    );
    setFlag(true);
    setMidExamMarks([]);
    setMarkCalTypeId(null);
    setExamIntMarkTypeId(null);
    setInternalType("");
    setRegulationCode("");
    if (uniqueIds.length === 0) return;

    const first = exams.find(
      (e) => numFrom(e, ["examId", "fk_exam_id"]) === uniqueIds[0],
    );
    const { regulationId, regulationCode } = resolveRegulationMeta(first ?? {});
    setRegulationCode(regulationCode);
    if (!regulationId) return;

    const reqId = ++regulationReqRef.current;
    const regulation = await getRegulationById(regulationId).catch(() => null);
    // Ignore stale responses when exams are re-selected quickly
    if (reqId !== regulationReqRef.current) return;

    const typeId = resolveTypeId(regulation, first ?? {});
    setExamIntMarkTypeId(typeId || null);
    setMarkCalTypeId(typeId || null);
    const type = examTypes.find(
      (t) => numFrom(t, ["generalDetailId"]) === typeId,
    );
    setInternalType(
      strFrom(type ?? {}, ["generalDetailDisplayName", "generalDetailCode"]),
    );
  }

  const filteredExams = useMemo(() => {
    if (!academicYearId || !courseId || !courseGroupId || !courseYearId)
      return [];
    return exams;
  }, [exams, academicYearId, courseId, courseGroupId, courseYearId]);
  const examOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ value: string; label: string }> = [];
    for (const x of filteredExams) {
      const id = numFrom(x, ["examId", "fk_exam_id"]);
      if (!id) continue;
      const value = String(id);
      if (seen.has(value)) continue;
      seen.add(value);
      opts.push({
        value,
        label: examOptionLabel(x),
      });
    }
    return opts;
  }, [filteredExams]);
  const collegeOptions = useMemo(
    () =>
      colleges
        .map((x) => ({
          value: String(numFrom(x, ["collegeId", "fk_college_id"])),
          label: strFrom(x, ["collegeCode", "college_code"]),
        }))
        .filter((o) => o.value !== "0"),
    [colleges],
  );
  const yearOptions = useMemo(
    () =>
      years
        .map((x) => ({
          value: String(numFrom(x, ["academicYearId", "fk_academic_year_id"])),
          label: strFrom(x, ["academicYear", "academic_year"]),
        }))
        .filter((o) => o.value !== "0"),
    [years],
  );
  const courseOptions = useMemo(
    () =>
      courses
        .map((x) => ({
          value: String(numFrom(x, ["courseId", "fk_course_id"])),
          label: strFrom(x, ["courseCode", "course_code"]),
        }))
        .filter((o) => o.value !== "0"),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      groups
        .map((x) => ({
          value: String(numFrom(x, ["courseGroupId", "fk_course_group_id"])),
          label: strFrom(x, ["groupCode", "group_code"]),
        }))
        .filter((o) => o.value !== "0"),
    [groups],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears
        .map((x) => ({
          value: String(numFrom(x, ["courseYearId", "fk_course_year_id"])),
          label: strFrom(x, ["courseYearName", "course_year_code"]),
        }))
        .filter((o) => o.value !== "0"),
    [courseYears],
  );
  const markTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ value: string; label: string }> = [];
    for (const x of examTypes) {
      const value = String(numFrom(x, ["generalDetailId"]));
      if (value === "0" || seen.has(value)) continue;
      seen.add(value);
      opts.push({
        value,
        label: strFrom(x, ["generalDetailDisplayName", "generalDetailCode"]),
      });
    }
    return opts;
  }, [examTypes]);

  async function getList() {
    if (
      !collegeId ||
      !courseGroupId ||
      !courseYearId ||
      !markCalTypeId ||
      selectedExamIds.length === 0
    )
      return;
    setLoading(true);
    try {
      if (!examIntMarkTypeId) {
        setFlag(true);
        return;
      }
      const rows = await getInternalExamAverageMarks({
        examIds: selectedExamIds,
        collegeId,
        courseGroupId,
        courseYearId,
        finalTypeId: examIntMarkTypeId,
      });
      const matrix = buildAverageMatrix(rows, selectedExams);
      setFinalInternalMarks(matrix.normalized);
      setExamNames(matrix.examNameList);
      setKeys(matrix.subjects);
      setMidExamMarks(matrix.students);
    } catch (e) {
      toastError(e, "Failed to fetch list");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (
      !collegeId ||
      finalInternalMarks.length === 0 ||
      selectedExamIds.length === 0
    )
      return;
    setSaving(true);
    try {
      const examIds = selectedExamIds.join(",");
      const payload = finalInternalMarks
        .filter(
          (r) =>
            strFrom(r, ["exam_name", "examName"]).toLowerCase() === "final",
        )
        .map((r) => ({
          examFinalIntMarkId: r.pk_exam_final_int_mark_id ?? null,
          createdDt: r.created_dt ?? null,
          finalMarks: Number(r.marks ?? 0),
          examIds,
          internalMarks: Number(r.marks ?? 0),
          isActive: true,
          isPublished: true,
          publishedOn: new Date().toISOString(),
          collegeId,
          studentId: Number(r.fk_student_id ?? 0),
          courseYearId: Number(r.fk_course_year_id ?? 0),
          subjectId: Number(r.fk_subject_id ?? 0),
        }));
      await saveInternalExamAverageMarks(payload);
      toastSuccess("Saved successfully");
      await getList();
    } catch (e) {
      toastError(e, "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  /** Angular `selectedData`: College / Exam Year / Course / Course Group / Course Year */
  const selectedFilterInfo = useMemo(() => {
    if (midExamMarks.length === 0) return "";
    const college = collegeOptions.find(
      (o) => o.value === String(collegeId),
    )?.label;
    const year = yearOptions.find(
      (o) => o.value === String(academicYearId),
    )?.label;
    const course = courseOptions.find(
      (o) => o.value === String(courseId),
    )?.label;
    const group = groupOptions.find(
      (o) => o.value === String(courseGroupId),
    )?.label;
    const courseYear = courseYearOptions.find(
      (o) => o.value === String(courseYearId),
    )?.label;
    return [college, year, course, group, courseYear]
      .filter(Boolean)
      .join(" / ");
  }, [
    midExamMarks.length,
    collegeOptions,
    yearOptions,
    courseOptions,
    groupOptions,
    courseYearOptions,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  /** Angular `tempV`: exam name(s) with `d MMM, y` dates, joined by ` && ` */
  const selectedExamInfo = useMemo(() => {
    if (midExamMarks.length === 0 || selectedExams.length === 0) return "";
    return selectedExams.map(examHeaderLabel).join(" && ");
  }, [midExamMarks.length, selectedExams]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!keys.length || !examNames.length) return [];
    const markBanner = markBannerForExamCount(examNames.length);
    const frozen: ColDef<AnyRow>[] = [
      {
        colId: "siNo",
        headerName: "S.No",
        width: 72,
        flex: 0,
        pinned: "left",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        cellStyle: { textAlign: "center" },
        tooltipValueGetter: () => undefined,
        headerTooltipValueGetter: () => undefined,
      },
      {
        colId: "student",
        headerName: "Student",
        minWidth: 200,
        flex: 1,
        pinned: "left",
        // Only student cells get a tooltip — suppress default header tooltip.
        headerTooltipValueGetter: () => undefined,
        tooltipValueGetter: (p) => {
          const name = String(p.data?.firstName ?? "").trim();
          const roll = String(p.data?.rollNumber ?? "").trim();
          if (name && roll) return `${name}(${roll})`;
          return name || roll || undefined;
        },
        cellRenderer: (p: { data?: AnyRow }) => {
          const name = String(p.data?.firstName ?? "").trim();
          const roll = String(p.data?.rollNumber ?? "").trim();
          const tip =
            name && roll ? `${name}(${roll})` : name || roll || undefined;
          return (
            <span className="block truncate" title={tip}>
              {name}{" "}
              {roll ? (
                <span className="font-medium text-blue-600">({roll})</span>
              ) : null}
            </span>
          );
        },
      },
    ];

    // Single header row only (no ColGroupDef) so 3-line subject headers don't
    // collide with a child header row.
    const markCols: ColDef<AnyRow>[] = keys.flatMap((k, subjIdx) =>
      examNames.map((exam, examIdx) => ({
        colId: `avg_${subjIdx}_${examIdx}`,
        headerName: `${k.subject_name} (${k.subject_code})`,
        width: 108,
        minWidth: 96,
        flex: 0,
        autoHeaderHeight: true,
        wrapHeaderText: true,
        suppressHeaderMenuButton: true,
        headerComponent: AvgSubjectHeader,
        headerComponentParams: {
          subjectName: k.subject_name,
          subjectCode: k.subject_code,
          markBanner,
        },
        cellStyle: { textAlign: "center" as const },
        tooltipValueGetter: () => undefined,
        headerTooltipValueGetter: () => undefined,
        valueGetter: (p: { data?: AnyRow }) => {
          const marks = p.data?.studentMarksCount as AnyRow[] | undefined;
          const cell = marks?.find(
            (c) => c.subject_code === k.subject_code && c.exam_name === exam,
          );
          return Number(cell?.marks ?? 0);
        },
      })),
    );
    return [...frozen, ...markCols];
  }, [keys, examNames]);

  return (
    <FilteredListPage
      title="Internal Exam Average"
      filters={
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>College</Label>
              <CommonSelect
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => void onSelectCollege(Number(v || 0))}
                options={collegeOptions}
                placeholder="College"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Year</Label>
              <CommonSelect
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  const id = v ? Number(v) : null;
                  setAcademicYearId(id);
                  setMarkCalTypeId(null);
                  setExamIntMarkTypeId(null);
                  setSelectedExamIds([]);
                  setSelectedExams([]);
                  setExams([]);
                  setMidExamMarks([]);
                  setFlag(false);
                  if (
                    id &&
                    collegeId &&
                    courseId &&
                    courseGroupId &&
                    courseYearId
                  ) {
                    void listInternalExamAverageExams({
                      collegeId,
                      courseId,
                      academicYearId: id,
                      courseGroupId,
                      courseYearId,
                    })
                      .then((examRows) => {
                        const map = new Map<number, AnyRow>();
                        for (const row of examRows) {
                          const eid = numFrom(row, ["examId", "fk_exam_id"]);
                          if (eid > 0 && !map.has(eid)) map.set(eid, row);
                        }
                        setExams([...map.values()]);
                      })
                      .catch(() => setExams([]));
                  }
                }}
                options={yearOptions}
                placeholder="Exam Year"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course</Label>
              <CommonSelect
                value={courseId ? String(courseId) : null}
                onChange={(v) => void onSelectCourse(Number(v || 0))}
                options={courseOptions}
                placeholder="Course"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group</Label>
              <CommonSelect
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => void onSelectGroup(Number(v || 0))}
                options={groupOptions}
                placeholder="Course Group"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year</Label>
              <CommonSelect
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => void onSelectCourseYear(Number(v || 0))}
                options={courseYearOptions}
                placeholder="Course Year"
              />
            </div>
            <div className="space-y-1 md:col-span-7">
              <Label>Exam</Label>
              <MultiSelect
                value={selectedExamIds.map(String)}
                onChange={(vals) => void onSelectExams(vals.map(Number))}
                options={examOptions}
                placeholder="Exam"
                searchable
                showSelectAll={false}
                maxDisplay={99}
                className="text-[12px]"
              />
            </div>
            {selectedExamIds.length > 0 && (
              <div className="space-y-1 md:col-span-2">
                <Label>Marks Calculation Type</Label>
                <CommonSelect
                  value={markCalTypeId ? String(markCalTypeId) : null}
                  onChange={() => undefined}
                  options={markTypeOptions}
                  placeholder="Marks Calculation Type"
                  disabled
                />
              </div>
            )}
            {selectedExamIds.length > 0 && !!examIntMarkTypeId && (
              <div className="md:col-span-1">
                <Button
                  className="h-8 text-[12px] w-full"
                  onClick={() => void getList()}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get List"}
                </Button>
              </div>
            )}
          </div>
          {!examIntMarkTypeId && flag && (
            <p className="px-1 text-[13px] font-semibold text-red-600">
              Note: Exam internal marks type is not updated in regulation
              master.
            </p>
          )}
          {!!examIntMarkTypeId && flag && (
            <p className="px-1 text-[13px] font-semibold text-red-600">
              Note: For Regulation {regulationCode || "-"} the Exam internal
              marks type is {internalType || "-"}.
            </p>
          )}
        </div>
      }
      rowData={midExamMarks.length > 0 ? midExamMarks : []}
      columnDefs={columnDefs}
      loading={loading}
      resultsVisible={midExamMarks.length > 0}
      hideEmptyGrid
      columnFilters={false}
      fitColumnsToWidth={false}
      getRowId={(p) => String(p.data?.rollNumber ?? "")}
      pagination
      paginationPageSize={50}
      tableHeader={
        midExamMarks.length > 0 ? (
          <div className="table-context-header flex-wrap items-start gap-x-2 gap-y-1">
            <strong className="table-context-header__title whitespace-normal break-words text-[14px] font-semibold">
              {selectedFilterInfo}
            </strong>
            {selectedExamInfo ? (
              <span className="min-w-0 whitespace-normal break-words text-[13px] font-normal text-[darkgray]">
                ( {selectedExamInfo.trim()} )
              </span>
            ) : null}
          </div>
        ) : null
      }
      toolbar={
        midExamMarks.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search…",
              pdfDocumentTitle: "Internal Exam Average",
              exportExcel: false,
              exportPdf: false,
              lockColumnIds: ["siNo", "student"],
            }
          : false
      }
      toolbarTrailing={
        midExamMarks.length > 0 ? (
          <Button
            className="h-[30px] px-3 text-[12px]"
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        ) : undefined
      }
    />
  );
}
