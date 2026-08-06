"use client";

/**
 * Angular `feedback/feedback-status-report` — Feedback Status Report.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, FileText } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { Button } from "@/components/ui/button";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getFeedbackStatusReportRows,
  listAcademicYearsByUniversity,
  listActiveCollegesForGeneralSettings,
  type FeedbackStatusReportRow,
} from "@/services";

/** Full grid columns — used by Excel Export (matches on-screen table). */
const EXCEL_EXPORT_COLUMNS = [
  { key: "id", header: "S.No" },
  { key: "survey_name", header: "Survey" },
  { key: "student_name", header: "Student" },
  { key: "roll_number", header: "Roll No" },
  { key: "Emp_Name", header: "Employee" },
  { key: "emp_number", header: "Emp. No" },
  { key: "Feedback_form_Status", header: "Status" },
] as const;

/**
 * Angular Syncfusion PDF Export columns (feedback-status-report PDF):
 * S.No, Survey, Student, Roll No, Employee — no Emp. No / Status.
 */
const PDF_EXPORT_COLUMNS = [
  { key: "id", header: "S.No" },
  { key: "survey_name", header: "Survey" },
  { key: "student_name", header: "Student" },
  { key: "roll_number", header: "Roll No" },
  { key: "Emp_Name", header: "Employee" },
] as const;

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown) => String(v ?? "").trim();

