/**
 * Exam papers delivery — university exam centers, bundles/bags, seating, etc.
 */

import { EXAM_EVAL_API, NEXT_API, SETUP_API, UNIV_EXAM_CENTER_API } from '@/config/constants/api'
import { AppError } from '@/lib/errors'
import { getCollegeFilters } from '@/services/exam-master'
import { buildQuery, domainCreate, domainList, domainSoftDelete, domainUpdate, getAllRecords, postDetails, putDetails } from '@/services/crud'
import { listCoursesByUniversity, listExamMastersByCourseAndAy } from '@/services/pre-examination'

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export type AnyRow = Record<string, unknown>

function flattenExamFilterRows(payload: Record<string, unknown> | undefined): AnyRow[] {
  if (!payload) return []
  const possibleGroups = [
    payload.result,
    (payload.result as Record<string, unknown> | undefined)?.result,
    (payload.result as Record<string, unknown> | undefined)?.rows,
    (payload.result as Record<string, unknown> | undefined)?.data,
    payload.rows,
    payload.data,
  ]
  const flat: AnyRow[] = []
  for (const group of possibleGroups) {
    if (!Array.isArray(group)) continue
    for (const item of group) {
      if (Array.isArray(item)) {
        for (const row of item) {
          if (row && typeof row === 'object') flat.push(row as AnyRow)
        }
      } else if (item && typeof item === 'object') {
        flat.push(item as AnyRow)
      }
    }
    if (flat.length > 0) break
  }
  return flat
}

/** Angular: `clg_exam_timetable_filters` bundle (course / academic year / exam dropdowns). */
export async function getExamTimetableFilterRows(args: {
  organizationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<Record<string, unknown>>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_exam_timetable_filters',
    in_org_id: args.organizationId || 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: args.employeeId || 0,
    in_loginuser_roleid: 0,
    in_employee: '',
    in_subject: '',
    in_gm_codes: '',
  })
  const readStr = (v: unknown) => (typeof v === 'string' ? v : '')
  const flat = flattenExamFilterRows(data)
  if (flat.length === 0) return []

  const flagged = flat.filter(
    (r) =>
      readStr(r.flag) === 'clg_exam_timetable_filters' ||
      readStr(r.clg_filters_ay) === 'clg_exam_timetable_filters' ||
      readStr(r.flag_type) === 'clg_exam_timetable_filters',
  )
  if (flagged.length > 0) return flagged

  const usable = flat.filter((r) => Number(r.fk_course_id ?? 0) > 0 || Number(r.fk_exam_id ?? 0) > 0)
  return usable.length > 0 ? usable : flat
}

export function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (key === '' || key === 0) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Bundles for an exam (Angular: listDetailsByTwoIds … `examMaster.examId`). */
export async function listUnivExamBundlesByExamId(examId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    UNIV_EXAM_CENTER_API.EXAM_BUNDLE,
    buildQuery({ 'examMaster.examId': examId, isActive: true }),
  )
}

/** Active exam bags (serial dropdown). */
export async function listUnivExamBagsActive(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BAGS, buildQuery({ isActive: true }))
}

export function pickUnivExamBagId(row: AnyRow): number {
  return num(row.univExamBagId ?? row.univExamBagsId ?? row.univ_exam_bag_id)
}

export async function listUnivExamBagsByCenterAndTimetable(
  univExamcenterId: number,
  examTimetableId: number,
): Promise<AnyRow[]> {
  if (!univExamcenterId || !examTimetableId) return []
  const queries = [
    buildQuery({
      'univExamcenters.univExamcenterId': univExamcenterId,
      'examTimetable.examTimetableId': examTimetableId,
      isActive: true,
    }),
    buildQuery({
      'univExamCenters.univExamcenterId': univExamcenterId,
      'examTimetable.examTimetableId': examTimetableId,
      isActive: true,
    }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BAGS, q)
    } catch {
      /* try next query shape */
    }
  }
  return []
}

export async function createUnivExamBag(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BAGS, payload)
}

export async function updateUnivExamBag(univExamBagId: number, payload: Record<string, unknown>): Promise<AnyRow> {
  const pks = ['univExamBagId', 'univExamBagsId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BAGS, pk, univExamBagId, payload)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam bag')
}

export async function createUnivExamBundle(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BUNDLE, payload)
}

export async function updateUnivExamBundle(
  unvExamBundleId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.EXAM_BUNDLE,
    'unvExamBundleId',
    unvExamBundleId,
    payload,
  )
}

export function pickUnivExamBagTransportationId(row: AnyRow): number {
  return num(row.univExamBagTransportationId ?? row.univ_exam_bag_transportation_id)
}

export async function listAllActiveUnivExamRegionalCenters(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.REGIONAL_CENTERS, buildQuery({ isActive: true }))
}

export async function listAllActiveUnivExamCenters(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_CENTERS, buildQuery({ isActive: true }))
}

export async function listAllActiveUnivExamBags(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_BAGS, buildQuery({ isActive: true }))
}

export async function listExamBagTransportationByFilters(
  univExamReionalCenterId: number,
  univExamcenterId: number,
  univExamBagId: number,
): Promise<AnyRow[]> {
  if (!univExamReionalCenterId || !univExamcenterId || !univExamBagId) return []
  const queries = [
    buildQuery({
      'examRegionalCenters.univExamReionalCenterId': univExamReionalCenterId,
      'univExamCenters.univExamcenterId': univExamcenterId,
      'univExamBags.univExamBagId': univExamBagId,
      isActive: true,
    }),
    buildQuery({
      'examRegionalCenters.univExamRegionalCenterId': univExamReionalCenterId,
      'univExamCenters.univExamcenterId': univExamcenterId,
      'univExamBags.univExamBagId': univExamBagId,
      isActive: true,
    }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.BAG_TRANSPORTATION, q)
    } catch {
      /* try next */
    }
  }
  return []
}

