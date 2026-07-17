"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getGeneralDetails,
  listAcademicBatchesOfStudent,
  listAcademicYears,
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
  listGroupSections,
  listRegulationsByCourse,
  listStudents,
  updateAcademicBatchRecord,
} from "@/services";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

/** Mirrors Angular `genericFunctions.momentWithTime()`. */
function toDateTime(d: Date | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatDateText(v: unknown) {
  if (!v) return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return s(v);
  return d.toLocaleString();
}

function sectionText(row: AnyRow, kind: "from" | "to") {
  return kind === "from"
    ? s(
        row.fromGroupSectionName ??
          row.fromSectionName ??
          row.from_section_name ??
          row.fromSection,
      )
    : s(
        row.toGroupSectionName ??
          row.toSectionName ??
          row.to_section_name ??
          row.toSection,
      );
}

function idStr(v: unknown): string | null {
  const num = n(v);
  return num > 0 ? String(num) : null;
}

function makeActionsRenderer(onEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="text-primary"
      aria-label="Edit record"
      onClick={() => onEdit((p.data ?? {}) as AnyRow)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

export default function AcademicBatchesPage() {
  const [searchRows, setSearchRows] = useState<AnyRow[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentHistoryRows, setStudentHistoryRows] = useState<AnyRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<AnyRow | null>(null);
  const [editAcademicYearId, setEditAcademicYearId] = useState<string | null>(
    null,
  );
  const [editRegulationId, setEditRegulationId] = useState<string | null>(null);
  const [editCourseGroupId, setEditCourseGroupId] = useState<string | null>(
    null,
  );
  const [editFromCourseYearId, setEditFromCourseYearId] = useState<
    string | null
  >(null);
  const [editFromSectionId, setEditFromSectionId] = useState<string | null>(
    null,
  );
  const [editFromDate, setEditFromDate] = useState<Date | null>(null);
  const [editToCourseYearId, setEditToCourseYearId] = useState<string | null>(
    null,
  );
  const [editToSectionId, setEditToSectionId] = useState<string | null>(null);
  const [editToDate, setEditToDate] = useState<Date | null>(null);
  const [editStudentStatusId, setEditStudentStatusId] = useState<string | null>(
    null,
  );
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewReason, setEditNewReason] = useState("");
  const [toDateDisabled, setToDateDisabled] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);

  const [academicYearOptions, setAcademicYearOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [regulationOptions, setRegulationOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [groupOptions, setGroupOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [fromSectionOptions, setFromSectionOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [toSectionOptions, setToSectionOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [studentStatusOptions, setStudentStatusOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const studentOptions = useMemo(
    () =>
      searchRows.map((row) => ({
        value: String(
          n(row.studentId ?? row.fk_student_id ?? row.student_id ?? row.id),
        ),
        label: `${s(row.rollNumber ?? row.hallticketNumber ?? "-")} (${s(row.firstName ?? row.studentName ?? "-")})`,
      })),
    [searchRows],
  );

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length < 3) return;
    setLoadingSearch(true);
    try {
      const rows = await listStudents(q);
      setSearchRows(Array.isArray(rows) ? rows : []);
    } catch {
      setSearchRows([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function reloadHistory(id: number) {
    setLoadingHistory(true);
    try {
      const rows = await listAcademicBatchesOfStudent(id).catch(() => []);
      setStudentHistoryRows(Array.isArray(rows) ? rows : []);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (!studentId) {
      setStudentHistoryRows([]);
      return;
    }
    void reloadHistory(studentId);
  }, [studentId]);

  const selectedStudent = useMemo(
    () =>
      searchRows.find(
        (r) =>
          n(r.studentId ?? r.fk_student_id ?? r.student_id ?? r.id) ===
          (studentId ?? 0),
      ) ?? null,
    [searchRows, studentId],
  );

  const modalStudentText = useMemo(() => {
    const name =
      s(selectedStudent?.firstName ?? selectedStudent?.studentName) ||
      s(editRow?.firstName ?? editRow?.studentName);
    const roll =
      s(selectedStudent?.rollNumber ?? selectedStudent?.hallticketNumber) ||
      s(editRow?.rollNo ?? editRow?.rollNumber ?? editRow?.hallticketNumber);
    return `${name || "-"} (${roll || "-"})`;
  }, [selectedStudent, editRow]);

  const historyColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        width: 70,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        headerName: "Course",
        minWidth: 220,
        valueGetter: (p) => {
          const row = (p.data ?? {}) as AnyRow;
          return (
            [
              s(row.collegeCode),
              s(row.courseName ?? row.courseCode),
              s(row.groupCode),
              s(row.academicYear),
            ]
              .filter(Boolean)
              .join(" / ") || "-"
          );
        },
      },
      {
        headerName: "From Course Year",
        minWidth: 150,
        valueGetter: (p) =>
          s(p.data?.fromCourseYearName ?? p.data?.courseYearName) || "-",
      },
      {
        headerName: "From Section",
        minWidth: 120,
        valueGetter: (p) =>
          sectionText((p.data ?? {}) as AnyRow, "from") || "-",
      },
      {
        headerName: "To Course Year",
        minWidth: 150,
        valueGetter: (p) =>
          s(p.data?.toCourseYearName ?? p.data?.courseYearName) || "-",
      },
      {
        headerName: "To Section",
        minWidth: 120,
        valueGetter: (p) => sectionText((p.data ?? {}) as AnyRow, "to") || "-",
      },
      {
        headerName: "From Date",
        minWidth: 170,
        valueGetter: (p) =>
          formatDateText(p.data?.fromDate ?? p.data?.from_date),
      },
      {
        headerName: "To Date",
        minWidth: 170,
        valueGetter: (p) => formatDateText(p.data?.toDate ?? p.data?.to_date),
      },
      {
        headerName: "Student Status",
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <span className="font-semibold text-green-700">
            {s(
              p.data?.studentStatusName ??
                p.data?.studentStatusCode ??
                p.data?.student_status_code ??
                p.data?.studentStatus,
            ) || "-"}
          </span>
        ),
      },
      {
        headerName: "Status",
        width: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <StatusBadge status={p.data?.isActive !== false} />
        ),
      },
      {
        headerName: "Reason",
        minWidth: 130,
        valueGetter: (p) => s(p.data?.reason ?? p.data?.changeReason) || "-",
      },
      {
        headerName: "Actions",
        width: 80,
        flex: 0,
        cellRenderer: makeActionsRenderer((row) => {
          void openEdit(row);
        }),
      },
    ],
    // openEdit is stable enough for this page; recreate when history changes so rows stay fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentHistoryRows],
  );

  function sectionOptionsFromRows(rows: AnyRow[]) {
    return rows
      .map((r) => {
        const id = idStr(r.groupSectionId ?? r.group_section_id);
        if (!id) return null;
        const section =
          s(r.section ?? r.groupSectionName ?? r.group_section_name) || id;
        const ay = s(r.academicYear ?? r.academic_year);
        return { value: id, label: ay ? `${section} - (${ay})` : section };
      })
      .filter(Boolean) as { value: string; label: string }[];
  }

  async function loadFromSections(
    courseYearId: string | null,
    academicYearId: string | null,
    courseGroupId: string | null,
  ) {
    const cy = n(courseYearId);
    const ay = n(academicYearId);
    const cg = n(courseGroupId);
    if (!cy || !ay || !cg) {
      setFromSectionOptions([]);
      return;
    }
    const rows = await listGroupSections(cy, ay, cg).catch(() => []);
    setFromSectionOptions(sectionOptionsFromRows(rows));
  }

  async function loadToSections(
    courseYearId: string | null,
    academicYearId: string | null,
    courseGroupId: string | null,
  ) {
    const cy = n(courseYearId);
    const ay = n(academicYearId);
    const cg = n(courseGroupId);
    if (!cy || !ay || !cg) {
      setToSectionOptions([]);
      return;
    }
    const rows = await listGroupSections(cy, ay, cg).catch(() => []);
    setToSectionOptions(sectionOptionsFromRows(rows));
  }

  async function openEdit(row: AnyRow) {
    setEditRow(row);
    setEditAcademicYearId(idStr(row.academicYearId));
    setEditRegulationId(idStr(row.regulationId));
    setEditCourseGroupId(idStr(row.courseGroupId));
    setEditFromCourseYearId(idStr(row.fromCourseYearId));
    setEditFromSectionId(idStr(row.fromGroupSectionId ?? row.fromSectionId));
    setEditFromDate(row?.fromDate ? new Date(String(row.fromDate)) : null);
    setEditToCourseYearId(idStr(row.toCourseYearId));
    setEditToSectionId(idStr(row.toGroupSectionId ?? row.toSectionId));
    const hadToDate = row?.toDate != null && s(row.toDate) !== "";
    setToDateDisabled(!hadToDate);
    setEditToDate(hadToDate ? new Date(String(row.toDate)) : null);
    setEditStudentStatusId(idStr(row.studentStatusId));
    setEditIsActive(row?.isActive !== false);
    setEditNewReason("");
    setEditOpen(true);

    const courseId = n(row.courseId);
    setLoadingEditOptions(true);
    try {
      const [years, regulations, groups, courseYears, statuses] =
        await Promise.all([
          listAcademicYears().catch(() => []),
          courseId
            ? listRegulationsByCourse(courseId).catch(() => [])
            : Promise.resolve([]),
          courseId
            ? listCourseGroupsByCourse(courseId).catch(() => [])
            : Promise.resolve([]),
          courseId
            ? listCourseYearsByCourse(courseId).catch(() => [])
            : Promise.resolve([]),
          getGeneralDetails(GM_CODES.STUDENT_STATUS).catch(() => []),
        ]);

      setAcademicYearOptions(
        years
          .map((r: AnyRow) => ({
            value: String(n(r.academicYearId)),
            label:
              s(r.academicYear ?? r.academicYearName) ||
              String(n(r.academicYearId)),
          }))
          .filter((o) => n(o.value) > 0),
      );
      setRegulationOptions(
        regulations
          .map((r: AnyRow) => ({
            value: String(n(r.regulationId)),
            label:
              s(r.regulationName ?? r.regulationCode) ||
              String(n(r.regulationId)),
          }))
          .filter((o) => n(o.value) > 0),
      );
      setGroupOptions(
        groups
          .map((r: AnyRow) => ({
            value: String(n(r.courseGroupId)),
            label: s(r.groupCode ?? r.groupName) || String(n(r.courseGroupId)),
          }))
          .filter((o) => n(o.value) > 0),
      );
      setYearOptions(
        courseYears
          .map((r: AnyRow) => ({
            value: String(n(r.courseYearId)),
            label: s(r.courseYearName) || String(n(r.courseYearId)),
          }))
          .filter((o) => n(o.value) > 0),
      );
      setStudentStatusOptions(
        statuses
          .map((r: AnyRow) => ({
            value: String(n(r.generalDetailId)),
            label:
              s(r.generalDetailDisplayName ?? r.generalDetailCode) ||
              String(n(r.generalDetailId)),
          }))
          .filter((o) => n(o.value) > 0),
      );

      await Promise.all([
        loadFromSections(
          idStr(row.fromCourseYearId),
          idStr(row.academicYearId),
          idStr(row.courseGroupId),
        ),
        loadToSections(
          idStr(row.toCourseYearId ?? row.fromCourseYearId),
          idStr(row.academicYearId),
          idStr(row.courseGroupId),
        ),
      ]);
    } finally {
      setLoadingEditOptions(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow) return;
    if (
      !editAcademicYearId ||
      !editRegulationId ||
      !editCourseGroupId ||
      !editFromCourseYearId ||
      !editStudentStatusId
    ) {
      toastError("Please fill all required fields");
      return;
    }
    if (!editFromDate) {
      toastError("From date is required");
      return;
    }
    if (!toDateDisabled && !editToDate) {
      toastError("To date is required");
      return;
    }
    if (!editNewReason.trim()) {
      toastError("Reason is required");
      return;
    }
    if (editToDate && editFromDate.getTime() > editToDate.getTime()) {
      toastError("From date should be less than To date");
      return;
    }

    setSavingEdit(true);
    try {
      const existingReason = s(editRow.reason);
      const payload: AnyRow = {
        ...editRow,
        courseGroupId: n(editCourseGroupId),
        fromCourseYearId: n(editFromCourseYearId),
        toCourseYearId: editToCourseYearId ? n(editToCourseYearId) : null,
        fromGroupSectionId: editFromSectionId ? n(editFromSectionId) : null,
        toGroupSectionId: editToSectionId ? n(editToSectionId) : null,
        fromBatchId: editRow.fromBatchId,
        toBatchId: editRow.fromBatchId,
        academicYearId: n(editAcademicYearId),
        regulationId: n(editRegulationId),
        fromDate: toDateTime(editFromDate),
        toDate:
          toDateDisabled || editRow.toDate == null
            ? null
            : toDateTime(editToDate),
        studentStatusId: n(editStudentStatusId),
        isActive: editIsActive,
        reason: existingReason
          ? `${existingReason} - ${editNewReason.trim()}`
          : editNewReason.trim(),
        isPromoted: editRow.isPromoted ?? false,
      };
      await updateAcademicBatchRecord(payload);
      toastSuccess("Academic batch record updated successfully");
      setEditOpen(false);
      if (studentId) await reloadHistory(studentId);
    } catch (err) {
      toastError(
        err instanceof Error
          ? err.message
          : "Failed to update academic batch record",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <>
      <FilteredListPage
        title="Academic Batches Of Student"
        filters={
          <Select
            label="Student"
            value={studentId ? String(studentId) : null}
            onChange={(v) => setStudentId(v ? Number(v) : null)}
            options={studentOptions}
            placeholder="Student"
            searchable
            clearable
            onSearch={(term) => {
              void onSearchStudents(term);
            }}
            isLoading={loadingSearch}
            className="w-full max-w-md"
            listClassName="max-h-40"
          />
        }
        rowData={studentId ? studentHistoryRows : []}
        columnDefs={historyColumnDefs}
        loading={loadingHistory}
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
      />
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Academic Batch"
        onSubmit={() => {
          void onSaveEdit();
        }}
        submitLabel={savingEdit ? "Saving..." : "Save"}
        isSubmitting={savingEdit || loadingEditOptions}
        size="xl"
        contentClassName="sm:max-w-5xl"
        titleClassName="text-teal-600"
        formClassName="space-y-5 py-1"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <div>College :</div>
              <div className="font-semibold text-primary">
                {s(editRow?.collegeCode)} / {s(editRow?.academicYear)}
              </div>
              <div>Course :</div>
              <div className="font-semibold text-primary">
                {s(editRow?.courseName ?? editRow?.courseCode)}
              </div>
              <div>Student :</div>
              <div className="font-semibold text-primary">
                {modalStudentText}
              </div>
              <div>Batch :</div>
              <div className="font-semibold text-primary">
                {s(
                  editRow?.fromBatchName ??
                    editRow?.batchName ??
                    editRow?.batch,
                ) || "-"}
              </div>
              <div>Reason :</div>
              <div className="font-semibold text-primary">
                {s(editRow?.reason) || "-"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Academic Year *"
              value={editAcademicYearId}
              onChange={(v) => {
                setEditAcademicYearId(v);
                void loadFromSections(
                  editFromCourseYearId,
                  v,
                  editCourseGroupId,
                );
                void loadToSections(
                  editToCourseYearId ?? editFromCourseYearId,
                  v,
                  editCourseGroupId,
                );
              }}
              options={academicYearOptions}
              searchable
              isLoading={loadingEditOptions}
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <Select
              label="Regulation *"
              value={editRegulationId}
              onChange={setEditRegulationId}
              options={regulationOptions}
              searchable
              isLoading={loadingEditOptions}
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <Select
              label="Course Group *"
              value={editCourseGroupId}
              onChange={(v) => {
                setEditCourseGroupId(v);
                void loadFromSections(
                  editFromCourseYearId,
                  editAcademicYearId,
                  v,
                );
                void loadToSections(
                  editToCourseYearId ?? editFromCourseYearId,
                  editAcademicYearId,
                  v,
                );
              }}
              options={groupOptions}
              searchable
              isLoading={loadingEditOptions}
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <div />
            <Select
              label="From Course Year *"
              value={editFromCourseYearId}
              onChange={(v) => {
                setEditFromCourseYearId(v);
                setEditFromSectionId(null);
                void loadFromSections(v, editAcademicYearId, editCourseGroupId);
              }}
              options={yearOptions}
              searchable
              isLoading={loadingEditOptions}
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <Select
              label="From Section"
              value={editFromSectionId}
              onChange={setEditFromSectionId}
              options={fromSectionOptions}
              searchable
              clearable
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <DatePicker
              label="From Date *"
              value={editFromDate}
              onChange={setEditFromDate}
              placeholder="Select date"
            />
            <Select
              label="To Course Year"
              value={editToCourseYearId}
              onChange={(v) => {
                setEditToCourseYearId(v);
                setEditToSectionId(null);
                void loadToSections(v, editAcademicYearId, editCourseGroupId);
              }}
              options={yearOptions}
              searchable
              clearable
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <Select
              label="To Section"
              value={editToSectionId}
              onChange={setEditToSectionId}
              options={toSectionOptions}
              searchable
              clearable
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <DatePicker
              label="To Date *"
              value={editToDate}
              onChange={setEditToDate}
              placeholder="Select date"
              disabled={toDateDisabled}
            />
            <Select
              label="Student Status *"
              value={editStudentStatusId}
              onChange={setEditStudentStatusId}
              options={studentStatusOptions}
              searchable
              isLoading={loadingEditOptions}
              className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl"
            />
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>
          <Input
            value={editNewReason}
            onChange={(e) => setEditNewReason(e.target.value)}
            placeholder="Reason *"
            className="h-11 rounded-xl"
            required
          />
        </div>
      </FormModal>
    </>
  );
}
