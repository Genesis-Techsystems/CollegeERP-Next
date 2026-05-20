import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'

/**
 * Angular `setup-master.component.ts` `selectedCollege`:
 * `listDetailsByTwoIds(courseCrudUrl, collegeId, 'true', College.collegeId, isActive)`
 */
export async function listCoursesByCollegeForFcarSetup(collegeId: number) {
	return domainList<Record<string, unknown>>(
		ENTITIES.COURSE.name,
		buildQuery({ 'College.collegeId': collegeId, isActive: true }),
	)
}

/**
 * Angular `add-setup.component.ts` `getRegulations`:
 * `listDetailsByThreeIdsWithSort(regulationCrudUrl, collegeId, courseId, 'true', 'desc', College.collegeId, Course.courseId, isActive, 'regulationCode')`
 */
export async function listRegulationsByCollegeAndCourseForFcar(collegeId: number, courseId: number) {
	return domainList<Record<string, unknown>>(
		ENTITIES.REGULATION.name,
		buildQuery(
			{ 'College.collegeId': collegeId, 'Course.courseId': courseId, isActive: true },
			{ field: 'regulationCode', direction: 'DESC' },
		),
	)
}

/**
 * Angular `selectedCourse`: `listDetailsByTwoIds(ExamFCARSetupMaster, collegeId, courseId, College.collegeId, Course.courseId)`
 */
export async function listExamFcarSetupMasters(collegeId: number, courseId: number) {
	return domainList<Record<string, unknown>>(
		ENTITIES.EXAM_FCAR_SETUP_MASTER.name,
		buildQuery({ 'College.collegeId': collegeId, 'Course.courseId': courseId }),
	)
}

export async function createExamFcarSetupMaster(payload: Record<string, unknown>) {
	return domainCreate(ENTITIES.EXAM_FCAR_SETUP_MASTER.name, payload)
}

export async function updateExamFcarSetupMaster(id: number, payload: Record<string, unknown>) {
	return domainUpdate(
		ENTITIES.EXAM_FCAR_SETUP_MASTER.name,
		ENTITIES.EXAM_FCAR_SETUP_MASTER.pk,
		id,
		payload,
	)
}