export async function createExamBagTransportation(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.BAG_TRANSPORTATION, payload)
}

export async function updateExamBagTransportation(
  univExamBagTransportationId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  const pks = ['univExamBagTransportationId', 'univEcQuestionPaperConfigId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(
        UNIV_EXAM_CENTER_API.BAG_TRANSPORTATION,
        pk,
        univExamBagTransportationId,
        payload,
      )
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam bag transportation')
}

export function pickUnivExamBagCollectionId(row: AnyRow): number {
  return num(row.univExamBagCollectionId ?? row.univ_exam_bag_collection_id)
}

export async function listAllActiveUnivExamAnswerPaperBags(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.ANSWER_PAPER_BAGS, buildQuery({ isActive: true }))
}

export function pickUnivExamAnswerPaperBagId(row: AnyRow): number {
  return num(row.univExamAnswerPaperBagId ?? row.univExamAnswerPaperBagsId ?? row.univ_exam_answer_paper_bag_id)
}

export async function createUnivExamAnswerPaperBag(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.ANSWER_PAPER_BAGS, payload)
}

export async function updateUnivExamAnswerPaperBag(
  univExamAnswerPaperBagId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  const pks = ['univExamAnswerPaperBagId', 'univExamAnswerPaperBagsId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(
        UNIV_EXAM_CENTER_API.ANSWER_PAPER_BAGS,
        pk,
        univExamAnswerPaperBagId,
        payload,
      )
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update answer paper bag')
}

export async function listAllActiveUnivExamBagCollections(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.BAG_COLLECTION, buildQuery({ isActive: true }))
}

export async function createUnivExamBagCollection(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.BAG_COLLECTION, payload)
}

export async function updateUnivExamBagCollection(
  univExamBagCollectionId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.BAG_COLLECTION,
    'univExamBagCollectionId',
    univExamBagCollectionId,
    payload,
  )
}

export function pickUnivEcProfileId(row: AnyRow): number {
  return num(
    row.examScanProfileId ??
      row.exam_scan_profile_id ??
      row.univEcPorifleId ??
      row.univEcProfileId ??
      row.univ_ec_porifle_id ??
      row.univ_ec_profile_id,
  )
}

export async function listAllActiveUnivEcProfiles(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_PROFILES, buildQuery({ isActive: true }))
}

/** All exam scan profiles (active + inactive) — table shows every record; status updates on edit only. */
export async function listAllUnivEcProfiles(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    UNIV_EXAM_CENTER_API.EXAM_SCAN_PROFILES,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

// ─── University Exam Center Profiles (UnivEcProfiles entity) ─────────────────

export async function listUnivEcProfilesByCenterAndRole(
  univExamcenterId: number,
  profileRoleId: number,
): Promise<AnyRow[]> {
  if (!univExamcenterId || !profileRoleId) return []
  return domainList<AnyRow>(
    UNIV_EXAM_CENTER_API.EC_PROFILES,
    buildQuery({
      'univExamCenters.univExamcenterId': univExamcenterId,
      'profileRole.roleId': profileRoleId,
      isActive: true,
    }),
  )
}

export async function listExamEvaluatorProfilesByRole(roleId: number): Promise<AnyRow[]> {
  if (!roleId) return []
  return domainList<AnyRow>(
    EXAM_EVAL_API.EVALUATOR_PROFILES,
    buildQuery({ 'role.roleId': roleId, isActive: true }),
  )
}

export async function addListUnivEcProfiles(payload: Record<string, unknown>[]): Promise<void> {
  if (!payload.length) return
  await postDetails(UNIV_EXAM_CENTER_API.ADD_EC_PROFILES, payload)
}

export async function updateUnivEcProfileRow(
  univEcPorifleId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.EC_PROFILES,
    'univEcPorifleId',
    univEcPorifleId,
    payload,
  )
}

// ─── Exam Center Subject Attendance ──────────────────────────────────────────
//
// Angular proc `getExamCenterBundleByCodeUrl` (s_get_exam_center_bundle_bycode)
// with flag `bundle_omr_details` returns the OMR student list for the chosen
// exam center + exam date + question paper. The first group is the student list.
// Filter values are passed through as-is (including `0` for All), matching Angular
// `getPrintStickersData` / `getStudentsList`.

export async function getExamCenterBundleByCode(args: {
  flag: 'bundle_omr_details'
  univExamcenterId: number
  examGroupId: number
  academicYearId: number
  examDate: string
  questionPaperCode: string
  bagId?: number
  bundleNumber?: number
  bundleId?: number
  startEcSeatNo?: number
  endEcSeatNo?: number
  collegeId?: number
  courseId?: number
  courseGroupId?: number
  courseYearId?: number
  subjectId?: number
  regulationId?: number
}): Promise<AnyRow[]> {
  const params = {
    in_flag: args.flag,
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_college_id: args.collegeId ?? 0,
    in_course_id: args.courseId ?? 0,
    in_course_group_id: args.courseGroupId ?? 0,
    in_course_year_id: args.courseYearId ?? 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_subject_id: args.subjectId ?? 0,
    in_regulation_id: args.regulationId ?? 0,
    in_bag_id: args.bagId ?? 0,
    in_bundle_number: args.bundleNumber ?? 0,
    in_bundle_id: args.bundleId ?? 0,
    in_start_ec_seatno: args.startEcSeatNo ?? 0,
    in_end_ec_seatno: args.endEcSeatNo ?? 0,
    in_exam_date: args.examDate ?? '0',
    in_questionpaper_code: args.questionPaperCode ?? '0',
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      UNIV_EXAM_CENTER_API.EXAM_CENTER_BUNDLE_BY_CODE,
      params,
    )
    const raw = data?.result
    if (!Array.isArray(raw)) return []
    const first = raw[0]
    if (Array.isArray(first)) return first.filter((r): r is AnyRow => !!r && typeof r === 'object')
    if (first && typeof first === 'object') return [first as AnyRow]
    return []
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/**
 * Wider variant of `getExamCenterByCodeRows` that supports the `eg_filters`,
 * `eg_ec_filters`, `eg_ec_qc_filters` flags used by the subject-attendance page.
 * Returns the raw groups (Angular `result.data.result` is `AnyRow[][]`), like
 * `getUnivExamGroupCenterGroups`, so the caller can pick the right group.
 */
export async function getExamCenterFilterGroups(args: {
  flag: 'eg_filters' | 'eg_ec_filters' | 'eg_ec_qc_filters' | 'eg_scan_filter'
  flagType?: string
  univExamcenterId?: number
  examGroupId?: number
  academicYearId?: number
  examDate?: string
  questionPaperCode?: string
}): Promise<AnyRow[][]> {
  const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTERS, {
    in_flag: args.flag,
    in_flag_type: args.flagType ?? 'REGSUP',
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_exam_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_university_id: 0,
    in_exam_date: args.examDate ?? '1900-01-01',
    in_questionpaper_code: args.questionPaperCode ?? '',
  })
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  return raw.map((g) =>
    Array.isArray(g)
      ? (g.filter((r) => r && typeof r === 'object') as AnyRow[])
      : g && typeof g === 'object'
        ? [g as AnyRow]
        : [],
  )
}

