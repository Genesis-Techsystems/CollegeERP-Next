"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { utcMidnightIso } from "@/common/generic-functions";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listStaffProxies,
  listSubjectResourceSchedulesForStaff,
  saveStaffProxiesList,
  searchEmployeesForLeaveSummary,
  subjectResourceOf,
  toLeaveYmd,
  type AnyRow,
} from "@/services";
import { SetProxyModal } from "../../workload-adjustment/_components/SetProxyModal";

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: true,
  exportPdf: false,
  exportExcel: true,
} as const;

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function readStorageNumber(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  return n(globalThis.localStorage.getItem(key));
}

function employeeOptionLabel(row: AnyRow): string {
  const name = s(row.firstName);
  const empNumber = s(row.empNumber);
  return empNumber ? `${name} ( ${empNumber} )` : name || s(row.employeeId);
}

function formatProxyDate(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scheduleOptionLabel(row: AnyRow): string {
  return [
    row.subjectName,
    row.courseYearName,
    row.groupSectionName,
    row.weekdayName,
    row.startTime && row.endTime ? `${row.startTime}-${row.endTime}` : null,
  ]
    .filter(Boolean)
    .map(String)
    .join("/");
}

function enrichScheduleRows(rows: AnyRow[]): AnyRow[] {
  return rows.map((row) => {
    const resource = subjectResourceOf(row);
    if (!resource || Object.keys(resource).length === 0) return row;
    return {
      ...row,
      subjectName: resource.subjectName ?? row.subjectName,
      subjectTypeCode: resource.subjectTypeCode ?? row.subjectTypeCode,
    };
  });
}

function StatusText({ name }: { name: unknown }) {
  const n = String(name ?? "").trim();
  if (n === "Accepted" || n === "Completed") {
    return <span className="text-emerald-600 font-medium">{n}</span>;
  }
  if (n === "Rejected") {
    return <span className="text-destructive font-medium">{n}</span>;
  }
  return <span className="text-amber-600 font-medium">{n || "—"}</span>;
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusText name={p.data?.processStatusName} />;
}

function assignedStaffRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.assignedFirstName ?? "")}
      {row.assignedEmpNumber ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(row.assignedEmpNumber)})
        </span>
      ) : null}
    </span>
  );
}

function proxyStaffRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.proxyFirstName ?? "")}
      {row.proxyEmpNumber ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(row.proxyEmpNumber)})
        </span>
      ) : null}
    </span>
  );
}

function proxyDateRenderer(p: ICellRendererParams<AnyRow>) {
  return formatProxyDate(p.data?.proxyDate);
}

function courseDetailsRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return [
    row.collegeCode,
    row.courseName,
    row.groupName,
    row.courseYearName,
    row.groupSectionName ? `section ${row.groupSectionName}` : "",
  ]
    .filter(Boolean)
    .join("/");
}

function timingRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const start = s(row.startTime);
  const end = s(row.endTime);
  if (!start && !end) return "—";
  return `${start} - ${end}`;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  assigned: {
    headerName: "Assigned Employee",
    minWidth: 180,
  } as ColDef<AnyRow>,
  proxy: {
    headerName: "Proxy Employee",
    minWidth: 180,
  } as ColDef<AnyRow>,
  subject: {
    field: "subjectName",
    headerName: "Proxy Subject",
    minWidth: 160,
  } as ColDef<AnyRow>,
  proxyDate: {
    headerName: "Proxy Date",
    minWidth: 120,
  } as ColDef<AnyRow>,
  course: {
    headerName: "Course",
    minWidth: 220,
  } as ColDef<AnyRow>,
  timing: {
    headerName: "Timing",
    minWidth: 120,
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AnyRow>,
};

