"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, UserRound } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useCrudList } from "@/hooks/useCrudList";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listDepartmentEvents,
  uploadDepartmentEventFiles,
  type DepartmentEventAudienceRow,
  type DepartmentEventPhotoRow,
  type DepartmentEventResourceRow,
  type DepartmentEventRow,
} from "@/services";
import type { College } from "@/types/college";
import { DepartmentEventModal } from "./DepartmentEventModal";

/** Angular uses `departmentEventPhotoDTOS`; Spring may also return `…DTOs`. */
function getEventPhotos(
  row: DepartmentEventRow | undefined,
): DepartmentEventPhotoRow[] {
  if (!row) return [];
  const r = row as DepartmentEventRow & {
    departmentEventPhotoDTOs?: DepartmentEventPhotoRow[];
  };
  const list = r.departmentEventPhotoDTOS ?? r.departmentEventPhotoDTOs ?? [];
  return Array.isArray(list) ? list : [];
}

/** Angular `departmentEventAudienceDTOs` — also accept `…DTOS`. */
function getEventAudiences(
  row: DepartmentEventRow | undefined,
): DepartmentEventAudienceRow[] {
  if (!row) return [];
  const r = row as DepartmentEventRow & {
    departmentEventAudienceDTOS?: DepartmentEventAudienceRow[];
  };
  const list =
    r.departmentEventAudienceDTOs ?? r.departmentEventAudienceDTOS ?? [];
  return Array.isArray(list) ? list : [];
}

/** Angular `departmentEventResourceDTOS` — also accept `…DTOs`. */
function getEventResources(
  row: DepartmentEventRow | undefined,
): DepartmentEventResourceRow[] {
  if (!row) return [];
  const r = row as DepartmentEventRow & {
    departmentEventResourceDTOs?: DepartmentEventResourceRow[];
  };
  const list =
    r.departmentEventResourceDTOS ?? r.departmentEventResourceDTOs ?? [];
  return Array.isArray(list) ? list : [];
}

function isCoordinatorFlag(aud: DepartmentEventAudienceRow): boolean {
  const v = aud.isCoordinator as unknown;
  return v === true || v === 1 || v === "1" || v === "true";
}

function formatDisplayDate(raw: string | undefined): string {
  if (!raw) return "";
  const dt = new Date(String(raw));
  if (Number.isNaN(dt.getTime())) return String(raw);
  return format(dt, "dd MMM, yyyy");
}

