"use client";

/**
 * Student Count Report —
 * Angular `reports/student-admission-reports/studentcount-drilldown-report` parity.
 * Route alias: student-drilldown-report
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { ChevronRight, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getFeeMasterCollegeFilters,
  getStudentCountDrilldown,
  listOrganizations,
} from "@/services";

type AnyRow = Record<string, unknown>;

function isDefaultLogoUrl(url: string): boolean {
  return /default_logo\.png/i.test(url);
}

function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return origin ? `${origin}${raw}` : raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  return fallback;
}

async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return abs;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? abs));
      reader.onerror = () => resolve(abs);
      reader.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

type DrillStep = {
  id: number;
  name: string;
  flag: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  detailName: string;
  detailValue: string;
};

type Position =
  | ""
  | "course_code"
  | "group_code"
  | "course_year_code"
  | "student_name";

type DrillRow = AnyRow & {
  __rowKey: string;
  varaiableName: string;
  varaiableValue: string;
  Total_Students?: string | number;
  gender?: string;
  father_name?: string;
  date_of_birth?: string;
  student_quota?: string;
  scholarship_type?: string;
};

const AGG_EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "expand", header: "Expand" },
  { key: "varaiableName", header: "" },
  { key: "varaiableValue", header: "" },
  { key: "Total_Students", header: "Total Students" },
];

/** Angular print table — no Expand column. */
const AGG_PRINT_COLUMNS: { key: string; header: string }[] = [
  { key: "varaiableName", header: "" },
  { key: "varaiableValue", header: "" },
  { key: "Total_Students", header: "Total Students" },
];

const STUDENT_EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "expand", header: "Expand" },
  { key: "varaiableName", header: "" },
  { key: "varaiableValue", header: "" },
  { key: "gender", header: "Gender" },
  { key: "father_name", header: "Father Name" },
  { key: "date_of_birth", header: "Date Of Birth" },
  { key: "student_quota", header: "Quota" },
  { key: "scholarship_type", header: "Category" },
];

