export * from './query'
export * from './crud'
export * from './auth'
export * from './admin/organization'
export * from './admin/campus'
export * from './admin/question-bank'
export * from './evaluation'
export * from './evaluation-process'
// pre-examination: listActiveColleges conflicts with invigilator-remuneration; listCoursesByUniversity
// conflicts with revision-master; listExamRoomAllotments and listExamInvigilationAllotments conflict
// with seating-plan (different signatures — seating-plan variants are exported without collegeId param).
export * from './pre-examination'
// examination: CollegeFiltersResult and getCollegeFilters conflict with evaluation.ts (already exported)
// and exam-master.ts; use named re-exports to avoid ambiguity.
export {
  listExamSessions,
  createExamSession,
  updateExamSession,
  listExamGrades,
  createExamGrade,
  updateExamGrade,
  listExamMasters,
  createExamMasterSvc,
  updateExamMasterSvc,
  uploadExamNotificationFiles,
  listExamFeeStructures,
  createExamFeeStructure,
  updateExamFeeStructure,
  listGeneralDetailsByMaster,
  listRegulations,
  listCourseGroups,
  listCourseYears,
  listExamMasterDetails,
  getExamTimetableDetails,
  getExamFiltersNoTimetable,
  getExamSubjectsForSchedule,
  getUnivExamSubjectFilters,
  listExamMarksSetup,
  listSubjectCategories,
  saveExamMarksSetup,
  saveExamTimetable,
} from './examination'
// exam-master: CollegeFiltersResult and getCollegeFilters conflict with evaluation.ts and examination.ts;
// use named re-exports to avoid ambiguity.
export {
  getCollegeFilters as getExamMasterCollegeFilters,
  fetchExamsByUniversity,
  fetchExamsByCollege,
  getExamMasterById,
  createExamMaster,
  updateExamMaster,
  uploadExamFiles,
  getGeneralDetails,
  getRegulations,
  getCourseGroups,
  getCourseYears,
  getExamMasterDetails,
  saveExamMasterDetails,
} from './exam-master'
export type { CollegeFiltersResult as ExamMasterCollegeFiltersResult } from './exam-master'
export * from './exam-lab-batches'
export * from './exam-lab-timetable'
export * from './student-information'
// invigilator-remuneration: listActiveColleges conflicts with pre-examination.
export {
  listInvigilatorRemunerations,
  createInvigilatorRemuneration,
  updateInvigilatorRemuneration,
  listActiveColleges as listActiveCollegesForRemuneration,
  listInvigilatorDesignationTypes,
} from './invigilator-remuneration'
// revision-master: listCoursesByUniversity conflicts with pre-examination.
export {
  listCollegesActive,
  listCoursesByUniversity as listCoursesByUniversityForRevision,
  listRevisionMastersByCourse,
  listRevisionTypes,
  createRevisionMaster,
  updateRevisionMaster,
} from './revision-master'
// seating-plan: listExamRoomAllotments and listExamInvigilationAllotments conflict with pre-examination
// (different signatures — seating-plan versions omit collegeId).
export {
  listRoomsAndCapacities,
  generateSeatingPreview,
  saveSeatingPlan,
  listExamRoomAllotments as listSeatingPlanRoomAllotments,
  listExamInvigilationAllotments as listSeatingPlanInvigilationAllotments,
  listRoomwiseOmrStudents,
  listExamStdAttDetails,
} from './seating-plan'
export type { ListRoomsParams, GenerateSeatingParams, SaveSeatingRequest } from './seating-plan'
export * from './post-examination'
