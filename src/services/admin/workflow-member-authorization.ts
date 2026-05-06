import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { WorkflowMemberAuthorization } from '@/types/workflow-member-authorization'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

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
