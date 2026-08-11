/**
 * Parse Angular staff-naac ssr-extended-profile.component.html QIF tab
 * into structured JSON for React parity.
 *
 * Usage:
 *   node scripts/parse-qif-html.mjs "path/to/ssr-extended-profile.component.html"
 */
import fs from "node:fs";
import path from "node:path";

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("Usage: node scripts/parse-qif-html.mjs <angular-html-path>");
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf('id="preparessr"');
const end = html.indexOf("<!-- end of prepare", start);
const qifHtml = html.slice(start, end > start ? end : undefined);

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, " "));
}

function extractAttr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : "";
}

/** Extract File Description / Template / Documents tables from a chunk. */
function parseDocTables(chunk) {
  const tables = [];
  const tableRe =
    /<table[^>]*id="file_append_dynamic"[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;
  while ((tm = tableRe.exec(chunk))) {
    const body = tm[1];
    const rows = [];
    let otherFiles = false;
    const trRe = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(body))) {
      const attrs = tr[1];
      const inner = tr[2];
      if (/uni_title/i.test(attrs) || /File Description/i.test(inner)) continue;

      if (/Upload Other Files/i.test(inner)) {
        otherFiles = true;
        rows.push({ kind: "otherFilesHeader" });
        continue;
      }

      const tds = [...inner.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map(
        (m) => ({ attrs: m[1], html: m[2] }),
      );
      if (tds.length === 0) continue;

      if (otherFiles || /otherfile_/i.test(inner)) {
        const label = stripTags(tds[0]?.html ?? "")
          .replace(/\*$/, "")
          .trim();
        const fileCell = tds[tds.length - 1]?.html ?? "";
        const fileA = fileCell.match(
          /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
        );
        rows.push({
          kind: "otherFile",
          description:
            label ||
            String(rows.filter((r) => r.kind === "otherFile").length + 1),
          fileName: fileA ? stripTags(fileA[2]) : undefined,
          fileHref: fileA ? fileA[1] : undefined,
        });
        continue;
      }

      const descHtml = tds[0]?.html ?? "";
      const templateHtml = tds[1]?.html ?? "";
      const docsHtml =
        tds.length > 2
          ? tds
              .slice(2)
              .map((t) => t.html)
              .join(" ")
          : "";

      const description = stripTags(descHtml).replace(/\*$/, "").trim();
      const required = /glyphicon-asterisk|color:\s*red/i.test(descHtml);
      const templateA = templateHtml.match(
        /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
      );
      const hasUrlInput = /input_url_|type="text"/i.test(docsHtml);
      const fileA = docsHtml.match(
        /<a[^>]*class="[^"]*btn-link[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<a[^>]*href="([^"]*)"[^>]*class="[^"]*btn-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
      );
      // Simpler file link
      let fileName;
      let fileHref;
      const linkMatch = docsHtml.match(
        /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      );
      if (linkMatch && !/Data Template/i.test(linkMatch[2])) {
        fileHref = linkMatch[1];
        fileName = stripTags(linkMatch[2]);
      }
      if (fileA) {
        fileHref = fileA[1] || fileA[3];
        fileName = stripTags(fileA[2] || fileA[4] || "");
      }

      rows.push({
        kind: hasUrlInput ? "link" : "file",
        description,
        required,
        templateLabel: templateA ? stripTags(templateA[2]) : undefined,
        templateHref: templateA
          ? templateA[1].replace(/&amp;/g, "&")
          : undefined,
        fileName,
        fileHref,
      });
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function parseYearTable(chunk) {
  // Prefer the editable year table (form-control five_yr), not Related Input
  const yearBlock = chunk.match(
    /table-year[\s\S]*?<tr>([\s\S]*?)<\/tr>\s*<tr>([\s\S]*?)<\/tr>/i,
  );
  if (!yearBlock) return null;
  const years = [...yearBlock[1].matchAll(/>(\d{4}-\d{2})</g)].map((m) => m[1]);
  const values = [...yearBlock[2].matchAll(/value="([^"]*)"/gi)].map(
    (m) => m[1],
  );
  if (!years.length) return null;
  return years.map((year, i) => ({ year, value: values[i] ?? "" }));
}

function parseRelatedInput(chunk) {
  const m = chunk.match(
    /Related Input[\s\S]*?<br>([\s\S]*?)<br>\s*<table[\s\S]*?<tr>[\s\S]*?<\/tr>\s*<tr>([\s\S]*?)<\/tr>/i,
  );
  if (!m) return null;
  const label = stripTags(m[1]);
  const vals = [...m[2].matchAll(/>([^<]+)</g)]
    .map((x) => stripTags(x[1]))
    .filter(Boolean);
  if (!vals.length) return null;
  return {
    label,
    years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"].map(
      (year, i) => ({
        year,
        value: vals[i] ?? "",
      }),
    ),
  };
}