function formatEventDateRange(row: DepartmentEventRow | undefined): string {
  if (!row) return "";
  const start = formatDisplayDate(row.startDate);
  const end = formatDisplayDate(row.endDate);
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function audienceLabel(aud: DepartmentEventAudienceRow): string {
  // Angular: prefer employeeDetailNumber branch, else student roll/name.
  if (aud.employeeDetailNumber) {
    return `(${aud.employeeDetailNumber}) ${aud.employeeDetailName ?? ""}`.trim();
  }
  if (aud.employeeDetailName) {
    return String(aud.employeeDetailName);
  }
  if (aud.studentDetailRollNumber) {
    return `(${aud.studentDetailRollNumber}) ${aud.studentDetailName ?? ""}`.trim();
  }
  return String(aud.studentDetailName ?? "").trim();
}

function coordinatorsText(row: DepartmentEventRow | undefined): string {
  return getEventAudiences(row)
    .filter(isCoordinatorFlag)
    .map(audienceLabel)
    .filter(Boolean)
    .join("; ");
}

function participantsText(row: DepartmentEventRow | undefined): string {
  return getEventAudiences(row)
    .filter((a) => !isCoordinatorFlag(a))
    .map(audienceLabel)
    .filter(Boolean)
    .join("; ");
}

function resourcesText(row: DepartmentEventRow | undefined): string {
  return getEventResources(row)
    .map((r) => r.name)
    .filter(Boolean)
    .join("; ");
}

function photosText(row: DepartmentEventRow | undefined): string {
  return getEventPhotos(row)
    .map((p, i) => (p.photoUrl ? `Photo ${i + 1}` : ""))
    .filter(Boolean)
    .join("; ");
}

function certificatesText(row: DepartmentEventRow | undefined): string {
  const parts: string[] = [];
  if (row?.certificate1) parts.push("Certificate1");
  if (row?.certificate2) parts.push("Certificate2");
  return parts.join("; ");
}

function FileLink({
  href,
  label,
}: Readonly<{ href?: string | null; label: string }>) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[12px] font-medium text-blue-600 hover:underline dark:text-blue-400"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}

type AudienceMenuItem = {
  key: string;
  /** Blue code inside parentheses — Angular emp number / roll number. */
  code?: string;
  name: string;
  href?: string;
};

/**
 * Angular mat-menu pattern: always show identity icon + blue "View",
 * menu lists people/resources (empty menu is fine).
 */
function AudienceViewCell({
  items,
}: Readonly<{
  items: AudienceMenuItem[];
}>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          <UserRound className="h-3.5 w-3.5" />
          View
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {items.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            No records
          </p>
        ) : (
          <ul className="max-h-56 space-y-0.5 overflow-y-auto text-[12px]">
            {items.map((item) => (
              <li
                key={item.key}
                className="rounded px-2 py-1.5 hover:bg-muted/50"
              >
                <span>
                  {item.code ? (
                    <>
                      (
                      <span className="cursor-pointer text-blue-600 dark:text-blue-400">
                        {item.code}
                      </span>
                      ) {item.name}
                    </>
                  ) : (
                    item.name
                  )}
                </span>
                {item.href ? (
                  <>
                    {" "}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function makeFileLinkRenderer(field: keyof DepartmentEventRow, label: string) {
  return (p: ICellRendererParams<DepartmentEventRow>) => {
    const href = p.data?.[field];
    return typeof href === "string" && href ? (
      <FileLink href={href} label={label} />
    ) : null;
  };
}

/** Angular: `(empNumber) name` or `(roll) name` — number in blue. */
function toAudienceMenuItem(
  aud: DepartmentEventAudienceRow,
  index: number,
): AudienceMenuItem {
  const key = String(
    aud.departmentEventAudienceId ?? aud.deptEventAudienceId ?? index,
  );
  if (aud.employeeDetailNumber) {
    return {
      key,
      code: String(aud.employeeDetailNumber),
      name: String(aud.employeeDetailName ?? ""),
    };
  }
  if (aud.employeeDetailName) {
    return { key, name: String(aud.employeeDetailName) };
  }
  if (aud.studentDetailRollNumber) {
    return {
      key,
      code: String(aud.studentDetailRollNumber),
      name: String(aud.studentDetailName ?? ""),
    };
  }
  return { key, name: String(aud.studentDetailName ?? "") };
}

function coordinatorsRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = getEventAudiences(p.data)
    .filter(isCoordinatorFlag)
    .map(toAudienceMenuItem);
  return <AudienceViewCell items={items} />;
}

function participantsRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = getEventAudiences(p.data)
    .filter((a) => !isCoordinatorFlag(a))
    .map(toAudienceMenuItem);
  return <AudienceViewCell items={items} />;
}

/** Angular Resource Person: name + optional profile "View" link. */
function resourcesRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = getEventResources(p.data).map(
    (r: DepartmentEventResourceRow, i: number) => ({
      key: String(r.deptResourceId ?? i),
      name: String(r.name ?? ""),
      href: r.profileUrl || undefined,
    }),
  );
  return <AudienceViewCell items={items} />;
}

/** Angular Event Photos cell: Photo N links + file input upload (`photoUrl`). */
function makePhotosRenderer(onUploaded: () => void) {
  return (p: ICellRendererParams<DepartmentEventRow>) => {
    const row = p.data;
    const photos = getEventPhotos(row);
    const deptEventId = row?.deptEventId;

    async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !deptEventId) return;
      try {
        const formData = new FormData();
        formData.append("deptEventId", String(deptEventId));
        formData.append("photoUrl", file, file.name);
        await uploadDepartmentEventFiles(formData);
        toastSuccess("Photo uploaded");
        onUploaded();
      } catch (err) {
        toastError(getErrorMessage(err));
      }
    }

    return (
      <div className="flex flex-col gap-1 py-1">
        {photos.map((photo: DepartmentEventPhotoRow, i: number) =>
          photo.photoUrl ? (
            <FileLink
              key={String(photo.deptEventPhotoId ?? i)}
              href={photo.photoUrl}
              label={`Photo ${i + 1}`}
            />
          ) : null,
        )}
        {deptEventId ? (
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            className="max-w-[140px] text-[11px] file:mr-1 file:rounded file:border-0 file:bg-muted file:px-1.5 file:py-0.5 file:text-[11px]"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => void onFileChange(e)}
          />
        ) : null}
      </div>
    );
  };
}

function certificatesRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {p.data?.certificate1 ? (
        <FileLink href={p.data.certificate1} label="Certificate1" />
      ) : null}
      {p.data?.certificate2 ? (
        <FileLink href={p.data.certificate2} label="Certificate2" />
      ) : null}
    </div>
  );
}

