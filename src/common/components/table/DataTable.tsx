"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type CellClickedEvent,
  type GetRowIdFunc,
  type RowClickedEvent,
  type FirstDataRenderedEvent,
  type GridSizeChangedEvent,
  type RowDataUpdatedEvent,
  type GridReadyEvent,
} from "ag-grid-community";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRINTCONFIG } from "@/common/print-config";
import { cn } from "@/lib/utils";
import {
  DataTableFooter,
  PAGE_SIZE_OPTIONS,
  type DataTablePageSize,
} from "./DataTableFooter";
import { DataTableToolbar } from "./DataTableToolbar";

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableToolbarConfig {
  /** Client-side filter across row values. Default **true**. */
  search?: boolean;
  columnPicker?: boolean;
  exportPdf?: boolean;
  /** Export visible columns as CSV (shown as “Excel”). Default **true**. */
  exportExcel?: boolean;
  /** AG Grid per-column header filters. Default **true**. */
  columnFilters?: boolean;
  /** Show “Show inactive” checkbox. Default **false**. */
  showInactiveToggle?: boolean;
  searchPlaceholder?: string;
  pdfDocumentTitle?: string;
  lockColumnIds?: string[];
}

const FILTER_HINT =
  "Click the filter icon next to each column header to filter that column.";

