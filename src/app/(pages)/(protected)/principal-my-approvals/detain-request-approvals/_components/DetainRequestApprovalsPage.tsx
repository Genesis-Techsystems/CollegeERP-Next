"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { utcMidnightIso } from "@/common/generic-functions";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getStudentInfoCollegeFilters,
  listDetainRecommendedStudentsForApproval,
  submitPrincipalDetainApproval,
  submitPrincipalInCollegeApproval,
} from "@/services";
import {
  DetainConfirmModal,
  type DetainConfirmMode,
} from "./DetainConfirmModal";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const UNIV = ["fk_university_id", "universityId"];
const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function studentId(row: AnyRow, fallback: number): number {
  return (
    pickNum(row, [
      "studentId",
      "fk_student_id",
      "student_id",
      "id",
      "studentDetailId",
    ]) || fallback
  );
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dedupeColleges(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const id = pickNum(r, COL);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out.sort(
    (a, b) => (Number(a.clg_sort_order) || 0) - (Number(b.clg_sort_order) || 0),
  );
}

function coursePath(row: AnyRow): string {
  return [
    pickText(row, ["collegeCode", "college_code"]),
    pickText(row, ["courseCode", "course_code"]),
    pickText(row, ["groupCode", "group_code"]),
    pickText(row, ["courseYearName", "course_year_name"]),
    pickText(row, ["section", "sectionName", "section_name"]),
  ]
    .filter(Boolean)
    .join("/");
}

function makeSelectRenderer(
  selectedIds: number[],
  onToggle: (id: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const sid = studentId(row, (p.node?.rowIndex ?? 0) + 1);
    return (
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={selectedIds.includes(sid)}
        onChange={(e) => onToggle(sid, e.target.checked)}
        aria-label={`Select ${pickText(row, ["firstName", "studentName"]) || "student"}`}
      />
    );
  };
}

/**
 * Angular `principal-my-approvals/detain-request-approvals` parity.
 */
export function DetainRequestApprovalsPage() {
  const { user } = useSessionContext();
  const employeeId = Number(user?.employeeId ?? 0);
  const organizationId = Number(user?.organizationId ?? 0);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [markAll, setMarkAll] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<DetainConfirmMode>("detain");

  const cascadeAutoFill = useRef(true);
  const loadSeq = useRef(0);

  const selectedRows = useMemo(
    () => rows.filter((row, i) => selectedIds.includes(studentId(row, i + 1))),
    [rows, selectedIds],
  );

  const colleges = useMemo(() => dedupeColleges(filtersData), [filtersData]);

  const academicYears = useMemo(() => {
    if (!collegeId) return [];
    const universityId = pickNum(
      filtersData.find((r) => pickNum(r, COL) === collegeId) ?? null,
      UNIV,
    );
    const list = academicYearData.filter(
      (r) => pickNum(r, UNIV) === universityId,
    );
    const seen = new Set<number>();
    const out: AnyRow[] = [];
    for (const r of list) {
      const id = pickNum(r, AY);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out.sort(
      (a, b) =>
        Number(pickText(b, ["academic_year", "academicYear"])) -
        Number(pickText(a, ["academic_year", "academicYear"])),
    );
  }, [academicYearData, collegeId, filtersData]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    const list = filtersData.filter((r) => pickNum(r, COL) === collegeId);
    const seen = new Set<number>();
    const out: AnyRow[] = [];
    for (const r of list) {
      const id = pickNum(r, CRS);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  }, [collegeId, filtersData]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const list = filtersData.filter(
      (r) => pickNum(r, COL) === collegeId && pickNum(r, CRS) === courseId,
    );
    const seen = new Set<number>();
    const out: AnyRow[] = [];
    for (const r of list) {
      const id = pickNum(r, GRP);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  }, [collegeId, courseId, filtersData]);

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const r = await getStudentInfoCollegeFilters(organizationId, employeeId);
      const filters = Array.isArray(r.filtersData) ? r.filtersData : [];
      const ay = Array.isArray(r.academicData) ? r.academicData : [];
      setFiltersData(filters);
      setAcademicYearData(ay);

      const clgs = dedupeColleges(filters);
      if (clgs.length > 0 && cascadeAutoFill.current) {
        setCollegeId(pickNum(clgs[0], COL) || null);
      }
    } catch (error) {
      toastError(error, "Failed to load filters");
    } finally {
      setLoadingFilters(false);
    }
  }, [employeeId, organizationId]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!collegeId || !cascadeAutoFill.current) return;
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    setAcademicYearId(pickNum(academicYears[0], AY) || null);
  }, [academicYears, collegeId]);

  useEffect(() => {
    if (!academicYearId || !cascadeAutoFill.current) return;
    if (courses.length === 0) {
      setCourseId(null);
      return;
    }
    setCourseId(pickNum(courses[0], CRS) || null);
  }, [academicYearId, courses]);

  useEffect(() => {
    if (!courseId || !cascadeAutoFill.current) return;
    if (courseGroups.length === 0) {
      setCourseGroupId(null);
      return;
    }
    setCourseGroupId(pickNum(courseGroups[0], GRP) || null);
  }, [courseGroups, courseId]);

  const loadStudents = useCallback(async () => {
    if (!collegeId || !courseGroupId) {
      setRows([]);
      setSelectedIds([]);
      setMarkAll(false);
      return;
    }
    const seq = ++loadSeq.current;
    setLoadingRows(true);
    try {
      const { rows: data } = await listDetainRecommendedStudentsForApproval({
        collegeId,
        courseGroupId,
      });
      if (seq !== loadSeq.current) return;
      setRows(
        data.map((row) => ({
          ...row,
          checked: false,
          isPresent: false,
        })),
      );
      setSelectedIds([]);
      setMarkAll(false);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      toastError(error, "Failed to load detain recommended students");
      setRows([]);
      setSelectedIds([]);
      setMarkAll(false);
    } finally {
      if (seq === loadSeq.current) setLoadingRows(false);
    }
  }, [collegeId, courseGroupId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id);
      setMarkAll(rows.length > 0 && next.length === rows.length);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      setMarkAll(false);
      return;
    }
    setSelectedIds(rows.map((row, i) => studentId(row, i + 1)));
    setMarkAll(true);
  }

  function openConfirm(mode: DetainConfirmMode) {
    if (selectedRows.length === 0) return;
    setConfirmMode(mode);
    setConfirmOpen(true);
  }

  async function onConfirm(details: AnyRow[]) {
    if (details.length === 0) return;
    const now = utcMidnightIso();
    const payload = details.map((row) => ({
      ...row,
      isActive: true,
      isPresent: true,
      fromDate: row.fromDate ?? now,
      toDate: row.toDate ?? now,
    }));

    setSubmitting(true);
    try {
      if (confirmMode === "detain") {
        const result = await submitPrincipalDetainApproval(payload);
        if (result.success) {
          toastSuccess(result.message || "Detain approved successfully");
        } else {
          toastInfo(result.message || "Detain request processed with warnings");
        }
      } else {
        await submitPrincipalInCollegeApproval(payload);
        toastSuccess("In College approved successfully");
      }
      setConfirmOpen(false);
      await loadStudents();
    } catch (error) {
      toastError(
        error,
        confirmMode === "detain"
          ? "Failed to approve detain"
          : "Failed to approve In College",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const collegeOpts = colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label: pickText(r, ["college_code", "collegeCode"]) || "College",
  }));
  const ayOpts = academicYears.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
  const courseOpts = courses.map((r) => ({
    value: String(pickNum(r, CRS)),
    label: pickText(r, ["course_code", "courseCode"]) || "Course",
  }));
  const groupOpts = courseGroups.map((r) => ({
    value: String(pickNum(r, GRP)),
    label: pickText(r, ["group_code", "groupCode"]) || "Group",
  }));

  const selectedCollegeLabel =
    collegeOpts.find((o) => o.value === String(collegeId))?.label ?? "";
  const selectedAyLabel =
    ayOpts.find((o) => o.value === String(academicYearId))?.label ?? "";
  const selectedCourseLabel =
    courseOpts.find((o) => o.value === String(courseId))?.label ?? "";
  const selectedGroupLabel =
    groupOpts.find((o) => o.value === String(courseGroupId))?.label ?? "";
  const filtersComplete = Boolean(collegeId && courseGroupId);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Roll No.",
        minWidth: 130,
        valueGetter: (p) =>
          pickText(p.data, ["rollNumber", "hallticketNumber"]) || "-",
      },
      {
        headerName: "Student Name",
        minWidth: 160,
        valueGetter: (p) =>
          pickText(p.data, ["firstName", "studentName"]) || "-",
      },
      {
        headerName: "Course",
        minWidth: 220,
        valueGetter: (p) => (p.data ? coursePath(p.data) : "-"),
      },
      {
        headerName: "Reason",
        minWidth: 140,
        valueGetter: (p) => pickText(p.data, ["reason"]) || "-",
      },
      {
        headerName: "Mark",
        width: 140,
        flex: 0,
        sortable: false,
        headerComponent: () => (
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={markAll}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            <span>{markAll ? "UnMark All" : "Mark All"}</span>
          </label>
        ),
        cellRenderer: makeSelectRenderer(selectedIds, toggleSelected),
      },
    ],
    [markAll, selectedIds],
  );

  return (
    <FilteredListPage
      title="Detain Request Approvals"
      tableTitle="Detain Request Approval List"
      showTable={filtersComplete}
      resultsVisible={filtersComplete}
      tableHeader={
        filtersComplete ? (
          <TableContextHeader
            title="Detain Request Approval List"
            info={[
              selectedCollegeLabel,
              selectedAyLabel,
              selectedCourseLabel,
              selectedGroupLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              required
              value={collegeId ? String(collegeId) : null}
              options={collegeOpts}
              placeholder="Select College"
              onChange={(v) => {
                cascadeAutoFill.current = v !== null && v !== "";
                setCollegeId(parseSelectNumber(v));
                setAcademicYearId(null);
                setCourseId(null);
                setCourseGroupId(null);
                setRows([]);
                setSelectedIds([]);
              }}
              disabled={loadingFilters || !collegeOpts.length}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              required
              value={academicYearId ? String(academicYearId) : null}
              options={ayOpts}
              placeholder="Select Academic Year"
              onChange={(v) => {
                cascadeAutoFill.current = v !== null && v !== "";
                setAcademicYearId(parseSelectNumber(v));
                setCourseId(null);
                setCourseGroupId(null);
                setRows([]);
                setSelectedIds([]);
              }}
              disabled={loadingFilters || !ayOpts.length}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course">
            <Select
              required
              value={courseId ? String(courseId) : null}
              options={courseOpts}
              placeholder="Select Course"
              onChange={(v) => {
                cascadeAutoFill.current = v !== null && v !== "";
                setCourseId(parseSelectNumber(v));
                setCourseGroupId(null);
                setRows([]);
                setSelectedIds([]);
              }}
              disabled={loadingFilters || !courseOpts.length}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group">
            <Select
              required
              value={courseGroupId ? String(courseGroupId) : null}
              options={groupOpts}
              placeholder="Select Course Group"
              onChange={(v) => {
                cascadeAutoFill.current = v !== null && v !== "";
                setCourseGroupId(parseSelectNumber(v));
              }}
              disabled={loadingFilters || !groupOpts.length}
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingRows}
      pagination
      toolbar={SEARCH_ONLY_TOOLBAR}
      rightRail={
        <div className="overflow-hidden rounded border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-[12px] font-semibold">
            <span>Selected Student List</span>
            <span>{selectedRows.length}</span>
          </div>
          <div className="max-h-[420px] overflow-auto p-3 text-[12px] text-slate-700">
            {selectedRows.length === 0 ? (
              <p>No Students Detain.</p>
            ) : (
              <ul className="space-y-2">
                {selectedRows.map((row, index) => (
                  <li key={`selected-${studentId(row, index + 1)}-${index}`}>
                    {pickText(row, ["firstName", "studentName"]) || "-"}{" "}
                    <span className="text-muted-foreground">
                      (
                      {pickText(row, ["rollNumber", "hallticketNumber"]) || "-"}
                      )
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      }
      afterGrid={
        selectedRows.length > 0 ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => openConfirm("detain")}
              disabled={submitting}
              className="h-8 bg-red-600 px-3 text-[12px] text-white hover:bg-red-700"
            >
              Detain
            </Button>
            <Button
              type="button"
              onClick={() => openConfirm("inCollege")}
              disabled={submitting}
              className="h-8 bg-emerald-600 px-3 text-[12px] text-white hover:bg-emerald-700"
            >
              In College
            </Button>
          </div>
        ) : null
      }
    >
      <DetainConfirmModal
        open={confirmOpen}
        mode={confirmMode}
        students={selectedRows}
        saving={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(details) => void onConfirm(details)}
      />
    </FilteredListPage>
  );
}
