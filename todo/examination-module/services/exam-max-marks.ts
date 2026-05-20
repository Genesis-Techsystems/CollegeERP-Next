/**
 * Exam Max Marks Setup service — client-side only.
 *
 * Angular source: marks-setup.component.ts, marks-setup-modal.component.ts
 * Entity: ExamMarkssetup (lowercase 's')
 *
 * Import in 'use client' components:
 *   import { fetchMarksSetup, saveMarksSetup } from '@/services/exam-max-marks'
 */

import { EXAM_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { domainList, buildQuery, getAllRecords, postDetails } from '@/services/crud'
import type { CollegeWiseFilterRow } from '@/types/exam-master'
import type { ExamMarksSetup, RegulationFilterRow } from '@/types/exam-max-marks'

// ─── College Filters (reused from exam-master pattern) ───────────────────────

export interface MarksSetupFiltersResult {
  /** Filter rows with flag === "clg_filters" (universities, courses) */
  filtersData: CollegeWiseFilterRow[]
  /** Regulation rows with clg_filters_regulation === "clg_filters_regulation" */
  regulationData: RegulationFilterRow[]
}

/**
 * Fetches filter dropdowns for the Marks Setup page.
 * Uses the same s_get_collegewisedetails_bycode stored proc as Exam Master.
 *
 * @param orgId - organization ID from session user
 * @param empId - employee ID from session user
 * @returns filter rows and regulation rows
 * @throws AppError on failure
 */
export async function getMarksSetupFilters(
  orgId: number,
  empId: number,
): Promise<MarksSetupFiltersResult> {
  // getAllRecords returns body.data — for this proc it is { result: T[][] }
  const data = await getAllRecords<{ result: (CollegeWiseFilterRow | RegulationFilterRow)[][] }>(
    's_get_collegewisedetails_bycode',
    {
      in_flag: 'clg_filters',
      in_org_id: orgId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: empId,
      in_loginuser_roleid: 0,
      in_subject: '',
      in_employee: '',
      in_gm_codes: '',
    },
  )

  const result = data?.result ?? []
  let filtersData: CollegeWiseFilterRow[] = []
  let regulationData: RegulationFilterRow[] = []

  for (const arr of result) {
    if (arr.length === 0) continue
    const first = arr[0] as { flag?: string; clg_filters_regulation?: string }
    if (first.flag === 'clg_filters') {
      filtersData = arr as CollegeWiseFilterRow[]
    } else if (first.clg_filters_regulation === 'clg_filters_regulation') {
      regulationData = arr as RegulationFilterRow[]
    }
  }

  return { filtersData, regulationData }
}

// ─── Fetch marks setup rows ───────────────────────────────────────────────────

/**
 * Fetches ExamMarkssetup rows for a given course/regulation combination.
 *
 * @param courseId - FK course
 * @param regulationId - FK regulation
 * @param isForDisabled - whether to fetch disabled-student configuration
 * @returns array of ExamMarksSetup records
 * @throws AppError on failure
 */
export async function fetchMarksSetup(
  courseId: number,
  regulationId: number,
  isForDisabled = false,
): Promise<ExamMarksSetup[]> {
  // Server entity uses field name 'disabled' (not 'isForDisabled').
  // Angular source: marks-setup.component.ts:432-433
  //   listDetailsByFourIds(..., 'Course.courseId', 'Regulation.regulationId', 'disabled', 'isActive')
  const query = buildQuery({
    'Course.courseId': courseId,
    'Regulation.regulationId': regulationId,
    disabled: isForDisabled,
    isActive: true,
  })
  return domainList<ExamMarksSetup>(ENTITIES.EXAM_MARKS_SETUP.name, query)
}

// ─── Save (create/update) marks setup ────────────────────────────────────────

/**
 * Saves an array of marks setup rows to the backend.
 * The Angular component POSTs the entire array at once to exammarkssetup.
 *
 * @param rows - full array of ExamMarksSetup records to persist
 * @throws AppError on failure
 */
export async function saveMarksSetup(rows: ExamMarksSetup[]): Promise<void> {
  await postDetails(EXAM_API.SAVE_EXAM_MARKS_SETUP, rows)
}
