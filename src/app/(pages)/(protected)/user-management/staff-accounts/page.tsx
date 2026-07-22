"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, EyeOff, PencilIcon, PlusIcon, X } from "lucide-react";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { StatusBadge } from "@/common/components/data-display";
import { FormModal } from "@/common/components/feedback";
import { FormField } from "@/common/components/forms";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  createStaffAccount,
  getStaffAccountById,
  listActiveEmployeesForPayrollAssign,
  listDepartmentsByCollege,
  listRolesByOrganization,
  listStaffAccountColleges,
  listStaffAccountsByCollege,
  listUserRoles,
  saveUserRoles,
  updateStaffAccount,
  type StaffAccount,
  type UserRole,
} from "@/services";
import type { College } from "@/types/college";
import type { Department } from "@/types/department";

type StaffEmployeeOption = {
  employeeId?: number;
  empNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  mobileNumber?: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<StaffAccount>,
  userName: {
    field: "userName",
    headerName: "User Name",
    minWidth: 170,
    flex: 1,
  } as ColDef<StaffAccount>,
  employeeName: {
    headerName: "Employee Name",
    minWidth: 180,
    flex: 1,
    valueGetter: (p) =>
      [p.data?.firstName, p.data?.lastName].filter(Boolean).join(" ").trim(),
  } as ColDef<StaffAccount>,
  mobileNumber: {
    field: "mobileNumber",
    headerName: "Mobile No",
    minWidth: 130,
    flex: 0.75,
  } as ColDef<StaffAccount>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
    flex: 0.65,
  } as ColDef<StaffAccount>,
  organizationCode: {
    field: "organizationCode",
    headerName: "Organization",
    minWidth: 120,
    flex: 0.7,
  } as ColDef<StaffAccount>,
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.55,
  } as ColDef<StaffAccount>,
  actions: {
    headerName: "Actions",
    minWidth: 200,
    flex: 0.9,
  } as ColDef<StaffAccount>,
};

