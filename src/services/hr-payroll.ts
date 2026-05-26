import { APPRAISAL_API, EMPLOYEE_API, HR_PAYROLL_API, LEAVE_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import { ENTITIES } from '@/config/constants/entities'
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  putDetails,
} from './crud'
import { listGeneralDetailsByCode } from './student-information'

type AnyRow = Record<string, unknown>

function normalizeListPayload(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[]
    if (Array.isArray(obj.content)) return obj.content as AnyRow[]
    if (Array.isArray(obj.result)) return obj.result as AnyRow[]
  }
  return []
}

/** Angular `listAllDetails` on PayrollCategory — all categories for list page. */
export async function listPayrollCategories(): Promise<AnyRow[]> {
  try {
    const data = await fetchDetails<{ resultList?: AnyRow[] }>(ENTITIES.PAYROLL_CATEGORY.name, {
      isActive: 'true',
    })
    if (Array.isArray(data?.resultList) && data.resultList.length > 0) return data.resultList
  } catch {
    // fall through to domain list
  }
  const rows = await domainList<AnyRow>(ENTITIES.PAYROLL_CATEGORY.name, buildQuery({ isActive: true }))
  if (rows.length > 0) return rows
  return domainList<AnyRow>(ENTITIES.PAYROLL_CATEGORY.name, buildQuery({}))
}

export async function getPayrollCategoryById(payrollCategoryId: number): Promise<AnyRow | null> {
  if (!payrollCategoryId) return null
  const rows = await domainList<AnyRow>(
    ENTITIES.PAYROLL_CATEGORY.name,
    buildQuery({ payrollCategoryId }),
  )
  return rows[0] ?? null
}

