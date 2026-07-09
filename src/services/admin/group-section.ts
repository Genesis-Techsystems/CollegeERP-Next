import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { CourseGroup } from '@/types/course-group'
import type { CourseYear } from '@/types/course-year'
import type { GroupSection } from '@/types/group-section'
import { buildAngularGroupSectionCreatePayload, buildAngularGroupSectionUpdatePayload } from './academic-master-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function normalizeGroupSection(row: GroupSection | Record<string, unknown>): GroupSection {
  const r = row as Record<string, unknown>
  return {
    ...(row as GroupSection),
    groupSectionId: n(
      (row as GroupSection).groupSectionId ?? r.fk_group_section_id ?? r.group_section_id,
    ),
    collegeId: n((row as GroupSection).collegeId ?? r.fk_college_id ?? r.college_id),
    courseGroupId: n((row as GroupSection).courseGroupId ?? r.fk_course_group_id ?? r.course_group_id),
    courseYearId: n((row as GroupSection).courseYearId ?? r.fk_course_year_id ?? r.course_year_id),
    groupSectionCode: String(
      (row as GroupSection).groupSectionCode ?? r.group_section_code ?? r.groupSectionCode ?? '',
    ),
    groupSectionName: String(
      (row as GroupSection).groupSectionName ?? r.group_section_name ?? r.section ?? '',
    ),
    sortOrder: n((row as GroupSection).sortOrder ?? r.sort_order ?? r.sortOrder),
    isActive: Boolean((row as GroupSection).isActive ?? r.is_active ?? r.isActive),
    reason: (row as GroupSection).reason ?? (r.reason as string | undefined),
    collegeCode: (row as GroupSection).collegeCode ?? (r.college_code as string | undefined),
    groupCode: (row as GroupSection).groupCode ?? (r.group_code as string | undefined),
    courseYearCode: (row as GroupSection).courseYearCode ?? (r.course_year_code as string | undefined),
  }
}

export async function listGroupSectionsAdmin(): Promise<GroupSection[]> {
  const rows = await domainList<GroupSection>(
    ENTITIES.GROUP_SECTION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeGroupSection).filter((r) => r.groupSectionId > 0)
}

export async function listActiveCollegesForSections(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function listActiveCourseGroupsByCollege(collegeId: number): Promise<CourseGroup[]> {
  if (!collegeId) return []
  return domainList<CourseGroup>(
    ENTITIES.COURSE_GROUP.name,
    buildQuery({ 'college.collegeId': collegeId, isActive: true }),
  )
}

export async function listActiveCourseYearsByCourse(courseId: number): Promise<CourseYear[]> {
  if (!courseId) return []
  return domainList<CourseYear>(
    ENTITIES.COURSE_YEAR.name,
    buildQuery({ 'course.courseId': courseId, isActive: true }),
  )
}

export async function createGroupSection(data: Omit<GroupSection, 'groupSectionId'>): Promise<GroupSection> {
  const payload = buildAngularGroupSectionCreatePayload(data as unknown as Record<string, unknown>)
  return domainCreate<GroupSection>(ENTITIES.GROUP_SECTION.name, payload)
}

export async function updateGroupSection(
  groupSectionId: number,
  data: Partial<Omit<GroupSection, 'groupSectionId'>>,
  existing?: GroupSection,
): Promise<GroupSection> {
  const payload = buildAngularGroupSectionUpdatePayload(groupSectionId, data as Record<string, unknown>, existing)
  return domainUpdate<GroupSection>(ENTITIES.GROUP_SECTION.name, ENTITIES.GROUP_SECTION.pk, groupSectionId, payload)
}
