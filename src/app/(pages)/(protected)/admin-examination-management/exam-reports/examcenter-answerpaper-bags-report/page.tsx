"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getAnswerPaperBagsReportExamBags,
  getAnswerPaperBagsReportList,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const EXPORT_COLS = [
  { key: "si", header: "SL No." },
  { key: "bagSerialNo", header: "Bag Serial No" },
  { key: "student", header: "Student" },
  { key: "subject", header: "Subject" },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bagId(row: AnyRow): number {
  return num(row.univExamBagId ?? row.univ_exam_bag_id);
}

function studentLabel(row: AnyRow): string {
  const name = txt(row.firstName ?? row.first_name);
  const ht = txt(row.hallticketNo ?? row.hallticket_no ?? row.hallticketNumber);
  if (name && ht) return `${name} (${ht})`;
  return name || ht;
}

function subjectLabel(row: AnyRow): string {
  const name = txt(row.subjectName ?? row.subject_name);
  const code = txt(row.subjectCode ?? row.subject_code);
  if (name && code) return `${name} (${code})`;
  return name || code;
}

function studentRenderer(p: ICellRendererParams<AnyRow>) {
  const name = txt(p.data?.firstName ?? p.data?.first_name);
  const ht = txt(
    p.data?.hallticketNo ??
      p.data?.hallticket_no ??
      p.data?.hallticketNumber,
  );
  if (!name && !ht) return null;
  return (
    <span>
      {name}
      {ht ? <span className="text-blue-700"> ({ht})</span> : null}
    </span>
  );
}

function subjectRenderer(p: ICellRendererParams<AnyRow>) {
  const name = txt(p.data?.subjectName ?? p.data?.subject_name);
  const code = txt(p.data?.subjectCode ?? p.data?.subject_code);
  if (!name && !code) return null;
  return (
    <span>
      {name}
      {code ? <span className="text-blue-700"> ({code})</span> : null}
    </span>
  );
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    bagSerialNo: txt(row.bagSerialNo ?? row.bag_serial_no),
    student: studentLabel(row),
    subject: subjectLabel(row),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Answer Paper Bags Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Answer Paper Bags Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;

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

export default function ExamcenterAnswerpaperBagsReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [examBags, setExamBags] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [univExamBagId, setUnivExamBagId] = useState("");

  const selectedBag = useMemo(
    () => examBags.find((b) => bagId(b) === Number(univExamBagId)),
    [examBags, univExamBagId],
  );

  const bagSerialNo = txt(
    selectedBag?.bagSerialNo ?? selectedBag?.bag_serial_no,
  );

  useEffect(() => {
    async function loadBags() {
      setLoadingFilters(true);
      try {
        const list = await getAnswerPaperBagsReportExamBags();
        setExamBags(list);
        // Angular does not auto-select first bag
      } catch (e) {
        toastError(e, "Failed to load exam bags");
        setExamBags([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBags();
  }, []);

  async function onGetList() {
    if (!univExamBagId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getAnswerPaperBagsReportList({
        univExamBagId: Number(univExamBagId),
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Answer Paper Bags Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Answer Paper Bags Report - ${escapeHtml(bagSerialNo)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SL No.",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Bag Serial No",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.bagSerialNo ?? p.data?.bag_serial_no),
      },
      {
        headerName: "Student",
        minWidth: 200,
        cellRenderer: studentRenderer,
      },
      {
        headerName: "Subject",
        minWidth: 200,
        cellRenderer: subjectRenderer,
      },
    ],
    [],
  );

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Exam Bags *">
        <Select
          value={univExamBagId || undefined}
          onChange={(v) => {
            setUnivExamBagId(v ?? "");
            setRows([]);
          }}
          isLoading={loadingFilters}
          options={examBags.map((b) => ({
            value: String(bagId(b)),
            label: txt(b.bagSerialNo ?? b.bag_serial_no),
          }))}
          placeholder="Exam Bags"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField
        label=""
        className="global-filter-field--shrink global-filter-field--action"
      >
        <Button
          type="button"
          onClick={() => void onGetList()}
          disabled={loadingList}
          className="h-[30px] px-3 text-[12px]"
        >
          Get List
        </Button>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Answer Paper Bags Report - ${bagSerialNo}`
          : "Answer Paper Bags Report"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, bagSerialNo)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
