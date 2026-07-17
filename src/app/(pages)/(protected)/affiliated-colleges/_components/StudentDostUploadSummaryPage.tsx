"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedDostUploadSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import { buildAffiliatedSummaryContext } from "../_lib/affiliated-summary-context";
import {
  contextToDostInitialSelection,
  readAffiliatedDostSummaryContext,
  saveAffiliatedDostSummaryContext,
} from "../_lib/affiliated-dost-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

const PRINT_COLS = [
  { key: "college_code", alt: "collegeCode", label: "College Code" },
  { key: "academic_year", alt: "academicYear", label: "Academic Year" },
  { key: "course_code", alt: "courseCode", label: "Course Code" },
  { key: "group_code", alt: "groupCode", label: "Course Group" },
  { key: "course_year_code", alt: "courseYearCode", label: "Course Year" },
  {
    key: "uploaded_students_count",
    alt: "uploadedStudentsCount",
    label: "Uploaded Students Count",
  },
] as const;

function summaryText(
  p: ValueGetterParams<AffiliatedSummaryRow>,
  ...keys: string[]
) {
  return pickAffiliatedText(p.data ?? {}, keys);
}

/** Angular `StudentDostUploadSummaryComponent` columns. */
const COL_DEFS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AffiliatedSummaryRow>,
  collegeCode: {
    headerName: "College Code",
    minWidth: 120,
    valueGetter: (p) => summaryText(p, "college_code", "collegeCode"),
  } as ColDef<AffiliatedSummaryRow>,
  academicYear: {
    headerName: "Academic Year",
    minWidth: 120,
    valueGetter: (p) => summaryText(p, "academic_year", "academicYear"),
  } as ColDef<AffiliatedSummaryRow>,
  courseCode: {
    headerName: "Course Code",
    minWidth: 110,
    valueGetter: (p) => summaryText(p, "course_code", "courseCode"),
  } as ColDef<AffiliatedSummaryRow>,
  courseGroup: {
    headerName: "Course Group",
    minWidth: 130,
    valueGetter: (p) => summaryText(p, "group_code", "groupCode"),
  } as ColDef<AffiliatedSummaryRow>,
  courseYear: {
    headerName: "Course Year",
    minWidth: 110,
    valueGetter: (p) => summaryText(p, "course_year_code", "courseYearCode"),
  } as ColDef<AffiliatedSummaryRow>,
  uploadedCount: {
    headerName: "Uploaded Students Count",
    minWidth: 160,
    valueGetter: (p) =>
      summaryText(p, "uploaded_students_count", "uploadedStudentsCount"),
  } as ColDef<AffiliatedSummaryRow>,
  actions: {
    headerName: "Action",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<AffiliatedSummaryRow>,
};

function makeUploadRenderer(
  router: ReturnType<typeof useRouter>,
  universityId: number | null,
  collegeId: number | null,
  academicYearId: number | null,
) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    const row = p.data;
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => {
          if (!row || !universityId || !collegeId || !academicYearId) return;
          const summaryCtx = buildAffiliatedSummaryContext(
            row,
            collegeId,
            academicYearId,
          );
          saveAffiliatedDostSummaryContext({
            fk_university_id: universityId,
            fk_college_id: summaryCtx.fk_college_id,
            fk_academic_year_id: summaryCtx.fk_academic_year_id,
            fk_course_id: summaryCtx.fk_course_id,
            fk_course_group_id: summaryCtx.fk_course_group_id,
            fk_course_year_id: summaryCtx.fk_course_year_id,
          });
          router.push("/affiliated-colleges/college-student-dost-upload");
        }}
      >
        Upload
      </Button>
    );
  };
}

