"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { FilteredListPage } from "@/components/layout";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { getAffiliatedUploadSummary } from "@/services";
import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { getAffiliatedConfig } from "../_lib/route-config";
import { AFFILIATED_QUERY } from "../_lib/affiliated-query";
import {
  enrichAffiliatedSummaryRows,
  pickAffiliatedText,
} from "../_lib/enrich-affiliated-summary-rows";
import {
  buildAffiliatedSummaryContext,
  contextToInitialSelection,
  readAffiliatedSummaryContext,
  saveAffiliatedSummaryContext,
} from "../_lib/affiliated-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";
import {
  AFFILIATED_ACTION_COL,
  AffiliatedUploadCell,
} from "./AffiliatedUploadCell";

function summaryText(
  p: ValueGetterParams<AffiliatedSummaryRow>,
  ...keys: string[]
) {
  return pickAffiliatedText(p.data ?? {}, keys);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
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
  batch: {
    headerName: "Batch",
    minWidth: 90,
    valueGetter: (p) => summaryText(p, "batch_name", "batchName"),
  } as ColDef<AffiliatedSummaryRow>,
  year: {
    field: "course_year_code",
    headerName: "Course Year",
    minWidth: 110,
  } as ColDef<AffiliatedSummaryRow>,
  group: {
    headerName: "Group",
    minWidth: 90,
    valueGetter: (p) =>
      summaryText(p, "group_name", "groupName", "group_code", "groupCode"),
  } as ColDef<AffiliatedSummaryRow>,
  count: {
    field: "uploaded_students_count",
    headerName: "Students",
    minWidth: 90,
    flex: 0,
  } as ColDef<AffiliatedSummaryRow>,
  uploaded: {
    field: "total_students_with_uploads",
    headerName: "Students Uploaded",
    minWidth: 130,
  } as ColDef<AffiliatedSummaryRow>,
  actions: {
    headerName: "Action",
    ...AFFILIATED_ACTION_COL,
  } as ColDef<AffiliatedSummaryRow>,
};

function makeUploadRenderer(
  uploadPath: string | undefined,
  router: ReturnType<typeof useRouter>,
  getCascade: () => ReturnType<typeof useAffiliatedCascade>,
) {
  return (p: ICellRendererParams<AffiliatedSummaryRow>) => {
    if (!uploadPath) return null;
    const row = p.data;
    return (
      <AffiliatedUploadCell
        onClick={() => {
          const cascade = getCascade();
          const collegeId = cascade.collegeId;
          const academicYearId = cascade.academicYearId;
          if (!row || !collegeId || !academicYearId) return;
          const collegeRow = cascade.filtersData.find(
            (c) => Number(c.fk_college_id ?? c.collegeId ?? 0) === collegeId,
          );
          const universityId = Number(
            collegeRow?.fk_university_id ?? collegeRow?.universityId ?? 0,
          );
          const ctx = buildAffiliatedSummaryContext(
            row,
            collegeId,
            academicYearId,
            {
              regulationData: cascade.regulationData,
              filtersData: cascade.filtersData,
              universityId,
              selectedRegulationId: cascade.regulationId ?? undefined,
            },
          );
          saveAffiliatedSummaryContext(ctx);
          const q = new URLSearchParams({
            collegeId: String(ctx.fk_college_id),
            academicYearId: String(ctx.fk_academic_year_id),
            courseId: String(ctx.fk_course_id),
            courseGroupId: String(ctx.fk_course_group_id),
            courseYearId: String(ctx.fk_course_year_id),
          });
          if (ctx.fk_regulation_id) {
            q.set("regulationId", String(ctx.fk_regulation_id));
          }
          router.push(`/affiliated-colleges/${uploadPath}?${q.toString()}`);
        }}
      />
    );
  };
}

type AffiliatedSummaryPageProps = { slug: string };

export function AffiliatedSummaryPage({ slug }: AffiliatedSummaryPageProps) {
  const config = getAffiliatedConfig(slug);
  const trackRegulation = config.trackRegulation === true;
  const router = useRouter();
  const summaryContext = useMemo(() => readAffiliatedSummaryContext(), []);
  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !summaryContext,
    trackRegulation,
    initialSelection: summaryContext
      ? contextToInitialSelection(summaryContext)
      : undefined,
  });
  const cascadeRef = useRef(cascade);
  cascadeRef.current = cascade;
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const {
    data: rawRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.uploadSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () =>
      getAffiliatedUploadSummary(
        JSON.parse(loadKey!) as Parameters<
          typeof getAffiliatedUploadSummary
        >[0],
        trackRegulation ? { subjectsSummary: true } : undefined,
      ),
    enabled: loadKey != null,
    ...AFFILIATED_QUERY,
  });

  const errorMessage = error ? getErrorMessage(error) : "";
  const isNoRecord = /no record/i.test(errorMessage);

  useEffect(() => {
    if (errorMessage && isNoRecord) {
      toastInfo(errorMessage);
    }
  }, [errorMessage, isNoRecord]);

  const rows = useMemo(
    () =>
      enrichAffiliatedSummaryRows(
        rawRows,
        cascade.filtersData,
        cascade.batchesData,
        cascade.regulationData,
      ),
    [rawRows, cascade.filtersData, cascade.batchesData, cascade.regulationData],
  );

  const columnDefs = useMemo<ColDef<AffiliatedSummaryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.courseCode,
      COL_DEFS.regulation,
      COL_DEFS.batch,
      COL_DEFS.year,
      COL_DEFS.group,
      COL_DEFS.count,
      COL_DEFS.uploaded,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeUploadRenderer(
          config.uploadPath,
          router,
          () => cascadeRef.current,
        ),
      },
    ],
    [config.uploadPath, router],
  );

  function handleGetDetails() {
    if (!cascade.filtersValid) {
      toastError(
        trackRegulation
          ? "Select college, academic year, course, regulation, group, and year."
          : "Select college, academic year, course, group, and year.",
      );
      return;
    }
    setLoadKey(JSON.stringify(cascade.toFilterParams()));
  }

  const showTable = loadKey != null;

  return (
    <FilteredListPage
      title={config.title}
      notice={
        error && !isNoRecord ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null
      }
      filters={
        <AffiliatedCollegeFilters
          title={config.title}
          cascade={cascade}
          onGetDetails={handleGetDetails}
          loadingDetails={isFetching}
          allowAllGroupYear
          showRegulation={trackRegulation}
          showBack={config.showBackToHub}
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
      showTable={showTable}
      resultsVisible={showTable}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: config.title,
      }}
    />
  );
}