function parseRadios(chunk) {
  const options = [];
  const re =
    /<input[^>]*ssr_inputs_option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)(?=<input[^>]*ssr_inputs_option|<\/div>\s*<\/div>\s*<div class="clearfix")/gi;
  // Simpler: label blocks
  const labels = [
    ...chunk.matchAll(
      /<input([^>]*ssr_inputs_option[^>]*)>\s*([\s\S]*?)\s*<\/label>/gi,
    ),
  ];
  for (const lm of labels) {
    const attrs = lm[1];
    const text = stripTags(lm[2]);
    if (!text) continue;
    options.push({
      value: extractAttr(`x ${attrs}`, "value") || text.slice(0, 8),
      label: text,
      checked: /checked/i.test(attrs),
    });
  }
  return options;
}

function parseMetricBlocks(subHtml) {
  /** Split into metric chunks by bold ids like 1.2.1: or 2.1.1.1: */
  const idRe =
    /<div class="col-lg-(?:5|12)"[^>]*>\s*<b>(\d+(?:\.\d+)+):<\/b>\s*([\s\S]*?)<\/div>/gi;
  const matches = [...subHtml.matchAll(idRe)];
  if (!matches.length) return [];

  const metrics = [];
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i][1];
    const title = stripTags(matches[i][2]);
    const startIdx = matches[i].index ?? 0;
    const endIdx =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? subHtml.length)
        : subHtml.length;
    const chunk = subHtml.slice(startIdx, endIdx);

    const radios = parseRadios(chunk);
    const years = parseYearTable(chunk);
    const related = parseRelatedInput(chunk);
    const hasQuill = /quill-editor/i.test(chunk);
    const hasTextarea = /<textarea/i.test(chunk);
    const inputMatch = chunk.match(
      /<input[^>]*class="[^"]*ssr_inputs[^"]*"[^>]*>/i,
    );
    const disabled = inputMatch ? /disabled/i.test(inputMatch[0]) : false;
    const value = inputMatch ? extractAttr(inputMatch[0], "value") : "";
    const suffixPct = /col-lg-2[^>]*>\s*%/i.test(chunk);

    // Nested grey numeric (e.g. 1.3.2.1) is its own match via idRe.
    // Documents: take first table in this chunk only if this metric "owns" it
    // Heuristic: last non-nested metric gets tables after its field.
    const tables = parseDocTables(chunk);
    // Avoid attaching a parent table to nested ids when the nested chunk is small
    const documents = tables[0] ?? [];

    let kind = "numeric";
    if (radios.length) kind = "radio";
    else if (hasQuill) kind = "richtext";
    else if (hasTextarea) kind = "textarea";
    else if (years && !inputMatch) kind = "years";
    else if (years && /1\.\d+\.\d+\.\d+/.test(id)) kind = "years";
    else if (
      years &&
      /fiveyear_sub|table-year/i.test(chunk) &&
      /col-lg-5[\s\S]*table-year/i.test(chunk)
    )
      kind = "years";

    // Parent with computed % + nested years kept as numeric (disabled) + children are separate metrics
    if (years && inputMatch && !/fiveyear_sub/i.test(chunk.slice(0, 800))) {
      // years table may belong to nested metric in same chunk — if nested id appears later, don't set years on parent
      const nestedLater = matches
        .slice(i + 1)
        .some((m) => m[1].startsWith(id + "."));
      if (nestedLater) {
        // parent numeric/disabled only
      } else if (!inputMatch) {
        kind = "years";
      }
    }

    // Detect years-only metric (label + year table, no single input in first 600 chars after title)
    const afterTitle = chunk.slice(0, 1200);
    if (
      /table-year/i.test(afterTitle) &&
      !/ssr_inputs(?!_option)/i.test(afterTitle) &&
      !hasQuill &&
      !radios.length
    ) {
      kind = "years";
    }

    metrics.push({
      id,
      title,
      kind,
      defaultValue:
        kind === "richtext" || kind === "textarea"
          ? undefined
          : kind === "radio"
            ? radios.find((o) => o.checked)?.value
            : value,
      disabled: kind === "numeric" ? disabled : undefined,
      suffix: suffixPct ? "%" : undefined,
      options: kind === "radio" ? radios : undefined,
      years: kind === "years" ? (years ?? undefined) : undefined,
      relatedInput: related ?? undefined,
      documents,
      hint: hasQuill
        ? "*At least 1 characters and within 500 words"
        : undefined,
      nestedPanel: /background-color:#d2d6de/i.test(chunk),
    });
  }

  // Attach richtext defaults separately (from angular ngModel defaults not in HTML)
  return metrics;
}

