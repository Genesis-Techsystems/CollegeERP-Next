"use client";

/**
 * Angular `student-feedback-list` — College + Survey filters, paginated SurveyFeedback.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listSurveyFeedbackByFormPage,
  listSurveyFormsByCollegeForStudents,
  type SurveyFeedbackListRow,
} from "@/services";
import { FeedbackDetailsDialog } from "./_components/FeedbackDetailsDialog";

const PAGE_SIZE = 50;

/** Angular Material `record_voice_over` icon (same glyph as student-feedback-list). */
function RecordVoiceOverIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm-6 4c.22-.72 3.31-2 6-2 2.7 0 5.8 1.29 6 2H3zm17.13-4.34c.56-.69.87-1.55.87-2.49 0-1.07-.41-2.05-1.12-2.78-.71-.73-1.68-1.13-2.71-1.13-.54 0-1.07.11-1.55.32.51.81.83 1.76.83 2.78 0 .91-.27 1.75-.72 2.46-.23.36-.49.69-.79.99.84.28 1.6.73 2.22 1.32.57.54 1.01 1.19 1.32 1.91.5-.27.93-.64 1.26-1.09.34-.44.57-.95.69-1.51zM15.17 10c0-1.01-.37-1.93-.97-2.64.6-.07 1.18-.07 1.78.02 1.05.17 1.96.76 2.46 1.6.5.84.56 1.87.17 2.8-.39.93-1.18 1.65-2.14 1.94-.55.17-1.12.2-1.67.09.85-.86 1.37-2.05 1.37-3.81z" />
    </svg>
  );
}

function formatFeedbackDate(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  const date = isValid(d) ? d : new Date(value);
  return isValid(date) ? format(date, "MMMM d, yyyy") : value;
}

function makeActionsRenderer(onView: (row: SurveyFeedbackListRow) => void) {
  return (p: ICellRendererParams<SurveyFeedbackListRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center text-[hsl(var(--primary))] hover:opacity-80"
        title="Feedback Details"
        aria-label="Feedback Details"
        onClick={() => onView(row)}
      >
        <RecordVoiceOverIcon />
      </button>
    );
  };
}

