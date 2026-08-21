"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { APP_CONFIG } from "@/config/constants/app";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import {
  listAcademicYearsByUniversityForHolidayCalendar,
  listActiveCollegesForHolidayCalendar,
  listHolidayCalendarByCollegeAndAcademicYear,
} from "@/services";
import type { College } from "@/types/college";
import type { HolidayCalendar } from "@/types/holiday-calendar";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";

function formatHolidayDate(raw: string | undefined): string {
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw);
  return format(dt, "MMM d, yyyy");
}

/** Angular holiday calendar: `startDate - endDate` e.g. `Jan 1, 2025 - Jan 1, 2025`. */
function formatEventDateRange(row: HolidayCalendar | undefined): string {
  const startRaw = row?.startDate ?? row?.eventDate;
  const endRaw = row?.endDate ?? startRaw;
  if (!startRaw) return "-";
  const start = formatHolidayDate(startRaw);
  const end = formatHolidayDate(endRaw);
  return end ? `${start} - ${end}` : start;
}

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<HolidayCalendar>,
  eventName: {
    colId: "eventName",
    field: "eventName",
    headerName: "Event Name",
    minWidth: 180,
    flex: 1.3,
  } as ColDef<HolidayCalendar>,
  eventType: {
    colId: "eventTypeName",
    field: "eventTypeName",
    headerName: "Event Type",
    minWidth: 140,
    flex: 1,
  } as ColDef<HolidayCalendar>,
  eventDate: {
    colId: "eventDate",
    headerName: "Event Date",
    minWidth: 220,
    flex: 1.2,
  } as ColDef<HolidayCalendar>,
  eventAudience: {
    colId: "audienceTypeDisplayName",
    headerName: "Event Audience",
    minWidth: 140,
    flex: 1,
  } as ColDef<HolidayCalendar>,
  eventStatus: {
    colId: "eventStatusDisplayName",
    field: "eventStatusDisplayName",
    headerName: "Event Status",
    minWidth: 130,
    flex: 0.9,
  } as ColDef<HolidayCalendar>,
};

export default function HolidaysCalendarPage() {
  const [collegeId, setCollegeId] = useState<number | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(
    undefined,
  );
  const canShowTable = Boolean(collegeId && academicYearId);

  const collegesQuery = useQuery({
    queryKey: ["HolidayCalendar", "colleges"],
    queryFn: listActiveCollegesForHolidayCalendar,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const selectedCollege = useMemo<College | undefined>(
    () => collegesQuery.data?.find((c) => c.collegeId === collegeId),
    [collegesQuery.data, collegeId],
  );

  const academicYearsQuery = useQuery({
    queryKey: [
      "HolidayCalendar",
      "academicYears",
      selectedCollege?.universityId,
    ],
    queryFn: () =>
      listAcademicYearsByUniversityForHolidayCalendar(
        selectedCollege!.universityId,
      ),
    enabled: Boolean(selectedCollege?.universityId),
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const holidaysQuery = useQuery({
    queryKey: QK.holidayCalendar.list(collegeId, academicYearId),
    queryFn: () =>
      listHolidayCalendarByCollegeAndAcademicYear(
        Number(collegeId),
        Number(academicYearId),
      ),
    enabled: canShowTable,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const collegeOptions = useMemo(
    () =>
      (collegesQuery.data ?? []).map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [collegesQuery.data],
  );
  const academicYearOptions = useMemo(
    () =>
      (academicYearsQuery.data ?? []).map((y) => ({
        value: String(y.academicYearId),
        label: y.academicYear,
      })),
    [academicYearsQuery.data],
  );

  const columnDefs = useMemo<ColDef<HolidayCalendar>[]>(
    () => [
      COLS.siNo,
      COLS.eventName,
      COLS.eventType,
      { ...COLS.eventDate, valueGetter: (p) => formatEventDateRange(p.data) },
      {
        ...COLS.eventAudience,
        valueGetter: (p) => {
          const flat = p.data?.audienceTypeDisplayName;
          if (flat) return flat;
          const names = (p.data?.eventAudiences ?? [])
            .map((item) => item.audienceTypeDisplayName)
            .filter(Boolean);
          return names.length ? names.join(", ") : "-";
        },
      },
      COLS.eventStatus,
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Holidays Calendar"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField
            label="College *"
            className="global-filter-field--shrink w-full max-w-[min(100%,12rem)] sm:w-[12rem]"
          >
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : undefined);
                setAcademicYearId(undefined);
              }}
              options={collegeOptions}
              placeholder="Select college"
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Academic Year *"
            className="global-filter-field--shrink w-full max-w-[min(100%,13rem)] sm:w-[13rem]"
          >
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(value) =>
                setAcademicYearId(value ? Number(value) : undefined)
              }
              options={academicYearOptions}
              placeholder="Select academic year"
              disabled={!collegeId}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      showTable={canShowTable}
      resultsVisible={canShowTable}
      rowData={canShowTable ? (holidaysQuery.data ?? []) : []}
      columnDefs={canShowTable ? columnDefs : undefined}
      loading={holidaysQuery.isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Holidays Calendar",
      }}
    />
  );
}