/** PUT examstudentdetails — Angular `update1(examStudentDetailsUrl, rows)`. */
export async function saveExamCenterAttendance(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return
  await putDetails('examstudentdetails', rows)
}

function flattenExamCenterDetailsFirstGroup(data: { result?: unknown } | undefined): AnyRow[] {
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  const first = raw[0]
  if (Array.isArray(first)) return first.filter((r): r is AnyRow => !!r && typeof r === 'object')
  if (first && typeof first === 'object') return [first as AnyRow]
  return []
}

function isNoRecordsProcError(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : error ?? '')
  return msg.toLowerCase().includes('no record')
}

function normalizeBundleListQuestionPaperCode(code: string | undefined): string {
  if (!code || code === '0') return ''
  return code
}

/**
 * Bundle list for the exam-bundle-print page. Mirrors Angular `getScanBundles()`
 * — proc `s_get_exam_center_details` (CONSTANTS.getCollegeExamCentersUrl) with flag
 * `get_exam_bundle`. Angular always sends `in_exam_date=1900-01-01` and an empty
 * question-paper code when "All" is selected (`questionPaperCode || ''`).
 */
export async function listExamBundlesByCode(args: {
  univExamcenterId: number
  examGroupId: number
  academicYearId: number
  questionPaperCode: string
}): Promise<AnyRow[]> {
  const params = {
    in_flag: 'get_exam_bundle',
    in_flag_type: 'REGSUP',
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_exam_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_university_id: 0,
    in_exam_date: '1900-01-01',
    in_questionpaper_code: normalizeBundleListQuestionPaperCode(args.questionPaperCode),
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTER_DETAILS,
      params,
    )
    return flattenExamCenterDetailsFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/**
 * Barcode rows for exam-seatno-barcodes (Angular `getDetails()` →
 * `getAllRecords/s_get_barcode_details`).
 */
export async function listExamSeatnoBarcodeDetails(args: {
  examGroupId: number
  examCenterId: number
  examDate: string
  subjectId: number
  ecStdSeatNo?: number
}): Promise<AnyRow[]> {
  const params = {
    exam_group_id: args.examGroupId ?? 0,
    in_center_id: args.examCenterId ?? 0,
    in_exam_date: args.examDate ?? '',
    in_subject_id: args.subjectId ?? 0,
    in_ec_seat_no: args.ecStdSeatNo ?? 0,
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.BARCODE_DETAILS, params)
    return flattenExamCenterDetailsFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/**
 * Scan-bundle list for the exam-scan-bundles-print page. Mirrors Angular
 * `getScanBundles()` (flag `get_exam_scan_bundle`) on `s_get_exam_center_details`.
 */
export async function listExamScanBundlesByCode(args: {
  univExamcenterId: number
  examGroupId: number
  academicYearId: number
  examDate: string
  questionPaperCode: string
}): Promise<AnyRow[]> {
  const params = {
    in_flag: 'get_exam_scan_bundle',
    in_flag_type: 'REGSUP',
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_exam_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_university_id: 0,
    in_exam_date: args.examDate ?? '0',
    in_questionpaper_code: args.questionPaperCode ?? '0',
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTER_DETAILS,
      params,
    )
    return flattenExamCenterDetailsFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/** Exam scan profiles for an exam group (Angular `getScanProfiles` / exam-modal — `s_get_exam_center_details`, flag `exam_scan_profile_details`). */
export async function listExamScanProfilesByGroup(examGroupId: number): Promise<AnyRow[]> {
  if (!examGroupId) return []
  try {
    const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTER_DETAILS, {
      in_flag: 'exam_scan_profile_details',
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_exam_group_id: examGroupId,
      in_course_id: 0,
      in_academic_year_id: 0,
      in_exam_id: 0,
      in_college_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_questionpaper_code: 0,
      in_exam_date: '1900-01-01',
    })
    return flattenExamCenterDetailsFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/**
 * Scan-bundle OMR rows (Angular `getPrintStickersData` / scan-bundle-details-new
 * `getexamScanDetails` — flag `scan_bundle_omr_details` on
 * `s_get_exam_center_scan_bycode`). Pass scanBundleId=0 for bulk print.
 */
export async function getExamScanBundleStickers(args: {
  univExamcenterId: number
  examGroupId: number
  academicYearId: number
  examDate: string
  questionPaperCode: string
  scanBundleId: number
  bundleNumber?: number
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.EXAM_CENTER_SCAN_BY_CODE, {
      in_flag: 'scan_bundle_omr_details',
      in_univ_examcenter_id: args.univExamcenterId ?? 0,
      in_exam_group_id: args.examGroupId ?? 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_academic_year_id: args.academicYearId ?? 0,
      in_subject_id: 0,
      in_regulation_id: 0,
      in_bundle_number: args.bundleNumber ?? 0,
      in_scan_bundle_id: args.scanBundleId ?? 0,
      in_start_ec_seatno: 0,
      in_end_ec_seatno: 0,
      in_exam_date: args.examDate,
      in_questionpaper_code: args.questionPaperCode,
    })
    return flattenScanByCodeFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/**
 * Search students by OMR serial number (Angular `enteredOmr` →
 * listByIds(searchExamOmrSerialNoUrl, value, 'query')). Used by the scan-bundle
 * details page to resolve a scanned barcode to a student row.
 */
export async function searchExamOmrSerialNo(query: string): Promise<AnyRow[]> {
  const res = await fetch(NEXT_API.PROXY(`${UNIV_EXAM_CENTER_API.SEARCH_BY_OMR_SERIAL}?query=${encodeURIComponent(query)}`))
  const body = await res.json().catch(() => null)
  const data = (body as { data?: unknown })?.data ?? body
  return Array.isArray(data) ? (data as AnyRow[]) : []
}

/**
 * Bulk-assign scanned OMR answer papers to a scan bundle (Angular
 * `AssignScanBundles` → add(saveUnivExamScanbundleDetailsUrl, details)).
 * Confirm the endpoint name with the backend if the save no-ops.
 */
export async function saveScanBundleDetails(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return
  await postDetails('saveUnivExamScanbundleDetails', rows)
}

export async function createUnivEcProfile(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_PROFILES, payload)
}

export async function updateUnivEcProfile(univEcProfileId: number, payload: Record<string, unknown>): Promise<AnyRow> {
  const pks = ['examScanProfileId', 'univEcPorifleId', 'univEcProfileId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_PROFILES, pk, univEcProfileId, payload)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam scan profile')
}

export function pickExamScanBundleId(row: AnyRow): number {
  return num(
    row.univExamScanbundleId ??
      row.univ_exam_scanbundle_id ??
      row.examScanBundleId ??
      row.exam_scan_bundle_id ??
      row.pk_univ_exam_scan_bundle_id ??
      row.unvExamBundleId,
  )
}

export async function listAllActiveExamScanBundles(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLES, buildQuery({ isActive: true }))
}

/** Angular scan-bundles `getScanBundles()` — list by exam group / course year / regulation / subject. */
export async function listExamScanBundlesBySubjectFilters(args: {
  examGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const { examGroupId, courseYearId, regulationId, subjectId } = args
  if (!examGroupId || !courseYearId || !regulationId || !subjectId) return []
  const queries = [
    buildQuery({
      'univExamGroup.univExamGroupId': examGroupId,
      'courseYear.courseYearId': courseYearId,
      'regulation.regulationId': regulationId,
      'subject.subjectId': subjectId,
      isActive: true,
    }),
    buildQuery({
      examGroupId,
      courseYearId,
      regulationId,
      subjectId,
      isActive: true,
    }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLES, q)
    } catch {
      /* try next query shape */
    }
  }
  return []
}

function flattenScanByCodeFirstGroup(data: { result?: unknown } | undefined): AnyRow[] {
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  const first = raw[0]
  if (Array.isArray(first)) return first.filter((r): r is AnyRow => !!r && typeof r === 'object')
  if (first && typeof first === 'object') return [first as AnyRow]
  return []
}

/** Angular scan-bundles `getPrintStickersData()` — flag `scan_bundle_omr_details` on `s_get_exam_center_scan_bycode`. */
export async function getScanBundleOmrDetailsBySubject(args: {
  examGroupId: number
  academicYearId: number
  courseId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  scanBundleId: number
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.EXAM_CENTER_SCAN_BY_CODE, {
      in_flag: 'scan_bundle_omr_details',
      in_univ_examcenter_id: 0,
      in_exam_group_id: args.examGroupId ?? 0,
      in_college_id: 0,
      in_course_id: args.courseId ?? 0,
      in_course_group_id: 0,
      in_course_year_id: args.courseYearId ?? 0,
      in_academic_year_id: args.academicYearId ?? 0,
      in_subject_id: args.subjectId ?? 0,
      in_regulation_id: args.regulationId ?? 0,
      in_bundle_number: 0,
      in_scan_bundle_id: args.scanBundleId ?? 0,
      in_start_ec_seatno: 0,
      in_end_ec_seatno: 0,
      in_exam_date: '1900-01-01',
      in_questionpaper_code: '',
    })
    return flattenScanByCodeFirstGroup(data)
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return []
    throw error
  }
}

/** Angular scan-bundles `populate()` — flag `pop_scan_bundle_omr_details`. */
export async function populateScanBundleOmrDetails(args: {
  examGroupId: number
  academicYearId: number
  courseId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  scanBundleId: number
}): Promise<void> {
  try {
    await getAllRecords(UNIV_EXAM_CENTER_API.POP_EXAM_CENTER_SCAN_DETAILS, {
      in_flag: 'pop_scan_bundle_omr_details',
      in_univ_examcenter_id: 0,
      in_exam_group_id: args.examGroupId ?? 0,
      in_college_id: 0,
      in_course_id: args.courseId ?? 0,
      in_course_group_id: 0,
      in_course_year_id: args.courseYearId ?? 0,
      in_academic_year_id: args.academicYearId ?? 0,
      in_subject_id: args.subjectId ?? 0,
      in_regulation_id: args.regulationId ?? 0,
      in_bundle_number: 0,
      in_scan_bundle_id: args.scanBundleId ?? 0,
      in_start_ec_seatno: 0,
      in_end_ec_seatno: 0,
    })
  } catch (error: unknown) {
    if (isNoRecordsProcError(error)) return
    throw error
  }
}

export async function createExamScanBundle(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLES, payload)
}

export async function updateExamScanBundle(examScanBundleId: number, payload: Record<string, unknown>): Promise<AnyRow> {
  const pks = ['examScanBundleId', 'unvExamBundleId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLES, pk, examScanBundleId, payload)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam scan bundle')
}

export function pickExamScanBundleDetailId(row: AnyRow): number {
  return num(row.examScanBundleDetailId ?? row.exam_scan_bundle_detail_id ?? row.unvExamBundleDetailId)
}

export async function listAllActiveExamScanBundleDetails(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLE_DETAILS, buildQuery({ isActive: true }))
}