/** Categories in a college — formula helper table on add/edit form. */
export async function listPayrollCategoriesByCollege(collegeId: number): Promise<AnyRow[]> {
  if (!collegeId) return []
  const queries = [
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.PAYROLL_CATEGORY.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

/** Angular edit guard — category assigned to payroll groups. */
export async function listPayrollCategoryGroupsByCategoryId(
  payrollCategoryId: number,
): Promise<AnyRow[]> {
  if (!payrollCategoryId) return []
  const queries = [
    buildQuery({ 'payrollCategory.payrollCategoryId': payrollCategoryId }),
    buildQuery({ payrollCategoryId }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(HR_PAYROLL_API.PAYROLL_CATEGORY_GROUP, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

/** Angular `add(payRollCategoryUrl, …)` — used for both create and update. */
export async function savePayrollCategory(payload: AnyRow): Promise<unknown> {
  return postDetails(HR_PAYROLL_API.PAYROLL_CATEGORY_SAVE, payload)
}

export function enrichPayrollGroupCategories(rows: AnyRow[]): AnyRow[] {
  return rows.map((row) => {
    const groups = row.payrollCategoryGroups
    if (!Array.isArray(groups) || groups.length === 0) return row
    const codes = groups
      .map((g: AnyRow) => String(g.payrollCategoryCode ?? ''))
      .filter(Boolean)
    return { ...row, categories: codes.join(', ') }
  })
}

export async function listPayrollGroups(): Promise<AnyRow[]> {
  const data = await fetchDetails<unknown>(HR_PAYROLL_API.PAYROLL_GROUPS)
  return enrichPayrollGroupCategories(normalizeListPayload(data))
}

export async function getPayrollGroupById(payrollGroupId: number): Promise<AnyRow | null> {
  if (!payrollGroupId) return null
  const rows = await domainList<AnyRow>('PayrollGroup', buildQuery({ payrollGroupId }))
  return rows[0] ?? null
}

export async function listPaymentFrequencies(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.FEE_FREQUENCY)
}

/** Angular `add(payrollGroupUrl, …)` — create and update. */
export async function savePayrollGroup(payload: AnyRow): Promise<unknown> {
  return postDetails(HR_PAYROLL_API.PAYROLL_GROUP_SAVE, payload)
}

export async function listPayslipSettings(): Promise<AnyRow[]> {
  const data = await domainList<AnyRow>(
    ENTITIES.PAYSLIP_SETTING.name,
    buildQuery({ isActive: true }),
  )
  return data
}

export async function listDepartmentHeads(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.EMP_DEPT_HEADS.name, buildQuery({ isActive: true }))
}

export async function createDepartmentHead(payload: AnyRow): Promise<unknown> {
  return domainCreate(ENTITIES.EMP_DEPT_HEADS.name, payload)
}

export async function updateDepartmentHead(id: number, payload: Partial<AnyRow>): Promise<unknown> {
  return domainUpdate(ENTITIES.EMP_DEPT_HEADS.name, ENTITIES.EMP_DEPT_HEADS.pk, id, payload)
}

export async function listLeaveTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    ENTITIES.LEAVE_TYPE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createLeaveType(payload: AnyRow): Promise<unknown> {
  return domainCreate(ENTITIES.LEAVE_TYPE.name, payload)
}

export async function updateLeaveType(
  leaveTypeId: number,
  payload: Partial<AnyRow>,
): Promise<unknown> {
  return domainUpdate(
    ENTITIES.LEAVE_TYPE.name,
    ENTITIES.LEAVE_TYPE.pk,
    leaveTypeId,
    payload,
  )
}

/** Angular `listDetailsByTwoIds` — GeneralDetail for LEAVETYPEDUR master code. */
export async function listLeaveTypeDurations(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.LEAVE_TYPE_DURATION, isActive: true }),
    buildQuery({ generalMasterCode: GM_CODES.LEAVE_TYPE_DURATION, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export function resolveLeaveTypeId(row: AnyRow): number {
  return Number(row.leavetypeId ?? row.leaveTypeId ?? 0)
}

export async function listLeaveApplications(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.LEAVE_APPLICATION.name, buildQuery({ isActive: true }))
}

/** Angular `listAllMasterDetails(getYears)` → `{ yearSet: string[] }`. */
export async function getLeaveYears(): Promise<string[]> {
  const raw = await fetchDetails<Record<string, unknown>>(LEAVE_API.LEAVE_YEARS)
  const data = (raw?.data ?? raw) as Record<string, unknown> | unknown
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const yearSet = (data as Record<string, unknown>).yearSet
    if (Array.isArray(yearSet)) return yearSet.map(String)
  }
  if (Array.isArray(data)) return data.map(String)
  return []
}

/** Active leave types for current organization (Angular college filter on leave types list). */
export async function listLeaveTypesForEntitlement(organizationId: number): Promise<AnyRow[]> {
  if (!organizationId) return []
  const queries = [
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
    buildQuery({ organizationId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LEAVE_TYPE.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return listLeaveTypes()
}

export async function listEmployeesForLeaveEntitlement(
  collegeId: number,
  departmentId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !departmentId) return []
  const queries = [
    buildQuery({
      'College.collegeId': collegeId,
      'employeeDepartment.departmentId': departmentId,
      isActive: true,
      'employeeStatus.generalDetailCode': GM_CODES.EMP_ACTIVE_STATUS,
    }),
    buildQuery({
      'College.collegeId': collegeId,
      'EmployeeDepartment.departmentId': departmentId,
      isActive: true,
      'employeeStatus.generalDetailCode': GM_CODES.EMP_ACTIVE_STATUS,
    }),
    buildQuery({
      collegeId,
      departmentId,
      isActive: true,
      employeeStatus: GM_CODES.EMP_ACTIVE_STATUS,
    }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.EMPLOYEE_DETAIL.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

/** GET `leaveentitlementbydept?collegeId&leaveYear&departmentId&status=true`. */
export async function listLeaveEntitlementsByDept(
  collegeId: number,
  leaveYear: string,
  departmentId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !leaveYear || !departmentId) return []
  const raw = await fetchDetails<unknown>(LEAVE_API.LEAVE_ENTITLEMENT_BY_DEPT, {
    collegeId,
    leaveYear,
    departmentId,
    status: 'true',
  })
  if (Array.isArray(raw)) return raw as AnyRow[]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as AnyRow[]
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[]
  }
  return []
}

export async function saveLeaveEntitlements(rows: AnyRow[]): Promise<unknown> {
  return postDetails(LEAVE_API.LEAVE_ENTITLEMENT_POST, rows)
}

/** Angular `listDetailsByThreeIds(LeaveEntitlement, collegeId, employeeId, leaveYear, ...)`. */
export async function listLeaveEntitlementsForEmployee(
  collegeId: number,
  employeeId: number,
  leaveYear: string,
): Promise<AnyRow[]> {
  if (!collegeId || !employeeId || !leaveYear) return []
  const queries = [
    buildQuery({
      'College.collegeId': collegeId,
      'employeeDetail.employeeId': employeeId,
      leaveYear,
    }),
    buildQuery({
      collegeId,
      employeeId,
      leaveYear,
    }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(ENTITIES.LEAVE_ENTITLEMENT.name, q)
    } catch {
      // try next query shape
    }
  }
  return []
}

export type LeaveAllotmentTypeRow = {
  leavetypeId: number
  leaveName: string
  leaveCode: string
  leaveCount: number
  allocatedLeaves: number
  leaveEntitlementId?: number
  collegeId: number
  leaveYear: string
  employeeId: number
}

/** Merge org leave types with employee entitlements (Angular leave-enrolment). */
export function buildLeaveAllotmentTypeRows(
  leaveTypes: AnyRow[],
  entitlements: AnyRow[],
  collegeId: number,
  leaveYear: string,
  employeeId: number,
): LeaveAllotmentTypeRow[] {
  return leaveTypes.map((lt) => {
    const typeId = resolveLeaveTypeId(lt)
    const ent = entitlements.find((e) => Number(e.leavetypeId ?? e.leaveTypeId) === typeId)
    return {
      leavetypeId: typeId,
      leaveName: String(lt.leaveName ?? ''),
      leaveCode: String(lt.leaveCode ?? ''),
      leaveCount: Number(lt.leaveCount ?? 0),
      allocatedLeaves: ent
        ? Number(ent.allocatedLeaves ?? 0)
        : Number(lt.leaveCount ?? 0),
      leaveEntitlementId: ent ? Number(ent.leaveEntitlementId) : undefined,
      collegeId,
      leaveYear,
      employeeId,
    }
  })
}

export type LeaveEntitlementEmployeeRow = {
  employeeId: number
  firstName: string
  empNumber: string
  counts: number[]
  isUpdate: boolean
  leaveEntitlementId?: number
  createdDt?: unknown
}

/** Build editable grid rows: default leave counts + existing entitlement overrides. */
export function buildLeaveEntitlementEmployeeRows(
  employees: AnyRow[],
  leaveTypes: AnyRow[],
  entitlements: AnyRow[],
): LeaveEntitlementEmployeeRow[] {
  return employees.map((emp) => {
    const employeeId = Number(emp.employeeId)
    const counts = leaveTypes.map((lt) => Number(lt.leaveCount ?? 0))
    const existing = entitlements.filter((e) => Number(e.employeeId) === employeeId)
    let leaveEntitlementId: number | undefined
    let createdDt: unknown
    for (const ent of existing) {
      leaveEntitlementId = Number(ent.leaveEntitlementId ?? leaveEntitlementId)
      createdDt = ent.createdDt ?? createdDt
      const typeId = Number(ent.leavetypeId ?? ent.leaveTypeId)
      const idx = leaveTypes.findIndex(
        (lt) => Number(lt.leavetypeId ?? lt.leaveTypeId) === typeId,
      )
      if (idx >= 0) counts[idx] = Number(ent.allocatedLeaves ?? counts[idx])
    }
    return {
      employeeId,
      firstName: String(emp.firstName ?? ''),
      empNumber: String(emp.empNumber ?? ''),
      counts,
      isUpdate: existing.length === 0,
      leaveEntitlementId,
      createdDt,
    }
  })
}

export async function getStaffPayrollList(
  params: Record<string, string | number>,
): Promise<AnyRow[][]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(HR_PAYROLL_API.STAFF_PAYROLL_LIST, params)
  return Array.isArray(data?.result) ? data.result : []
}

export type StaffPayrollReportParams = {
  reportFlag: 'payroll_audit' | 'monthly_payroll'
  month: number
  year: number
  collegeId: number
  departmentId: number
  empCategoryId: number
  employeeId?: number
}

/** Angular `listBySevenIds` on `s_staff_payroll_list` — pivot rows are in `result[0]`. */
export async function getStaffPayrollReportRows(
  params: StaffPayrollReportParams,
): Promise<AnyRow[]> {
  const chunks = await getStaffPayrollList({
    in_flag: params.reportFlag,
    in_month: params.month,
    in_year: params.year,
    in_college_id: params.collegeId,
    in_empId: params.employeeId ?? 0,
    in_deptID: params.departmentId,
    in_categoryId: params.empCategoryId,
  })
  const flat = chunks[0]
  return Array.isArray(flat) ? flat : []
}

export async function listEmployeePayrollGroupByPayrollGroup(
  payrollGroupId: number,
  size = 999,
): Promise<AnyRow[]> {
  const data = await fetchDetails<unknown>(HR_PAYROLL_API.EMPLOYEE_PAYROLL_GROUP, {
    payrollGroupId,
    isActive: 'true',
    size,
  })
  return normalizeListPayload(data)
}

export async function listEmployeePayrollGroupByCollege(
  collegeId: number,
  size = 999,
): Promise<AnyRow[]> {
  const data = await fetchDetails<unknown>(HR_PAYROLL_API.EMPLOYEE_PAYROLL_GROUP, {
    collegeId,
    isActive: 'true',
    size,
  })
  return normalizeListPayload(data)
}

export async function listEmployeePayslipGenerations(): Promise<AnyRow[]> {
  try {
    const data = await fetchDetails<{ resultList?: AnyRow[] }>('EmployeePayslipGeneration', {
      isActive: 'true',
    })
    if (Array.isArray(data?.resultList)) return data.resultList
  } catch {
    // fall through to domain list
  }
  return domainList<AnyRow>('EmployeePayslipGeneration', buildQuery({ isActive: true }))
}

export async function listEmployeePayslipGenerationsByCollege(
  collegeId: number,
): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ 'college.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('EmployeePayslipGeneration', q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  const all = await listEmployeePayslipGenerations()
  return all.filter((r) => {
    const cid = Number(r.collegeId ?? (r.college as AnyRow | undefined)?.collegeId ?? 0)
    return cid === collegeId
  })
}

export async function listEmployeePayslipGenerationsByDate(
  payslipGenerationDate: string,
): Promise<AnyRow[]> {
  const data = await fetchDetails<unknown>(HR_PAYROLL_API.EMP_PAYSLIP_BY_DATE, {
    payslipgenerationDate: payslipGenerationDate,
  })
  return normalizeListPayload(data)
}

/** Merge payslip month onto payroll-group employee rows (Angular payslip screens). */
export function enrichEmployeesWithPayslipMonths(
  employees: AnyRow[],
  payslips: AnyRow[],
): AnyRow[] {
  return employees.map((emp) => {
    const employeeId = Number(emp.employeeId)
    const slip = payslips.find((p) => Number(p.employeeId) === employeeId)
    return { ...emp, generatedDate: slip?.payslipMonth ?? null }
  })
}

/** Attach LOP structure fields for loss-of-pay entry (Angular `employee-loss-of-pay`). */
export function enrichEmployeesWithLop(employees: AnyRow[]): AnyRow[] {
  return employees.map((emp) => {
    const structures = Array.isArray(emp.employeeSalaryStructure)
      ? (emp.employeeSalaryStructure as AnyRow[])
      : []
    const lop = structures.find((s) => String(s.payrollCategoryCode) === 'LOP')
    return {
      ...emp,
      empSalaryStructureId: lop ? Number(lop.empSalaryStructureId) : undefined,
      Lopamount: lop != null ? Number(lop.amount ?? 0) : 0,
    }
  })
}

/** Monthly payslip grid — gross/net only when payslip month matches selected month. */
export function enrichMonthlyPayslipEmployees(
  employees: AnyRow[],
  payslips: AnyRow[],
  generationDate: Date,
): AnyRow[] {
  const genM = generationDate.getMonth()
  const genY = generationDate.getFullYear()
  return employees.map((emp) => {
    const slip = payslips.find((p) => Number(p.employeeId) === Number(emp.employeeId))
    let generatedDate: unknown = null
    let grossPay: unknown = null
    let netAmount: unknown = null
    let empPayslipGenerationId: unknown
    if (slip?.payslipMonth) {
      const d = new Date(String(slip.payslipMonth))
      if (!Number.isNaN(d.getTime()) && d.getMonth() === genM && d.getFullYear() === genY) {
        generatedDate = slip.payslipMonth
        grossPay = slip.grossPay
        netAmount = slip.netPay
        empPayslipGenerationId = slip.empPayslipGenerationId
      }
    }
    return { ...emp, generatedDate, grossPay, netAmount, empPayslipGenerationId }
  })
}

export async function updateEmployeeLossOfPay(
  rows: { empSalaryStructureId: number; amount: number }[],
): Promise<unknown> {
  return putDetails(HR_PAYROLL_API.UPDATE_LOP, rows)
}

export async function generateMonthlyPayslips(payload: AnyRow): Promise<unknown> {
  return postDetails(HR_PAYROLL_API.PAYSLIP_GENERATIONS, payload)
}

export async function sendPayslipEmails(payload: AnyRow): Promise<unknown> {
  return postDetails(HR_PAYROLL_API.PAYSLIP_EMAIL, payload)
}

export async function listEmployeeCategoriesForPayroll(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.EMPLOYEE_CATEGORY)
}

const HR_EXCLUDED_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'SECURITY'])

export async function listEmployeeDetails(): Promise<AnyRow[]> {
  const data = await domainList<AnyRow>(
    ENTITIES.EMPLOYEE_DETAIL.name,
    buildQuery({ isActive: true }),
  )
  return data.filter((row) => !HR_EXCLUDED_ROLES.has(String(row.roleName ?? '')))
}

export async function listEmployeeReporting(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.EMPLOYEE_REPORTING.name, buildQuery({ isActive: true }))
}

