"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_EMPLOYEE_PHOTO,
  Select,
  toEmployeeSearchSelectOption,
  type SelectOption,
} from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { HR_QUERY } from "../_lib/hr-query";
import { getErrorMessage } from "@/lib/errors";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import {
  getEmployeeByIdForHr,
  listPerformanceAssessmentByEmployee,
  searchEmployeesForHr,
} from "@/services";
import type { SessionUser } from "@/types/user";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { performanceAssessmentFormHref } from "../_lib/performance-assessment-routes";

type PerfRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

/**
 * Angular `dataSecStaff === false` only for principal or HOD.
 * Everyone else is locked to the logged-in employee.
 */
function canPickEmployee(user: SessionUser | null | undefined): boolean {
  if (user?.isPrincipal || user?.isHod) return true;
  const role = (user?.roleName ?? "").toUpperCase();
  if (role.includes("HOD") || role.includes("HEAD OF")) return true;
  return (
    readStorage("isPRINCIPAL") === "true" ||
    readStorage("isPrincipal") === "true" ||
    readStorage("isHOD") === "true"
  );
}

/** Angular `empFirstName = firstName + '(' + empNumber + ')'`. */
function assessmentEmployeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? "").trim();
  const number = String(row.empNumber ?? "").trim();
  if (name && number) return `${name}(${number})`;
  return name || number || String(row.employeeId ?? "");
}

function asEmployeeRow(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  const row = data as Record<string, unknown>;
  if (Array.isArray(row.resultList) && row.resultList[0]) {
    return row.resultList[0] as Record<string, unknown>;
  }
  return row;
}

function pickLoginEmployee(
  list: Record<string, unknown>[],
  employeeId: number,
  empNumber: string,
): Record<string, unknown> | null {
  if (employeeId > 0) {
    const byId = list.find((row) => Number(row.employeeId) === employeeId);
    if (byId) return byId;
  }
  const needle = empNumber.trim().toLowerCase();
  if (needle) {
    const byNumber = list.find(
      (row) =>
        String(row.empNumber ?? "")
          .trim()
          .toLowerCase() === needle,
    );
    if (byNumber) return byNumber;
  }
  return list[0] ?? null;
}

function employeeSelectOption(row: Record<string, unknown>): SelectOption {
  return (
    toEmployeeSearchSelectOption(row, {
      layout: "number-first",
      triggerLabel: assessmentEmployeeLabel(row),
    }) ?? {
      value: String(row.employeeId ?? ""),
      label: assessmentEmployeeLabel(row),
    }
  );
}

function formatFeedbackDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "d MMM, yyyy");
}

/**
 * Angular seeds the dropdown with `{ firstName: 'Search by Employee name or Id.' }`,
 * which renders through the same option template — default avatar included.
 */
const EMPLOYEE_SEARCH_HINT: SelectOption = {
  value: "__search-hint__",
  label: "( Search by Employee name or Id.)",
  labelNode: (
    <span className="font-medium text-blue-600">
      ( Search by Employee name or Id.)
    </span>
  ),
  disabled: true,
  image: {
    src: DEFAULT_EMPLOYEE_PHOTO,
    className: "h-[60px] w-[60px] border-2 border-[#34e834]",
  },
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PerfRow>,
  employee: { headerName: "Employee", minWidth: 180 } as ColDef<PerfRow>,
  feedbackDate: {
    field: "feedbackDate",
    headerName: "Date",
    minWidth: 120,
  } as ColDef<PerfRow>,
  overallRating: {
    field: "overallRating",
    headerName: "Overall Rating",
    minWidth: 120,
  } as ColDef<PerfRow>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    flex: 0,
    width: 110,
  } as ColDef<PerfRow>,
};

