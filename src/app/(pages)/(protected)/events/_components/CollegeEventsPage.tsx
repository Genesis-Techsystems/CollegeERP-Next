"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2 } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ConfirmDialog, FilterCard } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { DataTable, TableCard } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteCollegeEvent,
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listCollegeCalendarMonthEvents,
  listEventsByCollegeAndYear,
  listGeneralDetailsByMaster,
  listStaffAudienceEvents,
  listStudentAudienceEvents,
  saveCollegeEvents,
  type CollegeEventRow,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";
import type { College } from "@/types/college";
import { EventModal } from "./EventModal";
import { EventsCalendarPanel } from "./EventsCalendarPanel";
import { EventsMonthCalendar } from "./EventsMonthCalendar";

export type CollegeEventsVariant =
  | "manage"
  | "calendar-view"
  | "staff"
  | "student"
  | "school";

type CollegeEventsPageProps = {
  title: string;
  variant: CollegeEventsVariant;
};

function readStorageNum(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  return Number(globalThis.localStorage.getItem(key) || 0) || 0;
}

function formatDisplayDate(raw: string | undefined): string {
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return format(dt, "dd MMM yyyy");
}

/** Angular college-calendar: `startDate | date:'MMMM d, y' - endDate | date:'MMMM d, y'`. */
function formatEventDateRange(row: CollegeEventRow | undefined): string {
  const startRaw = row?.startDate ?? row?.eventDate;
  const endRaw = row?.endDate ?? startRaw;
  if (!startRaw) return "";
  const start = new Date(String(startRaw));
  const end = endRaw ? new Date(String(endRaw)) : start;
  if (Number.isNaN(start.getTime())) return String(startRaw);
  const startLabel = format(start, "MMMM d, yyyy");
  if (Number.isNaN(end.getTime())) return `${startLabel} - `;
  const endLabel = format(end, "MMMM d, yyyy");
  return `${startLabel} - ${endLabel}`;
}

function formatWeekday(raw: string | undefined): string {
  if (!raw) return "";
  const dt = new Date(String(raw));
  if (Number.isNaN(dt.getTime())) return "";
  return format(dt, "EEEE");
}

function audiencesRenderer(p: ICellRendererParams<CollegeEventRow>) {
  const list = p.data?.eventAudiences ?? [];
  if (list.length === 0) {
    return p.data?.audienceTypeDisplayName ?? p.data?.audienceTypeCode ?? "";
  }
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {list.map((item, index) => (
        <span key={String(item.eventAudienceId ?? index)}>
          {(item as { audienceTypeCode?: string }).audienceTypeCode ??
            item.audienceTypeName ??
            ""}
        </span>
      ))}
    </div>
  );
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<CollegeEventRow>,
  name: {
    field: "eventName",
    headerName: "Event Name",
    minWidth: 160,
  } as ColDef<CollegeEventRow>,
  startDate: {
    headerName: "Start Date",
    minWidth: 120,
  } as ColDef<CollegeEventRow>,
  type: {
    field: "eventTypeName",
    headerName: "Event Type",
    minWidth: 120,
  } as ColDef<CollegeEventRow>,
  audience: {
    field: "audienceTypeDisplayName",
    headerName: "Audience",
    minWidth: 120,
  } as ColDef<CollegeEventRow>,
  holiday: {
    field: "isHoliday",
    headerName: "Holiday",
    minWidth: 90,
    flex: 0,
  } as ColDef<CollegeEventRow>,
  status: {
    field: "eventStatusDisplayName",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<CollegeEventRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    width: 100,
    flex: 0,
  } as ColDef<CollegeEventRow>,
};

function holidayRenderer(p: ICellRendererParams<CollegeEventRow>) {
  return (
    <StatusBadge
      status={p.data?.isHoliday === true}
      label={p.data?.isHoliday ? "Yes" : "No"}
    />
  );
}

