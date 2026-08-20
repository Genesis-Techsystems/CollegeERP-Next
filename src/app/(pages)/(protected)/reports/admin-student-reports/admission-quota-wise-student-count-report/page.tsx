"use client";

/**
 * Admission Quota Wise Student Count Report —
 * Angular `reports/student-admission-reports/admission-quota-wise-student-count-report` parity.
 * Get List: `getAllRecords/s_get_student_reports?in_flag=adm_quota_std_count&…`
 * Table uses AG Grid (same format as Student Count Report) with Angular-style
 * quota groups: header "B-MANAGEMENT" over child columns M | F.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchStudentReports,
  getCollegeById,
  getFeePaylinkCollegeFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;
type GenderCell = { Quota: string; gender: string; count: number };
type BranchRow = { Branch: string; studentCasteCount: GenderCell[] };

const ALL0 = { value: "0", label: "All" };
const REPORT_TITLE = "Student Count By Quota Report";

function gmOptions(rows: FilterRow[], gmId: number) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === gmId)
    .map((r) => ({
      value: String(r.pk_gd_id ?? r.generalDetailId ?? ""),
      label: String(r.gd_name ?? r.generalDetailDisplayName ?? r.gd_code ?? ""),
    }))
    .filter((o) => o.value && o.value !== "0");
}

/** Angular quota/gender pivot shaping for `adm_quota_std_count`. */
function buildQuotaGenderMatrix(raw: AnyRow[]): {
  keys: { Quota: string }[];
  casteCount: BranchRow[];
} {
  const keys: { Quota: string }[] = [];
  for (const row of raw) {
    const quota = String(row.Quota ?? "");
    if (quota && !keys.some((k) => k.Quota === quota)) {
      keys.push({ Quota: quota });
    }
  }

  const studentGenders: GenderCell[] = [];
  for (const k of keys) {
    studentGenders.push({ Quota: k.Quota, gender: "Male", count: 0 });
    studentGenders.push({ Quota: k.Quota, gender: "Female", count: 0 });
  }

  const casteCount: BranchRow[] = [];

  for (const row of raw) {
    const branch = String(row.Branch ?? "");
    const quota = String(row.Quota ?? "");
    const gender = String(row.Gender ?? "");
    const count = Number(row.Student_Count ?? 0);

    let branchEntry = casteCount.find((x) => x.Branch === branch);
    if (!branchEntry) {
      const template = studentGenders.map((g) => ({
        Quota: g.Quota,
        gender: g.gender,
        count: g.Quota === quota && g.gender === gender ? count : 0,
      }));
      casteCount.push({ Branch: branch, studentCasteCount: template });
    } else {
      const cell = branchEntry.studentCasteCount.find(
        (y) => y.Quota === quota && y.gender === gender,
      );
      if (cell) cell.count = count;
    }
  }

  return { keys, casteCount };
}

function flattenPivotRows(
  keys: { Quota: string }[],
  casteCount: BranchRow[],
): AnyRow[] {
  return casteCount.map((branch) => {
    const row: AnyRow = { Branch: branch.Branch };
    keys.forEach((k, qi) => {
      const male = branch.studentCasteCount.find(
        (c) => c.Quota === k.Quota && c.gender === "Male",
      );
      const female = branch.studentCasteCount.find(
        (c) => c.Quota === k.Quota && c.gender === "Female",
      );
      row[`q${qi}_m`] = male?.count ?? 0;
      row[`q${qi}_f`] = female?.count ?? 0;
    });
    return row;
  });
}

function buildBannerHtml(opts: {
  logoSrc: string;
  collegeName: string;
  dataDetails: string;
  orgCode: string;
}): string {
  const { logoSrc, collegeName, dataDetails, orgCode } = opts;
  if (orgCode === "SUK") {
    return `<div style="text-align:center;margin-bottom:12px;">
      <img src="${escapeHtml(logoSrc)}" alt="" style="height:120px;max-width:90%;object-fit:contain;" />
      <p style="font-size:16px;font-weight:700;margin:8px 0 4px;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;">${REPORT_TITLE}</p>
    </div>`;
  }
  return `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
    <img src="${escapeHtml(logoSrc)}" alt="" style="height:72px;width:auto;object-fit:contain;" />
    <div>
      <p style="font-size:16px;font-weight:700;margin:0 0 4px;text-align:left;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;text-align:left;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;text-align:left;">${REPORT_TITLE}</p>
    </div>
  </div>`;
}

