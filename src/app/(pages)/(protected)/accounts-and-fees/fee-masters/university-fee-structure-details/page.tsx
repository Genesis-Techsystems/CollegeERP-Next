'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getUnivFeeStructureContext, listUnivFeeStructureDetails } from '@/services'
import type { UnivFeeStructureDetailRow } from '@/types/fee-structure'

type FeeDetailLevel = 'university' | 'college'

const UNIV_COLS: ColDef<UnivFeeStructureDetailRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'casteQuota', headerName: 'Quota', minWidth: 100 },
  { field: 'categoryName', headerName: 'Category', minWidth: 140 },
  { field: 'feestructureName', headerName: 'Fee Structure', minWidth: 140 },
  { field: 'feeAmount', headerName: 'Fee Amount', minWidth: 110 },
  { field: 'lateFeeAmount', headerName: 'Late Fee', minWidth: 110 },
]

const COLLEGE_COLS: ColDef<UnivFeeStructureDetailRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'collegeCode', headerName: 'College', minWidth: 110 },
  { field: 'casteQuota', headerName: 'Quota', minWidth: 100 },
  { field: 'categoryName', headerName: 'Category', minWidth: 140 },
  { field: 'feestructureName', headerName: 'Fee Structure', minWidth: 140 },
  { field: 'feeAmount', headerName: 'Fee Amount', minWidth: 110 },
  { field: 'lateFeeAmount', headerName: 'Late Fee', minWidth: 110 },
]

export default function UniversityFeeStructureDetailsPage() {
  const router = useRouter()
  const context = getUnivFeeStructureContext()
  const [level, setLevel] = useState<FeeDetailLevel>('university')

  useEffect(() => {
    if (!context?.univFeeStructureId) {
      router.replace('/accounts-and-fees/fee-masters/university-fee-structure')
    }
  }, [context?.univFeeStructureId, router])

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: QK.univFeeStructures.details(context?.univFeeStructureId ?? 0),
    queryFn: () => listUnivFeeStructureDetails(context!.univFeeStructureId),
    enabled: !!context?.univFeeStructureId,
  })

  const universityRows = allRows.filter((r) => r.collegeId == null)
  const collegeRows = allRows.filter((r) => r.collegeId != null)
  const isUniversityLevel = level === 'university'
  const activeRows = isUniversityLevel ? universityRows : collegeRows
  const activeCols = isUniversityLevel ? UNIV_COLS : COLLEGE_COLS

  const title = context?.feeStructureName ?? 'University Fee Structure Details'

  const contextSummary = useMemo(
    () =>
      [context?.universityCode, context?.courseCode, context?.courseGroupCode, context?.academicYear]
        .filter(Boolean)
        .join(' / '),
    [context?.universityCode, context?.courseCode, context?.courseGroupCode, context?.academicYear],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title={title} defaultOpen>
        <div className="space-y-4">
          {contextSummary ? (
            <p className="text-[13px] font-medium text-slate-600">{contextSummary}</p>
          ) : null}
          <RadioGroup
            value={level}
            onValueChange={(v) => setLevel(v as FeeDetailLevel)}
            className="flex flex-row flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="university" id="fee-detail-university" />
              <Label htmlFor="fee-detail-university" className="cursor-pointer font-normal text-sm">
                University Wise Fee Structure Details
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="college" id="fee-detail-college" />
              <Label htmlFor="fee-detail-college" className="cursor-pointer font-normal text-sm">
                College Wise Fee Structure Details
              </Label>
            </div>
          </RadioGroup>
        </div>
      </FilterCard>

      <TableCard withHeaderBorder={false}>
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[13px] font-semibold text-[hsl(var(--primary))]">
            {isUniversityLevel ? 'University Level' : 'College Level'}
          </h2>
        </div>
        <DataTable
          rowData={activeRows}
          columnDefs={activeCols}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: isUniversityLevel ? 'Search university details…' : 'Search college details…',
          }}
        />
      </TableCard>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/accounts-and-fees/fee-masters/university-fee-structure">Back</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
