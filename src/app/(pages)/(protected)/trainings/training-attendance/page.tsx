'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { ChevronDown, ClipboardList, ClipboardCheck, Keyboard } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { listActiveTrainingDetails } from '@/services'
import type { TrainingDetail } from '@/types/trainings'
import { cn } from '@/lib/utils'

/** Angular `CONSTANTS.dateFormate`: `d MMM, y` → e.g. `8 Aug, 2026`. */
function formatAngularDate(value?: string | null): string {
  if (!value) return ''
  const raw = String(value).slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}/.test(raw) ? parseISO(raw) : new Date(value)
  if (!isValid(d)) return String(value)
  return format(d, 'd MMM, yyyy')
}

function buildQuery(detail: TrainingDetail): string {
  const params = new URLSearchParams({
    collegeId: String(detail.collegeId ?? ''),
    collegeCode: detail.collegeCode ?? '',
    traningId: String(detail.paTraningId ?? ''),
    traningDetId: String(detail.traningDetId ?? ''),
    paStartDate: detail.paStartDate ?? '',
    paEndDate: detail.paEndDate ?? '',
    paTrainingTitle: detail.paTrainingTitle ?? '',
    trainingDetailTitle: detail.trainingDetailTitle ?? '',
  })
  return params.toString()
}

export default function TrainingAttendanceClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<TrainingDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    // Angular training-classes-list:
    // domain/list/TrainingDetail?query=isActive==true.order(createdDt=desc)
    listActiveTrainingDetails()
      .then((rows) => setClasses(rows))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load classes'),
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageContainer className="space-y-3">
      {loading && (
        <p className="text-sm text-muted-foreground px-1">
          Loading training classes…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{error}</p>
      )}
      {!loading && !error && classes.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">
          No active training classes found.
        </p>
      )}

      <div className="space-y-3">
        {classes.map((training) => {
          const open = openId === training.traningDetId
          const qs = buildQuery(training)
          const dateLabel = [
            formatAngularDate(training.paStartDate),
            formatAngularDate(training.paEndDate),
          ]
            .filter(Boolean)
            .join(' - ')

          return (
            <Collapsible
              key={training.traningDetId}
              open={open}
              onOpenChange={(next) =>
                setOpenId(next ? training.traningDetId : null)
              }
              className="rounded-md border border-border bg-card overflow-hidden shadow-sm"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                >
                  <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-sm font-semibold text-primary flex-1 min-w-0">
                    {training.collegeCode} / {training.paTrainingTitle} /{' '}
                    {training.trainingDetailTitle}{' '}
                    {dateLabel && (
                      <span className="font-normal text-foreground">
                        ({dateLabel})
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {/* Angular: View (brown assignment) | Mark (green assignment_turned_in) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border-t border-border px-2 py-2">
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-md px-4 py-3.5 text-left hover:bg-muted/70 transition-colors"
                    onClick={() =>
                      router.push(`/trainings/view-training-attendance?${qs}`)
                    }
                  >
                    <ClipboardList className="h-7 w-7 shrink-0 text-[brown]" />
                    <span className="text-[15px] font-medium">View Attendance</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-md px-4 py-3.5 text-left hover:bg-muted/70 transition-colors"
                    onClick={() =>
                      router.push(`/trainings/mark-attendance?${qs}`)
                    }
                  >
                    <ClipboardCheck className="h-7 w-7 shrink-0 text-green-600" />
                    <span className="text-[15px] font-medium">Mark Attendance</span>
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </PageContainer>
  )
}
