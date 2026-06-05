import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { CourseGroup } from '@/types/course-group'
import type { CourseYear } from '@/types/course-year'
import type { GroupSection } from '@/types/group-section'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listGroupSectionsAdmin(): Promise<GroupSection[]> {
  return domainList<GroupSection>(
    ENTITIES.GROUP_SECTION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
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
  return domainCreate<GroupSection>(ENTITIES.GROUP_SECTION.name, data)
}

export async function updateGroupSection(
  groupSectionId: number,
  data: Partial<Omit<GroupSection, 'groupSectionId'>>,
): Promise<GroupSection> {
  return domainUpdate<GroupSection>(ENTITIES.GROUP_SECTION.name, ENTITIES.GROUP_SECTION.pk, groupSectionId, {
    ...data,
  })
}
