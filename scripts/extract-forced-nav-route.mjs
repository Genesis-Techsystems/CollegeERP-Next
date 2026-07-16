import fs from "fs";

const navItemPath = "src/components/layout/NavItem.tsx";
const s = fs.readFileSync(navItemPath, "utf8");

const startMarker = "  const forcedRoute = (() => {";
const endMarker = "  })();\r\n\r\n  const rawNavTarget";
let start = s.indexOf(startMarker);
let end = s.indexOf(endMarker, start);
if (end < 0) {
  end = s.indexOf("  })();\n\n  const rawNavTarget", start);
}
if (start < 0 || end < 0) {
  throw new Error(`markers not found: start=${start} end=${end}`);
}

let body = s.slice(start + startMarker.length, end);

// Replace item.href / item.label references with function params
body = body
  .replace(/\(item\.href \?\? ""\)/g, '(href ?? "")')
  .replace(/item\.href/g, "href")
  .replace(/item\.label \?\? labelLower/g, "label ?? labelLower")
  .replace(/item\.label/g, "label");

// Extract mapLegacyMasterSettingsHref from NavItem (local helper)
const masterStart = s.indexOf("function mapLegacyMasterSettingsHref");
const masterEnd = s.indexOf("\nexport function NavItem", masterStart);
if (masterStart < 0 || masterEnd < 0) {
  throw new Error("mapLegacyMasterSettingsHref not found");
}
const masterFn = s.slice(masterStart, masterEnd).trim();

const out = `/**
 * Shared sidebar + Search pages route resolution.
 * Extracted from NavItem so Search navigates to the same URLs as the sidebar.
 */
import {
  EXAM_REPORTS_LIVE_UNDER_EXAM_REPORTS,
  normalizePageHref,
  toNavSlug,
} from "@/lib/navigation";
import {
  mapErpModuleLabelToRoute,
  mapErpModuleNavRoute,
} from "@/lib/erp-modules-navigation";
import {
  mapTimetableLabelToRoute,
  mapTimetableNavRoute,
} from "@/lib/timetable-navigation";
import { mapLegacyInstitutionalMastersHref } from "@/lib/admin-institutional-navigation";

${masterFn}

const EXAM_MASTERS_PATH = "/admin-examination-management/admin-exam-masters";

/**
 * Sidebar/Search shared route pins (legacy Angular → App Router).
 * Returns a forced path, or null to keep the item href.
 */
export function resolveForcedNavRoute(
  href: string | undefined,
  label: string,
): string | null {
  const labelLower = (label ?? "").toLowerCase();
  const preExamBase = "/admin-examination-management/pre-examination";
  const reEvalBase = "/admin-examination-management/re-evaluation";
  const evalProcessBase = "/admin-examination-management/evaluation-process";
  const postExamBase = "/admin-examination-management/post-examination";
${body}
}

/** Same final href sidebar clicks and Search pages use. */
export function resolveNavHref(href: string | undefined, label: string): string {
  const forced = resolveForcedNavRoute(href, label);
  const raw = forced ?? href ?? "";
  if (!raw || raw === "#") return "";
  return normalizePageHref(raw, label);
}
`;

fs.writeFileSync("src/lib/resolve-nav-href.ts", out);
console.log("Wrote src/lib/resolve-nav-href.ts", out.length, "chars");

// Patch NavItem to use the shared resolver
let patched = s;
// Remove mapLegacyMasterSettingsHref if present (now in shared module)
if (masterStart >= 0 && masterEnd >= 0) {
  patched =
    patched.slice(0, masterStart) + patched.slice(masterEnd);
}

// Replace forcedRoute IIFE + rawNavTarget/canonicalHref with shared call
const replaceStart = patched.indexOf("  const labelLower = (item.label ?? \"\").toLowerCase();");
const replaceEndMarker = "  const canonicalHref =\r\n    rawNavTarget && rawNavTarget !== \"#\"\r\n      ? normalizePageHref(rawNavTarget, item.label ?? \"\")\r\n      : \"\";";
let replaceEnd = patched.indexOf(replaceEndMarker);
let endLen = replaceEndMarker.length;
if (replaceEnd < 0) {
  const alt =
    "  const canonicalHref =\n    rawNavTarget && rawNavTarget !== \"#\"\n      ? normalizePageHref(rawNavTarget, item.label ?? \"\")\n      : \"\";";
  replaceEnd = patched.indexOf(alt);
  endLen = alt.length;
}
if (replaceStart < 0 || replaceEnd < 0) {
  throw new Error(
    `replace markers not found: ${replaceStart} ${replaceEnd}`,
  );
}

const replacement = `  const labelLower = (item.label ?? "").toLowerCase();
  const forcedRoute = resolveForcedNavRoute(item.href, item.label ?? "");
  const canonicalHref = resolveNavHref(item.href, item.label ?? "");`;

patched =
  patched.slice(0, replaceStart) +
  replacement +
  patched.slice(replaceEnd + endLen);

// Add import for resolve helpers
if (!patched.includes('from "@/lib/resolve-nav-href"')) {
  patched = patched.replace(
    'from "@/lib/hostel-navigation";',
    `from "@/lib/hostel-navigation";
import {
  resolveForcedNavRoute,
  resolveNavHref,
} from "@/lib/resolve-nav-href";`,
  );
}

// Remove unused toNavSlug from navigation import if present (still may be unused)
// Keep normalizePageHref import in case still used elsewhere in file

fs.writeFileSync(navItemPath, patched);
console.log("Patched NavItem.tsx");
