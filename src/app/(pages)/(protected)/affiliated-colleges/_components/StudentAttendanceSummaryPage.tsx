"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/common/components/date-picker";
import { toDateOnlyISO } from "@/common/generic-functions";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedAttendanceUploadSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { getAffiliatedConfig } from "../_lib/route-config";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  buildAffiliatedAttendanceSummaryContext,
  contextToAttendanceInitialSelection,
  parseAttendanceContextDate,
  readAffiliatedAttendanceSummaryContext,
  saveAffiliatedAttendanceSummaryContext,
} from "../_lib/affiliated-attendance-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

function summaryText(
  p: ValueGetterParams<AffiliatedSummaryRow>,
  ...keys: string[]
) {
  return pickAffiliatedText(p.data ?? {}, keys);
}

const COL_DEFS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AffiliatedSummaryRow>,
  courseCode: {
    field: "course_code",
    headerName: "Course Code",
    minWidth: 110,
  } as ColDef<AffiliatedSummaryRow>,
  groupCode: {
    headerName: "Course Group Code",
    minWidth: 150,
    valueGetter: (p) =>
      summaryText(p, "group_code", "groupCode", "group_name", "groupName"),
  } as ColDef<AffiliatedSummaryRow>,
  courseYearCode: {
    field: "course_year_code",
    headerName: "Course Year Code",
    minWidth: 130,
  } as ColDef<AffiliatedSummaryRow>,
  subjectsUploaded: {
    headerName: "Total Subjects Attendance Uploaded Count",
    minWidth: 220,
    valueGetter: (p) =>
      summaryText(
        p,
        "total_subjects_attendance_uploaded_count",
        "totalSubjectsAttendanceUploadedCount",
      ),
  } as ColDef<AffiliatedSummaryRow>,
  studentSubjectsUploaded: {
    headerName: "Total Student Subject Attendance Uploaded Count",
    minWidth: 260,
    valueGetter: (p) =>
      summaryText(
        p,
        "total_student_subject_attendance_uploaded_count",
        "totalStudentSubjectAttendanceUploadedCount",
      ),
  } as ColDef<AffiliatedSummaryRow>,
  actions: {
    headerName: "Action",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<AffiliatedSummaryRow>,
};

function makeUploadRenderer(
  uploadPath: string | undefined,
  router: ReturnType<typeof useRouter>,
  collegeId: number | null,
  academicYearId: number | null,
  fromDate: string,
  toDate: string,
) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    if (!uploadPath) return null;
    const row = p.data;
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => {
          if (!row || !collegeId || !academicYearId) return;
          const ctx = buildAffiliatedAttendanceSummaryContext(
            row,
            collegeId,
            academicYearId,
            fromDate,
            toDate,
          );
          saveAffiliatedAttendanceSummaryContext(ctx);
          const q = new URLSearchParams({
            collegeId: String(ctx.fk_college_id),
            academicYearId: String(ctx.fk_academic_year_id),
            courseId: String(ctx.fk_course_id),
            courseGroupId: String(ctx.fk_course_group_id),
            courseYearId: String(ctx.fk_course_year_id),
            fromDate: ctx.fdate,
            toDate: ctx.tdate,
          });
          router.push(`/affiliated-colleges/${uploadPath}?${q.toString()}`);
        }}
      >
        Upload
      </Button>
    );
  };
}

export function StudentAttendanceSummaryPage() {
  const config = getAffiliatedConfig("student-attendance-summary");
  const router = useRouter();
  const summaryContext = useMemo(
    () => readAffiliatedAttendanceSummaryContext(),
    [],
  );
  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !summaryContext,
    timetableFilters: true,
    scopeByAcademicYear: true,
    initialSelection: summaryContext
      ? contextToAttendanceInitialSelection(summaryContext)
      : undefined,
  });

  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const seeded = parseAttendanceContextDate(summaryContext?.fdate);
    return seeded ?? new Date();
  });
  const [toDate, setToDate] = useState<Date | null>(() => {
    const seeded = parseAttendanceContextDate(summaryContext?.tdate);
    return seeded ?? new Date();
  });
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const fromDateYmd = fromDate ? toDateOnlyISO(fromDate) : "";
  const toDateYmd = toDate ? toDateOnlyISO(toDate) : "";

  const {
    data: rawRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.attendanceUploadSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, string | number>) : {},
    ),
    queryFn: () => {
      const parsed = JSON.parse(loadKey!) as {
        collegeId: number;
        academicYearId: number;
        courseId: number;
        courseGroupId: number;
        courseYearId: number;
        fromDate: string;
        toDate: string;
      };
      return getAffiliatedAttendanceUploadSummary(parsed);
    },
    enabled: loadKey != null,
  });

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.courseCode,
      COL_DEFS.groupCode,
      COL_DEFS.courseYearCode,
      COL_DEFS.subjectsUploaded,
      COL_DEFS.studentSubjectsUploaded,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeUploadRenderer(
          config.uploadPath,
          router,
          cascade.collegeId,
          cascade.academicYearId,
          fromDateYmd,
          toDateYmd,
        ),
      },
    ],
    [
      config.uploadPath,
      router,
      cascade.collegeId,
      cascade.academicYearId,
      fromDateYmd,
      toDateYmd,
    ],
  );

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError(
        "Select college, academic year, course, group, and year.",
      );
      return;
    }
    if (!fromDate || !toDate) {
      toastError("Select from date and to date.");
      return;
    }
    setLoadKey(
      JSON.stringify({
        ...cascade.toFilterParams(),
        fromDate: toDateOnlyISO(fromDate),
        toDate: toDateOnlyISO(toDate),
      }),
    );
  }

  const showTable = loadKey != null;

  return (
    <FilteredListPage
      title={config.title}
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      filters={
        <AffiliatedCollegeFilters
          title={config.title}
          cascade={cascade}
          onGetDetails={handleGetDetails}
          loadingDetails={isFetching}
          allowAllGroupYear
          showBack={config.showBackToHub}
          onBack={() =>
            router.push("/affiliated-colleges/college-bulk-uploads")
          }
          footerExtraAlign="start"
          footerExtra={
            <>
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
            </>
          }
          bare
        />
      }
      rowData={showTable ? rawRows : []}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination={showTable}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: config.title,
      }}
    />
  );
}
