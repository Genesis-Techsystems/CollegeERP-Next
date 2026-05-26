'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listActiveCollegesForDepartments,
  listCounselorStudentsByEmployee,
  searchEmployeesForMentorship,
  type MentorshipRow,
} from '@/services'
import type { College } from '@/types/college'

type HistoryRow = MentorshipRow

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<HistoryRow>,
  studentName: { field: 'studentName', headerName: 'Student Name', minWidth: 180 } as ColDef<HistoryRow>,
  coursePath: { headerName: 'Course', minWidth: 260, flex: 1 } as ColDef<HistoryRow>,
  actions: { headerName: 'Actions', minWidth: 140, flex: 0, width: 140 } as ColDef<HistoryRow>,
}

function coursePathValue(row: HistoryRow | undefined): string {
  if (!row) return ''
  const parts = [
    row.collegeCode,
    row.courseName,
    row.groupCode,
    row.courseYearCode,
    row.section,
  ].filter((p) => p != null && String(p).trim() !== '')
  return parts.map(String).join(' / ')
}

function makeMeetingsRenderer(
  collegeId: number | null,
  employeeId: number | null,
  router: ReturnType<typeof useRouter>,
) {
  return (p: ICellRendererParams<HistoryRow>) => {
    const sid = Number(p.data?.studentId ?? 0)
    if (!sid) return null
    return (
      <Button
        type="button"
        size="sm"
        variant="link"
        className="h-auto p-0 text-primary"
        onClick={() => {
          const params = new URLSearchParams({ studentId: String(sid) })
          if (collegeId) params.set('collegeId', String(collegeId))
          if (employeeId) params.set('employeeId', String(employeeId))
          router.push(`/mentorship/student-meetings?${params.toString()}`)
        }}
      >
        Meetings List
      </Button>
    )
  }
}

export function MeetingHistoryPage() {
  const router = useRouter()
  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeSearching, setEmployeeSearching] = useState(false)
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void listActiveCollegesForDepartments()
      .then((list) => {
        setColleges(list)
        if (list.length > 0) setCollegeId(list[0]!.collegeId)
      })
      .catch(() => setColleges([]))
  }, [])

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  )

  const loadStudents = useCallback(async (eid: number) => {
    setLoading(true)
    setRows([])
    try {
      const list = await listCounselorStudentsByEmployee(eid)
      setRows(list)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (!collegeId || q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearching(true)
    try {
      const found = await searchEmployeesForMentorship(collegeId, q)
      setEmployeeOptions(
        found.map((e) => ({
          value: String(e.employeeId),
          label: `${e.empNumber ?? ''}${e.firstName ? ` (${String(e.firstName)})` : ''}`.trim(),
        })),
      )
    } catch (e) {
      toastError(getErrorMessage(e))
      setEmployeeOptions([])
    } finally {
      setEmployeeSearching(false)
    }
  }

  async function onEmployeeSelected(eid: number | null) {
    setEmployeeId(eid)
    setRows([])
    if (!eid) return
    await loadStudents(eid)
  }

  const columnDefs = useMemo<ColDef<HistoryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.studentName,
      {
        ...COL_DEFS.coursePath,
        valueGetter: (p) => coursePathValue(p.data),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeMeetingsRenderer(collegeId, employeeId, router),
      },
    ],
    [collegeId, employeeId, router],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Meeting History" bodyClassName="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              setEmployeeId(null)
              setRows([])
              setEmployeeOptions([])
            }}
            options={collegeOptions}
            searchable
            className="md:col-span-3"
          />
          <Select
            label="Counselor *"
            value={employeeId ? String(employeeId) : null}
            onChange={(v) => void onEmployeeSelected(v ? Number(v) : null)}
            options={employeeOptions}
            searchable
            isLoading={employeeSearching}
            disabled={!collegeId}
            onSearch={(term) => void onEmployeeSearch(term)}
            className="md:col-span-5"
          />
        </div>
      </FilterCard>

      {rows.length > 0 || loading ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search students…',
              pdfDocumentTitle: 'Meeting History',
            }}
          />
        </TableCard>
      ) : employeeId && !loading ? (
        <p className="text-sm text-muted-foreground px-1">No students assigned to this counselor.</p>
      ) : null}
    </PageContainer>
  )
}
