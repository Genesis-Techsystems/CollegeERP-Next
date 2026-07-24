"use client";

/**
 * Angular parity: user-management/parent-accounts
 * List: GET api/userdetailsbytype?userTypeCode=PARENT&page=&size=50 (server-paged)
 * Columns: SI.No, User Name, Parent Name, Mobile No, College, Status, Actions
 * Actions: User Roles | Add Sibling | Edit
 * Add Parent → /user-management/parent-accounts/manage
 * No print.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, X } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { FormModal } from "@/common/components/feedback";
import { FormField } from "@/common/components/forms";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/common/components/select";
import { useSession } from "@/hooks/useSession";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import {
  getParentAccountById,
  listParentAccountsPage,
  listRolesByOrganization,
  listUserRoles,
  saveUserRoles,
  updateParentAccount,
  type ParentAccount,
  type UserRole,
} from "@/services";

const DEFAULT_PAGE_SIZE = 50;
const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

function makeSiNoGetter(page: number, pageSize: number) {
  return (p: ValueGetterParams<ParentAccount>) => {
    const ri = p.node?.rowIndex;
    const local = typeof ri === "number" ? ri : 0;
    // Angular: (parents.indexOf(row) + 1) + (page * 50)
    return page * pageSize + local + 1;
  };
}

const COL_DEFS = {
  siNo: { headerName: "SI.No", width: 76, flex: 0 } as ColDef<ParentAccount>,
  userName: {
    field: "userName",
    headerName: "User Name",
    minWidth: 170,
  } as ColDef<ParentAccount>,
  firstName: {
    field: "firstName",
    headerName: "Parent Name",
    minWidth: 180,
  } as ColDef<ParentAccount>,
  mobileNumber: {
    field: "mobileNumber",
    headerName: "Mobile No",
    minWidth: 130,
  } as ColDef<ParentAccount>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
  } as ColDef<ParentAccount>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<ParentAccount>,
  actions: {
    headerName: "Actions",
    minWidth: 280,
    flex: 0,
    width: 280,
    sortable: false,
    filter: false,
  } as ColDef<ParentAccount>,
};

function statusRenderer(p: ICellRendererParams<ParentAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onRoles: (row: ParentAccount | null) => void,
  onEdit: (row: ParentAccount | null) => void,
) {
  return (p: ICellRendererParams<ParentAccount>) => {
    const row = p.data ?? null;
    const userId = row?.userId;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => onRoles(row)}
        >
          User Roles
        </button>
        <span className="select-none text-slate-300" aria-hidden>
          |
        </span>
        {userId ? (
          <Link
            href={`/user-management/parent-accounts/add-sibling?userId=${userId}`}
            className="font-medium text-primary hover:underline"
          >
            Add Sibling
          </Link>
        ) : null}
        <span className="select-none text-slate-300" aria-hidden>
          |
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label="Edit parent"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function ParentAccountsPage() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [page, setPage] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null);
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true);
  const [activeParent, setActiveParent] = useState<ParentAccount | null>(null);
  const [roleRows, setRoleRows] = useState<UserRole[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    userName: "",
    email: "",
    mobileNumber: "",
    password: "",
    isActive: true,
    isEditable: false,
    isReset: false,
    reason: "active",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: QK.parentAccounts.list(page, DEFAULT_PAGE_SIZE),
    queryFn: () => listParentAccountsPage(page, DEFAULT_PAGE_SIZE),
  });

  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;

  // Angular UserRolesModal: localStorage organizationId (session org)
  const organizationId =
    Number(user?.organizationId ?? 0) ||
    Number(activeParent?.organizationId ?? 0) ||
    0;

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ["ParentAccounts", "roles", organizationId],
    queryFn: () => listRolesByOrganization(organizationId),
    enabled: rolesOpen && organizationId > 0,
  });

  const { data: existingUserRoles } = useCrudList({
    queryKey: ["ParentAccounts", "userRoles", activeParent?.userId ?? 0],
    queryFn: () => listUserRoles(activeParent?.userId ?? 0),
    enabled: rolesOpen && !!activeParent?.userId,
  });

  useEffect(() => {
    if (!rolesOpen) return;
    setRoleRows(
      existingUserRoles.map((r) => ({ ...r, isActive: r.isActive !== false })),
    );
  }, [existingUserRoles, rolesOpen]);

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: QK.parentAccounts.all });
  }

  const openRolesModal = useCallback(
    (row: ParentAccount | null) => {
      if (!row) return;
      if (!organizationId && !row.organizationId) {
        toastError("Organization is missing; user roles cannot be loaded.");
        return;
      }
      setActiveParent(row);
      setRoleIdToAdd(null);
      setRoleActiveToAdd(true);
      setRolesOpen(true);
    },
    [organizationId],
  );

  const openEditModal = useCallback(async (row: ParentAccount | null) => {
    if (!row?.userId) return;
    const full = await getParentAccountById(row.userId).catch(() => null);
    const parent: ParentAccount = full ? { ...row, ...full } : row;
    setActiveParent(parent);
    setForm({
      firstName: parent.firstName ?? "",
      userName: parent.userName ?? "",
      email: parent.email ?? "",
      mobileNumber: parent.mobileNumber ?? "",
      password: "",
      isActive: parent.isActive !== false,
      isEditable: parent.isEditable ?? false,
      isReset: parent.isReset ?? false,
      reason:
        parent.reason ?? (parent.isActive === false ? "inactive" : "active"),
    });
    setShowPassword(false);
    setEditOpen(true);
  }, []);

  const columnDefs = useMemo<ColDef<ParentAccount>[]>(
    () => [
      {
        ...COL_DEFS.siNo,
        valueGetter: makeSiNoGetter(page, DEFAULT_PAGE_SIZE),
      },
      COL_DEFS.userName,
      COL_DEFS.firstName,
      COL_DEFS.mobileNumber,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openRolesModal, openEditModal),
      },
    ],
    [page, openRolesModal, openEditModal],
  );

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  async function submitEdit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!activeParent?.userId) return;
    if (!form.firstName.trim()) return toastError("First name is required");
    if (!form.userName.trim()) return toastError("User name is required");
    if (!form.mobileNumber.trim() || !PHONE_RE.test(form.mobileNumber.trim())) {
      return toastError("Enter 10 digit number");
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return toastError("Enter a valid email");
    }
    try {
      setSaving(true);
      const passwordToSend = form.password || activeParent.password || "";
      await updateParentAccount(activeParent.userId, {
        userId: activeParent.userId,
        firstName: form.firstName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: passwordToSend,
        passwordConfirm: passwordToSend,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? "active" : "inactive"),
        // Angular merges these from the list row before PUT
        collegeId: activeParent.collegeId,
        organizationId: activeParent.organizationId,
        userTypeId: activeParent.userTypeId,
      });
      setEditOpen(false);
      toastSuccess("Parent account updated successfully");
      invalidateList();
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !activeParent?.userId) return;
    const roleId = Number(roleIdToAdd);
    const exists = roleRows.some(
      (r) => r.roleId === roleId && r.isActive !== false,
    );
    if (exists) {
      toastInfo("Already same user role exists to this user.");
      return;
    }
    const role = roleOptions.find((r) => r.roleId === roleId);
    setRoleRows((prev) => [
      ...prev.filter((r) => r.roleId !== roleId),
      {
        userId: activeParent.userId,
        userTypeId: activeParent.userTypeId ?? 0,
        roleId,
        roleName: role?.roleName ?? `Role ${roleId}`,
        isActive: roleActiveToAdd,
      },
    ]);
    setRoleIdToAdd(null);
    setRoleActiveToAdd(true);
  }

  function deactivateRole(roleId: number) {
    // Angular soft-delete: flag inactive and keep in payload array
    setRoleRows((prev) => {
      const item = prev.find((r) => r.roleId === roleId);
      if (!item) return prev;
      const rest = prev.filter((r) => r.roleId !== roleId);
      return [...rest, { ...item, isActive: false }];
    });
  }

  async function submitRoles(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!activeParent?.userId) return;
    try {
      setSavingRoles(true);
      await saveUserRoles(
        roleRows.map((r) => ({
          ...r,
          userId: activeParent.userId,
          userTypeId: activeParent.userTypeId ?? r.userTypeId,
          userName: activeParent.userName ?? r.userName,
          firstName: activeParent.firstName ?? r.firstName ?? null,
          lastName: activeParent.lastName ?? r.lastName ?? null,
          resetPasswordCode: r.resetPasswordCode ?? null,
        })),
      );
      setRolesOpen(false);
      toastSuccess("User roles saved successfully");
      invalidateList();
    } catch {
      toastError("Failed to save user roles");
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <ListPage
      title="Parents"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      getRowId={(p) => String(p.data?.userId ?? "")}
      serverSide
      totalCount={totalCount}
      currentPage={page}
      onPageChange={(p) => handlePageChange(p)}
      pagination={false}
      paginationPageSize={DEFAULT_PAGE_SIZE}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button size="sm" asChild>
          <Link href="/user-management/parent-accounts/manage">
            <PlusIcon className="mr-1 h-4 w-4" />
            Add Parent
          </Link>
        </Button>
      }
    >
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Parent User"
        onSubmit={submitEdit}
        isSubmitting={saving}
        size="lg"
        submitLabel="Submit"
        cancelLabel="Close"
      >
        <div className="grid grid-cols-1 gap-3 text-[12px] md:grid-cols-2">
          <FormField label="First Name" required>
            <Input
              className="h-10 text-[12px]"
              value={form.firstName}
              onChange={(e) =>
                setForm((s) => ({ ...s, firstName: e.target.value }))
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
          <FormField label="Email">
            <Input
              className="h-10 text-[12px]"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Mobile Number" required>
            <Input
              className="h-10 text-[12px]"
              value={form.mobileNumber}
              onChange={(e) =>
                setForm((s) => ({ ...s, mobileNumber: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Password">
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((s) => ({ ...s, password: e.target.value }))
                }
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </FormField>
          <div className="md:col-span-2 flex flex-wrap items-center gap-5 text-[12px] text-slate-700">
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
                  setForm((s) => ({ ...s, isActive: e.target.checked }))
                }
              />
              <span>Active</span>
            </label>
          </div>
          {!form.isActive ? (
            <FormField label="Reason" className="md:col-span-2">
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
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        title="Edit User Role"
        onSubmit={submitRoles}
        isSubmitting={savingRoles}
        size="lg"
        submitLabel="Save"
        cancelLabel="Close"
      >
        <div className="space-y-3 text-[12px]">
          {activeParent ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {activeParent.collegeCode ?? "-"}
                </div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {activeParent.userName ?? "-"}
                </div>
                <div className="text-slate-800">Parent Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {activeParent.firstName || activeParent.userName || "-"}
                </div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">
                  : {activeParent.mobileNumber ?? "-"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_auto]">
            <Select
              label="Role *"
              value={roleIdToAdd}
              onChange={setRoleIdToAdd}
              options={roleOptions.map((r) => ({
                value: String(r.roleId),
                label: r.roleName,
              }))}
              searchable
              isLoading={rolesLoading}
            />
            <label className="inline-flex items-center gap-2 pb-1.5 text-[12px] text-slate-700">
              <input
                type="checkbox"
                checked={roleActiveToAdd}
                onChange={(e) => setRoleActiveToAdd(e.target.checked)}
              />
              <span>Active</span>
            </label>
            <Button
              type="button"
              className="h-8 bg-[#0a2e67] px-5 text-[12px] hover:bg-[#082653]"
              onClick={addRoleToDraft}
            >
              Add
            </Button>
          </div>

          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-[12px]">
              <thead className="border-b border-border bg-slate-100">
                <tr>
                  <th className="px-3 py-1 text-left text-[11px] font-semibold text-slate-700">
                    Role Name
                  </th>
                  <th className="px-3 py-1 text-left text-[11px] font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-3 py-1 text-left text-[11px] font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((r) => (
                  <tr
                    key={`${r.roleId}-${r.userRoleId ?? "new"}`}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">
                      {r.roleName ?? `Role ${r.roleId}`}
                    </td>
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">
                      {r.isActive === false ? "InActive" : "Active"}
                    </td>
                    <td className="px-3 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deactivateRole(r.roleId)}
                        disabled={r.isActive === false}
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
    </ListPage>
  );
}
