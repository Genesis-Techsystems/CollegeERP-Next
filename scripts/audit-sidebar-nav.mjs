/**
 * Audits sidebar route pins vs real App Router pages.
 * Run: node scripts/audit-sidebar-nav.mjs
 */
import fs from "fs";
import path from "path";

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

function titleCase(label) {
  return label
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const root = "src/app/(pages)/(protected)";
const pages = walk(root);
const routeToTitle = new Map();

for (const fp of pages) {
  const rel = fp.split(path.sep).join("/").replace(`${root}/`, "");
  const routePath = path.dirname(rel).split(path.sep).join("/");
  if (routePath.includes("[") || routePath === ".") continue;
  const content = fs.readFileSync(fp, "utf8");
  const title = extractPageTitle(content);
  if (title) routeToTitle.set(`/${routePath}`, title);
}

const pins = JSON.parse(
  fs.readFileSync("src/lib/generated/sidebar-route-pins.json", "utf8"),
);
const overrides = {
  "admin-student-information-system/students-list": "Student Details",
  "admin-student-information-system/generate-student-rollno":
    "Generate Student Roll No.",
  "admin-examination-management/exam-reports/evaluators-bank-copy-report":
    "Evaluators Bank Copy Report",
};

const missingRoutes = [];
const titleMismatches = [];
const duplicateLabels = new Map();

for (const pin of pins) {
  const route = pin.route;
  if (!routeToTitle.has(route) && !fs.existsSync(path.join(root, route.slice(1), "page.tsx"))) {
    missingRoutes.push(pin);
  }

  const pageTitle = routeToTitle.get(route);
  const expectedLabel = overrides[route.slice(1)] ?? titleCase(pin.label);
  if (pageTitle && pageTitle !== expectedLabel) {
    titleMismatches.push({
      route,
      pinLabel: titleCase(pin.label),
      pageTitle,
      expectedSidebarLabel: expectedLabel,
    });
  }

  const key = pin.label;
  if (!duplicateLabels.has(key)) duplicateLabels.set(key, []);
  duplicateLabels.get(key).push(pin.route);
}

const dupes = [...duplicateLabels.entries()].filter(([, routes]) => routes.length > 1);

console.log("=== Sidebar Nav Audit ===\n");
console.log(`App routes with titles: ${routeToTitle.size}`);
console.log(`Sidebar pins: ${pins.length}`);
console.log(`Pins pointing to missing pages: ${missingRoutes.length}`);
console.log(`Pin label vs page title mismatches: ${titleMismatches.length}`);
console.log(`Duplicate pin labels: ${dupes.length}\n`);

if (missingRoutes.length) {
  console.log("--- MISSING ROUTES (404 risk) ---");
  for (const p of missingRoutes) {
    console.log(`  [${p.label}] -> ${p.route}`);
  }
  console.log();
}

if (titleMismatches.length) {
  console.log("--- TITLE MISMATCHES (breadcrumb/header may differ from sidebar) ---");
  for (const m of titleMismatches.slice(0, 40)) {
    console.log(`  ${m.route}`);
    console.log(`    pin label: ${m.pinLabel}`);
    console.log(`    page title: ${m.pageTitle}`);
  }
  if (titleMismatches.length > 40) {
    console.log(`  ... and ${titleMismatches.length - 40} more`);
  }
  console.log();
}

if (dupes.length) {
  console.log("--- DUPLICATE LABELS ---");
  for (const [label, routes] of dupes) {
    console.log(`  "${label}":`);
    for (const r of routes) console.log(`    - ${r}`);
  }
}

fs.writeFileSync(
  "src/lib/generated/sidebar-nav-audit.json",
  JSON.stringify(
    { missingRoutes, titleMismatches, duplicateLabels: dupes.map(([l, r]) => ({ label: l, routes: r })) },
    null,
    2,
  ),
);
console.log("\nWrote src/lib/generated/sidebar-nav-audit.json");
