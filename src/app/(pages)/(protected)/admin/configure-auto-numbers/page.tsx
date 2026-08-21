"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { APP_CONFIG } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import {
  listActiveCollegesByOrganizationForConfigAutoNumber,
  listActiveOrganizationsForConfigAutoNumber,
  listConfigAutoNumbers,
  saveConfigAutoNumberList,
} from "@/services";
import type { ConfigAutoNumber } from "@/types/config-auto-number";
import NewAttributeModal from "./NewAttributeModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ConfigAutoNumber>,
  collegeCode: {
    colId: "collegeCode",
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<ConfigAutoNumber>,
  courseCode: {
    colId: "courseCode",
    field: "courseCode",
    headerName: "Course",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<ConfigAutoNumber>,
  configAttributeName: {
    colId: "configAttributeName",
    field: "configAttributeName",
    headerName: "Attribute Name",
    minWidth: 150,
    flex: 1.1,
  } as ColDef<ConfigAutoNumber>,
  configAtttributeCode: {
    colId: "configAtttributeCode",
    headerName: "Attribute Code",
    minWidth: 140,
    flex: 1,
  } as ColDef<ConfigAutoNumber>,
  prefix: {
    colId: "prefix",
    headerName: "Prefix",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<ConfigAutoNumber>,
  suffix: {
    colId: "suffix",
    headerName: "Suffix",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<ConfigAutoNumber>,
  currentNumber: {
    colId: "currentNumber",
    headerName: "Current Number",
    minWidth: 130,
    flex: 0.8,
  } as ColDef<ConfigAutoNumber>,
  formula: {
    colId: "formula",
    headerName: "Formula",
    minWidth: 140,
    flex: 1,
  } as ColDef<ConfigAutoNumber>,
  isAutoIncRequired: {
    colId: "isAutoIncRequired",
    headerName: "Auto Increment",
    minWidth: 120,
    flex: 0.7,
  } as ColDef<ConfigAutoNumber>,
  isActive: {
    colId: "isActive",
    headerName: "Active",
    minWidth: 90,
    flex: 0.6,
  } as ColDef<ConfigAutoNumber>,
};

const SEARCH_FIELDS = [
  "collegeCode",
  "courseCode",
  "configAttributeName",
  "configAtttributeCode",
  "prefix",
  "suffix",
  "formula",
];

function sameRow(a: ConfigAutoNumber, b: ConfigAutoNumber) {
  if (a.configAutoNumberId && b.configAutoNumberId) {
    return a.configAutoNumberId === b.configAutoNumberId;
  }
  return (
    a.configAtttributeCode === b.configAtttributeCode &&
    a.courseId === b.courseId
  );
}

function makeTextEditor(
  field: "configAtttributeCode" | "prefix" | "suffix" | "formula",
  onPatch: (row: ConfigAutoNumber, patch: Partial<ConfigAutoNumber>) => void,
) {
  return (p: ICellRendererParams<ConfigAutoNumber>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Input
        variant="outlined"
        className="h-8"
        value={String(row[field] ?? "")}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onPatch(row, { [field]: e.target.value })}
      />
    );
  };
}

function numberEditor(
  onPatch: (row: ConfigAutoNumber, patch: Partial<ConfigAutoNumber>) => void,
) {
  return (p: ICellRendererParams<ConfigAutoNumber>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Input
        variant="outlined"
        className="h-8"
        type="number"
        value={row.currentNumber ?? ""}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) =>
          onPatch(row, {
            currentNumber: e.target.value ? Number(e.target.value) : undefined,
          })
        }
      />
    );
  };
}

function checkboxEditor(
  field: "isAutoIncRequired" | "isActive",
  onPatch: (row: ConfigAutoNumber, patch: Partial<ConfigAutoNumber>) => void,
) {
  return (p: ICellRendererParams<ConfigAutoNumber>) => {
    const row = p.data;
    if (!row) return null;
    const checked = Boolean(row[field] ?? field === "isActive");
    return (
      <div className="flex h-full items-center">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onPatch(row, { [field]: Boolean(value) })}
        />
      </div>
    );
  };
}

