"use client";

/**
 * Exam Center Barcodes — React port of Angular
 * `exam-papers-delivery-process/exam-center-barcodes`.
 *
 * Cascade:
 *  1. eg_filters → eg_ay_filter (AY + exam groups) + ec_filter (centers)
 *  2. eg_cg_cy_sub_filter → course group / year / subject
 *  3. Get Students → s_get_exam_center_details flag exam_center_students
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import {
  getExamCenterFilterGroups,
  getUnivEcStudentsByCodeGroups,
  listExamCenterBarcodeStudents,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

/** Angular supports `0` = All for course group / year / subject. */
const ALL = "0";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** Angular `tConvert` — 24h → 12h for session window on Exam Date. */
function tConvert(time?: string): string {
  if (!time) return "";
  const match = String(time).match(
    /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  );
  if (!match) return String(time);
  const hh = Number(match[1]);
  const mm = match[2];
  const ampm = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${mm} ${ampm}`;
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

interface FormState {
  academicYearId: string;
  examGroupId: string;
  univExamcenterId: string;
  courseGroupId: string;
  courseYearId: string;
  subjectId: string;
}

const EMPTY_FORM: FormState = {
  academicYearId: "",
  examGroupId: "",
  univExamcenterId: "",
  courseGroupId: ALL,
  courseYearId: ALL,
  subjectId: ALL,
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    minWidth: 70,
    flex: 0,
  } as ColDef<Row>,
  examCenter: {
    headerName: "Exam Center",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) =>
      txt(
        p.data?.examcenterCode ??
          p.data?.examCenterCode ??
          p.data?.exam_center_code ??
          p.data?.ec_code,
      ) || "—",
  } as ColDef<Row>,
  exam: {
    headerName: "Exam",
    minWidth: 220,
    flex: 1,
    valueGetter: (p) =>
      txt(p.data?.examName ?? p.data?.exam_name ?? p.data?.exam_short_name) ||
      "—",
  } as ColDef<Row>,
  subjectCode: {
    headerName: "Subject Code",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) =>
      txt(
        p.data?.subjectCode ?? p.data?.subject_code ?? p.data?.fk_subject_id,
      ) || "—",
  } as ColDef<Row>,
  student: {
    headerName: "Student",
    minWidth: 180,
    flex: 1,
    // Angular: {{ row.hallticketNumber }}
    valueGetter: (p) =>
      txt(
        p.data?.hallticketNumber ??
          p.data?.hallticket_number ??
          p.data?.hall_ticket_number,
      ) || "—",
  } as ColDef<Row>,
  examDate: {
    headerName: "Exam Date",
    minWidth: 220,
    flex: 1,
    // Angular: {{ row.exam_date }} — API often includes session window; append times when separate.
    valueGetter: (p) => {
      const r = p.data;
      if (!r) return "—";
      const date = txt(r.exam_date ?? r.examDate ?? r.examOn);
      if (!date) return "—";
      const start = tConvert(txt(r.session_start_time ?? r.sessionStartTime));
      const end = tConvert(txt(r.session_end_time ?? r.sessionEndTime));
      if (start && end && !date.includes(start))
        return `${date} (${start} - ${end})`;
      return date;
    },
  } as ColDef<Row>,
};

export default function ExamCenterBarcodesPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [ayFilterRows, setAyFilterRows] = useState<Row[]>([]);
  const [ecFilterRows, setEcFilterRows] = useState<Row[]>([]);
  const [cgCySubRows, setCgCySubRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ── Angular getExamCenters(): eg_filters → eg_ay_filter + ec_filter ──
  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const groups = await getExamCenterFilterGroups({
          flag: "eg_filters",
          flagType: "REGSUP",
        });
        const ay =
          groups.find(
            (g) => g.length > 0 && txt(g[0].flag) === "eg_ay_filter",
          ) ?? [];
        const ec =
          groups.find((g) => g.length > 0 && txt(g[0].flag) === "ec_filter") ??
          groups.find((g) => g.length > 0 && num(g[0].fk_univ_ec_id) > 0) ??
          [];
        setAyFilterRows(ay);
        setEcFilterRows(ec);
        const years = dedupeBy(ay, (r) => num(r.fk_academic_year_id));
        if (years[0]) {
          setForm({
            ...EMPTY_FORM,
            academicYearId: String(num(years[0].fk_academic_year_id)),
          });
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, []);

  const academicYears = useMemo(
    () => dedupeBy(ayFilterRows, (r) => num(r.fk_academic_year_id)),
    [ayFilterRows],
  );

  const examGroups = useMemo(
    () =>
      dedupeBy(
        ayFilterRows.filter(
          (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
        ),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [ayFilterRows, form.academicYearId],
  );

  // Angular selectedExamGroup: centers for university of selected AY
  const examCenters = useMemo(() => {
    const ayRow = ayFilterRows.find(
      (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
    );
    const universityId = num(ayRow?.fk_university_id ?? ayRow?.universityId);
    const filtered = universityId
      ? ecFilterRows.filter(
          (r) => num(r.fk_university_id ?? r.universityId) === universityId,
        )
      : ecFilterRows;
    return dedupeBy(filtered, (r) =>
      num(r.fk_univ_ec_id ?? r.univExamcenterId ?? r.univ_examcenter_id),
    );
  }, [ayFilterRows, ecFilterRows, form.academicYearId]);

  const courseGroups = useMemo(
    () => dedupeBy(cgCySubRows, (r) => num(r.fk_course_group_id)),
    [cgCySubRows],
  );

  const courseYears = useMemo(() => {
    const gid = Number(form.courseGroupId);
    const source =
      gid === 0
        ? cgCySubRows
        : cgCySubRows.filter((r) => num(r.fk_course_group_id) === gid);
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [cgCySubRows, form.courseGroupId]);

  const subjects = useMemo(() => {
    const gid = Number(form.courseGroupId);
    const yid = Number(form.courseYearId);
    const source = cgCySubRows.filter(
      (r) =>
        (gid === 0 || num(r.fk_course_group_id) === gid) &&
        (yid === 0 || num(r.fk_course_year_id) === yid),
    );
    return dedupeBy(source, (r) => num(r.fk_subject_id));
  }, [cgCySubRows, form.courseGroupId, form.courseYearId]);

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label:
          txt(r.academic_year ?? r.academicYear) ||
          String(num(r.fk_academic_year_id)),
      })),
    [academicYears],
  );

  const examGroupOptions: SelectOption[] = useMemo(
    () =>
      examGroups.map((r) => ({
        value: String(num(r.fk_univ_exam_group_id)),
        label:
          txt(
            r.exam_group_code ?? r.examGroupCode ?? r.exam_name ?? r.examName,
          ) || String(num(r.fk_univ_exam_group_id)),
      })),
    [examGroups],
  );

  const examCenterOptions: SelectOption[] = useMemo(
    () =>
      examCenters.map((r) => ({
        value: String(
          num(r.fk_univ_ec_id ?? r.univExamcenterId ?? r.univ_examcenter_id),
        ),
        label:
          txt(r.ec_code ?? r.examcenterCode ?? r.examCenterCode ?? r.ec_name) ||
          "—",
      })),
    [examCenters],
  );

  const courseGroupOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...courseGroups.map((r) => ({
        value: String(num(r.fk_course_group_id)),
        label:
          txt(r.group_code ?? r.groupCode) || String(num(r.fk_course_group_id)),
      })),
    ],
    [courseGroups],
  );

  const courseYearOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label:
          txt(r.course_year_code ?? r.courseYearCode) ||
          String(num(r.fk_course_year_id)),
      })),
    ],
    [courseYears],
  );

  const subjectOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name ?? r.subjectName) || "—"} (${txt(r.subject_code ?? r.subjectCode) || "—"})`,
      })),
    ],
    [subjects],
  );

  // Auto first exam group when AY changes
  useEffect(() => {
    if (!form.academicYearId || examGroups.length === 0) return;
    const ok = examGroups.some(
      (r) => num(r.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
      univExamcenterId: "",
      courseGroupId: ALL,
      courseYearId: ALL,
      subjectId: ALL,
    }));
    setCgCySubRows([]);
    setRows([]);
    setHasFetched(false);
  }, [form.academicYearId, form.examGroupId, examGroups]);

  // Auto first exam center when centers list updates
  useEffect(() => {
    if (!form.examGroupId || examCenters.length === 0) return;
    const ok = examCenters.some(
      (r) =>
        num(r.fk_univ_ec_id ?? r.univExamcenterId ?? r.univ_examcenter_id) ===
        Number(form.univExamcenterId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      univExamcenterId: String(
        num(
          examCenters[0].fk_univ_ec_id ??
            examCenters[0].univExamcenterId ??
            examCenters[0].univ_examcenter_id,
        ),
      ),
      courseGroupId: ALL,
      courseYearId: ALL,
      subjectId: ALL,
    }));
  }, [form.examGroupId, form.univExamcenterId, examCenters]);

  // Angular selectedExamCenter → eg_cg_cy_sub_filter
  useEffect(() => {
    async function loadCgCySub() {
      if (!form.academicYearId || !form.examGroupId || !form.univExamcenterId) {
        setCgCySubRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const groups = await getUnivEcStudentsByCodeGroups({
          flag: "eg_cg_cy_sub_filter",
          flagType: "REGSUP",
          univExamcenterId: Number(form.univExamcenterId),
          examGroupId: Number(form.examGroupId),
          academicYearId: Number(form.academicYearId),
        });
        const list = groups[0] ?? [];
        setCgCySubRows(list);
        const groupsDedupe = dedupeBy(list, (r) => num(r.fk_course_group_id));
        const firstGroupId = groupsDedupe[0]
          ? String(num(groupsDedupe[0].fk_course_group_id))
          : ALL;
        const yearsForGroup =
          firstGroupId === ALL
            ? list
            : list.filter(
                (r) => num(r.fk_course_group_id) === Number(firstGroupId),
              );
        const yearsDedupe = dedupeBy(yearsForGroup, (r) =>
          num(r.fk_course_year_id),
        );
        const firstYearId = yearsDedupe[0]
          ? String(num(yearsDedupe[0].fk_course_year_id))
          : ALL;
        const subSource = list.filter(
          (r) =>
            (Number(firstGroupId) === 0 ||
              num(r.fk_course_group_id) === Number(firstGroupId)) &&
            (Number(firstYearId) === 0 ||
              num(r.fk_course_year_id) === Number(firstYearId)),
        );
        const subsDedupe = dedupeBy(subSource, (r) => num(r.fk_subject_id));
        const firstSubjectId = subsDedupe[0]
          ? String(num(subsDedupe[0].fk_subject_id))
          : ALL;
        setForm((f) => ({
          ...f,
          courseGroupId: firstGroupId,
          courseYearId: firstYearId,
          subjectId: firstSubjectId,
        }));
        setRows([]);
        setHasFetched(false);
      } catch (e) {
        toastError(e, "Failed to load course / subject filters");
        setCgCySubRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadCgCySub();
  }, [form.academicYearId, form.examGroupId, form.univExamcenterId]);

  // Keep year/subject in sync when group changes
  useEffect(() => {
    if (!cgCySubRows.length) return;
    const gid = Number(form.courseGroupId);
    const years =
      gid === 0
        ? cgCySubRows
        : cgCySubRows.filter((r) => num(r.fk_course_group_id) === gid);
    const yearsDedupe = dedupeBy(years, (r) => num(r.fk_course_year_id));
    const yOk = yearsDedupe.some(
      (r) => num(r.fk_course_year_id) === Number(form.courseYearId),
    );
    if (!yOk && yearsDedupe[0]) {
      setForm((f) => ({
        ...f,
        courseYearId: String(num(yearsDedupe[0].fk_course_year_id)),
        subjectId: ALL,
      }));
    }
  }, [form.courseGroupId, form.courseYearId, cgCySubRows]);

  useEffect(() => {
    if (!cgCySubRows.length) return;
    const gid = Number(form.courseGroupId);
    const yid = Number(form.courseYearId);
    const source = cgCySubRows.filter(
      (r) =>
        (gid === 0 || num(r.fk_course_group_id) === gid) &&
        (yid === 0 || num(r.fk_course_year_id) === yid),
    );
    const subs = dedupeBy(source, (r) => num(r.fk_subject_id));
    const ok = subs.some(
      (r) => num(r.fk_subject_id) === Number(form.subjectId),
    );
    if (!ok && subs[0]) {
      setForm((f) => ({ ...f, subjectId: String(num(subs[0].fk_subject_id)) }));
    }
  }, [form.courseGroupId, form.courseYearId, form.subjectId, cgCySubRows]);

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.examCenter,
      COL_DEFS.exam,
      COL_DEFS.subjectCode,
      COL_DEFS.student,
      COL_DEFS.examDate,
    ],
    [],
  );

  const getRowId = useCallback((p: { data?: Row }) => {
    const d = p.data;
    if (!d) return "";
    const det = num(
      d.fk_exam_std_det_id ??
        d.examStdDetId ??
        d.pk_univ_ec_student_id ??
        d.univEcStudentId,
    );
    if (det > 0) return String(det);
    const ht = txt(d.hallticket_number ?? d.hallticketNumber);
    const seat = txt(d.seat_no ?? d.omr_serial_no ?? d.omrSerialNo);
    const sub = num(d.fk_subject_id ?? d.subjectId);
    return `row-${ht}-${seat}-${sub}`;
  }, []);

  async function getList() {
    if (!form.academicYearId || !form.examGroupId || !form.univExamcenterId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await listExamCenterBarcodeStudents({
        univExamcenterId: Number(form.univExamcenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        courseGroupId: Number(form.courseGroupId || 0),
        courseYearId: Number(form.courseYearId || 0),
        subjectId: Number(form.subjectId || 0),
      });
      setRows(Array.isArray(list) ? list : []);
      if (!list?.length)
        toast.info("No students found for the selected filters");
    } catch (e) {
      toastError(e, "Failed to load students");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FilteredListPage
      title="Exam Center Barcodes"
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="space-y-1 md:col-span-3">
            <Label>Academic Year *</Label>
            <Select
              value={form.academicYearId || null}
              onChange={(v) =>
                setForm({
                  ...EMPTY_FORM,
                  academicYearId: v ?? "",
                })
              }
              options={academicYearOptions}
              placeholder="Academic Year"
              isLoading={loadingFilters}
              disabled={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Group *</Label>
            <Select
              value={form.examGroupId || null}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  examGroupId: v ?? "",
                  univExamcenterId: "",
                  courseGroupId: ALL,
                  courseYearId: ALL,
                  subjectId: ALL,
                }))
              }
              options={examGroupOptions}
              placeholder="Exam Group"
              disabled={loadingFilters || !form.academicYearId}
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label>Exam Center *</Label>
            <Select
              value={form.univExamcenterId || null}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  univExamcenterId: v ?? "",
                  courseGroupId: ALL,
                  courseYearId: ALL,
                  subjectId: ALL,
                }))
              }
              options={examCenterOptions}
              placeholder="Exam Center"
              disabled={loadingFilters || !form.examGroupId}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Course Group</Label>
            <Select
              value={form.courseGroupId || ALL}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  courseGroupId: v ?? ALL,
                  courseYearId: ALL,
                  subjectId: ALL,
                }))
              }
              options={courseGroupOptions}
              placeholder="All"
              disabled={loadingFilters || !form.univExamcenterId}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Course Years *</Label>
            <Select
              value={form.courseYearId || ALL}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  courseYearId: v ?? ALL,
                  subjectId: ALL,
                }))
              }
              options={courseYearOptions}
              placeholder="All"
              disabled={loadingFilters || !form.univExamcenterId}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Subjects</Label>
            <Select
              value={form.subjectId || ALL}
              onChange={(v) => setForm((f) => ({ ...f, subjectId: v ?? ALL }))}
              options={subjectOptions}
              placeholder="All"
              searchable={subjectOptions.length > 8}
              disabled={loadingFilters || !form.univExamcenterId}
            />
          </div>
          <div className="flex flex-col justify-end md:col-span-2 md:items-end">
            <Button
              type="button"
              onClick={() => void getList()}
              disabled={loading || loadingFilters}
              className="h-8 w-full shrink-0 px-2.5 text-[12px] md:w-auto"
            >
              Get Students
            </Button>
          </div>
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: "Search students…",
        pdfDocumentTitle: "Exam Center Barcodes",
      }}
    />
  );
}
