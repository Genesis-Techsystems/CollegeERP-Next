/**
 * Entity registry — maps every Spring Boot entity class name to its primary key field.
 *
 * Usage:
 *   import { ENTITIES } from '@/config/constants/entities'
 *   domainCreate(ENTITIES.EXAM_SESSION.name, data)
 *   domainUpdate(ENTITIES.EXAM_SESSION.name, ENTITIES.EXAM_SESSION.pk, id, data)
 */
export const ENTITIES = {
  // ─── Examination ─────────────────────────────────────────────────────────────
  EXAM_SESSION:           { name: 'ExamSession',               pk: 'examSessionId'               },
  EXAM_GRADE:             { name: 'ExamGrade',                 pk: 'examGradesId'                }, // pk is examGradesId (with 's') per Spring Boot entity
  EXAM_MAX_MARKS:         { name: 'ExamMaxMarks',              pk: 'examMaxMarksId'              },
  EXAM_MARKS_SETUP:       { name: 'ExamMarkssetup',            pk: 'markssetupId'                }, // note lowercase 's' in entity name; pk is markssetupId (not examMarkssetupId)
  EXAM_FEE_SETUP:         { name: 'ExamFeeSetup',              pk: 'examFeeSetupId'              },
  EXAM_TIMETABLE:         { name: 'ExamTimetable',             pk: 'examTimetableId'             },
  EXAM_MASTER:            { name: 'ExamMaster',                pk: 'examId'                      },
  EXAM_MASTER_DETAILS:    { name: 'ExamMasterDetails',         pk: 'examMasterDetailsId'         },
  EXAM_FEE_STRUCTURE:     { name: 'ExamFeeStructure',          pk: 'examFeeStructureId'          },
  /** FCAR exam setup master (marks setup name, regulations, result validation) — Angular `ExamFCARSetupMaster`. */
  EXAM_FCAR_SETUP_MASTER: { name: 'ExamFCARSetupMaster',     pk: 'examFCARSetMasterId'         },
  EXAM_ROOM_ALLOTMENT:    { name: 'ExamRoomAllotment',         pk: 'examRoomAllotmentId'         },
  SEATING_PLAN:           { name: 'SeatingPlan',               pk: 'seatingPlanId'               },
  INVIGILATOR:            { name: 'InvigilatorRemuneration',   pk: 'invigilatorRemunerationId'   },
  REVALUATION_FEE:        { name: 'RevaluationFee',            pk: 'revaluationFeeId'            },
  // ─── Organisation ────────────────────────────────────────────────────────────
  ORGANIZATION:           { name: 'Organization',              pk: 'organizationId'              },
  CAMPUS:                 { name: 'Campus',                    pk: 'campusId'                    },
  UNIVERSITIES:           { name: 'Universities',              pk: 'universityId'                },
  COLLEGE:                { name: 'College',                   pk: 'collegeId'                   },
  DEPARTMENT:             { name: 'Department',                pk: 'departmentId'                },
  DESIGNATION:            { name: 'Designation',               pk: 'designationId'               },
  BUILDING:               { name: 'Building',                  pk: 'buildingId'                  },
  BLOCK:                  { name: 'Block',                     pk: 'blockId'                     },
  FLOOR:                  { name: 'Floor',                     pk: 'floorId'                     },
  ROOM_TYPE:              { name: 'RoomType',                  pk: 'roomTypeId'                  },
  GENERAL_SETTING:        { name: 'GeneralSetting',            pk: 'generalSettingId'            },
  // ─── Geo hierarchy ───────────────────────────────────────────────────────────
  COUNTRY:                { name: 'Country',                   pk: 'countryId'                   },
  STATE:                  { name: 'State',                     pk: 'stateId'                     },
  DISTRICT:               { name: 'District',                  pk: 'districtId'                  },
  CITY:                   { name: 'City',                      pk: 'cityId'                      },
  // ─── Question Bank ───────────────────────────────────────────────────────────
  ASSESSMENT:              { name: 'Assessment',              pk: 'assessmentId'              },
  COURSE_QUESTION:         { name: 'CourseQuestion',          pk: 'courseQuestionId'          },
  // ─── Reference / lookup ──────────────────────────────────────────────────────
  GENERAL_DETAIL:         { name: 'GeneralDetail',             pk: 'generalDetailId'             },
  REGULATION:             { name: 'Regulation',                pk: 'regulationId'                },
  COURSE_GROUP:           { name: 'CourseGroup',               pk: 'courseGroupId'               },
  COURSE_YEAR:            { name: 'CourseYear',                pk: 'courseYearId'                },
  COURSE_TYPE:            { name: 'CourseType',                pk: 'courseTypeId'                },
  COURSE:                 { name: 'Course',                    pk: 'courseId'                    },
  GROUP_SECTION:          { name: 'GroupSection',              pk: 'groupSectionId'              },
  BATCH:                  { name: 'Batch',                     pk: 'batchId'                     },
  STUDENT_ACADEMIC_BATCH: { name: 'StudentAcademicbatch',      pk: 'studentAcademicbatchId'      },
  ACADEMIC_YEAR:          { name: 'AcademicYear',              pk: 'academicYearId'              },
  FINANCIAL_YEAR:         { name: 'FinancialYear',             pk: 'financialYearId'             },
  SUBJECT:                { name: 'Subject',                   pk: 'subjectId'                   },
  ROOM:                   { name: 'Room',                      pk: 'roomId'                      },
  BANK:                   { name: 'Bank',                      pk: 'bankId'                      },
  GENERAL_MASTER:         { name: 'GeneralMaster',             pk: 'generalMasterId'             },
  CASTE:                  { name: 'Caste',                     pk: 'casteId'                     },
  SUB_CASTE:              { name: 'SubCaste',                  pk: 'subCasteId'                  },
  QUALIFICATION:          { name: 'Qualification',             pk: 'qualificationId'             },
  QUALIFICATION_GROUP:    { name: 'QualificationGroup',        pk: 'qualificationGroupId'        },
  COLLEGE_CALENDAR:       { name: 'CollegeCalendar',           pk: 'collegeCalendarId'           },
  WORKFLOW_STAGE:         { name: 'WorkflowStage',             pk: 'workflowStageId'             },
  STUDENT_CATEGORY:       { name: 'StudentCategory',           pk: 'studentCatId'                },
  WORKFLOW_MEMBER_AUTHORIZATION: { name: 'WorkflowMemberAuthorization', pk: 'wfMemberAuthorizationId' },
  COLLEGE_CERTIFICATE:    { name: 'CollegeCertificate',        pk: 'collegeCertificateId'        },
  DOCUMENT_REPOSITORY:    { name: 'DocumentRepository',        pk: 'documentRepositoryId'        },
  WEEKDAY:                { name: 'Weekday',                   pk: 'weekdayId'                   },
} as const

export type EntityKey = keyof typeof ENTITIES