/** Read title from legacy `.app-card-title` or AppShell `--page-name` (breadcrumb). */
function inferLegacyTableTitle(root: HTMLElement): string | undefined {
  const card = root.closest(".app-card");
  const titleEl = card?.querySelector(".app-card-title");
  const directText = titleEl?.textContent?.trim();
  if (directText) return directText;

  const pageContent = root.closest("[data-page-content]");
  if (pageContent) {
    const pageName = getComputedStyle(pageContent)
      .getPropertyValue("--page-name")
      .trim();
    if (pageName) return pageName.replace(/^["']|["']$/g, "");
  }

  return undefined;
}

function adoptLegacyTableShell(root: HTMLElement): () => void {
  const card = root.closest(".app-card");
  if (!card) return () => {};

  card.classList.add("app-card--hosts-data-table");

  const titleEl = card.querySelector(".app-card-title");
  const headerRow =
    titleEl?.closest<HTMLElement>(".app-card > div") ??
    titleEl?.parentElement ??
    null;

  if (titleEl instanceof HTMLElement && headerRow) {
    const hasControls = Boolean(
      headerRow.querySelector(
        'button, input, select, textarea, [role="combobox"], [data-slot="collapsible"]',
      ),
    );
    if (hasControls) {
      titleEl.classList.add("app-data-table-legacy-title-only");
    } else {
      headerRow.classList.add("app-data-table-legacy-header");
    }
  }

  const paddingWrap = root.parentElement;
  if (paddingWrap?.classList.contains("px-3")) {
    paddingWrap.classList.add("app-data-table-legacy-padding");
  }

  const shell = root.closest<HTMLElement>(".rounded-lg.border");
  if (shell && shell !== root)
    shell.classList.add("app-data-table-legacy-shell");

  return () => {
    card.classList.remove("app-card--hosts-data-table");
    headerRow?.classList.remove("app-data-table-legacy-header");
    if (titleEl instanceof HTMLElement) {
      titleEl.classList.remove("app-data-table-legacy-title-only");
    }
    paddingWrap?.classList.remove("app-data-table-legacy-padding");
    shell?.classList.remove("app-data-table-legacy-shell");
  };
}

export interface DataTableProps<T> {
  /** Optional title above the toolbar (string or custom node) */
  title?: ReactNode;
  /** Optional subtitle; defaults to filter hint when column filters are on */
  subtitle?: string;
  /** Wrap in a bordered card. Default **true**. */
  bordered?: boolean;
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  height?: string;
  getRowId?: GetRowIdFunc<T>;
  onCellClicked?: (event: CellClickedEvent<T>) => void;
  onRowClick?: (row: T) => void;
  pagination?: boolean;
  /** Default **25** */
  paginationPageSize?: number;
  serverSide?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  toolbar?: boolean | DataTableToolbarConfig;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
  /** @deprecated Use toolbar.exportExcel instead */
  exportCsv?: boolean;
  onGridApiReady?: (api: GridApi<T>) => void;
  /**
   * When false, columns keep their defined widths/minWidths (horizontal scroll if needed)
   * instead of being squeezed by `sizeColumnsToFit`. Default **true**.
   */
  fitColumnsToWidth?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  minWidth: 70,
  suppressHeaderMenuButton: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_SEARCH_DEPTH = 8;

function collectStrings(value: unknown, depth: number, out: string[]): void {
  if (depth > MAX_SEARCH_DEPTH) return;
  if (value == null) return;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") {
    out.push(String(value));
    return;
  }
  if (t !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out);
    return;
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    collectStrings(v, depth + 1, out);
  }
}

function rowMatchesSearch<T>(row: T, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay: string[] = [];
  collectStrings(row, 0, hay);
  return hay.some((s) => s.toLowerCase().includes(needle));
}

function rowHasIsActiveField<T>(row: T): boolean {
  return Boolean(
    row && typeof row === "object" && "isActive" in (row as object),
  );
}

function filterInactiveRows<T>(rows: T[], showInactive: boolean): T[] {
  if (showInactive) return rows;
  return rows.filter(
    (row) =>
      !rowHasIsActiveField(row) ||
      (row as { isActive?: boolean }).isActive !== false,
  );
}

function isActionsColumn(def: ColDef): boolean {
  const header = String(def.headerName ?? "")
    .trim()
    .toLowerCase();
  return header === "actions" || header === "action";
}

function withCellClass(def: ColDef, className: string): ColDef {
  const existing = def.cellClass;
  if (!existing) return { ...def, cellClass: className };
  if (typeof existing === "string") {
    return existing.split(/\s+/).includes(className)
      ? def
      : { ...def, cellClass: `${existing} ${className}` };
  }
  if (Array.isArray(existing)) {
    return existing.includes(className)
      ? def
      : { ...def, cellClass: [...existing, className] };
  }
  return def;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellDisplayText<T>(row: T, def: ColDef<T>, rowIndex: number): string {
  let value: unknown;
  try {
    if (typeof def.valueGetter === "function") {
      value = def.valueGetter({ data: row, node: { rowIndex } } as never);
    } else if (def.field) {
      value = (row as Record<string, unknown>)[def.field];
    }
    if (typeof def.valueFormatter === "function") {
      value = def.valueFormatter({
        value,
        data: row,
        node: { rowIndex },
      } as never);
    }
  } catch {
    value = "";
  }
  if (value == null) return "";
  return String(value);
}

function printTableAsPdf<T>(
  title: string,
  exportDefs: ColDef<T>[],
  rows: T[],
): void {
  const { paperSize, orientation } = PRINTCONFIG.datatables;
  const head = exportDefs
    .map((d) => `<th>${escapeHtml(String(d.headerName ?? d.field ?? ""))}</th>`)
    .join("");
  const body = rows
    .map(
      (row, i) =>
        `<tr>${exportDefs.map((d) => `<td>${escapeHtml(cellDisplayText(row, d, i))}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page { size: ${paperSize === "LETTER" ? "letter" : "A4"} ${orientation}; margin: 12mm; }
body { font: 11px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111827; margin: 0; }
h1 { font-size: 15px; margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #f1f5f9; font-weight: 600; }
tr { break-inside: avoid; }
</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

function resolveToolbar(toolbar: boolean | DataTableToolbarConfig | undefined) {
  if (toolbar === false) {
    return {
      show: false,
      search: false,
      columnPicker: false,
      exportPdf: false,
      exportExcel: false,
      columnFilters: false,
      showInactiveToggle: false,
      searchPlaceholder: "",
      pdfDocumentTitle: undefined as string | undefined,
      lockColumnIds: [] as string[],
    };
  }
  const t: DataTableToolbarConfig =
    toolbar === true || toolbar === undefined ? {} : toolbar;
  return {
    show: true,
    search: t.search !== false,
    columnPicker: t.columnPicker !== false,
    exportPdf: t.exportPdf !== false,
    exportExcel: t.exportExcel !== false,
    columnFilters: t.columnFilters !== false,
    showInactiveToggle: t.showInactiveToggle === true,
    searchPlaceholder: t.searchPlaceholder ?? "Search…",
    pdfDocumentTitle: t.pdfDocumentTitle,
    lockColumnIds: t.lockColumnIds ?? [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  title,
  subtitle,
  bordered = true,
  rowData,
  columnDefs,
  loading = false,
  height = "auto",
  getRowId,
  onCellClicked,
  onRowClick,
  pagination = true,
  paginationPageSize = 25,
  serverSide = false,
  totalCount = 0,
  currentPage = 0,
  onPageChange,
  toolbar: toolbarProp,
  toolbarLeading,
  toolbarTrailing,
  exportCsv = false,
  onGridApiReady,
  fitColumnsToWidth = true,
}: DataTableProps<T>) {
  const tb = useMemo(() => resolveToolbar(toolbarProp), [toolbarProp]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [popupParent, setPopupParent] = useState<HTMLElement | undefined>(
    undefined,
  );
  const [inferredTitle, setInferredTitle] = useState<string | undefined>();

  useEffect(() => {
    setPopupParent(document.body);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (!title && !toolbarLeading) {
      setInferredTitle(inferLegacyTableTitle(root));
    } else {
      setInferredTitle(undefined);
    }
    return adoptLegacyTableShell(root);
  }, [title, toolbarLeading, rowData.length, loading]);

  const resolvedTitle = title ?? inferredTitle;

  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
  const gridRef = useRef<AgGridReact<T>>(null);

  const clientPaginationEnabled = pagination && !serverSide;

  const showInactiveToggle = tb.showInactiveToggle;

  const inactiveFilteredData = useMemo(() => {
    if (!showInactiveToggle) return rowData;
    return filterInactiveRows(rowData, showInactive);
  }, [rowData, showInactiveToggle, showInactive]);

  const filteredRowData = useMemo(() => {
    if (!tb.show || !tb.search || !searchQuery.trim())
      return inactiveFilteredData;
    return inactiveFilteredData.filter((r) => rowMatchesSearch(r, searchQuery));
  }, [inactiveFilteredData, tb.show, tb.search, searchQuery]);

  const [clientPage, setClientPage] = useState(0);
  const [clientPageSize, setClientPageSize] = useState<DataTablePageSize>(
    () => {
      const n = Number(paginationPageSize);
      return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
        ? (n as DataTablePageSize)
        : 25;
    },
  );

  useEffect(() => {
    setClientPage(0);
  }, [rowData, searchQuery, showInactive]);

  const [serverPageSize, setServerPageSize] = useState<DataTablePageSize>(
    () => {
      const n = Number(paginationPageSize);
      return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
        ? (n as DataTablePageSize)
        : 25;
    },
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      ...DEFAULT_COL_DEF,
      ...(tb.columnFilters
        ? { filter: "agTextColumnFilter", floatingFilter: false }
        : {}),
    }),
    [tb.columnFilters],
  );

  const resolvedColumnDefs = useMemo(
    () =>
      columnDefs.map((def) => {
        if (isActionsColumn(def)) {
          return withCellClass(
            { ...def, filter: false, sortable: false },
            "app-cell-actions",
          );
        }
        return withCellClass(def, "app-cell-ellipsis");
      }),
    [columnDefs],
  );

  const resolvedSubtitle =
    subtitle ??
    (resolvedTitle && tb.columnFilters && tb.show ? FILTER_HINT : undefined);

  const isAutoHeight = height === "auto" || pagination || serverSide;

  const dataForPaging = clientPaginationEnabled ? filteredRowData : rowData;
  const clientTotalRows = dataForPaging.length;
  const clientTotalPages = Math.max(
    1,
    Math.ceil(clientTotalRows / clientPageSize),
  );
  const safePage = Math.min(clientPage, clientTotalPages - 1);

  const pagedRowData = useMemo(() => {
    if (serverSide) return rowData;
    if (!clientPaginationEnabled) return filteredRowData;
    const start = safePage * clientPageSize;
    return filteredRowData.slice(start, start + clientPageSize);
  }, [
    rowData,
    filteredRowData,
    clientPaginationEnabled,
    serverSide,
    safePage,
    clientPageSize,
  ]);

  const rowNumberOffset = clientPaginationEnabled
    ? safePage * clientPageSize
    : serverSide
      ? currentPage * serverPageSize
      : 0;

  const totalPages = serverSide
    ? Math.max(1, Math.ceil(totalCount / serverPageSize))
    : 1;

  function fitColumns(api: GridApi<T>) {
    if (!fitColumnsToWidth) return;
    api.sizeColumnsToFit();
  }

  function handleGridReady(event: GridReadyEvent<T>) {
    setGridApi(event.api);
    onGridApiReady?.(event.api);
  }

  function handleClientPageSizeChange(size: DataTablePageSize) {
    setClientPageSize(size);
    setClientPage(0);
  }

  function handleServerPageSizeChange(size: DataTablePageSize) {
    setServerPageSize(size);
    onPageChange?.(0, size);
  }

  function handleExportCsv() {
    gridRef.current?.api.exportDataAsCsv();
  }

  const handleExportPdf = useCallback(() => {
    const api = gridRef.current?.api ?? gridApi;
    const docTitle = tb.pdfDocumentTitle || document.title || "Export";
    const exportDefs: ColDef<T>[] = (api?.getAllDisplayedColumns() ?? [])
      .map((c) => c.getColDef())
      .filter((d) => Boolean(d.field) || typeof d.valueGetter === "function");
    const defs = exportDefs.length
      ? exportDefs
      : columnDefs.filter(
          (d) => Boolean(d.field) || typeof d.valueGetter === "function",
        );
    printTableAsPdf(docTitle, defs, filteredRowData);
  }, [gridApi, tb.pdfDocumentTitle, columnDefs, filteredRowData]);

  const getColumns = useCallback(() => {
    const api = gridRef.current?.api ?? gridApi;
    if (!api) return null;
    return api.getAllGridColumns() ?? null;
  }, [gridApi]);

  const applyColumnVisible = useCallback(
    (colId: string, visible: boolean) => {
      const api = gridRef.current?.api ?? gridApi;
      if (!api) return;
      api.applyColumnState({ state: [{ colId, hide: !visible }] });
      api.refreshHeader();
    },
    [gridApi],
  );

  function handleRowClicked(event: RowClickedEvent<T>) {
    if (onRowClick && event.data !== undefined) onRowClick(event.data);
  }

  const exportExcelEnabled = tb.exportExcel || exportCsv;

  const isGridEmpty = !loading && pagedRowData.length === 0;

  const showMainToolbar =
    tb.show &&
    (tb.search ||
      tb.columnPicker ||
      tb.exportPdf ||
      tb.exportExcel ||
      showInactiveToggle ||
      Boolean(toolbarTrailing) ||
      Boolean(toolbarLeading) ||
      exportCsv);

  return (
    <div
      ref={rootRef}
      className={
        bordered
          ? "app-data-table app-data-table-card flex flex-col"
          : "app-data-table flex flex-col"
      }
    >
      {(resolvedTitle || resolvedSubtitle) && (
        <div className="app-data-table-heading px-5 pb-1 pt-5">
          {resolvedTitle ? (
            typeof resolvedTitle === "string" ||
            typeof resolvedTitle === "number" ? (
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {resolvedTitle}
              </h2>
            ) : (
              resolvedTitle
            )
          ) : null}
          {resolvedSubtitle ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {resolvedSubtitle}
            </p>
          ) : null}
        </div>
      )}

      {(showMainToolbar || (!showMainToolbar && exportCsv)) && (
        <div className="app-data-table-toolbar-wrap bg-card px-5 pb-3 pt-4">
          {showMainToolbar ? (
            <DataTableToolbar
              leading={toolbarLeading}
              searchEnabled={tb.search}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={tb.searchPlaceholder}
              rowCount={filteredRowData.length}
              showInactiveToggle={Boolean(showInactiveToggle)}
              showInactive={showInactive}
              onShowInactiveChange={setShowInactive}
              columnPickerEnabled={tb.columnPicker}
              exportExcelEnabled={exportExcelEnabled}
              onExportExcel={handleExportCsv}
              exportPdfEnabled={tb.exportPdf}
              onExportPdf={handleExportPdf}
              lockColumnIds={tb.lockColumnIds}
              getColumns={getColumns}
              applyColumnVisible={applyColumnVisible}
              endActions={toolbarTrailing}
            />
          ) : (
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
                onClick={handleExportCsv}
                aria-label="Export to Excel"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "ag-theme-quartz",
          isGridEmpty && "app-data-table-grid-empty",
        )}
        style={isAutoHeight ? undefined : { height }}
      >
        <AgGridReact<T>
          ref={gridRef}
          context={{ __rowNumberOffset: rowNumberOffset }}
          rowData={pagedRowData}
          columnDefs={resolvedColumnDefs}
          defaultColDef={defaultColDef}
          domLayout={isAutoHeight ? "autoHeight" : undefined}
          loading={loading}
          // suppressCellFocus={true}
          overlayNoRowsTemplate='<span class="app-data-table-no-rows-msg">No rows to show</span>'
          onGridReady={handleGridReady}
          onFirstDataRendered={(e) => fitColumns(e.api)}
          onRowDataUpdated={(e) => fitColumns(e.api)}
          onGridSizeChanged={(e) => fitColumns(e.api)}
          alwaysShowHorizontalScroll={!fitColumnsToWidth}
          enableCellTextSelection
          ensureDomOrder
          getRowId={getRowId}
          onCellClicked={onCellClicked}
          onRowClicked={onRowClick ? handleRowClicked : undefined}
          popupParent={popupParent}
          animateRows
        />
      </div>

      {clientPaginationEnabled && (
        <DataTableFooter
          totalRows={clientTotalRows}
          page={safePage}
          pageSize={clientPageSize}
          totalPages={clientTotalPages}
          onPageChange={setClientPage}
          onPageSizeChange={handleClientPageSizeChange}
        />
      )}

      {serverSide && (
        <DataTableFooter
          totalRows={totalCount}
          page={currentPage}
          pageSize={serverPageSize}
          totalPages={totalPages}
          onPageChange={(page) => onPageChange?.(page, serverPageSize)}
          onPageSizeChange={handleServerPageSizeChange}
        />
      )}
    </div>
  );
}
