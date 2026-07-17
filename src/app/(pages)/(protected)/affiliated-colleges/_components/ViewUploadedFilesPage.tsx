"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Eye, Printer } from "lucide-react";
import { UNIV_BULK_UPLOAD_TYPES } from "@/common/affiliated-colleges-constants";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedCollegeSummaryReport } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { formatAffiliatedDateTime } from "../_lib/format-affiliated-datetime";
import {
  buildUnivDataDetails,
  getUnivAffiliatedContext,
  setUnivAffiliatedContext,
  UNIV_AFFILIATED_STORAGE,
} from "../_lib/univ-affiliated-storage";

type AnyRow = AffiliatedSummaryRow;

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fileTypeId(row: AnyRow): number {
  return pickNum(row, "fk_filetype_catdet_id");
}

function routeForFileType(typeId: number): string | null {
  switch (typeId) {
    case UNIV_BULK_UPLOAD_TYPES.STUDENT:
      return "view-students-data";
    case UNIV_BULK_UPLOAD_TYPES.SUBJECT:
      return "view-subjects-data";
    case UNIV_BULK_UPLOAD_TYPES.ATTENDANCE:
      return "view-attendance-data";
    case UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION:
      return "view-exam-reg-data";
    case UNIV_BULK_UPLOAD_TYPES.EXAM_FEE:
      return "view-exam-fee-data";
    case UNIV_BULK_UPLOAD_TYPES.STUDENT_FEE:
      return "view-student-fee-data";
    case UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS:
      return "view-student-marks-data";
    default:
      return null;
  }
}

function storageKeyForFileType(
  typeId: number,
):
  | (typeof UNIV_AFFILIATED_STORAGE)[keyof typeof UNIV_AFFILIATED_STORAGE]
  | null {
  switch (typeId) {
    case UNIV_BULK_UPLOAD_TYPES.STUDENT:
      return UNIV_AFFILIATED_STORAGE.studentBulk;
    case UNIV_BULK_UPLOAD_TYPES.SUBJECT:
      return UNIV_AFFILIATED_STORAGE.subjectBulk;
    case UNIV_BULK_UPLOAD_TYPES.ATTENDANCE:
      return UNIV_AFFILIATED_STORAGE.attendanceBulk;
    case UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION:
      return UNIV_AFFILIATED_STORAGE.examRegBulk;
    case UNIV_BULK_UPLOAD_TYPES.EXAM_FEE:
      return UNIV_AFFILIATED_STORAGE.examFeeBulk;
    case UNIV_BULK_UPLOAD_TYPES.STUDENT_FEE:
      return UNIV_AFFILIATED_STORAGE.studentFeeBulk;
    case UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS:
      return UNIV_AFFILIATED_STORAGE.examMarksBulk;
    default:
      return null;
  }
}

function cellText(p: ValueGetterParams<AnyRow>, key: string): string {
  return String(p.data?.[key] ?? "");
}