export async function createExamScanBundleDetail(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLE_DETAILS, payload)
}

export async function updateExamScanBundleDetail(
  examScanBundleDetailId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  const pks = ['examScanBundleDetailId', 'unvExamBundleDetailId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_SCAN_BUNDLE_DETAILS, pk, examScanBundleDetailId, payload)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam scan bundle detail')
}

export function pickUnivEcQuestionPaperConfigId(row: AnyRow): number {
  return num(row.univEcQuestionPaperConfigId ?? row.univ_ec_question_paper_config_id)
}

export async function listAllUnivEcQuestionPaperConfigs(): Promise<AnyRow[]> {
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EC_QP_CONFIG)
}

export async function createUnivEcQuestionPaperConfig(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EC_QP_CONFIG, payload)
}

export async function updateUnivEcQuestionPaperConfig(
  univEcQuestionPaperConfigId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.EC_QP_CONFIG,
    'univEcQuestionPaperConfigId',
    univEcQuestionPaperConfigId,
    payload,
  )
}

export function pickUnivExamCenterRoomId(row: AnyRow): number {
  return num(row.univExamCenterRoomId ?? row.univ_exam_center_room_id)
}

export async function listBuildingsByUnivExamCenter(univExamcenterId: number): Promise<AnyRow[]> {
  if (!univExamcenterId) return []
  return domainList<AnyRow>(
    SETUP_API.BUILDING,
    buildQuery({ univExamCenterId: univExamcenterId, isActive: true }),
  )
}