export default function ConfigureAutoNumbersPage() {
  const [organizationId, setOrganizationId] = useState<number | undefined>();
  const [collegeId, setCollegeId] = useState<number | undefined>();
  const [rows, setRows] = useState<ConfigAutoNumber[]>([]);
  const [listVisible, setListVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attributeOpen, setAttributeOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const orgQuery = useQuery({
    queryKey: QK.configAutoNumbers.organizations(),
    queryFn: listActiveOrganizationsForConfigAutoNumber,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  });

  const collegesQuery = useQuery({
    queryKey: QK.configAutoNumbers.colleges(organizationId),
    queryFn: () =>
      organizationId
        ? listActiveCollegesByOrganizationForConfigAutoNumber(organizationId)
        : Promise.resolve([]),
    enabled: Boolean(organizationId),
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  });

  const orgOptions = useMemo(
    () =>
      (orgQuery.data ?? []).map((row) => ({
        value: String(row.organizationId),
        label: row.orgCode ?? row.orgName,
      })),
    [orgQuery.data],
  );
  const collegeOptions = useMemo(
    () =>
      (collegesQuery.data ?? []).map((row) => ({
        value: String(row.collegeId),
        label: row.collegeCode ?? row.collegeName,
      })),
    [collegesQuery.data],
  );

  const patchRow = useCallback(
    (target: ConfigAutoNumber, patch: Partial<ConfigAutoNumber>) => {
      setRows((prev) =>
        prev.map((row) => (sameRow(row, target) ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  async function getList() {
    if (!organizationId || !collegeId) return;
    setSaveError(null);
    setLoading(true);
    try {
      const data = await listConfigAutoNumbers(organizationId, collegeId);
      setRows(data ?? []);
      setListVisible(true);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to load auto numbers",
      );
      setRows([]);
      setListVisible(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveList() {
    if (!rows.length) return;
    setSaveError(null);
    try {
      await saveConfigAutoNumberList(rows);
      await getList();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save auto numbers",
      );
    }
  }

  function hideList() {
    setRows([]);
    setListVisible(false);
    setSaveError(null);
  }

  const columnDefs = useMemo<ColDef<ConfigAutoNumber>[]>(
    () => [
      COLS.siNo,
      COLS.collegeCode,
      COLS.courseCode,
      COLS.configAttributeName,
      {
        ...COLS.configAtttributeCode,
        cellRenderer: makeTextEditor("configAtttributeCode", patchRow),
      },
      { ...COLS.prefix, cellRenderer: makeTextEditor("prefix", patchRow) },
      { ...COLS.suffix, cellRenderer: makeTextEditor("suffix", patchRow) },
      { ...COLS.currentNumber, cellRenderer: numberEditor(patchRow) },
      { ...COLS.formula, cellRenderer: makeTextEditor("formula", patchRow) },
      {
        ...COLS.isAutoIncRequired,
        cellRenderer: checkboxEditor("isAutoIncRequired", patchRow),
      },
      { ...COLS.isActive, cellRenderer: checkboxEditor("isActive", patchRow) },
    ],
    [patchRow],
  );

  return (
    <FilteredListPage
      title="Configure Auto Numbers"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField
            label="Organization *"
            className="global-filter-field--shrink w-full max-w-[min(100%,12rem)] sm:w-[12rem]"
          >
            <Select
              value={organizationId ? String(organizationId) : null}
              onChange={(value) => {
                setOrganizationId(value ? Number(value) : undefined);
                setCollegeId(undefined);
                hideList();
              }}
              options={orgOptions}
              placeholder="Select organization"
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="College *"
            className="global-filter-field--shrink w-full max-w-[min(100%,12rem)] sm:w-[12rem]"
          >
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : undefined);
                hideList();
              }}
              options={collegeOptions}
              placeholder="Select college"
              disabled={!organizationId}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--shrink global-filter-field--action"
          >
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void getList()}
                disabled={!organizationId || !collegeId || loading}
              >
                {loading ? "Loading…" : "Get List"}
              </Button>
              <Button
                size="sm"
                data-app-add
                className="app-control"
                onClick={() => setAttributeOpen(true)}
              >
                New Attribute
              </Button>
            </div>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      showTable={listVisible}
      resultsVisible={listVisible}
      rowData={listVisible ? rows : []}
      columnDefs={listVisible ? columnDefs : undefined}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        searchFields: SEARCH_FIELDS,
        pdfDocumentTitle: "Configure Auto Numbers",
      }}
      afterGrid={
        <div className="flex items-center justify-end gap-3">
          {saveError ? (
            <p className="mr-auto text-sm text-red-600">{saveError}</p>
          ) : null}
          <Button
            size="sm"
            onClick={() => void saveList()}
            disabled={!rows.length}
          >
            Save
          </Button>
        </div>
      }
    >
      <NewAttributeModal
        key={getCrudModalKey(null, attributeOpen)}
        open={attributeOpen}
        onClose={() => setAttributeOpen(false)}
        onSaved={async () => {
          if (organizationId && collegeId) await getList();
        }}
      />
    </FilteredListPage>
  );
}
