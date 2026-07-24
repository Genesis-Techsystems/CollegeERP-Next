"use client";

/**
 * Angular parity: user-management/user-type
 * Filter: Organization (required to load list) — orgCode options, isActive==true
 * List: domain/list/Usertype?query=Organization.organizationId=={id}
 * Columns: SI.No, User Type Code, User Type, Status, Actions (Edit)
 * + Add User Type → modal; stamps organizationId from filter
 * Update PK query: usertypeId=={id}
 * No print.
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import {
  listActiveOrganizations,
  listUserTypesByOrganizationId,
  type UserType,
} from "@/services";
import type { Organization } from "@/types/organization";
import { UserTypeModal } from "./UserTypeModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<UserType>,
  userTypeCode: {
    field: "userTypeCode",
    headerName: "User Type Code",
    minWidth: 150,
  } as ColDef<UserType>,
  userTypeName: {
    field: "userTypeName",
    headerName: "User Type",
    minWidth: 180,
  } as ColDef<UserType>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<UserType>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<UserType>,
};

function statusRenderer(p: ICellRendererParams<UserType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: UserType) => void) {
  return (p: ICellRendererParams<UserType>) => {
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

export default function UserTypePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<UserType | null>(null);

  const orgIdNum = Number(organizationId) || 0;

  useEffect(() => {
    void listActiveOrganizations()
      .then(setOrganizations)
      .catch((e) => toastError(e, "Failed to load organizations"));
  }, []);

  const { data, isLoading, invalidate } = useCrudList<UserType>({
    queryKey: QK.userTypes.list(orgIdNum),
    queryFn: () => listUserTypesByOrganizationId(orgIdNum),
    enabled: Boolean(orgIdNum),
  });

  const orgOptions = useMemo<SelectOption[]>(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? String(o.organizationId),
      })),
    [organizations],
  );

  const columnDefs = useMemo<ColDef<UserType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.userTypeCode,
      COL_DEFS.userTypeName,
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

  return (
    <FilteredListPage
      title="User Types"
      filters={
        <Select
          label="Organization *"
          value={organizationId || null}
          onChange={(v) => setOrganizationId(v ?? "")}
          options={orgOptions}
          placeholder="Organization"
          clearable
          className="w-[20rem]"
        />
      }
      rowData={orgIdNum ? data : []}
      columnDefs={columnDefs}
      loading={Boolean(orgIdNum) && isLoading}
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
            // Angular allows Add without validating org first; still stamp filter value.
            setEditData(null);
            setModalOpen(true);
          }}
        >
          + Add User Type
        </Button>
      }
    >
      <UserTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        organizationId={orgIdNum}
        onSaved={invalidate}
      />
    </FilteredListPage>
  );
}
