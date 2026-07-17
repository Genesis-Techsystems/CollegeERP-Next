"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { getCollegeUploadsApprovalSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { formatAffiliatedDateTime } from "../_lib/format-affiliated-datetime";
import {
  setApprovalUploadContext,
  storageKeyForFileType,
} from "../_lib/approval-upload-storage";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

type AnyRow = AffiliatedSummaryRow;

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function text(p: ValueGetterParams<AnyRow>, key: string): string {
  return String(p.data?.[key] ?? "");
}

const VIEW_ROUTES: Record<number, string> = {
  718: "view-student-data",
  719: "view-std-subjects",
  720: "view-std-attendance",
  722: "view-std-registration",
  723: "view-std-examfee",
  721: "view-std-fee",
  724: "view-std-marks",
};

const COL_DEFS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  collegeCode: {
    headerName: "College Code",
    minWidth: 110,
    valueGetter: (p) => text(p, "college_code"),
  } as ColDef<AnyRow>,
  courseCode: {
    headerName: "Course Code",
    minWidth: 110,
    valueGetter: (p) => text(p, "course_code"),
  } as ColDef<AnyRow>,
  groupCode: {
    headerName: "CourseGroup Code",
    minWidth: 140,
    valueGetter: (p) => text(p, "group_code"),
  } as ColDef<AnyRow>,
  yearCode: {
    headerName: "CourseYear Code",
    minWidth: 120,
    valueGetter: (p) => text(p, "course_year_code"),
  } as ColDef<AnyRow>,
  fileType: {
    headerName: "Uploaded File Type",
    minWidth: 160,
    valueGetter: (p) => text(p, "type_name"),
  } as ColDef<AnyRow>,
  count: {
    headerName: "Uploaded Count",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => text(p, "count"),
  } as ColDef<AnyRow>,
  dateTime: {
    headerName: "Date & Time",
    minWidth: 160,
    valueGetter: (p) => formatAffiliatedDateTime(p.data?.fileuploaded_date),
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Action",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<AnyRow>,
};

function makeViewRenderer(onView: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-primary"
      title="Preview"
      onClick={() => p.data && onView(p.data)}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}

export function CollegeUploadsApprovalPage() {
  const router = useRouter();
  const cascade = useAffiliatedCascade({
    examFilters: true,
    requireGroupYear: false,
    allowAllGroupYear: true,
  });
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.uploadsApprovalSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () => {
      const f = JSON.parse(loadKey!) as {
        collegeId: number;
        academicYearId: number;
        courseId: number;
      };
      return getCollegeUploadsApprovalSummary(f);
    },
    enabled: loadKey != null,
  });

  const dataDetails = useMemo(() => {
    if (!loadKey) return "";
    const parts: string[] = [];
    const college = cascade.colleges.find(
      (c) => pickNum(c, "fk_college_id") === cascade.collegeId,
    );
    if (college) parts.push(String(college.college_code ?? ""));
    const ay = cascade.academicYears.find(
      (a) => pickNum(a, "fk_academic_year_id") === cascade.academicYearId,
    );
    if (ay) parts.push(String(ay.academic_year ?? ""));
    const course = cascade.courses.find(
      (c) => pickNum(c, "fk_course_id") === cascade.courseId,
    );
    if (course) parts.push(String(course.course_code ?? ""));
    return parts.filter(Boolean).join(" / ");
  }, [
    loadKey,
    cascade.colleges,
    cascade.academicYears,
    cascade.courses,
    cascade.collegeId,
    cascade.academicYearId,
    cascade.courseId,
  ]);

  function openDetail(row: AnyRow) {
    const typeId = pickNum(row, "fk_filetype_catdet_id");
    const storageKey = storageKeyForFileType(typeId);
    const segment = VIEW_ROUTES[typeId];
    if (!storageKey || !segment) return;
    setApprovalUploadContext(storageKey, row);
    router.push(`/affiliated-colleges/college-uploads-approval/${segment}`);
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.courseCode,
      COL_DEFS.groupCode,
      COL_DEFS.yearCode,
      COL_DEFS.fileType,
      COL_DEFS.count,
      COL_DEFS.dateTime,
      { ...COL_DEFS.actions, cellRenderer: makeViewRenderer(openDetail) },
    ],
    // openDetail closes over router; stable enough for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const showTable = loadKey != null;

  return (
    <FilteredListPage
      title="College Uploads Approval"
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      filters={
        <AffiliatedCollegeFilters
          title="College Uploads Approval"
          cascade={cascade}
          hideGroupYear
          allowAllGroupYear
          onGetDetails={() => {
            if (!cascade.filtersValid) return;
            setLoadKey(
              JSON.stringify({
                collegeId: cascade.collegeId ?? 0,
                academicYearId: cascade.academicYearId ?? 0,
                courseId: cascade.courseId ?? 0,
              }),
            );
          }}
          loadingDetails={isFetching}
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
        pdfDocumentTitle: dataDetails
          ? `Affiliated Colleges Data : ${dataDetails}`
          : "Affiliated Colleges Approval",
      }}
    />
  );
}
