'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  downloadStaffAttendanceNotMarkedReport,
  listActiveDepartments,
  listDepartmentHeadsByDepartment,
  listStaffAttendanceNotMarkedByDepartment,
  type StaffNotMarkedRow,
} from '@/services'
import type { Department } from '@/types/department'

type StaffRow = StaffNotMarkedRow

const s = (v: unknown) => (v == null || v === '' ? '' : String(v))

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function toYmd(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StaffRow>,
  empNumber: { field: 'emp_number', headerName: 'Emp No.', minWidth: 100 } as ColDef<StaffRow>,
  subject: { field: 'subject_name', headerName: 'Subject', minWidth: 140 } as ColDef<StaffRow>,
  subjectType: { field: 'subject_type', headerName: 'Subject Type', minWidth: 110 } as ColDef<StaffRow>,
  faculty: { field: 'faculty', headerName: 'Faculty', minWidth: 160 } as ColDef<StaffRow>,
  courseYear: { field: 'SEC_Display_Name', headerName: 'Course Year', minWidth: 120 } as ColDef<StaffRow>,
  batch: { field: 'batch_name', headerName: 'Batch', minWidth: 100 } as ColDef<StaffRow>,
  time: { headerName: 'Time', minWidth: 130, flex: 0 } as ColDef<StaffRow>,
  mobile: { field: 'mobile', headerName: 'Mobile No.', minWidth: 120 } as ColDef<StaffRow>,
}

function timeRenderer(p: ICellRendererParams<StaffRow>) {
  const start = s(p.data?.Starttime)
  const end = s(p.data?.Endtime)
  if (!start && !end) return '—'
  return `${start} - ${end}`
}

function batchRenderer(p: ICellRendererParams<StaffRow>) {
  const v = p.data?.batch_name
  return v != null && String(v).trim() !== '' ? String(v) : '—'
}

export function StaffAttendanceNotMarkedListPage() {
  const isHod = readStorage('isHOD') === 'true'
  const hodDeptId = Number(readStorage('empDeptId') || 0) || null

  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [day, setDay] = useState<Date | null>(() => new Date())
  const [staffType, setStaffType] = useState<'R' | 'G'>('R')
  const [deptHeads, setDeptHeads] = useState<StaffRow[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [lastQuery, setLastQuery] = useState<{
    dateYmd: string
    departmentId: number
    courseGroupId: number
    isSameDept: boolean
  } | null>(null)

  useEffect(() => {
    listActiveDepartments()
      .then((rows) => {
        setDepartments(rows)
        if (isHod && hodDeptId) {
          setDepartmentId(hodDeptId)
        }
      })
      .catch(() => setDepartments([]))
  }, [isHod, hodDeptId])

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.departmentId),
        label: `${d.collegeCode ?? ''} - ${d.deptName}`.replace(/^ - /, ''),
      })),
    [departments],
  )

  const otherDeptLabel = useMemo(() => {
    const code = deptHeads[0]?.groupCode
    return code ? `Other Dept Emp (${String(code)})` : 'Other Dept Emp'
  }, [deptHeads])

  const loadDepartmentHeads = useCallback(async (deptId: number) => {
    setStaff([])
    setLastQuery(null)
    try {
      const heads = await listDepartmentHeadsByDepartment(deptId)
      setDeptHeads(heads)
    } catch {
      setDeptHeads([])
    }
  }, [])

  useEffect(() => {
    const deptId = isHod && hodDeptId ? hodDeptId : departmentId
    if (!deptId) {
      setDeptHeads([])
      return
    }
    void loadDepartmentHeads(deptId)
  }, [departmentId, isHod, hodDeptId, loadDepartmentHeads])

  useEffect(() => {
    setStaff([])
    setLastQuery(null)
  }, [staffType, departmentId, day])

  const columnDefs = useMemo<ColDef<StaffRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empNumber,
      COL_DEFS.subject,
      COL_DEFS.subjectType,
      COL_DEFS.faculty,
      COL_DEFS.courseYear,
      { ...COL_DEFS.batch, cellRenderer: batchRenderer },
      { ...COL_DEFS.time, cellRenderer: timeRenderer },
      COL_DEFS.mobile,
    ],
    [],
  )

  function resolveDepartmentId(): number | null {
    if (isHod && hodDeptId) return hodDeptId
    return departmentId
  }

  async function getStaff() {
    const ymd = toYmd(day)
    if (!ymd) {
      toastError('Please select a date')
      return
    }
    const deptId = resolveDepartmentId()
    if (!deptId) {
      toastError('Please select a department')
      return
    }

    if (deptHeads.length === 0) {
      toastInfo(
        'Department is not synchronised with course group, please contact system admin.',
      )
      return
    }
    const courseGroupId = Number(deptHeads[0]?.courseGroupId ?? 0)
    if (!courseGroupId) {
      toastInfo(
        'Department is not synchronised with course group, please contact system admin.',
      )
      return
    }

    const isSameDept = staffType === 'R'
    setLoading(true)
    setStaff([])
    try {
      const rows = await listStaffAttendanceNotMarkedByDepartment({
        dateYmd: ymd,
        departmentId: deptId,
        courseGroupId,
        isSameDept,
      })
      setStaff(rows)
      setLastQuery({ dateYmd: ymd, departmentId: deptId, courseGroupId, isSameDept })
      if (rows.length === 0) toastSuccess('No staff found for this filter.')
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport() {
    if (!lastQuery) {
      toastError('Load staff before downloading the report')
      return
    }
    setDownloading(true)
    try {
      await downloadStaffAttendanceNotMarkedReport(lastQuery)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Attendance Not Marked Staff" bodyClassName="space-y-4">
        <RadioGroup
          value={staffType}
          onValueChange={(v) => setStaffType(v as 'R' | 'G')}
          className="flex flex-row flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="R" id="staff-type-r" />
            <Label htmlFor="staff-type-r" className="cursor-pointer font-normal text-sm">
              Dept Emp
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="G" id="staff-type-g" disabled />
            <Label
              htmlFor="staff-type-g"
              className="cursor-not-allowed font-normal text-sm text-muted-foreground"
            >
              {otherDeptLabel}
            </Label>
          </div>
        </RadioGroup>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="Department *"
            value={departmentId ? String(departmentId) : null}
            onChange={(v) => setDepartmentId(v ? Number(v) : null)}
            options={departmentOptions}
            searchable
            disabled={isHod}
            className="md:col-span-4"
          />
          <DatePicker
            label="Date *"
            value={day}
            onChange={setDay}
            clearable={false}
            className="md:col-span-2"
          />
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void getStaff()} disabled={loading}>
              {loading ? 'Loading…' : 'Get Staff'}
            </Button>
          </div>
        </div>
      </FilterCard>

      {staff.length > 0 ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={staff}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search faculty, subject, mobile…',
              pdfDocumentTitle: 'Staff Attendance Not Marked List',
            }}
            toolbarTrailing={(
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-[30px]"
                disabled={downloading}
                onClick={() => void downloadReport()}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {downloading ? 'Downloading…' : 'Download Report'}
              </Button>
            )}
          />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