const COL_DEFS = {
  siNo: {
    field: "id",
    headerName: "S.No",
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<FeedbackStatusReportRow>,
  survey: {
    field: "survey_name",
    headerName: "Survey",
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  student: {
    field: "student_name",
    headerName: "Student",
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  rollNo: {
    field: "roll_number",
    headerName: "Roll No",
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
  employee: {
    field: "Emp_Name",
    headerName: "Employee",
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  empNo: {
    field: "emp_number",
    headerName: "Emp. No",
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
  status: {
    field: "Feedback_form_Status",
    headerName: "Status",
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
};

export default function FeedbackStatusReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backPath = searchParams.get("path") || "dashboard";

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [rows, setRows] = useState<FeedbackStatusReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const collegeLogo = useCollegeLogo(collegeId ? n(collegeId) : null);

  const collegesQuery = useQuery({
    queryKey: QK.feedbackStatusReport.colleges(),
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const colleges = collegesQuery.data ?? [];

  useEffect(() => {
    if (collegeId || colleges.length === 0) return;
    setCollegeId(String(colleges[0].collegeId));
  }, [colleges, collegeId]);

  const universityId = useMemo(() => {
    const c = colleges.find((x) => n(x.collegeId) === n(collegeId));
    return n(c?.universityId);
  }, [colleges, collegeId]);

  const academicYearsQuery = useQuery({
    queryKey: QK.feedbackStatusReport.academicYears(universityId),
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  });

  const academicYears = academicYearsQuery.data ?? [];

  useEffect(() => {
    setAcademicYearId(null);
    setRows([]);
    setHasFetched(false);
  }, [collegeId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const selectedCollegeName = useMemo(() => {
    const c = colleges.find((x) => n(x.collegeId) === n(collegeId));
    return s(c?.collegeName) || s(c?.collegeCode) || "College";
  }, [colleges, collegeId]);

  const ayOptions = useMemo(
    () =>
      academicYears.map((a) => ({
        value: String(n(a.academicYearId ?? a.fk_academic_year_id)),
        label:
          s(a.academicYear ?? a.academic_year) ||
          String(n(a.academicYearId ?? a.fk_academic_year_id)),
      })),
    [academicYears],
  );

  const columnDefs = useMemo<ColDef<FeedbackStatusReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.survey,
      COL_DEFS.student,
      COL_DEFS.rollNo,
      COL_DEFS.employee,
      COL_DEFS.empNo,
      COL_DEFS.status,
    ],
    [],
  );

  const canGetList = Boolean(collegeId) && Boolean(academicYearId);

  async function handleGetList() {
    if (!canGetList) {
      toastError("Please fill all required filters.");
      return;
    }
    setLoadingList(true);
    setHasFetched(true);
    try {
      const list = await getFeedbackStatusReportRows({
        collegeId: n(collegeId),
        academicYearId: n(academicYearId),
      });
      setRows(list);
      if (list.length === 0) toastSuccess("No records found.");
    } catch (e) {
      setRows([]);
      toastError(getErrorMessage(e) || "Failed to load feedback status");
    } finally {
      setLoadingList(false);
    }
  }

  function handleBack() {
    const path = backPath.startsWith("/") ? backPath : `/${backPath}`;
    router.push(path);
  }

  const showTable = hasFetched && rows.length > 0;

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        survey_name: row.survey_name,
        student_name: row.student_name,
        roll_number: row.roll_number,
        Emp_Name: row.Emp_Name,
        emp_number: row.emp_number,
        Feedback_form_Status: row.Feedback_form_Status,
      })),
    [rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    // Angular getExcelExportProperties: college title + "( Enquirers Report )"
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:20px;font-weight:bold;color:#466884;">${escapeHtml(selectedCollegeName)}</div>
      <div style="font-size:16px;font-weight:bold;color:#C67878;margin-top:8px;">( Enquirers Report )</div>
    </div>`;
    const tableHtml = buildHtmlTable(
      EXCEL_EXPORT_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel("Enquirers Report.xls", tableHtml, headerHtml);
  }, [exportRows, selectedCollegeName]);

  const handlePdfExport = useCallback(async () => {
    if (exportRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    try {
      // Angular Syncfusion PDF: logo + college + "( Enquirers Report )" + 5 columns.
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
      try {
        const res = await fetch(collegeLogo);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const isPng =
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47;
          logoImage = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
        }
      } catch {
        logoImage = null;
      }

      // Angular header line x2:685 → landscape-friendly page
      const pageWidth = 842;
      const pageHeight = 595;
      const marginX = 36;
      const marginTop = 24;
      const marginBottom = 28;
      const titleSize = 16;
      const subtitleSize = 12;
      const cellSize = 9;
      const rowH = 18;
      // Angular PDF columns only
      const colWidths = [50, 200, 180, 140, 160];
      const tableLeft = marginX;

      const truncate = (text: string, maxWidth: number, useBold = false) => {
        const f = useBold ? fontBold : font;
        let t = text;
        if (f.widthOfTextAtSize(t, cellSize) <= maxWidth) return t;
        while (
          t.length > 0 &&
          f.widthOfTextAtSize(`${t}…`, cellSize) > maxWidth
        ) {
          t = t.slice(0, -1);
        }
        return t ? `${t}…` : "";
      };

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - marginTop;

      const drawHeaderBlock = () => {
        const logoSize = 56;
        const textX = marginX + (logoImage ? logoSize + 16 : 0);
        if (logoImage) {
          page.drawImage(logoImage, {
            x: marginX,
            y: y - logoSize,
            width: logoSize,
            height: logoSize,
          });
        }
        page.drawText(selectedCollegeName, {
          x: textX,
          y: y - 18,
          size: titleSize,
          font: fontBold,
          color: rgb(0.275, 0.408, 0.518), // #466884
        });
        page.drawText("( Enquirers Report )", {
          x: textX,
          y: y - 38,
          size: subtitleSize,
          font,
          color: rgb(0, 0, 0),
        });
        y -= logoImage ? logoSize + 10 : 52;
        page.drawLine({
          start: { x: marginX, y },
          end: { x: pageWidth - marginX, y },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
        y -= 14;
      };

      const drawTableHeader = () => {
        let x = tableLeft;
        for (let i = 0; i < PDF_EXPORT_COLUMNS.length; i++) {
          const w = colWidths[i];
          page.drawRectangle({
            x,
            y: y - rowH,
            width: w,
            height: rowH,
            borderColor: rgb(0.55, 0.55, 0.55),
            borderWidth: 0.6,
          });
          page.drawText(truncate(PDF_EXPORT_COLUMNS[i].header, w - 6, true), {
            x: x + 3,
            y: y - rowH + 5,
            size: cellSize,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });
          x += w;
        }
        y -= rowH;
      };

      const ensureSpace = (needed: number) => {
        if (y - needed < marginBottom) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - marginTop;
          drawHeaderBlock();
          drawTableHeader();
        }
      };

      drawHeaderBlock();
      drawTableHeader();

      for (const row of exportRows) {
        ensureSpace(rowH);
        let x = tableLeft;
        for (let i = 0; i < PDF_EXPORT_COLUMNS.length; i++) {
          const w = colWidths[i];
          const key = PDF_EXPORT_COLUMNS[i].key;
          const raw = String((row as Record<string, unknown>)[key] ?? "");
          page.drawRectangle({
            x,
            y: y - rowH,
            width: w,
            height: rowH,
            borderColor: rgb(0.55, 0.55, 0.55),
            borderWidth: 0.6,
          });
          page.drawText(truncate(raw, w - 6), {
            x: x + 3,
            y: y - rowH + 5,
            size: cellSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          x += w;
        }
        y -= rowH;
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Enquirers Report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to export PDF");
    }
  }, [collegeLogo, exportRows, selectedCollegeName]);

  return (
    <FilteredListPage
      title="Feedback Status Report"
      filters={
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-2">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={setCollegeId}
              options={collegeOptions}
              placeholder="College"
              isLoading={collegesQuery.isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v);
                setRows([]);
                setHasFetched(false);
              }}
              options={ayOptions}
              placeholder="Academic Year"
              isLoading={academicYearsQuery.isLoading}
              disabled={!collegeId}
            />
          </div>
          <div className="flex gap-2 lg:col-span-3">
            <Button
              type="button"
              className="h-9 flex-1"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || collegesQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
        excelDocumentTitle: selectedCollegeName,
        excelFileName: "Enquirers Report.xls",
        pdfDocumentTitle: `${selectedCollegeName} ( Enquirers Report )`,
      }}
      onExportPdf={() => void handlePdfExport()}
      toolbarLeading={
        showTable ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel Export
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={() => void handlePdfExport()}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              PDF Export
            </Button>
          </div>
        ) : null
      }
    />
  );
}
