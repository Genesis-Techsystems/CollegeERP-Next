/**
 * Pages often pass a combined title like
 * `Student Attendance Report — college / year / …` for the get-list table card.
 * The filters card should show only the page/report name.
 */
export function pageTitleForFilterCard(title: string): string {
  const t = title.trim();
  if (!t) return t;

  // "Report — college / year / …" (em / en dash)
  for (const sep of [" — ", " – "]) {
    const i = t.indexOf(sep);
    if (i > 0) return t.slice(0, i).trim();
  }

  // "Report - (details)" or "Report - college / …"
  const dash = t.match(/^(.+?)\s+-\s+(\(.+\)|.+)$/);
  if (dash) {
    const left = dash[1].trim();
    const right = dash[2].trim();
    if (left.length >= 3 && looksLikeFilterSummary(right)) {
      return left;
    }
  }

  // "Report ( college / year / … )"
  const paren = t.match(/^(.+?)\s+\((.+)\)\s*$/);
  if (paren) {
    const left = paren[1].trim();
    const inner = paren[2].trim();
    if (left.length >= 3 && looksLikeFilterSummary(inner)) {
      return left;
    }
  }

  // "Enquirers Report For : college / …"
  const forColon = t.match(/^(.+?)\s+For\s*:\s*(.+)$/i);
  if (forColon) {
    const left = forColon[1].trim();
    if (left.length >= 3) return left;
  }

  return t;
}

function looksLikeFilterSummary(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("(") && v.endsWith(")")) return true;
  if (v.includes(" / ") || v.includes(" /") || /\/\s*\S/.test(v)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true;
  // Long free-text filter chips (college codes, names, etc.)
  return v.length > 20;
}
