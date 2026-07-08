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
  availableFor?: number | string | null
  goBackPoint?: boolean | number | null
  isSelfAvailable?: boolean | number | null
  isActive: boolean
  reason?: string
}
