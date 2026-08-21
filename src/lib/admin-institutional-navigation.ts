/**
 * Admin → Institutional Masters route resolution.
 * Live URLs stay under `/admin/institutional-masters/{page}` (Angular parity).
 * Keeps room / building screens separate from Hostel and Exam Papers Delivery
 * (shared labels: Buildings, Blocks, Floors, Rooms, Room Types).
 */

export const INSTITUTIONAL_MASTERS_BASE = "/admin/institutional-masters";

/** Canonical leaf routes under Institutional Masters. */
export const INSTITUTIONAL_MASTERS_ROUTES = {
  buildings: `${INSTITUTIONAL_MASTERS_BASE}/buildings`,
  blocks: `${INSTITUTIONAL_MASTERS_BASE}/blocks`,
  floors: `${INSTITUTIONAL_MASTERS_BASE}/floors`,
  rooms: `${INSTITUTIONAL_MASTERS_BASE}/rooms`,
  /** Angular slug `rooms-type` */
  roomTypes: `${INSTITUTIONAL_MASTERS_BASE}/rooms-type`,
  roomDetails: `${INSTITUTIONAL_MASTERS_BASE}/room-details`,
} as const;

const INSTITUTIONAL_SLUG_ROUTES: Record<string, string> = {
  "rooms-type": INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  "rooms-types": INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  "room-type": INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  "room-types": INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  roomtypes: INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  rooms: INSTITUTIONAL_MASTERS_ROUTES.rooms,
  room: INSTITUTIONAL_MASTERS_ROUTES.rooms,
  "room-details": INSTITUTIONAL_MASTERS_ROUTES.roomDetails,
  "room-detail": INSTITUTIONAL_MASTERS_ROUTES.roomDetails,
  roomdetails: INSTITUTIONAL_MASTERS_ROUTES.roomDetails,
  buildings: INSTITUTIONAL_MASTERS_ROUTES.buildings,
  building: INSTITUTIONAL_MASTERS_ROUTES.buildings,
  blocks: INSTITUTIONAL_MASTERS_ROUTES.blocks,
  block: INSTITUTIONAL_MASTERS_ROUTES.blocks,
  floors: INSTITUTIONAL_MASTERS_ROUTES.floors,
  floor: INSTITUTIONAL_MASTERS_ROUTES.floors,
};

/** Flat App Router folders that implement the pages (internal / rewrite targets). */
const FLAT_ADMIN_TO_INSTITUTIONAL: Record<string, string> = {
  "/admin/buildings": INSTITUTIONAL_MASTERS_ROUTES.buildings,
  "/admin/blocks": INSTITUTIONAL_MASTERS_ROUTES.blocks,
  "/admin/floors": INSTITUTIONAL_MASTERS_ROUTES.floors,
  "/admin/rooms": INSTITUTIONAL_MASTERS_ROUTES.rooms,
  "/admin/room-types": INSTITUTIONAL_MASTERS_ROUTES.roomTypes,
  "/admin/room-details": INSTITUTIONAL_MASTERS_ROUTES.roomDetails,
};

/** True when the nav href belongs to Exam Papers Delivery (not Institutional Masters). */
function isExamPapersDeliveryHref(href?: string): boolean {
  const h = (href ?? "").toLowerCase();
  return (
    h.includes("exam-papers-delivery") ||
    h.includes("exam-center-buildings") ||
    h.includes("exam-center-blocks") ||
    h.includes("exam-center-floors") ||
    h.includes("exam-center-rooms") ||
    h.includes("exam-center-room-types") ||
    h.includes("univ-exam-center")
  );
}

export function mapLegacyInstitutionalMastersHref(
  href?: string,
): string | null {
  if (!href) return null;
  const normalized = href.toLowerCase().replace(/\/+$/, "");
  const marker = "institutional-masters/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;

  const slug = normalized.slice(markerIndex + marker.length).split("?")[0]!;
  if (!slug) return null;
  const slugKey = slug.split("/")[0] ?? slug;

  return INSTITUTIONAL_SLUG_ROUTES[slugKey] ?? null;
}