// Split criteria panels
const panelRe = /<mat-expansion-panel>([\s\S]*?)<\/mat-expansion-panel>/gi;
const criteria = [];
let pm;
while ((pm = panelRe.exec(qifHtml))) {
  const panel = pm[1];
  const titleM = panel.match(
    /<mat-panel-title>\s*([\s\S]*?)\s*<\/mat-panel-title>/i,
  );
  const ansM = panel.match(
    /<mat-panel-description>\s*([\s\S]*?)\s*<\/mat-panel-description>/i,
  );
  if (!titleM) continue;
  const rawTitle = stripTags(titleM[1]);
  // "1.Curricular Aspects" or "7.Institutional..."
  const tm = rawTitle.match(/^(\d+)\.\s*(.+)$/);
  if (!tm) continue;
  const id = tm[1];
  const title = tm[2].trim();
  const answeredLabel = stripTags(ansM?.[1] ?? "").replace(/\s+/g, " ");

  // Sub-metrics: panels with cae7ff heading
  const subRe =
    /<div class="panel panel-default" style="border-color:#cae7ff">\s*<div class="\s*panel-heading" style="background-color:#cae7ff">([\s\S]*?)<\/div>([\s\S]*?)(?=<div class="panel panel-default" style="border-color:#cae7ff">|<a href="javascript:void\(0\)" onclick="saveSSR|<\/div>\s*<a href="javascript:void\(0\)" onclick="saveSSR|$)/gi;

  const subMetrics = [];
  let sm;
  const criteriaBody = panel;
  while ((sm = subRe.exec(criteriaBody))) {
    const heading = stripTags(sm[1]);
    const hm = heading.match(/^(\d+\.\d+)\s*:\s*(.+)$/);
    if (!hm) continue;
    const subId = hm[1];
    const subTitle = hm[2].trim();
    const subHtml = sm[2];
    const metrics = parseMetricBlocks(subHtml);
    subMetrics.push({ id: subId, title: subTitle, metrics });
  }

  criteria.push({
    id,
    title,
    answeredLabel,
    subMetrics,
  });
}

const outPath = path.resolve(
  "src/app/(pages)/(protected)/staff-naac/_data/qif-parsed.json",
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(criteria, null, 2), "utf8");

// Summary
console.log(`Wrote ${outPath}`);
console.log(`Criteria: ${criteria.length}`);
for (const c of criteria) {
  const metricCount = c.subMetrics.reduce((n, s) => n + s.metrics.length, 0);
  const docRows = c.subMetrics.reduce(
    (n, s) => n + s.metrics.reduce((m, x) => m + (x.documents?.length ?? 0), 0),
    0,
  );
  console.log(
    `  ${c.id}. ${c.title} — subs=${c.subMetrics.length} metrics=${metricCount} docRows=${docRows} (${c.answeredLabel})`,
  );
}
// Spot-check 1.2.1 docs
const c1 = criteria.find((c) => c.id === "1");
const m121 = c1?.subMetrics
  .flatMap((s) => s.metrics)
  .find((m) => m.id === "1.2.1");
console.log("\n1.2.1 sample:", JSON.stringify(m121, null, 2)?.slice(0, 2000));
