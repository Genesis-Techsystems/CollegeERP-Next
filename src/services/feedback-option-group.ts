/**
 * Feedback Option Group — Angular `FbOptionGroup` / `fbOptionGroupUrl`.
 * Uses existing domain CRUD (no new backend endpoints).
 */
import { ENTITIES } from "@/config/constants/entities";
import type { FbOptionGroup } from "@/types/feedback-option-group";
import { buildQuery, domainCreate, domainList, domainUpdate } from "./crud";

const E = ENTITIES.FB_OPTION_GROUP;

/** Angular `listAllDetails(fbOptionGroupUrl)` — newest first. */
export async function listFbOptionGroups(): Promise<FbOptionGroup[]> {
  return domainList<FbOptionGroup>(
    E.name,
    buildQuery({}, { field: "fbOptionGroupId", direction: "DESC" }),
  );
}

/** Angular `addDetails(fbOptionGroupUrl, details)`. */
export async function createFbOptionGroup(
  data: Omit<FbOptionGroup, "fbOptionGroupId">,
): Promise<FbOptionGroup> {
  return domainCreate<FbOptionGroup>(E.name, data);
}

/** Angular `updateDetails(fbOptionGroupUrl, details, id, fbOptionGroupId)`. */
export async function updateFbOptionGroup(
  id: number,
  data: Partial<FbOptionGroup>,
): Promise<FbOptionGroup> {
  return domainUpdate<FbOptionGroup>(E.name, E.pk, id, data);
}
