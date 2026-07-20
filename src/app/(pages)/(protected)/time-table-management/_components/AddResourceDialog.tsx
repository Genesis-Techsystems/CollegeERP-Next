"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { ConfirmDialog } from "@/common/components/feedback";
import { FormModal } from "@/common/components/feedback";
import { DataTable } from "@/common/components/table";
import {
  MultiSelect,
  Select,
  type SelectOption,
} from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { utcMidnightIso } from "@/common/generic-functions";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  deleteSubjectResourceStaff,
  listRooms,
  listStudentBatchesForLabAssign,
  listSubjectCourseYearsForAssign,
  listSubjectResourcesBySchedule,
  listSubjectTypes,
  saveSubjectResources,
  type TimetableDayColumn,
  type TimetableDayTiming,
} from "@/services";
import {
  buildSubjectResourceSavePayload,
  type AssignResourceRow,
} from "../_lib/assign-resource-payload";
import { formatClockAmPm } from "../_lib/timetable-filters";
import { AttendanceConflictDialog } from "./AttendanceConflictDialog";

type AnyRow = Record<string, unknown>;

export type AssignResourceDialogContext = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  collegeCode: string;
  academicYearName: string;
  courseName: string;
  groupName: string;
  courseYearName: string;
  groupSectionName: string;
  timetable: AnyRow;
  scheduleTimings: AnyRow[];
};

type AddResourceDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  timing: TimetableDayTiming;
  weekday: TimetableDayColumn;
  context: AssignResourceDialogContext;
};

const DEFAULT_COLOR = "#dedede";

