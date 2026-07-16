import fs from "fs";

const sharedPath = "src/lib/resolve-nav-href.ts";
const navPath = "src/components/layout/NavItem.tsx";

const shared = fs.readFileSync(sharedPath, "utf8");
let helpersStart = shared.indexOf("function usesExamMastersDesign");
const helpersEnd = shared.indexOf(
  'const EXAM_MASTERS_PATH = "/admin-examination-management/admin-exam-masters";',
);
if (helpersStart < 0 || helpersEnd < 0) {
  throw new Error(`helpers markers ${helpersStart} ${helpersEnd}`);
}
// Include preceding JSDoc if present
const commentAt = shared.lastIndexOf("/**", helpersStart);
if (commentAt >= 0 && helpersStart - commentAt < 200) {
  helpersStart = commentAt;
}

const helpers = shared.slice(helpersStart, helpersEnd).trim() + "\n\n";
const cleaned = shared.slice(0, helpersStart) + shared.slice(helpersEnd);
fs.writeFileSync(sharedPath, cleaned);
console.log("cleaned resolve-nav-href.ts");

let nav = fs.readFileSync(navPath, "utf8");
const insertAt = nav.indexOf(
  'const EXAM_MASTERS_PATH = "/admin-examination-management/admin-exam-masters";',
);
if (insertAt < 0) throw new Error("EXAM_MASTERS_PATH missing in NavItem");

if (!nav.includes("function usesExamMastersDesign")) {
  nav = nav.slice(0, insertAt) + helpers + nav.slice(insertAt);
}

nav = nav.replace(
  "href={canonicalHref || rawNavTarget || \"#\"}",
  'href={canonicalHref || "#"}',
);
nav = nav.replaceAll(
  "router.push(normalizeHref(forcedRoute));",
  "router.push(canonicalHref || normalizeHref(forcedRoute));",
);

fs.writeFileSync(navPath, nav);
console.log("restored helpers + fixed NavItem");