/** Angular `listDetailsById(EmployeeReporting, employeeId, 'employeeDetail.employeeId')`. */
export async function listEmployeeReportingByEmployee(employeeId: number): Promise<AnyRow[]> {
  if (!employeeId) return []
  return domainList<AnyRow>(
    ENTITIES.EMPLOYEE_REPORTING.name,
    buildQuery({ 'employeeDetail.employeeId': employeeId }),
  )
}

/** Angular `cms/employeesearch` with `q` + `empStatus=ACTV` (+ optional `collegeId`, min 4 chars). */
export async function searchEmployeesForHr(
  term: string,
  collegeId?: number,
): Promise<AnyRow[]> {
  const q = term.trim()
  if (q.length < 4) return []
  const params: Record<string, string | number> = { q, empStatus: 'ACTV' }
  if (collegeId) params.collegeId = collegeId

  const paths = [EMPLOYEE_API.EMPLOYEE_SEARCH, 'employeesearch'] as const
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, params)
      return normalizeListPayload(data)
    } catch {
      // try legacy path without cms/ prefix
    }
  }

  if (collegeId) {
    const rows = await domainList<AnyRow>(
      ENTITIES.EMPLOYEE_DETAIL.name,
      buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    )
    const needle = q.toLowerCase()
    return rows
      .filter((r) => {
        const name = String(r.firstName ?? '').toLowerCase()
        const num = String(r.empNumber ?? '').toLowerCase()
        return name.includes(needle) || num.includes(needle)
      })
      .slice(0, 50)
  }

  return []
}