export function PerformanceAssessmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loggedInEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );
  const collegeId = user?.collegeId ?? Number(readStorage("collegeId") || 0);
  const empNumber = readStorage("empNumber") || readStorage("uNumber") || "";
  const staffLocked = !canPickEmployee(user);
  const autoSelectDone = useRef(false);
  // Angular hides "Take Assessment" for principals (`*ngIf="isPRINCIPAL === 'false'"`).
  const isPrincipal =
    user?.isPrincipal ?? readStorage("isPRINCIPAL") === "true";

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>(
    [],
  );
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [empDisplayName, setEmpDisplayName] = useState("");
  const [searchTouched, setSearchTouched] = useState(false);

  const {
    data: history = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.hrPayroll.performanceAssessment(
      selectedEmployeeId ?? undefined,
    ),
    queryFn: () => listPerformanceAssessmentByEmployee(selectedEmployeeId!),
    enabled: selectedEmployeeId != null && selectedEmployeeId > 0,
    ...HR_QUERY,
  });

  const viewOnly =
    loggedInEmployeeId > 0 &&
    selectedEmployeeId != null &&
    loggedInEmployeeId !== selectedEmployeeId;

  const loadEmployee = useCallback((row: Record<string, unknown>) => {
    const id = Number(row.employeeId);
    setSelectedEmployeeId(id);
    setSelectedEmployee(row);
    setEmpDisplayName(assessmentEmployeeLabel(row));
  }, []);

  useEffect(() => {
    // Locked staff (not principal/HOD) stay on the logged-in employee.
    // Principal/HOD must pick an employee first — table stays hidden until then.
    if (!staffLocked) return;
    if (sessionLoading || isResolving || autoSelectDone.current) return;
    if (!collegeId) return;
    if (!empNumber && loggedInEmployeeId <= 0) return;

    autoSelectDone.current = true;
    void (async () => {
      setEmployeeSearchLoading(true);
      try {
        let list: Record<string, unknown>[] = [];
        if (empNumber) {
          list = (await searchEmployeesForHr(
            empNumber,
            collegeId,
            1,
          )) as Record<string, unknown>[];
        }
        let row = pickLoginEmployee(list, loggedInEmployeeId, empNumber);
        if (!row && loggedInEmployeeId > 0) {
          row = asEmployeeRow(await getEmployeeByIdForHr(loggedInEmployeeId));
          if (row) list = [row, ...list];
        }
        if (!row) {
          autoSelectDone.current = false;
          return;
        }
        setEmployeeRows(list);
        setEmployeeOptions(list.map((item) => employeeSelectOption(item)));
        loadEmployee(row);
      } catch (e) {
        autoSelectDone.current = false;
        toastError(e, "Failed to load employee");
      } finally {
        setEmployeeSearchLoading(false);
      }
    })();
  }, [
    staffLocked,
    sessionLoading,
    isResolving,
    collegeId,
    empNumber,
    loggedInEmployeeId,
    loadEmployee,
  ]);

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return;
      const q = term.trim();
      setSearchTouched(q.length > 0);
      // Select also calls onSearch('') when the dropdown closes. Angular only
      // resets its list on keyup, so an empty term must keep the last results.
      if (q.length === 0) return;
      // Angular: `event.target.value.length > 4`
      if (q.length <= 4) {
        setEmployeeRows([]);
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const list = await searchEmployeesForHr(q, collegeId);
        setEmployeeRows(list);
        setEmployeeOptions(
          list.map((row) =>
            employeeSelectOption(row as Record<string, unknown>),
          ),
        );
      } catch (e) {
        toastError(e, "Employee search failed");
        setEmployeeRows([]);
        setEmployeeOptions([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    },
    [collegeId],
  );

  function handleEmployeeChange(v: string | null) {
    if (!v) {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
      setEmpDisplayName("");
      return;
    }
    const id = Number(v);
    const row = employeeRows.find((e) => Number(e.employeeId) === id);
    if (row) loadEmployee(row);
  }

  const openAssessment = useCallback(
    (assessmentFeedbackId?: number) => {
      if (!selectedEmployeeId || !selectedEmployee) return;
      const params = new URLSearchParams({
        empId: String(selectedEmployeeId),
        empFirstName: empDisplayName,
        designation: String(selectedEmployee.designation ?? ""),
        empDeptName: String(
          selectedEmployee.empDeptName ?? selectedEmployee.deptName ?? "",
        ),
      });
      if (assessmentFeedbackId) {
        params.set("assessmentFeedbackId", String(assessmentFeedbackId));
      }
      router.push(
        `${performanceAssessmentFormHref(pathname)}?${params.toString()}`,
      );
    },
    [selectedEmployeeId, selectedEmployee, empDisplayName, router, pathname],
  );

  const columnDefs = useMemo<ColDef<PerfRow>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.employee,
        valueFormatter: () => empDisplayName,
      },
      {
        ...COL_DEFS.feedbackDate,
        valueFormatter: (p) => formatFeedbackDate(p.value),
      },
      COL_DEFS.overallRating,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<PerfRow>) => {
          const id = Number(p.data?.assessmentFeedbackId ?? 0);
          return (
            <Button
              type="button"
              size="sm"
              className="h-[30px] p-[0.5rem] bg-[#1e88e5] w-24 text-[12px] text-white hover:bg-[#00a6dc]"
              onClick={() => openAssessment(id || undefined)}
            >
              {viewOnly ? "View" : "Edit"}
            </Button>
          );
        },
      },
    ],
    [empDisplayName, viewOnly, openAssessment],
  );

  const hasEmployee = selectedEmployeeId != null && selectedEmployeeId > 0;

  const employeeSelectOptions = useMemo<SelectOption[]>(() => {
    const base =
      employeeOptions.length > 0
        ? employeeOptions
        : searchTouched
          ? []
          : [EMPLOYEE_SEARCH_HINT];
    if (!hasEmployee || !selectedEmployee) return base;
    const selected = employeeSelectOption(selectedEmployee);
    if (base.some((o) => o.value === selected.value)) return base;
    return [
      selected,
      ...base.filter((o) => o.value !== EMPLOYEE_SEARCH_HINT.value),
    ];
  }, [employeeOptions, searchTouched, hasEmployee, selectedEmployee]);

  return (
    <FilteredListPage
      title="Faculty Performance Assessment"
      tableTitle="Faculty Performance History"
      filtersCollapsible={false}
      filters={
        <div className="max-w-xl">
          <Select
            label="Employee"
            value={selectedEmployeeId ? String(selectedEmployeeId) : null}
            onChange={handleEmployeeChange}
            options={employeeSelectOptions}
            placeholder="Employee"
            searchable
            onSearch={onEmployeeSearch}
            isLoading={employeeSearchLoading}
            disabled={!sessionLoading && staffLocked}
            clearable={!staffLocked}
          />
        </div>
      }
      tableHeader={
        <div className="table-context-header">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            ballot
          </span>
          <strong className="table-context-header__title">
            Faculty Performance History
          </strong>
        </div>
      }
      notice={
        error ? (
          <p className="px-1 text-sm text-destructive">
            {getErrorMessage(error)}
          </p>
        ) : null
      }
      showTable={hasEmployee}
      resultsVisible={hasEmployee}
      rowData={history}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      toolbar={{
        search: false,
        exportPdf: false,
        exportExcel: false,
      }}
      toolbarTrailing={
        !sessionLoading && !isPrincipal ? (
          <Button
            type="button"
            size="sm"
            className="h-[30px] rounded-full px-3 text-[12px] text-white"
            onClick={() => openAssessment()}
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Take Assessment
          </Button>
        ) : undefined
      }
    />
  );
}
