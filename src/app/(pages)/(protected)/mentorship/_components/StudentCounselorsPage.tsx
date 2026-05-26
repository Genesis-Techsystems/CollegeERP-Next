'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listCounselorMappingsForStudent,
  searchStudentsForMentorship,
  type MentorshipRow,
} from '@/services'

type CounselorRow = MentorshipRow

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CounselorRow>,
  course: { field: 'course', headerName: 'Course', minWidth: 120 } as ColDef<CounselorRow>,
  faculty: { field: 'empFirstName', headerName: 'Faculty', minWidth: 160 } as ColDef<CounselorRow>,
  department: { field: 'dpt', headerName: 'Department', minWidth: 120 } as ColDef<CounselorRow>,
  mobile: { field: 'mobile', headerName: 'Mobile', minWidth: 120 } as ColDef<CounselorRow>,
  fromDate: { field: 'fromDate', headerName: 'From Date', minWidth: 110 } as ColDef<CounselorRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<CounselorRow>,
}

function statusRenderer(p: ICellRendererParams<CounselorRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function studentLabel(row: MentorshipRow): string {
  const name = String(row.firstName ?? row.studentName ?? '')
  const roll = row.rollNumber != null ? ` (${String(row.rollNumber)})` : ''
  return `${name}${roll}`.trim() || String(row.studentId ?? '')
}

export function StudentCounselorsPage() {
  const isStudent = readStorage('userRole') === 'STUDENT'
  const studentIdFromStorage = Number(readStorage('studentId') || 0) || null

  const [studentOptions, setStudentOptions] = useState<{ value: string; label: string }[]>([])
  const [students, setStudents] = useState<MentorshipRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [rows, setRows] = useState<CounselorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const loadCounselors = useCallback(async (sid: number, collegeId: number) => {
    setLoading(true)
    setRows([])
    try {
      const data = await listCounselorMappingsForStudent(collegeId, sid)
      setRows(data)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isStudent || !studentIdFromStorage) return
    setStudentId(studentIdFromStorage)
    const roll = readStorage('rollNumber')
    if (roll) {
      void (async () => {
        setSearching(true)
        try {
          const found = await searchStudentsForMentorship(roll)
          setStudents(found)
          const match = found.find((s) => Number(s.studentId) === studentIdFromStorage)
          if (match) {
            const cid = Number(match.collegeId ?? 0)
            if (cid) await loadCounselors(studentIdFromStorage, cid)
          }
        } catch (e) {
          toastError(getErrorMessage(e))
        } finally {
          setSearching(false)
        }
      })()
    }
  }, [isStudent, studentIdFromStorage, loadCounselors])

  async function onStudentSearch(term: string) {
    const q = term.trim()
    if (q.length < 5) {
      setStudentOptions([])
      return
    }
    setSearching(true)
    try {
      const found = await searchStudentsForMentorship(q)
      setStudents(found)
      setStudentOptions(
        found.map((s) => ({
          value: String(s.studentId),
          label: studentLabel(s),
        })),
      )
    } catch (e) {
      toastError(getErrorMessage(e))
      setStudentOptions([])
    } finally {
      setSearching(false)
    }
  }

  function onStudentChange(value: string | null) {
    const sid = value ? Number(value) : null
    setStudentId(sid)
    setRows([])
    if (!sid) return
    const student = students.find((s) => Number(s.studentId) === sid)
    const collegeId = Number(student?.collegeId ?? 0)
    if (!collegeId) {
      toastError('Student college not found')
      return
    }
    void loadCounselors(sid, collegeId)
  }

  const columnDefs = useMemo<ColDef<CounselorRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.course,
      COL_DEFS.faculty,
      COL_DEFS.department,
      COL_DEFS.mobile,
      COL_DEFS.fromDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Student Counselors" bodyClassName="max-w-xl">
        <Select
          label="Student *"
          value={studentId ? String(studentId) : null}
          onChange={onStudentChange}
          options={studentOptions}
          searchable
          disabled={isStudent}
          isLoading={searching}
          placeholder="Search by student name or roll no (min 5 chars)…"
          onSearch={(term) => void onStudentSearch(term)}
        />
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
              searchPlaceholder: 'Search counselors…',
              pdfDocumentTitle: 'Student Counselors',
            }}
          />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