/** Angular `student-dost-upload-summary` — university + college + academic year filters + dost summary proc. */
export function StudentDostUploadSummaryPage() {
  const router = useRouter();
  const dostContext = useMemo(() => readAffiliatedDostSummaryContext(), []);
  const cascade = useAffiliatedCascade({
    requireGroupYear: false,
    requireCourse: false,
    requireUniversity: true,
    autoSelectFirst: !dostContext,
    initialSelection: dostContext
      ? contextToDostInitialSelection(dostContext)
      : undefined,
  });
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const orgCode =
    typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? (globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  useEffect(() => {
    if (!dostContext || !cascade.filtersValid) return;
    setLoadKey(
      JSON.stringify({
        collegeId: cascade.collegeId ?? 0,
        academicYearId: cascade.academicYearId ?? 0,
      }),
    );
  }, [
    dostContext,
    cascade.filtersValid,
    cascade.collegeId,
    cascade.academicYearId,
  ]);

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.dostUploadSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () =>
      getAffiliatedDostUploadSummary(
        JSON.parse(loadKey!) as { collegeId: number; academicYearId: number },
      ),
    enabled: loadKey != null,
  });

  const selectedCollege = useMemo(
    () =>
      cascade.colleges.find(
        (c) => Number(c.fk_college_id ?? c.collegeId) === cascade.collegeId,
      ),
    [cascade.colleges, cascade.collegeId],
  );

  const selectedAcademicYear = useMemo(
    () =>
      cascade.academicYears.find(
        (a) =>
          Number(a.fk_academic_year_id ?? a.academicYearId) ===
          cascade.academicYearId,
      ),
    [cascade.academicYears, cascade.academicYearId],
  );

  /** Angular `dataDetails` — collegeCode / academicYear. */
  const dataDetails = useMemo(() => {
    const parts = [
      pickAffiliatedText(selectedCollege, ["college_code", "collegeCode"]),
      pickAffiliatedText(selectedAcademicYear, [
        "academic_year",
        "academicYear",
      ]),
    ].filter(Boolean);
    return parts.join(" / ");
  }, [selectedCollege, selectedAcademicYear]);

  const collegeName = pickAffiliatedText(selectedCollege, [
    "college_name",
    "collegeName",
  ]);
  const logoFilename = pickAffiliatedText(selectedCollege, [
    "logo_filename",
    "logoFilename",
  ]);
  const logoUrl = logoFilename
    ? `${MINIO_URL}${logoFilename}`
    : DEFAULT_COLLEGE_LOGO;

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.academicYear,
      COL_DEFS.courseCode,
      COL_DEFS.courseGroup,
      COL_DEFS.courseYear,
      COL_DEFS.uploadedCount,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeUploadRenderer(
          router,
          cascade.universityId,
          cascade.collegeId,
          cascade.academicYearId,
        ),
      },
    ],
    [router, cascade.universityId, cascade.collegeId, cascade.academicYearId],
  );

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError("Select university, college and academic year.");
      return;
    }
    saveAffiliatedDostSummaryContext({
      fk_university_id: cascade.universityId ?? 0,
      fk_college_id: cascade.collegeId ?? 0,
      fk_academic_year_id: cascade.academicYearId ?? 0,
    });
    setLoadKey(
      JSON.stringify({
        collegeId: cascade.collegeId ?? 0,
        academicYearId: cascade.academicYearId ?? 0,
      }),
    );
  }

  const showTable = loadKey != null;

  /** Angular `printPage()` — browser print with report header (no Action column). */
  function handlePrint() {
    if (!showTable || rows.length === 0) {
      toastError("No records to print.");
      return;
    }
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  }

  if (isPrintMode) {
    return (
      <div className="print-content p-6">
        {orgCode === "SUK" ? (
          <div className="mb-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="mx-auto max-h-24 object-contain"
            />
            <p className="mt-3 text-[23px] font-semibold text-black">
              {collegeName}
            </p>
            <p className="text-lg font-semibold text-black">
              Student Dost Summary Report
            </p>
            {dataDetails ? (
              <p className="text-base text-black">{dataDetails}</p>
            ) : null}
          </div>
        ) : (
          <div className="mb-4 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-20 w-auto max-w-[120px] object-contain shrink-0"
            />
            <div className="flex-1 text-center">
              <p className="text-[23px] font-semibold text-black">
                {collegeName}
              </p>
              <p className="text-lg font-semibold text-black">
                Student Dost Upload Summary Report
              </p>
              {dataDetails ? (
                <p className="text-base text-black">{dataDetails}</p>
              ) : null}
            </div>
          </div>
        )}

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-400 p-2 text-left">SNo</th>
              {PRINT_COLS.map((col) => (
                <th
                  key={col.key}
                  className="border border-slate-400 p-2 text-left"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border border-slate-400 p-2">{i + 1}</td>
                {PRINT_COLS.map((col) => (
                  <td key={col.key} className="border border-slate-400 p-2">
                    {pickAffiliatedText(row, [col.key, col.alt])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <FilteredListPage
      title="Student Dost Upload Summary"
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      filters={
        <AffiliatedCollegeFilters
          title="Student Dost Upload Summary"
          cascade={cascade}
          onGetDetails={handleGetDetails}
          loadingDetails={isFetching}
          hideCourse
          showUniversity
          showBack
          onBack={() =>
            router.push("/affiliated-colleges/college-bulk-uploads")
          }
          bare
        />
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination={showTable}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportPdf: false,
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
