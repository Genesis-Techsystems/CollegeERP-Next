'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DownloadIcon, PencilIcon, PlusIcon, PrinterIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { rowIndexGetter } from '@/lib/utils'
import {
  downloadAdmissionReport,
  getAdmissionCollegeFilters,
  listStudentApplicationForms,
  openAdmissionReport,
} from '@/services'
import type { StudentApplicationFormRow } from '@/types/admission'
import {
  academicYearOption,
  collegeOption,
  courseOption,
  filterAcademicYears,
  filterColleges,
  filterCourses,
} from '../../_lib/admission-filters'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentApplicationFormRow>,
  applicationNumber: { field: 'applicationNumber', headerName: 'App No', minWidth: 110 } as ColDef<StudentApplicationFormRow>,
  firstName: { field: 'firstName', headerName: 'Name', minWidth: 140, flex: 1 } as ColDef<StudentApplicationFormRow>,
  adminssionDate: { field: 'adminssionDate', headerName: 'Admission Date', minWidth: 120 } as ColDef<StudentApplicationFormRow>,
  courseName: { field: 'courseName', headerName: 'Course', minWidth: 100 } as ColDef<StudentApplicationFormRow>,
  genderName: { field: 'genderName', headerName: 'Gender', minWidth: 90, flex: 0 } as ColDef<StudentApplicationFormRow>,
  mobile: { field: 'mobile', headerName: 'Mobile', minWidth: 110, flex: 0 } as ColDef<StudentApplicationFormRow>,
  currentWorkflowStatusName: { field: 'currentWorkflowStatusName', headerName: 'Status', minWidth: 120 } as ColDef<StudentApplicationFormRow>,
  actions: { headerName: 'Actions', minWidth: 130, width: 130, flex: 0 } as ColDef<StudentApplicationFormRow>,
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<StudentApplicationFormRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Edit application"
          onClick={() => {
            const params = new URLSearchParams({
              applicationNumber: row.applicationNumber ?? '',
              collegeId: String(row.collegeId ?? ''),
            })
            router.push(`/admission/application-form/edit-application-form?${params}`)
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        {row.admissionNumber && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Print report"
              onClick={() => openAdmissionReport(String(row.admissionNumber))}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Download report"
              onClick={() =>
                void downloadAdmissionReport(
                  String(row.admissionNumber),
                  row.firstName ?? 'admission-report',
                )
              }
            >
              <DownloadIcon className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    )
  }
}

export default function ApplicationListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.collegeFilters(orgId, empId),
    queryFn: () => getAdmissionCollegeFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const academicData = filterBundle?.academicData ?? []

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  )
  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId ? Number(collegeId) : null).map(courseOption),
    [filtersData, collegeId],
  )
  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId ? Number(collegeId) : null, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  )

  useEffect(() => {
    if (filtersLoading) return
    const qpCollege = searchParams.get('collegeId')
    const qpAy = searchParams.get('academicYearId')
    const qpCourse = searchParams.get('courseId')
    if (qpCollege) setCollegeId(qpCollege)
    if (qpAy) setAcademicYearId(qpAy)
    if (qpCourse) setCourseId(qpCourse)
  }, [filtersLoading, searchParams])

  /** Table loads only after college, academic year, and course are chosen (empty by default). */
  const listReady = Boolean(collegeId && academicYearId && courseId)

  const filterSummary = useMemo(() => {
    if (!listReady) return ''
    const parts = [
      collegeOptions.find((o) => o.value === collegeId)?.label,
      academicYearOptions.find((o) => o.value === academicYearId)?.label,
      courseOptions.find((o) => o.value === courseId)?.label,
    ].filter(Boolean)
    return parts.join(' / ')
  }, [
    listReady,
    collegeOptions,
    collegeId,
    academicYearOptions,
    academicYearId,
    courseOptions,
    courseId,
  ])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.admission.applicationForms({
      collegeId: Number(collegeId),
      academicYearId: Number(academicYearId),
      courseId: Number(courseId),
    }),
    queryFn: () =>
      listStudentApplicationForms({
        collegeId: Number(collegeId),
        academicYearId: Number(academicYearId),
        courseId: Number(courseId),
      }),
    enabled: listReady,
  })

  const columnDefs = useMemo<ColDef<StudentApplicationFormRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.applicationNumber,
      COL_DEFS.firstName,
      COL_DEFS.adminssionDate,
      COL_DEFS.courseName,
      COL_DEFS.genderName,
      COL_DEFS.mobile,
      COL_DEFS.currentWorkflowStatusName,
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Application List">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setAcademicYearId(null)
              setCourseId(null)
            }}
            options={collegeOptions}
            isLoading={filtersLoading}
            searchable
            placeholder="Select college"
          />
          <Select
            label="Academic Year"
            value={academicYearId}
            onChange={setAcademicYearId}
            options={academicYearOptions}
            disabled={!collegeId}
            searchable
            placeholder="Select academic year"
          />
          <Select
            label="Course"
            value={courseId}
            onChange={setCourseId}
            options={courseOptions}
            disabled={!collegeId}
            searchable
            placeholder="Select course"
          />
        </div>
      </FilterCard>

      {listReady && (
        <>
          {filterSummary && (
            <div className="app-card overflow-hidden px-4 py-3">
              <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
                Application List — {filterSummary}
              </h2>
            </div>
          )}

          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading || filtersLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search applications…',
                pdfDocumentTitle: 'Application List',
              }}
              toolbarTrailing={(
                <Button
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={() => {
                    const params = new URLSearchParams({
                      collegeId: collegeId!,
                      academicYearId: academicYearId!,
                      courseId: courseId!,
                    })
                    router.push(`/admission/application-form/add-application-form?${params}`)
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  New Application
                </Button>
              )}
            />
          </TableCard>
        </>
      )}
    </PageContainer>
  )
}
