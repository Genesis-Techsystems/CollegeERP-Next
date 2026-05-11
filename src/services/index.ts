export * from './query'
export * from './crud'
export * from './auth'
export * from './admin/organization'
export * from './admin/campus'
export * from './admin/academic-year'
export * from './admin/financial-year'
export * from './admin/college-courses-groups'
export * from './admin/course-type'
export * from './admin/course'
export * from './admin/course-group'
export * from './admin/subject'
export * from './admin/university-curriculum'
export * from './admin/semester-subject-allocation'
export * from './admin/staff-subject-mapping'
export * from './admin/subject-book-assignment'
export * from './admin/subject-unit-topics'
export * from './admin/course-year'
export * from './admin/regulation'
export * from './admin/group-section'
export * from './admin/batch'
export * from './admin/student-batch'
export * from './admin/university'
export * from './admin/college'
export * from './admin/department'
export * from './admin/designation'
export * from './admin/building'
export * from './admin/block'
export * from './admin/floor'
export * from './admin/room-detail'
export * from './admin/room-type'
export * from './admin/room'
export * from './admin/general-setting'
export * from './admin/general-master'
export * from './admin/bank'
export * from './admin/caste'
export * from './admin/sub-caste'
export * from './admin/qualification'
export * from './admin/qualification-group'
export * from './admin/holiday-calendar'
export * from './admin/workflow-stage'
export * from './admin/student-category'
export * from './admin/workflow-member-authorization'
export * from './admin/college-certificate'
export * from './admin/document-repository'
export * from './admin/weekday'
export * from './admin/config-auto-number'
export * from './admin/digital-online-sync'
export * from './admin/question-bank'
export * from './admin/bulk-upload'
export * from './evaluation'
export * from './evaluation-process'
// pre-examination: listActiveColleges conflicts with invigilator-remuneration; listCoursesByUniversity
// conflicts with revision-master; listExamRoomAllotments and listExamInvigilationAllotments conflict
// with seating-plan (different signatures — seating-plan variants are exported without collegeId param).
export * from './pre-examination'
// examination: CollegeFiltersResult and getCollegeFilters conflict with evaluation.ts (already exported)
// and exam-master.ts; use named re-exports to avoid ambiguity.
export {
  resolveExamLoginEmpId,
  getUnivExamFiltersAll,
  getUnivExamFiltersForExamFeeSetup,
  getUnivExamRestCollegesForRevaluationFee,
  getMarksSetupFilters,
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
  getExamFeeStructure,
  createExamFeeStructure,
  updateExamFeeStructure,
  listGeneralDetailsByMaster,
  listExamFeeTypeGeneralDetails,
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
export * from './exam-fcar-setup-master'
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