/** Angular `employeedetailsbyid?employeeId=` on assign reporting manager. */
export async function getEmployeeByIdForHr(employeeId: number): Promise<AnyRow | null> {
  if (!employeeId) return null
  const data = await fetchDetails<AnyRow>(EMPLOYEE_API.DETAILS_BY_USER_ID, { employeeId })
  return data && typeof data === 'object' ? data : null
}

/** Assign page manager search — Angular uses `employeesearch?q=` only (no collegeId). */
export async function searchEmployeesForManagerAssign(term: string): Promise<AnyRow[]> {
  const q = term.trim()
  if (q.length < 4) return []
  const paths = [EMPLOYEE_API.EMPLOYEE_SEARCH, 'employeesearch'] as const
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, { q })
      const rows = normalizeListPayload(data)
      if (rows.length > 0) return rows
      if (Array.isArray(data)) return data as AnyRow[]
    } catch {
      // try next path
    }
  }
  return []
}

export async function listActiveDesignationsForHr(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.DESIGNATION.name, buildQuery({ isActive: true }))
}

/** Angular `assignemployeemanager` — create or update assignment. */
export async function assignEmployeeReportingManager(payload: AnyRow): Promise<unknown> {
  return postDetails(EMPLOYEE_API.ASSIGN_MANAGER, payload)
}

