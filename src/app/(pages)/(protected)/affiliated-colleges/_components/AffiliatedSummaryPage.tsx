'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { getAffiliatedUploadSummary } from '@/services'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'
import { getAffiliatedConfig } from '../_lib/route-config'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { AffiliatedCollegeFilters } from './AffiliatedCollegeFilters'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AffiliatedSummaryRow>,
  courseCode: { field: 'course_code', headerName: 'Course Code', minWidth: 110 } as ColDef<AffiliatedSummaryRow>,
  regulation: { field: 'regulation_code', headerName: 'Regulation Code', minWidth: 120 } as ColDef<AffiliatedSummaryRow>,
  batch: { field: 'batch_name', headerName: 'Batch', minWidth: 90 } as ColDef<AffiliatedSummaryRow>,
  year: { field: 'course_year_code', headerName: 'Course Year', minWidth: 110 } as ColDef<AffiliatedSummaryRow>,
  group: { field: 'group_code', headerName: 'Group', minWidth: 90 } as ColDef<AffiliatedSummaryRow>,
  count: { field: 'uploaded_students_count', headerName: 'Students', minWidth: 90, flex: 0 } as ColDef<AffiliatedSummaryRow>,
  uploaded: { field: 'total_students_with_uploads', headerName: 'Students Uploaded', minWidth: 130 } as ColDef<AffiliatedSummaryRow>,
  actions: { headerName: 'Action', minWidth: 100, flex: 0, width: 100 } as ColDef<AffiliatedSummaryRow>,
}

function makeUploadRenderer(uploadPath: string | undefined, router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    if (!uploadPath) return null
    const row = p.data
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => {
          if (!row) return
          const q = new URLSearchParams({
            collegeId: String(row.fk_college_id ?? ''),
            academicYearId: String(row.fk_academic_year_id ?? ''),
            courseId: String(row.fk_course_id ?? ''),
            courseGroupId: String(row.fk_course_group_id ?? ''),
            courseYearId: String(row.fk_course_year_id ?? ''),
          })
          router.push(`/affiliated-colleges/${uploadPath}?${q.toString()}`)
        }}
      >
        Upload
      </Button>
    )
  }
}

type AffiliatedSummaryPageProps = { slug: string }

export function AffiliatedSummaryPage({ slug }: AffiliatedSummaryPageProps) {
  const config = getAffiliatedConfig(slug)
  const router = useRouter()
  const cascade = useAffiliatedCascade({ allowAllGroupYear: true, autoSelectFirst: true })
  const [loadKey, setLoadKey] = useState<string | null>(null)

  const filterKey = cascade.filtersValid ? JSON.stringify(cascade.toFilterParams()) : null

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.uploadSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () => getAffiliatedUploadSummary(JSON.parse(loadKey!) as Parameters<typeof getAffiliatedUploadSummary>[0]),
    enabled: loadKey != null,
  })

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.courseCode,
      COL_DEFS.regulation,
      COL_DEFS.batch,
      COL_DEFS.year,
      COL_DEFS.group,
      COL_DEFS.count,
      COL_DEFS.uploaded,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeUploadRenderer(config.uploadPath, router),
      },
    ],
    [config.uploadPath, router],
  )

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError('Select college, academic year, course, group, and year.')
      return
    }
    setLoadKey(JSON.stringify(cascade.toFilterParams()))
  }

  return (
    <PageContainer>
      <PageHeader title={config.title} />
      <AffiliatedCollegeFilters
        title={config.title}
        cascade={cascade}
        onGetDetails={handleGetDetails}
        loadingDetails={isFetching}
        allowAllGroupYear
        showBack={config.showBackToHub}
        onBack={() => router.push('/affiliated-colleges/college-bulk-uploads')}
      />
      {error ? (
        <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p>
      ) : null}
      {loadKey && rows.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold px-1">
            {config.title}
            {cascade.contextLabel ? ` — ${cascade.contextLabel}` : ''}
          </h2>
          <TableCard withHeaderBorder={false}>
            <DataTable rowData={rows} columnDefs={columnDefs} />
          </TableCard>
        </div>
      ) : null}
      {loadKey && !isFetching && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No records found.</p>
      ) : null}
    </PageContainer>
  )
}
