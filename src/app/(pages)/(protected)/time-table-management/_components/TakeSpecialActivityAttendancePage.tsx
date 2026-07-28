"use client";

/**
 * Angular `staff-special-activities/.../take-attendance`.
 * GET specialactivitystudents?specialActivityId=
 * domainList SpclActivityAttendance + POST spclActivityAttendance
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DATE_FORMATS, SPECIAL_ACTIVITY_API } from "@/config/constants";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  buildQuery,
  domainList,
  fetchDetailsEnvelope,
  formatLeaveYmd,
  postDetailsEnvelope,
  tConvert,
} from "@/services";

type AnyRow = Record<string, unknown>;

type StudentRow = AnyRow & {
  studentId?: number;
  studentName?: string;
  rollNumber?: string;
  academicDetails?: string;
  pk_college_id?: number;
  checked?: boolean;
  isPresent?: boolean;
  isAbsent?: boolean;
  spclActivityAttendanceId?: number;
  registrationDate?: string;
};

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function asRows(data: unknown): AnyRow[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["resultList", "rows", "content", "data"]) {
      const nested = obj[key];
      if (Array.isArray(nested)) return nested as AnyRow[];
      if (nested && typeof nested === "object" && "resultList" in nested) {
        const list = (nested as { resultList?: unknown }).resultList;
        if (Array.isArray(list)) return list as AnyRow[];
        if (list != null && list !== "") return [list as AnyRow];
      }
    }
    if ("resultList" in obj) {
      const list = obj.resultList;
      if (Array.isArray(list)) return list as AnyRow[];
      if (list != null && list !== "") return [list as AnyRow];
    }
    return [obj as AnyRow];
  }
  return [];
}

async function loadSpecialActivityRow(
  spclActivityId: number,
): Promise<AnyRow | null> {
  const queries = [
    buildQuery({ spclActivityId }),
    buildQuery({ "SpecialActivity.spclActivityId": spclActivityId }),
  ];
  for (const query of queries) {
    try {
      const list = await domainList<AnyRow>(SPECIAL_ACTIVITY_API.CRUD, query);
      if (Array.isArray(list) && list.length > 0) return list[0];
    } catch {
      // try next query shape
    }
  }
  return null;
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return "";
  return format(d, DATE_FORMATS.DISPLAY);
}

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5 text-sm">
      <span className="shrink-0 font-medium text-muted-foreground">
        {label} :
      </span>
      <span className="min-w-0 font-medium text-primary">{value || ""}</span>
    </div>
  );
}

function makePresentRenderer(
  onToggle: (row: StudentRow, present: boolean) => void,
) {
  return (p: ICellRendererParams<StudentRow>) => {
    const row = p.data;
    if (!row) return null;
    const present = Boolean(row.checked);
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={present}
          onCheckedChange={(v) => onToggle(row, v === true)}
        />
        <span className={present ? "text-green-600" : "text-destructive"}>
          {present ? "Present" : "Absent"}
        </span>
      </label>
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<StudentRow>,
  studentName: {
    headerName: "Student Name",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const name = txt(p.data, ["studentName"]);
      const details = txt(p.data, ["academicDetails"]);
      return details ? `${name} (${details})` : name;
    },
  } as ColDef<StudentRow>,
  rollNumber: {
    field: "rollNumber",
    headerName: "Roll No.",
    minWidth: 110,
    valueGetter: (p) => txt(p.data, ["rollNumber"]),
  } as ColDef<StudentRow>,
  mark: {
    headerName: "Mark",
    minWidth: 140,
    width: 160,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<StudentRow>,
};

export function TakeSpecialActivityAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spclActivityId = positiveId(searchParams.get("spclActivityId"));

  const [activity, setActivity] = useState<AnyRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [markAllPresent, setMarkAllPresent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const absents = useMemo(
    () => students.filter((s) => !s.isPresent),
    [students],
  );

  const load = useCallback(async () => {
    if (!spclActivityId) {
      setStudents([]);
      setActivity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activityRow = await loadSpecialActivityRow(spclActivityId);
      setActivity(activityRow);

      let rows: StudentRow[] = [];
      try {
        const studentsEnv = await fetchDetailsEnvelope<unknown>(
          SPECIAL_ACTIVITY_API.STUDENTS,
          { specialActivityId: spclActivityId },
        );
        if (studentsEnv.success) {
          rows = asRows(studentsEnv.data).map((s) => ({
            ...s,
            checked: true,
            isPresent: true,
          }));
        }
      } catch {
        rows = [];
      }

      try {
        const attendanceList = await domainList<AnyRow>(
          SPECIAL_ACTIVITY_API.ATTENDANCE,
          buildQuery({
            "specialActivity.spclActivityId": spclActivityId,
            isAbsent: true,
            isActive: true,
          }),
        );
        const attendances = Array.isArray(attendanceList) ? attendanceList : [];
        if (attendances.length > 0 && rows.length > 0) {
          rows = rows.map((stu) => {
            const match = attendances.find(
              (a) => Number(a.studentId) === Number(stu.studentId),
            );
            if (!match) return stu;
            return {
              ...stu,
              checked: false,
              isPresent: false,
              isAbsent: Boolean(match.isAbsent),
              spclActivityAttendanceId: Number(
                match.spclActivityAttendanceId ?? 0,
              ),
              registrationDate: String(match.registrationDate ?? ""),
            };
          });
        }
      } catch {
        // keep default present state
      }

      setStudents(rows);
      setMarkAllPresent(rows.length === 0 || rows.every((r) => r.isPresent));
    } catch (e) {
      toastError(e, "Failed to load attendance");
      setStudents([]);
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [spclActivityId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleStudent(row: StudentRow, present: boolean) {
    setStudents((prev) => {
      const next = prev.map((s) =>
        Number(s.studentId) === Number(row.studentId)
          ? { ...s, checked: present, isPresent: present }
          : s,
      );
      setMarkAllPresent(next.every((s) => s.isPresent));
      return next;
    });
  }

  function toggleMarkAll() {
    setStudents((prev) => {
      if (markAllPresent) {
        const next = prev.map((s) => ({
          ...s,
          checked: false,
          isPresent: false,
        }));
        setMarkAllPresent(false);
        return next;
      }
      const next = prev.map((s) => ({
        ...s,
        checked: true,
        isPresent: true,
      }));
      setMarkAllPresent(true);
      return next;
    });
  }

  async function onSave() {
    if (!activity || students.length === 0) return;
    const empId = Number(activity.employeeId ?? 0);
    const activityId = Number(activity.spclActivityId ?? spclActivityId);
    const absentStudents: AnyRow[] = [];

    for (const stu of students) {
      if (stu.spclActivityAttendanceId) {
        absentStudents.push({
          employeeId: empId,
          registrationDate: stu.registrationDate,
          paymentModeCatdetId: null,
          collegeId: stu.pk_college_id,
          studentId: stu.studentId,
          isActive: true,
          spclActivityId: activityId,
          spclActivityAttendanceId: stu.spclActivityAttendanceId,
          isAbsent: !stu.isPresent,
        });
      } else if (!stu.isPresent) {
        absentStudents.push({
          employeeId: empId,
          registrationDate: formatLeaveYmd(new Date()),
          paymentModeCatdetId: null,
          studentId: stu.studentId,
          collegeId: stu.pk_college_id,
          isActive: true,
          spclActivityId: activityId,
          isAbsent: true,
        });
      }
    }

    if (absentStudents.length === 0 && students[0]) {
      absentStudents.push({
        ...students[0],
        studentId: null,
        collegeId: students[0].pk_college_id,
        isAbsent: null,
        isAllPresent: true,
        employeeId: empId,
        spclActivityId: activityId,
        isActive: true,
      });
    }

    setSaving(true);
    try {
      const result = await postDetailsEnvelope(
        SPECIAL_ACTIVITY_API.ATTENDANCE_POST,
        absentStudents,
      );
      if (result.success) {
        toastSuccess(result.message || "Attendance saved");
        await load();
      } else {
        toastError(result.message || "Failed to save attendance");
      }
    } catch (e) {
      toastError(e, "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.studentName,
      COL_DEFS.rollNumber,
      {
        ...COL_DEFS.mark,
        headerName: " ",
        cellRenderer: makePresentRenderer(toggleStudent),
      },
    ],
    [],
  );

  const from = tConvert(activity?.fromTime);
  const to = tConvert(activity?.toTime);

  return (
    <PageContainer className="space-y-4">
      {/* Card 1 — activity details */}
      <div className="app-data-table app-data-table-card flex flex-col">
        <div className="app-data-table-heading px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Mark Activity Attendance
          </h2>
        </div>
        <div className="border-t border-border px-5 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : activity ? (
            <div className="space-y-0.5">
              <DetailRow
                label="Activity Type"
                value={txt(activity, ["spclactityCatdetDisplayName"])}
              />
              <DetailRow
                label="Special Activity"
                value={txt(activity, ["specialActivityName"])}
              />
              <DetailRow
                label="Description"
                value={txt(activity, ["specialActivityDescription"])}
              />
              <DetailRow
                label="Faculty"
                value={
                  <>
                    {txt(activity, ["firstName"])}{" "}
                    {txt(activity, ["empNumber"]) ? (
                      <span className="font-semibold text-blue-600">
                        ({txt(activity, ["empNumber"])})
                      </span>
                    ) : null}
                  </>
                }
              />
              <DetailRow
                label="Subject"
                value={
                  <>
                    {txt(activity, ["subjectName"])}{" "}
                    {txt(activity, ["subjectCode"]) ? (
                      <span className="font-semibold text-blue-600">
                        ({txt(activity, ["subjectCode"])})
                      </span>
                    ) : null}
                  </>
                }
              />
              <DetailRow
                label="Date"
                value={`${formatDisplayDate(activity.fromDate)}${
                  activity.toDate
                    ? ` - ${formatDisplayDate(activity.toDate)}`
                    : ""
                }`}
              />
              <DetailRow
                label="Timing"
                value={from || to ? `${from} - ${to}` : ""}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No activity selected.
            </p>
          )}
        </div>
      </div>

      {/* Card 2 — attendance grid */}
      {students.length > 0 ? (
        <div className="app-data-table app-data-table-card flex flex-col">
          <div className="app-data-table-heading px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Attendance
            </h2>
          </div>
          <div className="border-t border-border px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <DataTable
                  title=""
                  columnDefs={columnDefs}
                  rowData={students}
                  loading={loading}
                  pagination
                  height="auto"
                  toolbar={{
                    search: true,
                    searchPlaceholder: "Search",
                    exportExcel: false,
                    exportPdf: false,
                  }}
                  toolbarTrailing={
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={markAllPresent}
                        onChange={toggleMarkAll}
                      />
                      <span className="font-medium">
                        {markAllPresent ? "UnMark All" : "Mark All"}
                      </span>
                    </label>
                  }
                />
              </div>
              <div className="rounded-md border border-border lg:col-span-4">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h4 className="text-sm font-semibold text-destructive">
                    Absentees
                  </h4>
                  <span className="text-sm font-semibold text-foreground">
                    {absents.length}
                  </span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto p-3 text-sm text-foreground">
                  {absents.length === 0 ? (
                    <p className="text-muted-foreground">No absents found.</p>
                  ) : (
                    absents.map((a) => (
                      <p key={String(a.studentId)}>
                        {txt(a, ["studentName"])} - {txt(a, ["rollNumber"])}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void onSave()}
                disabled={saving}
              >
                Save Attendance
              </Button>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}
