/**
 * Shared exam-report route pins for Search + nav href normalization.
 * Sidebar NavItem uses the same label→path rules; without these, Search only
 * rewrites raw DB hrefs and can 404 → dashboard (`app/not-found.tsx`).
 */

const EXAM_REPORTS = '/admin-examination-management/exam-reports'
const ADMIN_EXAM_REPORTS = '/admin-examination-management/admin-exam-reports'

/**
 * Resolve a Reports / Examination Reports page by menu label (and optional href).
 * Returns null when the label is not an examination report page.
 */
export function resolveExaminationReportHref(
  href: string | undefined,
  label: string | undefined,
): string | null {
  const hrefLower = (href ?? '').toLowerCase()
  const labelLower = (label ?? '').toLowerCase().trim()
  if (!hrefLower && !labelLower) return null

  // ── /exam-reports/* ─────────────────────────────────────────────────────
  if (
    hrefLower.includes('gender-wise-exam-report') ||
    hrefLower.includes('gender-wise-exam-result') ||
    hrefLower.includes('gender-wise-result') ||
    labelLower.includes('gender wise exam result') ||
    labelLower.includes('gender wise result') ||
    labelLower.includes('gender wise exam report') ||
    labelLower.includes('gender wise')
  ) {
    return `${EXAM_REPORTS}/gender-wise-exam-report`
  }

  if (
    hrefLower.includes('subject-wise-result-pass-percent') ||
    hrefLower.includes('subject-wise-result-percentage') ||
    hrefLower.includes('subject-wise-percentage') ||
    labelLower.includes('subject wise percentage') ||
    labelLower.includes('subject wise result percentage') ||
    labelLower.includes('subject wise pass percent')
  ) {
    return `${EXAM_REPORTS}/subject-wise-result-pass-percent-report`
  }

  if (
    hrefLower.includes('exam-student-not-registered-count') ||
    hrefLower.includes('students-not-registered') ||
    labelLower.includes('exam students not registered') ||
    labelLower.includes('students not registered count')
  ) {
    return `${EXAM_REPORTS}/exam-student-not-registered-count`
  }

  if (
    (hrefLower.includes('exam-registered-students-count') ||
      hrefLower.includes('registered-students-count') ||
      labelLower.includes('exam registered students count') ||
      labelLower.includes('registered students count')) &&
    !labelLower.includes('not') &&
    !hrefLower.includes('not-registered')
  ) {
    return `${EXAM_REPORTS}/exam-registered-students-count`
  }

  if (
    (hrefLower.includes('exam-registration-student-report') ||
      hrefLower.includes('exam-student-registration-report') ||
      labelLower.includes('exam student registration report') ||
      labelLower.includes('exam registration students')) &&
    !labelLower.includes('count') &&
    !hrefLower.includes('count')
  ) {
    return `${EXAM_REPORTS}/exam-registration-student-report`
  }

  if (
    hrefLower.includes('exam-evaluation-un-assigned-report') ||
    hrefLower.includes('evaluation-un-assigned') ||
    hrefLower.includes('evaluation-unassigned') ||
    labelLower.includes('exam evaluation un-assigned') ||
    labelLower.includes('exam evaluation unassigned') ||
    labelLower.includes('evaluation un-assigned report') ||
    labelLower.includes('evaluation unassigned report')
  ) {
    return `${EXAM_REPORTS}/exam-evaluation-un-assigned-report`
  }

  if (
    hrefLower.includes('exam-evaluation-report') ||
    (labelLower.includes('exam evaluation report') &&
      !labelLower.includes('daily') &&
      !labelLower.includes('answer') &&
      !labelLower.includes('un-assigned') &&
      !labelLower.includes('unassigned'))
  ) {
    return `${EXAM_REPORTS}/exam-evaluation-report`
  }

  if (
    hrefLower.includes('daily-evaluated-report') ||
    labelLower.includes('daily evaluated report') ||
    labelLower.includes('daily evaluation report')
  ) {
    return `${EXAM_REPORTS}/daily-evaluated-report`
  }

  if (
    hrefLower.includes('evaluators-bank-copy-report') ||
    hrefLower.includes('evaluator-bank-copy-report') ||
    labelLower.includes('evaluators bank copy') ||
    labelLower.includes('evaluator bank copy') ||
    labelLower.includes('evaluator remuneration report') ||
    labelLower.includes('evaluators remuneration report')
  ) {
    return `${EXAM_REPORTS}/evaluators-bank-copy-report`
  }

  if (
    hrefLower.includes('subject-wise-evaluators-report') ||
    hrefLower.includes('subject-wise-evaluator') ||
    labelLower.includes('subject wise evaluators') ||
    labelLower.includes('subject-wise evaluators')
  ) {
    return `${EXAM_REPORTS}/subject-wise-evaluators-report`
  }

  if (
    hrefLower.includes('exam-answer-sheets-report') ||
    hrefLower.includes('answer-sheets-report') ||
    labelLower.includes('answer sheets upload') ||
    labelLower.includes('exam answersheets upload') ||
    labelLower.includes('exam answer sheets report')
  ) {
    return `${EXAM_REPORTS}/exam-answer-sheets-report`
  }

  if (
    hrefLower.includes('examcenter-colleges-report') ||
    hrefLower.includes('exam-center-colleges-report') ||
    labelLower.includes('exam center colleges report')
  ) {
    return `${EXAM_REPORTS}/examcenter-colleges-report`
  }

  if (
    hrefLower.includes('examcenter-rooms-report') ||
    hrefLower.includes('exam-center-rooms-report') ||
    labelLower.includes('exam center rooms report')
  ) {
    return `${EXAM_REPORTS}/examcenter-rooms-report`
  }

  if (
    hrefLower.includes('examcenter-students-report') ||
    hrefLower.includes('exam-center-students-report') ||
    labelLower.includes('exam center students report')
  ) {
    return `${EXAM_REPORTS}/examcenter-students-report`
  }

  if (
    hrefLower.includes('examcenter-profiles-report') ||
    hrefLower.includes('exam-center-profiles-report') ||
    labelLower.includes('exam center profiles report')
  ) {
    return `${EXAM_REPORTS}/examcenter-profiles-report`
  }

  if (
    hrefLower.includes('examcenter-answerpaper-bags-report') ||
    hrefLower.includes('answer-paper-bags-report') ||
    labelLower.includes('answer paper bags report') ||
    labelLower.includes('answer paper bag report')
  ) {
    return `${EXAM_REPORTS}/examcenter-answerpaper-bags-report`
  }

  if (
    (hrefLower.includes('curriculum-report') ||
      labelLower.includes('university curriculum report') ||
      labelLower === 'curriculum report') &&
    !labelLower.includes('academic year curriculum') &&
    !hrefLower.includes('academic-year-curriculum')
  ) {
    return `${EXAM_REPORTS}/curriculum-report`
  }

  if (
    hrefLower.includes('group-yearwise-result-report') ||
    hrefLower.includes('group-year-wise-result-report') ||
    labelLower.includes('group & year wise result') ||
    labelLower.includes('group and year wise result') ||
    labelLower.includes('group yearwise result') ||
    labelLower.includes('group year wise result')
  ) {
    return `${EXAM_REPORTS}/group-yearwise-result-report`
  }

  if (
    hrefLower.includes('exam-verification') ||
    labelLower.includes('exam verification report') ||
    (labelLower.includes('exam verification') && !labelLower.includes('answer'))
  ) {
    return `${EXAM_REPORTS}/exam-verification`
  }

  // ── /admin-exam-reports/* ───────────────────────────────────────────────
  if (
    hrefLower.includes('moderation-benefited') ||
    hrefLower.includes('moderation_benefited') ||
    (labelLower.includes('moderation') &&
      labelLower.includes('benefited') &&
      (labelLower.includes('student') || labelLower.includes('report')))
  ) {
    return `${ADMIN_EXAM_REPORTS}/moderation-benefited-students-report`
  }

  if (
    hrefLower.includes('grace-marks-benefited') ||
    hrefLower.includes('grace-benefited-students') ||
    hrefLower.includes('gracemarks-benefited') ||
    hrefLower.includes('exam-gracemarks') ||
    ((labelLower.includes('grace') || labelLower.includes('gracemarks')) &&
      labelLower.includes('benefited') &&
      (labelLower.includes('student') || labelLower.includes('report')))
  ) {
    return `${ADMIN_EXAM_REPORTS}/grace-marks-benefited-students-report`
  }

  if (
    hrefLower.includes('detention-report') ||
    hrefLower.includes('batch-wise-detention') ||
    labelLower.includes('batch wise detention') ||
    (labelLower.includes('detention') &&
      labelLower.includes('report') &&
      !labelLower.includes('backlog'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/detention-report`
  }

  if (
    hrefLower.includes('student-backlog-data') ||
    hrefLower.includes('batch-wise-student-backlog') ||
    labelLower.includes('student backlog data') ||
    (labelLower.includes('backlog') &&
      labelLower.includes('batch') &&
      !labelLower.includes('detention'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/student-backlog-data`
  }

  if (
    hrefLower.includes('student-wise-grade-point') ||
    labelLower.includes('grade and grade points') ||
    labelLower.includes('student wise grade point') ||
    (labelLower.includes('grade') &&
      labelLower.includes('grade point') &&
      labelLower.includes('report') &&
      !labelLower.includes('setup'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/student-wise-grade-point-report`
  }

  if (
    hrefLower.includes('exam-absentees-report') ||
    labelLower.includes('exam absentees') ||
    labelLower.includes('exam absentee') ||
    (labelLower.includes('absentee') &&
      labelLower.includes('report') &&
      !labelLower.includes('sms'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/exam-absentees-report`
  }

  if (
    hrefLower.includes('re-evaluation-comparision-report') ||
    hrefLower.includes('re-evaluation-comparison-report') ||
    labelLower.includes('re-evaluation comparision') ||
    labelLower.includes('re-evaluation comparison') ||
    ((labelLower.includes('re-evaluation') || labelLower.includes('reevaluation')) &&
      (labelLower.includes('comparision') || labelLower.includes('comparison')) &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/re-evaluation-comparision-report`
  }

  if (
    hrefLower.includes('re-evaluation-exam-report') ||
    labelLower.includes('re-evaluation exam report') ||
    labelLower.includes('re evaluation exam report') ||
    ((labelLower.includes('re-evaluation') || labelLower.includes('reevaluation')) &&
      labelLower.includes('exam') &&
      labelLower.includes('report') &&
      !labelLower.includes('comparison') &&
      !labelLower.includes('comparision') &&
      !labelLower.includes('branch') &&
      !labelLower.includes('analysis') &&
      !labelLower.includes('student'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/re-evaluation-exam-report`
  }

  if (
    hrefLower.includes('consolidated-exam-report') ||
    labelLower.includes('consolidated exam report') ||
    (labelLower.includes('consolidated') &&
      labelLower.includes('exam') &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/consolidated-exam-report`
  }

  if (
    hrefLower.includes('internal-marks-report') ||
    hrefLower.includes('internal-marks-entry-report') ||
    labelLower.includes('internal marks report') ||
    (labelLower.includes('internal marks') &&
      labelLower.includes('report') &&
      !labelLower.includes('average') &&
      !labelLower.includes('avg'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/internal-marks-report`
  }

  if (
    hrefLower.includes('academic-year-curriculum-report') ||
    hrefLower.includes('academic-curriculum-report') ||
    labelLower.includes('academic year curriculum') ||
    labelLower.includes('academic curriculum report') ||
    (labelLower.includes('academic') &&
      labelLower.includes('curriculum') &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/academic-year-curriculum-report`
  }

  if (
    hrefLower.includes('batchwise-sgpa-report') ||
    hrefLower.includes('batch-wise-sgpa') ||
    labelLower.includes('batch wise sgpa') ||
    (labelLower.includes('sgpa') &&
      labelLower.includes('batch') &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/batchwise-sgpa-report`
  }

  if (
    hrefLower.includes('lab-remuneration-report') ||
    hrefLower.includes('lab-external-remuneration') ||
    (labelLower.includes('lab') &&
      labelLower.includes('remuneration') &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/lab-remuneration-report`
  }

  if (
    hrefLower.includes('invigilators-remuneration-report') ||
    hrefLower.includes('invigilator-remuneration-report') ||
    ((labelLower.includes('invigilator') || labelLower.includes('invigilators')) &&
      labelLower.includes('remuneration') &&
      labelLower.includes('report'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/invigilators-remuneration-report`
  }

  if (
    hrefLower.includes('group-wise-passed-result-sheets') ||
    labelLower.includes('group wise passed result') ||
    (labelLower.includes('passed') &&
      labelLower.includes('result sheet') &&
      !labelLower.includes('failed'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/group-wise-passed-result-sheets`
  }

  if (
    hrefLower.includes('group-wise-failed-result-sheets') ||
    labelLower.includes('group wise failed result') ||
    (labelLower.includes('failed') && labelLower.includes('result sheet'))
  ) {
    return `${ADMIN_EXAM_REPORTS}/group-wise-failed-result-sheets`
  }

  if (
    hrefLower.includes('gradewise-result') ||
    hrefLower.includes('grade-wise-result') ||
    labelLower.includes('gradewise result') ||
    labelLower.includes('grade wise result')
  ) {
    // Prefer existing page if present; otherwise leave for NavItem
    return null
  }

  if (
    hrefLower.includes('tabulation-register') ||
    labelLower.includes('tabulation register')
  ) {
    return null
  }

  return null
}
