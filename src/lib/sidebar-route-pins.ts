/**
 * Sidebar menu label → real App Router route pins.
 * Generated from page-folder vs title mismatches; overrides win over auto pins.
 * Used by sidebar navigation, search, breadcrumbs, and page titles.
 */
import sidebarRoutePins from "@/lib/generated/sidebar-route-pins.json";
import routeDisplayLabels from "@/lib/generated/route-display-labels.json";
import routeCanonicalAliases from "@/lib/generated/route-canonical-aliases.json";

export type SidebarRoutePin = {
  label: string;
  route: string;
  /** When set, pin applies only if the nav href contains this substring. */
  hrefIncludes?: string;
};

const PINS = sidebarRoutePins as SidebarRoutePin[];
const ROUTE_LABELS = routeDisplayLabels as Record<string, string>;
const CANONICAL_ALIASES = routeCanonicalAliases as Record<string, string>;

function normalizePath(path: string): string {
  let raw = (path ?? "").trim().replace(/\/{2,}/g, "/").replace(/\/$/, "");
  if (!raw.startsWith("/")) raw = `/${raw}`;
  return CANONICAL_ALIASES[raw] ?? raw;
}

function normalizeLabelKey(label: string): string {
  return (label ?? "").toLowerCase().trim().replace(/\./g, "");
}

/**
 * Resolve a sidebar tab label (+ optional DB href) to the live page route.
 * Returns null when no pin matches.
 */
export function resolveSidebarLabelPin(
  href: string | undefined,
  label: string | undefined,
): string | null {
  const labelKey = normalizeLabelKey(label ?? "");
  if (!labelKey) return null;

  const hrefLower = (href ?? "").toLowerCase();
  const matches = PINS.filter((p) => normalizeLabelKey(p.label) === labelKey);
  if (matches.length === 0) return null;

  if (matches.length === 1) {
    return matches[0].route;
  }

  if (hrefLower) {
    const scoped = matches.find(
      (p) => p.hrefIncludes && hrefLower.includes(p.hrefIncludes.toLowerCase()),
    );
    if (scoped) return scoped.route;
  }

  return matches[0].route;
}

/** Preferred sidebar/menu label for a live route (breadcrumb + page title). */
export function findSidebarLabelForRoute(
  pathname: string,
  pins: SidebarRoutePin[] = PINS,
): string | null {
  const target = normalizePath(pathname) || "/";

  if (ROUTE_LABELS[target]) {
    return ROUTE_LABELS[target];
  }

  for (const pin of pins) {
    if (normalizePath(pin.route) === target) {
      return pin.label
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return null;
}
