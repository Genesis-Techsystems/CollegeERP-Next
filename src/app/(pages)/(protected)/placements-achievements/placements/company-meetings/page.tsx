"use client";

/**
 * Angular parity: placement-company-meetings
 * List: domain/list/CompanyMeeting?query=order(createdDt=desc)&size=99999
 * Columns: No, Title, Date, From/To Time, Type, Employee, College, Status, Actions
 * No print in Angular.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO, isValid } from "date-fns";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listCompanyMeetings } from "@/services";
import type { CompanyMeeting } from "@/types/placements";
import { CompanyMeetingModal } from "./CompanyMeetingModal";

/** Angular list `tConvert` — 24h `HH:mm[:ss]` → `h:mm AM/PM`. */
function tConvert(time: string | null | undefined): string {
  if (!time) return "";
  const matched = String(time).match(/^([01]?\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/);
  if (!matched) return String(time);
  let hour = Number(matched[1]);
  const minute = matched[2];
  const ampm = hour < 12 ? "AM" : "PM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function formatMeetingDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.includes("T") ? parseISO(value) : new Date(value);
  if (!isValid(d)) return String(value);
  return format(d, DATE_FORMATS.DISPLAY);
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<CompanyMeeting>,
  meetingTitle: {
    field: "meetingTitle",
    headerName: "Meeting Title",
    minWidth: 160,
  } as ColDef<CompanyMeeting>,
  meetingOn: {
    field: "meetingOn",
    headerName: "Meeting Date",
    minWidth: 120,
    valueFormatter: (p) =>
      formatMeetingDate(p.value as string | null | undefined),
  } as ColDef<CompanyMeeting>,
  meetingFromTime: {
    field: "meetingFromTime",
    headerName: "From Time",
    minWidth: 100,
    valueFormatter: (p) => tConvert(p.value as string | null | undefined),
  } as ColDef<CompanyMeeting>,
  meetingToTime: {
    field: "meetingToTime",
    headerName: "To Time",
    minWidth: 100,
    valueFormatter: (p) => tConvert(p.value as string | null | undefined),
  } as ColDef<CompanyMeeting>,
  meetingType: {
    headerName: "Meeting Type",
    minWidth: 130,
    valueGetter: (p) =>
      p.data?.meetingTypeCatDisplayName ?? p.data?.meetingTypeCatdetName ?? "",
  } as ColDef<CompanyMeeting>,
  poEmpName: {
    headerName: "Employee Name",
    minWidth: 160,
    valueGetter: (p) => {
      const name = p.data?.poEmpName ?? "";
      const num = p.data?.poEmpNumber;
      return num ? `${name} (${num})` : name;
    },
  } as ColDef<CompanyMeeting>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<CompanyMeeting>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<CompanyMeeting>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<CompanyMeeting>,
};

function statusRenderer(p: ICellRendererParams<CompanyMeeting>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: CompanyMeeting) => void) {
  return (p: ICellRendererParams<CompanyMeeting>) => {
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

export default function CompanyMeetingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<CompanyMeeting | null>(null);

  const { data, isLoading, invalidate } = useCrudList<CompanyMeeting>({
    queryKey: QK.companyMeetings.list(),
    queryFn: listCompanyMeetings,
  });

  const columnDefs = useMemo<ColDef<CompanyMeeting>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.meetingTitle,
      COL_DEFS.meetingOn,
      COL_DEFS.meetingFromTime,
      COL_DEFS.meetingToTime,
      COL_DEFS.meetingType,
      COL_DEFS.poEmpName,
      COL_DEFS.college,
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
    <ListPage
      title="Company Meetings"
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
          + Add Company Meeting
        </Button>
      }
    >
      <CompanyMeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
