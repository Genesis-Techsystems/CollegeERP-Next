import fs from "fs";
import path from "path";

function toNavSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

const ROUTE_ACTION_SUFFIXES = new Set([
  "create",
  "edit",
  "add",
  "new",
  "view",
  "details",
  "marking",
  "room-allotment",
  "copy-existing-seating",
  "existing-allotment",
  "add-exam-timetables",
  "add-exam-scheduling-forms",
  "scan-bundle-details",
  "evaluator-subject-roles",
  "generate-payslip",
  "emp-payroll",
  "add-employee",
  "add-question",
  "add-meeting",
  "view-subjects-data",
  "view-std-fee",
  "profile-view",
]);

/**
 * Sidebar labels that differ from the hardcoded page `title` prop.
 * Keys are route paths under (protected)/ without leading slash.
 */
const SIDEBAR_LABEL_OVERRIDES = {
  "admin-examination-management/pre-examination/online-exam-fee-registration":
    "Online Exam Fee Registrations",
  "admin-examination-management/pre-examination/student-exam-fee-registration":
    "Student Exam Fee Collection",
  "admin-examination-management/pre-examination/additional-exam-fees":
    "Additional Exam Fees",
  "admin-examination-management/pre-examination/invigilator-allotment":
    "Exam Invigilator Allotment",
  "admin-examination-management/pre-examination/exam-subject-barcode-generation":
    "Exam Subject Barcode Generation",
  "admin-examination-management/pre-examination/student-exam-lab-batches":
    "Student Exam Lab Batches",
  "admin-examination-management/exam-reports/evaluators-bank-copy-report":
    "Evaluators Bank Copy Report",
  "admin-student-information-system/students-list": "Student Details",
  "admin-student-information-system/generate-student-rollno":
    "Generate Student Roll No.",
};

/** Sidebar menu label → real App Router route (when DB href/title slug is wrong). */
const SIDEBAR_ROUTE_PIN_OVERRIDES = {
  "student details": "/admin-student-information-system/students-list",
  "generate student roll no": "/admin-student-information-system/generate-student-rollno",
  "generate student roll no.": "/admin-student-information-system/generate-student-rollno",
  "assign student roll number": "/admin-student-information-system/generate-student-rollno",
};

function normalizeLabelKey(label) {
  return (label ?? "").toLowerCase().trim().replace(/\./g, "");
}

function buildSidebarRoutePins(summary) {
  const byLabel = new Map();

  for (const row of summary) {
    if (row.oldUrl === row.newUrl) continue;
    const label = row.sidebarName.toLowerCase().trim();
    const route = row.oldUrl;
    const module = row.module;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push({ label, route, hrefIncludes: module });
  }

  const pins = [];

  for (const [label, entries] of byLabel) {
    const override = SIDEBAR_ROUTE_PIN_OVERRIDES[label];
    if (override) {
      pins.push({ label, route: override });
      continue;
    }
    if (entries.length === 1) {
      pins.push({ label, route: entries[0].route });
      continue;
    }
    for (const entry of entries) {
      pins.push({
        label: entry.label,
        route: entry.route,
        hrefIncludes: entry.hrefIncludes,
      });
    }
  }

  for (const [label, route] of Object.entries(SIDEBAR_ROUTE_PIN_OVERRIDES)) {
    const key = normalizeLabelKey(label);
    if (!pins.some((p) => normalizeLabelKey(p.label) === key)) {
      pins.push({ label: key, route });
    }
  }

  // Drop auto pins superseded by explicit overrides (same route, conflicting label).
  const overrideRoutes = new Set(Object.values(SIDEBAR_ROUTE_PIN_OVERRIDES));
  const overrideLabels = new Set(
    Object.keys(SIDEBAR_ROUTE_PIN_OVERRIDES).map(normalizeLabelKey),
  );
  const filtered = pins.filter((p) => {
    if (!overrideRoutes.has(p.route)) return true;
    return overrideLabels.has(normalizeLabelKey(p.label));
  });

  filtered.sort((a, b) => a.label.localeCompare(b.label));
  return filtered;
}

function buildRouteDisplayLabels() {
  const out = {};
  for (const [routePath, label] of Object.entries(SIDEBAR_LABEL_OVERRIDES)) {
    out[`/${routePath}`] = label;
  }
  return out;
}

