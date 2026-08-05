"use client";

/**
 * Angular `NotificationsAndAnnouncementsComponent`
 * Route: `#/notifications-&-announcements/notifications-list`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, Plus } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { GlobalFilterField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { EVENTS_API, MINIO_URL } from "@/config/constants/api";
import { useSessionContext } from "@/context/SessionContext";
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  buildQuery,
  domainList,
  getStudentInfoCollegeFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;

/** Admin list row from domain `Notification` (Angular resultList). */
type NotificationListRow = {
  notificationId?: number;
  notificationTitle?: string;
  notificationEnddate?: string;
  academicYear?: string;
  collegeCode?: string;
  notificationDocPath?: string | null;
  notificationDoc?: string | null;
  isAnnouncement?: boolean;
  isActive?: boolean;
};

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function text(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Angular `findUrl` — linkify http(s)/www URLs in titles. */
function findUrl(data: string): string {
  const urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
  return data.replace(urlRegex, (url, _b, c) => {
    const href = c === "www." ? `http://${url}` : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`;
  });
}

function docHref(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path) return "#";
  return `${MINIO_URL}${path}`;
}

function formatEndDate(raw: unknown): string {
  if (raw == null || raw === "") return "—";
  const dt = new Date(String(raw));
  if (Number.isNaN(dt.getTime())) return String(raw);
  // Angular: notificationEnddate | date:'MMMM d, y'
  return format(dt, "MMMM d, yyyy");
}

function distinctById<T extends AnyRow>(
  rows: T[],
  idKey: string,
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const row of rows) {
    const id = num(row[idKey]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function titleRenderer(p: ICellRendererParams<NotificationListRow>) {
  const html = String(p.data?.notificationTitle ?? "");
  return (
    <div
      className="not_con whitespace-normal [&_a]:text-blue-600 [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function endDateRenderer(p: ICellRendererParams<NotificationListRow>) {
  return formatEndDate(p.data?.notificationEnddate);
}

function documentRenderer(p: ICellRendererParams<NotificationListRow>) {
  const path = p.data?.notificationDocPath ?? p.data?.notificationDoc;
  if (path) {
    return (
      <a
        href={docHref(String(path))}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        Document
      </a>
    );
  }
  return <span>No Docs Uploaded</span>;
}

function announcementRenderer(p: ICellRendererParams<NotificationListRow>) {
  if (p.data?.isAnnouncement === true) {
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-800">
        Announcement
      </span>
    );
  }
  return (
    <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
      Notification
    </span>
  );
}

function statusRenderer(p: ICellRendererParams<NotificationListRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<NotificationListRow>,
  notificationTitle: {
    field: "notificationTitle",
    headerName: "Notification Name",
    minWidth: 220,
    flex: 1,
  } as ColDef<NotificationListRow>,
  notificationEnddate: {
    field: "notificationEnddate",
    headerName: "End Date",
    minWidth: 140,
  } as ColDef<NotificationListRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<NotificationListRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<NotificationListRow>,
  file: {
    headerName: "Document",
    minWidth: 130,
    sortable: false,
  } as ColDef<NotificationListRow>,
  isAnnouncement: {
    field: "isAnnouncement",
    headerName: "Announcement",
    minWidth: 130,
  } as ColDef<NotificationListRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<NotificationListRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
    sortable: false,
  } as ColDef<NotificationListRow>,
};

function makeActionsRenderer(onEdit: (row: NotificationListRow) => void) {
  return (p: ICellRendererParams<NotificationListRow>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        if (p.data) onEdit(p.data);
      }}
      aria-label="Edit"
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export function NotificationsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const organizationId = positiveId(
    readStorage("organizationId"),
    user?.organizationId,
  );
  const employeeId = positiveId(readStorage("employeeId"), user?.employeeId);

  const paramCollegeId = positiveId(searchParams.get("collegeId"));
  const paramAcademicYearId = positiveId(searchParams.get("academicYearId"));

  const [filtersLoading, setFiltersLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [rows, setRows] = useState<NotificationListRow[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const collegeOptions = useMemo<SelectOption[]>(() => {
    const distinct = distinctById(filtersData, "fk_college_id").sort(
      (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
    );
    return distinct.map((c) => ({
      value: String(num(c.fk_college_id)),
      label: text(c.college_code) || String(num(c.fk_college_id)),
    }));
  }, [filtersData]);

  const academicYearOptions = useMemo<SelectOption[]>(() => {
    if (!collegeId) return [];
    const universityId = num(
      filtersData.find((x) => num(x.fk_college_id) === collegeId)
        ?.fk_university_id,
    );
    const years = academicYearData.filter(
      (x) => num(x.fk_university_id) === universityId,
    );
    return distinctById(years, "fk_academic_year_id").map((y) => ({
      value: String(num(y.fk_academic_year_id)),
      label:
        text(y.academic_year) ||
        text(y.academicYear) ||
        String(num(y.fk_academic_year_id)),
    }));
  }, [filtersData, academicYearData, collegeId]);

  const loadNotifications = useCallback(
    async (nextCollegeId: number, nextAcademicYearId: number) => {
      if (!nextCollegeId || !nextAcademicYearId) {
        setRows([]);
        setHasFetched(false);
        return;
      }
      setListLoading(true);
      try {
        // Angular: listDetailsByTwoIdsWithSort(
        //   Notification, collegeId, academicYearId, DESC,
        //   College.collegeId, AcademicYear.academicYearId, notificationId)
        const list = await domainList<NotificationListRow>(
          EVENTS_API.NOTIFICATION,
          buildQuery(
            {
              "College.collegeId": nextCollegeId,
              "AcademicYear.academicYearId": nextAcademicYearId,
            },
            { field: "notificationId", direction: "DESC" },
          ),
        );
        const mapped = (Array.isArray(list) ? list : []).map((row) => ({
          ...row,
          notificationTitle: findUrl(String(row.notificationTitle ?? "")),
        }));
        // Angular sortDataAss — by notificationEnddate DESC
        mapped.sort(
          (a, b) =>
            new Date(String(b.notificationEnddate ?? 0)).getTime() -
            new Date(String(a.notificationEnddate ?? 0)).getTime(),
        );
        setRows(mapped);
        setHasFetched(true);
      } catch (e) {
        setRows([]);
        setHasFetched(true);
        toastError(getErrorMessage(e));
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  // Angular getfilterDetails — clg_filters + clg_filters_ay
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setFiltersLoading(true);
      try {
        const result = await getStudentInfoCollegeFilters(
          organizationId,
          employeeId,
        );
        if (cancelled) return;
        const filters = Array.isArray(result.filtersData)
          ? result.filtersData
          : [];
        const years = Array.isArray(result.academicData)
          ? result.academicData
          : [];
        setFiltersData(filters);
        setAcademicYearData(years);

        const colleges = distinctById(filters, "fk_college_id").sort(
          (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
        );
        if (colleges.length === 0) return;

        let nextCollegeId = 0;
        if (
          paramCollegeId > 0 &&
          colleges.some((c) => num(c.fk_college_id) === paramCollegeId)
        ) {
          nextCollegeId = paramCollegeId;
        } else {
          nextCollegeId = num(colleges[0]?.fk_college_id);
        }
        setCollegeId(nextCollegeId || null);

        const universityId = num(
          filters.find((x) => num(x.fk_college_id) === nextCollegeId)
            ?.fk_university_id,
        );
        const ayOptions = distinctById(
          years.filter((x) => num(x.fk_university_id) === universityId),
          "fk_academic_year_id",
        );
        if (
          paramAcademicYearId > 0 &&
          ayOptions.some(
            (y) => num(y.fk_academic_year_id) === paramAcademicYearId,
          )
        ) {
          setAcademicYearId(paramAcademicYearId);
          void loadNotifications(nextCollegeId, paramAcademicYearId);
        } else {
          setAcademicYearId(null);
          setRows([]);
          setHasFetched(false);
        }
      } catch (e) {
        if (!cancelled) toastError(getErrorMessage(e));
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    organizationId,
    employeeId,
    paramCollegeId,
    paramAcademicYearId,
    loadNotifications,
  ]);

  function onCollegeChange(next: number | null) {
    setCollegeId(next);
    setAcademicYearId(null);
    setRows([]);
    setHasFetched(false);
  }

  function onAcademicYearChange(next: number | null) {
    setAcademicYearId(next);
    if (collegeId && next) {
      void loadNotifications(collegeId, next);
    } else {
      setRows([]);
      setHasFetched(false);
    }
  }

  const goAdd = useCallback(
    (notificationId?: number) => {
      const qs = new URLSearchParams();
      if (collegeId) qs.set("collegeId", String(collegeId));
      if (academicYearId) qs.set("academicYearId", String(academicYearId));
      if (notificationId) qs.set("notificationId", String(notificationId));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      router.push(`/notifications-and-announcements/add-notification${suffix}`);
    },
    [router, collegeId, academicYearId],
  );

  const columnDefs = useMemo<ColDef<NotificationListRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.notificationTitle, cellRenderer: titleRenderer },
      { ...COL_DEFS.notificationEnddate, cellRenderer: endDateRenderer },
      COL_DEFS.academicYear,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.file, cellRenderer: documentRenderer },
      { ...COL_DEFS.isAnnouncement, cellRenderer: announcementRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) =>
          goAdd(Number(row.notificationId ?? 0) || undefined),
        ),
      },
    ],
    [goAdd],
  );

  return (
    <FilteredListPage
      title="Notifications & Announcements"
      filters={
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <GlobalFilterField label="College *">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => onCollegeChange(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
              searchable
              isLoading={filtersLoading}
              disabled={filtersLoading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year *">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onAcademicYearChange(v ? Number(v) : null)}
              options={academicYearOptions}
              placeholder="Academic Year"
              searchable
              disabled={!collegeId || filtersLoading}
            />
          </GlobalFilterField>
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={listLoading}
      resultsVisible={hasFetched && academicYearId != null}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Notifications & Announcements",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => goAdd()}
          disabled={!collegeId || !academicYearId}
          className="h-[30px] px-3 text-[12px]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Notification
        </Button>
      }
    />
  );
}
