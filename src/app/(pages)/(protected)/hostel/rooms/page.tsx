"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { FILTER_CARD_SELECT_CLASS } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listHostelRoomsByHostel } from "@/services";
import type { HostelRoom } from "@/types/hostel";
import { useHostelSelect } from "../_lib/use-hostel-select";
import { RoomModal } from "./RoomModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<HostelRoom>,
  floorName: {
    field: "floorName",
    headerName: "Floor",
    minWidth: 90,
  } as ColDef<HostelRoom>,
  floorNo: {
    field: "floorNo",
    headerName: "Floor No",
    width: 90,
    flex: 0,
  } as ColDef<HostelRoom>,
  roomNumber: {
    field: "roomNumber",
    headerName: "Room",
    minWidth: 90,
  } as ColDef<HostelRoom>,
  roomTypeCode: {
    field: "roomTypeCode",
    headerName: "Type",
    minWidth: 90,
  } as ColDef<HostelRoom>,
  noOfBeds: {
    field: "noOfBeds",
    headerName: "Beds",
    width: 80,
    flex: 0,
  } as ColDef<HostelRoom>,
  allotedBeds: {
    field: "allotedBeds",
    headerName: "Allotted",
    width: 90,
    flex: 0,
  } as ColDef<HostelRoom>,
  availableBeds: {
    field: "availableBeds",
    headerName: "Available",
    width: 100,
    flex: 0,
  } as ColDef<HostelRoom>,
  amount: {
    field: "amount",
    headerName: "Amount",
    minWidth: 90,
  } as ColDef<HostelRoom>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<HostelRoom>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<HostelRoom>,
};

function statusRenderer(p: ICellRendererParams<HostelRoom>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

export default function RoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialHostel = searchParams.get("hostelId");
  const [hostelId, setHostelId] = useState<string | null>(initialHostel);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HostelRoom | null>(null);
  const { hostels, loadingHostels } = useHostelSelect();

  const hostelNum = Number(hostelId ?? 0);
  const organizationId = Number(searchParams.get("organizationId") ?? 0);
  const hostelName = searchParams.get("hostelName") ?? "";
  const hostelTypeName = searchParams.get("hostelTypeName") ?? "";
  const hostelForName = searchParams.get("hstlForCatdetDisplayName") ?? "";
  const phoneNumber = searchParams.get("phoneNumber") ?? "";

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QK.hostel.rooms(hostelNum),
    queryFn: () => listHostelRoomsByHostel(hostelNum),
    enabled: hostelNum > 0,
  });

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/hostel/hostel-details");
  }

  const columnDefs = useMemo<ColDef<HostelRoom>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.floorName,
      COL_DEFS.floorNo,
      COL_DEFS.roomNumber,
      COL_DEFS.roomTypeCode,
      COL_DEFS.noOfBeds,
      COL_DEFS.allotedBeds,
      COL_DEFS.availableBeds,
      COL_DEFS.amount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<HostelRoom>) => (
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
        ),
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Hostel Rooms"
      filters={
        <div className="w-full max-w-sm">
          <Select
            label="Hostel"
            className={FILTER_CARD_SELECT_CLASS}
            value={hostelId}
            onChange={setHostelId}
            options={hostels}
            placeholder="Select hostel"
            searchable
            isLoading={loadingHostels}
          />
        </div>
      }
      filtersFooter={
        <div className="rounded-sm border px-4 py-3">
          <div className="grid gap-2 text-sm md:grid-cols-[1.4fr_1fr_1fr]">
            <p>
              <span className="text-muted-foreground">Hostel : </span>
              <span>
                {hostelName || "—"}
                {hostelTypeName ? ` (${hostelTypeName})` : ""}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Hostel For : </span>
              <span>{hostelForName || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Phone Number : </span>
              <span>{phoneNumber || "—"}</span>
            </p>
          </div>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search rooms…",
        exportPdf: true,
        pdfDocumentTitle: "Rooms",
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          disabled={!hostelNum}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Add Room
        </Button>
      }
    >
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-[34px] min-w-20 px-5"
          variant="outline"
          onClick={goBack}
        >
          Back
        </Button>
      </div>
      {hostelNum > 0 && (
        <RoomModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          row={editing}
          hostelId={hostelNum}
          organizationId={organizationId}
          onSaved={() => void refetch()}
        />
      )}
    </FilteredListPage>
  );
}
