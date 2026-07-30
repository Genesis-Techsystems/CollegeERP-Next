"use client";

/**
 * Batch Wise Student Backlog Report — Angular `student-backlog-data`.
 * Multi-header MatTable → FilteredListPage + DataTable (ColGroupDef).
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getAdmissionUnivFilters,
  getBatchWiseStudentBacklogReport,
  getFeeMasterCollegeFilters,
  listBatchesByCourse,
} from "@/services";
import {
  filterBatches,
  filterColleges,
  filterCourses,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { toastError, toastInfo } from "@/lib/toast";
import {
  Building2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
} from "lucide-react";
import { printStudentBacklogReport } from "../_components/printStudentBacklogReport";

type AnyRow = Record<string, any>;
type StudentSemesterRows = AnyRow[];

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
} as const;

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[];
}

/** Angular: group flat semester rows by hallticket_number. */
function groupByHallTicket(flatRows: AnyRow[]): StudentSemesterRows[] {
  const groups: Record<string, AnyRow[]> = {};
  for (const r of flatRows) {
    const key =
      String(r?.hallticket_number ?? r?.hall_ticketno ?? "").trim() ||
      `row-${Math.random()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.values(groups);
}

function findMarks(
  list: AnyRow[],
  courseYearCode: string,
  field: string,
): string {
  const item = list.find(
    (x) => String(x?.course_year_code ?? "") === courseYearCode,
  );
  if (!item) return "-";
  const v = item[field];
  return v == null || String(v).trim() === "" ? "-" : String(v);
}

/** One AG Grid row per student; semester count/subjects as flat fields. */
function flattenBacklogRows(
  groups: StudentSemesterRows[],
  codes: string[],
): AnyRow[] {
  return groups.map((list) => {
    const first = list[0] ?? {};
    const row: AnyRow = {
      hallticket_number: pickText(first, [
        "hallticket_number",
        "hall_ticketno",
      ]),
      group_code: pickText(first, ["group_code", "groupCode"]),
      total_failed_count: pickText(first, ["total_failed_count"]) || "-",
    };
    for (const code of codes) {
      row[`${code}__count`] = findMarks(list, code, "semester_failed_count");
      row[`${code}__subjects`] = findMarks(list, code, "failed_subjects");
    }
    return row;
  });
}

export default function StudentBacklogDataPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [batchesFilter, setBatchesFilter] = useState<FilterRow[]>([]);
  const [domainBatches, setDomainBatches] = useState<FilterRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [mainList, setMainList] = useState<StudentSemesterRows[]>([]);
  const [courseYearCodes, setCourseYearCodes] = useState<string[]>([]);

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeLogo = useCollegeLogo(collegeId);
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId),
    [filtersData, collegeId],
  );

  const batches = useMemo(() => {
    const fromProc = filterBatches(batchesFilter, courseId);
    if (fromProc.length > 0) return fromProc;
    return filterBatches(domainBatches, courseId);
  }, [batchesFilter, domainBatches, courseId]);

  const tableRows = useMemo(
    () => flattenBacklogRows(mainList, courseYearCodes),
    [mainList, courseYearCodes],
  );

  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(() => {
    const fixed: ColDef<AnyRow>[] = [
      {
        headerName: "Sno",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Hall ticket number",
        field: "hallticket_number",
        minWidth: 170,
        flex: 1.1,
      },
      {
        headerName: "Group code",
        field: "group_code",
        minWidth: 110,
        flex: 0.8,
      },
    ];
    const groups: ColGroupDef<AnyRow>[] = courseYearCodes.map((code) => ({
      headerName: code,
      marryChildren: true,
      children: [
        {
          headerName: "Count",
          colId: `${code}__count`,
          minWidth: 80,
          flex: 0.6,
          cellClass: "text-center",
          valueGetter: (p) => String(p.data?.[`${code}__count`] ?? "-"),
        },
        {
          headerName: "Subjects",
          colId: `${code}__subjects`,
          minWidth: 140,
          flex: 1.2,
          wrapText: true,
          autoHeight: true,
          valueGetter: (p) => String(p.data?.[`${code}__subjects`] ?? "-"),
        },
      ],
    }));
    return [
      ...fixed,
      ...groups,
      {
        headerName: "Total Fail",
        field: "total_failed_count",
        minWidth: 100,
        flex: 0.7,
        cellClass: "text-center",
      },
    ];
  }, [courseYearCodes]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const collegeFilters = await getFeeMasterCollegeFilters(
          orgId,
          employeeId,
        );
        if (cancelled) return;

        let nextBatches = toFilterRows(collegeFilters.batchesData ?? []);
        if (nextBatches.length === 0) {
          const univFilters = await getAdmissionUnivFilters(
            orgId,
            employeeId,
          ).catch(() => null);
          nextBatches = toFilterRows(univFilters?.batchesData ?? []);
        }

        setFiltersData(toFilterRows(collegeFilters.filtersData ?? []));
        setBatchesFilter(nextBatches);

        const nextColleges = filterColleges(
          toFilterRows(collegeFilters.filtersData ?? []),
        );
        setSkipAutoSelect(false);
        setCollegeId(
          nextColleges[0]
            ? pickNum(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [orgId, employeeId]);

  useEffect(() => {
    if (!collegeId) {
      setCourseId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = filterCourses(filtersData, collegeId);
    setCourseId(
      list[0] ? pickNum(list[0], ["fk_course_id", "courseId"]) : null,
    );
  }, [collegeId, filtersData, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadDomainBatches() {
      if (!courseId) {
        setDomainBatches([]);
        return;
      }
      const fromProc = filterBatches(batchesFilter, courseId);
      if (fromProc.length > 0) {
        setDomainBatches([]);
        return;
      }
      try {
        const list = await listBatchesByCourse(courseId);
        if (cancelled) return;
        setDomainBatches(
          toFilterRows(
            list.map((b) => ({
              fk_batch_id: b.batchId,
              batchId: b.batchId,
              batch_name: b.batchName,
              batchName: b.batchName,
              fk_course_id: courseId,
              courseId,
            })),
          ),
        );
      } catch {
        if (!cancelled) setDomainBatches([]);
      }
    }
    void loadDomainBatches();
    return () => {
      cancelled = true;
    };
  }, [courseId, batchesFilter]);

  useEffect(() => {
    if (!courseId) {
      setBatchId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = batches;
    setBatchId(list[0] ? pickNum(list[0], ["fk_batch_id", "batchId"]) : null);
  }, [courseId, batches, skipAutoSelect]);

  async function handleGetReport() {
    if (!collegeId || !batchId) {
      toastError("Please select College and Batch");
      return;
    }
    setLoading(true);
    setMainList([]);
    setCourseYearCodes([]);
    try {
      const flatRows = await getBatchWiseStudentBacklogReport({
        collegeId,
        courseId: courseId || 0,
        batchId,
      });
      if (flatRows.length === 0) {
        toastInfo("No data found for selected filters.");
        return;
      }
      const uniqueYears = [
        ...new Set(
          flatRows
            .map((r) => String(r?.course_year_code ?? "").trim())
            .filter(Boolean),
        ),
      ];
      setCourseYearCodes(uniqueYears);
      setMainList(groupByHallTicket(flatRows));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    setCollegeId(null);
    setCourseId(null);
    setBatchId(null);
    setDomainBatches([]);
    setMainList([]);
    setCourseYearCodes([]);
  }

  function handleExportExcel() {
    if (mainList.length === 0) return;
    const topHeads = courseYearCodes
      .map((c) => `<th colspan="2">${c}</th>`)
      .join("");
    const subHeads = courseYearCodes
      .map(() => `<th>Count</th><th>Subjects</th>`)
      .join("");
    const head = `
      <tr>
        <th rowspan="2">Sno</th>
        <th rowspan="2">Hall ticket number</th>
        <th rowspan="2">Group code</th>
        ${topHeads}
        <th rowspan="2">Total Fail</th>
      </tr>
      <tr>${subHeads}</tr>`;
    const body = mainList
      .map((list, i) => {
        const first = list[0] ?? {};
        const sem = courseYearCodes
          .map(
            (code) =>
              `<td>${findMarks(list, code, "semester_failed_count")}</td><td>${findMarks(list, code, "failed_subjects")}</td>`,
          )
          .join("");
        return `<tr>
          <td>${i + 1}</td>
          <td>${pickText(first, ["hallticket_number", "hall_ticketno"])}</td>
          <td>${pickText(first, ["group_code", "groupCode"])}</td>
          ${sem}
          <td>${pickText(first, ["total_failed_count"]) || "-"}</td>
        </tr>`;
      })
      .join("");
    const title = `<tr><th colspan="${3 + courseYearCodes.length * 2 + 1}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Student Backlog Data</th></tr>`;
    exportHtmlTable("Student Backlog Data.xls", title, `${head}${body}`);
  }

  function handlePrint() {
    if (mainList.length === 0) return;
    const college = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
    );
    printStudentBacklogReport(mainList, {
      title: "Student Backlog Data",
      collegeName: pickText(college ?? {}, ["college_name", "collegeName"]),
      logoUrl: collegeLogo,
      courseYearCodes,
    });
  }

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="College" icon={Building2}>
        <Select
          value={collegeId ? String(collegeId) : null}
          onChange={(v) => {
            setSkipAutoSelect(false);
            setMainList([]);
            setCourseYearCodes([]);
            setCollegeId(v ? Number(v) : null);
          }}
          options={colleges.map((r) => ({
            value: String(pickNum(r, ["fk_college_id", "collegeId"])),
            label: pickText(r, ["college_code", "collegeCode", "college_name"]),
          }))}
          placeholder="College"
          searchable
          isLoading={loading && filtersData.length === 0}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Course" icon={GraduationCap}>
        <Select
          value={courseId ? String(courseId) : null}
          onChange={(v) => {
            setSkipAutoSelect(false);
            setMainList([]);
            setCourseYearCodes([]);
            setCourseId(v ? Number(v) : null);
          }}
          options={courses.map((r) => ({
            value: String(pickNum(r, ["fk_course_id", "courseId"])),
            label: pickText(r, ["course_code", "courseCode", "course_name"]),
          }))}
          placeholder="Course"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Batch" icon={Layers}>
        <Select
          value={batchId ? String(batchId) : null}
          onChange={(v) => {
            setMainList([]);
            setCourseYearCodes([]);
            setBatchId(v ? Number(v) : null);
          }}
          options={batches.map((r) => ({
            value: String(pickNum(r, ["fk_batch_id", "batchId"])),
            label: pickText(r, ["batch_name", "batchName"]),
          }))}
          placeholder="Batch"
          searchable
          isLoading={Boolean(courseId) && loading}
        />
      </GlobalFilterField>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
        <Button
          type="button"
          className="h-8 text-[12px]"
          onClick={() => void handleGetReport()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Get Report"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 text-[12px]"
          onClick={handleReset}
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </GlobalFilterBarRow>
  );

  return (
    <FilteredListPage
      title="Batch Wise student Backlog Report"
      filters={filters}
      rowData={tableRows}
      columnDefs={columnDefs as ColDef<AnyRow>[]}
      loading={loading}
      pagination
      paginationPageSize={10}
      toolbar={TOOLBAR}
      toolbarTrailing={
        mainList.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-8 bg-blue-600 text-[12px] text-white hover:bg-blue-700"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-8 bg-blue-600 text-[12px] text-white hover:bg-blue-700"
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) =>
        String(p.data?.hallticket_number ?? `row-${Math.random()}`)
      }
    />
  );
}
