/**
 * Exam Center Rooms Report
 * (Angular: exam-reports/examcenter-rooms-report).
 */

import { listActiveBuildings } from "@/services/admin/building";
import { listBlocksByBuilding } from "@/services/admin/block";
import { listFloorsByBlock } from "@/services/admin/floor";
import {
  getExamTimetableFilterRows,
  listAllActiveUnivExamCenters,
} from "@/services/exam-papers-delivery";
import { buildQuery, domainList } from "@/services/crud";
import { UNIV_EXAM_CENTER_API } from "@/config/constants/api";

type AnyRow = Record<string, unknown>;
type ProcRows = AnyRow[];

/** Angular getFiltersList → clg_exam_timetable_filters */
export async function getExamCenterRoomsReportFilters(params: {
  organizationId: number;
  employeeId: number;
}): Promise<ProcRows> {
  return getExamTimetableFilterRows(params);
}

/** Angular selectedExam → UnivExamCenters isActive */
export async function getExamCenterRoomsReportCenters(): Promise<ProcRows> {
  return listAllActiveUnivExamCenters();
}

/** Angular selectedExam → Building isActive (all buildings) */
export async function getExamCenterRoomsReportBuildings(): Promise<ProcRows> {
  const rows = await listActiveBuildings();
  return rows as unknown as ProcRows;
}

/** Angular SelectedBuilding → Block by Building.buildingId */
export async function getExamCenterRoomsReportBlocks(
  buildingId: number,
): Promise<ProcRows> {
  if (!buildingId) return [];
  const rows = await listBlocksByBuilding(buildingId);
  return rows as unknown as ProcRows;
}

/** Angular SelectedBlock → Floor by Block.blockId */
export async function getExamCenterRoomsReportFloors(
  blockId: number,
): Promise<ProcRows> {
  if (!blockId) return [];
  const rows = await listFloorsByBlock(blockId);
  return rows as unknown as ProcRows;
}

/**
 * Angular getExamCenterRooms → listDetailsByFourIds:
 *
 *   domain/list/UnivExamCenterRooms?query=
 *     examMaster.examId=={examId}
 *     .and.univExamcenters.univExamcenterId=={univExamcenterId}
 *     .and.building.buildingId=={buildingId}
 *     .and.isActive==true
 *
 * Always includes building.buildingId (0 = All).
 * Relation spelling must match Angular: univExamcenters (lowercase 'c').
 */
export async function getExamCenterRoomsReportList(params: {
  examId: number;
  univExamcenterId: number;
  buildingId: number;
}): Promise<ProcRows> {
  if (!params.examId || !params.univExamcenterId) return [];

  const query = buildQuery({
    "examMaster.examId": params.examId,
    "univExamcenters.univExamcenterId": params.univExamcenterId,
    "building.buildingId": params.buildingId || 0,
    isActive: true,
  });

  try {
    return await domainList<AnyRow>(
      UNIV_EXAM_CENTER_API.EXAM_CENTER_ROOMS,
      query,
    );
  } catch {
    return [];
  }
}