export default function AdmissionQuotaWiseStudentCountReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [courseId, setCourseId] = useState<string>("0");
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");
  const [quotaId, setQuotaId] = useState<string>("0");
  const [studentStatusId, setStudentStatusId] = useState<string>("0");

  const [quotaKeys, setQuotaKeys] = useState<{ Quota: string }[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeNum = Number(collegeId ?? 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  const clearResults = useCallback(() => {
    setQuotaKeys([]);
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  useEffect(() => {
    const orgId = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    if (!orgId || !empId) {
      setLoadingFilters(false);
      return;
    }
    let cancelled = false;
    setLoadingFilters(true);
    void getFeePaylinkCollegeFilters(orgId, empId)
      .then((data) => {
        if (cancelled) return;
        setFiltersData((data.filtersData ?? []) as FilterRow[]);
        setAcademicData((data.academicData ?? []) as FilterRow[]);
        setGmRows((data.generalDetails ?? []) as FilterRow[]);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return [
      ALL0,
      ...filterAcademicYears(academicData, cid || null, filtersData).map(
        (r) => ({
          value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
          label: pickText(r, ["academic_year", "academicYear"]) || "—",
        }),
      ),
    ];
  }, [academicData, collegeId, filtersData]);

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return [
      ALL0,
      ...filterCourses(filtersData, cid || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label: pickText(r, ["course_code", "courseCode", "course_name"]),
      })),
    ];
  }, [filtersData, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    return [
      ALL0,
      ...filterCourseGroups(filtersData, cid || null, cr || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      })),
    ];
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    return [
      ALL0,
      ...filterCourseYears(filtersData, cid || null, cr || null, g || null)
        .sort(
          (a, b) =>
            pickNum(a, ["year_order", "sortOrder"]) -
            pickNum(b, ["year_order", "sortOrder"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
          label: pickText(r, ["course_year_name", "courseYearName"]),
        })),
    ];
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const quotaOptions = useMemo(() => [ALL0, ...gmOptions(gmRows, 8)], [gmRows]);
  const statusOptions = useMemo(
    () => [ALL0, ...gmOptions(gmRows, 51)],
    [gmRows],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    const rowsAy = filterAcademicYears(
      academicData,
      Number(collegeId),
      filtersData,
    );
    if (rowsAy.length === 0) {
      setAcademicYearId("0");
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const current =
      rowsAy.find((r) => Number(r.is_curr_ay ?? 0) === 1) ?? rowsAy[0];
    setAcademicYearId(
      String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
    );
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collegeId || !academicYearId) return;
    const courses = courseOptions.filter((o) => o.value !== "0");
    if (courses.length === 0) {
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    setCourseId(courses[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId || courseId === "0") {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const groups = groupOptions.filter((o) => o.value !== "0");
    setCourseGroupId(groups[0]?.value ?? "0");
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId || courseGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    const years = yearOptions.filter((o) => o.value !== "0");
    setCourseYearId(years[0]?.value ?? "0");
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setQuotaId("0");
    clearResults();
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const ay = ayOptions.find(
      (o) => o.value === academicYearId && o.value !== "0",
    );
    if (ay?.label) parts.push(ay.label);
    const cr = courseOptions.find(
      (o) => o.value === courseId && o.value !== "0",
    );
    if (cr?.label) parts.push(cr.label);
    const g = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    );
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    );
    if (y?.label) parts.push(y.label);
    const q = quotaOptions.find((o) => o.value === quotaId && o.value !== "0");
    if (q?.label) parts.push(q.label);
    const st = statusOptions.find(
      (o) => o.value === studentStatusId && o.value !== "0",
    );
    if (st?.label) parts.push(st.label);
    let details = parts.join(" / ");
    if (studentStatusId === "0") details = `${details} - All`;
    return details;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!courseGroupId || courseGroupId === "0") {
      toastInfo("Course Group is required");
      return;
    }
    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);
    try {
      const [raw, college] = await Promise.all([
        fetchStudentReports({
          flag: "adm_quota_std_count",
          fromDate: "1990-01-01",
          toDate: "1990-01-01",
          collegeId: cid,
          courseId: Number(courseId || 0),
          academicYearId: Number(academicYearId || 0),
          courseGroupId: Number(courseGroupId || 0),
          courseYearId: Number(courseYearId || 0),
          quotaId: Number(quotaId || 0),
          regulationId: 0,
          isCurrentYear: -1,
          isLateral: -1,
          appStatus: 0,
          studentStatusIds: Number(studentStatusId || 0),
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            collegeOptions.find((o) => o.value === collegeId)?.label ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No quota wise student count records found.");
        return;
      }
      const shaped = buildQuotaGenderMatrix(raw);
      setQuotaKeys(shaped.keys);
      setRows(flattenPivotRows(shaped.keys, shaped.casteCount));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(() => {
    // DataTable defaultColDef sets autoHeaderHeight/wrapHeaderText, which breaks
    // header rowspan beside ColGroupDefs. Override so S.No / Branch fill both rows.
    const spannedLeaf: Partial<ColDef<AnyRow>> = {
      autoHeaderHeight: false,
      wrapHeaderText: false,
      suppressSpanHeaderHeight: false,
      suppressHeaderMenuButton: true,
    };
    const defs: (ColDef<AnyRow> | ColGroupDef<AnyRow>)[] = [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        ...spannedLeaf,
        headerClass: "quota-span-header quota-span-header--center",
        cellClass: "text-center",
      },
      {
        field: "Branch",
        headerName: "Branch",
        minWidth: 160,
        ...spannedLeaf,
        headerClass: "quota-span-header",
      },
    ];
    quotaKeys.forEach((k, qi) => {
      defs.push({
        headerName: k.Quota,
        headerClass: "app-table-header-group",
        marryChildren: true,
        children: [
          {
            field: `q${qi}_m`,
            headerName: "M",
            width: 80,
            minWidth: 70,
            flex: 0,
            cellClass: "text-center",
            suppressHeaderMenuButton: true,
          },
          {
            field: `q${qi}_f`,
            headerName: "F",
            width: 80,
            minWidth: 70,
            flex: 0,
            cellClass: "text-center",
            suppressHeaderMenuButton: true,
          },
        ],
      });
    });
    return defs;
  }, [quotaKeys]);

  const excelColumns = useMemo(() => {
    const cols: { key: string; header: string }[] = [
      { key: "siNo", header: "S.No" },
      { key: "Branch", header: "Branch" },
    ];
    quotaKeys.forEach((k, qi) => {
      cols.push({ key: `q${qi}_m`, header: `${k.Quota} M` });
      cols.push({ key: `q${qi}_f`, header: `${k.Quota} F` });
    });
    return cols;
  }, [quotaKeys]);

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => {
        const flat: Record<string, unknown> = {
          siNo: i + 1,
          Branch: String(row.Branch ?? ""),
        };
        quotaKeys.forEach((_, qi) => {
          flat[`q${qi}_m`] = row[`q${qi}_m`] ?? 0;
          flat[`q${qi}_f`] = row[`q${qi}_f`] ?? 0;
        });
        return flat;
      }),
    [quotaKeys, rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    const tableHtml = buildHtmlTable(excelColumns, exportFlatRows);
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, excelColumns, exportFlatRows]);

  const handlePrintReport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      orgCode,
    });
    const head = `<tr>
      <th rowspan="2">S.No</th>
      <th rowspan="2">Branch</th>
      ${quotaKeys
        .map(
          (k) =>
            `<th colspan="2" style="text-align:center">${escapeHtml(k.Quota)}<br/><span style="color:blue;font-weight:500">M</span> | <span style="color:blue;font-weight:500">F</span></th>`,
        )
        .join("")}
    </tr>`;
    const body = rows
      .map(
        (row, i) =>
          `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${escapeHtml(String(row.Branch ?? ""))}</td>
            ${quotaKeys
              .map(
                (_, qi) =>
                  `<td style="text-align:center">${escapeHtml(String(row[`q${qi}_m`] ?? 0))}</td><td style="text-align:center">${escapeHtml(String(row[`q${qi}_f`] ?? 0))}</td>`,
              )
              .join("")}
          </tr>`,
      )
      .join("");
    const tableHtml = `<table border="1" cellspacing="0" cellpadding="4"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${REPORT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`);
  }, [
    collegeLogo,
    collegeName,
    dataDetails,
    exportFlatRows.length,
    orgCode,
    quotaKeys,
    rows,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? dataDetails
      ? `${REPORT_TITLE} — ${dataDetails}`
      : REPORT_TITLE
    : REPORT_TITLE;

  return (
    <>
      <style>{`
        .app-data-table .ag-theme-quartz .ag-header-cell.quota-span-header {
          align-items: center;
        }
        .app-data-table .ag-theme-quartz .ag-header-cell.quota-span-header .ag-header-cell-comp-wrapper {
          height: 100%;
          display: flex;
          align-items: center;
        }
        .app-data-table .ag-theme-quartz .ag-header-cell.quota-span-header .ag-header-cell-label {
          height: 100%;
          display: flex;
          align-items: center;
        }
        .app-data-table .ag-theme-quartz .ag-header-cell.quota-span-header--center .ag-header-cell-label {
          justify-content: center;
        }
      `}</style>
      <FilteredListPage
        title={pageTitle}
        filters={
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="College"
                isLoading={loadingFilters}
              />
              <Select
                label="Academic Year"
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v ?? "0");
                  clearResults();
                }}
                options={ayOptions}
                placeholder="Academic Year"
              />
              <Select
                label="Course"
                value={courseId}
                onChange={(v) => {
                  setCourseId(v ?? "0");
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                disabled={!collegeId}
              />
              <Select
                label="Course Group"
                required
                value={courseGroupId}
                onChange={(v) => {
                  setCourseGroupId(v ?? "0");
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
              />
              <Select
                label="Course Year"
                value={courseYearId}
                onChange={(v) => {
                  setCourseYearId(v ?? "0");
                  clearResults();
                }}
                options={yearOptions}
                placeholder="Course Year"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-[10rem] sm:w-[12rem]">
                <Select
                  label="Quota"
                  value={quotaId}
                  onChange={(v) => {
                    setQuotaId(v ?? "0");
                    clearResults();
                  }}
                  options={quotaOptions}
                  placeholder="Quota"
                />
              </div>
              <div className="w-full min-w-[10rem] sm:w-[14rem]">
                <Select
                  label="Student Status"
                  required
                  value={studentStatusId}
                  onChange={(v) => {
                    setStudentStatusId(v ?? "0");
                    clearResults();
                  }}
                  options={statusOptions}
                  placeholder="Student Status"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 pb-0.5">
                <Button
                  type="button"
                  className="h-9 w-fit px-4"
                  disabled={loadingList}
                  onClick={() => void handleGetList()}
                >
                  {loadingList ? "Loading…" : "Get Students Count List"}
                </Button>
                <Button
                  type="button"
                  className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
                  onClick={goBack}
                >
                  Back
                </Button>
              </div>
            </div>
          </div>
        }
        rowData={showTable ? rows : []}
        columnDefs={columnDefs}
        pagination
        loading={loadingList || loadingFilters}
        resultsVisible={showTable}
        hideEmptyGrid
        columnFilters={false}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
          columnFilters: false,
        }}
        toolbarTrailing={
          showTable ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={handleExcelExport}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={handlePrintReport}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </>
          ) : null
        }
      />
    </>
  );
}
