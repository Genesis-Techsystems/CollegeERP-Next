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
  type ITooltipParams,
  type RowClickedEvent,
  type FirstDataRenderedEvent,
  type GridSizeChangedEvent,
  type RowDataUpdatedEvent,
  type GridReadyEvent,
} from "ag-grid-community";
import { ChevronDown, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRINTCONFIG } from "@/common/print-config";
import { cn } from "@/lib/utils";
import {
  DataTableFooter,
  PAGE_SIZE_OPTIONS,
  type DataTablePageSize,
} from "./DataTableFooter";
import { DataTableToolbar } from "./DataTableToolbar";
import { exportDataTableAsExcel } from "./exportDataTableExcel";

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableToolbarConfig {
  /** Client-side filter across row values. Default **true**. */
  search?: boolean;
  /**
   * When set, toolbar search only matches these row fields (partial, case-insensitive).
   * When omitted, search walks all string/number values on the row (default).
   */
  searchFields?: string[];
  columnPicker?: boolean;
  exportPdf?: boolean;
  /** Export visible columns as HTML `.xls` (shown as “Excel”). Default **true**. */
  exportExcel?: boolean;
  /** AG Grid per-column header filters. Default **true**. Prefer top-level `columnFilters` prop. */
  columnFilters?: boolean;
  /** Show “Show inactive” checkbox. Default **false**. */
  showInactiveToggle?: boolean;
  searchPlaceholder?: string;
  pdfDocumentTitle?: string;
  /** Title row in the exported `.xls` file. Defaults to table title. */
  excelDocumentTitle?: string;
  /** Download filename for Excel export. Defaults to `{title}.xls`. */
  excelFileName?: string;
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
  /** Optional title above the toolbar */
  title?: string;
  /** Optional subtitle; defaults to filter hint when column filters are on */
  subtitle?: string;
  /** Wrap in a bordered card. Default **true**. */
  bordered?: boolean;
  /**
   * Optional filter fields rendered inside the same card, between title and toolbar
   * (Grade Setup / Room Details pattern).
   */
  filters?: ReactNode;
  /** Optional content rendered directly below filters and above the toolbar. */
  filtersFooter?: ReactNode;
  /** Collapse the filters section. Default true when `filters` is set. */
  filtersCollapsible?: boolean;
  /** Uncontrolled default open when collapsible. Default true. */
  filtersDefaultOpen?: boolean;
  /** Controlled open state when collapsible. */
  filtersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  /** Allow the entire card body to be collapsed from its title. */
  contentCollapsible?: boolean;
  /** Uncontrolled default open state for a collapsible card body. */
  contentDefaultOpen?: boolean;
  rowData: T[];
  columnDefs: ColDef<T>[];
  loading?: boolean;
  /**
   * When true, hide the grid and pagination while there is no row data
   * (title / filters / toolbar stay visible). Default false.
   */
  hideEmptyGrid?: boolean;
  /**
   * When false, hide search toolbar + grid + pagination (filters/title stay).
   * Use after a "Get List" action — Angular `*ngIf="flag"` pattern. Default true.
   */
  resultsVisible?: boolean;
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
  /** Optional right-side panel rendered beside the grid inside the same card. */
  rightRail?: ReactNode;
  /** @deprecated Use toolbar.exportExcel instead */
  exportCsv?: boolean;
  /** Override toolbar Excel export (e.g. custom HTML workbook). */
  onExportExcel?: () => void;
  /** Override toolbar PDF export (e.g. custom iframe print layout). */
  onExportPdf?: () => void;
  onGridApiReady?: (api: GridApi<T>) => void;
  /**
   * AG Grid per-column header filters (filter icon on each column).
   * Default **true** for DataTable and FilteredListPage. Pass `false` to disable.
   * Overrides `toolbar.columnFilters` when both are set.
   */
  columnFilters?: boolean;
  /**
   * When false, columns keep their defined widths/minWidths (horizontal scroll if needed)
   * instead of being squeezed by `sizeColumnsToFit`. Default **true**.
   */
  fitColumnsToWidth?: boolean;
  /** AG Grid row height in pixels. */
  rowHeight?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Full cell text for tooltips; skip custom renderers (badges/actions) and objects. */
function defaultTooltipValueGetter(params: ITooltipParams): string | undefined {
  // Custom renderers (StatusBadge, action buttons) are not plain text; AG Grid's
  // whenTruncated check also does not apply to them — avoid noisy tooltips.
  const colDef = params.colDef;
  if (colDef && "cellRenderer" in colDef && colDef.cellRenderer) {
    return undefined;
  }

  const formatted = params.valueFormatted;
  if (formatted != null && String(formatted).trim() !== "") {
    return String(formatted);
  }

  const value = params.value;
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return undefined;
  if (typeof value === "object") return undefined;
  return String(value);
}

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  minWidth: 70,
  suppressHeaderMenuButton: false,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  tooltipValueGetter: defaultTooltipValueGetter,
  headerTooltipValueGetter: (p) => {
    const name = p.colDef?.headerName;
    return typeof name === "string" && name.trim() !== "" ? name : undefined;
  },
};

