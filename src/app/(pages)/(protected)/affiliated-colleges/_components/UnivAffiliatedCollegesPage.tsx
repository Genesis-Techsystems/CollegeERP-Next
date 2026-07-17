"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Eye, Printer } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedCollegeSummaryReport } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import {
  setUnivAffiliatedContext,
  UNIV_AFFILIATED_STORAGE,
} from "../_lib/univ-affiliated-storage";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

function pickNum(
  row: AffiliatedSummaryRow | Record<string, unknown>,
  key: string,
): number {
  const n = Number(row[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function enrichSummaryRow(
  row: AffiliatedSummaryRow,
  filters: ReturnType<typeof useAffiliatedCascade>,
): AffiliatedSummaryRow {
  return {
    ...row,
    fk_college_id: pickNum(row, "fk_college_id") || (filters.collegeId ?? 0),
    fk_academic_year_id:
      pickNum(row, "fk_academic_year_id") || (filters.academicYearId ?? 0),
    fk_course_id: pickNum(row, "fk_course_id") || (filters.courseId ?? 0),
    fk_course_group_id:
      pickNum(row, "fk_course_group_id") || (filters.courseGroupId ?? 0),
    fk_course_year_id:
      pickNum(row, "fk_course_year_id") || (filters.courseYearId ?? 0),
    college_code:
      row.college_code ??
      filters.colleges.find(
        (c) => pickNum(c, "fk_college_id") === filters.collegeId,
      )?.college_code,
    academic_year:
      row.academic_year ??
      filters.academicYears.find(
        (a) => pickNum(a, "fk_academic_year_id") === filters.academicYearId,
      )?.academic_year,
    course_code:
      row.course_code ??
      filters.courses.find(
        (c) => pickNum(c, "fk_course_id") === filters.courseId,
      )?.course_code,
    group_code:
      row.group_code ??
      filters.courseGroups.find(
        (g) => pickNum(g, "fk_course_group_id") === filters.courseGroupId,
      )?.group_code,
    course_year_code:
      row.course_year_code ??
      filters.courseYears.find(
        (y) => pickNum(y, "fk_course_year_id") === filters.courseYearId,
      )?.course_year_name,
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AffiliatedSummaryRow>,
  fileType: {
    headerName: "Uploaded File Type",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => String(p.data?.file_name ?? ""),
  } as ColDef<AffiliatedSummaryRow>,
  count: {
    headerName: "Uploaded Files Count",
    minWidth: 140,
    valueGetter: (p) => String(p.data?.cnt ?? ""),
  } as ColDef<AffiliatedSummaryRow>,
  actions: {
    headerName: "Action",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<AffiliatedSummaryRow>,
};

function makeViewRenderer(
  onView: (row: AffiliatedSummaryRow) => void,
): (p: ICellRendererParams<AffiliatedSummaryRow>) => ReactNode {
  return (p) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="View"
      onClick={() => {
        if (p.data) onView(p.data);
      }}
    >
      <Eye className="h-4 w-4 text-primary" />
    </Button>
  );
}

export function UnivAffiliatedCollegesPage() {
  const router = useRouter();
  const cascade = useAffiliatedCascade({
    examFilters: true,
    allowAllGroupYear: true,
    autoSelectFirst: true,
  });
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const orgCode =
    typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? (globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.collegeSummary(
      "uploaded_files_summary",
      loadKey ? JSON.parse(loadKey) : {},
    ),
    queryFn: () => {
      const f = JSON.parse(loadKey!) as Record<string, number>;
      return getAffiliatedCollegeSummaryReport({
        inFlag: "uploaded_files_summary",
        collegeId: f.collegeId,
        academicYearId: f.academicYearId,
        courseId: f.courseId,
        courseGroupId: f.courseGroupId,
        courseYearId: f.courseYearId,
      });
    },
    enabled: loadKey != null,
  });

  const dataDetails = loadKey ? cascade.contextLabel : "";
  const showTable = loadKey != null;

  const openUploadedFiles = (row: AffiliatedSummaryRow) => {
    setUnivAffiliatedContext(
      UNIV_AFFILIATED_STORAGE.uploadedFilesSummary,
      enrichSummaryRow(row, cascade),
    );
    router.push(
      "/affiliated-colleges/university-affiliated-colleges/view-uploaded-files",
    );
  };

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.fileType,
      COL_DEFS.count,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeViewRenderer(openUploadedFiles),
      },
    ],
    // openUploadedFiles closes over cascade — recreate when cascade ids change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      cascade.collegeId,
      cascade.academicYearId,
      cascade.courseId,
      cascade.courseGroupId,
      cascade.courseYearId,
    ],
  );

  function handlePrint() {
    if (!showTable || rows.length === 0) return;
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  }

  if (isPrintMode) {
    return (
      <div className="print-content p-4">
        {orgCode === "SUK" ? (
          <div className="mb-4 text-center text-sm text-muted-foreground">
            <p className="font-semibold">SUK</p>
          </div>
        ) : null}
        <strong className="block mb-2">
          Affiliated Colleges Data
          {dataDetails ? (
            <span className="text-blue-600 font-medium"> — {dataDetails}</span>
          ) : null}
        </strong>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Sl.no</th>
              <th className="border p-2 text-left">Uploaded File Type</th>
              <th className="border p-2 text-left">Uploaded Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border p-2">{i + 1}</td>
                <td className="border p-2">{String(row.file_name ?? "")}</td>
                <td className="border p-2">{String(row.cnt ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <FilteredListPage
      title={
        showTable && dataDetails
          ? `Affiliated Colleges Data — ${dataDetails}`
          : "University Affiliated Colleges"
      }
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      filters={
        <AffiliatedCollegeFilters
          title="University Affiliated Colleges"
          cascade={cascade}
          allowAllGroupYear
          onGetDetails={() => {
            if (!cascade.filtersValid) return;
            setLoadKey(JSON.stringify(cascade.toFilterParams()));
          }}
          loadingDetails={isFetching}
          bare
        />
      }
      filtersCollapsible={false}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination={showTable}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportPdf: false,
        columnPicker: false,
      }}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
