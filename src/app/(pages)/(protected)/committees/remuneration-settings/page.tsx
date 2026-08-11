"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import { listRemunerationSettings } from "@/services";
import type { UnivRemunerationSetting } from "@/types/committees";
import RemunerationSettingModal from "./RemunerationSettingModal";

const BTN_NAVY = "bg-[#001f3f] text-white hover:bg-[#002a54]";

function fmtDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

/** Angular `remuneration-settings.component` columns / headers. */
const COLS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<UnivRemunerationSetting>,
  organisation: {
    headerName: "Organisation Name",
    minWidth: 130,
    flex: 0.9,
    valueGetter: (p) => p.data?.orgCode ?? p.data?.organizationName ?? "",
  } as ColDef<UnivRemunerationSetting>,
  college: {
    headerName: "College Name",
    field: "collegeCode",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<UnivRemunerationSetting>,
  role: {
    headerName: "Role",
    field: "evaluatorRoleName",
    minWidth: 130,
    flex: 1,
  } as ColDef<UnivRemunerationSetting>,
  designation: {
    headerName: "Designation",
    minWidth: 150,
    flex: 1,
    valueGetter: (p) =>
      p.data?.remunerationDesignationDisplayName ??
      p.data?.remunerationDesignationName ??
      "",
  } as ColDef<UnivRemunerationSetting>,
  amount: {
    headerName: "Amount",
    minWidth: 100,
    flex: 0.7,
    valueGetter: (p) =>
      p.data?.amount != null && p.data.amount !== undefined
        ? `${p.data.amount}/-`
        : "",
  } as ColDef<UnivRemunerationSetting>,
  fromDate: {
    headerName: "From Date",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<UnivRemunerationSetting>,
  toDate: {
    headerName: "To Date",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<UnivRemunerationSetting>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.5,
  } as ColDef<UnivRemunerationSetting>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<UnivRemunerationSetting>,
};

function statusRenderer(p: ICellRendererParams<UnivRemunerationSetting>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: UnivRemunerationSetting | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivRemunerationSetting>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function RemunerationSettingsPage() {
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<UnivRemunerationSetting | null>(
    null,
  );

  const { data, isLoading, invalidate } = useCrudList<UnivRemunerationSetting>({
    queryKey: QK.remunerationSettings.list(),
    queryFn: listRemunerationSettings,
  });

  const columnDefs = useMemo<ColDef<UnivRemunerationSetting>[]>(
    () => [
      COLS.siNo,
      COLS.organisation,
      COLS.college,
      COLS.role,
      COLS.designation,
      COLS.amount,
      {
        ...COLS.fromDate,
        valueGetter: (p) => fmtDate(p.data?.fromDate),
      },
      {
        ...COLS.toDate,
        valueGetter: (p) => fmtDate(p.data?.toDate),
      },
      { ...COLS.isActive, cellRenderer: statusRenderer },
      {
        ...COLS.actions,
        cellRenderer: makeActionsRenderer(setEditData, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Remuneration Settings"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Remuneration Settings",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className={BTN_NAVY}
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Create Remuneration Settings
        </Button>
      }
    >
      <RemunerationSettingModal
        key={getCrudModalKey(editData, modalOpen, "univRemunerationSettingId")}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        editData={editData}
        organizationId={organizationId}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
