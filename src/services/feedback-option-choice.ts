/**
 * Feedback Option Choice — Angular `FbOptionchoice` / `FbOptionchoiceUrl`.
 * Uses existing domain CRUD (no new backend endpoints).
 */
import { ENTITIES } from "@/config/constants/entities";
import type { FbOptionChoice } from "@/types/feedback-option-choice";
import type { FbOptionGroup } from "@/types/feedback-option-group";
import { buildQuery, domainCreate, domainList, domainUpdate } from "./crud";

const E = ENTITIES.FB_OPTIONCHOICE;
const OPTION_GROUP = ENTITIES.FB_OPTION_GROUP;

/** Angular `listAllDetails(FbOptionchoiceUrl)` — newest first. */
export async function listFbOptionChoices(): Promise<FbOptionChoice[]> {
  return domainList<FbOptionChoice>(
    E.name,
    buildQuery({}, { field: "fbOptionchoiceId", direction: "DESC" }),
  );
}

/**
 * Angular modal `selectedCollege`:
 * `listDetailsById(fbOptionGroupUrl, collegeId, getDetailsByCollegeIdUrl)`
 * → `College.collegeId=={collegeId}`
 */
export async function listFbOptionGroupsByCollege(
  collegeId: number,
): Promise<FbOptionGroup[]> {
  if (!collegeId) return [];
  return domainList<FbOptionGroup>(
    OPTION_GROUP.name,
    buildQuery({ "College.collegeId": collegeId }),
  );
}

/** Angular `addDetails(FbOptionchoiceUrl, details)`. */
export async function createFbOptionChoice(
  data: Omit<FbOptionChoice, "fbOptionchoiceId">,
): Promise<FbOptionChoice> {
  return domainCreate<FbOptionChoice>(E.name, data);
}

/** Angular `updateDetails(..., details.fbOptionchoiceId, fbOptionchoiceIdUrl)`. */
export async function updateFbOptionChoice(
  id: number,
  data: Partial<FbOptionChoice>,
): Promise<FbOptionChoice> {
  return domainUpdate<FbOptionChoice>(E.name, E.pk, id, data);
}
