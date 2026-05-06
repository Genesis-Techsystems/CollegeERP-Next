import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { Organization } from '@/types/organization'
import type { WorkflowStage } from '@/types/workflow-stage'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listWorkflowStages(): Promise<WorkflowStage[]> {
  return domainList<WorkflowStage>(
    ENTITIES.WORKFLOW_STAGE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createWorkflowStage(
  data: Omit<WorkflowStage, 'workflowStageId'>,
): Promise<WorkflowStage> {
  return domainCreate<WorkflowStage>(ENTITIES.WORKFLOW_STAGE.name, data)
}

export async function updateWorkflowStage(
  workflowStageId: number,
  data: Partial<Omit<WorkflowStage, 'workflowStageId'>>,
): Promise<WorkflowStage> {
  return domainUpdate<WorkflowStage>(
    ENTITIES.WORKFLOW_STAGE.name,
    ENTITIES.WORKFLOW_STAGE.pk,
    workflowStageId,
    { workflowStageId, ...data },
  )
}

export async function listActiveOrganizationsForWorkflowStages(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}

export async function listActiveCollegesByOrganizationForWorkflowStages(
  organizationId: number,
): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({
      'Organization.organizationId': organizationId,
      isActive: true,
    }),
  )
}
