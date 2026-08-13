"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Select as CommonSelect } from "@/common/components/select";
import { ConfirmDialog } from "@/common/components/feedback";
import {
  getCompleteExamProcessFilters,
  runCompleteExamFinalizeAction,
  runCompleteExamFinalizeProfiles,
  runCompleteExamReEvaluationAssignments,
  runCompleteExamResultProcessing,
  runCompleteExamResultProcessingPublish,
  runCompleteExamSetupAssignments,
} from "@/services/post-examination";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type AnyRow = Record<string, any>;
type SelectOption = { value: string; label: string };

type FilterSelection = {
  courseId: number | null;
  academicYearId: number | null;
  examId: number | null;
};

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}
function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function buildCourseOptions(rows: AnyRow[]): SelectOption[] {
  return dedupeBy(rows, ["fk_course_id", "courseId"])
    .map((x) => ({
      value: String(numFrom(x, ["fk_course_id", "courseId"])),
      label: strFrom(x, ["course_code", "courseCode"]),
    }))
    .filter((o) => o.value !== "0");
}

function buildYearOptions(
  rows: AnyRow[],
  courseId: number | null,
): SelectOption[] {
  if (!courseId) return [];
  return dedupeBy(
    rows.filter((x) => numFrom(x, ["fk_course_id", "courseId"]) === courseId),
    ["fk_academic_year_id", "academicYearId"],
  )
    .map((x) => ({
      value: String(numFrom(x, ["fk_academic_year_id", "academicYearId"])),
      label: strFrom(x, ["academic_year", "academicYear"]),
    }))
    .filter((o) => o.value !== "0");
}

function buildExamOptions(
  rows: AnyRow[],
  courseId: number | null,
  academicYearId: number | null,
): SelectOption[] {
  if (!courseId || !academicYearId) return [];
  return dedupeBy(
    rows.filter(
      (x) =>
        numFrom(x, ["fk_course_id", "courseId"]) === courseId &&
        numFrom(x, ["fk_academic_year_id", "academicYearId"]) ===
          academicYearId,
    ),
    ["fk_exam_id", "examId"],
  )
    .map((x) => {
      const name = strFrom(x, ["exam_name", "examName"]);
      const from = strFrom(x, ["from_date", "fromDate"]);
      const to = strFrom(x, ["to_date", "toDate"]);
      const tags: string[] = [];
      if (x.is_internal_exam || x.isInternalExam) tags.push("(Internal)");
      if (x.is_regular_exam || x.isRegularExam) tags.push("(Regular)");
      if (x.is_supply_exam || x.isSupplyExam) tags.push("(Supple)");
      const range = from && to ? ` (${from} - ${to})` : "";
      const suffix = tags.length ? ` ${tags.join(" ")}` : "";
      return {
        value: String(numFrom(x, ["fk_exam_id", "examId"])),
        label: `${name}${range}${suffix}`,
      };
    })
    .filter((o) => o.value !== "0");
}

