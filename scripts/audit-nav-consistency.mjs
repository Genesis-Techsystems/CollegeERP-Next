import fs from "fs";
import path from "path";

function toNavSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function walk(dir, results = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, results);
    else if (ent.name === "page.tsx") results.push(p);
  }
  return results;
}

const root = "src/app/(pages)/(protected)";
const pages = walk(root);
const issues = [];

for (const fp of pages) {
  const content = fs.readFileSync(fp, "utf8");
  const rel = fp.split(path.sep).join("/").replace("src/app/(pages)/(protected)/", "");
  const routePath = path.dirname(rel).split(path.sep).join("/");
  const lastSeg = routePath.split("/").pop();

  const titleMatch = content.match(
    /(?:FilteredListPage|ListPage|FilteredPage|PageHeader)[\s\S]{0,300}?title=["']([^"']+)["']/,
  );
  const title = titleMatch ? titleMatch[1] : null;

  if (title && !routePath.includes("[")) {
    const expectedSlug = toNavSlug(title);
    if (expectedSlug !== lastSeg) {
      issues.push({ routePath, lastSeg, title, expectedSlug, file: fp });
    }
  }
}

console.log("Total pages:", pages.length);
console.log("Title vs slug mismatches:", issues.length);
for (const i of issues) {
  console.log(
    `${i.routePath}\n  title: ${i.title}\n  slug: ${i.lastSeg} -> ${i.expectedSlug}\n`,
  );
}
