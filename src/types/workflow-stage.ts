export interface WorkflowStage {
  workflowStageId: number
  organizationId: number
  collegeId: number
  orgCode?: string
  collegeCode?: string
  wfName: string
  wfCode: string
  wfStage?: number
  wfFor?: string
  wfForCode: string
  wfStatus?: string
  availableFor?: string
  goBackPoint?: boolean
  isSelfAvailable?: boolean
  isActive: boolean
  reason?: string
}
