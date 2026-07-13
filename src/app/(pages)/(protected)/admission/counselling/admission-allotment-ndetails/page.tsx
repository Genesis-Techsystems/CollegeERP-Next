'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilteredListPage, ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { rowIndexGetter } from '@/lib/utils'
import {
  getAdmissionUnivFilters,
  listAdmissionAllotmentConsolidate,
  listAdmissionAllotments,
} from '@/services'
import type { AdmissionAllotmentDetailRow, AdmissionAllotmentRow } from '@/types/admission'
import {
  collegeOption,
  filterCollegesByUniversity,
  filterUniversities,
  pickNum,
  pickText,
  universityOption,
  type FilterRow,
} from '../../_lib/admission-filters'
import {
  AdmissionAllotmentModal,
  type AdmissionAllotmentModalContext,
} from './AdmissionAllotmentModal'

const COL = ['fk_college_id', 'collegeId', 'fk_collegeId']
const UNI = ['fk_university_id', 'universityId', 'Universities.universityId']

function statusRenderer<T extends { isActive?: boolean }>(p: ICellRendererParams<T>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function AdmissionAllotmentNdetailsPage() {
  const queryClient = useQueryClient()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const [universityId, setUniversityId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdmissionAllotmentRow | null>(null)

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityOption),
    [filtersData],
  )

  const collegeOptions = useMemo(
    () =>
      filterCollegesByUniversity(
        filtersData,
        universityId ? Number(universityId) : null,
      ).map(collegeOption),
    [filtersData, universityId],
  )

  const selectedCollegeRow = useMemo(() => {
    if (!collegeId) return null
    return (
      filtersData.find((r) => pickNum(r, COL) === Number(collegeId)) ??
      ({ fk_college_id: Number(collegeId) } as FilterRow)
    )
  }, [filtersData, collegeId])

  const selectedUniversityRow = useMemo(() => {
    if (!universityId) return null
    return filtersData.find((r) => pickNum(r, UNI) === Number(universityId)) ?? null
  }, [filtersData, universityId])

  const modalContext = useMemo<AdmissionAllotmentModalContext | null>(() => {
    if (!collegeId) return null
    const resolvedUniversityId =
      Number(universityId) || pickNum(selectedCollegeRow, UNI) || pickNum(selectedUniversityRow, UNI)
    return {
      collegeId: Number(collegeId),
      universityId: resolvedUniversityId,
      universityCode: pickText(selectedUniversityRow, ['university_code', 'universityCode']),
      collegeCode: pickText(selectedCollegeRow, ['college_code', 'collegeCode']),
    }
  }, [collegeId, universityId, selectedCollegeRow, selectedUniversityRow])

  const collegeSelected = Boolean(collegeId)

  const { data: allotmentRows = [], isLoading: listLoading } = useQuery({
    queryKey: QK.admission.admissionAllotmentsList(Number(collegeId)),
    queryFn: () => listAdmissionAllotments(Number(collegeId)),
    enabled: collegeSelected,
  })

  const { data: consolidateRows = [] } = useQuery({
    queryKey: QK.admission.admissionAllotmentConsolidate(Number(collegeId)),
    queryFn: () => listAdmissionAllotmentConsolidate(Number(collegeId)),
    enabled: collegeSelected,
  })

  const invalidate = () => {
    if (!collegeId) return
    void queryClient.invalidateQueries({
      queryKey: QK.admission.admissionAllotmentsList(Number(collegeId)),
    })
    void queryClient.invalidateQueries({
      queryKey: QK.admission.admissionAllotmentConsolidate(Number(collegeId)),
    })
  }

  const columnDefs = useMemo<ColDef<AdmissionAllotmentRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'collegeCode', headerName: 'College Code', minWidth: 100 },
      { field: 'courseCode', headerName: 'Course Code', minWidth: 100 },
      {
        field: 'courseGroupCode',
        headerName: 'Course Group Code',
        minWidth: 120,
        valueGetter: (p) => p.data?.courseGroupCode ?? p.data?.courseGroup,
      },
      { field: 'batchName', headerName: 'Batch Name', minWidth: 100 },
      { field: 'totalIntake', headerName: 'Total Intake', minWidth: 90, flex: 0 },
      { field: 'totalFilled', headerName: 'Total Filled', minWidth: 90, flex: 0 },
      { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 200,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AdmissionAllotmentRow>) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="link"
              className="h-auto p-0 text-[12px] text-primary"
              onClick={() => {
                /* Allotment details modal — follow-up */
              }}
            >
              Add Allotment Details
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit allotment"
              onClick={() => {
                setEditing(p.data ?? null)
                setModalOpen(true)
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const consolidateCols = useMemo<ColDef<AdmissionAllotmentDetailRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'collegeCode', headerName: 'College Code', minWidth: 100 },
      { field: 'courseCode', headerName: 'Course Code', minWidth: 100 },
      { field: 'courseGroupCode', headerName: 'Course Group Code', minWidth: 120 },
      { field: 'batchName', headerName: 'Batch Name', minWidth: 100 },
      {
        field: 'quotaCatdetCode',
        headerName: 'Quota',
        minWidth: 90,
        valueGetter: (p) => p.data?.quotaCatdetCode ?? p.data?.quotaCatdetName,
      },
      { field: 'allocatedSeats', headerName: 'Allocated Seats', minWidth: 110, flex: 0 },
      { field: 'filledSeats', headerName: 'Filled Seats', minWidth: 100, flex: 0 },
      { field: 'lastdayOfCounselling', headerName: 'Last Day Of Counselling', minWidth: 140 },
      { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <>
      <FilteredListPage
        title="Admission Allotment & Details"
        filters={(
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="University"
              value={universityId}
              onChange={(v) => {
                setUniversityId(v)
                setCollegeId(null)
              }}
              options={universityOptions}
              isLoading={filtersLoading}
              searchable
              placeholder="Select university"
            />
            <Select
              label="College"
              value={collegeId}
              onChange={setCollegeId}
              options={collegeOptions}
              searchable
              placeholder="Select college"
              disabled={!universityId}
            />
          </div>
        )}
        rowData={collegeSelected ? allotmentRows : []}
        columnDefs={columnDefs}
        loading={listLoading || filtersLoading}
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: 'Search allotments…',
          pdfDocumentTitle: 'Admission Allotment',
        }}
        toolbarTrailing={(
          <Button
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            disabled={!collegeSelected}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Admission Allotment
          </Button>
        )}
      >
        {modalContext && (
          <AdmissionAllotmentModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setEditing(null)
            }}
            row={editing}
            context={modalContext}
            onSaved={invalidate}
          />
        )}
      </FilteredListPage>

      {collegeSelected && consolidateRows.length > 0 && (
        <ListPage
          title="Consolidate Report"
          rowData={consolidateRows}
          columnDefs={consolidateCols}
          loading={listLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search consolidate report…',
            pdfDocumentTitle: 'Consolidate Report',
          }}
        />
      )}
    </>
  )
}