/** Wide tables: fixed widths (no flex) so horizontal scroll spans every column. */
function resolveWideColumnDef(def: ColDef): ColDef {
  if (def.flex == null) return def;
  const { flex: _flex, ...rest } = def;
  const width = rest.width ?? rest.minWidth ?? 120;
  return {
    ...rest,
    width,
    minWidth: rest.minWidth ?? width,
  };
}

function computeWideGridHeight(
  rowCount: number,
  pageSize: number,
  rowHeightPx?: number,
): number {
  const rowH = rowHeightPx ?? 40;
  const visibleRows = Math.max(Math.min(rowCount, pageSize), 1);
  const headerH = 96;
  const hScrollBar = 16;
  return headerH + visibleRows * rowH + hScrollBar;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_SEARCH_DEPTH = 8;

/** Skip credential / blob fields so search matches visible account text. */
const SEARCH_SKIP_KEYS = new Set([
  "password",
  "passwordconfirm",
  "passwordhash",
  "passwd",
  "token",
  "accesstoken",
  "refreshtoken",
  "resetpasswordcode",
]);

function collectStrings(
  value: unknown,
  depth: number,
  out: string[],
  seen: WeakSet<object>,
  keyHint?: string,
): void {
  if (depth > MAX_SEARCH_DEPTH) return;
  if (value == null) return;
  if (keyHint && SEARCH_SKIP_KEYS.has(keyHint.toLowerCase())) return;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") {
    out.push(String(value));
    return;
  }
  if (t !== "object") return;
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) out.push(value.toISOString());
    return;
  }
  if (seen.has(value as object)) return;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out, seen);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    collectStrings(v, depth + 1, out, seen, k);
  }
}

