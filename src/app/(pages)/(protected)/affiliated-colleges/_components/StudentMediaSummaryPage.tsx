"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { toastError, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedStdAdditionalDetailsSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { getAffiliatedConfig } from "../_lib/route-config";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  buildAffiliatedMediaSummaryContext,
  contextToMediaInitialSelection,
  readAffiliatedMediaSummaryContext,
  saveAffiliatedMediaSummaryContext,
  type AffiliatedMediaSummaryKind,
} from "../_lib/affiliated-media-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

function summaryText(
  p: ValueGetterParams<AffiliatedSummaryRow>,
  ...keys: string[]
) {
  return pickAffiliatedText(p.data ?? {}, keys);
}

const SUMMARY_SLUG: Record<AffiliatedMediaSummaryKind, string> = {
  signature: "student-signature-summary",
  photo: "student-photo-summary",
};

const SUMMARY_FLAG: Record<
  AffiliatedMediaSummaryKind,
  "std_signature" | "std_photo_path"
> = {
  signature: "std_signature",
  photo: "std_photo_path",
};

const UPLOADED_HEADER: Record<AffiliatedMediaSummaryKind, string> = {
  signature: "Students Signature Uploaded",
  photo: "Students Photo Uploaded",
};

const UPLOADED_FIELDS: Record<AffiliatedMediaSummaryKind, string[]> = {
  signature: ["std_sig_path_count", "stdSigPathCount"],
  photo: ["std_photo_path_count", "stdPhotoPathCount"],
};

type StudentMediaSummaryPageProps = {
  kind: AffiliatedMediaSummaryKind;
};

export function StudentMediaSummaryPage({ kind }: StudentMediaSummaryPageProps) {
  const config = getAffiliatedConfig(SUMMARY_SLUG[kind]);
  const router = useRouter();
  const summaryContext = useMemo(
    () => readAffiliatedMediaSummaryContext(kind),
    [kind],
  );

  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !summaryContext,
    initialSelection: summaryContext
      ? contextToMediaInitialSelection(summaryContext)
      : undefined,
  });

  const [loadKey, setLoadKey] = useState<string | null>(null);

  const {
    data: rawRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.additionalDetailsSummary(
      SUMMARY_FLAG[kind],
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: async () => {
      const parsed = JSON.parse(loadKey!) as {
        collegeId: number;
        academicYearId: number;
        courseId: number;
        courseGroupId: number;
        courseYearId: number;
      };
      const rows = await getAffiliatedStdAdditionalDetailsSummary({
        flag: SUMMARY_FLAG[kind],
        ...parsed,
      });
      // Same pattern as "No Students" toasts on other affiliated pages
      if (rows.length === 0) {
        toastInfo("No Records(s) found.");
      }
      return rows;
    },
    enabled: loadKey != null,
  });

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(() => {
    const uploadedCol: ColDef<AffiliatedSummaryRow> = {
      headerName: UPLOADED_HEADER[kind],
      minWidth: 180,
      valueGetter: (p) => summaryText(p, ...UPLOADED_FIELDS[kind]),
    };

    function makeUploadRenderer(): (
      p: ICellRendererParams<AffiliatedSummaryRow>,
    ) => ReactNode {
      return (p) => {
        if (!config.uploadPath) return null;
        const row = p.data;
        return (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              if (!row || !cascade.collegeId || !cascade.academicYearId) return;
              const collegeRow = cascade.filtersData.find(
                (c) =>
                  Number(c.fk_college_id ?? c.collegeId ?? 0) ===
                  cascade.collegeId,
              );
              const universityId = Number(
                collegeRow?.fk_university_id ?? collegeRow?.universityId ?? 0,
              );
              const universityCode = pickAffiliatedText(collegeRow ?? {}, [
                "university_code",
                "universityCode",
              ]);
              const orgCode = pickAffiliatedText(row, ["org_code", "orgCode"]);
              const ctx = buildAffiliatedMediaSummaryContext(
                row,
                cascade.collegeId,
                cascade.academicYearId,
                kind,
                {
                  universityId: universityId || undefined,
                  universityCode: universityCode || undefined,
                  orgCode: orgCode || undefined,
                },
              );
              saveAffiliatedMediaSummaryContext(ctx);
              const q = new URLSearchParams({
                collegeId: String(ctx.fk_college_id),
                academicYearId: String(ctx.fk_academic_year_id),
                courseId: String(ctx.fk_course_id),
                courseGroupId: String(ctx.fk_course_group_id),
                courseYearId: String(ctx.fk_course_year_id),
              });
              if (ctx.org_code) q.set("orgCode", ctx.org_code);
              if (ctx.university_code)
                q.set("universityCode", ctx.university_code);
              router.push(
                `/affiliated-colleges/${config.uploadPath}?${q.toString()}`,
              );
            }}
          >
            Upload
          </Button>
        );
      };
    }

    return [
      {
        headerName: "SNo",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "course_code",
        headerName: "Course Code",
        minWidth: 110,
      },
      {
        headerName: "Course Group Code",
        minWidth: 150,
        valueGetter: (p) =>
          summaryText(p, "group_code", "groupCode", "group_name", "groupName"),
      },
      {
        field: "course_year_code",
        headerName: "Course Year Code",
        minWidth: 130,
      },
      {
        headerName: "Students",
        minWidth: 100,
        valueGetter: (p) =>
          summaryText(p, "student_count", "studentCount", "total_student_count"),
      },
      uploadedCol,
      {
        headerName: "Action",
        minWidth: 100,
        flex: 0,
        width: 110,
        cellRenderer: makeUploadRenderer(),
      },
    ];
  }, [
    kind,
    config.uploadPath,
    router,
    cascade.collegeId,
    cascade.academicYearId,
    cascade.filtersData,
  ]);

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError("Select college, academic year, course, group, and year.");
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
