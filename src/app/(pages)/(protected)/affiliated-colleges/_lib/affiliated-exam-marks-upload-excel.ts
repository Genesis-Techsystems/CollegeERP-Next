import * as XLSX from "xlsx";

type AnyRow = Record<string, unknown>;

export type AffiliatedExamMarksExcelDownloadResult =
  | { ok: true }
  | { ok: false; message: string };

function sanitizeExcelFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

/**
 * Angular `download()` — `XLSX.utils.json_to_sheet(sampleExcelData[0])`.
 */
export function downloadAffiliatedExamMarksTemplateExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): AffiliatedExamMarksExcelDownloadResult {
  if (!sampleExcelData || sampleExcelData.length === 0) {
    return { ok: false, message: "No Students" };
  }
  const group0 = sampleExcelData[0];
  if (!Array.isArray(group0) || group0.length === 0) {
    return { ok: false, message: "No Students" };
  }
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }

  const worksheet = XLSX.utils.json_to_sheet(group0 as AnyRow[]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Marks");

  const safeBase = sanitizeExcelFileName(fileName);
  const outName = safeBase.toLowerCase().endsWith(".xlsx")
    ? safeBase
    : `${safeBase.replace(/\.xls$/i, "")}.xlsx`;

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
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

export type AffiliatedExamMarksPivotRow = {
  sno: number;
  hallticketno: string;
  courseyearcode: string;
  [subjectCode: string]: string | number;
};

function pickStagingField(item: AnyRow, ...names: string[]): unknown {
  for (const name of names) {
    if (item[name] != null && String(item[name]).trim() !== "") {
      return item[name];
    }
  }
  const lower = new Map(
    Object.keys(item).map((k) => [k.toLowerCase(), item[k]] as const),
  );
  for (const name of names) {
    const v = lower.get(name.toLowerCase());
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/** Angular `getStagingData()` — hallticket × subject matrix with marks values. */
export function pivotAffiliatedExamMarksStagingRows(
  stagingRows: AnyRow[],
): { rows: AffiliatedExamMarksPivotRow[]; subjectCodes: string[] } {
  const transformed: Record<string, AffiliatedExamMarksPivotRow> = {};
  const subjectsSet = new Set<string>();

  for (const item of stagingRows) {
    const hallticketno = String(
      pickStagingField(
        item,
        "hallticketno",
        "HallticketNo",
        "hallTicketNumber",
      ) ?? "",
    );
    const subjectcode = String(
      pickStagingField(item, "subjectcode", "subject_code", "subjectCode") ??
        "",
    );
    const marks = pickStagingField(item, "marks", "Marks") ?? "";

    if (!transformed[hallticketno]) {
      transformed[hallticketno] = {
        sno: Number(pickStagingField(item, "srno", "sno", "Sno") ?? 0),
        hallticketno,
        courseyearcode: String(
          pickStagingField(
            item,
            "courseyearcode",
            "courseYearCode",
            "CourseYearCode",
          ) ?? "",
        ),
      };
    }
    if (subjectcode) {
      transformed[hallticketno][subjectcode] =
        marks === "" || marks == null ? "" : String(marks);
      subjectsSet.add(subjectcode);
    }
  }

  return {
    rows: Object.values(transformed),
    subjectCodes: Array.from(subjectsSet).filter(Boolean),
  };
}
