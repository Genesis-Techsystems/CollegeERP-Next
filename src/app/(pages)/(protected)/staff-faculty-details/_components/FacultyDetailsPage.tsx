"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, PencilIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { GM_CODES } from "@/config/constants/ui";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { isSecretaryRole } from "@/lib/role-routing";
import {
  getGeneralDetails,
  getStaffEmployeeDetailsById,
  listEmployeeDataSecurityByEmployeeId,
  listHodFacultyByCollegeStatus,
  listHodFacultyByDeptCollegeStatus,
  updateEmployeeEnrollment,
} from "@/services";
import { EditStaffDetailsModal } from "./EditStaffDetailsModal";

type EmpRow = Record<string, unknown>;
type FacultyMode = "active" | "resigned";

const DEFAULT_EMPLOYEE_PHOTO = "/assets/images/avatars/default_Student.png";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpRow>,
  photo: {
    field: "photoPath",
    headerName: "Photo",
    width: 90,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<EmpRow>,
  empNumber: {
    field: "empNumber",
    headerName: "Emp no",
    minWidth: 110,
  } as ColDef<EmpRow>,
  firstName: {
    headerName: "Faculty Name",
    minWidth: 160,
    valueGetter: (p) => {
      const row = p.data;
      if (!row) return "";
      return [row.firstName, row.middleName, row.lastName]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .join(" ");
    },
  } as ColDef<EmpRow>,
  gender: {
    field: "gender",
    headerName: "Gender",
    minWidth: 90,
    flex: 0,
  } as ColDef<EmpRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<EmpRow>,
  dept: {
    field: "deptName",
    headerName: "Department",
    minWidth: 120,
  } as ColDef<EmpRow>,
  designation: {
    field: "designationName",
    headerName: "Designation",
    minWidth: 120,
  } as ColDef<EmpRow>,
  mobile: {
    field: "mobile",
    headerName: "Mobile No",
    minWidth: 110,
  } as ColDef<EmpRow>,
  email: {
    field: "email",
    headerName: "Email",
    minWidth: 160,
  } as ColDef<EmpRow>,
  isActive: {
    field: "empStateCode",
    headerName: "Status",
    minWidth: 110,
    flex: 0,
  } as ColDef<EmpRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
    sortable: false,
    filter: false,
  } as ColDef<EmpRow>,
};

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function photoRenderer(p: ICellRendererParams<EmpRow>) {
  const src = String(p.data?.photoPath ?? "").trim() || DEFAULT_EMPLOYEE_PHOTO;
  return (
    <div className="flex h-full items-center justify-center py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-[50px] w-[50px] shrink-0 rounded-full object-cover"
        onError={(e) => {
          const image = e.currentTarget;
          if (!image.src.endsWith("default_Student.png")) {
            image.src = DEFAULT_EMPLOYEE_PHOTO;
          }
        }}
      />
    </div>
  );
}

function statusRenderer(p: ICellRendererParams<EmpRow>) {
  const code = String(p.data?.empStateCode ?? "");
  const resigned = code === "RESIGN";
  return (
    <StatusBadge
      status={resigned ? "inactive" : "active"}
      label={resigned ? code || "RESIGN" : "Active"}
    />
  );
}

