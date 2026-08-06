/**
 * Elective Group Mapping — Angular `ElectiveGroupMappingComponent` + add dialog.
 *
 * Ports:
 *   - grid list           → CrudService.listByTwoIds('electivegroupyrmapping', collegeId, academicYearId)
 *   - elective subjects   → CrudService.getElectiveSubjects1('subjectregulations', ...)
 *   - staff (employees)   → CrudService.listBySevenIds('staffcourseyrsubjects', ...)
 *   - sections            → CrudService.listBySevenIds('staffSections', ...)
 *   - create mapping      → CrudService.add('electivegroupyrmapping', rows)
 *   - view / delete list  → CrudService.listByTwoIds('electivegroupyrmapping', isActive, code)
 *   - delete mapping      → domain soft-delete ElectiveGroupyrMapping (Angular deleteItem)
 */

import {
  domainSoftDelete,
  fetchDetails,
  fetchDetailsEnvelope,
  postDetails,
} from "@/services/crud";

type AnyRow = Record<string, any>;

/** Angular crudService list responses may put rows in `data` or top-level `resultList`. */
function asMappingRows(
  body:
    | {
        data?: unknown;
        resultList?: unknown;
      }
    | null
    | undefined,
): AnyRow[] {
  if (!body) return [];
  const raw = body.data;
  if (Array.isArray(raw) && raw.length > 0) return raw as AnyRow[];
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as AnyRow).resultList)
  ) {
    return (raw as AnyRow).resultList as AnyRow[];
  }
  if (Array.isArray(body.resultList) && body.resultList.length > 0) {
    return body.resultList as AnyRow[];
  }
  // Prefer non-empty resultList when data is [] (common on some Spring endpoints)
  if (Array.isArray(raw)) return raw as AnyRow[];
  if (Array.isArray(body.resultList)) return body.resultList as AnyRow[];
  if (raw && typeof raw === "object") return [raw as AnyRow];
  return [];
}

/**
 * Elective subjects for the chosen course-group/year.
 * Angular: getElectiveSubjects1('subjectregulations', collegeId, academicYearId, courseGroupId, courseYearId, 'ELECTIVE')
 * GET subjectregulations?collegeId=&academicYearId=&coursegroupId=&courseyearId=&subjectTypeCode=ELECTIVE
 */
export async function listElectiveSubjectsForGroup(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, courseGroupId, courseYearId } = params;
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId)
    return [];

  const rows = await fetchDetails<AnyRow[]>("subjectregulations", {
    collegeId,
    academicYearId,
    coursegroupId: courseGroupId,
    courseyearId: courseYearId,
    subjectTypeCode: "ELECTIVE",
  }).catch(() => []);

  return Array.isArray(rows) ? rows : [];
}

/**
 * Staff (employees) mapped to the chosen elective subject.
 * Angular: listBySevenIds('staffcourseyrsubjects', collegeId, academicYearId, subjectId, subjectTypeId,
 *          courseGroupId, courseYearId, 'true', 'collegeId','academicYearId','subjectId','subjectTypeId',
 *          'courseGroupId','courseYearId','isActive')
 * GET staffcourseyrsubjects?collegeId=&academicYearId=&subjectId=&subjectTypeId=&courseGroupId=&courseYearId=&isActive=true
 */
export async function listElectiveGroupStaff(params: {
  collegeId: number;
  academicYearId: number;
  subjectId: number;
  subjectTypeId: number | string;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    subjectId,
    subjectTypeId,
    courseGroupId,
    courseYearId,
  } = params;
  if (
    !collegeId ||
    !academicYearId ||
    !subjectId ||
    !courseGroupId ||
    !courseYearId
  )
    return [];

  const rows = await fetchDetails<AnyRow[]>("staffcourseyrsubjects", {
    collegeId,
    academicYearId,
    subjectId,
    subjectTypeId: subjectTypeId ?? "",
    courseGroupId,
    courseYearId,
    isActive: "true",
  }).catch(() => []);

  return Array.isArray(rows) ? rows : [];
}

/**
 * Sections available for the chosen subject + staff.
 * Angular: listBySevenIds('staffSections', collegeId, academicYearId, subjectId, empId, 'true',
 *          courseYearId, courseGroupId, 'collegeId','academicYearId','subjectId','employeeId','status',
 *          'courseYearId','courseGroupId')
 * GET staffSections?collegeId=&academicYearId=&subjectId=&employeeId=&status=true&courseYearId=&courseGroupId=
 */
export async function listElectiveGroupSections(params: {
  collegeId: number;
  academicYearId: number;
  subjectId: number;
  employeeId: number;
  courseYearId: number;
  courseGroupId: number;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    subjectId,
    employeeId,
    courseYearId,
    courseGroupId,
  } = params;
  if (
    !collegeId ||
    !academicYearId ||
    !subjectId ||
    !employeeId ||
    !courseYearId ||
    !courseGroupId
  )
    return [];

  const rows = await fetchDetails<AnyRow[]>("staffSections", {
    collegeId,
    academicYearId,
    subjectId,
    employeeId,
    status: "true",
    courseYearId,
    courseGroupId,
  }).catch(() => []);

  return Array.isArray(rows) ? rows : [];
}

/**
 * Grid list — Angular getMappingList / listByTwoIds on electivegroupyrmapping.
 * GET electivegroupyrmapping?collegeId=&academicYearId=
 * Returns flat DTOs with electiveGroupCode (required by View/Delete).
 * Do not use domain/list/ElectiveGroupyrMapping — entity graph often omits electiveGroupCode.
 */
export async function listElectiveGroupMappings(params: {
  collegeId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId } = params;
  if (!collegeId || !academicYearId) return [];

  const body = await fetchDetailsEnvelope<AnyRow[] | AnyRow>(
    "electivegroupyrmapping",
    {
      collegeId,
      academicYearId,
    },
  ).catch(() => null);

  return asMappingRows(body);
}

/**
 * Create elective group mapping(s).
 * Angular parent: postMapping(details) → crudService.add('electivegroupyrmapping', details)
 * POST electivegroupyrmapping  (body = array of per-section mapping rows)
 */
export async function createElectiveGroupMapping(
  rows: AnyRow[],
): Promise<unknown> {
  return postDetails<unknown>("electivegroupyrmapping", rows);
}

/**
 * Mappings for one elective group code (view dialog + delete guard).
 * Angular: listByTwoIds('electivegroupyrmapping', 'true', electiveGroupCode, 'isActive', 'electiveGroupCode')
 * GET electivegroupyrmapping?isActive=true&electiveGroupCode={code}
 */
export async function listElectiveGroupMappingsByCode(
  electiveGroupCode: string,
): Promise<AnyRow[]> {
  const code = String(electiveGroupCode ?? "").trim();
  if (!code) return [];

  const body = await fetchDetailsEnvelope<AnyRow[] | AnyRow>(
    "electivegroupyrmapping",
    {
      isActive: "true",
      electiveGroupCode: code,
    },
  ).catch(() => null);

  return asMappingRows(body);
}

/**
 * Soft-delete one ElectiveGroupyrMapping row.
 * Angular: deleteItem('ElectiveGroupyrMapping', electiveGroupyrMappingId, 'electiveGroupyrMappingId')
 */
export async function deleteElectiveGroupMapping(
  electiveGroupyrMappingId: number,
): Promise<void> {
  const id = Number(electiveGroupyrMappingId) || 0;
  if (!id) return;
  await domainSoftDelete(
    "ElectiveGroupyrMapping",
    "electiveGroupyrMappingId",
    id,
  );
}
