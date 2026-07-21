"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  listHostelRegistersByHostel,
  listHostelsForRegister,
} from "@/services";
import type { HostelRegister } from "@/types/hostel";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { HostelRegisterModal } from "./HostelRegisterModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<HostelRegister>,
  hosteler: {
    headerName: "Hosteler name",
    minWidth: 140,
  } as ColDef<HostelRegister>,
  attendeesName: {
    field: "attendeesName",
    headerName: "Attendees name",
    minWidth: 120,
  } as ColDef<HostelRegister>,
  relation: {
    field: "relationCatdetDisplayName",
    headerName: "Relationship",
    minWidth: 100,
  } as ColDef<HostelRegister>,
  inTiming: { headerName: "In time", minWidth: 165 } as ColDef<HostelRegister>,
  outTiming: {
    headerName: "Out time",
    minWidth: 165,
  } as ColDef<HostelRegister>,
  mobileNumber: {
    field: "mobileNumber",
    headerName: "Mobile Number",
    minWidth: 120,
  } as ColDef<HostelRegister>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<HostelRegister>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<HostelRegister>,
};

function hostelerNameRenderer(p: ICellRendererParams<HostelRegister>) {
  const row = p.data;
  if (!row) return null;
  const names = [row.stdFirstName, row.empFirstName].filter(Boolean);
  return <span>{names.length > 0 ? names.join(" ") : "—"}</span>;
}

function formatRegisterTiming(dateValue?: string, timeValue?: string) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  const match = String(timeValue ?? "").match(/^(\d{1,2}):(\d{1,2})/);
  if (match) date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return format(date, "dd MMM, yyyy h:mm a");
}

function inTimingRenderer(p: ICellRendererParams<HostelRegister>) {
  return formatRegisterTiming(p.data?.inDate, p.data?.inTime);
}

function outTimingRenderer(p: ICellRendererParams<HostelRegister>) {
  return formatRegisterTiming(p.data?.outDate, p.data?.outTime);
}

function statusRenderer(p: ICellRendererParams<HostelRegister>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: HostelRegister | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<HostelRegister>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit register entry"
      title="Edit Register"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function HostelRegisterPage() {
  const queryClient = useQueryClient();
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [hostels, setHostels] = useState<SelectOption[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HostelRegister | null>(null);
  const hostelNum = Number(hostelId ?? 0);

  useEffect(() => {
    const rawOrganizationId = String(
      localStorage.getItem("organizationId") ?? "",
    );
    const organizationNum = Number(rawOrganizationId);
    setOrganizationId(rawOrganizationId);
    setLoadingHostels(true);
    void listHostelsForRegister(organizationNum)
      .then((rows) => {
        const options = rows.map((hostel) => ({
          value: String(hostel.hostelId),
          label: String(hostel.hostelCode ?? hostel.hostelId),
        }));
        setHostels(options);
        setHostelId(options[0]?.value ?? null);
      })
      .catch((error) => toastError(error, "Failed to load hostels"))
      .finally(() => setLoadingHostels(false));
  }, []);

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QK.hostel.register(hostelNum),
    queryFn: () => listHostelRegistersByHostel(hostelNum),
    enabled: hostelNum > 0,
  });

  const columnDefs = useMemo<ColDef<HostelRegister>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.hosteler, cellRenderer: hostelerNameRenderer },
      COL_DEFS.attendeesName,
      COL_DEFS.relation,
      { ...COL_DEFS.inTiming, cellRenderer: inTimingRenderer },
      { ...COL_DEFS.outTiming, cellRenderer: outTimingRenderer },
      COL_DEFS.mobileNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  function invalidateRegister() {
    void queryClient.invalidateQueries({
      queryKey: QK.hostel.register(hostelNum),
    });
  }

  return (
    <FilteredListPage
      title="Hostel Register"
      notice={
        error ? (
          <p className="px-1 text-sm text-destructive">
            {getErrorMessage(error)}
          </p>
        ) : null
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Hostel *">
            <Select
              value={hostelId}
              onChange={setHostelId}
              options={hostels}
              searchable
              isLoading={loadingHostels}
              clearable={false}
              placeholder="Select hostel"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={hostelNum > 0 ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      paginationPageSize={10}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search register…",
        columnPicker: false,
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Hostel Outing Pass
        </Button>
      }
    >
      {hostelNum > 0 ? (
        <HostelRegisterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          hostelId={hostelNum}
          organizationId={organizationId}
          row={editing}
          onSaved={invalidateRegister}
        />
      ) : null}
    </FilteredListPage>
  );
}
