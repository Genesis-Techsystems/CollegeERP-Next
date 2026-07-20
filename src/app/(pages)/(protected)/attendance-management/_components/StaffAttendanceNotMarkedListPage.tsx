'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
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
  type DepartmentHeadRow,
  type StaffNotMarkedRow,
} from '@/services'
import type { Department } from '@/types/department'

type StaffRow = StaffNotMarkedRow

const s = (v: unknown) => (v == null || v === '' ? '' : String(v))

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

/** Angular manual date pad → `yyyy-MM-dd`. */
function toYmd(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

/**
 * Angular `displayedColumns`:
 * id, emp_number, faculty, subject_name, subject_type, SEC_Display_Name, batch_name, Starttime, mobile
 */
const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StaffRow>,
  empNumber: { field: 'emp_number', headerName: 'Emp No.', minWidth: 100 } as ColDef<StaffRow>,
  faculty: { field: 'faculty', headerName: 'Faculty', minWidth: 160 } as ColDef<StaffRow>,
  subject: { field: 'subject_name', headerName: 'Subject', minWidth: 140 } as ColDef<StaffRow>,
  subjectType: { field: 'subject_type', headerName: 'Subject Type', minWidth: 110 } as ColDef<StaffRow>,
  courseYear: { field: 'SEC_Display_Name', headerName: 'Course Year', minWidth: 120 } as ColDef<StaffRow>,
  batch: { field: 'batch_name', headerName: 'Batch', minWidth: 100 } as ColDef<StaffRow>,
  time: { headerName: 'Time', minWidth: 130, flex: 0 } as ColDef<StaffRow>,
  mobile: { field: 'mobile', headerName: 'Mobile No.', minWidth: 120 } as ColDef<StaffRow>,
}

function timeRenderer(p: ICellRendererParams<StaffRow>) {
  const start = s(p.data?.Starttime ?? p.data?.StartTime)
  const end = s(p.data?.Endtime ?? p.data?.EndTime)
  if (!start && !end) return '-'
  return `${start} - ${end}`
}

/** Angular: null batch → `-` */
function batchRenderer(p: ICellRendererParams<StaffRow>) {
  const v = p.data?.batch_name
  return v != null && String(v).trim() !== '' ? String(v) : '-'
}