function statusRenderer(p: ICellRendererParams<StaffAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onRoles: (row: StaffAccount | null) => void,
  onEdit: (row: StaffAccount | null) => void,
) {
  return (p: ICellRendererParams<StaffAccount>) => (
    <div className="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        className="text-primary hover:underline font-medium"
        onClick={() => onRoles(p.data ?? null)}
      >
        User Roles
      </button>
      <span className="text-slate-300 select-none" aria-hidden>
        |
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        aria-label="Edit staff"
        onClick={() => onEdit(p.data ?? null)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function StaffAccountsPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [activeStaff, setActiveStaff] = useState<StaffAccount | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null);
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true);
  const [roleSheetUser, setRoleSheetUser] = useState<StaffAccount | null>(null);
  const [roleRows, setRoleRows] = useState<UserRole[]>([]);
  const [form, setForm] = useState({
    departmentId: "",
    employeeId: "",
    userTypeId: "9",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    mobileNumber: "",
    password: "",
    passwordConfirm: "",
    passwordExpDate: new Date(),
    isActive: true,
    isEditable: false,
    isReset: false,
    reason: "active",
  });

  const { data: colleges, isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.colleges.list(),
    queryFn: listStaffAccountColleges,
  });

  const {
    data: rows,
    isLoading,
    invalidate,
  } = useCrudList<StaffAccount>({
    queryKey: QK.staffAccounts.list(collegeId ?? undefined),
    queryFn: () => listStaffAccountsByCollege(collegeId ?? 0),
    enabled: !!collegeId,
  });

  const { data: departments, isLoading: departmentsLoading } =
    useCrudList<Department>({
      queryKey: ["StaffAccounts", "departments", collegeId ?? 0],
      queryFn: () => listDepartmentsByCollege(collegeId ?? 0),
      enabled: !!collegeId && addOpen,
    });

  const { data: employees, isLoading: employeesLoading } =
    useCrudList<StaffEmployeeOption>({
      queryKey: [
        "StaffAccounts",
        "employees",
        collegeId ?? 0,
        form.departmentId || 0,
      ],
      queryFn: () =>
        listActiveEmployeesForPayrollAssign({
          collegeId: collegeId ?? 0,
          departmentId: Number(form.departmentId),
        }) as Promise<StaffEmployeeOption[]>,
      enabled: !!collegeId && addOpen && !!form.departmentId,
    });

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  );
  const selectedOrganizationId = selectedCollege?.organizationId ?? 0;

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ["StaffAccounts", "roles", selectedOrganizationId],
    queryFn: () => listRolesByOrganization(selectedOrganizationId),
    enabled: selectedOrganizationId > 0 && rolesOpen,
  });

  const { data: existingUserRoles } = useCrudList({
    queryKey: ["StaffAccounts", "userRoles", roleSheetUser?.userId ?? 0],
    queryFn: () => listUserRoles(roleSheetUser?.userId ?? 0),
    enabled: rolesOpen && !!roleSheetUser?.userId,
  });

  useEffect(() => {
    if (!rolesOpen) return;
    setRoleRows(
      existingUserRoles.map((role) => ({
        ...role,
        isActive: role.isActive !== false,
      })),
    );
  }, [existingUserRoles, rolesOpen]);

  function resetForm() {
    setForm({
      departmentId: "",
      employeeId: "",
      userTypeId: "9",
      firstName: "",
      lastName: "",
      userName: "",
      email: "",
      mobileNumber: "",
      password: "",
      passwordConfirm: "",
      passwordExpDate: new Date(),
      isActive: true,
      isEditable: false,
      isReset: false,
      reason: "active",
    });
  }

  function openAddModal() {
    resetForm();
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setAddOpen(true);
  }

  async function openEditModal(row: StaffAccount | null) {
    if (!row) return;
    setShowPassword(false);
    setShowPasswordConfirm(false);
    const full = await getStaffAccountById(row.userId).catch(() => null);
    const staff = full ?? row;
    setActiveStaff(staff);
    setForm({
      departmentId: staff.departmentId ? String(staff.departmentId) : "",
      employeeId: staff.employeeId ? String(staff.employeeId) : "",
      userTypeId: String(staff.userTypeId ?? 9),
      firstName: staff.firstName ?? "",
      lastName: staff.lastName ?? "",
      userName: staff.userName ?? "",
      email: staff.email ?? "",
      mobileNumber: staff.mobileNumber ?? "",
      password: staff.password ?? "",
      passwordConfirm: staff.password ?? "",
      passwordExpDate: staff.passwordExpDate
        ? new Date(staff.passwordExpDate)
        : new Date(),
      isActive: staff.isActive !== false,
      isEditable: staff.isEditable ?? false,
      isReset: staff.isReset ?? false,
      reason:
        staff.reason ?? (staff.isActive === false ? "inactive" : "active"),
    });
    setEditOpen(true);
  }

  async function openRolesModal(row: StaffAccount | null) {
    if (!row) return;
    const full = await getStaffAccountById(row.userId).catch(() => null);
    setRoleSheetUser({
      ...(full ?? row),
      userTypeId: full?.userTypeId ?? row.userTypeId ?? 9,
    });
    setRoleIdToAdd(null);
    setRoleActiveToAdd(true);
    setRolesOpen(true);
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !roleSheetUser?.userId) return;
    const roleId = Number(roleIdToAdd);
    if (
      roleRows.some((role) => role.roleId === roleId && role.isActive !== false)
    ) {
      toastError("Role already added for this user");
      return;
    }
    const role = roleOptions.find((option) => option.roleId === roleId);
    setRoleRows((current) => [
      ...current.filter((item) => item.roleId !== roleId),
      {
        userId: roleSheetUser.userId,
        userTypeId: roleSheetUser.userTypeId ?? 9,
        roleId,
        roleName: role?.roleName ?? `Role ${roleId}`,
        isActive: roleActiveToAdd,
      },
    ]);
    setRoleIdToAdd(null);
    setRoleActiveToAdd(true);
  }

  function deactivateRole(roleId: number) {
    setRoleRows((current) =>
      current.map((role) =>
        role.roleId === roleId ? { ...role, isActive: false } : role,
      ),
    );
  }

  async function submitRoles(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!roleSheetUser?.userId) return;
    if (roleRows.length === 0)
      return toastError("Please add at least one role");
    try {
      setSavingRoles(true);
      await saveUserRoles(
        roleRows.map((role) => ({
          ...role,
          userId: roleSheetUser.userId,
          userTypeId: roleSheetUser.userTypeId ?? role.userTypeId ?? 9,
          userName: roleSheetUser.userName ?? role.userName ?? undefined,
          firstName: roleSheetUser.firstName ?? role.firstName ?? null,
          lastName: roleSheetUser.lastName ?? role.lastName ?? null,
          resetPasswordCode: role.resetPasswordCode ?? null,
        })),
      );
      setRolesOpen(false);
      toastSuccess("User roles saved successfully");
    } catch {
      toastError("Failed to save user roles");
    } finally {
      setSavingRoles(false);
    }
  }

  async function submitAdd(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!selectedCollege) return;
    if (!form.departmentId) return toastError("Please select a department");
    if (!form.employeeId) return toastError("Please select an employee");
    if (!form.firstName.trim())
      return toastError("Selected employee must have a first name");
    if (!form.userName.trim()) return toastError("Please enter a user name");
    if (
      !/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(
        form.email.trim(),
      )
    ) {
      return toastError("Enter a valid email");
    }
    if (!/^[6-9][0-9]{9}$/.test(form.mobileNumber.trim())) {
      return toastError("Enter a valid 10 digit mobile number");
    }
    if (!form.password || form.password !== form.passwordConfirm) {
      return toastError("Password and confirm password must match");
    }
    try {
      setSaving(true);
      await createStaffAccount({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        employeeId: Number(form.employeeId),
        userTypeId: Number(form.userTypeId),
        departmentId: Number(form.departmentId),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        passwordExpDate: form.passwordExpDate,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? "active" : "inactive"),
        collegeId: selectedCollege.collegeId,
        organizationId: selectedCollege.organizationId,
      });
      setAddOpen(false);
      toastSuccess("Staff account created successfully");
      invalidate().catch(() => undefined);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!activeStaff?.userId || !selectedCollege) return;
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError("Password and confirm password must match");
    }
    try {
      setSaving(true);
      const passwordToSend = form.password || activeStaff.password || "";
      await updateStaffAccount(activeStaff.userId, {
        userId: activeStaff.userId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: passwordToSend,
        passwordConfirm: form.passwordConfirm || passwordToSend,
        passwordExpDate: form.passwordExpDate,
        departmentId: activeStaff.departmentId,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? "active" : "inactive"),
        collegeId: activeStaff.collegeId ?? selectedCollege.collegeId,
        organizationId:
          activeStaff.organizationId ?? selectedCollege.organizationId,
      });
      setEditOpen(false);
      toastSuccess("Staff account updated successfully");
      invalidate().catch(() => undefined);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<StaffAccount>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.userName,
      COL_DEFS.employeeName,
      COL_DEFS.mobileNumber,
      COL_DEFS.collegeCode,
      COL_DEFS.organizationCode,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openRolesModal, openEditModal),
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Staff Accounts"
      filters={
        <div className="max-w-sm">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((c) => ({
              value: String(c.collegeId),
              label: `${c.orgCode ?? ""}${c.orgCode ? " - " : ""}${c.collegeCode}`,
            }))}
            searchable
            clearable
            isLoading={collegesLoading}
            placeholder="Select college"
          />
        </div>
      }
      rowData={collegeId ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search staff…",
        columnPicker: true,
        exportPdf: true,
        pdfDocumentTitle: "Staff Accounts",
      }}
      toolbarTrailing={
        collegeId ? (
          <Button size="sm" onClick={openAddModal}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        ) : undefined
      }
    >
      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Staff Account"
        onSubmit={submitAdd}
        isSubmitting={saving}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <div className="md:col-span-2 flex justify-end text-[12px] font-semibold text-slate-700">
            College : {selectedCollege?.orgCode ?? "-"} -{" "}
            {selectedCollege?.collegeCode ?? "-"}
          </div>
          <FormField label="Department" required>
            <Select
              value={form.departmentId || null}
              onChange={(v) =>
                setForm((s) => ({
                  ...s,
                  departmentId: v ?? "",
                  employeeId: "",
                  firstName: "",
                  lastName: "",
                  email: "",
                  mobileNumber: "",
                }))
              }
              options={departments.map((d) => ({
                value: String(d.departmentId),
                label: d.deptCode || d.deptName,
              }))}
              isLoading={departmentsLoading}
              searchable
              className="[&_button]:h-10 [&_button]:text-[12px]"
            />
          </FormField>
          <FormField label="User Type" required>
            <Select
              value={form.userTypeId}
              onChange={() => undefined}
              options={[{ value: "9", label: "STAFF" }]}
              disabled
              searchable={false}
              className="[&_button]:h-10 [&_button]:text-[12px]"
            />
          </FormField>
          <FormField label="Employee" required>
            <Select
              value={form.employeeId || null}
              onChange={(v) => {
                const employee = employees.find(
                  (item) => String(item.employeeId) === v,
                );
                setForm((s) => ({
                  ...s,
                  employeeId: v ?? "",
                  firstName: employee?.firstName ?? "",
                  lastName: employee?.lastName ?? "",
                  email: employee?.email ?? "",
                  mobileNumber:
                    employee?.mobileNumber ?? employee?.mobile ?? "",
                }));
              }}
              options={employees
                .filter((employee) => employee.employeeId)
                .map((employee) => ({
                  value: String(employee.employeeId),
                  label: `${employee.empNumber ?? employee.employeeId}${employee.firstName ? ` (${employee.firstName})` : ""}`,
                }))}
              isLoading={employeesLoading}
              disabled={!form.departmentId}
              searchable
              className="[&_button]:h-10 [&_button]:text-[12px]"
            />
          </FormField>
          <FormField label="First Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.firstName}
              disabled
            />
          </FormField>
          <FormField label="Last Name">
            <Input
              className="h-10 text-[12px]"
              value={form.lastName}
              disabled
            />
          </FormField>
          <FormField label="User Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.userName}
              onChange={(e) =>
                setForm((s) => ({ ...s, userName: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              className="h-10 text-[12px]"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Password" required>
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((s) => ({ ...s, password: e.target.value }))
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPasswordConfirm ? "text" : "password"}
                value={form.passwordConfirm}
                onChange={(e) =>
                  setForm((s) => ({ ...s, passwordConfirm: e.target.value }))
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={
                  showPasswordConfirm
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>
          <FormField label="Password Expired Date">
            <DatePicker
              value={form.passwordExpDate}
              onChange={(value) =>
                setForm((s) => ({
                  ...s,
                  passwordExpDate: value ?? s.passwordExpDate,
                }))
              }
            />
          </FormField>
          <FormField label="Mobile Number" required>
            <Input
              className="h-10 text-[12px]"
              type="tel"
              value={form.mobileNumber}
              onChange={(e) =>
                setForm((s) => ({ ...s, mobileNumber: e.target.value }))
              }
            />
          </FormField>
          <div className="md:col-span-2 flex items-center gap-8 py-2 text-[12px] text-slate-700">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.isEditable}
                onChange={(e) =>
                  setForm((s) => ({ ...s, isEditable: e.target.checked }))
                }
              />
              <span>Editable</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.isReset}
                onChange={(e) =>
                  setForm((s) => ({ ...s, isReset: e.target.checked }))
                }
              />
              <span>Reset</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    isActive: e.target.checked,
                    reason: e.target.checked ? "active" : "",
                  }))
                }
              />
              <span>Active</span>
            </label>
          </div>
          {!form.isActive ? (
            <FormField label="Reason">
              <Input
                className="h-10 text-[12px]"
                value={form.reason}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reason: e.target.value }))
                }
              />
            </FormField>
          ) : null}
        </div>
      </FormModal>

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          activeStaff?.userName
            ? `Edit Staff Account - ${activeStaff.userName}`
            : "Edit Staff Account"
        }
        onSubmit={submitEdit}
        isSubmitting={saving}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <FormField label="First Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.firstName}
              onChange={(e) =>
                setForm((s) => ({ ...s, firstName: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Last Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.lastName}
              onChange={(e) =>
                setForm((s) => ({ ...s, lastName: e.target.value }))
              }
            />
          </FormField>
          <FormField label="User Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.userName}
              onChange={(e) =>
                setForm((s) => ({ ...s, userName: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              className="h-10 text-[12px]"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Mobile Number">
            <Input
              className="h-10 text-[12px]"
              value={form.mobileNumber}
              onChange={(e) =>
                setForm((s) => ({ ...s, mobileNumber: e.target.value }))
              }
            />
          </FormField>
          <FormField label="New Password">
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((s) => ({ ...s, password: e.target.value }))
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm New Password">
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPasswordConfirm ? "text" : "password"}
                value={form.passwordConfirm}
                onChange={(e) =>
                  setForm((s) => ({ ...s, passwordConfirm: e.target.value }))
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={
                  showPasswordConfirm
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>
        </div>
      </FormModal>

      <FormModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        title="Edit User Role"
        onSubmit={submitRoles}
        isSubmitting={savingRoles}
        size="lg"
        submitLabel="Save"
        cancelLabel="Close"
        titleClassName="text-[#2aa6a4] text-[18px] font-semibold"
        contentClassName="sm:max-w-3xl"
        formClassName="space-y-3 py-1"
      >
        <div className="space-y-3 text-[12px]">
          {roleSheetUser ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {roleSheetUser.collegeCode ?? "-"}
                </div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {roleSheetUser.userName ?? "-"}
                </div>
                <div className="text-slate-800">Employee Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  :{" "}
                  {[roleSheetUser.firstName, roleSheetUser.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || "-"}
                </div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {roleSheetUser.mobileNumber ?? "-"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,33%)_15%_10%] items-end gap-4 px-2">
            <Select
              label="Role *"
              value={roleIdToAdd}
              onChange={setRoleIdToAdd}
              options={roleOptions.map((role) => ({
                value: String(role.roleId),
                label: role.roleName,
              }))}
              searchable
              isLoading={rolesLoading}
              side="bottom"
              avoidCollisions={false}
            />
            <label className="inline-flex items-center gap-2 text-[12px] pb-1.5 text-slate-700">
              <input
                type="checkbox"
                checked={roleActiveToAdd}
                onChange={(e) => setRoleActiveToAdd(e.target.checked)}
              />
              <span>Active</span>
            </label>
            <Button
              type="button"
              className="h-7 w-14 px-0 text-[11px] bg-[#0a2e67] hover:bg-[#082653]"
              onClick={addRoleToDraft}
            >
              Add
            </Button>
          </div>

          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-100 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">
                    Role Name
                  </th>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((role) => (
                  <tr
                    key={`${role.roleId}-${role.userRoleId ?? "new"}`}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">
                      {role.roleName ?? `Role ${role.roleId}`}
                    </td>
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">
                      {role.isActive === false ? "InActive" : "Active"}
                    </td>
                    <td className="px-3 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deactivateRole(role.roleId)}
                        disabled={role.isActive === false}
                        aria-label="Remove role"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {roleRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-2 text-[12px] text-muted-foreground"
                      colSpan={3}
                    >
                      No roles added yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>
    </FilteredListPage>
  );
}
