"use client";

/**
 * Student Photo Signature Report —
 * Angular `reports/student-admission-reports/student-photo-signature-report` parity.
 * Filters: `getAllRecords/s_get_collegewisedetails_bycode` (`in_flag=clg_filters`).
 * Report: `getAllRecords/s_get_std_sub_report` (`in_flag=std_photo_sign_path`).
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  academicYearOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  collegeOption,
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getFeeMasterCollegeFilters,
  getStudentPhotoSignatureReport,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Student Photo Signature Report";
const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

type PhotoSignRow = {
  __rowKey: string;
  hallticketNumber: string;
  studentName: string;
  photoUrl: string;
  signatureUrl: string;
};

function toImageUrl(path: unknown): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT_PHOTO;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${raw.replace(/^\/+/, "")}` : DEFAULT_STUDENT_PHOTO;
}

function mapRow(row: AnyRow, i: number): PhotoSignRow {
  return {
    __rowKey: String(
      row.hallticket_number ?? row.hallTicketNumber ?? `row-${i}`,
    ),
    hallticketNumber: String(
      row.hallticket_number ?? row.hallTicketNumber ?? "",
    ),
    studentName: String(row.student_name ?? row.studentName ?? ""),
    photoUrl: toImageUrl(row.student_photo_path ?? row.studentPhotoPath),
    signatureUrl: toImageUrl(
      row.student_signature_path ?? row.studentSignaturePath,
    ),
  };
}

function imageRenderer(alt: string) {
  return (p: ICellRendererParams<PhotoSignRow>) => {
    const src = alt === "Photo" ? p.data?.photoUrl : p.data?.signatureUrl;
    if (!src) return null;
    return (
      <img
        src={src}
        alt={alt}
        className="mx-auto my-1 h-[60px] w-[60px] rounded object-cover"
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.endsWith("default_Student.png")) {
            img.src = DEFAULT_STUDENT_PHOTO;
          }
        }}
      />
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PhotoSignRow>,
  hallTicket: {
    field: "hallticketNumber",
    headerName: "Hall Ticket Number",
    minWidth: 160,
  } as ColDef<PhotoSignRow>,
  name: {
    field: "studentName",
    headerName: "Student Name",
    minWidth: 180,
  } as ColDef<PhotoSignRow>,
  photo: {
    headerName: "Photo",
    minWidth: 100,
    width: 100,
    flex: 0,
    sortable: false,
    filter: false,
    cellRenderer: imageRenderer("Photo"),
  } as ColDef<PhotoSignRow>,
  signature: {
    headerName: "Signature",
    minWidth: 120,
    width: 130,
    flex: 0,
    sortable: false,
    filter: false,
    cellRenderer: imageRenderer("Signature"),
  } as ColDef<PhotoSignRow>,
};

export default function StudentPhotoSignatureReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [ayAutoSelected, setAyAutoSelected] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);

  const [rows, setRows] = useState<PhotoSignRow[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const filtersQuery = useQuery({
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );
  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  );

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]!.value);
  }, [collegeId, collegeOptions]);

  const ayRows = useMemo(
    () =>
      filterAcademicYears(academicData, Number(collegeId || 0), filtersData),
    [academicData, collegeId, filtersData],
  );
  const ayOptions = useMemo(() => ayRows.map(academicYearOption), [ayRows]);

  // Angular: auto-select the current academic year (`is_curr_ay`) once colleges load.
  useEffect(() => {
    if (ayAutoSelected || ayRows.length === 0) return;
    const current =
      ayRows.find((r) => Number(r.is_curr_ay ?? r.isCurrAy ?? 0) === 1) ??
      ayRows[0];
    if (current) {
      setAcademicYearId(
        String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
      );
      setAyAutoSelected(true);
    }
  }, [ayAutoSelected, ayRows]);

  const courseOptions = useMemo(
    () => filterCourses(filtersData, Number(collegeId || 0)).map(courseOption),
    [filtersData, collegeId],
  );
  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroups(
        filtersData,
        Number(collegeId || 0),
        Number(courseId || 0),
      ).map(courseGroupOption),
    [filtersData, collegeId, courseId],
  );
  const courseYearOptions = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        Number(collegeId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ).map(courseYearOption),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  const clearResults = () => {
    setRows([]);
    setShowTable(false);
  };

  const columnDefs = useMemo<ColDef<PhotoSignRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hallTicket,
      COL_DEFS.name,
      COL_DEFS.photo,
      COL_DEFS.signature,
    ],
    [],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const cr = Number(courseId || 0);
    const cg = Number(courseGroupId || 0);
    const cy = Number(courseYearId || 0);
    if (!cid) return toastInfo("College is required");
    if (!ay) return toastInfo("Academic Year is required");
    if (!cr) return toastInfo("Course is required");
    if (!cg) return toastInfo("Course Group is required");
    if (!cy) return toastInfo("Course Year is required");

    setLoadingList(true);
    clearResults();
    try {
      const raw = await getStudentPhotoSignatureReport({
        collegeId: cid,
        courseId: cr,
        courseGroupId: cg,
        courseYearId: cy,
        academicYearId: ay,
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw.map(mapRow));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;"><div style="font-size:16px;font-weight:600;">${escapeHtml(REPORT_TITLE)}</div></div>`;
    const tableHtml = `<table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>S.No</th><th>Hall Ticket Number</th><th>Student Name</th><th>Photo</th><th>Signature</th></tr></thead><tbody>${rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(r.hallticketNumber)}</td><td>${escapeHtml(r.studentName)}</td><td><img src="${escapeHtml(r.photoUrl)}" width="60" height="60"/></td><td><img src="${escapeHtml(r.signatureUrl)}" width="80" height="40"/></td></tr>`,
      )
      .join("")}</tbody></table>`;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  };

  const printReport = () => {
    if (rows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const tableHtml = `<table><thead><tr><th>S.No</th><th>Hall Ticket Number</th><th>Student Name</th><th>Photo</th><th>Signature</th></tr></thead><tbody>${rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(r.hallticketNumber)}</td><td>${escapeHtml(r.studentName)}</td>
          <td><img src="${escapeHtml(r.photoUrl)}" width="60" height="60" onerror="this.onerror=null;this.src='${DEFAULT_STUDENT_PHOTO}'"/></td>
          <td><img src="${escapeHtml(r.signatureUrl)}" width="80" height="40" onerror="this.onerror=null;this.src='${DEFAULT_STUDENT_PHOTO}'"/></td></tr>`,
      )
      .join("")}</tbody></table>`;
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.title{font-size:20px;font-weight:600;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:6px 5px;text-align:center}
th{background:#f2f2f2}
</style></head><body>
<p class="title">${escapeHtml(REPORT_TITLE)}</p>
${tableHtml}
</body></html>`);
  };

  return (
    <FilteredListPage<PhotoSignRow>
      title={REPORT_TITLE}
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-2">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId(null);
                setAyAutoSelected(false);
                setCourseId(null);
                setCourseGroupId(null);
                setCourseYearId(null);
                clearResults();
              }}
              options={collegeOptions}
              isLoading={filtersQuery.isLoading}
            />
          </div>

          <div className="md:col-span-2">
            <Select
              label="Course"
              required
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                setCourseGroupId(null);
                setCourseYearId(null);
                clearResults();
              }}
              options={courseOptions}
              disabled={!academicYearId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course Group"
              required
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v);
                setCourseYearId(null);
                clearResults();
              }}
              options={courseGroupOptions}
              disabled={!courseId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course Year"
              required
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v);
                clearResults();
              }}
              options={courseYearOptions}
              disabled={!courseGroupId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v);
                clearResults();
              }}
              options={ayOptions}
              disabled={!collegeId}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      rowHeight={80}
      getRowId={(p) => p.data?.__rowKey ?? ""}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={printReport}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