export async function listBlocksByBuilding(buildingId: number): Promise<AnyRow[]> {
  if (!buildingId) return []
  return domainList<AnyRow>(SETUP_API.BLOCK, buildQuery({ 'Building.buildingId': buildingId, isActive: true }))
}

export async function listFloorsByBlock(blockId: number): Promise<AnyRow[]> {
  if (!blockId) return []
  return domainList<AnyRow>(SETUP_API.FLOOR, buildQuery({ 'Block.blockId': blockId, isActive: true }))
}

export async function listRoomsByFilters(
  buildingId: number,
  blockId: number,
  floorId: number,
): Promise<AnyRow[]> {
  const where: Record<string, string | number | boolean> = { isActive: true }
  if (buildingId > 0) where['Building.buildingId'] = buildingId
  if (blockId > 0) where['Block.blockId'] = blockId
  if (floorId > 0) where['Floor.floorId'] = floorId
  return domainList<AnyRow>(SETUP_API.ROOM, buildQuery(where))
}

export async function listUnivExamCenterRoomsByFilters(
  examId: number,
  univExamcenterId: number,
  buildingId: number,
): Promise<AnyRow[]> {
  if (!examId || !univExamcenterId) return []
  const where: Record<string, string | number | boolean> = {
    'examMaster.examId': examId,
    'univExamcenters.univExamcenterId': univExamcenterId,
    isActive: true,
  }
  if (buildingId > 0) where['building.buildingId'] = buildingId
  return domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_CENTER_ROOMS, buildQuery(where))
}

export async function addListUnivExamCenterRooms(payload: Record<string, unknown>[]): Promise<void> {
  if (!payload.length) return
  await postDetails(UNIV_EXAM_CENTER_API.ADD_EXAM_CENTER_ROOMS, payload)
}

export async function updateUnivExamCenterRoom(
  univExamCenterRoomId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.EXAM_CENTER_ROOMS,
    'univExamCenterRoomId',
    univExamCenterRoomId,
    payload,
  )
}

export async function listExamSeatStatuses(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    SETUP_API.GENERAL_DETAIL,
    buildQuery({
      'GeneralMaster.generalMasterCode': 'EXMSEATS',
      isActive: true,
    }),
  )
}

// ─── Exam Regional Centers (`UnivExamRegionalCenters`) ───────────────────────

export function pickUnivExamRegionalCenterId(row: AnyRow): number {
  return num(
    row.univExamReionalCenterId ??
      row.univExamRegionalCenterId ??
      row.univ_exam_reional_center_id ??
      row.univ_exam_regional_center_id,
  )
}

export async function listUnivExamRegionalCentersByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
    buildQuery({ 'University.universityId': universityId, isActive: true }),
    buildQuery({ 'university.universityId': universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
    buildQuery({ 'Universities.universityId': universityId }),
  ]
  let firstErr: unknown
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.REGIONAL_CENTERS, q)
    } catch (e) {
      if (firstErr === undefined) firstErr = e
    }
  }
  if (firstErr instanceof Error) throw firstErr
  throw new AppError('API_ERROR', 'Failed to list exam regional centers')
}

export async function createUnivExamRegionalCenter(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.REGIONAL_CENTERS, payload)
}

export async function updateUnivExamRegionalCenter(
  univExamRegionalCenterId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  const pks = ['univExamReionalCenterId', 'univExamRegionalCenterId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(
        UNIV_EXAM_CENTER_API.REGIONAL_CENTERS,
        pk,
        univExamRegionalCenterId,
        payload,
      )
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam regional center')
}

export async function listActiveCities(): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>('City', buildQuery({ isActive: true }, { field: 'cityCode', direction: 'ASC' }))
  } catch {
    return domainList<AnyRow>('City', buildQuery({}, { field: 'cityCode', direction: 'ASC' }))
  }
}

// ─── Exam Centers (`UnivExamCenters`) ────────────────────────────────────────

