'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  fetchAllocatedTimetableGrid,
  getTimingSetById,
  listScheduleSectionsForTimetable,
  type StudentTimetableGrid,
} from '@/services'
import { formatDateHeader } from '../_lib/timetable-filters'
import { AllocatedTimetableMatrix } from './AllocatedTimetableMatrix'
import {
  TimingSetStructurePreview,
  type WeekdayColumn,
} from './TimingSetStructurePreview'

const MODAL_TITLE_CLASS = 'text-[15px] font-semibold leading-none text-[#5da394]'

/** Angular `ViewStructureModalComponent` — manage-timetable eye icon. */
export type ViewStructureTimetableContext = {
  timingsetId: number
  collegeId: number
  timetableId: number
  collegeCode: string
  academicYear: string
  timetableName: string
  startDate: string
  endDate: string
}

/** View-timetable popup — weekly allocation grid. */
export type ViewAllocatedTimetableContext = {
  collegeId: number
  academicYearId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  groupSectionId: number
  timetableId?: number
  collegeLabel: string
  timetableLabel: string
  sectionLabel: string
}

export type ViewTimetableModalContext =
  | { mode: 'structure'; data: ViewStructureTimetableContext }
  | { mode: 'allocated'; data: ViewAllocatedTimetableContext }

type ViewAllocatedTimetableModalProps = {
  open: boolean
  onClose: () => void
  context: ViewTimetableModalContext | null
}

function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2.5 overflow-x-auto rounded-sm border border-[#9ec5e8] bg-slate-50/40 px-4 py-3 text-[12px]">
      {children}
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="leading-snug">
      <span className="font-semibold text-[#b45309]">{label}</span>{' '}
      <span className="font-medium whitespace-nowrap text-[#002b5c]">{value}</span>
    </p>
  )
}

function formatSectionPath(item: Record<string, unknown>): string {
  const course = String(item.courseName ?? item.course_name ?? '').trim()
  const group = String(item.groupName ?? item.group_name ?? item.courseGroupName ?? '').trim()
  const year = String(item.courseYearName ?? item.course_year_name ?? '').trim()
  const section = String(item.section ?? item.groupSectionName ?? '').trim()
  const yearSection = [year, section].filter(Boolean).join(' - ')
  return [course, group, yearSection].filter(Boolean).join(' / ')
}

function SectionsInfoLine({ sections }: { sections: Record<string, unknown>[] }) {
  if (sections.length === 0) return null
  return (
    <div className="flex flex-wrap items-start gap-x-1 leading-snug">
      <span className="shrink-0 font-semibold text-[#b45309]">Sections :</span>
      <div className="min-w-0 space-y-1">
        {sections.map((item, i) => (
          <p
            key={`${String(item.groupSectionId ?? item.section ?? i)}`}
            className="whitespace-nowrap font-medium text-[#002b5c]"
          >
            {formatSectionPath(item)}
          </p>
        ))}
      </div>
    </div>
  )
}

function TimetableGridLoader() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Loading timetable…
    </div>
  )
}

function StructureModalBody({ data }: { data: ViewStructureTimetableContext }) {
  const [loading, setLoading] = useState(true)
  const [weekdays, setWeekdays] = useState<WeekdayColumn[]>([])
  const [sections, setSections] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      getTimingSetById(data.timingsetId),
      listScheduleSectionsForTimetable(data.collegeId, data.timetableId),
    ])
      .then(([timingSet, sectionRows]) => {
        if (cancelled) return
        const raw = timingSet?.classWeekdays
        const cols: WeekdayColumn[] = Array.isArray(raw)
          ? (raw as Record<string, unknown>[]).map((w) => ({
              weekdayName: String(w.weekdayName ?? ''),
              classTimings: (Array.isArray(w.classTimings) ? w.classTimings : []).map(
                (t: Record<string, unknown>) => ({
                  name: String(t.name ?? t.classTimingName ?? ''),
                  isBreak: Boolean(t.isBreak ?? t.is_break),
                  startTime: String(t.startTime ?? t.start_time ?? ''),
                  endTime: String(t.endTime ?? t.end_time ?? ''),
                }),
              ),
            }))
          : []
        setWeekdays(cols)
        setSections(sectionRows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [data])

  const from = formatDateHeader(data.startDate)
  const to = formatDateHeader(data.endDate)
  const dateLabel = from && to ? ` - (${from} - ${to})` : ''

  return (
    <div className="flex flex-col gap-3">
      <InfoPanel>
        <InfoLine label="College :" value={`${data.collegeCode} (${data.academicYear})`} />
        <InfoLine label="Timetable :" value={`${data.timetableName}${dateLabel}`} />
        <SectionsInfoLine sections={sections} />
      </InfoPanel>

      <div className="overflow-x-auto rounded-sm border border-border/60">
        {loading ? (
          <TimetableGridLoader />
        ) : weekdays.length > 0 ? (
          <TimingSetStructurePreview classWeekdays={weekdays} variant="modal" />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No timing structure found.</p>
        )}
      </div>
    </div>
  )
}

function AllocatedModalBody({ data }: { data: ViewAllocatedTimetableContext }) {
  const [loading, setLoading] = useState(false)
  const [grid, setGrid] = useState<StudentTimetableGrid | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchAllocatedTimetableGrid({
      collegeId: data.collegeId,
      academicYearId: data.academicYearId,
      courseId: data.courseId,
      courseGroupId: data.courseGroupId,
      courseYearId: data.courseYearId,
      groupSectionId: data.groupSectionId,
      timetableId: data.timetableId,
    })
      .then((result) => {
        if (!cancelled) setGrid(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [data])

  return (
    <div className="flex flex-col gap-3">
      <InfoPanel>
        <InfoLine label="College :" value={data.collegeLabel} />
        <InfoLine label="Timetable :" value={data.timetableLabel} />
        <InfoLine label="Sections :" value={data.sectionLabel} />
      </InfoPanel>

      <div className="overflow-x-auto rounded-sm border border-border/60">
        {loading ? (
          <TimetableGridLoader />
        ) : grid && grid.rows.length > 0 ? (
          <AllocatedTimetableMatrix grid={grid} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No timetable entries found.</p>
        )}
      </div>
    </div>
  )
}

export function ViewAllocatedTimetableModal({
  open,
  onClose,
  context,
}: ViewAllocatedTimetableModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-6 sm:max-w-[1000px]">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border pb-3">
          <DialogTitle className={MODAL_TITLE_CLASS}>View Allocated timetable</DialogTitle>
          <DialogDescription className="sr-only">
            View allocated timetable structure and section assignments
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-3 scrollbar-hidden">
          {context?.mode === 'structure' ? (
            <StructureModalBody data={context.data} />
          ) : context?.mode === 'allocated' ? (
            <AllocatedModalBody data={context.data} />
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background pt-3 sm:justify-end">
          <Button type="button" variant="outline" size="sm" className="h-9 min-w-[5.5rem]" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