/** Angular `listDetailsById(EmpPerfAssessmentFeedback, employeeId, 'empId.employeeId')`. */
export async function listPerformanceAssessmentByEmployee(employeeId: number): Promise<AnyRow[]> {
  if (!employeeId) return []
  const rows = await domainList<AnyRow>(
    ENTITIES.EMP_PERF_ASSESSMENT_FEEDBACK.name,
    buildQuery({ 'empId.employeeId': employeeId }),
  )
  return [...rows].sort(
    (a, b) => Number(b.assessmentFeedbackId ?? 0) - Number(a.assessmentFeedbackId ?? 0),
  )
}

export async function listSelfAppraisalFormsByCollege(collegeId: number): Promise<AnyRow[]> {
  if (!collegeId) return []
  return domainList<AnyRow>(
    ENTITIES.EMP_SELF_APPRAISAL_FORM.name,
    buildQuery({ 'College.collegeId': collegeId }),
  )
}

export async function createSelfAppraisalForm(payload: AnyRow): Promise<unknown> {
  return domainCreate(ENTITIES.EMP_SELF_APPRAISAL_FORM.name, payload)
}

export async function updateSelfAppraisalForm(
  selfAppraisalFormId: number,
  payload: Partial<AnyRow>,
): Promise<unknown> {
  return domainUpdate(
    ENTITIES.EMP_SELF_APPRAISAL_FORM.name,
    ENTITIES.EMP_SELF_APPRAISAL_FORM.pk,
    selfAppraisalFormId,
    payload,
  )
}