export function pickUnivExamCenterId(row: AnyRow): number {
  return num(row.univExamcenterId ?? row.univ_examcenter_id ?? row.univExamCenterId ?? row.univ_exam_center_id)
}

export async function listUnivExamCentersByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
    buildQuery({ 'University.universityId': universityId, isActive: true }),
    buildQuery({ 'university.universityId': universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
    buildQuery({ 'Universities.universityId': universityId }),
  ]
  let firstErr: unknown
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_CENTERS, q)
    } catch (e) {
      if (firstErr === undefined) firstErr = e
    }
  }
  if (firstErr instanceof Error) throw firstErr
  throw new AppError('API_ERROR', 'Failed to list exam centers')
}

export async function createUnivExamCenter(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_CENTERS, payload)
}

export async function updateUnivExamCenter(
  univExamcenterId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  const pks = ['univExamcenterId', 'univExamCenterId'] as const
  let lastErr: unknown
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EXAM_CENTERS, pk, univExamcenterId, payload)
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to update exam center')
}

// ─── Exam Center Colleges (`UnivEcColleges`) ─────────────────────────────────

export function pickUnivEcCollegeId(row: AnyRow): number {
  return num(row.univEcCollegeId ?? row.univ_ec_college_id)
}

export async function listUnivEcCollegesByCenterAndExam(
  univExamcenterId: number,
  examId: number,
): Promise<AnyRow[]> {
  if (!univExamcenterId || !examId) return []
  const queries = [
    buildQuery(
      {
        'univExamCenters.univExamcenterId': univExamcenterId,
        'examMaster.examId': examId,
        isActive: true,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
    buildQuery({
      'UnivExamCenters.univExamcenterId': univExamcenterId,
      'ExamMaster.examId': examId,
      isActive: true,
    }),
  ]
  let firstErr: unknown
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EC_COLLEGES, q)
    } catch (e) {
      if (firstErr === undefined) firstErr = e
    }
  }
  // Some Spring builds reject one relation path but still work for others; if all variants fail,
  // keep the page usable by returning an empty list instead of hard-failing Get List.
  if (firstErr instanceof Error) return []
  return []
}

export async function addListUnivEcColleges(payload: Record<string, unknown>[]): Promise<void> {
  if (!payload.length) return
  await postDetails(UNIV_EXAM_CENTER_API.ADD_EC_COLLEGES, payload)
}

export async function updateUnivEcCollege(univEcCollegeId: number, payload: Record<string, unknown>): Promise<AnyRow> {
  return domainUpdate<AnyRow>(UNIV_EXAM_CENTER_API.EC_COLLEGES, 'univEcCollegeId', univEcCollegeId, payload)
}

export async function listUnivEcStudentsByCenterExamSubject(
  univExamcenterId: number,
  examId: number,
  subjectId: number,
): Promise<AnyRow[]> {
  if (!univExamcenterId || !examId || !subjectId) return []
  const queries = [
    buildQuery({
      'univExamCenters.univExamcenterId': univExamcenterId,
      'examMaster.examId': examId,
      'subject.subjectId': subjectId,
      isActive: true,
    }),
    buildQuery({
      'UnivExamCenters.univExamcenterId': univExamcenterId,
      'ExamMaster.examId': examId,
      'Subject.subjectId': subjectId,
      isActive: true,
    }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EC_STUDENTS, q)
    } catch {
      /* try next variant */
    }
  }
  return []
}

export async function addListUnivEcStudents(payload: Record<string, unknown>[]): Promise<void> {
  if (!payload.length) return
  await postDetails(UNIV_EXAM_CENTER_API.ADD_EC_STUDENTS, payload)
}

// ─── Exam Center Courses/Groups/Years/Subjects (`UnivEcCollegeDetails`) ──────

export async function getExamCenterByCodeRows(args: {
  flag: 'exam_center_clg_filters' | 'ec_grp_yr_subjects' | 'eg_filters' | 'eg_scan_filter'
  flagType?: string
  univExamcenterId?: number
  examGroupId?: number
  collegeId?: number
  courseId?: number
  courseGroupId?: number
  courseYearId?: number
  subjectId?: number
  examId?: number
  academicYearId?: number
  regulationId?: number
  universityId?: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTERS, {
    in_flag: args.flag,
    in_flag_type: args.flagType ?? 'REGSUP',
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_college_id: args.collegeId ?? 0,
    in_course_id: args.courseId ?? 0,
    in_course_group_id: args.courseGroupId ?? 0,
    in_course_year_id: args.courseYearId ?? 0,
    in_exam_id: args.examId ?? 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_regulation_id: args.regulationId ?? 0,
    in_subject_id: args.subjectId ?? 0,
    in_university_id: args.universityId ?? 0,
    in_exam_date: '1900-01-01',
    in_questionpaper_code: '',
  })
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  const out: AnyRow[] = []
  for (const chunk of raw) {
    if (Array.isArray(chunk)) {
      for (const row of chunk) if (row && typeof row === 'object') out.push(row as AnyRow)
    } else if (chunk && typeof chunk === 'object') {
      out.push(chunk as AnyRow)
    }
  }
  return out
}

/**
 * Exam-Group → Exam-Center → Colleges flow (Angular univ-examcenter-colleges, todo/Source).
 * Proc `s_get_exam_center_bycode` (CONSTANTS.profileDetailUrl) with eg_* flags + in_university_id.
 * Returns the RAW result groups so the caller can pick a group by `[0].flag` / index, like Angular.
 *  - eg_filters         → group `eg_ay_filter` (academic years + exam groups + colleges)
 *  - eg_ec_filters      → result[0] = exam centers (fk_univ_ec_id, ec_code, ec_name)
 *  - eg_clg_cou_exam_list→ result[0] = assigned exam-center colleges
 */
