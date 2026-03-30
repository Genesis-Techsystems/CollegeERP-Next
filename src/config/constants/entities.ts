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
  EXAM_ROOM_ALLOTMENT:    { name: 'ExamRoomAllotment',         pk: 'examRoomAllotmentId'         },
  SEATING_PLAN:           { name: 'SeatingPlan',               pk: 'seatingPlanId'               },
  INVIGILATOR:            { name: 'InvigilatorRemuneration',   pk: 'invigilatorRemunerationId'   },
  REVALUATION_FEE:        { name: 'RevaluationFee',            pk: 'revaluationFeeId'            },
  // ─── Organisation ────────────────────────────────────────────────────────────
  ORGANIZATION:           { name: 'Organization',              pk: 'organizationId'              },
  CAMPUS:                 { name: 'Campus',                    pk: 'campusId'                    },
  // ─── Geo hierarchy ───────────────────────────────────────────────────────────
  COUNTRY:                { name: 'Country',                   pk: 'countryId'                   },
  STATE:                  { name: 'State',                     pk: 'stateId'                     },
  DISTRICT:               { name: 'District',                  pk: 'districtId'                  },
  CITY:                   { name: 'City',                      pk: 'cityId'                      },
  // ─── Reference / lookup ──────────────────────────────────────────────────────
  GENERAL_DETAIL:         { name: 'GeneralDetail',             pk: 'generalDetailId'             },
  REGULATION:             { name: 'Regulation',                pk: 'regulationId'                },
  COURSE_GROUP:           { name: 'CourseGroup',               pk: 'courseGroupId'               },
  COURSE_YEAR:            { name: 'CourseYear',                pk: 'courseYearId'                },
  SUBJECT:                { name: 'Subject',                   pk: 'subjectId'                   },
  ROOM:                   { name: 'Room',                      pk: 'roomId'                      },
} as const

export type EntityKey = keyof typeof ENTITIES
