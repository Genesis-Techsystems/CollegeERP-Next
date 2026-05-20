export interface DocumentRepository {
  documentRepositoryId: number
  organizationId: number
  universityId: number
  collegeId: number
  courseId: number
  docTypeId: number
  docFormId: number
  docName: string
  docCode?: string
  fileNameFormat?: string
  isForStudent?: boolean
  isForEmp?: boolean
  isMandatory?: boolean
  isActive: boolean
  reason?: string
  orgCode?: string
  universityCode?: string
  collegeCode?: string
  courseCode?: string
  docTypeName?: string
  docFormName?: string
}

