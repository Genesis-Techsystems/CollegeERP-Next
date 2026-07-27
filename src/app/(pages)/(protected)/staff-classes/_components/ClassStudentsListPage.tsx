'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { listStudentsForMyClass } from '@/services'

type StudentRow = Record<string, unknown>

const DEFAULT_STUDENT_PHOTO = '/assets/images/avatars/default_Student.png'

function photoRenderer(p: ICellRendererParams<StudentRow>) {
  const raw = String(p.data?.studentPhotoPath ?? '').trim()
  const src = raw || DEFAULT_STUDENT_PHOTO
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote / avatar URLs
    <img
      src={src}
      alt=""
      className="mx-auto h-10 w-10 rounded-full object-cover"
      onError={(e) => {
        const img = e.currentTarget
        if (!img.src.endsWith('default_Student.png')) {
          img.src = DEFAULT_STUDENT_PHOTO
        }
      }}
    />
  )
}

function nameRenderer(p: ICellRendererParams<StudentRow>) {
  const d = p.data
  if (!d) return null
  // Angular my-classes/students-list: admissionNumber , firstName
  const admission = String(d.admissionNumber ?? d.rollNumber ?? '')
  const name = String(d.firstName ?? d.studentName ?? '').toUpperCase()
  const parts = [
    d.collegeCode,
    d.courseCode,
    d.groupCode,
    d.courseYearName,
    d.section,
  ].map((x) => (x != null && String(x).trim() !== '' ? String(x) : '-'))
  const line2 = parts.join(' | ')
  const mobile = d.mobile != null ? String(d.mobile) : ''

  return (
    <div className="leading-snug py-0.5">
      <p className="font-semibold text-[13px]">
        {admission ? `${admission} , ` : ''}
        {name}
      </p>
      <p className="text-[12px] text-muted-foreground">{line2}</p>
      {mobile ? <p className="text-[12px] text-muted-foreground">{mobile}</p> : null}
    </div>
  )
}

const COL_DEFS = {
  photo: {
    headerName: 'Photo',
    field: 'studentPhotoPath',
    minWidth: 90,
    flex: 0,
    width: 90,
    cellRenderer: photoRenderer,
  } as ColDef<StudentRow>,
  name: {
    headerName: 'Student Name',
    field: 'firstName',
    minWidth: 280,
    autoHeight: true,
    cellRenderer: nameRenderer,
  } as ColDef<StudentRow>,
}

/** Angular `staff-classes/my-classes/students-list`. */
export function ClassStudentsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(false)

  const collegeId = Number(searchParams.get('collegeId') || 0)
  const courseGroupId = Number(searchParams.get('courseGroupId') || 0)
  const groupSectionId = Number(searchParams.get('groupSectionId') || 0)
  const subtitle = [
    searchParams.get('collegeCode'),
    searchParams.get('academicYear'),
    searchParams.get('groupCode'),
    searchParams.get('courseYearName'),
    searchParams.get('section'),
  ]
    .filter(Boolean)
    .join(' / ')

  useEffect(() => {
    if (!collegeId || !courseGroupId || !groupSectionId) return
    setLoading(true)
    void (async () => {
      try {
        const list = await listStudentsForMyClass({
          collegeId,
          courseGroupId,
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
  }, [collegeId, courseGroupId, groupSectionId])

  const columnDefs = useMemo<ColDef<StudentRow>[]>(
    () => [COL_DEFS.photo, COL_DEFS.name],
    [],
  )

  return (
    <ListPage
      title="Students"
      subtitle={subtitle || undefined}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      height="auto"
      rowHeight={64}
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