export async function getUnivExamGroupCenterGroups(args: {
  flag: 'eg_filters' | 'eg_ec_filters' | 'eg_clg_cou_exam_list'
  examGroupId?: number
  univExamcenterId?: number
  academicYearId?: number
  universityId: number
}): Promise<AnyRow[][]> {
  const data = await getAllRecords<{ result?: unknown }>(UNIV_EXAM_CENTER_API.GET_COLLEGE_EXAM_CENTERS, {
    in_flag: args.flag,
    in_flag_type: '',
    in_univ_examcenter_id: args.univExamcenterId ?? 0,
    in_exam_group_id: args.examGroupId ?? 0,
    in_exam_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_academic_year_id: args.academicYearId ?? 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_university_id: args.universityId ?? 0,
    in_exam_date: '1900-01-01',
    in_questionpaper_code: '',
  })
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  return raw.map((g) =>
    Array.isArray(g)
      ? (g.filter((r) => r && typeof r === 'object') as AnyRow[])
      : g && typeof g === 'object'
        ? [g as AnyRow]
        : [],
  )
}

export async function listUnivEcCollegeDetailsByUnivEcCollege(univEcCollegeId: number): Promise<AnyRow[]> {
  if (!univEcCollegeId) return []
  const queries = [
    buildQuery({ 'univEcColleges.univEcCollegeId': univEcCollegeId, isActive: true }),
    buildQuery({ 'UnivEcColleges.univEcCollegeId': univEcCollegeId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.EC_COLLEGE_DETAILS, q)
    } catch {
      /* try next */
    }
  }
  return []
}

export async function addUnivEcCollegeDetails(payload: Record<string, unknown>[]): Promise<void> {
  if (!payload.length) return
  await postDetails(UNIV_EXAM_CENTER_API.ADD_EC_COLLEGE_DETAILS, payload)
}

export async function updateInActiveUnivEcCollegeDetails(payload: Record<string, unknown>): Promise<void> {
  await putDetails(UNIV_EXAM_CENTER_API.UPDATE_INACTIVE_EC_COLLEGE_DETAILS, payload)
}

// ─── Exam Group — `UnivExamGroup` + `clg_filters` (see Spring query `university.universityId`) ─

/**
 * Universities for the Exam Group filter — same proc as Angular:
 * `getAllRecords/s_get_collegewisedetails_bycode` with `in_flag=clg_filters`.
 */
export async function listUniversitiesForExamGroup(orgId: number, employeeId: number): Promise<AnyRow[]> {
  const { filtersData } = await getCollegeFilters(orgId, employeeId)
  const m = new Map<number, AnyRow>()
  for (const r of filtersData) {
    const id = num(r.fk_university_id)
    if (id > 0 && !m.has(id)) {
      m.set(id, {
        universityId: id,
        university_name: r.university_name,
        university_code: r.university_code,
      })
    }
  }
  return [...m.values()]
}

/**
 * List exam groups for a university — matches Angular:
 * `domain/list/UnivExamGroup?query=university.universityId=={id}`
 *
 * Tries a few relation-path variants; **throws** the last error if all fail (never swallows API errors).
 */
export async function listExamGroupingsByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!Number.isFinite(universityId) || universityId <= 0) return []
  const queries = [
    buildQuery({ 'university.universityId': universityId }),
    buildQuery({ 'University.universityId': universityId }),
    buildQuery({ 'Universities.universityId': universityId }),
  ]
  let firstErr: unknown
  for (const q of queries) {
    try {
      return await domainList<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP, q)
    } catch (e) {
      if (firstErr === undefined) firstErr = e
    }
  }
  if (firstErr instanceof Error) throw firstErr
  throw new AppError('API_ERROR', 'Failed to list UnivExamGroup')
}

export function pickExamGroupingId(row: AnyRow): number {
  return num(row.univExamGroupId ?? row.univ_exam_group_id ?? row.examGroupingId ?? row.exam_grouping_id)
}

async function findExamGroupInUniversityList(id: number, universityId: number): Promise<AnyRow | null> {
  if (universityId <= 0) return null
  try {
    const list = await listExamGroupingsByUniversity(universityId)
    return list.find((r) => pickExamGroupingId(r) === id) ?? null
  } catch {
    return null
  }
}

/** Last resort: same universities as Exam Group filter, find row by PK (bookmark without `universityId`). */
async function findExamGroupByScanningUniversities(
  id: number,
  orgId: number,
  employeeId: number,
): Promise<AnyRow | null> {
  if (orgId <= 0) return null
  try {
    const univs = await listUniversitiesForExamGroup(orgId, employeeId)
    for (const u of univs) {
      const uid = num(u.universityId ?? u.university_id)
      const hit = await findExamGroupInUniversityList(id, uid)
      if (hit) return hit
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Load one exam group by primary key.
 *
 * Some Spring builds reject or ignore simple `univExamGroupId==n` filters on `domain/list/UnivExamGroup`.
 * We try several property / naming variants, then (when `universityIdHint` is set) locate the row from
 * {@link listExamGroupingsByUniversity} — the same list the grid uses — by matching PK.
 *
 * When `scanOrg` is provided and earlier steps fail, we scan each university from
 * {@link listUniversitiesForExamGroup} (same as the Exam Group screen) until the row is found — supports
 * bookmarked URLs without `universityId`.
 */
export async function getExamGroupingById(
  id: number,
  universityIdHint?: number,
  scanOrg?: { orgId: number; employeeId: number },
): Promise<AnyRow | null> {
  if (!id) return null
  const queries = [
    buildQuery({ univExamGroupId: id }),
    buildQuery({ examGroupingId: id }),
    buildQuery({ univ_exam_group_id: id }),
    buildQuery({ exam_grouping_id: id }),
    buildQuery({ 'UnivExamGroup.univExamGroupId': id }),
    buildQuery({ id }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP, q)
      if (rows.length > 0 && rows[0]) return rows[0]
    } catch {
      /* try next shape */
    }
  }

  const fromHint = await findExamGroupInUniversityList(id, num(universityIdHint))
  if (fromHint) return fromHint

  return findExamGroupByScanningUniversities(id, num(scanOrg?.orgId), num(scanOrg?.employeeId))
}

export async function createExamGrouping(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP, payload)
}

export async function updateExamGrouping(
  univExamGroupId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP,
    'univExamGroupId',
    univExamGroupId,
    payload,
  )
}

