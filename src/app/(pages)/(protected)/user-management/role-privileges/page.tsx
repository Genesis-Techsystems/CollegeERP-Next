"use client";

/**
 * Angular parity: user-management/roles/role-privilege-modal (route: role-privileges)
 * Load: domain/list/Page?query=isActive==true
 * then: domain/list/RolePrivilege?query=Role.roleId==X.and.isActive==true
 * Save: POST roleprivilegelist with access page rows
 * Query params: roleId, roleName
 * No print.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listActivePagesForRolePrivileges,
  listRolePrivilegesByRoleId,
  saveRolePrivilegeList,
  type RolePrivilegePageRow,
} from "@/services";

type PrivilegeRow = RolePrivilegePageRow & {
  _rowKey: string;
  checked: boolean;
  isPresent: boolean;
};

function rowKey(row: RolePrivilegePageRow, index: number): string {
  if (row.pageId != null) return `page-${row.pageId}`;
  if (row.moduleId != null) return `module-${row.moduleId}-${index}`;
  return `row-${index}`;
}

function displayOrDash(value: string | null | undefined): string {
  if (value == null || value === "") return "--";
  return value;
}

function mergePrivilegesOntoPages(
  pages: RolePrivilegePageRow[],
  privileges: RolePrivilegePageRow[],
): PrivilegeRow[] {
  const merged: PrivilegeRow[] = pages.map((page, index) => {
    const match = privileges.find((p) => {
      if (page.pageId != null) return page.pageId === p.pageId;
      return page.moduleId != null && page.moduleId === p.moduleId;
    });

    if (!match) {
      return {
        ...page,
        _rowKey: rowKey(page, index),
        checked: false,
        isPresent: false,
        canAdd: page.canAdd ?? false,
        canEdit: page.canEdit ?? false,
        canDelete: page.canDelete ?? false,
        canView: page.canView ?? false,
      };
    }

    return {
      ...page,
      _rowKey: rowKey(page, index),
      checked: true,
      isPresent: true,
      rolePrivilegeId: match.rolePrivilegeId,
      collegeId: match.collegeId,
      organizationId: match.organizationId,
      roleId: match.roleId,
      canAdd: match.canAdd ?? false,
      canEdit: match.canEdit ?? false,
      canDelete: match.canDelete ?? false,
      canView: match.canView ?? false,
      createdDt: match.createdDt,
    };
  });

  // Angular: checked rows first
  merged.sort((a, b) => {
    if (a.checked === b.checked) return 0;
    if (a.checked) return -1;
    return 1;
  });

  return merged;
}

function SelectAllHeader(
  props: IHeaderParams<PrivilegeRow> & {
    allSelected: boolean;
    onToggleAll: () => void;
  },
) {
  return (
    <div className="flex w-full items-center justify-center">
      <Checkbox
        checked={props.allSelected}
        onCheckedChange={() => props.onToggleAll()}
        aria-label="Select all pages"
      />
    </div>
  );
}

function makeCheckedRenderer(
  onToggle: (key: string, checked: boolean) => void,
) {
  return (p: ICellRendererParams<PrivilegeRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex h-full items-center justify-center">
        <Checkbox
          checked={Boolean(row.checked)}
          onCheckedChange={(v) => onToggle(row._rowKey, v === true)}
          aria-label={`Select ${row.pageName ?? "page"}`}
        />
      </div>
    );
  };
}

type PrivilegeFlag = "canAdd" | "canEdit" | "canDelete" | "canView";

function makeFlagRenderer(
  field: PrivilegeFlag,
  onChange: (key: string, field: PrivilegeFlag, value: boolean) => void,
) {
  return (p: ICellRendererParams<PrivilegeRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex h-full items-center justify-center">
        <Checkbox
          checked={Boolean(row[field])}
          onCheckedChange={(v) => onChange(row._rowKey, field, v === true)}
          aria-label={`${field} for ${row.pageName ?? "page"}`}
        />
      </div>
    );
  };
}

export default function RolePrivilegesPage() {
  return (
    <Suspense
      fallback={
        <ListPage
          title="Role Privileges"
          rowData={[]}
          columnDefs={[]}
          loading
          pagination
        />
      }
    >
      <RolePrivilegesPageInner />
    </Suspense>
  );
}

function RolePrivilegesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();

  const roleId = Number(searchParams.get("roleId") ?? 0) || 0;
  const roleName = searchParams.get("roleName") ?? "";

  const [rows, setRows] = useState<PrivilegeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => r.isPresent),
    [rows],
  );

  const loadData = useCallback(async () => {
    if (!roleId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const pages = await listActivePagesForRolePrivileges();
      let privileges: RolePrivilegePageRow[] = [];
      try {
        privileges = await listRolePrivilegesByRoleId(roleId);
      } catch {
        privileges = [];
      }
      setRows(mergePrivilegesOntoPages(pages, privileges));
    } catch (e) {
      setRows([]);
      toastError(e, "Failed to load role privileges");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleRow = useCallback((key: string, checked: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r._rowKey === key ? { ...r, checked, isPresent: checked } : r,
      ),
    );
  }, []);

  const toggleAll = useCallback(() => {
    setRows((prev) => {
      const next = !(prev.length > 0 && prev.every((r) => r.isPresent));
      return prev.map((r) => ({ ...r, checked: next, isPresent: next }));
    });
  }, []);

  const setFlag = useCallback(
    (
      key: string,
      field: "canAdd" | "canEdit" | "canDelete" | "canView",
      value: boolean,
    ) => {
      setRows((prev) =>
        prev.map((r) => (r._rowKey === key ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  async function handleSave() {
    if (!roleId) {
      toastError(new Error("Missing roleId"), "Cannot save privileges");
      return;
    }

    const collegeId = user?.collegeId ?? null;
    const organizationId = user?.organizationId ?? null;
    const accessPages: RolePrivilegePageRow[] = [];

    for (const page of rows) {
      const { _rowKey: _, ...rest } = page;
      if (page.rolePrivilegeId) {
        if (page.checked) {
          accessPages.push(rest);
        } else {
          accessPages.push({
            ...rest,
            isActive: false,
            canDelete: false,
          });
        }
      } else if (page.checked) {
        accessPages.push({
          ...rest,
          roleId,
          collegeId,
          organizationId,
        });
      }
    }

    setSaving(true);
    try {
      await saveRolePrivilegeList(accessPages);
      toastSuccess("Privileges updated successfully");
      await loadData();
    } catch (e) {
      toastError(e, "Failed to save privileges");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<PrivilegeRow>[]>(
    () => [
      {
        headerName: "",
        field: "checked",
        width: 56,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: SelectAllHeader,
        headerComponentParams: {
          allSelected,
          onToggleAll: toggleAll,
        },
        cellRenderer: makeCheckedRenderer(toggleRow),
      },
      {
        field: "moduleName",
        headerName: "Module",
        minWidth: 140,
        valueGetter: (p) => displayOrDash(p.data?.moduleName),
      },
      {
        field: "submoduleName",
        headerName: "Sub Module",
        minWidth: 140,
        valueGetter: (p) => displayOrDash(p.data?.submoduleName),
      },
      {
        field: "pageName",
        headerName: "Page",
        minWidth: 180,
        valueGetter: (p) => displayOrDash(p.data?.pageName),
      },
      {
        headerName: "Add",
        field: "canAdd",
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeFlagRenderer("canAdd", setFlag),
      },
      {
        headerName: "Edit",
        field: "canEdit",
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeFlagRenderer("canEdit", setFlag),
      },
      {
        headerName: "Delete",
        field: "canDelete",
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeFlagRenderer("canDelete", setFlag),
      },
      {
        headerName: "View",
        field: "canView",
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeFlagRenderer("canView", setFlag),
      },
    ],
    [allSelected, toggleAll, toggleRow, setFlag],
  );

  const title =
    roleName.trim().length > 0
      ? `Role Privileges (${roleName})`
      : "Role Privileges";

  return (
    <ListPage
      title={title}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading || saving}
      pagination
      getRowId={(p) => p.data._rowKey}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          Back
        </Button>
        {rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={saving || !roleId}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </div>
    </ListPage>
  );
}
