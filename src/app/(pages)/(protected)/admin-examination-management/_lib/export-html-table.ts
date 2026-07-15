/**
 * Angular `exportAsExcel()` pattern used by exam report pages —
 * HTML table → .xls download (no SheetJS / xlsx dependency).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a plain HTML table from column headers + row objects. */
export function buildHtmlTable(
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[],
): string {
  const head = columns
    .map((c) => `<th>${escapeHtml(c.header)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/**
 * Download an HTML table (optionally with a header block) as a `.xls` file
 * via `data:application/vnd.ms-excel;base64`.
 */
export function exportHtmlTableAsExcel(
  fileName: string,
  tableHtml: string,
  headerHtml = "",
): void {
  if (typeof document === "undefined") return;
  const uri = "data:application/vnd.ms-excel;base64,";
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${headerHtml}${tableHtml}</body></html>`;
  const link = document.createElement("a");
  const name = fileName.toLowerCase().endsWith(".xls")
    ? fileName
    : `${fileName.replace(/\.xlsx$/i, "")}.xls`;
  link.download = name;
  link.href =
    uri + window.btoa(unescape(encodeURIComponent(template)));
  link.click();
}
