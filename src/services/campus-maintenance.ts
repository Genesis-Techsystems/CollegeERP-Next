import type { CampusIssue } from '@/types/campus-maintenance'
import { buildQuery, domainList, domainCreate, domainUpdate, uploadFile } from './crud'
import { ENTITIES } from '@/config/constants/entities'

const E = ENTITIES.MANAGEMENT_ISSUE

export async function listCampusIssues(): Promise<CampusIssue[]> {
  return domainList<CampusIssue>(
    E.name,
    buildQuery({ isActive: true }, { field: 'issueLogDate', direction: 'DESC' }),
  )
}

export async function listCampusIssuesByEmployee(empId: number): Promise<CampusIssue[]> {
  if (!empId) return []
  return domainList<CampusIssue>(
    E.name,
    buildQuery(
      { 'raisedEmpId.employeeId': empId, isActive: true },
      { field: 'issueLogDate', direction: 'DESC' },
    ),
  )
}

export async function getCampusIssue(id: number): Promise<CampusIssue | null> {
  const rows = await domainList<CampusIssue>(E.name, buildQuery({ managementIssueId: id }))
  return rows[0] ?? null
}

export async function createCampusIssue(data: Partial<CampusIssue>): Promise<CampusIssue> {
  return domainCreate<CampusIssue>(E.name, data)
}

export async function updateCampusIssue(id: number, data: Partial<CampusIssue>): Promise<CampusIssue> {
  return domainUpdate<CampusIssue>(E.name, E.pk, id, data)
}

export async function uploadIssueImages(
  managementIssueId: number,
  beforeFile?: File | null,
  afterFile?: File | null,
): Promise<void> {
  if (!beforeFile && !afterFile) return
  const formData = new FormData()
  formData.append('managementIssueId', String(managementIssueId))
  if (beforeFile) formData.append('beforeissue', beforeFile)
  if (afterFile) formData.append('afterissue', afterFile)
  await uploadFile('uploadissueimage', formData)
}