function makeActionsRenderer(onEdit: (row: EmpRow) => void) {
  return function ActionsRenderer(p: ICellRendererParams<EmpRow>) {
    if (!p.data) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 px-0"
        title="Edit"
        onClick={() => onEdit(p.data!)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

function uniqPositiveIds(values: unknown[]): string {
  const ids = values
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)].join(",");
}

function bustPhotoCache(rows: EmpRow[]): EmpRow[] {
  const stamp = Date.now();
  return rows.map((row) => {
    const photo = String(row.photoPath ?? "").trim();
    if (!photo) return row;
    const base = photo.split("?")[0];
    return { ...row, photoPath: `${base}?${stamp}` };
  });
}

export function FacultyDetailsPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const {
    employeeId,
    deptId: loginDeptId,
    isResolving,
  } = useStaffLoginContext(user, sessionLoading);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionLoading) return;
    if (isSecretaryRole(user?.roleName)) {
      router.replace("/hr-payroll/employee/employee-list");
      return;
    }
    // Angular HR employee list — non-HOD / non-Principal logins must not stay on HOD faculty-details.
    if (!user?.isHod && !user?.isPrincipal) {
      router.replace("/hr-payroll/employee/employee-list");
    }
  }, [router, sessionLoading, user?.isHod, user?.isPrincipal, user?.roleName]);

  const [mode, setMode] = useState<FacultyMode>("active");
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<EmpRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [scopeReady, setScopeReady] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // Confirmed Angular Network for this Faculty Details login:
  //   GET employeeDetail?collegeId=16&employeeStatusId=86
  // Always use that college-wide call so React row counts match Angular (~220).
  // (Keep useAngularHodDeptFilter available only if a true HOD-only scope is needed later.)
  const useDeptFilter = false;

  useEffect(() => {
    let cancelled = false;

    async function resolveScope() {
      setScopeReady(false);
      try {
        const security =
          employeeId > 0
            ? await listEmployeeDataSecurityByEmployeeId(employeeId)
            : [];

        // Angular empSecurity → unique collegeIds / employeeDepartmentIds
        const collegeScope = uniqPositiveIds(security.map((r) => r.collegeId));
        const deptScope = uniqPositiveIds(
          security.map((r) => r.employeeDepartmentId),
        );

        const sessionCollege =
          Number(user?.collegeId ?? 0) || Number(readStorage("collegeId") || 0);
        const sessionDept =
          loginDeptId || Number(readStorage("empDeptId") || 0);

        if (!cancelled) {
          setCollegeId(
            collegeScope || (sessionCollege > 0 ? String(sessionCollege) : ""),
          );
          // Angular: only when security has non-null employeeDepartmentIds, else empDeptId
          setDepartmentId(
            deptScope || (sessionDept > 0 ? String(sessionDept) : ""),
          );
        }
      } catch {
        const sessionCollege =
          Number(user?.collegeId ?? 0) || Number(readStorage("collegeId") || 0);
        const sessionDept =
          loginDeptId || Number(readStorage("empDeptId") || 0);
        if (!cancelled) {
          setCollegeId(sessionCollege > 0 ? String(sessionCollege) : "");
          setDepartmentId(sessionDept > 0 ? String(sessionDept) : "");
        }
      } finally {
        if (!cancelled) setScopeReady(true);
      }
    }

    if (!sessionLoading && !isResolving) {
      void resolveScope();
    }

    return () => {
      cancelled = true;
    };
  }, [employeeId, isResolving, loginDeptId, sessionLoading, user?.collegeId]);

  const listQuery = useQuery({
    queryKey: QK.hrPayroll.hodFacultyDetails(
      mode,
      collegeId,
      useDeptFilter ? departmentId : "",
      !useDeptFilter,
    ),
    enabled:
      scopeReady &&
      Boolean(collegeId) &&
      (!useDeptFilter || Boolean(departmentId)),
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [empStatuses, empStates] = await Promise.all([
        getGeneralDetails(GM_CODES.EMPLOYEE_STATUS),
        getGeneralDetails(GM_CODES.EMPLOYEE_STATE),
      ]);

      const activeStatusId = Number(
        empStatuses.find(
          (x) => String(x.generalDetailCode) === GM_CODES.EMP_ACTIVE_STATUS,
        )?.generalDetailId ?? 0,
      );
      const resignStateId = Number(
        empStates.find((x) => String(x.generalDetailCode) === "RESIGN")
          ?.generalDetailId ?? 0,
      );

      const statusId = mode === "active" ? activeStatusId : resignStateId;
      if (!statusId) return [] as EmpRow[];

      // Angular Network:
      // GET employeeDetail?collegeId={id}&employeeStatusId={ACTV|RESIGN}
      // (no employeeDepartmentId — college-wide list)
      const rows = useDeptFilter
        ? await listHodFacultyByDeptCollegeStatus({
            departmentId,
            collegeId,
            employeeStatusId: statusId,
          })
        : await listHodFacultyByCollegeStatus({
            collegeId,
            employeeStatusId: statusId,
          });

      // Angular active list drops resign rows client-side.
      const filtered =
        mode === "active"
          ? rows.filter((r) => String(r.empStateCode ?? "") !== "RESIGN")
          : rows;

      return bustPhotoCache(filtered);
    },
  });

  const handleEdit = useCallback(async (row: EmpRow) => {
    const id = Number(row.employeeId ?? 0);
    if (!id) return;
    try {
      const details = await getStaffEmployeeDetailsById(id);
      setEditRow(details ?? row);
      setEditOpen(true);
    } catch (e) {
      toastError(e, "Failed to load employee details");
    }
  }, []);

  async function handleSave(payload: EmpRow) {
    setSaving(true);
    try {
      await updateEmployeeEnrollment(payload);
      toastSuccess("Employee details updated");
      setEditOpen(false);
      setEditRow(null);
      await queryClient.invalidateQueries({
        queryKey: ["HrPayroll", "hodFacultyDetails"],
      });
    } catch (e) {
      toastError(e, "Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function downloadExcel() {
    const rows = listQuery.data ?? [];
    if (rows.length === 0) {
      toastError(new Error("No data"), "No faculty records to download");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const exportRows = rows.map((x, index) => ({
        S_No: index + 1,
        Emp_No: x.empNumber ?? "",
        Faculty_Name: [x.firstName, x.middleName, x.lastName]
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .join(" "),
        Gender: x.gender ?? "",
        College: x.collegeCode ?? "",
        Department: x.deptName ?? "",
        Designation: x.designationName ?? "",
        Mobile_No: x.mobile ?? "",
        Email: x.email ?? "",
        Status:
          String(x.empStateCode ?? "") === "RESIGN"
            ? String(x.empStateCode)
            : "Active",
      }));
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Employees List");
      XLSX.writeFile(book, "Employees List.xlsx");
    } catch (e) {
      toastError(e, "Failed to download Excel");
    }
  }

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.photo, cellRenderer: photoRenderer },
      COL_DEFS.empNumber,
      COL_DEFS.firstName,
      COL_DEFS.gender,
      COL_DEFS.college,
      COL_DEFS.dept,
      COL_DEFS.designation,
      COL_DEFS.mobile,
      COL_DEFS.email,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          void handleEdit(row);
        }),
      },
    ],
    [handleEdit],
  );

  return (
    <ListPage
      title="Faculty List"
      notice={
        <>
          <div className="flex flex-wrap items-center gap-6 px-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="hod-faculty-mode"
                checked={mode === "active"}
                onChange={() => setMode("active")}
                className="accent-primary"
              />
              Active Faculty
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="hod-faculty-mode"
                checked={mode === "resigned"}
                onChange={() => setMode("resigned")}
                className="accent-primary"
              />
              Resigned Faculty
            </label>
          </div>
          {listQuery.error ? (
            <p className="px-1 text-sm text-destructive">
              {getErrorMessage(listQuery.error)}
            </p>
          ) : null}
        </>
      }
      rowData={listQuery.data ?? []}
      columnDefs={columnDefs}
      loading={
        sessionLoading || isResolving || !scopeReady || listQuery.isLoading
      }
      pagination
      toolbar={{ searchPlaceholder: "Faculty Search" }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 border-0 px-3 text-[12px] !bg-[#042956] !text-white hover:!bg-[#031f42]"
          onClick={() => void downloadExcel()}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Download
        </Button>
      }
    >
      <EditStaffDetailsModal
        open={editOpen}
        employee={editRow}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setEditOpen(false);
          setEditRow(null);
        }}
        onSave={(payload) => {
          void handleSave(payload);
        }}
      />
    </ListPage>
  );
}