// ─── Exam group ↔ exam lines (`UnivExamGroupDetails`) ─────────────────────────

/** Matches: `domain/list/UnivExamGroupDetails?query=univExamGroup.univExamGroupId=={id}.and.isActive==true` */
export async function listExamGroupExamLines(univExamGroupId: number): Promise<AnyRow[]> {
  if (!univExamGroupId) return []
  const q = buildQuery({
    'univExamGroup.univExamGroupId': univExamGroupId,
    isActive: true,
  })
  try {
    const rows = await domainList<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP_DETAILS, q)
    return rows.filter((r) => r.isActive !== false)
  } catch {
    const qLoose = buildQuery({ 'univExamGroup.univExamGroupId': univExamGroupId })
    return domainList<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP_DETAILS, qLoose)
  }
}

export async function createExamGroupExamLine(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP_DETAILS, {
    isActive: true,
    ...payload,
  })
}

/**
 * Remove a line — soft delete (`isActive: false`) on `UnivExamGroupDetails`.
 */
export async function removeExamGroupExamLine(lineId: number): Promise<void> {
  if (!lineId) return
  const pkCandidates = [
    'univExamGroupDetailsId',
    'univ_exam_group_details_id',
    'univExamGroupExamId',
    'univ_exam_group_exam_id',
  ] as const
  let lastErr: unknown
  for (const pk of pkCandidates) {
    try {
      await domainSoftDelete(UNIV_EXAM_CENTER_API.UNIV_EXAM_GROUP_DETAILS, pk, lineId)
      return
    } catch (e) {
      lastErr = e
    }
  }
  if (lastErr instanceof Error) throw lastErr
  throw new AppError('API_ERROR', 'Failed to remove exam from group')
}

export function pickExamGroupLineId(row: AnyRow): number {
  return num(
    row.univExamGroupDetailsId ??
      row.univ_exam_group_details_id ??
      row.univExamGroupExamId ??
      row.univ_exam_group_exam_id ??
      row.examGroupingExamId ??
      row.exam_grouping_exam_id,
  )
}

function flattenExamGroupByCodeResult(data: { result?: unknown }): AnyRow[] {
  const raw = data?.result
  if (!Array.isArray(raw)) return []
  const out: AnyRow[] = []
  for (const chunk of raw) {
    if (Array.isArray(chunk)) {
      for (const row of chunk) {
        if (row && typeof row === 'object') out.push(row as AnyRow)
      }
    } else if (chunk && typeof chunk === 'object') {
      out.push(chunk as AnyRow)
    }
  }
  return out
}

/**
 * `getAllRecords/s_get_exam_group_bycode` — e.g. `in_flag=univ_exam_group_list`, `in_flag_type=REGSUP`,
 * used for exam pick lists in exam group context (Angular parity).
 */
export async function getExamGroupByCodeRows(args: {
  universityId: number
  examGroupId: number
  academicYearId: number
  /** ISO date `yyyy-MM-dd` (e.g. `2026-01-01`) */
  examMonthYrIso: string
  employeeId: number
  flagType?: string
  loginUserRoleId?: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: unknown }>(UNIV_EXAM_CENTER_API.EXAM_GROUP_BY_CODE, {
    in_flag: 'univ_exam_group_list',
    in_flag_type: args.flagType ?? 'REGSUP',
    in_university_id: args.universityId,
    in_exam_group_id: args.examGroupId,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: args.academicYearId,
    in_exam_month_yr: args.examMonthYrIso,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: args.loginUserRoleId ?? 0,
    in_loginuser_empid: args.employeeId,
  })
  return flattenExamGroupByCodeResult(data)
}

export function pickLineExamId(row: AnyRow): number {
  const nested = row.examMaster ?? row.exam_master
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    return num(o.examId ?? o.exam_id ?? o.fk_exam_id)
  }
  return num(row.fk_exam_id ?? row.examId ?? row.exam_id)
}

export function pickLineExamLabel(row: AnyRow): string {
  const nested = row.examMaster ?? row.exam_master ?? row.exam
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    const n = o.examName ?? o.exam_name ?? o.examShortName ?? o.exam_short_name
    return typeof n === 'string' ? n : '-'
  }
  const n = row.examName ?? row.exam_name ?? row.examShortName ?? row.exam_short_name
  return typeof n === 'string' ? n : '-'
}

/**
 * Exams available to attach — prefers one `ExamMaster` query; falls back to merging per course under the university.
 */
export async function listExamsForExamGroupPicker(
  universityId: number,
  academicYearId: number,
): Promise<AnyRow[]> {
  if (!universityId || !academicYearId) return []
  try {
    const direct = await domainList<AnyRow>(
      'ExamMaster',
      buildQuery(
        {
          'Universities.universityId': universityId,
          'AcademicYear.academicYearId': academicYearId,
          isActive: true,
        },
        { field: 'createdDt', direction: 'DESC' },
      ),
    )
    if (direct.length > 0) return direct
  } catch {
    /* fallback below */
  }

  const courses = await listCoursesByUniversity(universityId).catch(() => [])
  const merged = new Map<number, AnyRow>()
  for (const c of courses) {
    const cid = num(c.courseId ?? c.course_id ?? c.id ?? c.fk_course_id)
    if (!cid) continue
    const exams = await listExamMastersByCourseAndAy(cid, academicYearId).catch(() => [])
    for (const e of exams) {
      const eid = num(e.examId ?? e.exam_id)
      if (eid > 0) merged.set(eid, e)
    }
  }
  return [...merged.values()]
}
