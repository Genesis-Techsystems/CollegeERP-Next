import type {
  Placement,
  Company,
  CompanyContact,
  CompanyMeeting,
  PlacementBroadcast,
  PlacementCompany,
  PlacementStudentRegistration,
  AchievementCategory,
  AchievementSubCategory,
  Achievement,
} from "@/types/placements";
import {
  buildQuery,
  domainList,
  domainCreate,
  domainUpdate,
  fetchDetails,
} from "./crud";
import { ENTITIES } from "@/config/constants/entities";

const EP = ENTITIES.PLACEMENT;
const ECO = ENTITIES.COMPANY;
const ECC = ENTITIES.COMPANY_CONTACT;
const ECM = ENTITIES.COMPANY_MEETING;
const EPB = ENTITIES.PLACEMENT_BROADCAST;
const EPC = ENTITIES.PLACEMENT_COMPANY;
const EPS = ENTITIES.PLACEMENT_STUDENT_REG;
const EAC = ENTITIES.ACHIEVEMENT_CATEGORY;
const EAS = ENTITIES.ACHIEVEMENT_SUB_CATEGORY;
const EA = ENTITIES.ACHIEVEMENT;

// ─── Placement ───────────────────────────────────────────────────────────────

/** Angular `listAllDetails(Placement)` — order(createdDt=desc), no isActive filter. */
export async function listPlacements(): Promise<Placement[]> {
  return domainList<Placement>(
    EP.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function listPlacementsByCampus(
  campusId: number,
): Promise<Placement[]> {
  return domainList<Placement>(
    EP.name,
    buildQuery(
      { "Campus.campusId": campusId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

export async function createPlacement(
  data: Partial<Placement>,
): Promise<Placement> {
  return domainCreate<Placement>(EP.name, data);
}

export async function updatePlacement(
  id: number,
  data: Partial<Placement>,
): Promise<Placement> {
  return domainUpdate<Placement>(EP.name, EP.pk, id, data);
}

// ─── Company ─────────────────────────────────────────────────────────────────

export async function listCompanies(): Promise<Company[]> {
  // Angular `listAllDetails(companyUrl)` → query=order(createdDt=desc)&size=99999 (no isActive filter)
  return domainList<Company>(
    ECO.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  return domainCreate<Company>(ECO.name, data);
}

export async function updateCompany(
  id: number,
  data: Partial<Company>,
): Promise<Company> {
  return domainUpdate<Company>(ECO.name, ECO.pk, id, data);
}

// ─── Company Contact ──────────────────────────────────────────────────────────

export async function listCompanyContactsByCompany(
  companyId: number,
): Promise<CompanyContact[]> {
  // Angular: listDetailsById(CompanyContact, companyId, 'Company.companyId') — no isActive filter
  if (!companyId) return [];
  return domainList<CompanyContact>(
    ECC.name,
    buildQuery({ "Company.companyId": companyId }),
  );
}

export async function createCompanyContact(
  data: Partial<CompanyContact>,
): Promise<CompanyContact> {
  return domainCreate<CompanyContact>(ECC.name, data);
}

export async function updateCompanyContact(
  id: number,
  data: Partial<CompanyContact>,
): Promise<CompanyContact> {
  return domainUpdate<CompanyContact>(ECC.name, ECC.pk, id, data);
}

// ─── Company Meeting ──────────────────────────────────────────────────────────

/** Angular `listAllDetails(CompanyMeeting)` — order(createdDt=desc), no isActive filter. */
export async function listCompanyMeetings(): Promise<CompanyMeeting[]> {
  return domainList<CompanyMeeting>(
    ECM.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/**
 * Angular modal `selectedCollege` → listDetailsById(Company, 'true', isActive).
 * Active companies only (not filtered by college).
 */
export async function listActiveCompaniesForMeetings(): Promise<Company[]> {
  return domainList<Company>(ECO.name, buildQuery({ isActive: true }));
}

/**
 * Angular modal `selectedCompany` →
 * listDetailsByTwoIds(CompanyContact, companyId, 'true', 'Company.companyId', isActive).
 */
export async function listActiveCompanyContactsForMeetings(
  companyId: number,
): Promise<CompanyContact[]> {
  if (!companyId) return [];
  return domainList<CompanyContact>(
    ECC.name,
    buildQuery({ "Company.companyId": companyId, isActive: true }),
  );
}

/**
 * Angular modal `enteredEmployee` / `listByThreeIds(employeeSearchUrl, collegeId, q, 'ACTV', …)`:
 * GET employeesearch?collegeId=&q=&empStatus=ACTV
 * Single call only — no cms/ retry, no EmployeeDetail fallback.
 */
export async function searchEmployeesForCompanyMeeting(
  collegeId: number,
  term: string,
): Promise<Record<string, unknown>[]> {
  const q = term.trim();
  if (!collegeId || q.length < 4) return [];
  const data = await fetchDetails<unknown>("employeesearch", {
    collegeId,
    q,
    empStatus: "ACTV",
  });
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList))
      return obj.resultList as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

export async function createCompanyMeeting(
  data: Partial<CompanyMeeting>,
): Promise<CompanyMeeting> {
  return domainCreate<CompanyMeeting>(ECM.name, data);
}

export async function updateCompanyMeeting(
  id: number,
  data: Partial<CompanyMeeting>,
): Promise<CompanyMeeting> {
  return domainUpdate<CompanyMeeting>(ECM.name, ECM.pk, id, data);
}

// ─── Placement Broadcast ──────────────────────────────────────────────────────

/**
 * Angular `selectedPostType` →
 * listDetailsByTwoIdsWithSort(
 *   PlacementBroadcast, posttypeCatdetId, yearName, desc,
 *   posttypeCatdetId.generalDetailId, yearName, createdDt
 * )
 * No isActive filter.
 */
export async function listPlacementBroadcasts(
  yearName: string,
  posttypeCatdetId: number,
): Promise<PlacementBroadcast[]> {
  if (!yearName || !posttypeCatdetId) return [];
  return domainList<PlacementBroadcast>(
    EPB.name,
    buildQuery(
      {
        "posttypeCatdetId.generalDetailId": posttypeCatdetId,
        yearName,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/** Angular modal: listDetailsById(Company, true, isActive). */
export async function listActiveCompaniesForBroadcast(): Promise<Company[]> {
  return domainList<Company>(ECO.name, buildQuery({ isActive: true }));
}

export async function createPlacementBroadcast(
  data: Partial<PlacementBroadcast>,
): Promise<PlacementBroadcast> {
  return domainCreate<PlacementBroadcast>(EPB.name, data);
}

export async function updatePlacementBroadcast(
  id: number,
  data: Partial<PlacementBroadcast>,
): Promise<PlacementBroadcast> {
  return domainUpdate<PlacementBroadcast>(EPB.name, EPB.pk, id, data);
}

// ─── Placement Company (requirements) ────────────────────────────────────────

export async function listPlacementCompaniesByPlacement(
  placementId: number,
): Promise<PlacementCompany[]> {
  return domainList<PlacementCompany>(
    EPC.name,
    buildQuery({ "Placement.placementId": placementId, isActive: true }),
  );
}

/**
 * Angular `selectedCompany` →
 * listDetailsByTwoIdsWithSort(PlacementCompany, companyId, true, desc, Company.companyId, isActive, createdDt)
 */
export async function listPlacementCompaniesByCompany(
  companyId: number,
): Promise<PlacementCompany[]> {
  if (!companyId) return [];
  return domainList<PlacementCompany>(
    EPC.name,
    buildQuery(
      { "Company.companyId": companyId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

export async function createPlacementCompany(
  data: Partial<PlacementCompany>,
): Promise<PlacementCompany> {
  return domainCreate<PlacementCompany>(EPC.name, data);
}

/**
 * Angular updateDetails(..., placementCompanByIdUrl) where
 * placementCompanByIdUrl = 'PlacementCompanyId'
 */
export async function updatePlacementCompany(
  id: number,
  data: Partial<PlacementCompany>,
): Promise<PlacementCompany> {
  return domainUpdate<PlacementCompany>(
    EPC.name,
    "PlacementCompanyId",
    id,
    data,
  );
}

// ─── Placement Student Registration ──────────────────────────────────────────

export async function listPlacementStudentRegs(
  companyId: number,
  placementId: number,
): Promise<PlacementStudentRegistration[]> {
  return domainList<PlacementStudentRegistration>(
    EPS.name,
    buildQuery({
      "Company.companyId": companyId,
      "Placement.placementId": placementId,
    }),
  );
}

export async function listPlacedStudentsByPlacement(
  placementId: number,
): Promise<PlacementStudentRegistration[]> {
  return domainList<PlacementStudentRegistration>(
    EPS.name,
    buildQuery({ "Placement.placementId": placementId, isPlaced: true }),
  );
}

export async function updatePlacementStudentReg(
  id: number,
  data: Partial<PlacementStudentRegistration>,
): Promise<PlacementStudentRegistration> {
  return domainUpdate<PlacementStudentRegistration>(EPS.name, EPS.pk, id, data);
}

// ─── Achievement Category ─────────────────────────────────────────────────────

/** Angular `listAllDetails(Category)` — order(createdDt=desc), no isActive filter. */
export async function listAchievementCategories(): Promise<
  AchievementCategory[]
> {
  return domainList<AchievementCategory>(
    EAC.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Active categories only (dropdowns / dependent screens). */
export async function listActiveAchievementCategories(): Promise<
  AchievementCategory[]
> {
  return domainList<AchievementCategory>(
    EAC.name,
    buildQuery({ isActive: true }),
  );
}

export async function createAchievementCategory(
  data: Partial<AchievementCategory>,
): Promise<AchievementCategory> {
  return domainCreate<AchievementCategory>(EAC.name, data);
}

export async function updateAchievementCategory(
  id: number,
  data: Partial<AchievementCategory>,
): Promise<AchievementCategory> {
  return domainUpdate<AchievementCategory>(EAC.name, EAC.pk, id, data);
}

// ─── Achievement Sub-Category ─────────────────────────────────────────────────

/** Angular `listAllDetails(SubCategory)` — order(createdDt=desc), no isActive filter. */
export async function listAchievementSubCategories(): Promise<
  AchievementSubCategory[]
> {
  return domainList<AchievementSubCategory>(
    EAS.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Active sub-categories only (dropdowns / dependent screens). */
export async function listActiveAchievementSubCategories(): Promise<
  AchievementSubCategory[]
> {
  return domainList<AchievementSubCategory>(
    EAS.name,
    buildQuery({ isActive: true }),
  );
}

export async function listAchievementSubCategoriesByCategory(
  categoryId: number,
): Promise<AchievementSubCategory[]> {
  return domainList<AchievementSubCategory>(
    EAS.name,
    buildQuery({ "Category.categoryId": categoryId, isActive: true }),
  );
}

export async function createAchievementSubCategory(
  data: Partial<AchievementSubCategory>,
): Promise<AchievementSubCategory> {
  return domainCreate<AchievementSubCategory>(EAS.name, data);
}

export async function updateAchievementSubCategory(
  id: number,
  data: Partial<AchievementSubCategory>,
): Promise<AchievementSubCategory> {
  return domainUpdate<AchievementSubCategory>(EAS.name, EAS.pk, id, data);
}

// ─── Achievement ──────────────────────────────────────────────────────────────

/** Angular `listAllDetails(Achievement)` — order(createdDt=desc), no isActive filter. */
export async function listAchievements(): Promise<Achievement[]> {
  return domainList<Achievement>(
    EA.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/**
 * Angular modal `enteredStudent` (add): listByTwoIds(studentsearch, collegeId, q, collegeId, q)
 * GET studentsearch?collegeId=&q=  (min 5 chars)
 */
export async function searchStudentsForAchievement(
  collegeId: number,
  term: string,
): Promise<Record<string, unknown>[]> {
  const q = term.trim();
  if (!collegeId || q.length < 5) return [];
  const data = await fetchDetails<unknown>("studentsearch", { collegeId, q });
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList))
      return obj.resultList as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

/**
 * Angular modal `enteredEmployee` (add): listByTwoIds(employeesearch, collegeId, q, collegeId, q)
 * GET employeesearch?collegeId=&q=  (min 5 chars) — no empStatus param.
 */
export async function searchEmployeesForAchievement(
  collegeId: number,
  term: string,
): Promise<Record<string, unknown>[]> {
  const q = term.trim();
  if (!collegeId || q.length < 5) return [];
  const data = await fetchDetails<unknown>("employeesearch", { collegeId, q });
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList))
      return obj.resultList as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

/**
 * Angular edit preload: listDetailsById(StudentDetail, collegeId, College.collegeId)
 */
export async function listStudentsForAchievementEdit(
  collegeId: number,
): Promise<Record<string, unknown>[]> {
  if (!collegeId) return [];
  return domainList<Record<string, unknown>>(
    "StudentDetail",
    buildQuery({ "College.collegeId": collegeId }),
  );
}

/**
 * Angular edit preload: listDetailsByIdsWithSort(EmployeeDetail, collegeId, college.collegeId)
 */
export async function listEmployeesForAchievementEdit(
  collegeId: number,
): Promise<Record<string, unknown>[]> {
  if (!collegeId) return [];
  return domainList<Record<string, unknown>>(
    "EmployeeDetail",
    buildQuery({ "college.collegeId": collegeId }),
  );
}

export async function createAchievement(
  data: Partial<Achievement>,
): Promise<Achievement> {
  return domainCreate<Achievement>(EA.name, data);
}

export async function updateAchievement(
  id: number,
  data: Partial<Achievement>,
): Promise<Achievement> {
  return domainUpdate<Achievement>(EA.name, EA.pk, id, data);
}