function n(value: unknown): number {
  const x = Number(value ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function mapExistingResources(resources: AnyRow[]): AssignResourceRow[] {
  return resources.map((res) => ({
    subjectResourceId: n(res.subjectResourceId) || undefined,
    subjectCourseYearId: n(res.subjectCourseYearId) || null,
    courseYearStaffId: n(res.courseYearStaffId) || null,
    roomId: n(res.roomId) || null,
    fromDate: (res.fromDate as string) ?? null,
    toDate: (res.toDate as string) ?? null,
    colorCode: String(res.colorCode ?? DEFAULT_COLOR),
    collegeId: n(res.collegeId),
    courseGroupId: n(res.courseGroupId),
    courseYearId: n(res.courseYearId),
    groupSectionId: n(res.groupSectionId),
    isStaffUpdate: true,
    studentBatchId: n(res.studentBatchId) || null,
    studentBatchName: text(res, ["studentBatchName", "batchName"]),
    isActive: res.isActive !== false,
    subjectTypeId: n(res.subjectTypeId),
    timetableScheduleId: n(res.timetableScheduleId),
    academicYearID: n(res.academicYearID ?? res.academicYearId),
    subjectTypeCode: text(res, ["subjectTypeCode", "subjectTypeName"]),
    subjectName: text(res, ["subjectName"]),
    subjectCode: text(res, ["subjectCode", "shortName"]),
    staff: [],
  }));
}

function createBlankResource(
  context: AssignResourceDialogContext,
  subjectTypeId: number,
  subjectTypeCode: string,
  timetableScheduleId: number,
  endDate: string,
): AssignResourceRow {
  return {
    subjectCourseYearId: null,
    courseYearStaffId: null,
    roomId: null,
    fromDate: utcMidnightIso(new Date()),
    toDate: endDate,
    colorCode: DEFAULT_COLOR,
    collegeId: context.collegeId,
    courseGroupId: context.courseGroupId,
    courseYearId: context.courseYearId,
    groupSectionId: context.groupSectionId,
    isStaffUpdate: true,
    studentBatchId: null,
    isActive: true,
    subjectTypeId,
    timetableScheduleId,
    academicYearID: context.academicYearId,
    subjectTypeCode,
    staff: [],
  };
}

const HISTORY_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  staffName: { headerName: "Staff", minWidth: 160 } as ColDef<AnyRow>,
  subjectName: { headerName: "Subject", minWidth: 180 } as ColDef<AnyRow>,
  fromDate: { headerName: "Date", minWidth: 180 } as ColDef<AnyRow>,
};

function historyStaffRenderer(p: ICellRendererParams<AnyRow>) {
  const name = String(p.data?.staffName ?? "");
  const emp = String(p.data?.empNumber ?? "");
  return emp ? `${name} (${emp})` : name || "—";
}

function historySubjectRenderer(p: ICellRendererParams<AnyRow>) {
  const subject = String(p.data?.subjectName ?? "");
  const type = String(p.data?.subjectTypeCode ?? "");
  const batch = String(p.data?.studentBatchName ?? "");
  if (!subject) return "—";
  if (type === "LAB" && batch) return `${subject} (${type} - ${batch})`;
  return type ? `${subject} (${type})` : subject;
}

function historyDateRenderer(p: ICellRendererParams<AnyRow>) {
  const from = p.data?.fromDate
    ? new Date(String(p.data.fromDate)).toLocaleDateString()
    : "";
  const to = p.data?.toDate
    ? new Date(String(p.data.toDate)).toLocaleDateString()
    : "";
  if (from && to) return `${from} - ${to}`;
  return from || to || "—";
}

export function AddResourceDialog({
  open,
  onClose,
  onSaved,
  timing,
  weekday,
  context,
}: AddResourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjectTypes, setSubjectTypes] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [rooms, setRooms] = useState<AnyRow[]>([]);
  const [history, setHistory] = useState<AnyRow[]>([]);
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null);
  const [subjectTypeName, setSubjectTypeName] = useState("");
  const [periods, setPeriods] = useState<number[]>([]);
  const [rows, setRows] = useState<AssignResourceRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AssignResourceRow | null>(
    null,
  );
  const [attendanceRows, setAttendanceRows] = useState<AnyRow[]>([]);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const weekdayPeriods = useMemo(
    () =>
      (weekday.classTimings ?? []).filter(
        (t) => !Boolean(t.isBreak ?? t.is_break),
      ),
    [weekday.classTimings],
  );

  const periodOptions = useMemo<SelectOption[]>(
    () =>
      weekdayPeriods.map((t) => {
        const id = n(t.timetableScheduleId);
        const label = `${text(t, ["classTimingName", "class_timing_name"])} [${formatClockAmPm(text(t, ["startTime", "start_time"]))} - ${formatClockAmPm(text(t, ["endTime", "end_time"]))}]`;
        return { value: String(id), label };
      }),
    [weekdayPeriods],
  );

  const timetableEndDate = String(
    context.timetable.endDate ?? context.timetable.timetable_enddate ?? "",
  );

  const loadSubjectTypeData = useCallback(
    async (
      typeId: number,
      typeCode: string,
      initialRows: AssignResourceRow[],
    ) => {
      setLoading(true);
      try {
        const [subjectRows, roomRows, batchRows] = await Promise.all([
          listSubjectCourseYearsForAssign({
            collegeId: context.collegeId,
            academicYearId: context.academicYearId,
            groupSectionId: context.groupSectionId,
          }),
          listRooms(),
          typeCode === "LAB"
            ? listStudentBatchesForLabAssign(
                context.collegeId,
                typeId,
                context.courseId,
              )
            : Promise.resolve([] as AnyRow[]),
        ]);

        const filteredSubjects = (subjectRows as AnyRow[]).filter(
          (s: AnyRow) =>
            String(s.subjectType ?? s.subjectTypeCode ?? "").toUpperCase() ===
            typeCode,
        );
        setSubjects(filteredSubjects);
        setRooms(
          roomRows
            .map((r) => r as unknown as AnyRow)
            .filter((r: AnyRow) => r.isActive !== false),
        );

        let nextRows = [...initialRows];
        if (nextRows.length === 0) {
          if (typeCode === "ELECTIVE") {
            nextRows = filteredSubjects.map((subject: AnyRow) => ({
              ...createBlankResource(
                context,
                typeId,
                typeCode,
                n(timing.timetableScheduleId),
                timetableEndDate,
              ),
              subjectCourseYearId: n(
                subject.subjectCourseyearId ?? subject.subjectCourseYearId,
              ),
              subjectName: text(subject, ["subjectName"]),
              subjectCode: text(subject, ["subjectCode"]),
            }));
          } else if (typeCode === "LAB") {
            nextRows = batchRows
              .filter(
                (batch: AnyRow) =>
                  !initialRows.some(
                    (r) =>
                      n(r.studentBatchId) ===
                      n(batch.studentbatchId ?? batch.studentBatchId),
                  ),
              )
              .map((batch: AnyRow) => ({
                ...createBlankResource(
                  context,
                  typeId,
                  typeCode,
                  n(timing.timetableScheduleId),
                  timetableEndDate,
                ),
                studentBatchId: n(batch.studentbatchId ?? batch.studentBatchId),
                studentBatchName: text(batch, [
                  "batchName",
                  "studentBatchName",
                ]),
              }));
          } else {
            nextRows = [
              createBlankResource(
                context,
                typeId,
                typeCode,
                n(timing.timetableScheduleId),
                timetableEndDate,
              ),
            ];
          }
        }

        nextRows = nextRows.map((row) => {
          const subjectCourseYearId = n(row.subjectCourseYearId);
          const subject = filteredSubjects.find(
            (s: AnyRow) =>
              n(s.subjectCourseyearId ?? s.subjectCourseYearId) ===
              subjectCourseYearId,
          );
          const staff = Array.isArray(subject?.staffCourseyrSubjects)
            ? (subject!.staffCourseyrSubjects as AnyRow[]).filter(
                (s) => s.employeeId != null,
              )
            : [];
          return { ...row, staff };
        });

        setRows(nextRows);
      } finally {
        setLoading(false);
      }
    },
    [context, timing.timetableScheduleId, timetableEndDate],
  );

  useEffect(() => {
    if (!open) return;

    const existing = mapExistingResources(timing.subjectResource ?? []);
    const initialPeriods: number[] = [];
    const cellGroupId =
      timing.cellGroupId ||
      text(timing.subjectResource?.[0] ?? {}, ["cellGroupId"]);

    if (cellGroupId) {
      for (const classTiming of weekdayPeriods) {
        const resources = Array.isArray(classTiming.subjectResource)
          ? (classTiming.subjectResource as AnyRow[])
          : [];
        if (resources.some((r) => text(r, ["cellGroupId"]) === cellGroupId)) {
          initialPeriods.push(n(classTiming.timetableScheduleId));
        }
      }
    }
    if (initialPeriods.length === 0 && timing.timetableScheduleId) {
      initialPeriods.push(n(timing.timetableScheduleId));
    }
    setPeriods(initialPeriods);

    void (async () => {
      setLoading(true);
      try {
        const [types, historyRows] = await Promise.all([
          listSubjectTypes(),
          timing.timetableScheduleId
            ? listSubjectResourcesBySchedule(n(timing.timetableScheduleId))
            : Promise.resolve([] as AnyRow[]),
        ]);
        setSubjectTypes(types);
        setHistory(historyRows);

        if (existing.length > 0) {
          const typeId = n(existing[0].subjectTypeId);
          const typeCode = String(
            existing[0].subjectTypeCode ?? "",
          ).toUpperCase();
          setSubjectTypeId(typeId);
          setSubjectTypeName(typeCode);
          await loadSubjectTypeData(typeId, typeCode, existing);
        } else {
          setSubjectTypeId(null);
          setSubjectTypeName("");
          setRows([]);
          setSubjects([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, timing, weekdayPeriods, loadSubjectTypeData]);

  const roomOptions = useMemo<SelectOption[]>(
    () =>
      rooms.map((room) => ({
        value: String(room.roomId),
        label: String(room.roomName ?? room.roomCode ?? room.roomId),
      })),
    [rooms],
  );

  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((subject) => ({
        value: String(
          subject.subjectCourseyearId ?? subject.subjectCourseYearId,
        ),
        label: String(subject.subjectName ?? subject.subjectCode),
      })),
    [subjects],
  );

  const handleSubjectTypeChange = async (value: string) => {
    const typeId = n(value);
    const type = subjectTypes.find((t) => n(t.generalDetailId) === typeId);
    const typeCode = String(type?.generalDetailCode ?? "").toUpperCase();
    setSubjectTypeId(typeId);
    setSubjectTypeName(typeCode);
    await loadSubjectTypeData(typeId, typeCode, []);
  };

  const handleSubjectChange = (
    rowIndex: number,
    subjectCourseYearId: number,
  ) => {
    const subject = subjects.find(
      (s) =>
        n(s.subjectCourseyearId ?? s.subjectCourseYearId) ===
        subjectCourseYearId,
    );
    const staff = Array.isArray(subject?.staffCourseyrSubjects)
      ? (subject!.staffCourseyrSubjects as AnyRow[]).filter(
          (s) => s.employeeId != null,
        )
      : [];
    setRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              subjectCourseYearId,
              courseYearStaffId: null,
              staff,
              subjectName: text(subject ?? {}, ["subjectName"]),
            }
          : row,
      ),
    );
  };

  const handleAddRow = (template: AssignResourceRow) => {
    const typeCode = subjectTypeName.toUpperCase();
    if (typeCode !== "ELECTIVE" && typeCode !== "LAB") {
      const hasNew = rows.some((r) => !r.subjectResourceId);
      if (hasNew) {
        toastInfo("Only one new schedule is added");
        return;
      }
    }
    if (typeCode === "LAB") {
      const count = rows.filter(
        (r) => n(r.studentBatchId) === n(template.studentBatchId),
      ).length;
      if (count >= 5) {
        toastInfo("Max five faculties are assigned to each lab batch.");
        return;
      }
    }
    setRows((prev) => [
      ...prev,
      {
        ...createBlankResource(
          context,
          subjectTypeId ?? 0,
          typeCode,
          n(timing.timetableScheduleId),
          template.toDate ? String(template.toDate) : timetableEndDate,
        ),
        studentBatchId: template.studentBatchId ?? null,
        studentBatchName: template.studentBatchName,
        fromDate: template.fromDate ?? utcMidnightIso(new Date()),
      },
    ]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const items =
        subjectTypeName === "LAB"
          ? periods.flatMap((periodId) => {
              const schedule = context.scheduleTimings.find(
                (s) => n(s.timetableScheduleId) === periodId,
              );
              const resources = Array.isArray(schedule?.subjectResource)
                ? (schedule!.subjectResource as AnyRow[])
                : [];
              return resources.filter(
                (y) =>
                  n(y.studentBatchId) === n(deleteTarget.studentBatchId) &&
                  n(y.courseYearStaffId) === n(deleteTarget.courseYearStaffId),
              );
            })
          : [deleteTarget as unknown as AnyRow];

      const result = await deleteSubjectResourceStaff(
        items.map((item) => ({
          ...item,
          isActive: false,
          toDate: deleteTarget.toDate,
        })),
      );
      if (result.statusCode === 200) {
        const data = Array.isArray(result.data)
          ? (result.data as AnyRow[])
          : [];
        if (data.length > 0 && data[0]?.actualClsScheduleId) {
          setAttendanceRows(data);
          setAttendanceOpen(true);
        }
        toastSuccess(result.message || "Resource deleted");
        onSaved();
        onClose();
      } else {
        toastError(result.message || "Delete failed");
      }
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async () => {
    if (!subjectTypeId || periods.length === 0) {
      toastInfo("Select subject type and at least one period");
      return;
    }
    const payload = buildSubjectResourceSavePayload({
      subjectResources: rows,
      periods,
      subjectTypeName,
      subjectTypeId,
      actualSchedules: context.scheduleTimings,
    });
    if (payload.length === 0) {
      toastInfo("Please select subject and staff");
      return;
    }

    setSaving(true);
    try {
      const result = await saveSubjectResources(payload);
      if (result.statusCode === 200 && result.success !== false) {
        toastSuccess(result.message || "Resources saved");
        onSaved();
        onClose();
        return;
      }
      if (result.data) {
        const data = Array.isArray(result.data)
          ? (result.data as AnyRow[])
          : [result.data as AnyRow];
        setAttendanceRows(data);
        setAttendanceOpen(true);
        onSaved();
      }
      toastInfo(result.message || "Saved with attendance warnings");
    } catch {
      toastError("Failed to save resources");
    } finally {
      setSaving(false);
    }
  };

  const historyColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      HISTORY_COL_DEFS.siNo,
      { ...HISTORY_COL_DEFS.staffName, cellRenderer: historyStaffRenderer },
      { ...HISTORY_COL_DEFS.subjectName, cellRenderer: historySubjectRenderer },
      { ...HISTORY_COL_DEFS.fromDate, cellRenderer: historyDateRenderer },
    ],
    [],
  );

  const isElective = subjectTypeName === "ELECTIVE";
  const isLab = subjectTypeName === "LAB";
  const hasExisting = rows.some((r) => r.subjectResourceId);

  return (
    <>
      <FormModal
        open={open}
        onClose={onClose}
        title="Assign Resource"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        isSubmitting={saving}
        submitLabel="Save"
        size="xl"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4 text-[13px]">
          <div className="space-y-1 rounded border border-slate-200 bg-slate-50/80 p-3">
            <p>
              College:{" "}
              <span className="font-medium text-blue-700">
                {context.collegeCode} ({context.academicYearName})
              </span>
            </p>
            <p>
              Course:{" "}
              <span className="font-medium text-blue-700">
                {context.courseName} / {context.groupName} /{" "}
                {context.courseYearName} / {context.groupSectionName}
              </span>
            </p>
            <p>
              Timetable:{" "}
              <span className="font-medium text-blue-700">
                {String(
                  context.timetable.timetableName ??
                    context.timetable.timetable_name ??
                    "",
                )}
              </span>
            </p>
            {subjectTypeName ? (
              <p>
                Subject Type:{" "}
                <span className="font-medium text-blue-700">
                  {subjectTypeName}
                </span>
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              {!hasExisting ? (
                <div className="space-y-1">
                  <Label className="text-[12px]">Subject Type *</Label>
                  <Select
                    value={subjectTypeId ? String(subjectTypeId) : ""}
                    onChange={(v) => void handleSubjectTypeChange(v ?? "")}
                    options={subjectTypes.map((t) => ({
                      value: String(t.generalDetailId),
                      label: String(
                        t.generalDetailDisplayName ?? t.generalDetailCode,
                      ),
                    }))}
                    placeholder="Subject Type"
                    searchable
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <Label className="text-[12px]">Periods *</Label>
                <MultiSelect
                  value={periods.map(String)}
                  onChange={(values) => setPeriods(values.map((v) => n(v)))}
                  options={periodOptions}
                  placeholder="Select periods"
                  disabled={hasExisting}
                />
              </div>

              {rows.map((row, index) => (
                <div
                  key={`${row.studentBatchId ?? "row"}-${index}`}
                  className="space-y-3 rounded border border-[#c3d9ff] p-3"
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {isLab ? (
                      <div className="flex items-end pb-2 text-[14px] font-medium text-blue-700">
                        {row.studentBatchName}
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <Label className="text-[12px]">Subject</Label>
                      <Select
                        value={
                          row.subjectCourseYearId
                            ? String(row.subjectCourseYearId)
                            : ""
                        }
                        onChange={(v) => handleSubjectChange(index, n(v))}
                        options={subjectOptions}
                        placeholder="Subject"
                        searchable
                        disabled={Boolean(row.subjectResourceId) || isElective}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[12px]">Staff</Label>
                      <Select
                        value={
                          row.courseYearStaffId
                            ? String(row.courseYearStaffId)
                            : ""
                        }
                        onChange={(v) =>
                          setRows((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, courseYearStaffId: n(v) || null }
                                : item,
                            ),
                          )
                        }
                        options={(row.staff ?? []).map((staff) => ({
                          value: String(staff.staffCourseyrSubjectId),
                          label: String(staff.firstName ?? staff.staffName),
                        }))}
                        placeholder="Staff"
                        searchable
                        disabled={Boolean(row.subjectResourceId)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[12px]">Room</Label>
                      <Select
                        value={row.roomId ? String(row.roomId) : ""}
                        onChange={(v) =>
                          setRows((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, roomId: n(v) || null }
                                : item,
                            ),
                          )
                        }
                        options={roomOptions}
                        placeholder="Room"
                        searchable
                        disabled={Boolean(row.subjectResourceId)}
                      />
                    </div>

                    <DatePicker
                      label="From Date"
                      value={
                        row.fromDate ? new Date(String(row.fromDate)) : null
                      }
                      onChange={(date) =>
                        setRows((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, fromDate: date } : item,
                          ),
                        )
                      }
                    />

                    <DatePicker
                      label="To Date"
                      value={row.toDate ? new Date(String(row.toDate)) : null}
                      onChange={(date) =>
                        setRows((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, toDate: date } : item,
                          ),
                        )
                      }
                    />
                  </div>

                  {row.subjectResourceId ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddRow(row)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add New
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  ) : null}

                  {isLab && row.subjectResourceId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddRow(row)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Lab Faculty
                    </Button>
                  ) : null}
                </div>
              ))}

              <div className="space-y-2">
                {/* <p className="text-[13px] font-semibold text-[#002b5c]">Resource history</p> */}
                <DataTable
                  columnDefs={historyColumnDefs}
                  rowData={history}
                  toolbar={{
                    search: true,
                    exportExcel: false,
                    exportPdf: false,
                    columnPicker: false,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete resource"
        description="Are you sure you want to delete this resource assignment?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={saving}
      />

      <AttendanceConflictDialog
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        rows={attendanceRows}
      />
    </>
  );
}