export function StaffAttendanceNotMarkedListPage() {
  // Angular: localStorage isHOD / empDeptId
  const isHod = readStorage('isHOD') === 'true'
  const hodDeptId = Number(readStorage('empDeptId') || 0) || null

  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [day, setDay] = useState<Date | null>(() => new Date())
  /** Angular `check`: `'R'` = Dept Emp, `'G'` = Other Dept Emp */
  const [staffType, setStaffType] = useState<'R' | 'G'>('R')
  /**
   * Angular `isDisabled` on Other Dept Emp radio.
   * - Starts false
   * - Becomes true after department-heads fetch (selectedDepartment)
   * - Resets to false on radio change (selectedType)
   */
  const [otherDeptDisabled, setOtherDeptDisabled] = useState(false)
  const [deptHeads, setDeptHeads] = useState<DepartmentHeadRow[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [lastQuery, setLastQuery] = useState<{
    dateYmd: string
    departmentId: number
    courseGroupId: number
    inIssamedept: 0 | 1
  } | null>(null)

  useEffect(() => {
    // Angular getData → listDetailsById(Department, 'true', isActive)
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
        // Angular: `{{department.collegeCode}} - {{department.deptName}}`
        label: `${d.collegeCode ?? ''} - ${d.deptName}`.replace(/^ - /, ''),
      })),
    [departments],
  )

  const otherDeptLabel = useMemo(() => {
    // Angular: `Other Dept Emp ({{departmentsHead[0].groupCode}})` when heads exist
    const code = deptHeads[0]?.groupCode
    return code ? `Other Dept Emp (${String(code)})` : 'Other Dept Emp'
  }, [deptHeads])

  const loadDepartmentHeads = useCallback(async (deptId: number) => {
    // Angular selectedDepartment → clear staff, load EmpDeptHeads, set isDisabled=true
    setStaff([])
    setLastQuery(null)
    try {
      const heads = await listDepartmentHeadsByDepartment(deptId)
      setDeptHeads(heads)
    } catch {
      setDeptHeads([])
    } finally {
      // Angular always sets isDisabled=true after the heads call (success or empty)
      setOtherDeptDisabled(true)
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
    // Angular selectedDate / filter change → clear grid
    setStaff([])
    setLastQuery(null)
  }, [departmentId, day])

  const columnDefs = useMemo<ColDef<StaffRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empNumber,
      COL_DEFS.faculty,
      COL_DEFS.subject,
      COL_DEFS.subjectType,
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

  function onStaffTypeChange(next: 'R' | 'G') {
    // Angular selectedType → clear staff, isDisabled = false
    setStaffType(next)
    setStaff([])
    setLastQuery(null)
    setOtherDeptDisabled(false)
  }

  async function getStaff() {
    // Angular getAbsentees()
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

    // Angular: R always takes departmentsHead[0].courseGroupId;
    // G requires heads.length > 0 else info toast and skip API.
    let courseGroupId = 0
    let flag = true
    if (staffType === 'R') {
      courseGroupId = Number(deptHeads[0]?.courseGroupId ?? 0)
      flag = true
    } else if (deptHeads.length > 0) {
      courseGroupId = Number(deptHeads[0]?.courseGroupId ?? 0)
      flag = true
    } else {
      flag = false
    }

    if (!flag) {
      toastInfo(
        'Department is not synchronised with course group, please contact system admin.',
      )
      return
    }

    // Angular in_issamedept: 1 for R, 0 for G
    const inIssamedept: 0 | 1 = staffType === 'R' ? 1 : 0

    setLoading(true)
    setStaff([])
    try {
      const rows = await listStaffAttendanceNotMarkedByDepartment({
        dateYmd: ymd,
        departmentId: deptId,
        courseGroupId,
        inIssamedept,
      })
      setStaff(rows)
      setLastQuery({ dateYmd: ymd, departmentId: deptId, courseGroupId, inIssamedept })
      if (rows.length === 0) toastSuccess('No staff found for this filter.')
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport() {
    // Angular download() — same query params as getStaffAttendance
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
    <FilteredListPage
      title="Attendance not taken list Staff"
      filters={(
        <div className="space-y-4">
          <RadioGroup
            value={staffType}
            onValueChange={(v) => onStaffTypeChange(v as 'R' | 'G')}
            className="flex flex-row flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="R" id="staff-type-r" />
              <Label htmlFor="staff-type-r" className="cursor-pointer font-normal text-sm">
                Dept Emp
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="G"
                id="staff-type-g"
                disabled={otherDeptDisabled}
              />
              <Label
                htmlFor="staff-type-g"
                className={`font-normal text-sm ${
                  otherDeptDisabled
                    ? 'cursor-not-allowed text-muted-foreground'
                    : 'cursor-pointer'
                }`}
              >
                {otherDeptLabel}
              </Label>
            </div>
          </RadioGroup>

          <GlobalFilterBarRow columns={3}>
            <GlobalFilterField label="Department *">
              <Select
                value={departmentId ? String(departmentId) : null}
                onChange={(v) => setDepartmentId(v ? Number(v) : null)}
                options={departmentOptions}
                placeholder="Department"
                searchable
                disabled={isHod}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Date *">
              <DatePicker value={day} onChange={setDay} clearable={false} />
            </GlobalFilterField>
            <div className="flex items-end">
              <Button type="button" onClick={() => void getStaff()} disabled={loading}>
                {loading ? 'Loading…' : 'Get Staff'}
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      )}
      rowData={staff}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Staff Not Marking Attendance Report',
      }}
      toolbarTrailing={(
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-[30px]"
          disabled={downloading || !lastQuery}
          onClick={() => void downloadReport()}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {downloading ? 'Downloading…' : 'Download Report'}
        </Button>
      )}
    />
  )
}
