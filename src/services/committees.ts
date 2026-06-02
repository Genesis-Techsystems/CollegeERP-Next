import type {
  UnivCommittee,
  UnivCommitteePosition,
  UnivCommitteeMember,
  UnivCommitteeMeeting,
  UnivRemunerationSetting,
  UnivProfileRecruitment,
  UnivExaminationRemuneration,
  RemunerationPaymentSummary,
  CommitteeFilterRow,
  UnivExamFilterRow,
  EvaluatorProfileRow,
} from '@/types/committees'
import { UNIV_COMMITTEE_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import {
  buildQuery,
  domainList,
  domainCreate,
  domainUpdate,
  getAllRecords,
  fetchDetails,
  postDetails,
  putDetails,
} from './crud'

const EC = ENTITIES.UNIV_COMMITTEE
const EP = ENTITIES.UNIV_COMMITTEE_POSITION
const EM = ENTITIES.UNIV_COMMITTEE_MEMBER
const ERS = ENTITIES.UNIV_REMUNERATION_SETTING
const EPR = ENTITIES.UNIV_PROFILE_RECRUITMENT
const ERD = ENTITIES.UNIV_EXAMINATION_REMUNERATION

const COMMITTEE_PROC = 's_get_committeedetails_bycodes'
const EXAM_EVAL_PROC = 's_get_examevaluation_bycodes'
const EXAM_REM_PROC = 's_pop_exam_remunerationdetails'
const REM_REPORT_PROC = 's_get_examevaluation_remuneration_report'

const BASE_COMMITTEE_PROC = {
  in_exam_month_yr: '',
  in_course_code: '',
  in_course_year_code: '',
  in_subject_code: '',
  in_evalutor_profileid: 0,
  in_evaluator_role_id: 0,
  in_exam_date: '1990-01-01',
  in_regulation_code: '',
  in_emp_id: 0,
  in_academic_year: '',
  in_exam_short_name: '',
  in_affiliatedto_catdet_id: 0,
  in_univ_exam_id: 0,
  in_univ_committee_id: 0,
  in_committee_meeting_id: 0,
  in_loginuser_id: 0,
} as const

function procRows<T>(data: { result?: T[][] } | null | undefined, index = 0): T[] {
  const rows = data?.result?.[index]
  return Array.isArray(rows) ? rows : []
}

function distinctBy<T>(rows: T[], keyFn: (row: T) => unknown): T[] {
  const seen = new Set<unknown>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Committees ───────────────────────────────────────────────────────────────

export async function listCommittees(organizationId: number): Promise<UnivCommittee[]> {
  return domainList<UnivCommittee>(
    EC.name,
    buildQuery(
      { 'Organization.organizationId': organizationId },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function listActiveCommittees(organizationId: number): Promise<UnivCommittee[]> {
  return domainList<UnivCommittee>(
    EC.name,
    buildQuery(
      { 'Organization.organizationId': organizationId, isActive: true },
      { field: 'committeeName', direction: 'ASC' },
    ),
  )
}

export async function createCommittee(data: Partial<UnivCommittee>): Promise<UnivCommittee> {
  return domainCreate<UnivCommittee>(EC.name, data)
}

export async function updateCommittee(id: number, data: Partial<UnivCommittee>): Promise<UnivCommittee> {
  return domainUpdate<UnivCommittee>(EC.name, EC.pk, id, data)
}

// ─── Committee Positions ─────────────────────────────────────────────────────

export async function listCommitteePositions(organizationId: number): Promise<UnivCommitteePosition[]> {
  return domainList<UnivCommitteePosition>(
    EP.name,
    buildQuery(
      { 'Organization.organizationId': organizationId },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function listAllCommitteePositions(): Promise<UnivCommitteePosition[]> {
  return domainList<UnivCommitteePosition>(EP.name, buildQuery({}, { field: 'createdDt', direction: 'DESC' }))
}

export async function createCommitteePosition(data: Partial<UnivCommitteePosition>): Promise<UnivCommitteePosition> {
  return domainCreate<UnivCommitteePosition>(EP.name, data)
}

export async function updateCommitteePosition(
  id: number,
  data: Partial<UnivCommitteePosition>,
): Promise<UnivCommitteePosition> {
  return domainUpdate<UnivCommitteePosition>(EP.name, EP.pk, id, data)
}

// ─── Committee Members ───────────────────────────────────────────────────────

export async function listCommitteeMembers(univCommitteeId: number): Promise<UnivCommitteeMember[]> {
  return domainList<UnivCommitteeMember>(
    EM.name,
    buildQuery(
      { 'UnivCommittees.univCommitteeId': univCommitteeId },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function createCommitteeMember(data: Partial<UnivCommitteeMember>): Promise<UnivCommitteeMember> {
  return domainCreate<UnivCommitteeMember>(EM.name, data)
}

export async function updateCommitteeMember(
  id: number,
  data: Partial<UnivCommitteeMember>,
): Promise<UnivCommitteeMember> {
  return domainUpdate<UnivCommitteeMember>(EM.name, EM.pk, id, data)
}

// ─── Stored-proc filters ─────────────────────────────────────────────────────

export async function getCommitteeDetailsByFlag(flag: string, overrides: Record<string, string | number> = {}) {
  const data = await getAllRecords<{ result: CommitteeFilterRow[][] }>(COMMITTEE_PROC, {
    in_flag: flag,
    ...BASE_COMMITTEE_PROC,
    ...overrides,
  }).catch(() => ({ result: [] as CommitteeFilterRow[][] }))
  return procRows<CommitteeFilterRow>(data)
}

export async function getCommitteeMemberFilters(): Promise<CommitteeFilterRow[]> {
  const rows = await getCommitteeDetailsByFlag('committee_members')
  return distinctBy(rows, (r) => r.pk_univ_committee_id)
}

export async function getCommitteeCreateFormData() {
  const data = await getAllRecords<{ result: Record<string, unknown>[][] }>(COMMITTEE_PROC, {
    in_flag: 'univ_exams,MasterUniversityDepartments,evaluationroles,committee_members',
    ...BASE_COMMITTEE_PROC,
  }).catch(() => ({ result: [] as Record<string, unknown>[][] }))

  const committees = procRows<Record<string, unknown>>(data, 0)
  const exams = distinctBy(procRows<Record<string, unknown>>(data, 1), (r) => r.pk_university_exam_id)
  const departments = procRows<Record<string, unknown>>(data, 2)
  const roles = procRows<Record<string, unknown>>(data, 3)
  const parentCommittees = distinctBy(
    committees.map((r) => ({
      pk_univ_committee_id: Number(r.pk_univ_committee_id),
      committee_name: String(r.committee_name ?? ''),
    })),
    (r) => r.committee_name,
  )

  return { exams, departments, roles, parentCommittees }
}

export async function getCommitteeExamSubjects(universityExamId: number) {
  const rows = await getCommitteeDetailsByFlag('univ_exam_subjects', { in_univ_exam_id: universityExamId })
  return distinctBy(rows, (r) => r.subject_code)
}

export async function getEvaluatorProfilesForRecruitment(params: {
  universityExamId: number
  subjectCode?: string
}): Promise<EvaluatorProfileRow[]> {
  const rows = await getCommitteeDetailsByFlag('committee_recruiitment_profiles', {
    in_univ_exam_id: params.universityExamId,
    in_subject_code: params.subjectCode ?? '',
  })
  return rows as EvaluatorProfileRow[]
}

// ─── Committee Meetings ──────────────────────────────────────────────────────

export async function listScheduledMeetings(params: {
  univCommitteeId: number
  academicYear: string
  universityExamId: number
}): Promise<UnivCommitteeMeeting[]> {
  const data = await fetchDetails<{ univCommitteeMeetingDetails?: UnivCommitteeMeeting[] }>(
    UNIV_COMMITTEE_API.GET_MEETING_MEMBERS,
    {
      univCommitteeId: params.univCommitteeId,
      academicYear: params.academicYear,
      universityExamId: params.universityExamId,
    },
  ).catch(() => ({ univCommitteeMeetingDetails: [] }))
  return data.univCommitteeMeetingDetails ?? []
}

export async function listCommitteeMeetingsForFinalise(
  univCommitteeId: number,
  universityExamId: number,
): Promise<UnivCommitteeMeeting[]> {
  return domainList<UnivCommitteeMeeting>(
    ENTITIES.UNIV_COMMITTEE_MEETING.name,
    buildQuery({
      'UnivCommittees.univCommitteeId': univCommitteeId,
      'UniversityExam.universityExamId': universityExamId,
      isActive: true,
    }),
  )
}

export async function createCommitteeMeeting(data: unknown): Promise<unknown> {
  return postDetails(UNIV_COMMITTEE_API.COMMITTEE_MEETING_POST, data)
}

// ─── Profile Recruitments ────────────────────────────────────────────────────

export async function listProfileRecruitments(params: {
  organizationId: number
  univCommitteeId: number
  universityExamId: number
}): Promise<UnivProfileRecruitment[]> {
  return domainList<UnivProfileRecruitment>(
    EPR.name,
    buildQuery({
      'organization.organizationId': params.organizationId,
      'univCommittees.univCommitteeId': params.univCommitteeId,
      'universityExam.universityExamId': params.universityExamId,
      isActive: true,
    }),
  )
}

export async function addMultipleProfileRecruitments(payload: unknown[]): Promise<unknown> {
  return postDetails(UNIV_COMMITTEE_API.ADD_PROFILE_RECRUITMENTS, payload)
}

export async function updateProfileRecruitment(
  id: number,
  data: Partial<UnivProfileRecruitment>,
): Promise<UnivProfileRecruitment> {
  return domainUpdate<UnivProfileRecruitment>(EPR.name, EPR.pk, id, data)
}

export async function releaseOfferLetter(payload: unknown): Promise<unknown> {
  return postDetails(UNIV_COMMITTEE_API.MAIL_RELEASE_OFFER_LETTER, payload)
}

// ─── Remuneration Settings ───────────────────────────────────────────────────

export async function listRemunerationSettings(): Promise<UnivRemunerationSetting[]> {
  return domainList<UnivRemunerationSetting>(
    ERS.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listRemunerationDesignations(): Promise<
  { remunerationDesignationCatDetId: number; remunerationDesignationName?: string; name?: string }[]
> {
  return domainList(
    UNIV_COMMITTEE_API.REMUNERATION_DESIGNATION,
    buildQuery({ isActive: true }, { field: 'createdDt', direction: 'ASC' }),
  )
}

export async function createRemunerationSetting(data: Partial<UnivRemunerationSetting>): Promise<UnivRemunerationSetting> {
  return domainCreate<UnivRemunerationSetting>(ERS.name, data)
}

export async function updateRemunerationSetting(
  id: number,
  data: Partial<UnivRemunerationSetting>,
): Promise<UnivRemunerationSetting> {
  return domainUpdate<UnivRemunerationSetting>(ERS.name, ERS.pk, id, data)
}

// ─── Univ exam filters (remuneration) ────────────────────────────────────────

export async function listUnivExamFilters(orgId: number, employeeId: number): Promise<UnivExamFilterRow[]> {
  const data = await getAllRecords<{ result: UnivExamFilterRow[][] }>(EXAM_EVAL_PROC, {
    in_flag: 'list_univ_exams',
    in_orgid: orgId,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_month_yr: '',
    in_course_code: '',
    in_course_year_code: '',
    in_subject_code: '',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_code: '',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_loginuser_empid: employeeId,
  }).catch(() => ({ result: [] as UnivExamFilterRow[][] }))
  return procRows<UnivExamFilterRow>(data)
}

// ─── Remuneration Approvals ──────────────────────────────────────────────────

export async function runExamRemuneration(params: {
  orgId: number
  examMonthYear: string
  examId: number
  roleId?: number
}): Promise<unknown> {
  const data = await getAllRecords<{ result: unknown[][] }>(EXAM_REM_PROC, {
    in_flag: 'exam_remuneration',
    in_org_id: params.orgId,
    in_exam_month_yr: params.examMonthYear,
    in_coursecode: '',
    in_academicYear: '',
    in_univ_exam_id: params.examId,
    in_profile_roleid: params.roleId ?? 0,
  }).catch(() => ({ result: [] }))
  return data
}

export async function listExaminationRemunerationDetails(params: {
  examId: number
  roleId?: number
}): Promise<UnivExaminationRemuneration[]> {
  const filters: Record<string, string | number | boolean> = {
    'UnivExamMaster.universityExamId': params.examId,
  }
  if (params.roleId) filters['evaluatorRoleId.roleId'] = params.roleId
  return domainList<UnivExaminationRemuneration>(ERD.name, buildQuery(filters))
}

export async function updateExaminationRemuneration(
  id: number,
  data: Partial<UnivExaminationRemuneration> & Record<string, unknown>,
): Promise<UnivExaminationRemuneration> {
  return domainUpdate<UnivExaminationRemuneration>(ERD.name, ERD.pk, id, data)
}

export async function bulkUpdateRemunerationStatus(payload: unknown[]): Promise<unknown> {
  return putDetails(UNIV_COMMITTEE_API.UPDATE_REMUNERATION_STATUS, payload)
}

// ─── Remuneration Payment ────────────────────────────────────────────────────

export async function listRemunerationPaymentSummary(params: {
  orgId: number
  examMonthYear: string
  examId: number
  roleId?: number
}): Promise<RemunerationPaymentSummary[]> {
  const data = await getAllRecords<{ result: RemunerationPaymentSummary[][] }>(REM_REPORT_PROC, {
    in_flag: 'list_summary_enumeration_amount',
    in_orgid: params.orgId,
    in_academic_year: '',
    in_exam_month_yr: params.examMonthYear,
    in_course_code: '',
    in_remunerationstatus_id: 0,
    in_remunerationdesignation: 0,
    in_evaluatorrole_id: params.roleId ?? 0,
    in_university_exam_id: params.examId,
    in_profile_id: 0,
    in_emp_id: 0,
  }).catch(() => ({ result: [] as RemunerationPaymentSummary[][] }))
  return procRows<RemunerationPaymentSummary>(data)
}

export async function submitRemunerationPayment(
  remunerationIds: string,
  payload: unknown,
): Promise<unknown> {
  return postDetails(`${UNIV_COMMITTEE_API.UPDATE_REMUNERATION_DETAILS}/${remunerationIds}`, payload)
}
