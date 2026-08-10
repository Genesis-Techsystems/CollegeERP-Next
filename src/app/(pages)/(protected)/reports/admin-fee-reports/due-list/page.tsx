"use client";

/**
 * Fee Due List — Angular `accounts-and-fees/fee-reports/due-list` parity.
 * Get List: `getAllRecords/s_fee_due_list_scholarship_hold` (15 in_* params).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ColGroupDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { printHtmlInIframe } from "@/lib/print";
import { escapeHtml, buildHtmlTable } from "@/common/export-html-table";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchFeeDueListScholarshipHold,
  getFeePaylinkCollegeFilters,
  listBatchesByCourse,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
} from "@/services";

type AnyRow = Record<string, unknown>;
type DueListRow = AnyRow & {
  firstName?: string;
  hallticket_number?: string;
  Student_Mobile?: string;
  Student_Name?: string;
  amounts?: number[];
};

const DUE_LIST_FLAGS = [
  {
    flagNo: 1,
    flagName: "Student_Wise_Summary",
    flagCode: "Student Wise Summary",
  },
  { flagNo: 2, flagName: "Due_Summary", flagCode: "Due Summary" },
  {
    flagNo: 3,
    flagName: "Due_Category_Summary",
    flagCode: "Due Category Summary",
  },
  {
    flagNo: 4,
    flagName: "Due_Particular_Summary",
    flagCode: "Due Particular Summary",
  },
] as const;

const ALL = { value: "0", label: "All" };

type YearAmt = {
  year_name: string;
  gross_amount: number;
  discount_amount: number;
  college_fee: number;
  fine_amount: number;
  Scholarship_Hold_Amount: number;
  scholarship_amount: number;
  paid_amount: number;
  balance_amount: number;
};

type PivotRow = {
  hallticket_number: string;
  firstName: string;
  Student_Mobile: string;
  feeAmountsByYear: YearAmt[];
  amounts: number[];
};

function gmOptions(rows: FilterRow[], gmId: number) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === gmId)
    .map((r) => ({
      value: String(r.pk_gd_id ?? r.generalDetailId ?? ""),
      label: String(r.gd_name ?? r.generalDetailDisplayName ?? r.gd_code ?? ""),
    }))
    .filter((o) => o.value && o.value !== "0");
}

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function fmt(v: unknown): string {
  if (v == null || v === "") return "";
  return n(v).toFixed(2);
}

function flatAmtFormatter(p: ValueFormatterParams<DueListRow>) {
  return fmt(p.value);
}

function pivotAmtFormatter(p: ValueFormatterParams<DueListRow>) {
  const v = n(p.value);
  return v ? v.toFixed(2) : "-";
}

function studentRenderer(p: ICellRendererParams<DueListRow>) {
  const name = String(p.data?.firstName ?? p.data?.Student_Name ?? "");
  const ht = String(p.data?.hallticket_number ?? "");
  return (
    <div className="leading-tight py-0.5">
      <div>{name}</div>
      <div className="text-blue-600">({ht})</div>
    </div>
  );
}

const FLAT_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<DueListRow>,
  student: {
    headerName: "Student",
    field: "firstName",
    minWidth: 180,
  } as ColDef<DueListRow>,
  mobile: {
    headerName: "Student Mobile No",
    field: "Student_Mobile",
    minWidth: 130,
  } as ColDef<DueListRow>,
  gross: {
    field: "gross_amount",
    headerName: "Gross Amt",
    minWidth: 110,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  discount: {
    field: "discount_amount",
    headerName: "Discount Amt",
    minWidth: 110,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  collegeFee: {
    field: "college_fee",
    headerName: "College Fee",
    minWidth: 110,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  scholarshipHold: {
    field: "Scholarship_Hold_Amount",
    headerName: "Scholarship Hold Amt",
    minWidth: 150,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  scholarship: {
    field: "scholarship_amount",
    headerName: "Scholarship Amt",
    minWidth: 130,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  paid: {
    field: "paid_amount",
    headerName: "Paid Amt",
    minWidth: 110,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  collegeDue: {
    field: "total_due_college_amounts",
    headerName: "College Due Amt",
    minWidth: 130,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
  balance: {
    field: "balance_amount",
    headerName: "Balance Due",
    minWidth: 110,
    valueFormatter: flatAmtFormatter,
  } as ColDef<DueListRow>,
};

const PIVOT_YEAR_HEADERS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
] as const;
const PIVOT_AMT_HEADERS = [
  "Gross Amt",
  "Discount Amt",
  "College Fee",
  "LateFee",
  "Scholarship Hold Amt",
  "Scholarship Amt",
  "Paid Amt",
  "Balance Due",
] as const;

function buildPivotColumnDefs(): (
  | ColDef<DueListRow>
  | ColGroupDef<DueListRow>
)[] {
  const yearGroups: ColGroupDef<DueListRow>[] = PIVOT_YEAR_HEADERS.map(
    (year, yi) => ({
      headerName: year,
      children: PIVOT_AMT_HEADERS.map((headerName, ai) => {
        const idx = yi * PIVOT_AMT_HEADERS.length + ai;
        return {
          headerName,
          minWidth: 100,
          flex: 0,
          valueGetter: (p) => p.data?.amounts?.[idx] ?? 0,
          valueFormatter: pivotAmtFormatter,
        } satisfies ColDef<DueListRow>;
      }),
    }),
  );
  return [
    {
      headerName: "SI.No",
      valueGetter: rowIndexGetter,
      width: 70,
      flex: 0,
    },
    {
      headerName: "Student",
      field: "firstName",
      minWidth: 180,
      cellRenderer: studentRenderer,
    },
    {
      headerName: "Mobile No",
      field: "Student_Mobile",
      minWidth: 120,
    },
    ...yearGroups,
  ];
}

function emptyYear(year_name: string): YearAmt {
  return {
    year_name,
    gross_amount: 0,
    discount_amount: 0,
    college_fee: 0,
    fine_amount: 0,
    Scholarship_Hold_Amount: 0,
    scholarship_amount: 0,
    paid_amount: 0,
    balance_amount: 0,
  };
}

/** Angular pivot shaping for `check === true`. */
function buildPivotRows(raw: AnyRow[]): PivotRow[] {
  const list: PivotRow[] = [];
  for (const row of raw) {
    const ht = String(row.hallticket_number ?? "");
    const yearName = String(row.year_name ?? "");
    let entry = list.find((x) => x.hallticket_number === ht);
    if (!entry) {
      entry = {
        hallticket_number: ht,
        firstName: String(row.Student_Name ?? row.firstName ?? ""),
        Student_Mobile: String(row.Student_Mobile ?? ""),
        feeAmountsByYear: [
          emptyYear("1"),
          emptyYear("2"),
          emptyYear("3"),
          emptyYear("4"),
        ],
        amounts: [],
      };
      list.push(entry);
    }
    const y = entry.feeAmountsByYear.find((a) => a.year_name === yearName);
    if (y) {
      y.gross_amount = n(row.gross_amount);
      y.discount_amount = n(row.discount_amount);
      y.college_fee = n(row.college_fee);
      y.fine_amount = n(row.fine_amount);
      y.Scholarship_Hold_Amount = n(row.Scholarship_Hold_Amount);
      y.scholarship_amount = n(row.scholarship_amount);
      y.paid_amount = n(row.paid_amount);
      y.balance_amount = n(row.balance_amount);
    }
  }
  for (const entry of list) {
    entry.amounts = [];
    for (const y of entry.feeAmountsByYear) {
      entry.amounts.push(
        y.gross_amount,
        y.discount_amount,
        y.college_fee,
        y.fine_amount,
        y.Scholarship_Hold_Amount,
        y.scholarship_amount,
        y.paid_amount,
        y.balance_amount,
      );
    }
  }
  return list;
}

