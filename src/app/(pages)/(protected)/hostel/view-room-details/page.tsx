"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilIcon } from "lucide-react";
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
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  listActiveHostelRoomsForDetails,
  listHostelRoomAllocationsByRoom,
  listHostelsForRegister,
} from "@/services";
import type { HostelRoom, HostelRoomAllocationRow } from "@/types/hostel";
import { EditHostelRoomAllocationModal } from "./EditHostelRoomAllocationModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<HostelRoomAllocationRow>,
  name: {
    headerName: "Name",
    minWidth: 190,
  } as ColDef<HostelRoomAllocationRow>,
  parent: {
    headerName: "Parent Name",
    minWidth: 210,
  } as ColDef<HostelRoomAllocationRow>,
  address: {
    field: "permanentAddress",
    headerName: "Address",
    minWidth: 190,
  } as ColDef<HostelRoomAllocationRow>,
  paymentDueDate: {
    field: "paymentDueDate",
    headerName: "Payment Due Date",
    minWidth: 145,
  } as ColDef<HostelRoomAllocationRow>,
  paymentStatus: {
    field: "isAmountSetteled",
    headerName: "Payment Status",
    minWidth: 125,
  } as ColDef<HostelRoomAllocationRow>,
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 105,
    flex: 0,
  } as ColDef<HostelRoomAllocationRow>,
  actions: {
    headerName: "Actions",
    width: 90,
    flex: 0,
    sortable: false,
  } as ColDef<HostelRoomAllocationRow>,
};

function occupantRenderer(
  params: ICellRendererParams<HostelRoomAllocationRow>,
) {
  const row = params.data;
  if (!row) return null;
  const name = row.stdFirstName ?? row.empFirstName ?? row.firstName ?? "—";
  const number = row.rollNumber ?? row.empNumber;
  return (
    <span>
      {name}
      {number ? <span className="ml-1 text-blue-700">- ({number})</span> : null}
    </span>
  );
}

function parentRenderer(params: ICellRendererParams<HostelRoomAllocationRow>) {
  const row = params.data;
  if (!row) return null;
  return (
    <div className="leading-5">
      {row.fatherName ? (
        <div>
          {row.fatherName}
          {row.fatherMobileNo ? ` (${row.fatherMobileNo})` : ""}
        </div>
      ) : null}
      {row.motherName ? <div>{row.motherName}</div> : null}
      {row.guardianName ? <div>{row.guardianName}</div> : null}
      {!row.fatherName && !row.motherName && !row.guardianName ? "—" : null}
    </div>
  );
}

function dueDateFormatter(params: { value: unknown }) {
  if (!params.value) return "—";
  const date = new Date(String(params.value));
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMMM d, yyyy");
}

function paymentStatusRenderer(
  params: ICellRendererParams<HostelRoomAllocationRow>,
) {
  const settled = params.data?.isAmountSetteled === true;
  return <StatusBadge status={settled} label={settled ? "Setteled" : "Due"} />;
}

function allocationStatusRenderer(
  params: ICellRendererParams<HostelRoomAllocationRow>,
) {
  const active = params.data?.isActive === true;
  return <StatusBadge status={active} label={active ? "Active" : "Vacated"} />;
}

function roomLabel(room: HostelRoom) {
  return room.roomTypeDisplayName
    ? `${room.roomNumber ?? room.hstlRoomId} ( ${room.roomTypeDisplayName} )`
    : String(room.roomNumber ?? room.hstlRoomId);
}

function makeActionsRenderer(
  setEditing: (row: HostelRoomAllocationRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (params: ICellRendererParams<HostelRoomAllocationRow>) => (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title="Edit Hostel Room Details"
      aria-label="Edit Hostel Room Details"
      onClick={() => {
        setEditing(params.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-4 w-4" />
    </Button>
  );
}

export default function ViewRoomDetailsPage() {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState(0);
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostels, setHostels] = useState<SelectOption[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [editing, setEditing] = useState<HostelRoomAllocationRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const hostelNum = Number(hostelId ?? 0);
  const roomNum = Number(roomId ?? 0);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    setOrganizationId(orgId);
    setLoadingHostels(true);
    void listHostelsForRegister(orgId)
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
    data: rooms = [],
    isLoading: loadingRooms,
    error: roomsError,
  } = useQuery({
    queryKey: ["Hostel", "view-room-details", "rooms", hostelNum],
    queryFn: () => listActiveHostelRoomsForDetails(hostelNum),
    enabled: hostelNum > 0,
  });

  const {
    data: rows = [],
    isLoading: loadingAllocations,
    error: allocationsError,
  } = useQuery({
    queryKey: ["Hostel", "view-room-details", "allocations", roomNum],
    queryFn: () => listHostelRoomAllocationsByRoom(roomNum),
    enabled: roomNum > 0,
  });

  const roomOptions = useMemo<SelectOption[]>(
    () =>
      rooms.map((room) => ({
        value: String(room.hstlRoomId),
        label: roomLabel(room),
      })),
    [rooms],
  );

  const columnDefs = useMemo<ColDef<HostelRoomAllocationRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.name, cellRenderer: occupantRenderer },
      { ...COL_DEFS.parent, cellRenderer: parentRenderer },
      COL_DEFS.address,
      { ...COL_DEFS.paymentDueDate, valueFormatter: dueDateFormatter },
      {
        ...COL_DEFS.paymentStatus,
        cellRenderer: paymentStatusRenderer,
      },
      { ...COL_DEFS.status, cellRenderer: allocationStatusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  const error = roomsError ?? allocationsError;

  return (
    <FilteredListPage<HostelRoomAllocationRow>
      title="View Room Details"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Hostel *">
            <Select
              value={hostelId}
              onChange={(value) => {
                setHostelId(value);
                setRoomId(null);
              }}
              options={hostels}
              isLoading={loadingHostels}
              clearable={false}
              placeholder="Select hostel"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Hostel Rooms *">
            <Select
              value={roomId}
              onChange={setRoomId}
              options={roomOptions}
              isLoading={loadingRooms}
              disabled={!hostelNum}
              clearable={false}
              placeholder="Select room"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={roomNum > 0 ? rows : []}
      columnDefs={columnDefs}
      loading={loadingAllocations}
      pagination
      paginationPageSize={10}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search room details…",
        columnPicker: false,
        exportExcel: false,
        exportPdf: false,
      }}
    >
      <EditHostelRoomAllocationModal
        open={modalOpen}
        row={editing}
        hostels={hostels}
        organizationId={organizationId}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ["Hostel", "view-room-details", "allocations", roomNum],
          });
        }}
      />
    </FilteredListPage>
  );
}
