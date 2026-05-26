'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getAdmissionCollegeFilters, listOrganizations, listStudentEnquiries } from '@/services'
import type { StudentEnquiryRow } from '@/types/admission'
import {
  collegeOption,
  courseOption,
  filterColleges,
  filterCourses,
} from '../../_lib/admission-filters'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { resolveOrganizationId } from '@/lib/user-context'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentEnquiryRow>,
  studentName: { field: 'studentName', headerName: 'Student', minWidth: 140, flex: 1 } as ColDef<StudentEnquiryRow>,
  parentname: { field: 'parentname', headerName: 'Parent', minWidth: 120 } as ColDef<StudentEnquiryRow>,
  enquiryDate: { field: 'enquiryDate', headerName: 'Enquiry Date', minWidth: 110 } as ColDef<StudentEnquiryRow>,
  returnDate: { field: 'returnDate', headerName: 'Return Date', minWidth: 110 } as ColDef<StudentEnquiryRow>,
  sourceofenquiry: { field: 'sourceofenquiry', headerName: 'Source', minWidth: 100 } as ColDef<StudentEnquiryRow>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110, flex: 0 } as ColDef<StudentEnquiryRow>,
  mobileNumber1: { field: 'mobileNumber1', headerName: 'Mobile 2', minWidth: 110, flex: 0 } as ColDef<StudentEnquiryRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<StudentEnquiryRow>,
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<StudentEnquiryRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit enquiry"
      onClick={() => {
        const row = p.data
        if (!row?.enquiryId) return
        const params = new URLSearchParams({ enquiryId: String(row.enquiryId) })
        router.push(`/admission/enquiries/edit-enquiry-form?${params}`)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function EnquiryListPage() {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const { data: organizations = [] } = useQuery({
    queryKey: ['admission', 'organizations'],
    queryFn: listOrganizations,
  })

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.collegeFilters(orgId, empId),
    queryFn: () => getAdmissionCollegeFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []

  useEffect(() => {
    if (organizations.length > 0 && !organizationId) {
      setOrganizationId(String(organizations[0].organizationId))
    }
  }, [organizations, organizationId])

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  )
  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId ? Number(collegeId) : null).map(courseOption),
    [filtersData, collegeId],
  )

  useEffect(() => {
    if (!filtersLoading && collegeOptions.length > 0 && !collegeId) {
      setCollegeId(collegeOptions[0]?.value ?? null)
    }
  }, [filtersLoading, collegeOptions, collegeId])

  useEffect(() => {
    if (courseOptions.length > 0 && !courseId) {
      setCourseId(courseOptions[0]?.value ?? null)
    }
  }, [courseOptions, courseId])

  const listReady = Boolean(organizationId && collegeId && courseId)

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: QK.admission.enquiries({
      organizationId: Number(organizationId),
      collegeId: Number(collegeId),
      courseId: Number(courseId),
    }),
    queryFn: () =>
      listStudentEnquiries({
        organizationId: Number(organizationId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
      }),
    enabled: listReady,
  })

  const columnDefs = useMemo<ColDef<StudentEnquiryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.studentName,
      COL_DEFS.parentname,
      COL_DEFS.enquiryDate,
      COL_DEFS.returnDate,
      COL_DEFS.sourceofenquiry,
      COL_DEFS.mobileNumber,
      COL_DEFS.mobileNumber1,
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [organizations],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Enquiry List">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Organization"
            value={organizationId}
            onChange={(v) => {
              setOrganizationId(v)
              setCollegeId(null)
              setCourseId(null)
            }}
            options={orgOptions}
            searchable
          />
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setCourseId(null)
            }}
            options={collegeOptions}
            searchable
          />
          <Select
            label="Course"
            value={courseId}
            onChange={setCourseId}
            options={courseOptions}
            searchable
          />
        </div>
      </FilterCard>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading || filtersLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search enquiries…',
            pdfDocumentTitle: 'Enquiry List',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              disabled={!listReady}
              onClick={() => {
                const params = new URLSearchParams({
                  organizationId: organizationId!,
                  collegeId: collegeId!,
                  courseId: courseId!,
                })
                router.push(`/admission/enquiries/add-enquiry-form?${params}`)
              }}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Enquiry
            </Button>
          )}
        />
      </TableCard>
    </PageContainer>
  )
}