function makeViewRenderer(
  onView: (row: AnyRow) => void,
): (p: ICellRendererParams<AnyRow>) => ReactNode {
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

function buildColumnDefs(
  typeId: number,
  onView: (row: AnyRow) => void,
): ColDef<AnyRow>[] {
  const cols: ColDef<AnyRow>[] = [
    { headerName: "SNo", valueGetter: rowIndexGetter, width: 70, flex: 0 },
    {
      headerName: "Uploaded Count",
      minWidth: 120,
      valueGetter: (p) => cellText(p, "total_records"),
    },
    {
      headerName: "Uploaded Students Count",
      minWidth: 160,
      valueGetter: (p) => cellText(p, "no_of_students_count"),
    },
  ];

  if (typeId === UNIV_BULK_UPLOAD_TYPES.ATTENDANCE) {
    cols.push(
      {
        headerName: "From Date",
        minWidth: 110,
        valueGetter: (p) => cellText(p, "from_date"),
      },
      {
        headerName: "To Date",
        minWidth: 110,
        valueGetter: (p) => cellText(p, "to_date"),
      },
    );
  } else if (
    typeId === UNIV_BULK_UPLOAD_TYPES.EXAM_FEE ||
    typeId === UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS
  ) {
    cols.push({
      headerName: "Exam Name",
      minWidth: 140,
      valueGetter: (p) => cellText(p, "exam_name"),
    });
  } else if (typeId === UNIV_BULK_UPLOAD_TYPES.SUBJECT) {
    cols.push({
      headerName: "Regulation",
      minWidth: 120,
      valueGetter: (p) => cellText(p, "regulation_code"),
    });
  }

  cols.push(
    {
      headerName: "Uploaded Date & Time",
      minWidth: 160,
      valueGetter: (p) => formatAffiliatedDateTime(p.data?.upload_date),
    },
    {
      headerName: "Verified Date & Time",
      minWidth: 160,
      valueGetter: (p) => formatAffiliatedDateTime(p.data?.verified_date),
    },
    {
      headerName: "Submitted Date & Time",
      minWidth: 160,
      valueGetter: (p) => formatAffiliatedDateTime(p.data?.submitted_date),
    },
    {
      headerName: "Approved Date & Time",
      minWidth: 160,
      valueGetter: (p) => formatAffiliatedDateTime(p.data?.approved_date),
    },
    {
      headerName: "Action",
      minWidth: 90,
      flex: 0,
      width: 90,
      cellRenderer: makeViewRenderer(onView),
    },
  );

  return cols;
}

export function ViewUploadedFilesPage() {
  const router = useRouter();
  const [params, setParams] = useState<AnyRow | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const orgCode =
    typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? (globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  useEffect(() => {
    const ctx = getUnivAffiliatedContext(
      UNIV_AFFILIATED_STORAGE.uploadedFilesSummary,
    );
    if (!ctx) {
      router.replace("/affiliated-colleges/university-affiliated-colleges");
      return;
    }
    setParams(ctx);
  }, [router]);

  const summaryParams = useMemo(() => {
    if (!params) return null;
    return {
      collegeId: pickNum(params, "fk_college_id"),
      academicYearId: pickNum(params, "fk_academic_year_id"),
      courseId: pickNum(params, "fk_course_id"),
      courseGroupId: pickNum(params, "fk_course_group_id"),
      courseYearId: pickNum(params, "fk_course_year_id"),
      filetypeCatdetId: pickNum(params, "fk_filetype_catdet_id"),
    };
  }, [params]);

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.collegeSummary(
      "uploaded_file_details",
      summaryParams ?? {},
    ),
    queryFn: () =>
      getAffiliatedCollegeSummaryReport({
        inFlag: "uploaded_file_details",
        collegeId: summaryParams!.collegeId,
        academicYearId: summaryParams!.academicYearId,
        courseId: summaryParams!.courseId,
        courseGroupId: summaryParams!.courseGroupId,
        courseYearId: summaryParams!.courseYearId,
        filetypeCatdetId: summaryParams!.filetypeCatdetId,
      }),
    enabled: summaryParams != null && summaryParams.collegeId > 0,
  });

  const fileType = rows[0]
    ? fileTypeId(rows[0])
    : pickNum(params ?? {}, "fk_filetype_catdet_id");
  const dataDetails = params ? buildUnivDataDetails(params) : "";

  const openDetail = (row: AnyRow) => {
    const typeId = fileTypeId(row);
    const segment = routeForFileType(typeId);
    const storageKey = storageKeyForFileType(typeId);
    if (!segment || !storageKey) return;
    setUnivAffiliatedContext(storageKey, { ...params, ...row });
    router.push(
      `/affiliated-colleges/university-affiliated-colleges/${segment}`,
    );
  };

  const columnDefs = useMemo(
    () => buildColumnDefs(fileType, openDetail),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileType, params],
  );

  const printColumns = useMemo(
    () => columnDefs.filter((c) => c.headerName !== "Action"),
    [columnDefs],
  );

  const goBack = () => {
    if (params)
      setUnivAffiliatedContext(
        UNIV_AFFILIATED_STORAGE.uploadedFilesSummary,
        params,
      );
    router.push("/affiliated-colleges/university-affiliated-colleges");
  };

  function handlePrint() {
    if (rows.length === 0) return;
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  }

  if (!params) return null;

  if (isPrintMode) {
    return (
      <div className="print-content p-4">
        {orgCode === "SUK" ? (
          <p className="font-semibold text-center mb-2">SUK</p>
        ) : null}
        <strong className="block">Affiliated Colleges Data</strong>
        {dataDetails ? (
          <strong className="block text-blue-600">— {dataDetails}</strong>
        ) : null}
        <table className="w-full border-collapse text-sm mt-4">
          <thead>
            <tr>
              {printColumns.map((c) => (
                <th key={String(c.headerName)} className="border p-2 text-left">
                  {c.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {printColumns.map((c) => {
                  const value =
                    c.headerName === "SNo"
                      ? i + 1
                      : typeof c.valueGetter === "function"
                        ? (
                            c.valueGetter as (
                              p: ValueGetterParams<AnyRow>,
                            ) => string
                          )({
                            data: row,
                          } as ValueGetterParams<AnyRow>)
                        : "";
                  return (
                    <td key={String(c.headerName)} className="border p-2">
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ListPage
      title={
        dataDetails
          ? `Affiliated Colleges Data — ${dataDetails}`
          : "Affiliated Colleges Data"
      }
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportPdf: false,
        columnPicker: false,
      }}
      toolbarTrailing={
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
            onClick={goBack}
          >
            Back
          </Button>
        </div>
      }
    />
  );
}