export function CollegeEventsPage({
  title,
  variant,
}: Readonly<CollegeEventsPageProps>) {
  const isManage = variant === "manage";
  const isStaff = variant === "staff";
  const isStudent = variant === "student";
  const isCalendarView = variant === "calendar-view";
  const useMonthCalendar = isManage || isCalendarView || isStaff || isStudent;
  const useStorageFilters = isStaff || isStudent || variant === "school";

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(
    useStorageFilters ? readStorageNum("collegeId") || null : null,
  );
  const [academicYears, setAcademicYears] = useState<
    { academicYearId?: number; academicYear?: string }[]
  >([]);
  const [academicYearId, setAcademicYearId] = useState<number | null>(
    useStorageFilters ? readStorageNum("academicYearId") || null : null,
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [rows, setRows] = useState<CollegeEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeEventRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollegeEventRow | null>(
    null,
  );
  const [staffAudienceId, setStaffAudienceId] = useState<number | null>(null);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "list">(
    "month",
  );
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>(
    undefined,
  );

  const universityId = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId)?.universityId,
    [colleges, collegeId],
  );

  useEffect(() => {
    if (!useStorageFilters) {
      void listActiveCollegesForDepartments()
        .then(setColleges)
        .catch(() => setColleges([]));
    } else if (collegeId) {
      void listActiveCollegesForDepartments()
        .then((list) =>
          setColleges(list.filter((c) => c.collegeId === collegeId)),
        )
        .catch(() => setColleges([]));
    }
  }, [useStorageFilters, collegeId]);

  useEffect(() => {
    if (
      !isCalendarView ||
      useStorageFilters ||
      collegeId != null ||
      colleges.length === 0
    )
      return;
    void onCollegeChange(Number(colleges[0]!.collegeId));
  }, [isCalendarView, useStorageFilters, collegeId, colleges]);

  useEffect(() => {
    if (isStaff) {
      void listGeneralDetailsByMaster(GM_CODES.AUDIENCE).then((list) => {
        const emp = list.find(
          (a) =>
            String((a as { generalDetailCode?: string }).generalDetailCode) ===
            "EMP",
        );
        if (emp)
          setStaffAudienceId(
            Number((emp as { generalDetailId?: number }).generalDetailId),
          );
      });
    }
    if (isStudent) {
      void listGeneralDetailsByMaster(GM_CODES.AUDIENCE).then((list) => {
        const std = list.find(
          (a) =>
            String((a as { generalDetailCode?: string }).generalDetailCode) ===
            "STD",
        );
        if (std)
          setStaffAudienceId(
            Number((std as { generalDetailId?: number }).generalDetailId),
          );
      });
    }
  }, [isStaff, isStudent]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? String(c.collegeId),
      })),
    [colleges],
  );

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  );

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid);
    setAcademicYearId(null);
    setAcademicYears([]);
    setRows([]);
    setCalendarLoaded(false);
    if (isCalendarView) {
      setCalendarViewMode("month");
    }
    if (!cid) return;
    try {
      const ay = await listAcademicYearsForCollege(cid);
      setAcademicYears(ay);
      if (ay.length > 0 && variant === "calendar-view") {
        setAcademicYearId(Number(ay[0]!.academicYearId));
      }
    } catch {
      setAcademicYears([]);
    }
  }

  const loadEvents = useCallback(
    async (modeOverride?: "month" | "list") => {
      if (!collegeId || !academicYearId) return;
      setLoading(true);
      setRows([]);
      // Angular sets `flag = true` before the request so the calendar/list shell shows.
      setCalendarLoaded(true);
      try {
        let data: CollegeEventRow[] = [];
        const apiDate = useMonthCalendar ? viewMonth : selectedDate;
        const calendarMode = modeOverride ?? calendarViewMode;
        if (isCalendarView) {
          data =
            calendarMode === "list"
              ? await listEventsByCollegeAndYear(collegeId, academicYearId)
              : await listCollegeCalendarMonthEvents({
                  collegeId,
                  academicYearId,
                  date: viewMonth,
                });
        } else if (isStaff && staffAudienceId) {
          data = await listStaffAudienceEvents({
            collegeId,
            academicYearId,
            departmentId: readStorageNum("empDeptId"),
            audienceTypeId: staffAudienceId,
            date: apiDate,
          });
        } else if (isStudent && staffAudienceId) {
          data = await listStudentAudienceEvents({
            collegeId,
            academicYearId,
            groupSectionId: readStorageNum("groupSectionId"),
            audienceTypeId: staffAudienceId,
            date: apiDate,
          });
        } else {
          data = await listCollegeCalendarMonthEvents({
            collegeId,
            academicYearId,
            date: apiDate,
          });
        }
        setRows(data);
      } catch (e) {
        toastError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [
      collegeId,
      academicYearId,
      selectedDate,
      viewMonth,
      variant,
      isStaff,
      isStudent,
      isCalendarView,
      calendarViewMode,
      staffAudienceId,
      useMonthCalendar,
    ],
  );

  useEffect(() => {
    if (collegeId && academicYearId && useStorageFilters) {
      void loadEvents();
    }
  }, [collegeId, academicYearId, useStorageFilters, loadEvents]);

  useEffect(() => {
    if (!calendarLoaded || !collegeId || !academicYearId || !useMonthCalendar)
      return;
    if (isCalendarView && calendarViewMode === "list") return;
    void loadEvents();
    // Reload only when the visible month changes after the calendar is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth]);

  function onCalendarViewModeChange(mode: "month" | "list") {
    setCalendarViewMode(mode);
    if (calendarLoaded && collegeId && academicYearId) {
      void loadEvents(mode);
    }
  }

  function makeActionsRenderer() {
    return (p: ICellRendererParams<CollegeEventRow>) =>
      isManage ? (
        <div className="flex gap-1">
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
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => setDeleteTarget(p.data ?? null)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null;
  }

  const columnDefs = useMemo<ColDef<CollegeEventRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      {
        ...COL_DEFS.startDate,
        valueGetter: (p) =>
          formatDisplayDate(
            String(
              p.data?.startDate ??
                (p.data as { eventDate?: string } | undefined)?.eventDate ??
                "",
            ),
          ),
      },
      COL_DEFS.type,
      COL_DEFS.audience,
      { ...COL_DEFS.holiday, cellRenderer: holidayRenderer },
      COL_DEFS.status,
      ...(isManage
        ? [{ ...COL_DEFS.actions, cellRenderer: makeActionsRenderer() }]
        : []),
    ],
    [isManage],
  );

  /** Angular `displayedColumns`: id, eventName, startDate, weekday, audienceTypeCode, isHoliday */
  const calendarListColumnDefs = useMemo<ColDef<CollegeEventRow>[]>(
    () => [
      {
        headerName: "No.",
        colId: "id",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        sortable: true,
      },
      {
        field: "eventName",
        headerName: "Event Name",
        colId: "eventName",
        minWidth: 180,
        flex: 1.2,
        sortable: true,
      },
      {
        headerName: "Event Date",
        colId: "startDate",
        minWidth: 260,
        flex: 1.4,
        sortable: true,
        valueGetter: (p) => formatEventDateRange(p.data),
      },
      {
        headerName: "Week Day",
        colId: "weekday",
        minWidth: 130,
        flex: 0.8,
        sortable: true,
        valueGetter: (p) =>
          formatWeekday(String(p.data?.startDate ?? p.data?.eventDate ?? "")),
      },
      {
        headerName: "Event Audiences",
        colId: "audienceTypeCode",
        minWidth: 160,
        flex: 1,
        autoHeight: true,
        wrapText: true,
        sortable: true,
        cellRenderer: audiencesRenderer,
      },
      {
        field: "isHoliday",
        headerName: "Holiday Status",
        colId: "isHoliday",
        minWidth: 140,
        width: 140,
        flex: 0,
        sortable: true,
        cellRenderer: holidayRenderer,
      },
    ],
    [],
  );

  async function handleSaveEvent(payload: CollegeEventRow) {
    try {
      await saveCollegeEvents([payload]);
      toastSuccess(editing ? "Event updated" : "Event created");
      setModalOpen(false);
      setEditing(null);
      await loadEvents();
    } catch (e) {
      toastError(getErrorMessage(e));
      throw e;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.eventId) return;
    try {
      await deleteCollegeEvent(deleteTarget.eventId);
      toastSuccess("Event deleted");
      setDeleteTarget(null);
      await loadEvents();
    } catch (e) {
      toastError(getErrorMessage(e));
    }
  }

  const showFilters = !useStorageFilters || isStaff || isStudent;

  const filterFields = (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      {!useStorageFilters ? (
        <>
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
            options={collegeOptions}
            searchable
            className="md:col-span-3"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              setAcademicYearId(v ? Number(v) : null);
              setRows([]);
              setCalendarLoaded(false);
            }}
            options={academicYearOptions}
            searchable
            disabled={!collegeId}
            className="md:col-span-3"
          />
        </>
      ) : null}
      {!useMonthCalendar ? (
        <DatePicker
          label="Date"
          value={selectedDate}
          onChange={(d) => setSelectedDate(d ?? new Date())}
          clearable={false}
          className="md:col-span-2"
        />
      ) : null}
      <div className="md:col-span-2">
        <Button
          type="button"
          onClick={() => void loadEvents()}
          disabled={loading || !collegeId || !academicYearId}
        >
          {loading ? "Loading…" : "Get Events"}
        </Button>
      </div>
    </div>
  );

  const eventModals = (
    <>
      {isManage && collegeId && academicYearId ? (
        <EventModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setModalDefaultDate(undefined);
          }}
          row={editing}
          collegeId={collegeId}
          academicYearId={academicYearId}
          universityId={universityId}
          defaultStartDate={modalDefaultDate}
          onSubmit={handleSaveEvent}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete event"
        description={`Delete "${deleteTarget?.eventName ?? "this event"}"?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </>
  );

  if (isManage || isCalendarView) {
    const pageFilters = isCalendarView ? (
      <div className="space-y-3">
        {filterFields}
        {calendarLoaded ? (
          <RadioGroup
            value={calendarViewMode}
            onValueChange={(v) =>
              onCalendarViewModeChange(v as "month" | "list")
            }
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="month" id="college-calendar-month" />
              <Label htmlFor="college-calendar-month">Month Wise View</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="list" id="college-calendar-list" />
              <Label htmlFor="college-calendar-list">All Events List</Label>
            </div>
          </RadioGroup>
        ) : null}
      </div>
    ) : (
      filterFields
    );

    return (
      <FilteredListPage
        title={title}
        filters={pageFilters}
        body={
          calendarLoaded ? (
            isCalendarView && calendarViewMode === "list" ? (
              <DataTable
                rowData={rows}
                columnDefs={calendarListColumnDefs}
                loading={loading}
                pagination
                paginationPageSize={10}
                bordered={false}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search",
                  pdfDocumentTitle: title,
                }}
              />
            ) : (
              <EventsCalendarPanel
                viewMonth={viewMonth}
                onViewMonthChange={setViewMonth}
                events={rows}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                readOnly={!isManage}
                onAddEvent={
                  isManage
                    ? () => {
                        setEditing(null);
                        setModalDefaultDate(selectedDate);
                        setModalOpen(true);
                      }
                    : undefined
                }
                onEventClick={
                  isManage
                    ? (ev) => {
                        setEditing(ev);
                        setModalDefaultDate(undefined);
                        setModalOpen(true);
                      }
                    : undefined
                }
              />
            )
          ) : null
        }
        bodyClassName="!px-0 !py-0 border-t-0"
      >
        {eventModals}
      </FilteredListPage>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          {title}
        </h1>
      </div>

      {showFilters ? (
        <FilterCard title="Filter" bodyClassName="space-y-4">
          {filterFields}
        </FilterCard>
      ) : null}

      {useMonthCalendar && calendarLoaded ? (
        <EventsMonthCalendar
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          events={rows}
          selectedDate={selectedDate}
          readOnly
          onSelectDate={(day) => setSelectedDate(day)}
          onEventClick={undefined}
        />
      ) : null}

      {!useMonthCalendar && (rows.length > 0 || loading) ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: "Search events…",
              pdfDocumentTitle: title,
            }}
          />
        </TableCard>
      ) : null}

      {eventModals}
    </PageContainer>
  );
}