/** Label-derived slugs (newUrl) → real App Router folders (oldUrl) for active highlight + 404 prevention. */
function buildRouteCanonicalAliases(summary) {
  const out = {};
  for (const row of summary) {
    if (row.oldUrl === row.newUrl) continue;
    out[row.newUrl] = row.oldUrl;
  }
  return out;
}

function walk(dir, results = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, results);
    else if (ent.name === "page.tsx") results.push(p);
  }
  return results;
}

function extractPageTitle(content) {
  const patterns = [
    /<(?:FilteredListPage|ListPage|FilteredPage|PageHeader)[\s\S]{0,400}?title=["']([^"']+)["']/,
    /title:\s*["']([^"']+)["']/,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m?.[1] && m[1] !== "Delete" && m[1] !== "") return m[1];
  }
  return null;
}

function replaceLastSegment(routePath, newSlug) {
  const parts = routePath.split("/");
  parts[parts.length - 1] = newSlug;
  return parts.join("/");
}

const root = "src/app/(pages)/(protected)";
const pages = walk(root);
const renames = [];
/** Permanent redirects are disabled — they broke sidebar matching when pointed at label slugs. */
const redirects = [];
const summary = [];

for (const fp of pages) {
  const rel = fp.split(path.sep).join("/").replace(`${root}/`, "");
  const routePath = path.dirname(rel).split(path.sep).join("/");
  if (routePath.includes("[") || routePath === ".") continue;

  const lastSeg = routePath.split("/").pop();
  if (ROUTE_ACTION_SUFFIXES.has(lastSeg.toLowerCase())) continue;

  const content = fs.readFileSync(fp, "utf8");
  const title = extractPageTitle(content);
  const label = SIDEBAR_LABEL_OVERRIDES[routePath] ?? title;
  if (!label) continue;

  const canonicalSlug = toNavSlug(label);
  if (!canonicalSlug || canonicalSlug === lastSeg) continue;

  const newRoutePath = replaceLastSegment(routePath, canonicalSlug);
  renames.push({
    fromDir: path.join(root, routePath),
    toDir: path.join(root, newRoutePath),
    routePath,
    newRoutePath,
    label,
    oldSlug: lastSeg,
    newSlug: canonicalSlug,
  });

  summary.push({
    module: routePath.split("/")[0] ?? routePath,
    sidebarName: label,
    oldUrl: `/${routePath}`,
    newUrl: `/${newRoutePath}`,
    oldPageTitle: title ?? label,
    newPageTitle: label,
  });
}

const sidebarRoutePins = buildSidebarRoutePins(summary);
const routeDisplayLabels = buildRouteDisplayLabels();
const routeCanonicalAliases = buildRouteCanonicalAliases(summary);

/** Internal rewrites: label-derived paths → real App Router folders (no browser URL change). */
const rewrites = Object.entries(routeCanonicalAliases).map(([source, destination]) => ({
  source,
  destination,
}));

const outDir = "src/lib/generated";
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "nav-route-redirects.json"),
  JSON.stringify(redirects, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "nav-route-rewrites.json"),
  JSON.stringify(rewrites, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "sidebar-route-pins.json"),
  JSON.stringify(sidebarRoutePins, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "route-display-labels.json"),
  JSON.stringify(routeDisplayLabels, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "route-canonical-aliases.json"),
  JSON.stringify(routeCanonicalAliases, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "nav-rename-plan.json"),
  JSON.stringify(renames, null, 2),
);

fs.writeFileSync(
  path.join(outDir, "nav-consistency-summary.json"),
  JSON.stringify(summary, null, 2),
);

console.log(`Renames planned: ${renames.length}`);
console.log(`Sidebar route pins: ${sidebarRoutePins.length}`);
console.log(`Route canonical aliases: ${Object.keys(routeCanonicalAliases).length}`);
console.log(`Redirects planned: ${redirects.length} (disabled — use sidebar-route-pins.json)`);
console.log(`Rewrites planned: ${rewrites.length} (label slug → real folder)`);

// Execute renames when --apply is passed
if (process.argv.includes("--apply")) {
  for (const r of renames) {
    if (!fs.existsSync(r.fromDir)) {
      console.warn("Skip missing:", r.fromDir);
      continue;
    }
    if (fs.existsSync(r.toDir)) {
      console.warn("Skip existing target:", r.toDir);
      continue;
    }
    fs.mkdirSync(path.dirname(r.toDir), { recursive: true });
    fs.renameSync(r.fromDir, r.toDir);
    console.log("Renamed:", r.routePath, "->", r.newRoutePath);
  }
}