export default function FeeDueListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [flag, setFlag] = useState<string | null>(null);
  const [pivot, setPivot] = useState(false);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");
  const [quotaId, setQuotaId] = useState("0");
  const [batchId, setBatchId] = useState("0");
  const [studentStatusId, setStudentStatusId] = useState("0");
  const [feeCategoryId, setFeeCategoryId] = useState("0");
  const [feeParticularId, setFeeParticularId] = useState("0");
  const [includeScholarship, setIncludeScholarship] = useState(false);

  const [batches, setBatches] = useState<{ value: string; label: string }[]>([
    ALL,
  ]);
  const [feeCategories, setFeeCategories] = useState<
    { value: string; label: string }[]
  >([ALL]);
  const [feeParticulars, setFeeParticulars] = useState<
    { value: string; label: string }[]
  >([ALL]);

  const [flatRows, setFlatRows] = useState<DueListRow[]>([]);
  const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const flagNo = useMemo(() => {
    const f = DUE_LIST_FLAGS.find((x) => x.flagName === flag);
    return f?.flagNo ?? 0;
  }, [flag]);

  const clearResults = useCallback(() => {
    setFlatRows([]);
    setPivotRows([]);
    setShowTable(false);
    setDataDetails("");
  }, []);

  // Angular getfilterDetails — one-shot, no tab-focus refetch.
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

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return filterCourses(filtersData, cid || null).map((r) => ({
      value: String(pickNum(r, ["fk_course_id", "courseId"])),
      label: pickText(r, ["course_code", "courseCode", "course_name"]),
    }));
  }, [filtersData, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId ?? 0);
    return [
      ALL,
      ...filterCourseGroups(filtersData, cid || null, cr || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      })),
    ];
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId ?? 0);
    const g = Number(courseGroupId ?? 0);
    return [
      ALL,
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

  const quotaOptions = useMemo(() => [ALL, ...gmOptions(gmRows, 8)], [gmRows]);
  const statusOptions = useMemo(
    () => [ALL, ...gmOptions(gmRows, 51)],
    [gmRows],
  );

  const flagOptions = useMemo(
    () =>
      DUE_LIST_FLAGS.map((f) => ({
        value: f.flagName,
        label: f.flagCode,
      })),
    [],
  );

  // Default college + cascade (Angular selectedCollege).
  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    const cid = Number(collegeId ?? 0);
    if (!cid) return;
    let cancelled = false;
    void Promise.all([
      listFeeCategoriesByCollege(cid),
      listFeeParticularsByCollege(cid),
    ]).then(([cats, parts]) => {
      if (cancelled) return;
      setFeeCategories([
        ALL,
        ...cats.map((c) => ({
          value: String(c.feeCategoryId),
          label: String(c.categoryName ?? c.feeCategoryId),
        })),
      ]);
      setFeeParticulars([
        ALL,
        ...parts.map((p) => ({
          value: String(p.feeParticularsId),
          label: String(p.particularsName ?? p.feeParticularsId),
        })),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  useEffect(() => {
    const cr = Number(courseId ?? 0);
    if (!cr) {
      setBatches([ALL]);
      return;
    }
    let cancelled = false;
    void listBatchesByCourse(cr).then((rows) => {
      if (cancelled) return;
      const opts = rows
        .slice()
        .sort(
          (a, b) =>
            Number.parseInt(String(a.batchName ?? "0"), 10) -
            Number.parseInt(String(b.batchName ?? "0"), 10),
        )
        .map((b) => ({
          value: String(b.batchId),
          label: String(b.batchName ?? b.batchId),
        }));
      setBatches([ALL, ...opts]);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // When college changes, pick first course (Angular selectedCollege).
  useEffect(() => {
    if (!collegeId || courseOptions.length === 0) return;
    const stillValid = courseOptions.some((o) => o.value === courseId);
    if (!stillValid) {
      setCourseId(courseOptions[0].value);
    }
  }, [collegeId, courseOptions, courseId]);

  // When course changes, pick first group (Angular selectedCourse).
  useEffect(() => {
    if (!courseId || groupOptions.length <= 1) return;
    const stillValid = groupOptions.some((o) => o.value === courseGroupId);
    if (!stillValid || courseGroupId === "0") {
      const first = groupOptions.find((o) => o.value !== "0");
      if (first) setCourseGroupId(first.value);
    }
  }, [courseId, groupOptions, courseGroupId]);

  // When group changes, pick first year (Angular selectedGroup).
  useEffect(() => {
    if (yearOptions.length <= 1) return;
    const stillValid = yearOptions.some((o) => o.value === courseYearId);
    if (!stillValid || courseYearId === "0") {
      const first = yearOptions.find((o) => o.value !== "0");
      if (first) setCourseYearId(first.value);
    }
  }, [courseGroupId, yearOptions, courseYearId]);

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setCourseId(null);
    setCourseGroupId("0");
    setCourseYearId("0");
    setQuotaId("0");
    setBatchId("0");
    setStudentStatusId("0");
    setFeeCategoryId("0");
    setFeeParticularId("0");
    setIncludeScholarship(false);
    clearResults();
  };

  const onCourseChange = (v: string | null) => {
    setCourseId(v);
    setCourseGroupId("0");
    setCourseYearId("0");
    setQuotaId("0");
    setBatchId("0");
    setStudentStatusId("0");
    setFeeCategoryId("0");
    setFeeParticularId("0");
    setIncludeScholarship(false);
    clearResults();
  };

  const onFlagChange = (v: string | null) => {
    setFlag(v);
    clearResults();
    const no = DUE_LIST_FLAGS.find((x) => x.flagName === v)?.flagNo ?? 0;
    if (no === 1) setPivot(false);
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const cr = courseOptions.find((o) => o.value === courseId);
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
    const b = batches.find((o) => o.value === batchId && o.value !== "0");
    if (b?.label) parts.push(b.label);
    const st = statusOptions.find(
      (o) => o.value === studentStatusId && o.value !== "0",
    );
    if (st?.label) parts.push(st.label);
    const cat = feeCategories.find(
      (o) => o.value === feeCategoryId && o.value !== "0",
    );
    if (cat?.label) parts.push(cat.label);
    const part = feeParticulars.find(
      (o) => o.value === feeParticularId && o.value !== "0",
    );
    if (part?.label) parts.push(part.label);
    return parts.join("/");
  };

  const handleGetList = async () => {
    if (!flag) {
      toastInfo("Fee Due List Flag is required");
      return;
    }
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!cr) {
      toastInfo("Course is required");
      return;
    }

    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);

    try {
      const raw = await fetchFeeDueListScholarshipHold({
        flag,
        collegeId: cid,
        courseId: cr,
        courseGroupId: Number(courseGroupId ?? 0),
        courseYearId: Number(courseYearId ?? 0),
        quotaId: Number(quotaId ?? 0),
        feeTypeId: pivot ? 0 : 1,
        studentId: 0,
        feeCategoryId: Number(feeCategoryId ?? 0),
        feeParticularId: Number(feeParticularId ?? 0),
        studentStatusId: Number(studentStatusId ?? 0),
        batchId: Number(batchId ?? 0),
        includeScholarship,
      });

      if (raw.length === 0) {
        toastInfo("No due list records found.");
        return;
      }

      if (pivot) {
        setPivotRows(buildPivotRows(raw));
        setFlatRows([]);
      } else {
        setFlatRows(
          raw.map((r, i) => ({
            ...r,
            firstName: String(r.Student_Name ?? r.firstName ?? ""),
            __rowKey: `${String(r.hallticket_number ?? "")}-${i}`,
          })),
        );
        setPivotRows([]);
      }
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const handlePrintReport = () => {
    const collegeLabel =
      collegeOptions.find((o) => o.value === collegeId)?.label || "";

    // Build columns including S.No
    const columns = [
      { key: "siNo", header: "SI.No" },
      ...columnDefs
        .filter(
          (col: any) =>
            !col.children && col.headerName && col.headerName !== "SI.No",
        )
        .map((col: any) => ({
          key:
            col.field ||
            col.headerName?.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          header: col.headerName || "",
        })),
    ];

    // Add S.No to rows
    const rowsWithIndex = rowData.map((row: any, idx: number) => ({
      ...row,
      siNo: idx + 1,
    }));

    const tableHtml = buildHtmlTable(columns as any, rowsWithIndex as any);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Fee Due List Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0 0 6px}
.details{font-size:12px;color:#666;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2;font-weight:600}
</style></head><body>
<div class="header">
  <img src="${collegeLogo}" alt="College Logo" onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(collegeLabel)}</p>
    ${dataDetails ? `<p class="details">${escapeHtml(dataDetails)}</p>` : ""}
    <p class="title">Fee Due List Report</p>
  </div>
</div>
${tableHtml}
</body></html>`;

    printHtmlInIframe(html);
  };

  const pageTitle =
    showTable && dataDetails ? `Fee Due List (${dataDetails})` : "Fee Due List";

  const flatColumnDefs = useMemo<ColDef<DueListRow>[]>(
    () => [
      FLAT_COL_DEFS.siNo,
      { ...FLAT_COL_DEFS.student, cellRenderer: studentRenderer },
      FLAT_COL_DEFS.mobile,
      FLAT_COL_DEFS.gross,
      FLAT_COL_DEFS.discount,
      FLAT_COL_DEFS.collegeFee,
      FLAT_COL_DEFS.scholarshipHold,
      FLAT_COL_DEFS.scholarship,
      FLAT_COL_DEFS.paid,
      FLAT_COL_DEFS.collegeDue,
      FLAT_COL_DEFS.balance,
    ],
    [],
  );

  const pivotColumnDefs = useMemo(() => buildPivotColumnDefs(), []);

  const rowData = pivot ? (pivotRows as DueListRow[]) : flatRows;
  const columnDefs = pivot ? pivotColumnDefs : flatColumnDefs;

  return (
    <FilteredListPage<DueListRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[12rem] sm:w-[16rem]">
              <Select
                label="Fee Due List Flag"
                required
                value={flag}
                onChange={onFlagChange}
                options={flagOptions}
                placeholder="Fee Due List Flag"
              />
            </div>
            {flagNo !== 1 ? (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={pivot}
                  onCheckedChange={(c) => {
                    setPivot(c === true);
                    clearResults();
                  }}
                />
                Pivot
              </label>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              label="Course"
              required
              value={courseId}
              onChange={onCourseChange}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v ?? "0");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
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
              disabled={!courseId}
            />
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
            <Select
              label="Batch"
              value={batchId}
              onChange={(v) => {
                setBatchId(v ?? "0");
                clearResults();
              }}
              options={batches}
              placeholder="Batch"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[12rem] sm:w-[16rem]">
              <Select
                label="Student Status"
                value={studentStatusId}
                onChange={(v) => {
                  setStudentStatusId(v ?? "0");
                  clearResults();
                }}
                options={statusOptions}
                placeholder="Student Status"
              />
            </div>
            {flagNo > 1 ? (
              <>
                <div className="w-full min-w-[12rem] sm:w-[14rem]">
                  <Select
                    label="Fee Category"
                    value={feeCategoryId}
                    onChange={(v) => {
                      setFeeCategoryId(v ?? "0");
                      clearResults();
                    }}
                    options={feeCategories}
                    placeholder="Fee Category"
                  />
                </div>
                <div className="w-full min-w-[12rem] sm:w-[14rem]">
                  <Select
                    label="Fee Particular"
                    value={feeParticularId}
                    onChange={(v) => {
                      setFeeParticularId(v ?? "0");
                      clearResults();
                    }}
                    options={feeParticulars}
                    placeholder="Fee Particular"
                  />
                </div>
              </>
            ) : null}
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={includeScholarship}
                onCheckedChange={(c) => setIncludeScholarship(c === true)}
              />
              Include Scholarship
            </label>
            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get Due List"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-fit px-4"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={rowData}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        searchFields: [
          "firstName",
          "hallticket_number",
          "Student_Mobile",
          "Student_Name",
        ],
        exportExcel: true,
        exportPdf: false,
        excelDocumentTitle: pageTitle,
        excelFileName: "Fee Due Report.xls",
      }}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => handlePrintReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
      getRowId={(p) =>
        String(
          p.data?.__rowKey ??
            `${p.data?.hallticket_number ?? ""}-${p.data?.firstName ?? ""}`,
        )
      }
    />
  );
}
