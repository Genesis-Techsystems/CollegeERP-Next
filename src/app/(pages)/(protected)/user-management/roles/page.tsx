"use client";

/**
 * Angular parity: user-management/roles
 * List: domain/list/Role?query=order(createdDt=desc)&size=99999
 * Columns: Sl.No, Organization, Role, Privileges, Status, Actions (Edit)
 * Privileges → /user-management/role-privileges?roleId=&roleName=
 * No print.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listRoles, type Role } from "@/services";
import { RoleModal } from "./RoleModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<Role>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
  } as ColDef<Role>,
  roleName: {
    field: "roleName",
    headerName: "Role",
    minWidth: 200,
  } as ColDef<Role>,
  privileges: {
    headerName: "Privileges",
    minWidth: 120,
    flex: 0,
    width: 130,
    sortable: false,
    filter: false,
  } as ColDef<Role>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<Role>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<Role>,
};

function statusRenderer(p: ICellRendererParams<Role>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makePrivilegesRenderer(onPrivileges: (row: Role) => void) {
  return (p: ICellRendererParams<Role>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        size="sm"
        className="h-7 px-3 text-[11px]"
        onClick={() => onPrivileges(row)}
      >
        Privileges
      </Button>
    );
  };
}

function makeActionsRenderer(onEdit: (row: Role) => void) {
  return (p: ICellRendererParams<Role>) => {
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

export default function RolesPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Role | null>(null);

  const { data, isLoading, invalidate } = useCrudList<Role>({
    queryKey: QK.roles.list(),
    queryFn: listRoles,
  });

  const columnDefs = useMemo<ColDef<Role>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.roleName,
      {
        ...COL_DEFS.privileges,
        cellRenderer: makePrivilegesRenderer((row) => {
          const params = new URLSearchParams({
            roleId: String(row.roleId),
            roleName: row.roleName ?? "",
          });
          router.push(`/user-management/role-privileges?${params.toString()}`);
        }),
      },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditData(row);
          setModalOpen(true);
        }),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Roles"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          + Add Role
        </Button>
      }
    >
      <RoleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