export default function StudentFeedbackListPage() {
  const { user } = useSession();
  const isPrincipal =
    Boolean(user?.isPrincipal) ||
    (typeof window !== "undefined" &&
      (window.localStorage?.getItem("isPRINCIPAL") === "true" ||
        window.localStorage?.getItem("isPrincipal") === "true"));

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [surveyFormId, setSurveyFormId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [viewRow, setViewRow] = useState<SurveyFeedbackListRow | null>(null);
  const [collegeLockedCode, setCollegeLockedCode] = useState("");

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: [...QK.studentFeedbackList.all, "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  // Angular: principal auto-selects session college
  useEffect(() => {
    if (!isPrincipal || collegeId || colleges.length === 0) return;
    const sessionCollegeId = Number(user?.collegeId ?? 0);
    if (!sessionCollegeId) return;
    const match = colleges.find(
      (c) => Number(c.collegeId) === sessionCollegeId,
    );
    if (match) {
      setCollegeId(String(match.collegeId));
      setCollegeLockedCode(
        String(match.collegeCode ?? match.collegeName ?? ""),
      );
    }
  }, [isPrincipal, colleges, collegeId, user?.collegeId]);

  const formsQuery = useQuery({
    queryKey: QK.studentFeedbackList.forms(Number(collegeId || 0)),
    queryFn: () => listSurveyFormsByCollegeForStudents(Number(collegeId)),
    enabled: Boolean(collegeId),
  });

  const feedbackQuery = useQuery({
    queryKey: QK.studentFeedbackList.feedback(Number(surveyFormId || 0), page),
    queryFn: () =>
      listSurveyFeedbackByFormPage(Number(surveyFormId), page, PAGE_SIZE),
    enabled: Boolean(surveyFormId),
  });

  const emptyToastForSurvey = useRef<string | null>(null);
  useEffect(() => {
    if (!feedbackQuery.isSuccess || feedbackQuery.isFetching || !surveyFormId) {
      return;
    }
    if (page !== 0) return;
    if ((feedbackQuery.data?.rows.length ?? 0) > 0) {
      emptyToastForSurvey.current = null;
      return;
    }
    if (emptyToastForSurvey.current === surveyFormId) return;
    emptyToastForSurvey.current = surveyFormId;
    toastSuccess("No records found.");
  }, [
    feedbackQuery.isSuccess,
    feedbackQuery.isFetching,
    feedbackQuery.data,
    surveyFormId,
    page,
  ]);

  useEffect(() => {
    if (feedbackQuery.isError) {
      toastError(
        feedbackQuery.error instanceof Error
          ? feedbackQuery.error.message
          : "Failed to load feedback",
      );
    }
  }, [feedbackQuery.isError, feedbackQuery.error]);

  const rows = feedbackQuery.data?.rows ?? [];
  const totalCount = feedbackQuery.data?.totalCount ?? 0;
  // Angular: table only when surveyFeedbackList.length > 0; show while loading.
  const showTable =
    Boolean(surveyFormId) && (feedbackQuery.isFetching || rows.length > 0);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const surveyOptions = useMemo(
    () =>
      (formsQuery.data ?? []).map((f) => ({
        value: String(f.surveyFormId),
        label: String(f.surveyName ?? f.surveyFormId),
      })),
    [formsQuery.data],
  );

  const columnDefs = useMemo<ColDef<SurveyFeedbackListRow>[]>(
    () => [
      {
        headerName: "S No.",
        valueGetter: (p) => {
          const idx = p.node?.rowIndex ?? 0;
          return page * PAGE_SIZE + idx + 1;
        },
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        headerName: "From Student Name",
        minWidth: 180,
        valueGetter: (p) => {
          const name = String(p.data?.fromStudentFirstName ?? "").trim();
          const roll = String(p.data?.fromRollNo ?? "").trim();
          if (!name) return "—";
          return roll ? `${name} (${roll})` : name;
        },
      },
      {
        headerName: "Subject",
        field: "subjectName",
        minWidth: 140,
      },
      {
        headerName: "For Employee Name",
        minWidth: 180,
        valueGetter: (p) => {
          const name = String(p.data?.forEmpFirstName ?? "").trim();
          const empNo = String(p.data?.forEmpNumber ?? "").trim();
          if (!name) return "—";
          return empNo ? `${name} (${empNo})` : name;
        },
      },
      {
        headerName: "Feedback Date",
        field: "feedbackDate",
        minWidth: 140,
        valueFormatter: (p) => formatFeedbackDate(p.value as string),
      },
      {
        headerName: "Actions",
        colId: "actions",
        width: 100,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: makeActionsRenderer(setViewRow),
      },
    ],
    [page],
  );

  return (
    <FilteredListPage
      title={
        collegeLockedCode
          ? `Student Feedback For : ${collegeLockedCode}`
          : "Student Feedback"
      }
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setSurveyFormId(null);
              setPage(0);
              const c = colleges.find((x) => String(x.collegeId) === v);
              setCollegeLockedCode(
                isPrincipal
                  ? String(c?.collegeCode ?? c?.collegeName ?? "")
                  : "",
              );
            }}
            options={collegeOptions}
            placeholder="Enter College"
            isLoading={collegesLoading}
            disabled={isPrincipal}
          />
          <Select
            label="Survey"
            required
            value={surveyFormId}
            onChange={(v) => {
              setSurveyFormId(v);
              setPage(0);
            }}
            options={surveyOptions}
            placeholder="Enter Survey"
            isLoading={formsQuery.isLoading}
            disabled={!collegeId}
            className="sm:col-span-2"
          />
        </div>
      }
      showTable={showTable}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={feedbackQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={PAGE_SIZE}
      serverSide
      totalCount={totalCount}
      currentPage={page}
      onPageChange={(nextPage) => setPage(nextPage)}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Student Feedback Details",
      }}
    >
      <FeedbackDetailsDialog
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        row={viewRow}
      />
    </FilteredListPage>
  );
}