/** FilteredPage / FilteredListPage card chrome — one card per section, independently collapsible. */
function FilteredSectionCard({
  title,
  filters,
  body,
  filtersDefaultOpen = true,
}: Readonly<{
  title: string;
  filters?: ReactNode;
  body: ReactNode;
  filtersDefaultOpen?: boolean;
}>) {
  const [open, setOpen] = useState(filtersDefaultOpen);
  const hasFilters = filters != null;

  return (
    <div className="app-data-table app-data-table-card flex flex-col">
      <div
        className={cn(
          "app-data-table-heading px-5",
          open ? "pt-5 pb-0" : "pt-5 pb-3",
        )}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Toggle ${title}`}
        >
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            {hasFilters ? <Filter className="h-3.5 w-3.5" aria-hidden /> : null}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0",
            open ? "overflow-visible" : "overflow-hidden",
          )}
        >
          {hasFilters ? (
            <div className="global-filter-bar__inner px-5 pb-3 [&_.global-filter-bar__inner]:!pt-0">
              {filters}
            </div>
          ) : null}
          <div
            className={cn("px-5 py-4", hasFilters && "border-t border-border")}
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  button,
  onClick,
  disabled,
}: Readonly<{
  title: string;
  subtitle: string;
  button: string;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        className="h-8 shrink-0 text-[12px]"
        onClick={onClick}
        disabled={disabled}
      >
        {button}
      </Button>
    </div>
  );
}

function ExamFilters({
  selection,
  courseOptions,
  yearOptions,
  examOptions,
  onCourseChange,
  onYearChange,
  onExamChange,
}: Readonly<{
  selection: FilterSelection;
  courseOptions: SelectOption[];
  yearOptions: SelectOption[];
  examOptions: SelectOption[];
  onCourseChange: (v: number | null) => void;
  onYearChange: (v: number | null) => void;
  onExamChange: (v: number | null) => void;
}>) {
  return (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Course *">
        <CommonSelect
          value={selection.courseId ? String(selection.courseId) : null}
          onChange={(v) => onCourseChange(v ? Number(v) : null)}
          options={courseOptions}
          placeholder="Course"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Year *">
        <CommonSelect
          value={
            selection.academicYearId ? String(selection.academicYearId) : null
          }
          onChange={(v) => onYearChange(v ? Number(v) : null)}
          options={yearOptions}
          placeholder="Exam Year"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Master *">
        <CommonSelect
          value={selection.examId ? String(selection.examId) : null}
          onChange={(v) => onExamChange(v ? Number(v) : null)}
          options={examOptions}
          placeholder="Exam Master"
          searchable
        />
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );
}

/** Independent Course / Exam Year / Exam Master state for one card only. */
function useCardFilters(filterRows: AnyRow[]) {
  const [selection, setSelection] = useState<FilterSelection>({
    courseId: null,
    academicYearId: null,
    examId: null,
  });

  const courseOptions = useMemo(
    () => buildCourseOptions(filterRows),
    [filterRows],
  );
  const yearOptions = useMemo(
    () => buildYearOptions(filterRows, selection.courseId),
    [filterRows, selection.courseId],
  );
  const examOptions = useMemo(
    () =>
      buildExamOptions(
        filterRows,
        selection.courseId,
        selection.academicYearId,
      ),
    [filterRows, selection.courseId, selection.academicYearId],
  );

  return {
    selection,
    courseOptions,
    yearOptions,
    examOptions,
    setCourseId: (courseId: number | null) =>
      setSelection({ courseId, academicYearId: null, examId: null }),
    setAcademicYearId: (academicYearId: number | null) =>
      setSelection((prev) => ({ ...prev, academicYearId, examId: null })),
    setExamId: (examId: number | null) =>
      setSelection((prev) => ({ ...prev, examId })),
  };
}

export default function CompleteExamProcessPage() {
  const router = useRouter();
  const navLabel = usePageNavLabel();
  const pageTitle = navLabel ?? "Complete Exam Process";
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const [loading, setLoading] = useState(false);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [pending, setPending] = useState<{
    title: string;
    description: string;
    fn: () => Promise<void | string>;
    success: string;
  } | null>(null);

  // Each card owns its own filter selection — changing one does not touch the others.
  const processFilters = useCardFilters(filterRows);
  const reEvalFilters = useCardFilters(filterRows);
  const resultFilters = useCardFilters(filterRows);

  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const rows = await getCompleteExamProcessFilters(employeeId).catch(
          () => [],
        );
        setFilterRows(rows);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [employeeId]);

  async function runAction(
    fn: () => Promise<void | string>,
    successMessage: string,
  ) {
    setLoading(true);
    try {
      const message = await fn();
      toastSuccess(
        typeof message === "string" && message ? message : successMessage,
      );
    } catch (e) {
      toastError(e, "Action failed");
    } finally {
      setLoading(false);
    }
  }

  /** Course, Exam Year, and Exam Master required for the card owning these filters. */
  function requireFilters(selection: FilterSelection): boolean {
    const { courseId, academicYearId, examId } = selection;
    if (courseId && academicYearId && examId) return true;
    toastInfo("Please Select The Filters");
    return false;
  }

  function confirmAction(
    selection: FilterSelection,
    title: string,
    fn: () => Promise<void | string>,
    success: string,
    description = "This action is irreversible and cannot be undone. Do you want to continue?",
  ) {
    if (!requireFilters(selection)) return;
    setPending({ title, description, fn, success });
  }

  return (
    <PageContainer className="space-y-4">
      {/* Panel 1 — Finalise Evaluator Profiles (no filters, Angular parity) */}
      <FilteredSectionCard
        title={pageTitle}
        body={
          <div className="space-y-3">
            <ActionCard
              title="Finalise Evaluator Profiles"
              subtitle="The objective of this is to finalise the evaluator profiles by skipping the Committee"
              button="Finalise Evaluator Profiles"
              disabled={loading}
              onClick={() =>
                setPending({
                  title: "Finalise Evaluator Profiles?",
                  description:
                    "This action is irreversible and cannot be undone. Do you want to continue?",
                  fn: () => runCompleteExamFinalizeProfiles(),
                  success: "Evaluator profiles finalised",
                })
              }
            />
          </div>
        }
      />

      {/* Panel 2 — Complete Exam Process (own filters) */}
      <FilteredSectionCard
        title="Complete Exam Process"
        filters={
          <ExamFilters
            selection={processFilters.selection}
            courseOptions={processFilters.courseOptions}
            yearOptions={processFilters.yearOptions}
            examOptions={processFilters.examOptions}
            onCourseChange={processFilters.setCourseId}
            onYearChange={processFilters.setAcademicYearId}
            onExamChange={processFilters.setExamId}
          />
        }
        body={
          <div className="space-y-3">
            <ActionCard
              title="Setup Assignments"
              subtitle="The objective of this update is to review student assignments, OMR details, and answer papers."
              button="Setup Assignments"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  processFilters.selection,
                  "Setup Assignments?",
                  () =>
                    runCompleteExamSetupAssignments(
                      processFilters.selection.examId as number,
                    ),
                  "Assignments setup completed",
                )
              }
            />
            <ActionCard
              title="Finalize Evaluation Status"
              subtitle="The objective of this is to update the status from Evaluated to Finalized."
              button="Finalize Evaluation Status"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  processFilters.selection,
                  "Finalize Evaluation Status?",
                  () =>
                    runCompleteExamFinalizeAction(
                      "exam_finalise_evaluation_status",
                      processFilters.selection.examId as number,
                    ),
                  "Evaluation status finalized",
                )
              }
            />
            <ActionCard
              title="Finalize Evaluation Marks"
              subtitle="Marks will be Finalized after Finalized Evaluation Status"
              button="Finalize Evaluation Marks"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  processFilters.selection,
                  "Finalize Evaluation Marks?",
                  () =>
                    runCompleteExamFinalizeAction(
                      "exam_finalise_evaluation_marks",
                      processFilters.selection.examId as number,
                    ),
                  "Evaluation marks finalized",
                )
              }
            />
            <ActionCard
              title="Marks Entered Status"
              subtitle="This report will give list of evaluator marks status."
              button="Verify Exam Marks"
              disabled={loading}
              onClick={() =>
                router.push(
                  "/admin-examination-management/result-processing/verify-exam-marks",
                )
              }
            />
          </div>
        }
      />

      {/* Panel 3 — Exam Re-Evaluation (own filters) */}
      <FilteredSectionCard
        title="Exam Re-Evaluation"
        filters={
          <ExamFilters
            selection={reEvalFilters.selection}
            courseOptions={reEvalFilters.courseOptions}
            yearOptions={reEvalFilters.yearOptions}
            examOptions={reEvalFilters.examOptions}
            onCourseChange={reEvalFilters.setCourseId}
            onYearChange={reEvalFilters.setAcademicYearId}
            onExamChange={reEvalFilters.setExamId}
          />
        }
        body={
          <div className="space-y-3">
            <ActionCard
              title="Setup Re-Evaluation Assignments"
              subtitle="The objective of this update is to review student assignments, OMR details, and answer papers."
              button="Setup Re-Evaluation Assignments"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  reEvalFilters.selection,
                  "Setup Re-Evaluation Assignments?",
                  () =>
                    runCompleteExamReEvaluationAssignments(
                      reEvalFilters.selection.examId as number,
                    ),
                  "Re-evaluation assignments setup completed",
                )
              }
            />
            <ActionCard
              title="Finalize Re-Evaluation Status"
              subtitle="The objective of this is to update the status from Evaluated to Finalized"
              button="Finalize Re-Evaluation Status"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  reEvalFilters.selection,
                  "Finalize Re-Evaluation Status?",
                  () =>
                    runCompleteExamFinalizeAction(
                      "exam_finalise_reevaluation_status",
                      reEvalFilters.selection.examId as number,
                    ),
                  "Re-evaluation status finalized",
                )
              }
            />
            <ActionCard
              title="Finalize Re-Evaluation Marks"
              subtitle="Marks will be Finalized after Finalized Evaluation Status"
              button="Finalize Re-Evaluation Marks"
              disabled={loading}
              onClick={() =>
                confirmAction(
                  reEvalFilters.selection,
                  "Finalize Re-Evaluation Marks?",
                  () =>
                    runCompleteExamFinalizeAction(
                      "exam_finalise_reevaluation_marks",
                      reEvalFilters.selection.examId as number,
                    ),
                  "Re-evaluation marks finalized",
                )
              }
            />
          </div>
        }
      />

      {/* Panel 4 — Result Processing (own filters) */}
      <FilteredSectionCard
        title="Result Processing"
        filters={
          <ExamFilters
            selection={resultFilters.selection}
            courseOptions={resultFilters.courseOptions}
            yearOptions={resultFilters.yearOptions}
            examOptions={resultFilters.examOptions}
            onCourseChange={resultFilters.setCourseId}
            onYearChange={resultFilters.setAcademicYearId}
            onExamChange={resultFilters.setExamId}
          />
        }
        body={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="h-8 text-[12px]"
              disabled={loading}
              onClick={() => {
                if (!requireFilters(resultFilters.selection)) return;
                void runAction(
                  () =>
                    runCompleteExamResultProcessing(
                      resultFilters.selection.examId as number,
                    ),
                  "Result processing completed",
                );
              }}
            >
              Result Processing
            </Button>
            <Button
              className="h-8 text-[12px]"
              disabled={loading}
              onClick={() => {
                if (!requireFilters(resultFilters.selection)) return;
                void runAction(
                  () =>
                    runCompleteExamResultProcessingPublish(
                      resultFilters.selection.examId as number,
                    ),
                  "Result publishing completed",
                );
              }}
            >
              Publish Result Processing
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel="Proceed"
        confirmVariant="default"
        isLoading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          const { fn, success } = pending;
          setPending(null);
          void runAction(fn, success);
        }}
      />
    </PageContainer>
  );
}
