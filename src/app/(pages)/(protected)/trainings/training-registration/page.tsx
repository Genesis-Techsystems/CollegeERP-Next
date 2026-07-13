'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSession } from '@/hooks/useSession'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings, listTrainingStudentsByEmployee, createTrainingStudent } from '@/services/trainings'
import type { PlacementTraining, TrainingStudent } from '@/types/trainings'
import { rowIndexGetter } from '@/lib/utils'

type TrainingRow = PlacementTraining & { registered: boolean; expired: boolean }

function isExpired(endDate: string): boolean {
  return new Date(endDate).getTime() < Date.now()
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  training: PlacementTraining | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

function ConfirmModal({ training, onClose, onConfirm }: ConfirmModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={training !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Confirmation</DialogTitle>
        </DialogHeader>

        {training && (
          <div className="space-y-2 py-2 text-sm">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Training</span>
              <span className="col-span-2 font-medium">
                {training.trainingTitle}
                {training.trainingTypeCatCode && (
                  <span className="text-muted-foreground ml-1">({training.trainingTypeCatCode})</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Trainer</span>
              <span className="col-span-2">{training.trainerName}</span>
            </div>
            {training.empName && (
              <div className="grid grid-cols-3 gap-1">
                <span className="text-xs text-muted-foreground">Incharge</span>
                <span className="col-span-2">
                  {training.empName}
                  {training.empNumber && <span className="text-muted-foreground ml-1">({training.empNumber})</span>}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="col-span-2">{training.startDate} – {training.endDate}</span>
            </div>

            <p className="pt-2 font-semibold">Are you sure to register?</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 rounded bg-red-50 px-3 py-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Registering…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingRegistrationPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading)
  const collegeId = user?.collegeId ?? 0

  const [registrations, setRegistrations] = useState<TrainingStudent[]>([])
  const [confirmTraining, setConfirmTraining] = useState<PlacementTraining | null>(null)

  const ready = employeeId > 0 && !isResolving

  const { data: allTrainings, isLoading, invalidate } = useCrudList<PlacementTraining>({
    queryKey: QK.trainings.list(),
    queryFn: listTrainings,
    enabled: ready,
  })

  useEffect(() => {
    if (!ready) return
    listTrainingStudentsByEmployee(employeeId)
      .then(setRegistrations)
      .catch(console.error)
  }, [ready, employeeId])

  const registeredIds = useMemo(
    () => new Set(registrations.map((r) => r.trainingId)),
    [registrations],
  )

  const rows = useMemo<TrainingRow[]>(() => {
    if (!allTrainings) return []
    return allTrainings
      .filter((t) => t.isTrackAudience == null || t.isTrackAudience)
      .map((t) => ({
        ...t,
        registered: registeredIds.has(t.traningId),
        expired: isExpired(t.endDate),
      }))
  }, [allTrainings, registeredIds])

  async function handleRegister(training: PlacementTraining) {
    await createTrainingStudent({
      employeeId,
      collegeId,
      trainingId: training.traningId,
      isActive: true,
    })
    const updated = await listTrainingStudentsByEmployee(employeeId)
    setRegistrations(updated)
    invalidate()
  }

  const columnDefs = useMemo<ColDef<TrainingRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainingTitle', headerName: 'Training Title', minWidth: 180, flex: 2 },
      { field: 'trainingTypeCatDisplayName', headerName: 'Training Type', minWidth: 130, flex: 1 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'empName', headerName: 'Incharge', minWidth: 130, flex: 1 },
      { field: 'startDate', headerName: 'Start Date', minWidth: 110, flex: 1 },
      { field: 'endDate', headerName: 'End Date', minWidth: 110, flex: 1 },
      {
        headerName: 'Status',
        minWidth: 110,
        flex: 0.9,
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          if (row.registered) {
            return (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                Registered
              </span>
            )
          }
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
              Register
            </span>
          )
        },
      },
      {
        headerName: 'Actions',
        width: 160,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          if (row.registered) return <span className="text-muted-foreground text-xs">—</span>
          if (row.expired) {
            return <span className="text-xs text-red-500">Registration date has expired</span>
          }
          return (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmTraining(row)}
            >
              Register
            </Button>
          )
        },
      },
    ],
    [],
  )

  return (
    <ListPage
      title="Training Registration"
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading || isResolving}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search trainings…',
                pdfDocumentTitle: 'Training Registration',
              }}
            >
      <ConfirmModal
        training={confirmTraining}
        onClose={() => setConfirmTraining(null)}
        onConfirm={() => handleRegister(confirmTraining!)}
      />
    </ListPage>
  )
}
