export interface CampusIssue {
  managementIssueId: number
  issueTitle: string
  issueDescription: string
  issueLogDate: string
  expectedResolvedOn: string
  actualResolvedOn?: string | null
  location?: string | null
  statusComments: string
  wfStatusComments?: string | null
  closingComments?: string | null

  raisedEmpId: number
  raisedEmpName: string
  raisedEmpNumber: string

  inchargeEmpId?: number | null
  inchargeEmpName?: string | null
  inchargeEmpNumber?: string | null

  closedEmpId?: number | null
  closedEmpName?: string | null

  collegeId: number
  collegeCode: string
  collegeName: string

  departmentId?: number | null
  deptCode?: string | null
  deptName?: string | null

  issueInroomId?: number | null
  issueInroomCode?: string | null
  issueInroomName?: string | null

  issuepriorityCatId?: number | null
  issuepriorityCatCode?: string | null
  issuepriorityCatDisplayName?: string | null

  aprvrejstatusCatId?: number | null
  aprvrejstatusCatCode: string
  aprvrejstatusCatDisplayName?: string | null

  workflowStageId?: number | null
  wfName?: string | null

  itemDetId?: number | null
  itemBarCode?: string | null
  itemSerialNo?: string | null

  isClosed?: boolean | null
  isMgmtApprovalReq?: boolean | null
  isActive: boolean
  reason?: string

  statusRefPath?: string | null
  rating?: string | null
  feedback?: string | null
  createdDt?: string
  updatedDt?: string
}
