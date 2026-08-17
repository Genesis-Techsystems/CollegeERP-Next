"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import {
  listPerformanceAssessmentByEmployee,
  searchEmployeesForHr,
} from "@/services";
import type { SessionUser } from "@/types/user";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";

type PerfRow = Record<string, unknown>;

/** Same default avatar the faculty details grids fall back to. */
const DEFAULT_EMPLOYEE_PHOTO = "/assets/images/avatars/default_Student.png";

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

/** Principal / HOD / admin can search and pick any employee (Angular `dataSecStaff === false`). */
function canPickEmployee(user: SessionUser | null | undefined): boolean {
  if (user) {
    if (user.isAdmin || user.isPrincipal || user.isManagement || user.isHod)
      return true;
    const role = (user.roleName ?? "").toUpperCase();
    if (role.includes("HOD") || role.includes("HEAD OF")) return true;
  }
  const isPrincipal =
    readStorage("isPRINCIPAL") === "true" ||
    readStorage("isPrincipal") === "true";
  const isHod = readStorage("isHOD") === "true";
  const isAdmin = readStorage("isAdmin") === "true";
  return isPrincipal || isHod || isAdmin;
}

/** Angular option line 1: `{{empNumber}} ( {{firstName}})`. */
function employeeOptionLabel(row: Record<string, unknown>): string {
  const name = row.firstName != null ? String(row.firstName).trim() : "";
  const num = row.empNumber != null ? String(row.empNumber).trim() : "";

  if (name && num) return `${name} (${num})`;
  return name || num || String(row.employeeId ?? "");
}

/** Angular option line 2: `{{collegeCode}} / {{empDeptName}} / {{designation}}`. */
function employeeOptionMeta(row: Record<string, unknown>): string {
  if (!row.collegeCode) return "";
  return [row.collegeCode, row.empDeptName, row.designation]
    .filter(Boolean)
    .join(" / ");
}

/** Angular `employee-img-active` (green ring) / `employee-img-inactive` (red ring). */
function employeeSelectOption(row: Record<string, unknown>): SelectOption {
  const inactive = String(row.empStatus ?? "").toUpperCase() === "INACTV";
  const number = row.empNumber != null ? String(row.empNumber) : "";
  const name = row.firstName != null ? String(row.firstName) : "";
  return {
    value: String(row.employeeId),
    label: employeeOptionLabel(row),
    labelNode: (
      <>
        {name}
        {number ? <span className="text-[#3d3de3]"> ({number})</span> : null}
      </>
    ),
    description: employeeOptionMeta(row),
    image: {
      src: String(row.photoPath ?? "").trim() || DEFAULT_EMPLOYEE_PHOTO,
      fallbackSrc: DEFAULT_EMPLOYEE_PHOTO,
      className: inactive
        ? "border-2 border-[#f44336]"
        : "border-2 border-[#34e834]",
    },
  };
}

/** Angular passes `firstName(empNumber)` to the assessment/history page. */
function assessmentEmployeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? "").trim();
  const number = String(row.empNumber ?? "").trim();
  if (name && number) return `${name} (${number})`;
  return name || number || String(row.employeeId ?? "");
}

function formatFeedbackDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

/**
 * Angular seeds the dropdown with `{ firstName: 'Search by Employee name or Id.' }`,
 * which renders through the same option template — default avatar included.
 */
const EMPLOYEE_SEARCH_HINT: SelectOption = {
  value: "__search-hint__",
  label: "( Search by Employee name or Id.)",
  labelNode: (
    <span className="text-[#3d3de3]">( Search by Employee name or Id.)</span>
  ),
  disabled: true,
  image: {
    src: DEFAULT_EMPLOYEE_PHOTO,
    className: "border-2 border-[#34e834]",
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
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<PerfRow>,
};

export function PerformanceAssessmentPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loggedInEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );
  const collegeId = user?.collegeId ?? Number(readStorage("collegeId") || 0);
  const empNumber = readStorage("empNumber") || user?.userName || "";
  const staffLocked = !canPickEmployee(user);
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
    if (!staffLocked || !empNumber || !collegeId) return;
    void (async () => {
      setEmployeeSearchLoading(true);
      try {
        const list = await searchEmployeesForHr(empNumber, collegeId);
        setEmployeeRows(list);
        setEmployeeOptions(list.map((e) => employeeSelectOption(e)));
        if (list.length > 0) loadEmployee(list[0] as Record<string, unknown>);
      } catch (e) {
        toastError(e, "Failed to load employee");
      } finally {
        setEmployeeSearchLoading(false);
      }
    })();
  }, [staffLocked, empNumber, collegeId, loadEmployee]);

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return;
      const q = term.trim();
      setSearchTouched(q.length > 0);
      // The Select also calls onSearch('') when the dropdown closes. Angular only
      // resets its list on keyup, so an empty term must keep the last results.
      if (q.length === 0) return;
      // Angular queries only past 4 characters and clears the list until then.
      if (q.length < 4) {
        setEmployeeRows([]);
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const list = await searchEmployeesForHr(q, collegeId);
        setEmployeeRows(list);
        setEmployeeOptions(list.map((e) => employeeSelectOption(e)));
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
        `/hr-payroll/employee/performance-assessment/add-performance?${params.toString()}`,
      );
    },
    [selectedEmployeeId, selectedEmployee, empDisplayName, router],
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
              variant="default"
              className="h-7 px-2 text-[11px]"
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

  // Angular wraps the history card in `*ngIf="perForm.value.employeeId"`.
  const hasEmployee = selectedEmployeeId != null && selectedEmployeeId > 0;

  // The trigger label comes from `options`, so the picked employee must stay in
  // the list even after a later search replaces the results.
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
  }, [
    employeeOptions,
    searchTouched,
    hasEmployee,
    selectedEmployee,
    selectedEmployeeId,
  ]);

  return (
    <FilteredListPage
      title="Performance Assessment"
      tableTitle="Faculty Performance History"
      filters={
        <div className="max-w-xl">
          <Select
            label="Employee"
            value={selectedEmployeeId ? String(selectedEmployeeId) : null}
            onChange={handleEmployeeChange}
            options={employeeSelectOptions}
            placeholder="Search by Employee name or Id."
            searchable
            onSearch={onEmployeeSearch}
            isLoading={employeeSearchLoading}
            disabled={!sessionLoading && staffLocked}
            clearable={!staffLocked}
          />
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
      rowData={history}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Faculty Performance History",
      }}
      toolbarTrailing={
        !sessionLoading && !isPrincipal ? (
          <Button
            type="button"
            size="sm"
            className="h-[30px] px-3 text-[12px]"
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
