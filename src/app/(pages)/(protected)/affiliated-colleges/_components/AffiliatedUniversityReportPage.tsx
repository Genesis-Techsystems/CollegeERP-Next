'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { getAffiliatedCollegeSummaryReport } from '@/services'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'
import { getAffiliatedConfig } from '../_lib/route-config'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { AffiliatedCollegeFilters } from './AffiliatedCollegeFilters'

const VIEW_ROUTES: Record<string, string> = {
  topic: 'view-uploaded-files',
  students: 'view-students-data',
  subjects: 'view-subjects-data',
  attendance: 'view-attendance-data',
  exam_registration: 'view-exam-reg-data',
  exam_fee: 'view-exam-fee-data',
  student_fee: 'view-student-fee-data',
  marks: 'view-student-marks-data',
}

function actionRenderer(slug: string) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    const row = p.data
    if (!row) return null
    const flag = String(row.flag ?? row.topic_flag ?? '').toLowerCase()
    const segment = Object.entries(VIEW_ROUTES).find(([k]) => flag.includes(k))?.[1]
    if (!segment) return <span className="text-muted-foreground text-xs">—</span>
    return (
      <Button size="sm" variant="outline" asChild>
        <Link href={`/affiliated-colleges/university-affiliated-colleges/${segment}`}>View</Link>
      </Button>
    )
  }
}

type AffiliatedUniversityReportPageProps = { slug: string }

export function AffiliatedUniversityReportPage({ slug }: AffiliatedUniversityReportPageProps) {
  const config = getAffiliatedConfig(slug)
  const cascade = useAffiliatedCascade({ examFilters: true, allowAllGroupYear: true, autoSelectFirst: true })
  const [loadKey, setLoadKey] = useState<string | null>(null)
  const procFlag = config.summaryProcFlag ?? 'uploaded_files_summary'

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.collegeSummary(
      procFlag,
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () => {
      const f = JSON.parse(loadKey!) as Record<string, number>
      return getAffiliatedCollegeSummaryReport({
        inFlag: procFlag,
        collegeId: f.collegeId,
        academicYearId: f.academicYearId,
        courseId: f.courseId,
        courseGroupId: f.courseGroupId,
        courseYearId: f.courseYearId,
      })
    },
    enabled: loadKey != null,
  })

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'topic', headerName: 'Topic', minWidth: 200, flex: 1 },
      { field: 'count', headerName: 'Count', minWidth: 90, flex: 0 },
      {
        headerName: 'Action',
        minWidth: 90,
        flex: 0,
        cellRenderer: actionRenderer(slug),
      },
    ],
    [slug],
  )

  return (
    <PageContainer>
      <PageHeader title={config.title} />
      <AffiliatedCollegeFilters
        title={config.title}
        cascade={cascade}
        onGetDetails={() => {
          if (!cascade.filtersValid) return
          setLoadKey(JSON.stringify(cascade.toFilterParams()))
        }}
        loadingDetails={isFetching}
        allowAllGroupYear
        showExam
      />
      {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}
      {loadKey && rows.length > 0 ? (
        <TableCard withHeaderBorder={false}>
          <DataTable rowData={rows} columnDefs={columnDefs} />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
