export interface WorkflowMemberAuthorization {
  wfMemberAuthorizationId: number
  organizationId: number
  collegeId: number
  collegeCode?: string
  wfForCode: string
  wfForName?: string
  wfStage: number
  wfStageName?: string
  roleId?: number | null
  roleName?: string
  employeeDetailId?: number | null
  employeeName?: string
  storeId?: number | null
  storeName?: string
  isActive: boolean
  reason?: string
}
