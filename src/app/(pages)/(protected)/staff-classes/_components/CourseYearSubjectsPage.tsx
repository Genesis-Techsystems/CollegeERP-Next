'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { listSubjectCourseYearsForMyClass } from '@/services'

type SubjectRow = Record<string, unknown>

/** Angular employee-module-course-year-subjects table headings. */
const COL_DEFS = {
  siNo: {
    headerName: 'No.',
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<SubjectRow>,
  code: { field: 'subjectCode', headerName: 'Subject Code', minWidth: 120 } as ColDef<SubjectRow>,
  name: { field: 'subjectName', headerName: 'Subject', minWidth: 180 } as ColDef<SubjectRow>,
  type: { field: 'subjectType', headerName: 'Subject Type', minWidth: 110 } as ColDef<SubjectRow>,
  regulation: {
    field: 'regulationName',
    headerName: 'Regulation',
    minWidth: 120,
  } as ColDef<SubjectRow>,
  creditHours: {
    field: 'creditHours',
    headerName: 'Credit Hours',
    minWidth: 110,
  } as ColDef<SubjectRow>,
  subCredits: {
    field: 'subCredits',
    headerName: 'Credit Points',
    minWidth: 110,
  } as ColDef<SubjectRow>,
}

/** Angular `staff-classes/my-classes/course-year-subjects`. */
export function CourseYearSubjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(false)

  const collegeId = Number(searchParams.get('collegeId') || 0)
  const academicYearId = Number(searchParams.get('academicYearId') || 0)
  const groupSectionId = Number(searchParams.get('groupSectionId') || 0)
  const headerParts = [
    searchParams.get('collegeCode'),
    searchParams.get('academicYear'),
    searchParams.get('groupCode'),
    searchParams.get('courseYearName'),
    searchParams.get('section'),
  ].filter(Boolean)
  const title =
    headerParts.length > 0
      ? `Course Year Subjects - ${headerParts.join(' | ')}`
      : 'Course Year Subjects'

  useEffect(() => {
    if (!collegeId || !academicYearId || !groupSectionId) return
    setLoading(true)
    void (async () => {
      try {
        const list = await listSubjectCourseYearsForMyClass({
          collegeId,
          academicYearId,
          groupSectionId,
        })
        setRows(list)
        if (list.length === 0) toastSuccess('No Record(s) found.')
      } catch (e) {
        toastError(getErrorMessage(e))
        setRows([])
      } finally {
        setLoading(false)
      }
    })()
  }, [collegeId, academicYearId, groupSectionId])

  const columnDefs = useMemo<ColDef<SubjectRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.code,
      COL_DEFS.name,
      COL_DEFS.type,
      COL_DEFS.regulation,
      COL_DEFS.creditHours,
      COL_DEFS.subCredits,
    ],
    [],
  )

  return (
    <ListPage
      title={title}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      height="auto"
      toolbar={{ search: true, searchPlaceholder: 'Search' }}
    >
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </ListPage>
  )
}
