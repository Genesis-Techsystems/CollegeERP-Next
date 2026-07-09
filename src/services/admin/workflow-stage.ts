import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { Organization } from '@/types/organization'
import type { WorkflowStage } from '@/types/workflow-stage'
import { asNullableString, asString } from '../angular-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type WorkflowStageWriteInput = Partial<Omit<WorkflowStage, 'workflowStageId'>> & Record<string, unknown>

function buildAngularWorkflowStagePayload(
  data: WorkflowStageWriteInput,
  workflowStageId?: number,
  existing?: WorkflowStage,
): Record<string, unknown> {
  const isActive = data.isActive === true
  const goBackPoint = data.goBackPoint === true || data.goBackPoint === 1
  const isSelfAvailable = data.isSelfAvailable === true || data.isSelfAvailable === 1
  const availableForRaw = data.availableFor ?? existing?.availableFor
  const availableForNum = availableForRaw == null || String(availableForRaw).trim() === ''
    ? null
    : Number(availableForRaw)

  const payload: Record<string, unknown> = {
    organizationId: Number(data.organizationId ?? existing?.organizationId),
    collegeId: Number(data.collegeId ?? existing?.collegeId),
    wfName: asString(data.wfName ?? existing?.wfName),
    wfCode: asString(data.wfCode ?? existing?.wfCode),
    wfStage: Number(data.wfStage ?? existing?.wfStage ?? 0),
    wfFor: asString(data.wfFor ?? existing?.wfFor),
    wfForCode: asString(data.wfForCode ?? existing?.wfForCode),
    wfStatus: asString(data.wfStatus ?? existing?.wfStatus),
    availableFor: Number.isFinite(availableForNum) ? availableForNum : null,
    goBackPoint: goBackPoint ? 1 : 0,
    isSelfAvailable: isSelfAvailable ? 1 : null,
    isActive,
    reason: isActive
      ? null
      : asNullableString(data.reason) ?? asNullableString(existing?.reason),
  }

  if (workflowStageId != null) {
    payload.workflowStageId = workflowStageId
  }

  return payload
}

export async function listWorkflowStages(): Promise<WorkflowStage[]> {
  return domainList<WorkflowStage>(
    ENTITIES.WORKFLOW_STAGE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createWorkflowStage(
  data: Omit<WorkflowStage, 'workflowStageId'>,
): Promise<WorkflowStage> {
  const payload = buildAngularWorkflowStagePayload(data as WorkflowStageWriteInput)
  return domainCreate<WorkflowStage>(ENTITIES.WORKFLOW_STAGE.name, payload)
}

export async function updateWorkflowStage(
  workflowStageId: number,
  data: Partial<Omit<WorkflowStage, 'workflowStageId'>>,
  existing?: WorkflowStage,
): Promise<WorkflowStage> {
  const payload = buildAngularWorkflowStagePayload(
    data as WorkflowStageWriteInput,
    workflowStageId,
    existing,
  )
  return domainUpdate<WorkflowStage>(
    ENTITIES.WORKFLOW_STAGE.name,
    ENTITIES.WORKFLOW_STAGE.pk,
    workflowStageId,
    payload,
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
