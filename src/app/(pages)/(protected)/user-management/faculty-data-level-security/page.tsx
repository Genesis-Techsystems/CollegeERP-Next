"use client";

/**
 * Angular parity: user-management/faculty-data-security-level
 * Filter: Employee typeahead (employeesearch?q=&empStatus=ACTV, length > 4)
 * List: EmployeeDataSecurity where employeeDetailId.employeeId=={id}.and.isActive==true
 * Columns: SI.No, College, Department, Course, Course Group, Semester, Subject, Status, Edit
 * + Add Security only after employee selected (flag)
 * No print.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  facultyEmployeeLabel,
  listEmployeeDataSecurityByEmployeeId,
  searchEmployeesForFacultyDataSecurity,
  type EmployeeDataSecurity,
  type FacultySecurityEmployee,
} from "@/services";
import { FacultyDataSecurityModal } from "./FacultyDataSecurityModal";

function dash(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<EmployeeDataSecurity>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
    valueFormatter: (p) => dash(p.value),
  } as ColDef<EmployeeDataSecurity>,
  employeeDepartmentCode: {
    field: "employeeDepartmentCode",
    headerName: "Department",
    minWidth: 120,
    valueFormatter: (p) => dash(p.value),
  } as ColDef<EmployeeDataSecurity>,
  courseCode: {
    field: "courseCode",
    headerName: "Course",
    minWidth: 110,
    valueFormatter: (p) => dash(p.value),
  } as ColDef<EmployeeDataSecurity>,
  courseGroupCode: {
    field: "courseGroupCode",
    headerName: "Course Group",
    minWidth: 120,
    valueFormatter: (p) => dash(p.value),
  } as ColDef<EmployeeDataSecurity>,
  courseYearCode: {
    field: "courseYearCode",
    headerName: "Semester",
    minWidth: 110,
    valueFormatter: (p) => dash(p.value),
  } as ColDef<EmployeeDataSecurity>,
  subject: {
    headerName: "Subject",
    minWidth: 180,
    valueGetter: (p) =>
      [p.data?.subjectName, p.data?.subjectCode].filter(Boolean).join(" "),
  } as ColDef<EmployeeDataSecurity>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
  } as ColDef<EmployeeDataSecurity>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<EmployeeDataSecurity>,
};

function statusRenderer(p: ICellRendererParams<EmployeeDataSecurity>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: EmployeeDataSecurity) => void) {
  return (p: ICellRendererParams<EmployeeDataSecurity>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <button
        type="button"
        title="Edit"
        aria-label="Edit"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  };
}

export default function FacultyDataLevelSecurityPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<FacultySecurityEmployee[]>([]);
  const [employeeSearching, setEmployeeSearching] = useState(false);
  /** Angular `flag` — true after a successful employee selection load attempt. */
  const [employeeReady, setEmployeeReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<EmployeeDataSecurity | null>(null);

  const empIdNum = Number(employeeId) || 0;

  const { data, isLoading, invalidate } = useCrudList<EmployeeDataSecurity>({
    queryKey: QK.facultyDataSecurity.list(empIdNum),
    queryFn: () => listEmployeeDataSecurityByEmployeeId(empIdNum),
    enabled: Boolean(empIdNum),
  });

  const employeeOptions = useMemo<SelectOption[]>(
    () =>
      employees.map((e) => ({
        value: String(e.employeeId),
        label: facultyEmployeeLabel(e),
        title: [
          e.empNumber,
          e.firstName ? `(${e.firstName})` : null,
          e.collegeCode || e.empDeptName || e.designation
            ? `${e.collegeCode ?? ""} / ${e.empDeptName ?? ""} / ${e.designation ?? ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [employees],
  );

  const columnDefs = useMemo<ColDef<EmployeeDataSecurity>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.employeeDepartmentCode,
      COL_DEFS.courseCode,
      COL_DEFS.courseGroupCode,
      COL_DEFS.courseYearCode,
      COL_DEFS.subject,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditData(row);
          setModalOpen(true);
        }),
      },
    ],
    [],
  );

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length <= 4) {
      // Keep selected option visible; only clear when searching empty/short without selection
      if (!employeeId) setEmployees([]);
      return;
    }
    setEmployeeSearching(true);
    try {
      const found = await searchEmployeesForFacultyDataSecurity(q);
      setEmployees(found);
    } catch (e) {
      toastError(e, "Failed to search employees");
      setEmployees([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  function onEmployeeChange(value: string | null) {
    const next = value ?? "";
    setEmployeeId(next);
    setEditData(null);
    if (!next) {
      setEmployeeReady(false);
      return;
    }
    // Ensure selected employee remains in options for the trigger label
    const selected = employees.find((e) => String(e.employeeId) === next);
    if (selected) setEmployees([selected]);
    // Angular sets flag=true when security list call completes (success path)
    setEmployeeReady(true);
  }

  return (
    <FilteredListPage
      title="Faculty Data Level Security"
      filters={
        <Select
          label="Employee"
          value={employeeId || null}
          onChange={onEmployeeChange}
          options={employeeOptions}
          placeholder="Employee"
          searchable
          onSearch={onEmployeeSearch}
          isLoading={employeeSearching}
          clearable
          className="w-full max-w-xl"
        />
      }
      rowData={empIdNum ? data : []}
      columnDefs={columnDefs}
      loading={Boolean(empIdNum) && isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        employeeReady ? (
          <Button
            type="button"
            size="sm"
            disabled={!empIdNum}
            onClick={() => {
              setEditData(null);
              setModalOpen(true);
            }}
          >
            + Add Security
          </Button>
        ) : null
      }
    >
      <FacultyDataSecurityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        employeeId={empIdNum}
        onSaved={invalidate}
      />
    </FilteredListPage>
  );
}
