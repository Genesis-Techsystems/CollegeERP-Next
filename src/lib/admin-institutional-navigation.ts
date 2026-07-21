/**
 * Admin → Institutional Masters route resolution.
 * Keeps room screens separate from the Hostel module (shared "Rooms" label).
 */

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

  const routeMap: Record<string, string> = {
    "rooms-type": "/admin/room-types",
    "rooms-types": "/admin/room-types",
    "room-type": "/admin/room-types",
    "room-types": "/admin/room-types",
    roomtypes: "/admin/room-types",
    rooms: "/admin/rooms",
    room: "/admin/rooms",
    "room-details": "/admin/room-details",
    "room-detail": "/admin/room-details",
    roomdetails: "/admin/room-details",
    buildings: "/admin/buildings",
    building: "/admin/buildings",
    blocks: "/admin/blocks",
    block: "/admin/blocks",
    floors: "/admin/floors",
    floor: "/admin/floors",
  };

  return routeMap[slugKey] ?? null;
}

export function isAdminInstitutionalRoomContext(
  href?: string,
  label?: string,
): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  const labelLower = (label ?? "").toLowerCase().trim();

  if (hrefLower.includes("institutional-masters")) return true;
  if (
    hrefLower.includes("rooms-type") ||
    hrefLower.includes("room-types") ||
    hrefLower.includes("room-type")
  ) {
    return true;
  }
  if (hrefLower.startsWith("/admin/room") || hrefLower.includes("/admin/rooms"))
    return true;
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
  return false;
}

/** Institutional masters room screens — must run before hostel ERP mirror label matching. */
export function mapAdminInstitutionalRoomRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefLower = (href ?? "").toLowerCase();
  const labelLower = (label ?? "").toLowerCase().trim();

  const fromHref = mapLegacyInstitutionalMastersHref(href);
  if (fromHref) return fromHref;

  if (
    hrefLower === "/admin/room-types" ||
    hrefLower.startsWith("/admin/room-types/")
  ) {
    return "/admin/room-types";
  }
  if (hrefLower === "/admin/rooms" || hrefLower.startsWith("/admin/rooms/")) {
    return "/admin/rooms";
  }
  if (
    hrefLower === "/admin/room-details" ||
    hrefLower.startsWith("/admin/room-details/")
  ) {
    return "/admin/room-details";
  }

  if (labelLower.includes("room type") || labelLower === "room types") {
    return "/admin/room-types";
  }
  if (
    (labelLower.includes("room details") || labelLower === "room detail") &&
    isAdminInstitutionalRoomContext(href, label)
  ) {
    return "/admin/room-details";
  }
  if (
    (labelLower === "rooms" || labelLower === "room") &&
    (hrefLower.includes("institutional-masters") ||
      hrefLower.includes("institutional") ||
      hrefLower.includes("/admin/"))
  ) {
    return "/admin/rooms";
  }
  return null;
}
