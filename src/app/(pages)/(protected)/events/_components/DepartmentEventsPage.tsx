'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon, UserRound } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useCrudList } from '@/hooks/useCrudList'
import { Select } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { QK } from '@/lib/query-keys'
import {
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listDepartmentEvents,
  type DepartmentEventAudienceRow,
  type DepartmentEventPhotoRow,
  type DepartmentEventResourceRow,
  type DepartmentEventRow,
} from '@/services'
import type { College } from '@/types/college'
import { DepartmentEventModal } from './DepartmentEventModal'

function formatDisplayDate(raw: string | undefined): string {
  if (!raw) return ''
  const dt = new Date(String(raw))
  if (Number.isNaN(dt.getTime())) return String(raw)
  return format(dt, 'dd MMM, yyyy')
}

function formatEventDateRange(row: DepartmentEventRow | undefined): string {
  if (!row) return ''
  const start = formatDisplayDate(row.startDate)
  const end = formatDisplayDate(row.endDate)
  if (start && end) return `${start} - ${end}`
  return start || end
}

function audienceLabel(aud: DepartmentEventAudienceRow): string {
  if (aud.employeeDetailNumber || aud.employeeDetailName) {
    const num = aud.employeeDetailNumber ? `(${aud.employeeDetailNumber}) ` : ''
    return `${num}${aud.employeeDetailName ?? ''}`.trim()
  }
  const roll = aud.studentDetailRollNumber ? `(${aud.studentDetailRollNumber}) ` : ''
  return `${roll}${aud.studentDetailName ?? ''}`.trim()
}

function coordinatorsText(row: DepartmentEventRow | undefined): string {
  const list = (row?.departmentEventAudienceDTOs ?? []).filter((a) => a.isCoordinator)
  return list.map(audienceLabel).filter(Boolean).join('; ')
}

function participantsText(row: DepartmentEventRow | undefined): string {
  const list = (row?.departmentEventAudienceDTOs ?? []).filter((a) => !a.isCoordinator)
  return list.map(audienceLabel).filter(Boolean).join('; ')
}

function resourcesText(row: DepartmentEventRow | undefined): string {
  return (row?.departmentEventResourceDTOS ?? [])
    .map((r) => r.name)
    .filter(Boolean)
    .join('; ')
}

function photosText(row: DepartmentEventRow | undefined): string {
  return (row?.departmentEventPhotoDTOS ?? [])
    .map((p, i) => (p.photoUrl ? `Photo ${i + 1}` : ''))
    .filter(Boolean)
    .join('; ')
}

function certificatesText(row: DepartmentEventRow | undefined): string {
  const parts: string[] = []
  if (row?.certificate1) parts.push('Certificate1')
  if (row?.certificate2) parts.push('Certificate2')
  return parts.join('; ')
}

function FileLink({ href, label }: Readonly<{ href?: string | null; label: string }>) {
  if (!href) return null
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
  )
}

function AudienceViewCell({
  items,
  emptyLabel = '—',
}: Readonly<{ items: { key: string; label: string; href?: string }[]; emptyLabel?: string }>) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>
  }
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
      <PopoverContent align="start" className="w-64 p-2">
        <ul className="max-h-56 space-y-1 overflow-y-auto text-[12px]">
          {items.map((item) => (
            <li key={item.key} className="rounded px-2 py-1 hover:bg-muted/50">
              <span>{item.label}</span>
              {item.href ? (
                <>
                  {' '}
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function makeFileLinkRenderer(field: keyof DepartmentEventRow, label: string) {
  return (p: ICellRendererParams<DepartmentEventRow>) => {
    const href = p.data?.[field]
    return typeof href === 'string' && href ? <FileLink href={href} label={label} /> : null
  }
}

function coordinatorsRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = (p.data?.departmentEventAudienceDTOs ?? [])
    .filter((a) => a.isCoordinator)
    .map((a, i) => ({ key: String(a.departmentEventAudienceId ?? i), label: audienceLabel(a) }))
  return <AudienceViewCell items={items} />
}

function participantsRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = (p.data?.departmentEventAudienceDTOs ?? [])
    .filter((a) => !a.isCoordinator)
    .map((a, i) => ({ key: String(a.departmentEventAudienceId ?? i), label: audienceLabel(a) }))
  return <AudienceViewCell items={items} />
}

function resourcesRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const items = (p.data?.departmentEventResourceDTOS ?? []).map(
    (r: DepartmentEventResourceRow, i: number) => ({
      key: String(r.deptResourceId ?? i),
      label: String(r.name ?? ''),
      href: r.profileUrl,
    }),
  )
  return <AudienceViewCell items={items} />
}

function photosRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  const photos = p.data?.departmentEventPhotoDTOS ?? []
  if (photos.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {photos.map((photo: DepartmentEventPhotoRow, i: number) =>
        photo.photoUrl ? (
          <FileLink key={String(photo.deptEventPhotoId ?? i)} href={photo.photoUrl} label={`Photo ${i + 1}`} />
        ) : null,
      )}
    </div>
  )
}

function certificatesRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {p.data?.certificate1 ? <FileLink href={p.data.certificate1} label="Certificate1" /> : null}
      {p.data?.certificate2 ? <FileLink href={p.data.certificate2} label="Certificate2" /> : null}
    </div>
  )
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
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

