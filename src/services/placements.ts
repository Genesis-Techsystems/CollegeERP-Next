import type {
  Placement, Company, CompanyContact, CompanyMeeting,
  PlacementBroadcast, PlacementCompany, PlacementStudentRegistration,
  AchievementCategory, AchievementSubCategory, Achievement,
} from '@/types/placements'
import { buildQuery, domainList, domainCreate, domainUpdate } from './crud'
import { ENTITIES } from '@/config/constants/entities'

const EP = ENTITIES.PLACEMENT
const ECO = ENTITIES.COMPANY
const ECC = ENTITIES.COMPANY_CONTACT
const ECM = ENTITIES.COMPANY_MEETING
const EPB = ENTITIES.PLACEMENT_BROADCAST
const EPC = ENTITIES.PLACEMENT_COMPANY
const EPS = ENTITIES.PLACEMENT_STUDENT_REG
const EAC = ENTITIES.ACHIEVEMENT_CATEGORY
const EAS = ENTITIES.ACHIEVEMENT_SUB_CATEGORY
const EA = ENTITIES.ACHIEVEMENT

// ─── Placement ───────────────────────────────────────────────────────────────

export async function listPlacements(): Promise<Placement[]> {
  return domainList<Placement>(EP.name, buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }))
}

export async function listPlacementsByCampus(campusId: number): Promise<Placement[]> {
  return domainList<Placement>(
    EP.name,
    buildQuery({ 'Campus.campusId': campusId, isActive: true }, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createPlacement(data: Partial<Placement>): Promise<Placement> {
  return domainCreate<Placement>(EP.name, data)
}

export async function updatePlacement(id: number, data: Partial<Placement>): Promise<Placement> {
  return domainUpdate<Placement>(EP.name, EP.pk, id, data)
}

// ─── Company ─────────────────────────────────────────────────────────────────

export async function listCompanies(): Promise<Company[]> {
  return domainList<Company>(ECO.name, buildQuery({ isActive: true }))
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  return domainCreate<Company>(ECO.name, data)
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<Company> {
  return domainUpdate<Company>(ECO.name, ECO.pk, id, data)
}

// ─── Company Contact ──────────────────────────────────────────────────────────

export async function listCompanyContactsByCompany(companyId: number): Promise<CompanyContact[]> {
  return domainList<CompanyContact>(
    ECC.name,
    buildQuery({ 'Company.companyId': companyId, isActive: true }),
  )
}

export async function createCompanyContact(data: Partial<CompanyContact>): Promise<CompanyContact> {
  return domainCreate<CompanyContact>(ECC.name, data)
}

export async function updateCompanyContact(id: number, data: Partial<CompanyContact>): Promise<CompanyContact> {
  return domainUpdate<CompanyContact>(ECC.name, ECC.pk, id, data)
}

// ─── Company Meeting ──────────────────────────────────────────────────────────

export async function listCompanyMeetings(): Promise<CompanyMeeting[]> {
  return domainList<CompanyMeeting>(ECM.name, buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }))
}

export async function createCompanyMeeting(data: Partial<CompanyMeeting>): Promise<CompanyMeeting> {
  return domainCreate<CompanyMeeting>(ECM.name, data)
}

export async function updateCompanyMeeting(id: number, data: Partial<CompanyMeeting>): Promise<CompanyMeeting> {
  return domainUpdate<CompanyMeeting>(ECM.name, ECM.pk, id, data)
}

// ─── Placement Broadcast ──────────────────────────────────────────────────────

export async function listPlacementBroadcasts(yearName: string, posttypeCatdetId: number): Promise<PlacementBroadcast[]> {
  return domainList<PlacementBroadcast>(
    EPB.name,
    buildQuery({ yearName, posttypeCatdetId, isActive: true }, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createPlacementBroadcast(data: Partial<PlacementBroadcast>): Promise<PlacementBroadcast> {
  return domainCreate<PlacementBroadcast>(EPB.name, data)
}

export async function updatePlacementBroadcast(id: number, data: Partial<PlacementBroadcast>): Promise<PlacementBroadcast> {
  return domainUpdate<PlacementBroadcast>(EPB.name, EPB.pk, id, data)
}

// ─── Placement Company (requirements) ────────────────────────────────────────

export async function listPlacementCompaniesByPlacement(placementId: number): Promise<PlacementCompany[]> {
  return domainList<PlacementCompany>(
    EPC.name,
    buildQuery({ 'Placement.placementId': placementId, isActive: true }),
  )
}

export async function listPlacementCompaniesByCompany(companyId: number): Promise<PlacementCompany[]> {
  return domainList<PlacementCompany>(
    EPC.name,
    buildQuery(
      { 'Company.companyId': companyId, isActive: true },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function createPlacementCompany(data: Partial<PlacementCompany>): Promise<PlacementCompany> {
  return domainCreate<PlacementCompany>(EPC.name, data)
}

export async function updatePlacementCompany(id: number, data: Partial<PlacementCompany>): Promise<PlacementCompany> {
  return domainUpdate<PlacementCompany>(EPC.name, EPC.pk, id, data)
}

// ─── Placement Student Registration ──────────────────────────────────────────

export async function listPlacementStudentRegs(companyId: number, placementId: number): Promise<PlacementStudentRegistration[]> {
  return domainList<PlacementStudentRegistration>(
    EPS.name,
    buildQuery({ 'Company.companyId': companyId, 'Placement.placementId': placementId }),
  )
}

export async function listPlacedStudentsByPlacement(placementId: number): Promise<PlacementStudentRegistration[]> {
  return domainList<PlacementStudentRegistration>(
    EPS.name,
    buildQuery({ 'Placement.placementId': placementId, isPlaced: true }),
  )
}

export async function updatePlacementStudentReg(
  id: number,
  data: Partial<PlacementStudentRegistration>,
): Promise<PlacementStudentRegistration> {
  return domainUpdate<PlacementStudentRegistration>(EPS.name, EPS.pk, id, data)
}

// ─── Achievement Category ─────────────────────────────────────────────────────

export async function listAchievementCategories(): Promise<AchievementCategory[]> {
  return domainList<AchievementCategory>(EAC.name, buildQuery({ isActive: true }))
}

export async function createAchievementCategory(data: Partial<AchievementCategory>): Promise<AchievementCategory> {
  return domainCreate<AchievementCategory>(EAC.name, data)
}

export async function updateAchievementCategory(id: number, data: Partial<AchievementCategory>): Promise<AchievementCategory> {
  return domainUpdate<AchievementCategory>(EAC.name, EAC.pk, id, data)
}

// ─── Achievement Sub-Category ─────────────────────────────────────────────────

export async function listAchievementSubCategories(): Promise<AchievementSubCategory[]> {
  return domainList<AchievementSubCategory>(EAS.name, buildQuery({ isActive: true }))
}

export async function listAchievementSubCategoriesByCategory(categoryId: number): Promise<AchievementSubCategory[]> {
  return domainList<AchievementSubCategory>(
    EAS.name,
    buildQuery({ 'Category.categoryId': categoryId, isActive: true }),
  )
}

export async function createAchievementSubCategory(data: Partial<AchievementSubCategory>): Promise<AchievementSubCategory> {
  return domainCreate<AchievementSubCategory>(EAS.name, data)
}

export async function updateAchievementSubCategory(id: number, data: Partial<AchievementSubCategory>): Promise<AchievementSubCategory> {
  return domainUpdate<AchievementSubCategory>(EAS.name, EAS.pk, id, data)
}

// ─── Achievement ──────────────────────────────────────────────────────────────

export async function listAchievements(): Promise<Achievement[]> {
  return domainList<Achievement>(EA.name, buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }))
}

export async function createAchievement(data: Partial<Achievement>): Promise<Achievement> {
  return domainCreate<Achievement>(EA.name, data)
}

export async function updateAchievement(id: number, data: Partial<Achievement>): Promise<Achievement> {
  return domainUpdate<Achievement>(EA.name, EA.pk, id, data)
}
