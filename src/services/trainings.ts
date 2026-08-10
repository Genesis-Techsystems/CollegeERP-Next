import type {
  PlacementTraining,
  TrainingDetail,
  TrainingSession,
  TrainingStudent,
  TrainingStudentAttendence,
} from "@/types/trainings";
import {
  buildQuery,
  domainList,
  domainCreate,
  domainUpdate,
  fetchDetails,
  postDetails,
} from "./crud";
import { ENTITIES } from "@/config/constants/entities";
import { PLACEMENT_API } from "@/config/constants/api";
import { searchEmployeesForHr } from "./hr-payroll";

type AnyRow = Record<string, unknown>;

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.resultList)) return o.resultList as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

const ET = ENTITIES.PLACEMENT_TRAINING;
const ED = ENTITIES.TRAINING_DETAIL;
const ES = ENTITIES.TRAINING_SESSION;
const ER = ENTITIES.TRAINING_STUDENT;

// ─── Placement Training ──────────────────────────────────────────────────────

/** Angular placement-trainings: `domain/list/Training?query=order(createdDt=desc)`. */
export async function listTrainings(): Promise<PlacementTraining[]> {
  return domainList<PlacementTraining>(
    ET.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Angular training-registration: `College.collegeId=={id}.and.isActive==true.order(createdDt=DESC)`. */
export async function listTrainingsByCollege(
  collegeId: number,
): Promise<PlacementTraining[]> {
  if (collegeId <= 0) return [];
  return domainList<PlacementTraining>(
    ET.name,
    buildQuery(
      { "College.collegeId": collegeId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/**
 * Angular sessions/details cascade:
 * `College.collegeId=={id}.and.yearName=={year}.and.isActive==true.order(createdDt=desc)`
 */
export async function listTrainingsByCollegeAndYear(
  collegeId: number,
  yearName: string,
): Promise<PlacementTraining[]> {
  if (collegeId <= 0 || !yearName) return [];
  return domainList<PlacementTraining>(
    ET.name,
    buildQuery(
      {
        "College.collegeId": collegeId,
        yearName,
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

export async function createTraining(
  data: Partial<PlacementTraining>,
): Promise<PlacementTraining> {
  return domainCreate<PlacementTraining>(ET.name, data);
}

export async function updateTraining(
  id: number,
  data: Partial<PlacementTraining>,
): Promise<PlacementTraining> {
  return domainUpdate<PlacementTraining>(ET.name, ET.pk, id, data);
}

// ─── Training Detail ─────────────────────────────────────────────────────────

/**
 * Angular training-details filters (includes yearName):
 * `Training.traningId` + `College.collegeId` + `yearName` + `isActive`
 */
export async function listTrainingDetails(filters: {
  collegeId: number;
  yearName: string;
  traningId: number;
}): Promise<TrainingDetail[]> {
  return domainList<TrainingDetail>(
    ED.name,
    buildQuery({
      "Training.traningId": filters.traningId,
      "College.collegeId": filters.collegeId,
      yearName: filters.yearName,
      isActive: true,
    }),
  );
}

/**
 * Angular sessions cascade after Training selected:
 * `College.collegeId==X.and.Training.traningId==Y.and.isActive==true.order(createdDt=desc)`
 */
export async function listTrainingDetailsByCollegeAndTraining(
  collegeId: number,
  paTraningId: number,
): Promise<TrainingDetail[]> {
  if (collegeId <= 0 || paTraningId <= 0) return [];
  return domainList<TrainingDetail>(
    ED.name,
    buildQuery(
      {
        "College.collegeId": collegeId,
        "Training.traningId": paTraningId,
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/** Angular training-attendance classes list: `isActive==true.order(createdDt=desc)`. */
export async function listActiveTrainingDetails(): Promise<TrainingDetail[]> {
  return domainList<TrainingDetail>(
    ED.name,
    buildQuery(
      { isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

export async function getTrainingDetail(
  id: number,
): Promise<TrainingDetail | null> {
  const rows = await domainList<TrainingDetail>(
    ED.name,
    buildQuery({ traningDetId: id }),
  );
  return rows[0] ?? null;
}

export async function createTrainingDetail(
  data: Partial<TrainingDetail>,
): Promise<TrainingDetail> {
  return domainCreate<TrainingDetail>(ED.name, data);
}

export async function updateTrainingDetail(
  id: number,
  data: Partial<TrainingDetail>,
): Promise<TrainingDetail> {
  return domainUpdate<TrainingDetail>(ED.name, ED.pk, id, data);
}

// ─── Training Session ────────────────────────────────────────────────────────

/**
 * Angular sessions table:
 * `TrainingDetail.traningDetId=={id}.order(createdDt=DESC)` (no isActive filter).
 */
export async function listTrainingSessions(
  traningDetId: number,
): Promise<TrainingSession[]> {
  if (traningDetId <= 0) return [];
  return domainList<TrainingSession>(
    ES.name,
    buildQuery(
      { "TrainingDetail.traningDetId": traningDetId },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/**
 * Angular mark/view attendance sessions for a day
 * (`momentFormatYMD` → `YYYY/MM/DD`):
 * `TrainingDetail.traningDetId==X.and.sessionDate==2026/08/09.and.isActive==true`
 */
export async function listTrainingSessionsByDetailAndDate(
  traningDetId: number,
  sessionDate: string,
): Promise<TrainingSession[]> {
  if (traningDetId <= 0 || !sessionDate) return [];
  // Angular GenericFunctions.momentFormatYMD → YYYY/MM/DD (not YYYY-MM-DD)
  const sessionDateYmd = sessionDate.trim().replace(/-/g, "/");
  return domainList<TrainingSession>(
    ES.name,
    buildQuery({
      "TrainingDetail.traningDetId": traningDetId,
      sessionDate: sessionDateYmd,
      isActive: true,
    }),
  );
}

export async function createTrainingSession(
  data: Partial<TrainingSession>,
): Promise<TrainingSession> {
  return domainCreate<TrainingSession>(ES.name, data);
}

export async function updateTrainingSession(
  id: number,
  data: Partial<TrainingSession>,
): Promise<TrainingSession> {
  return domainUpdate<TrainingSession>(ES.name, ES.pk, id, data);
}

// ─── Training Student (Registration) ────────────────────────────────────────

export async function listTrainingStudentsByEmployee(
  employeeId: number,
): Promise<TrainingStudent[]> {
  return domainList<TrainingStudent>(
    ER.name,
    buildQuery({ "employeeDetail.employeeId": employeeId }),
  );
}

export async function listTrainingStudentsByStudent(
  studentId: number,
): Promise<TrainingStudent[]> {
  return domainList<TrainingStudent>(
    ER.name,
    buildQuery({ "studentDetail.studentId": studentId }),
  );
}

/** Angular mark attendance: `training.traningId=={traningId}` (lowercase `training`). */
export async function listTrainingStudentsByTraining(
  traningId: number,
): Promise<TrainingStudent[]> {
  if (traningId <= 0) return [];
  return domainList<TrainingStudent>(
    ER.name,
    buildQuery({ "training.traningId": traningId }),
  );
}

/**
 * Angular registered-list:
 * `College.collegeId==X.and.Training.traningId==Y`
 */
export async function listTrainingStudentsByCollegeAndTraining(
  collegeId: number,
  paTraningId: number,
): Promise<TrainingStudent[]> {
  if (collegeId <= 0 || paTraningId <= 0) return [];
  return domainList<TrainingStudent>(
    ER.name,
    buildQuery({
      "College.collegeId": collegeId,
      "Training.traningId": paTraningId,
    }),
  );
}

export async function createTrainingStudent(
  data: Partial<TrainingStudent>,
): Promise<TrainingStudent> {
  return domainCreate<TrainingStudent>(ER.name, data);
}

/**
 * Angular training-registration `listByIds(studentSearchUrl, q, 'q')` —
 * `studentsearch?q=` (length > 4). No `isActive` param.
 */
export async function searchStudentsForTrainingRegistration(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length <= 4) return [];
  const data = await fetchDetails<unknown>("studentsearch", { q });
  return asArray<AnyRow>(data);
}

/**
 * Angular training-registration
 * `listByTwoIds(employeeSearchUrl, q, 'ACTV', 'q', 'empStatus')` —
 * `employeesearch?q=&empStatus=ACTV` (length > 4, no collegeId).
 */
export async function searchEmployeesForTrainingRegistration(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length <= 4) return [];
  return searchEmployeesForHr(q);
}

// ─── Training Attendance ─────────────────────────────────────────────────────

/**
 * Angular: domain/list/TrainingStudentAttendence
 * `trainingSession.trainingSessionId=={id}`
 */
export async function listTrainingAttendanceBySession(
  trainingSessionId: number,
): Promise<TrainingStudentAttendence[]> {
  if (trainingSessionId <= 0) return [];
  return domainList<TrainingStudentAttendence>(
    PLACEMENT_API.TRAINING_ATTENDENCE_DETAILS,
    buildQuery({ "trainingSession.trainingSessionId": trainingSessionId }),
  );
}

/**
 * Angular `crudService.add(trainingstdattend, studentRegedList)` —
 * POST `/cms/trainingstdattend` with the full registrant array (not domain/create).
 */
export async function saveTrainingAttendance(
  rows: TrainingStudent[],
): Promise<unknown> {
  return postDetails(PLACEMENT_API.TRAINING_ATTENDENCE, rows);
}
