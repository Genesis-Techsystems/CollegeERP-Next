import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { WorkflowMemberAuthorization } from '@/types/workflow-member-authorization'
import { buildQuery, domainCreate, domainList, domainUpdate, getAllRecords } from '../crud'

const WORKFLOW_MEMBER_AUTH_PROC = 's_get_inventorydetails_bycode'

const BASE_WORKFLOW_MEMBER_AUTH_PROC = {
  in_flag: 'workflow_memberauthorizations_filters,workflow_memberauthorizations_list',
  in_store_id: 0,
  in_college_id: 0,
  in_academic_year: '',
  in_isadmin: 0,
  in_from_date: '1990-01-01',
  in_to_date: '1990-01-01',
  in_loginuser_empid: 0,
  in_loginuser_roleid: 0,
} as const

export interface WorkflowMemberAuthorizationWfRow {
  wf_for_code: string
  wf_for: string
  wf_stage: number
  wf_name: string
}

export interface WorkflowMemberAuthorizationRoleRow {
  pk_role_id: number
  role_name: string
}

export interface WorkflowMemberAuthorizationEmployeeRow {
  pk_emp_id: number
  last_name: string
  mobile?: string
  role_name?: string
  fk_emp_role_id: number
}

export interface WorkflowMemberAuthorizationStoreRow {
  pk_store_id: number
  store_name: string
}

export interface WorkflowMemberAuthorizationFormFilters {
  wfRows: WorkflowMemberAuthorizationWfRow[]
  wfCodes: WorkflowMemberAuthorizationWfRow[]
  wfStages: WorkflowMemberAuthorizationWfRow[]
  roles: WorkflowMemberAuthorizationRoleRow[]
  employees: WorkflowMemberAuthorizationEmployeeRow[]
  stores: WorkflowMemberAuthorizationStoreRow[]
}

function procRows<T>(data: { result?: T[][] } | null | undefined, index = 0): T[] {
  const rows = data?.result?.[index]
  return Array.isArray(rows) ? rows : []
}

function distinctBy<T>(rows: T[], keyFn: (row: T) => unknown): T[] {
  const seen = new Set<unknown>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getWorkflowMemberAuthorizationFormFilters(
  organizationId: number,
): Promise<WorkflowMemberAuthorizationFormFilters> {
  const data = await getAllRecords<{ result: unknown[][] }>(WORKFLOW_MEMBER_AUTH_PROC, {
    ...BASE_WORKFLOW_MEMBER_AUTH_PROC,
    in_org_id: organizationId > 0 ? organizationId : 1,
  }).catch(() => ({ result: [] as unknown[][] }))

  const wfRows = procRows<WorkflowMemberAuthorizationWfRow>(data as { result?: WorkflowMemberAuthorizationWfRow[][] }, 0)
  const roles = procRows<WorkflowMemberAuthorizationRoleRow>(data as { result?: WorkflowMemberAuthorizationRoleRow[][] }, 1)
  const employees = procRows<WorkflowMemberAuthorizationEmployeeRow>(data as { result?: WorkflowMemberAuthorizationEmployeeRow[][] }, 2)
  const stores = procRows<WorkflowMemberAuthorizationStoreRow>(data as { result?: WorkflowMemberAuthorizationStoreRow[][] }, 3)

  return {
    wfRows,
    wfCodes: distinctBy(wfRows, (row) => row.wf_for_code),
    wfStages: distinctBy(wfRows, (row) => row.wf_stage),
    roles,
    employees,
    stores,
  }
}

export async function listWorkflowMemberAuthorizations(): Promise<WorkflowMemberAuthorization[]> {
  return domainList<WorkflowMemberAuthorization>(
    ENTITIES.WORKFLOW_MEMBER_AUTHORIZATION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createWorkflowMemberAuthorization(
  data: Omit<WorkflowMemberAuthorization, 'wfMemberAuthorizationId'>,
): Promise<WorkflowMemberAuthorization> {
  return domainCreate<WorkflowMemberAuthorization>(ENTITIES.WORKFLOW_MEMBER_AUTHORIZATION.name, data)
}

export async function updateWorkflowMemberAuthorization(
  wfMemberAuthorizationId: number,
  data: Partial<Omit<WorkflowMemberAuthorization, 'wfMemberAuthorizationId'>>,
): Promise<WorkflowMemberAuthorization> {
  return domainUpdate<WorkflowMemberAuthorization>(
    ENTITIES.WORKFLOW_MEMBER_AUTHORIZATION.name,
    ENTITIES.WORKFLOW_MEMBER_AUTHORIZATION.pk,
    wfMemberAuthorizationId,
    { wfMemberAuthorizationId, ...data },
  )
}

export async function listActiveCollegesForWorkflowAuthorization(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}