function rowMatchesSearch<T>(
  row: T,
  q: string,
  searchFields?: string[],
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  if (searchFields && searchFields.length > 0) {
    const record = row as Record<string, unknown>;
    return searchFields.some((field) => {
      const value = record?.[field];
      if (value == null) return false;
      return String(value).toLowerCase().includes(needle);
    });
  }

  const hay: string[] = [];
  collectStrings(row, 0, hay, new WeakSet());
  // Per-field match (userName, mobile, …)
  if (hay.some((s) => s.toLowerCase().includes(needle))) return true;
  // Joined match so "first last" finds separate firstName / lastName values
  return hay.join(" ").toLowerCase().includes(needle);
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
      searchFields: undefined as string[] | undefined,
      columnPicker: false,
      exportPdf: false,
      exportExcel: false,
      columnFilters: false,
      showInactiveToggle: false,
      searchPlaceholder: "",
      pdfDocumentTitle: undefined as string | undefined,
      excelDocumentTitle: undefined as string | undefined,
      excelFileName: undefined as string | undefined,
      lockColumnIds: [] as string[],
    };
  }
  const t: DataTableToolbarConfig =
    toolbar === true || toolbar === undefined ? {} : toolbar;
  return {
    show: true,
    search: t.search !== false,
    searchFields: t.searchFields,
    columnPicker: t.columnPicker !== false,
    exportPdf: t.exportPdf !== false,
    exportExcel: t.exportExcel !== false,
    columnFilters: t.columnFilters !== false,
    showInactiveToggle: t.showInactiveToggle === true,
    searchPlaceholder: t.searchPlaceholder ?? "Search…",
    pdfDocumentTitle: t.pdfDocumentTitle,
    excelDocumentTitle: t.excelDocumentTitle,
    excelFileName: t.excelFileName,
    lockColumnIds: t.lockColumnIds ?? [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  title,
  subtitle,
  bordered = true,
  filters,
  filtersFooter,
  filtersCollapsible = true,
  filtersDefaultOpen = true,
  filtersOpen: filtersOpenProp,
  onFiltersOpenChange,
  contentCollapsible = false,
  contentDefaultOpen = true,
  rowData,
  columnDefs,
  loading = false,
  hideEmptyGrid = false,
  resultsVisible = true,
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
  rightRail,
  exportCsv = false,
  onExportExcel: onExportExcelProp,
  onExportPdf: onExportPdfProp,
  onGridApiReady,
  columnFilters: columnFiltersProp = true,
  fitColumnsToWidth = true,
  rowHeight,
}: DataTableProps<T>) {
  const tb = useMemo(() => resolveToolbar(toolbarProp), [toolbarProp]);
  const enableColumnFilters = columnFiltersProp;

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

  const [filtersInternalOpen, setFiltersInternalOpen] =
    useState(filtersDefaultOpen);
  const [contentOpen, setContentOpen] = useState(contentDefaultOpen);
  const filtersOpen = filters
    ? filtersCollapsible
      ? (filtersOpenProp ?? filtersInternalOpen)
      : true
    : false;

  function setFiltersOpen(next: boolean) {
    onFiltersOpenChange?.(next);
    if (filtersOpenProp === undefined) setFiltersInternalOpen(next);
  }

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
    return inactiveFilteredData.filter((r) =>
      rowMatchesSearch(r, searchQuery, tb.searchFields),
    );
  }, [inactiveFilteredData, tb.show, tb.search, tb.searchFields, searchQuery]);

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
      ...(enableColumnFilters
        ? { filter: "agTextColumnFilter", floatingFilter: false }
        : {}),
    }),
    [enableColumnFilters],
  );

  const isWideTable = !fitColumnsToWidth;

  const resolvedColumnDefs = useMemo(
    () =>
      columnDefs.map((def) => {
        const shaped = isWideTable ? resolveWideColumnDef(def) : def;
        if (isActionsColumn(shaped)) {
          return withCellClass(
            {
              ...shaped,
              filter: false,
              sortable: false,
              tooltipValueGetter: () => undefined,
            },
            "app-cell-actions",
          );
        }
        return withCellClass(shaped, "app-cell-ellipsis");
      }),
    [columnDefs, isWideTable],
  );

  const resolvedSubtitle =
    subtitle ??
    (resolvedTitle && enableColumnFilters && tb.show ? FILTER_HINT : undefined);

  const isAutoHeight =
    !isWideTable && (height === "auto" || pagination || serverSide);

  const dataForPaging = clientPaginationEnabled ? filteredRowData : rowData;
  const clientTotalRows = dataForPaging.length;
  const clientTotalPages = Math.max(
    1,
    Math.ceil(clientTotalRows / clientPageSize),
  );
  const safePage = Math.min(clientPage, clientTotalPages - 1);

  const pagedRowData = useMemo(() => {
    // Server-side pages still get client search ("Search this page…") on the loaded rows.
    if (serverSide) return filteredRowData;
    if (!clientPaginationEnabled) return filteredRowData;
    const start = safePage * clientPageSize;
    return filteredRowData.slice(start, start + clientPageSize);
  }, [
    filteredRowData,
    clientPaginationEnabled,
    serverSide,
    safePage,
    clientPageSize,
  ]);

  const resolvedGridHeight = useMemo((): number | string | undefined => {
    if (isAutoHeight) return undefined;
    if (height !== "auto" && height !== undefined) return height;
    if (isWideTable) {
      const pageSizeForHeight = serverSide ? serverPageSize : clientPageSize;
      return computeWideGridHeight(
        pagedRowData.length,
        pageSizeForHeight,
        rowHeight,
      );
    }
    return undefined;
  }, [
    isAutoHeight,
    height,
    isWideTable,
    pagedRowData.length,
    clientPageSize,
    serverPageSize,
    serverSide,
    rowHeight,
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

  const handleExportExcelCallback = useCallback(() => {
    const api = gridRef.current?.api ?? gridApi;
    if (!api) return;
    const exportTitle = tb.excelDocumentTitle ?? resolvedTitle;
    const exportName =
      tb.excelFileName ??
      `${(exportTitle || "Export").replace(/[<>:"/\\|?*]+/g, "_")}.xls`;
    exportDataTableAsExcel({
      api,
      rows: filteredRowData,
      fileName: exportName,
      title: exportTitle,
    });
  }, [
    gridApi,
    filteredRowData,
    tb.excelDocumentTitle,
    tb.excelFileName,
    resolvedTitle,
  ]);

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
  const suppressGrid =
    !resultsVisible ||
    (hideEmptyGrid && !loading && (!rowData || rowData.length === 0));

  const showMainToolbar =
    resultsVisible &&
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
          ? cn(
              "app-data-table app-data-table-card flex flex-col",
              isWideTable && "app-data-table-wide",
            )
          : cn(
              "app-data-table flex flex-col",
              isWideTable && "app-data-table-wide",
            )
      }
    >
      {(resolvedTitle || resolvedSubtitle || filters) && (
        <div
          className={cn(
            "app-data-table-heading px-5",
            filtersOpen ? "pt-5 pb-0" : "pt-5 pb-3",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {resolvedTitle ? (
                contentCollapsible ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => setContentOpen((open) => !open)}
                    aria-expanded={contentOpen}
                    aria-label={`Toggle ${resolvedTitle}`}
                  >
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {resolvedTitle}
                    </h2>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        contentOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                ) : filters && filtersCollapsible ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    aria-expanded={filtersOpen}
                    aria-label="Toggle filters"
                  >
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {resolvedTitle}
                    </h2>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                      <Filter className="h-3.5 w-3.5" aria-hidden />
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-300",
                          filtersOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>
                ) : (
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {resolvedTitle}
                  </h2>
                )
              ) : null}
              {resolvedSubtitle ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {resolvedSubtitle}
                </p>
              ) : null}
            </div>
            {filters && filtersCollapsible && !resolvedTitle ? (
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground"
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
                aria-label="Toggle filters"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300",
                    filtersOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          !contentCollapsible || contentOpen
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0",
            isWideTable
              ? "overflow-x-auto overflow-y-visible"
              : "overflow-hidden",
          )}
        >
          {filters ? (
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="global-filter-bar__inner px-5 pb-1 [&_.global-filter-bar__inner]:!pt-0">
                  {filters}
                </div>
              </div>
            </div>
          ) : null}

          {filtersFooter ? (
            <div className="px-5 pb-3 pt-2">{filtersFooter}</div>
          ) : null}

          {resultsVisible &&
            (showMainToolbar || (!showMainToolbar && exportCsv)) && (
              <div className="app-data-table-toolbar-wrap bg-card px-5 pb-3 pt-2">
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
                    onExportExcel={
                      onExportExcelProp ?? handleExportExcelCallback
                    }
                    exportPdfEnabled={tb.exportPdf}
                    onExportPdf={onExportPdfProp ?? handleExportPdf}
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
                      onClick={handleExportExcelCallback}
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
              rightRail &&
                "grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start",
            )}
          >
            <div className={cn("min-w-0", rightRail && "lg:col-span-8")}>
              {!suppressGrid ? (
                <div
                  className={cn(
                    "ag-theme-quartz",
                    isGridEmpty && "app-data-table-grid-empty",
                    isWideTable && "app-data-table-grid-wide",
                  )}
                  style={
                    isAutoHeight
                      ? undefined
                      : { height: resolvedGridHeight ?? height }
                  }
                >
                  <AgGridReact<T>
                    ref={gridRef}
                    context={{ __rowNumberOffset: rowNumberOffset }}
                    rowData={pagedRowData}
                    columnDefs={resolvedColumnDefs}
                    defaultColDef={defaultColDef}
                    domLayout={isAutoHeight ? "autoHeight" : undefined}
                    rowHeight={rowHeight}
                    loading={loading}
                    suppressCellFocus
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
                    tooltipShowMode="whenTruncated"
                    tooltipShowDelay={400}
                  />
                </div>
              ) : null}
            </div>
            {rightRail ? (
              <div className="min-w-0 lg:col-span-4">{rightRail}</div>
            ) : null}
          </div>

          {clientPaginationEnabled && !suppressGrid && (
            <DataTableFooter
              totalRows={clientTotalRows}
              page={safePage}
              pageSize={clientPageSize}
              totalPages={clientTotalPages}
              onPageChange={setClientPage}
              onPageSizeChange={handleClientPageSizeChange}
            />
          )}

          {serverSide && !suppressGrid && (
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
      </div>
    </div>
  );
}
