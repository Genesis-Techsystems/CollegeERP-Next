import * as XLSX from "xlsx";

type AnyRow = Record<string, unknown>;

export type AffiliatedSubjectExcelDownloadResult =
  | { ok: true }
  | { ok: false; message: string };

function asRows(value: unknown): AnyRow[] {
  if (Array.isArray(value)) return value as AnyRow[];
  if (value && typeof value === "object") return [value as AnyRow];
  return [];
}

function pickFirstRow(group: unknown): AnyRow | null {
  if (Array.isArray(group)) {
    const first = group[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as AnyRow;
    }
    return null;
  }
  if (group && typeof group === "object") return group as AnyRow;
  return null;
}

/** Angular `exportToExcel` uses `sampleExcelData[1]`. */
export function findSubjectStudentGroup(
  sampleExcelData: unknown[][],
): unknown[] | null {
  const primary = sampleExcelData[1];
  if (!Array.isArray(primary) || primary.length === 0) return null;
  return primary;
}

function pickSubjectCodes(header: AnyRow): string[] {
  const raw = String(
    header.subjectcodes ?? header.subjectCodes ?? header.SUBJECTCODES ?? "",
  );
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function sanitizeExcelFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

/** Browser download — Angular uses `saveAs(blob)`; `XLSX.writeFile` is Node-only in this build. */
function downloadXlsx(
  fileName: string,
  rows: string[][],
): AffiliatedSubjectExcelDownloadResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }
  if (rows.length === 0 || rows[0]?.length === 0) {
    return { ok: false, message: "No template columns available to export." };
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Student Subjects Data");

  const safeBase = sanitizeExcelFileName(fileName);
  const outName = safeBase.toLowerCase().endsWith(".xlsx")
    ? safeBase
    : `${safeBase.replace(/\.xls$/i, "")}.xlsx`;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = outName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { ok: true };
}

function studentRowValues(row: AnyRow): string[] {
  const copy = { ...row };
  delete copy.subjectcodes;
  delete copy.subjectCodes;
  delete copy.SUBJECTCODES;
  return Object.values(copy).map((v) => String(v ?? "").trim());
}

/**
 * Angular `exportToExcel()` — split `subjectcodes` into columns prefilled with `Y`.
 * Requires `sampleExcelData[1].length > 0` (same guard as Angular).
 */
export function downloadAffiliatedStudentSubjectsTemplateExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): AffiliatedSubjectExcelDownloadResult {
  const headerObj = pickFirstRow(sampleExcelData[0]);
  if (!headerObj) {
    return {
      ok: false,
      message: "Template headers missing. Reload the page and try again.",
    };
  }

  const dataGroup = findSubjectStudentGroup(sampleExcelData);
  if (!dataGroup || dataGroup.length === 0) {
    return { ok: false, message: "No Students Dsta" };
  }

  const headers = { ...headerObj };
  const subjectCodes = pickSubjectCodes(headers);
  delete headers.subjectcodes;
  delete headers.subjectCodes;
  delete headers.SUBJECTCODES;
  const finalHeaders = [...Object.keys(headers), ...subjectCodes];

  const body: string[][] = [finalHeaders];
  for (const row of asRows(dataGroup)) {
    body.push([...studentRowValues(row), ...subjectCodes.map(() => "Y")]);
  }

  return downloadXlsx(fileName, body);
}

export type AffiliatedSubjectPivotRow = {
  sno: number;
  hallticketno: string;
  academicyear: string;
  courseyearcode: string;
  regulationcode: string;
  [subjectCode: string]: string | number;
};

/** Angular `getStagingData()` — pivot flat staging rows into hallticket × subject matrix. */
export function pivotAffiliatedSubjectStagingRows(
  stagingRows: AnyRow[],
): { rows: AffiliatedSubjectPivotRow[]; subjectCodes: string[] } {
  const transformed: Record<string, AffiliatedSubjectPivotRow> = {};
  const subjectsSet = new Set<string>();

  for (const item of stagingRows) {
    const hallticketno = String(item.hallticketno ?? item.hallTicketNumber ?? "");
    const subjectcode = String(item.subjectcode ?? item.subjectCode ?? "");
    if (!hallticketno) continue;
    if (!transformed[hallticketno]) {
      transformed[hallticketno] = {
        sno: Number(item.srno ?? item.sno ?? 0),
        hallticketno,
        academicyear: String(item.academicyear ?? item.academicYear ?? ""),
        courseyearcode: String(item.courseyearcode ?? item.courseYearCode ?? ""),
        regulationcode: String(item.regulationcode ?? item.regulationCode ?? ""),
      };
    }
    if (subjectcode) {
      transformed[hallticketno][subjectcode] = "Y";
      subjectsSet.add(subjectcode);
    }
  }

  const subjectCodes = Array.from(subjectsSet);
  for (const row of Object.values(transformed)) {
    for (const code of subjectCodes) {
      if (row[code] == null) row[code] = "N";
    }
  }

  return {
    rows: Object.values(transformed),
    subjectCodes,
  };
}
