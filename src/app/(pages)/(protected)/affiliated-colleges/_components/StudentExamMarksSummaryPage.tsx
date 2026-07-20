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
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedExamMarksSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { getAffiliatedConfig } from "../_lib/route-config";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  buildAffiliatedExamMarksSummaryContext,
  contextToExamMarksInitialSelection,
  readAffiliatedExamMarksSummaryContext,
  saveAffiliatedExamMarksSummaryContext,
  type AffiliatedExamMarksKind,
} from "../_lib/affiliated-exam-marks-summary-context";
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
  regulation: {
    headerName: "Regulation Code",
    minWidth: 120,
    valueGetter: (p) =>
      summaryText(p, "regulation_code", "regulationCode", "regulationcode"),
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
  totalStudents: {
    headerName: "Total Students",
    minWidth: 120,
    valueGetter: (p) =>
      summaryText(p, "total_student_count", "totalStudentCount"),
  } as ColDef<AffiliatedSummaryRow>,
  registeredSubjects: {
    headerName: "Registered Subjects",
    minWidth: 140,
    valueGetter: (p) =>
      summaryText(p, "total_student_subjects", "totalStudentSubjects"),
  } as ColDef<AffiliatedSummaryRow>,
  enrolledInExam: {
    headerName: "Student Enrolled In Exam",
    minWidth: 160,
    valueGetter: (p) =>
      summaryText(
        p,
        "total_student_enrolled_in_exam",
        "totalStudentEnrolledInExam",
      ),
  } as ColDef<AffiliatedSummaryRow>,
  subjectsEnrolled: {
    headerName: "Student Subjects Enrolled In Exam",
    minWidth: 200,
    valueGetter: (p) =>
      summaryText(
        p,
        "total_student_subjects_enrolled_in_exam",
        "totalStudentSubjectsEnrolledInExam",
      ),
  } as ColDef<AffiliatedSummaryRow>,
  marksUpdated: {
    headerName: "Marks Entered Count",
    minWidth: 140,
    valueGetter: (p) =>
      summaryText(p, "total_marks_updated", "totalMarksUpdated"),
  } as ColDef<AffiliatedSummaryRow>,
  marksDue: {
    headerName: "Marks Due Count",
    minWidth: 130,
    valueGetter: (p) => summaryText(p, "total_marks_due", "totalMarksDue"),
  } as ColDef<AffiliatedSummaryRow>,
  actions: {
    headerName: "Status",
    minWidth: 100,
    flex: 0,
    width: 110,
  } as ColDef<AffiliatedSummaryRow>,
};

function makeUploadRenderer(
  uploadPath: string | undefined,
  router: ReturnType<typeof useRouter>,
  collegeId: number | null,
  academicYearId: number | null,
  examId: number | null,
  kind: AffiliatedExamMarksKind,
) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    if (!uploadPath) return null;
    const row = p.data;
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => {
          if (!row || !collegeId || !academicYearId || !examId) return;
          const ctx = buildAffiliatedExamMarksSummaryContext(
            row,
            collegeId,
            academicYearId,
            examId,
            kind,
          );
          saveAffiliatedExamMarksSummaryContext(ctx);
          const q = new URLSearchParams({
            collegeId: String(ctx.fk_college_id),
            academicYearId: String(ctx.fk_academic_year_id),
            courseId: String(ctx.fk_course_id),
            courseGroupId: String(ctx.fk_course_group_id),
            courseYearId: String(ctx.fk_course_year_id),
            examId: String(ctx.fk_exam_id),
          });
          router.push(`/affiliated-colleges/${uploadPath}?${q.toString()}`);
        }}
      >
        Upload
      </Button>
    );
  };
}

const SUMMARY_SLUG: Record<AffiliatedExamMarksKind, string> = {
  internal: "student-internal-maks-summary",
  external: "student-external-marks-summary",
};

type StudentExamMarksSummaryPageProps = {
  kind: AffiliatedExamMarksKind;
};

export function StudentExamMarksSummaryPage({
  kind,
}: StudentExamMarksSummaryPageProps) {
  const config = getAffiliatedConfig(SUMMARY_SLUG[kind]);
  const router = useRouter();
  const summaryContext = useMemo(
    () => readAffiliatedExamMarksSummaryContext(kind),
    [kind],
  );
  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !summaryContext,
    examFilters: true,
    courseFirstCascade: true,
    examKind: kind,
    initialSelection: summaryContext
      ? contextToExamMarksInitialSelection(summaryContext)
      : undefined,
  });

  const [loadKey, setLoadKey] = useState<string | null>(null);

  const {
    data: rawRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.examMarksSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () => {
      const parsed = JSON.parse(loadKey!) as {
        collegeId: number;
        academicYearId: number;
        courseId: number;
        courseGroupId: number;
        courseYearId: number;
        examId: number;
      };
      return getAffiliatedExamMarksSummary(parsed);
    },
    enabled: loadKey != null,
  });

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.courseCode,
      COL_DEFS.regulation,
      COL_DEFS.groupCode,
      COL_DEFS.courseYearCode,
      COL_DEFS.totalStudents,
      COL_DEFS.registeredSubjects,
      COL_DEFS.enrolledInExam,
      COL_DEFS.subjectsEnrolled,
      COL_DEFS.marksDue,
      COL_DEFS.marksUpdated,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeUploadRenderer(
          config.uploadPath,
          router,
          cascade.collegeId,
          cascade.academicYearId,
          cascade.examId,
          kind,
        ),
      },
    ],
    [
      config.uploadPath,
      router,
      cascade.collegeId,
      cascade.academicYearId,
      cascade.examId,
      kind,
    ],
  );

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError("Select course, exam year, exam, college, group, and year.");
      return;
    }
    setLoadKey(JSON.stringify(cascade.toFilterParams()));
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
          showExam
          courseFirst
          showBack={config.showBackToHub}
          onBack={() =>
            router.push("/affiliated-colleges/college-bulk-uploads")
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