export async function saveSelfAppraisalFormDetails(details: AnyRow[]): Promise<unknown> {
  return postDetails(APPRAISAL_API.FORM_DETAIL_SERVICES, details)
}

/** Mirrors Angular formDetails() payload enrichment before POST. */
export function prepareSelfAppraisalFormDetailsPayload(
  formRow: AnyRow,
  details: AnyRow[],
): AnyRow[] {
  const formDto = {
    collegeId: formRow.collegeId,
    createdDt: formRow.createdDt,
    createdUser: formRow.createdUser,
    endDate: formRow.endDate,
    isActive: formRow.isActive,
    reason: formRow.reason,
    selfAppraisalFormId: formRow.selfAppraisalFormId,
    startDate: formRow.startDate,
    title: formRow.title,
    updatedDt: formRow.updatedDt,
    updatedUser: formRow.updatedUser,
  }
  return details.map((d) => ({
    ...d,
    collegeId: formRow.collegeId,
    empSelfappraisalFormDTO: formDto,
  }))
}

export async function getPerformanceAssessmentQuestions(): Promise<AnyRow[]> {
  const data = await fetchDetails<unknown>(HR_PAYROLL_API.GET_EMP_PERF_ASSESSMENT)
  if (Array.isArray(data)) return data
  return normalizeListPayload(data)
}

