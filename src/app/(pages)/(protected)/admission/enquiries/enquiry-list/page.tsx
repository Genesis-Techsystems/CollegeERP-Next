'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
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

/** Angular date pipe display: "Jul 18, 2026". */
function formatEnquiryDate(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'MMM d, yyyy')
}

function dateFormatter(p: ValueFormatterParams<StudentEnquiryRow>) {
  return formatEnquiryDate(p.value)
}

// Header names mirror Angular enquiry-list table columns.
const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentEnquiryRow>,
  studentName: { field: 'studentName', headerName: 'Candidate Name', minWidth: 150, flex: 1 } as ColDef<StudentEnquiryRow>,
  parentname: { field: 'parentname', headerName: 'Parent/Guardian', minWidth: 140 } as ColDef<StudentEnquiryRow>,
  enquiryDate: {
    field: 'enquiryDate',
    headerName: 'Enquiry Date',
    minWidth: 120,
    valueFormatter: dateFormatter,
  } as ColDef<StudentEnquiryRow>,
  returnDate: {
    field: 'returnDate',
    headerName: 'Return Date',
    minWidth: 120,
    valueFormatter: dateFormatter,
  } as ColDef<StudentEnquiryRow>,
  sourceofenquiry: { field: 'sourceofenquiry', headerName: 'Enquired Source', minWidth: 130 } as ColDef<StudentEnquiryRow>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Phone', minWidth: 110, flex: 0 } as ColDef<StudentEnquiryRow>,
  mobileNumber1: { field: 'mobileNumber1', headerName: 'Alternate Phone', minWidth: 130, flex: 0 } as ColDef<StudentEnquiryRow>,
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
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  // Seed filters from URL params so returning from the add/edit form restores
  // the same Organization / College / Course selection.
  const [organizationId, setOrganizationId] = useState<string | null>(
    () => searchParams.get('organizationId'),
  )
  const [collegeId, setCollegeId] = useState<string | null>(() => searchParams.get('collegeId'))
  const [courseId, setCourseId] = useState<string | null>(() => searchParams.get('courseId'))

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
    <FilteredListPage
      title="Enquiry List"
      filters={(
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
      )}
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
  )
}
