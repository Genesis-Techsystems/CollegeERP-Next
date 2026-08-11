/**
 * Build ssr-qif-data.ts from qif-parsed.json + Angular textN defaults.
 */
import fs from "node:fs";

const criteria = JSON.parse(
  fs.readFileSync(
    "src/app/(pages)/(protected)/staff-naac/_data/qif-parsed.json",
    "utf8",
  ),
);

const tsPath =
  "g:/goldcollegeerp_2024_dev3 3/goldcollegeerp_2024_dev3/src/app/main/apps/staff-naac/ssr-extended-profile/ssr-extended-profile.component.ts";
const ts = fs.readFileSync(tsPath, "utf8");
const texts = {};

for (const m of ts.matchAll(
  /text(\d+)\s*:\s*string\s*=\s*'((?:\\'|[^'])*)'/g,
)) {
  texts[m[1]] = m[2]
    .replace(/\\'/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ");
}
for (const m of ts.matchAll(
  /text(\d+)\s*:\s*string\s*=\s*"((?:\\"|[^"])*)"/g,
)) {
  texts[m[1]] = m[2]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ");
}

let richIdx = 1;
for (const c of criteria) {
  for (const sub of c.subMetrics) {
    for (const metric of sub.metrics) {
      if (metric.kind === "richtext" || metric.kind === "textarea") {
        const t = texts[String(richIdx)];
        if (t && t.trim()) {
          if (metric.kind === "richtext") {
            metric.defaultValue = t.startsWith("<") ? t : `<p>${t}</p>`;
          } else {
            metric.defaultValue = t
              .replace(/<\/?p>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim();
          }
        }
        richIdx += 1;
      }

      metric.documents = (metric.documents || []).map((d) => {
        if (d.kind === "link") {
          const { kind: _k, ...rest } = d;
          return { ...rest, linkInput: true };
        }
        if (d.kind === "otherFilesHeader") {
          return { description: "Upload Other Files:", otherFilesHeader: true };
        }
        if (d.kind === "otherFile") {
          const { kind: _k, ...rest } = d;
          return { ...rest, otherFile: true };
        }
        const { kind: _k, ...rest } = d;
        return rest;
      });

      metric.nestedPanel = metric.id.split(".").length >= 4;
    }
  }
}

const outTs = `/** Auto-generated from Angular ssr-extended-profile QIF tab.
 * Regenerate:
 *   node scripts/parse-qif-html.mjs <angular-html>
 *   node scripts/build-qif-data.mjs
 */
import type { YearValue } from "./ssr-extended-data";

export type QifDocRow = {
  description: string;
  required?: boolean;
  templateLabel?: string;
  templateHref?: string;
  fileName?: string;
  fileHref?: string;
  linkInput?: boolean;
  linkValue?: string;
  otherFilesHeader?: boolean;
  otherFile?: boolean;
  questionnaireId?: string | number;
  fileformatId?: string | number;
  seq?: string | number;
};

export type QifFieldKind =
  | "richtext"
  | "numeric"
  | "years"
  | "textarea"
  | "radio";

export type QifMetric = {
  id: string;
  title: string;
  kind: QifFieldKind;
  defaultValue?: string;
  disabled?: boolean;
  suffix?: string;
  hint?: string;
  years?: YearValue[];
  options?: { value: string; label: string; checked?: boolean }[];
  relatedInput?: { label: string; years: YearValue[] };
  documents?: QifDocRow[];
  nestedPanel?: boolean;
};

export type QifSubMetric = {
  id: string;
  title: string;
  metrics: QifMetric[];
};

export type QifCriterion = {
  id: string;
  title: string;
  answeredLabel: string;
  subMetrics: QifSubMetric[];
};

export const QIF_CRITERIA: QifCriterion[] = ${JSON.stringify(criteria, null, 2)};
`;

const outPath = "src/app/(pages)/(protected)/staff-naac/_data/ssr-qif-data.ts";
fs.writeFileSync(outPath, outTs);
console.log("Wrote", outPath, "chars", outTs.length);
console.log("Assigned narrative defaults using text1..text" + (richIdx - 1));
console.log(
  "text keys",
  Object.keys(texts)
    .sort((a, b) => Number(a) - Number(b))
    .join(","),
);
const m111 = criteria[0].subMetrics[0].metrics[0];
console.log("1.1.1 default chars", (m111.defaultValue || "").length);