export async function listRoomsByRoomType(roomTypeId: number): Promise<AnyRow[]> {
  if (!roomTypeId) return []
  return domainList<AnyRow>(
    ENTITIES.ROOM.name,
    buildQuery({ 'RoomType.roomTypeId': roomTypeId, isActive: true }),
  )
}

export type BiometricShiftDetailsResult = {
  rows: AnyRow[]
  totalCount: number
  page: number
  pageSize: number
}

function flattenBiometricShiftRows(
  data: unknown,
  unassignedOnly: boolean,
): AnyRow[] {
  const list = Array.isArray(data) ? data : []
  const rows: AnyRow[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const dto = (row.empAttendanceEmployeeDTO ?? row) as AnyRow
    const shift = row.shiftDTO as AnyRow | undefined
    const merged: AnyRow = {
      ...dto,
      shiftDTO: shift ?? dto.shiftDTO,
    }
    if (unassignedOnly && merged.empId != null) continue
    rows.push(merged)
  }
  return rows
}

/** Angular `shiftdetails` — status=1 with optional college filter and pagination. */
export async function listBiometricShiftDetails(options: {
  collegeId?: number | null
  page?: number
  pageSize?: number
  unassignedOnly?: boolean
}): Promise<BiometricShiftDetailsResult> {
  const page = options.page ?? 0
  const pageSize = options.pageSize ?? (options.collegeId ? 50 : 500)
  const params: Record<string, string | number> = {
    status: 1,
    page,
    size: pageSize,
  }
  if (options.collegeId) params.collegeId = options.collegeId

  const raw = await fetchDetails<Record<string, unknown>>(HR_PAYROLL_API.SHIFT_DETAILS, params)
  const data = raw?.data ?? raw
  const rows = flattenBiometricShiftRows(data, options.unassignedOnly === true)
  const totalCount =
    options.unassignedOnly === true
      ? rows.length
      : Number(raw?.totalCount ?? rows.length)
  return {
    rows,
    totalCount,
    page: Number(raw?.page ?? page),
    pageSize: Number(raw?.pageSize ?? pageSize),
  }
}

export async function updateBiometricAttendanceEmployee(
  attendanceEmpsId: number,
  payload: Partial<AnyRow>,
): Promise<unknown> {
  return domainUpdate(
    ENTITIES.EMP_ATTENDANCE_EMPLOYEE.name,
    ENTITIES.EMP_ATTENDANCE_EMPLOYEE.pk,
    attendanceEmpsId,
    payload,
  )
}

export async function listShiftsForHr(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.SHIFT.name, buildQuery({ isActive: true }))
}

/** Angular `listDetailsById(EmployeeShift, employeeId, 'employeeDetail.employeeId')`. */
export async function listEmployeeShiftsByEmployee(employeeId: number): Promise<AnyRow[]> {
  if (!employeeId) return []
  return domainList<AnyRow>(
    ENTITIES.EMPLOYEE_SHIFT.name,
    buildQuery({ 'employeeDetail.employeeId': employeeId }),
  )
}

export async function saveEmployeeShifts(rows: AnyRow[]): Promise<unknown> {
  return postDetails(HR_PAYROLL_API.EMPLOYEE_SHIFTS, rows)
}