const STUDENT_PRINT_COLUMNS: { key: string; header: string }[] = [
  { key: "varaiableName", header: "" },
  { key: "varaiableValue", header: "" },
  { key: "gender", header: "Gender" },
  { key: "father_name", header: "Father Name" },
  { key: "date_of_birth", header: "Date Of Birth" },
  { key: "student_quota", header: "Quota" },
  { key: "scholarship_type", header: "Category" },
];

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function formatDob(value: unknown): string {
  if (value == null || String(value).trim() === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

function uniqueAcademicYears(academicData: FilterRow[]): FilterRow[] {
  const seen = new Set<string>();
  const out: FilterRow[] = [];
  for (const r of academicData) {
    const ay = pickText(r, ["academic_year", "academicYear"]).trim();
    if (!ay || seen.has(ay)) continue;
    seen.add(ay);
    out.push(r);
  }
  return out.sort((a, b) => {
    const curr =
      Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
      Number(a.is_curr_ay ?? a.isCurrAy ?? 0);
    if (curr !== 0) return curr;
    return (
      Number.parseInt(pickText(b, ["academic_year", "academicYear"]), 10) -
      Number.parseInt(pickText(a, ["academic_year", "academicYear"]), 10)
    );
  });
}

function makeExpandRenderer(
  onExpand: (row: DrillRow) => void,
  clickable: boolean,
) {
  return (p: ICellRendererParams<DrillRow>) => {
    if (!clickable || !p.data) {
      return <span className="text-muted-foreground">&gt;</span>;
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 font-semibold"
        onClick={() => onExpand(p.data!)}
      >
        &gt;
      </Button>
    );
  };
}

export default function StudentCountDrilldownReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [academicYear, setAcademicYear] = useState<string>("");
  const [ayReady, setAyReady] = useState(false);
  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [position, setPosition] = useState<Position>("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const filtersQuery = useQuery({
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  // Angular: Logo = organization.logoPath, display name = organization.orgName
  const orgsQuery = useQuery({
    queryKey: ["organizations", "studentcount-drilldown-print"],
    queryFn: listOrganizations,
    enabled: orgId > 0,
    staleTime: 5 * 60_000,
  });

  const orgPrintMeta = useMemo(() => {
    const org =
      (orgsQuery.data ?? []).find((o) => Number(o.organizationId) === orgId) ??
      null;
    return {
      orgName: org?.orgName?.trim() || "",
      logoPath: org?.logoPath?.trim() || "",
    };
  }, [orgsQuery.data, orgId]);

  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  );

  const ayOptions = useMemo(() => {
    const years = uniqueAcademicYears(academicData).map((r) => {
      const label = pickText(r, ["academic_year", "academicYear"]);
      return { value: label, label };
    });
    return [{ value: "", label: "All" }, ...years];
  }, [academicData]);

  useEffect(() => {
    if (ayReady || filtersQuery.isLoading || ayOptions.length <= 1) return;
    const current =
      uniqueAcademicYears(academicData).find(
        (r) => Number(r.is_curr_ay ?? r.isCurrAy ?? 0) === 1,
      ) ?? uniqueAcademicYears(academicData)[0];
    const ay = current
      ? pickText(current, ["academic_year", "academicYear"])
      : "";
    setAcademicYear(ay);
    setAyReady(true);
  }, [academicData, ayOptions.length, ayReady, filtersQuery.isLoading]);

  const loadLevel = useCallback(
    async (params: {
      flag: string;
      collegeId?: number;
      courseId?: number;
      courseGroupId?: number;
      courseYearId?: number;
      detailName: string;
      detailValue: string;
    }) => {
      setLoading(true);
      setRows([]);
      setGrandTotal(0);
      try {
        const raw = await getStudentCountDrilldown({
          flag: params.flag,
          collegeId: params.collegeId ?? 0,
          academicYear: academicYear ?? "",
          courseId: params.courseId ?? 0,
          courseGroupId: params.courseGroupId ?? 0,
          courseYearId: params.courseYearId ?? 0,
          employeeId: empId,
        });
        if (raw.length === 0) {
          // Angular keeps the drill path + empty table + Back/Excel/Print;
          // snotify success: "No Records(s) found."
          setRows([]);
          setGrandTotal(0);
          toastSuccess("No Records(s) found.");
          return;
        }
        let total = 0;
        const shaped = raw.map((row) => {
          const labelField = params.detailValue;
          const value =
            params.flag === "std_details_students"
              ? `${txt(row[labelField])} (${txt(row.hallticket_number)})`
              : txt(row[labelField]);
          const count = Number(row.Total_Students ?? 0);
          if (Number.isFinite(count)) total += count;
          return {
            ...row,
            varaiableName: params.detailName,
            varaiableValue: value,
          };
        });
        setRows(shaped);
        setGrandTotal(total);
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [academicYear, empId],
  );

  useEffect(() => {
    if (!ayReady) return;
    setSteps([]);
    setPosition("");
    void loadLevel({
      flag: "std_details_college",
      detailName: "College",
      detailValue: "college_code",
    });
  }, [academicYear, ayReady, loadLevel]);

  const expandRow = useCallback(
    (row: AnyRow) => {
      if (position === "student_name") return;

      if (position === "") {
        const name = txt(row.varaiableValue);
        const collegeId = pickNum(row, ["fk_college_id", "collegeId"]);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "std_details_course",
            collegeId,
            courseId: 0,
            courseGroupId: 0,
            courseYearId: 0,
            detailName: "Course",
            detailValue: "course_code",
          },
        ]);
        setPosition("course_code");
        void loadLevel({
          flag: "std_details_course",
          collegeId,
          detailName: "Course",
          detailValue: "course_code",
        });
        return;
      }

      if (position === "course_code") {
        const name = txt(row.varaiableValue);
        const collegeId = pickNum(row, ["fk_college_id", "collegeId"]);
        const courseId = pickNum(row, ["fk_course_id", "courseId"]);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "std_details_course_group",
            collegeId,
            courseId,
            courseGroupId: 0,
            courseYearId: 0,
            detailName: "Course Group",
            detailValue: "group_code",
          },
        ]);
        setPosition("group_code");
        void loadLevel({
          flag: "std_details_course_group",
          collegeId,
          courseId,
          detailName: "Course Group",
          detailValue: "group_code",
        });
        return;
      }

      if (position === "group_code") {
        const name = txt(row.varaiableValue);
        const collegeId = pickNum(row, ["fk_college_id", "collegeId"]);
        const courseId = pickNum(row, ["fk_course_id", "courseId"]);
        const courseGroupId = pickNum(row, [
          "fk_course_group_id",
          "courseGroupId",
        ]);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "std_details_course_year",
            collegeId,
            courseId,
            courseGroupId,
            courseYearId: 0,
            detailName: "Course Year",
            detailValue: "course_year_code",
          },
        ]);
        setPosition("course_year_code");
        void loadLevel({
          flag: "std_details_course_year",
          collegeId,
          courseId,
          courseGroupId,
          detailName: "Course Year",
          detailValue: "course_year_code",
        });
        return;
      }

      if (position === "course_year_code") {
        const name = txt(row.varaiableValue);
        const collegeId = pickNum(row, ["fk_college_id", "collegeId"]);
        const courseId = pickNum(row, ["fk_course_id", "courseId"]);
        const courseGroupId = pickNum(row, [
          "fk_course_group_id",
          "courseGroupId",
        ]);
        const courseYearId = pickNum(row, [
          "fk_course_year_id",
          "courseYearId",
        ]);
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name,
            flag: "std_details_students",
            collegeId,
            courseId,
            courseGroupId,
            courseYearId,
            detailName: "Student",
            detailValue: "student_name",
          },
        ]);
        setPosition("student_name");
        void loadLevel({
          flag: "std_details_students",
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          detailName: "Student",
          detailValue: "student_name",
        });
      }
    },
    [loadLevel, position],
  );

  const handleBack = () => {
    if (steps.length === 0) return;
    const next = steps.slice(0, -1);
    setSteps(next);
    if (next.length === 0) {
      setPosition("");
      void loadLevel({
        flag: "std_details_college",
        detailName: "College",
        detailValue: "college_code",
      });
      return;
    }
    const last = next[next.length - 1];
    setPosition(last.detailValue as Position);
    void loadLevel({
      flag: last.flag,
      collegeId: last.collegeId,
      courseId: last.courseId,
      courseGroupId: last.courseGroupId,
      courseYearId: last.courseYearId,
      detailName: last.detailName,
      detailValue: last.detailValue,
    });
  };

  const isStudentLeaf = position === "student_name";
  // Angular always keeps the table shell (headers + Export/Print/Back) after AY loads,
  // including when a drill level returns zero rows.
  const showResults = ayReady;

  const displayRows = useMemo<DrillRow[]>(
    () =>
      rows.map((row, i) => ({
        ...row,
        __rowKey: `${position}-${i}-${txt(row.varaiableValue)}`,
        varaiableName: txt(row.varaiableName),
        varaiableValue: txt(row.varaiableValue),
        Total_Students: row.Total_Students as string | number | undefined,
        gender: txt(row.gender),
        father_name: txt(row.father_name),
        date_of_birth: formatDob(row.date_of_birth),
        student_quota: txt(row.student_quota),
        scholarship_type: txt(row.scholarship_type),
      })),
    [position, rows],
  );

  const columnDefs = useMemo<ColDef<DrillRow>[]>(() => {
    const expandCol: ColDef<DrillRow> = {
      headerName: "Expand",
      width: 90,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: makeExpandRenderer(expandRow, !isStudentLeaf),
    };
    const nameCol: ColDef<DrillRow> = {
      field: "varaiableName",
      headerName: "",
      minWidth: 120,
      onCellClicked: !isStudentLeaf
        ? (e) => {
            if (e.data) expandRow(e.data);
          }
        : undefined,
    };
    const valueCol: ColDef<DrillRow> = {
      field: "varaiableValue",
      headerName: "",
      minWidth: 160,
      onCellClicked: !isStudentLeaf
        ? (e) => {
            if (e.data) expandRow(e.data);
          }
        : undefined,
    };

    if (isStudentLeaf) {
      return [
        expandCol,
        nameCol,
        valueCol,
        {
          field: "gender",
          headerName: "Gender",
          minWidth: 100,
        },
        {
          field: "father_name",
          headerName: "Father Name",
          minWidth: 140,
        },
        {
          field: "date_of_birth",
          headerName: "Date Of Birth",
          minWidth: 120,
        },
        {
          field: "student_quota",
          headerName: "Quota",
          minWidth: 110,
        },
        {
          field: "scholarship_type",
          headerName: "Category",
          minWidth: 120,
        },
      ];
    }

    return [
      expandCol,
      nameCol,
      valueCol,
      {
        field: "Total_Students",
        headerName: "Total Students",
        minWidth: 130,
        onCellClicked: (e) => {
          if (e.data) expandRow(e.data);
        },
      },
    ];
  }, [expandRow, isStudentLeaf]);

  const buildExportTableHtml = () => {
    if (isStudentLeaf) {
      const exportRows = displayRows.map((row) => ({
        expand: ">",
        varaiableName: row.varaiableName,
        varaiableValue: row.varaiableValue,
        gender: row.gender ?? "",
        father_name: row.father_name ?? "",
        date_of_birth: row.date_of_birth ?? "",
        student_quota: row.student_quota ?? "",
        scholarship_type: row.scholarship_type ?? "",
      }));
      return buildHtmlTable(STUDENT_EXCEL_COLUMNS, exportRows);
    }
    const exportRows = [
      ...displayRows.map((row) => ({
        expand: ">",
        varaiableName: row.varaiableName,
        varaiableValue: row.varaiableValue,
        Total_Students: txt(row.Total_Students),
      })),
      ...(displayRows.length > 0
        ? [
            {
              expand: "",
              varaiableName: "Grand Total",
              varaiableValue: "",
              Total_Students: String(grandTotal),
            },
          ]
        : []),
    ];
    return buildHtmlTable(AGG_EXCEL_COLUMNS, exportRows);
  };

  /** Angular print body — logo/header + table (no Expand; Grand Total colspan 2). */
  const buildPrintTableHtml = () => {
    if (isStudentLeaf) {
      const exportRows = displayRows.map((row) => ({
        varaiableName: row.varaiableName,
        varaiableValue: row.varaiableValue,
        gender: row.gender ?? "",
        father_name: row.father_name ?? "",
        date_of_birth: row.date_of_birth ?? "",
        student_quota: row.student_quota ?? "",
        scholarship_type: row.scholarship_type ?? "",
      }));
      return buildHtmlTable(STUDENT_PRINT_COLUMNS, exportRows);
    }
    const exportRows = displayRows.map((row) => ({
      varaiableName: row.varaiableName,
      varaiableValue: row.varaiableValue,
      Total_Students: txt(row.Total_Students),
    }));
    const tableHtml = buildHtmlTable(AGG_PRINT_COLUMNS, exportRows);
    if (displayRows.length === 0) return tableHtml;
    // Append Grand Total row (Angular: colspan=2 + total cell)
    return tableHtml.replace(
      "</tbody>",
      `<tr>
        <td colspan="2" style="text-align:center;font-weight:600;border:1px solid #333;padding:6px 5px">Grand Total</td>
        <td style="text-align:center;font-weight:600;border:1px solid #333;padding:6px 5px">${escapeHtml(String(grandTotal))}</td>
      </tr></tbody>`,
    );
  };

  const handleExcelExport = () => {
    const tableHtml = buildExportTableHtml();
    if (!tableHtml) {
      toastInfo("No records to export.");
      return;
    }
    const orgLabel = orgPrintMeta.orgName || "Organization";
    exportHtmlTableAsExcel(
      "Student Count Report.xls",
      tableHtml,
      `<div style="margin-bottom:12px;">
        <div style="font-size:18px;font-weight:600;">${escapeHtml(orgLabel)}</div>
        <div style="font-size:16px;font-weight:550;margin-top:4px;">Student Count Report${academicYear ? ` - (${escapeHtml(academicYear)})` : ""}</div>
      </div>`,
    );
  };

  const printReport = async () => {
    const tableHtml = buildPrintTableHtml();
    if (!tableHtml) {
      toastInfo("No records to print.");
      return;
    }
    const logoCandidate = orgPrintMeta.logoPath;
    const logoUrl = toPrintLogoUrl(logoCandidate || DEFAULT_COLLEGE_LOGO);
    const logoSrc = isDefaultLogoUrl(logoUrl)
      ? await logoToDataUrl(DEFAULT_COLLEGE_LOGO)
      : await logoToDataUrl(logoUrl);
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const orgLabel = orgPrintMeta.orgName || "Organization";
    const titleLine = academicYear
      ? `Student Count Report - (${academicYear})`
      : "Student Count Report";

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Student Count Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:12px}
.header img{width:100px;height:96px;object-fit:contain}
.header-text{flex:1;text-align:left}
.collegeName{font-size:24px;font-weight:550;margin:20px 0 -10px}
.title{font-size:20px;font-weight:550;margin:0}
hr{border:none;border-top:1px solid #333;margin:10px 0 12px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:6px 5px;text-align:center}
th{background:#fff;font-weight:600}
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logoSrc)}" alt="Logo"
    onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(orgLabel)}</p>
    <p class="title">${escapeHtml(titleLine)}</p>
  </div>
</div>
<hr />
${tableHtml}
</body></html>`);
  };

  return (
    <FilteredListPage<DrillRow>
      title="Student Count Report"
      subtitle={
        !isStudentLeaf && rows.length > 0
          ? `Grand Total: ${grandTotal}`
          : undefined
      }
      filters={
        <div className="w-full min-w-[12rem] sm:w-[16rem]">
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(v) => setAcademicYear(v ?? "")}
            options={ayOptions}
            placeholder="Academic Year"
            isLoading={filtersQuery.isLoading}
          />
        </div>
      }
      filtersFooter={
        showResults ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {steps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {steps.map((step, i) => (
                    <span
                      key={step.id}
                      className="inline-flex items-center gap-1"
                    >
                      <span className="font-medium text-blue-700">
                        {step.name}
                      </span>
                      {i < steps.length - 1 ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {steps.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 px-3"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
            ) : null}
          </div>
        ) : null
      }
      rowData={showResults ? displayRows : []}
      columnDefs={columnDefs}
      loading={loading}
      resultsVisible={showResults}
      pagination
      paginationPageSize={25}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showResults ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => void printReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
