'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { listPlacements, listPlacedStudentsByPlacement } from '@/services/placements'
import type { Placement, PlacementStudentRegistration } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import PlacementInterviewModal from '../PlacementInterviewModal'

export default function PlacedStudentsListPage() {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [placementId, setPlacementId] = useState('')
  const [students, setStudents] = useState<PlacementStudentRegistration[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<PlacementStudentRegistration | null>(null)

  useEffect(() => {
    listPlacements().then(setPlacements).catch(console.error)
  }, [])

  async function loadStudents(pid: string) {
    if (!pid) { setStudents([]); return }
    setLoading(true)
    try {
      const rows = await listPlacedStudentsByPlacement(Number(pid))
      setStudents(rows)
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const columnDefs = useMemo<ColDef<PlacementStudentRegistration>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'firstName', headerName: 'Student Name', minWidth: 140, flex: 2 },
    { field: 'rollNumber', headerName: 'Roll No.', minWidth: 110, flex: 1 },
    { field: 'courseName', headerName: 'Course', minWidth: 120, flex: 1 },
    { field: 'companyname', headerName: 'Company', minWidth: 140, flex: 1.5 },
    {
      field: 'offerDate', headerName: 'Offer Date', minWidth: 110, flex: 1,
    },
    {
      field: 'isJoined', headerName: 'Joined', minWidth: 85, flex: 0.7,
      cellRenderer: (p: ICellRendererParams<PlacementStudentRegistration>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isJoined ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {p.data?.isJoined ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 80, flex: 0,
      cellRenderer: (p: ICellRendererParams<PlacementStudentRegistration>) => {
        if (!p.data) return null
        return (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
            onClick={() => { setEditData(p.data!); setModalOpen(true) }}>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ], [])

  return (
    <PageContainer className="space-y-4">
      {/* Filter */}
      <div className="app-card p-4">
        <h2 className="app-card-title mb-3">Placed Students</h2>
        <div className="max-w-xs space-y-0.5">
          <Label className="text-xs">Placement *</Label>
          <Select value={placementId} onValueChange={(v) => { setPlacementId(v); loadStudents(v) }}>
            <SelectTrigger><SelectValue placeholder="Select placement" /></SelectTrigger>
            <SelectContent>
              {placements.map((p) => (
                <SelectItem key={p.placementId} value={String(p.placementId)}>{p.plaecmentTitle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {placementId && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <DataTable
                rowData={students}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search placed students…', pdfDocumentTitle: 'Placed Students' }}
              />
            </div>
          </div>
        </div>
      )}

      <PlacementInterviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={() => loadStudents(placementId)}
      />
    </PageContainer>
  )
}