/** Angular department-events table columns (live HTML table). */
const COL_DEFS = {
  date: {
    headerName: 'Date',
    colId: 'date',
    minWidth: 200,
    flex: 1.2,
    valueGetter: (p) => formatEventDateRange(p.data),
  } as ColDef<DepartmentEventRow>,
  department: {
    headerName: 'Name of the Department',
    colId: 'department',
    field: 'departmentCode',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => p.data?.departmentCode ?? p.data?.departmentName ?? '',
  } as ColDef<DepartmentEventRow>,
  eventName: {
    field: 'deptEventName',
    headerName: 'Name of the Event',
    colId: 'deptEventName',
    minWidth: 160,
    flex: 1.2,
  } as ColDef<DepartmentEventRow>,
  venue: {
    field: 'venue',
    headerName: 'Venue',
    colId: 'venue',
    minWidth: 120,
  } as ColDef<DepartmentEventRow>,
  permissionLetter: {
    headerName: 'Permission Letter',
    colId: 'permissionLetter',
    field: 'permissionLetter',
    minWidth: 130,
    valueGetter: (p) => (p.data?.permissionLetter ? 'Permission Letter' : ''),
  } as ColDef<DepartmentEventRow>,
  broucher: {
    headerName: 'Broucher',
    colId: 'broucherUrl',
    field: 'broucherUrl',
    minWidth: 110,
    valueGetter: (p) => (p.data?.broucherUrl ? 'Broucher' : ''),
  } as ColDef<DepartmentEventRow>,
  poster: {
    headerName: 'Poster',
    colId: 'posterUrl',
    field: 'posterUrl',
    minWidth: 100,
    valueGetter: (p) => (p.data?.posterUrl ? 'Poster' : ''),
  } as ColDef<DepartmentEventRow>,
  coordinators: {
    headerName: 'Faculty and Student Co-ordinators',
    colId: 'coordinators',
    minWidth: 180,
    valueGetter: (p) => coordinatorsText(p.data),
  } as ColDef<DepartmentEventRow>,
  resourcePerson: {
    headerName: 'Resource Person',
    colId: 'resourcePerson',
    minWidth: 140,
    valueGetter: (p) => resourcesText(p.data),
  } as ColDef<DepartmentEventRow>,
  participants: {
    headerName: 'List of Participents',
    colId: 'participants',
    minWidth: 150,
    valueGetter: (p) => participantsText(p.data),
  } as ColDef<DepartmentEventRow>,
  registrationAmount: {
    field: 'totalRegisrationAmount',
    headerName: 'Registration Amount',
    colId: 'totalRegisrationAmount',
    minWidth: 140,
  } as ColDef<DepartmentEventRow>,
  feeCollected: {
    field: 'totalFeeCollected',
    headerName: 'Total Amount Collected',
    colId: 'totalFeeCollected',
    minWidth: 150,
  } as ColDef<DepartmentEventRow>,
  expendings: {
    field: 'totalExpenditure',
    headerName: 'Expendings',
    colId: 'totalExpenditure',
    minWidth: 110,
  } as ColDef<DepartmentEventRow>,
  bills: {
    headerName: 'Bills',
    colId: 'billsUrl',
    field: 'billsUrl',
    minWidth: 90,
    valueGetter: (p) => (p.data?.billsUrl ? 'Bills' : ''),
  } as ColDef<DepartmentEventRow>,
  feedback: {
    headerName: 'Feedback',
    colId: 'feedbackUrl',
    field: 'feedbackUrl',
    minWidth: 100,
    valueGetter: (p) => (p.data?.feedbackUrl ? 'Feedback' : ''),
  } as ColDef<DepartmentEventRow>,
  photos: {
    headerName: 'Event Photos',
    colId: 'photos',
    minWidth: 120,
    autoHeight: true,
    valueGetter: (p) => photosText(p.data),
  } as ColDef<DepartmentEventRow>,
  certificates: {
    headerName: 'Certificates',
    colId: 'certificates',
    minWidth: 120,
    autoHeight: true,
    valueGetter: (p) => certificatesText(p.data),
  } as ColDef<DepartmentEventRow>,
  actions: {
    headerName: 'Actions',
    colId: 'actions',
    minWidth: 86,
    width: 86,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<DepartmentEventRow>,
}

export function DepartmentEventsPage() {
  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYears, setAcademicYears] = useState<{ academicYearId?: number; academicYear?: string }[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DepartmentEventRow | null>(null)
  const [eventsLoaded, setEventsLoaded] = useState(false)

  const { data: allRows, isLoading, invalidate } = useCrudList({
    queryKey: QK.events.departmentEvents(),
    queryFn: listDepartmentEvents,
  })

  useEffect(() => {
    void listActiveCollegesForDepartments().then(setColleges).catch(() => setColleges([]))
  }, [])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? String(c.collegeId) })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  )

  const rows = useMemo(() => {
    if (!collegeId || !academicYearId) return []
    return allRows.filter(
      (r) => Number(r.collegeId) === collegeId && Number(r.academicYearId) === academicYearId,
    )
  }, [allRows, collegeId, academicYearId])

  const columnDefs = useMemo<ColDef<DepartmentEventRow>[]>(
    () => [
      COL_DEFS.date,
      COL_DEFS.department,
      COL_DEFS.eventName,
      COL_DEFS.venue,
      { ...COL_DEFS.permissionLetter, cellRenderer: makeFileLinkRenderer('permissionLetter', 'Permission Letter') },
      { ...COL_DEFS.broucher, cellRenderer: makeFileLinkRenderer('broucherUrl', 'Broucher') },
      { ...COL_DEFS.poster, cellRenderer: makeFileLinkRenderer('posterUrl', 'Poster') },
      { ...COL_DEFS.coordinators, cellRenderer: coordinatorsRenderer },
      { ...COL_DEFS.resourcePerson, cellRenderer: resourcesRenderer },
      { ...COL_DEFS.participants, cellRenderer: participantsRenderer },
      COL_DEFS.registrationAmount,
      COL_DEFS.feeCollected,
      COL_DEFS.expendings,
      { ...COL_DEFS.bills, cellRenderer: makeFileLinkRenderer('billsUrl', 'Bills') },
      { ...COL_DEFS.feedback, cellRenderer: makeFileLinkRenderer('feedbackUrl', 'Feedback') },
      { ...COL_DEFS.photos, cellRenderer: photosRenderer },
      { ...COL_DEFS.certificates, cellRenderer: certificatesRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid)
    setAcademicYearId(null)
    setAcademicYears([])
    setEventsLoaded(false)
    if (!cid) return
    try {
      const ay = await listAcademicYearsForCollege(cid)
      setAcademicYears(ay)
    } catch {
      setAcademicYears([])
    }
  }

  const canAdd = Boolean(collegeId && academicYearId)

  function onGetEvents() {
    if (!collegeId || !academicYearId) return
    setEventsLoaded(true)
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
              setAcademicYearId(v ? Number(v) : null)
              setEventsLoaded(false)
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
              disabled={isLoading || !collegeId || !academicYearId}
            >
              {isLoading ? 'Loading…' : 'Get Events'}
            </Button>
          </div>
        </div>
      }
      body={
        eventsLoaded && canAdd ? (
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            bordered={false}
            fitColumnsToWidth={false}
            toolbarLeading={<></>}
            toolbar={{
              search: true,
              columnFilters: false,
              exportPdf: true,
              exportExcel: true,
              searchPlaceholder: 'Search department events…',
              pdfDocumentTitle: 'Department Events',
            }}
            toolbarTrailing={
              <Button
                size="sm"
                className="h-[30px] px-3 text-[12px]"
                onClick={() => {
                  setEditing(null)
                  setModalOpen(true)
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
            setModalOpen(false)
            setEditing(null)
          }}
          row={editing}
          collegeId={collegeId!}
          academicYearId={academicYearId!}
          onSaved={invalidate}
        />
      ) : null}
    </FilteredListPage>
  )
}