export function isAdminInstitutionalMastersContext(
  href?: string,
  label?: string,
): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  const labelLower = (label ?? "").toLowerCase().trim();

  if (isExamPapersDeliveryHref(href)) return false;
  if (hrefLower.includes("institutional-masters")) return true;
  if (hrefLower.includes("institutional")) return true;

  if (
    hrefLower.startsWith("/admin/buildings") ||
    hrefLower.startsWith("/admin/blocks") ||
    hrefLower.startsWith("/admin/floors") ||
    hrefLower.startsWith("/admin/rooms") ||
    hrefLower.startsWith("/admin/room-types") ||
    hrefLower.startsWith("/admin/room-details")
  ) {
    return true;
  }

  if (
    hrefLower.includes("rooms-type") ||
    hrefLower.includes("room-types") ||
    hrefLower.includes("room-type")
  ) {
    return true;
  }

  if (labelLower.includes("room type") || labelLower === "room types")
    return true;
  if (
    (labelLower === "rooms" || labelLower === "room") &&
    (hrefLower.includes("institutional") || hrefLower.includes("/admin/"))
  ) {
    return true;
  }
  if (labelLower.includes("room details") || labelLower === "room detail") {
    return hrefLower.includes("institutional") || hrefLower.includes("/admin/");
  }
  if (
    labelLower === "buildings" ||
    labelLower === "building" ||
    labelLower === "blocks" ||
    labelLower === "block" ||
    labelLower === "floors" ||
    labelLower === "floor"
  ) {
    return hrefLower.includes("institutional") || hrefLower.includes("/admin/");
  }
  return false;
}

/** @deprecated Use isAdminInstitutionalMastersContext */
export function isAdminInstitutionalRoomContext(
  href?: string,
  label?: string,
): boolean {
  return isAdminInstitutionalMastersContext(href, label);
}

function mapFlatAdminInstitutionalHref(hrefLower: string): string | null {
  for (const [flat, canonical] of Object.entries(FLAT_ADMIN_TO_INSTITUTIONAL)) {
    if (hrefLower === flat || hrefLower.startsWith(`${flat}/`)) {
      return canonical;
    }
  }
  return null;
}

/**
 * Resolve Admin → Institutional Masters leaf routes.
 * Must run before generic sidebar label pins that point Buildings/Rooms at
 * Exam Papers Delivery screens.
 */
export function mapAdminInstitutionalMastersRoute(
  href?: string,
  label?: string,
): string | null {
  if (isExamPapersDeliveryHref(href)) return null;

  const fromHref = mapLegacyInstitutionalMastersHref(href);
  if (fromHref) return fromHref;

  const hrefLower = (href ?? "").toLowerCase().replace(/\/+$/, "");
  const labelLower = (label ?? "").toLowerCase().trim();

  const fromFlat = mapFlatAdminInstitutionalHref(hrefLower);
  if (fromFlat) return fromFlat;

  if (!isAdminInstitutionalMastersContext(href, label)) return null;

  if (labelLower === "buildings" || labelLower === "building") {
    return INSTITUTIONAL_MASTERS_ROUTES.buildings;
  }
  if (labelLower === "blocks" || labelLower === "block") {
    return INSTITUTIONAL_MASTERS_ROUTES.blocks;
  }
  if (labelLower === "floors" || labelLower === "floor") {
    return INSTITUTIONAL_MASTERS_ROUTES.floors;
  }
  if (labelLower.includes("room type") || labelLower === "room types") {
    return INSTITUTIONAL_MASTERS_ROUTES.roomTypes;
  }
  if (labelLower.includes("room details") || labelLower === "room detail") {
    return INSTITUTIONAL_MASTERS_ROUTES.roomDetails;
  }
  if (labelLower === "rooms" || labelLower === "room") {
    return INSTITUTIONAL_MASTERS_ROUTES.rooms;
  }

  return null;
}

/** @deprecated Use mapAdminInstitutionalMastersRoute */
export function mapAdminInstitutionalRoomRoute(
  href?: string,
  label?: string,
): string | null {
  return mapAdminInstitutionalMastersRoute(href, label);
}
