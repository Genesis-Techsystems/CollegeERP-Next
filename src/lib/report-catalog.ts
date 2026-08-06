/** Angular Report Catalog route (`report-catalyst` / OverallReports). */
export const REPORT_CATALOG_PATH = "/report-catalyst";

/**
 * Angular fee-report `goBack`: prefer `?path=`, else Report Catalog.
 */
export function resolveReportCatalogHref(
  pathQuery: string | null | undefined,
): string {
  const raw = (pathQuery ?? "").trim();
  if (!raw) return REPORT_CATALOG_PATH;
  if (raw === "report-catalyst" || raw === "/report-catalyst") {
    return REPORT_CATALOG_PATH;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