function makeActionsRenderer(
  setEditing: (row: DepartmentEventRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<DepartmentEventRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit department event"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

/** Angular department-events table columns (live HTML table). */
const COL_DEFS = {
  date: {
    headerName: "Date",
    colId: "date",
    minWidth: 200,
    flex: 1.2,
    valueGetter: (p) => formatEventDateRange(p.data),
  } as ColDef<DepartmentEventRow>,
  department: {
    headerName: "Name of the Department",
    colId: "department",
    field: "departmentCode",
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => p.data?.departmentCode ?? p.data?.departmentName ?? "",
  } as ColDef<DepartmentEventRow>,
  eventName: {
    field: "deptEventName",
    headerName: "Name of the Event",
    colId: "deptEventName",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<DepartmentEventRow>,
  venue: {
    field: "venue",
    headerName: "Venue",
    colId: "venue",
    minWidth: 120,
  } as ColDef<DepartmentEventRow>,
  permissionLetter: {
    headerName: "Permission Letter",
    colId: "permissionLetter",
    field: "permissionLetter",
    minWidth: 130,
    valueGetter: (p) => (p.data?.permissionLetter ? "Permission Letter" : ""),
  } as ColDef<DepartmentEventRow>,
  broucher: {
    headerName: "Broucher",
    colId: "broucherUrl",
    field: "broucherUrl",
    minWidth: 110,
    valueGetter: (p) => (p.data?.broucherUrl ? "Broucher" : ""),
  } as ColDef<DepartmentEventRow>,
  poster: {
    headerName: "Poster",
    colId: "posterUrl",
    field: "posterUrl",
    minWidth: 100,
    valueGetter: (p) => (p.data?.posterUrl ? "Poster" : ""),
  } as ColDef<DepartmentEventRow>,
  coordinators: {
    headerName: "Faculty and Student Co-ordinators",
    colId: "coordinators",
    minWidth: 180,
    valueGetter: (p) => coordinatorsText(p.data),
  } as ColDef<DepartmentEventRow>,
  resourcePerson: {
    headerName: "Resource Person",
    colId: "resourcePerson",
    minWidth: 140,
    valueGetter: (p) => resourcesText(p.data),
  } as ColDef<DepartmentEventRow>,
  participants: {
    headerName: "List of Participents",
    colId: "participants",
    minWidth: 150,
    valueGetter: (p) => participantsText(p.data),
  } as ColDef<DepartmentEventRow>,
  registrationAmount: {
    field: "totalRegisrationAmount",
    headerName: "Registration Amount",
    colId: "totalRegisrationAmount",
    minWidth: 140,
  } as ColDef<DepartmentEventRow>,
  feeCollected: {
    field: "totalFeeCollected",
    headerName: "Total Amount Collected",
    colId: "totalFeeCollected",
    minWidth: 150,
  } as ColDef<DepartmentEventRow>,
  expendings: {
    field: "totalExpenditure",
    headerName: "Expendings",
    colId: "totalExpenditure",
    minWidth: 110,
  } as ColDef<DepartmentEventRow>,
  bills: {
    headerName: "Bills",
    colId: "billsUrl",
    field: "billsUrl",
    minWidth: 90,
    valueGetter: (p) => (p.data?.billsUrl ? "Bills" : ""),
  } as ColDef<DepartmentEventRow>,
  feedback: {
    headerName: "Feedback",
    colId: "feedbackUrl",
    field: "feedbackUrl",
    minWidth: 100,
    valueGetter: (p) => (p.data?.feedbackUrl ? "Feedback" : ""),
  } as ColDef<DepartmentEventRow>,
  photos: {
    headerName: "Event Photos",
    colId: "photos",
    minWidth: 120,
    autoHeight: true,
    valueGetter: (p) => photosText(p.data),
  } as ColDef<DepartmentEventRow>,
  certificates: {
    headerName: "Certificates",
    colId: "certificates",
    minWidth: 120,
    autoHeight: true,
    valueGetter: (p) => certificatesText(p.data),
  } as ColDef<DepartmentEventRow>,
  actions: {
    headerName: "Actions",
    colId: "actions",
    minWidth: 86,
    width: 86,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<DepartmentEventRow>,
};

export function DepartmentEventsPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<
    { academicYearId?: number; academicYear?: string }[]
  >([]);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentEventRow | null>(null);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const {
    data: rows,
    isLoading,
    isFetching,
    invalidate,
  } = useCrudList({
    queryKey: QK.events.departmentEvents(),
    queryFn: listDepartmentEvents,
    // Angular loads only on Get List (`listAllDetails`), not on page mount.
    enabled: eventsLoaded,
  });

  useEffect(() => {
    void listActiveCollegesForDepartments()
      .then(setColleges)
      .catch(() => setColleges([]));
  }, []);

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

  const columnDefs = useMemo<ColDef<DepartmentEventRow>[]>(
    () => [
      COL_DEFS.date,
      COL_DEFS.department,
      COL_DEFS.eventName,
      COL_DEFS.venue,
      {
        ...COL_DEFS.permissionLetter,
        cellRenderer: makeFileLinkRenderer(
          "permissionLetter",
          "Permission Letter",
        ),
      },
      {
        ...COL_DEFS.broucher,
        cellRenderer: makeFileLinkRenderer("broucherUrl", "Broucher"),
      },
      {
        ...COL_DEFS.poster,
        cellRenderer: makeFileLinkRenderer("posterUrl", "Poster"),
      },
      { ...COL_DEFS.coordinators, cellRenderer: coordinatorsRenderer },
      { ...COL_DEFS.resourcePerson, cellRenderer: resourcesRenderer },
      { ...COL_DEFS.participants, cellRenderer: participantsRenderer },
      COL_DEFS.registrationAmount,
      COL_DEFS.feeCollected,
      COL_DEFS.expendings,
      {
        ...COL_DEFS.bills,
        cellRenderer: makeFileLinkRenderer("billsUrl", "Bills"),
      },
      {
        ...COL_DEFS.feedback,
        cellRenderer: makeFileLinkRenderer("feedbackUrl", "Feedback"),
      },
      {
        ...COL_DEFS.photos,
        cellRenderer: makePhotosRenderer(() => {
          void invalidate();
        }),
        autoHeight: true,
      },
      { ...COL_DEFS.certificates, cellRenderer: certificatesRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [invalidate],
  );

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid);
    setAcademicYearId(null);
    setAcademicYears([]);
    setEventsLoaded(false);
    if (!cid) return;
    try {
      const ay = await listAcademicYearsForCollege(cid);
      setAcademicYears(ay);
    } catch {
      setAcademicYears([]);
    }
  }

  const canAdd = Boolean(collegeId && academicYearId);

  /** Angular `getDepartEvents`: listAllDetails(DepartmentEvent) — no college/year filter. */
  function onGetEvents() {
    if (!collegeId || !academicYearId) return;
    if (eventsLoaded) {
      void invalidate();
    } else {
      setEventsLoaded(true);
    }
  }

  return (
    <FilteredListPage
      title="Department Events"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
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
              setEventsLoaded(false);
            }}
            options={academicYearOptions}
            searchable
            disabled={!collegeId}
            className="md:col-span-3"
          />
          <div className="md:col-span-2">
            <Button
              type="button"
              onClick={onGetEvents}
              disabled={isLoading || isFetching || !collegeId || !academicYearId}
            >
              {isLoading || isFetching ? "Loading…" : "Get Events"}
            </Button>
          </div>
        </div>
      }
      body={
        eventsLoaded && canAdd ? (
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading || isFetching}
            pagination
            bordered={false}
            fitColumnsToWidth={false}
            toolbarLeading={<></>}
            toolbar={{
              search: true,
              columnFilters: false,
              exportPdf: true,
              exportExcel: true,
              searchPlaceholder: "Search department events…",
              pdfDocumentTitle: "Department Events",
            }}
            toolbarTrailing={
              <Button
                size="sm"
                className="h-[30px] px-3 text-[12px]"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                Add Event
              </Button>
            }
          />
        ) : null
      }
      bodyClassName="!px-0 !py-0 border-t-0"
    >
      {canAdd ? (
        <DepartmentEventModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          row={editing}
          collegeId={collegeId!}
          academicYearId={academicYearId!}
          onSaved={invalidate}
        />
      ) : null}
    </FilteredListPage>
  );
}
