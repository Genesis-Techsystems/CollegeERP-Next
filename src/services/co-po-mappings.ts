import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
} from "@/services/crud";
import { AppError, getErrorMessage, isAppError } from "@/lib/errors";

type AnyRow = Record<string, any>;

/**
 * Prefer the Spring envelope `message` when domainList prefixes it
 * (e.g. "Failed to list CmProgramOutcome (...): No Records(s) found.").
 */
function apiResponseMessage(error: unknown): string {
  const raw = getErrorMessage(error);
  if (isAppError(error) && raw.includes(": ")) {
    const tail = raw.slice(raw.lastIndexOf(": ") + 2).trim();
    if (tail) return tail;
  }
  return raw;
}

/**
 * Program Outcome category general-detail options.
 *
 * Angular: `crudService.listDetailsByTwoIds('GeneralDetail', 'PRGNMOUTCMS', 'true',
 * 'GeneralMaster.generalMasterCode', 'isActive')`
 * → GET domain/list/GeneralDetail?query=GeneralMaster.generalMasterCode==PRGNMOUTCMS.and.isActive==true
 *
 * The generalDetailId of the chosen row becomes `prgoutcomeCatdetId` in the create payload.
 */
export async function listProgramOutcomeCategoryDetails(): Promise<AnyRow[]> {
  const variants = [
    buildQuery({
      "GeneralMaster.generalMasterCode": "PRGNMOUTCMS",
      isActive: true,
    }),
    buildQuery({
      "generalMaster.generalMasterCode": "PRGNMOUTCMS",
      isActive: true,
    }),
    buildQuery({ generalMasterCode: "PRGNMOUTCMS", isActive: true }),
  ];
  for (const query of variants) {
    try {
      const rows = await domainList<AnyRow>("GeneralDetail", query);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export interface ProgramOutcomePayload {
  prgoutcomeCatdetId: number;
  collegeId: number;
  academicYearId: number;
  code: string;
  description: string;
  credits?: number | string | null;
  isActive: boolean;
  reason?: string;
}

/**
 * List Program Outcomes for the selected academic year.
 *
 * Angular: `domain/list/CmProgramOutcome?size=99999&query=AcademicYear.academicYearId=={id}.and.isActive==true`
 *
 * Returns rows on success. On `success: false` (e.g. "No Records(s) found.") throws an
 * AppError whose message is the raw API `message` for a white info toast.
 */
export async function listProgramOutcomes(
  academicYearId: number,
): Promise<AnyRow[]> {
  if (!academicYearId) return [];
  try {
    return await domainList<AnyRow>(
      "CmProgramOutcome",
      buildQuery({
        "AcademicYear.academicYearId": academicYearId,
        isActive: true,
      }),
    );
  } catch (error) {
    throw new AppError("API_ERROR", apiResponseMessage(error), error);
  }
}

/**
 * Create a Program Outcome.
 *
 * Angular: `crudService.addDetails('CmProgramOutcome', details)`
 * → POST domain/create/CmProgramOutcome
 */
export async function createProgramOutcome(
  payload: ProgramOutcomePayload,
): Promise<AnyRow> {
  return domainCreate<AnyRow>("CmProgramOutcome", payload);
}

/**
 * Update a Program Outcome.
 *
 * Angular: `crudService.updateDetails('CmProgramOutcome', details, id, 'programOutcomeId')`
 * → PUT domain/update/CmProgramOutcome?query=programOutcomeId==id
 */
export async function updateProgramOutcome(
  programOutcomeId: number,
  payload: ProgramOutcomePayload,
): Promise<AnyRow> {
  // Angular PUT body includes programOutcomeId alongside the form fields.
  return domainUpdate<AnyRow>(
    "CmProgramOutcome",
    "programOutcomeId",
    programOutcomeId,
    {
      ...payload,
      programOutcomeId,
    },
  );
}