export function SetProxyPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();

  const collegeId =
    user?.collegeId ??
    readStorageNumber("collegeId") ??
    readStorageNumber("fk_college_id");

  const [employeeRows, setEmployeeRows] = useState<AnyRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<AnyRow | null>(null);

  const [scheduleRows, setScheduleRows] = useState<AnyRow[]>([]);
  const [scheduleOptions, setScheduleOptions] = useState<SelectOption[]>([]);
  const [timetableScheduleId, setTimetableScheduleId] = useState<number | null>(
    null,
  );
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [proxies, setProxies] = useState<AnyRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [setProxyItems, setSetProxyItems] = useState<AnyRow[] | null>(null);

  const scheduleOptionsFromRows = useCallback((rows: AnyRow[]) => {
    return rows.map((row) => ({
      value: String(n(row.timetableScheduleId)),
      label: scheduleOptionLabel(row),
    }));
  }, []);

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return;
      const q = term.trim();
      if (q.length <= 4) {
        setEmployeeRows([]);
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const rows = await searchEmployeesForLeaveSummary(collegeId, q);
        setEmployeeRows(rows);
        setEmployeeOptions(
          rows.map((r) => ({
            value: String(n(r.employeeId)),
            label: employeeOptionLabel(r),
          })),
        );
      } catch {
        setEmployeeRows([]);
        setEmployeeOptions([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    },
    [collegeId],
  );

  async function handleEmployeeChange(v: string | null) {
    setShowTable(false);
    setProxies([]);
    setTimetableScheduleId(null);
    setScheduleRows([]);
    setScheduleOptions([]);

    if (!v) {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
      return;
    }

    const id = Number(v);
    const row = employeeRows.find((e) => n(e.employeeId) === id);
    if (!row) return;

    setSelectedEmployeeId(id);
    setSelectedEmployee(row);
    setSchedulesLoading(true);
    try {
      const raw = await listSubjectResourceSchedulesForStaff(id);
      const enriched = enrichScheduleRows(raw);
      setScheduleRows(enriched);
      setScheduleOptions(scheduleOptionsFromRows(enriched));
    } catch (e) {
      toastError(e, "Failed to load schedules");
      setScheduleRows([]);
      setScheduleOptions([]);
    } finally {
      setSchedulesLoading(false);
    }
  }

  async function handleGetList() {
    if (!collegeId || !selectedEmployeeId || !timetableScheduleId) {
      toastInfo("Please select employee and time schedule");
      return;
    }

    setListLoading(true);
    setShowTable(false);
    try {
      const rows = await listStaffProxies({
        collegeId,
        timetableScheduleId,
        assignedbyEmployeeId: selectedEmployeeId,
        isActive: "true",
      });
      const sorted = [...rows].sort(
        (a, b) => n(b.staffProxyId) - n(a.staffProxyId),
      );
      setProxies(sorted);
      setShowTable(true);
    } catch (e) {
      toastError(e, "Failed to load proxies");
      setProxies([]);
    } finally {
      setListLoading(false);
    }
  }

  function openSetProxyDialog() {
    if (!timetableScheduleId || !selectedEmployeeId) return;
    const schedule = scheduleRows.find(
      (x) => n(x.timetableScheduleId) === timetableScheduleId,
    );
    if (!schedule) return;

    const resource = subjectResourceOf(schedule);
    const arr: AnyRow[] = [];
    if (String(resource.subjectTypeName ?? "") === "LAB") {
      for (const row of scheduleRows) {
        if (String(row.cellGroupId) === String(schedule.cellGroupId)) {
          arr.push({
            ...row,
            selectedEmpNumber: selectedEmployeeId,
            labelName: row.weekdayName,
          });
        }
      }
    } else {
      arr.push({
        ...schedule,
        selectedEmpNumber: selectedEmployeeId,
        labelName: schedule.weekdayName,
      });
    }
    setSetProxyItems(arr);
  }

  async function handleSetProxySave(details: AnyRow) {
    if (!setProxyItems?.length || !selectedEmployeeId) return;
    const item = setProxyItems[0]!;
    const proxyDateYmd = toLeaveYmd(details.proxyDate);
    if (!proxyDateYmd) return;

    setSetProxyItems(null);
    setListLoading(true);
    try {
      const payload: AnyRow[] = setProxyItems.map((row) => {
        const res = subjectResourceOf(row);
        return {
          staffCourseyrSubjectId: details.staffCourseyrSubjectId,
          isActive: details.isActive,
          reason: res.subjectCourseYearId,
          proxyDate: proxyDateYmd,
          subjectId: details.subjectId,
          subjectTypeId: details.subjectTypeId,
          createdDt: utcMidnightIso(),
          collegeId: row.collegeId,
          proxyEmpId: details.empId,
          isApproved: true,
          processStatusCatdetId: 231,
          assignedbyEmployeeId: selectedEmployeeId,
          studentbatchId: res.studentBatchId,
          subjectCourseyearId: res.subjectCourseYearId,
          timetableScheduleId: row.timetableScheduleId,
          proxySubjecttypeId: details.subjectTypeId,
          roomId: res.roomId,
        };
      });

      const result = await saveStaffProxiesList(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Proxy saved");
        await handleGetList();
      } else {
        toastInfo(result.message ?? "Unable to save proxy");
      }
    } catch (e) {
      toastError(e, "Failed to save proxy");
    } finally {
      setListLoading(false);
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.assigned, cellRenderer: assignedStaffRenderer },
      { ...COL_DEFS.proxy, cellRenderer: proxyStaffRenderer },
      COL_DEFS.subject,
      { ...COL_DEFS.proxyDate, cellRenderer: proxyDateRenderer },
      { ...COL_DEFS.course, cellRenderer: courseDetailsRenderer },
      { ...COL_DEFS.timing, cellRenderer: timingRenderer },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  );

  const loading = sessionLoading || listLoading;

  return (
    <>
      <FilteredListPage
        title="Set Proxy"
        filtersCollapsible
        resultsVisible={showTable}
        filters={
          <div className="space-y-3">
            <GlobalFilterBarRow>
              <GlobalFilterField
                label="Employee"
                className="!min-w-[16rem] !flex-[1_1_20rem]"
              >
                <Select
                  value={
                    selectedEmployeeId != null
                      ? String(selectedEmployeeId)
                      : null
                  }
                  onChange={(v) => void handleEmployeeChange(v)}
                  options={employeeOptions}
                  placeholder="Search by Employee name or Id."
                  searchable
                  clearable
                  onSearch={onEmployeeSearch}
                  isLoading={employeeSearchLoading}
                  disabled={!collegeId}
                />
              </GlobalFilterField>
              <GlobalFilterField
                label="Time Schedule"
                className="!min-w-[20rem] !flex-[1_1_24rem]"
              >
                <Select
                  value={
                    timetableScheduleId != null
                      ? String(timetableScheduleId)
                      : null
                  }
                  onChange={(v) => {
                    setShowTable(false);
                    setProxies([]);
                    setTimetableScheduleId(v ? Number(v) : null);
                  }}
                  options={scheduleOptions}
                  placeholder="Select"
                  searchable
                  isLoading={schedulesLoading}
                  disabled={!selectedEmployeeId || scheduleOptions.length === 0}
                />
              </GlobalFilterField>
              <div className="flex items-end gap-2 pb-0.5">
                <Button
                  type="button"
                  className="h-8 text-[12px]"
                  onClick={() => void handleGetList()}
                  disabled={
                    loading ||
                    !collegeId ||
                    !selectedEmployeeId ||
                    !timetableScheduleId
                  }
                >
                  {listLoading ? "Loading..." : "Get List"}
                </Button>
              </div>
            </GlobalFilterBarRow>
          </div>
        }
        rowData={proxies}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        paginationPageSize={25}
        getRowId={(p) => String(p.data?.staffProxyId ?? p.data?.id ?? "")}
        toolbar={TOOLBAR}
        toolbarTrailing={
          showTable ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              onClick={openSetProxyDialog}
              disabled={!timetableScheduleId || !selectedEmployee}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Set Proxy
            </Button>
          ) : null
        }
      />

      <SetProxyModal
        open={setProxyItems != null}
        items={setProxyItems ?? []}
        employeeId={selectedEmployeeId ?? 0}
        onClose={() => setSetProxyItems(null)}
        onSave={(payload) => void handleSetProxySave(payload)}
      />
    </>
  );
}
