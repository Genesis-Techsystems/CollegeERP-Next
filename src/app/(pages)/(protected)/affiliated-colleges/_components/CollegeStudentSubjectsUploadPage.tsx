"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { DataTable, TableCard } from "@/common/components/table";
import { FormModal } from "@/common/components/feedback";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getAffiliatedStudentSubjectsUploadTemplate,
  importAffiliatedStudentSubjectsFile,
  resolveAffiliatedEmployeeId,
  submitAffiliatedStudentSubjectsUpload,
  verifyAffiliatedStudentSubjectsUpload,
} from "@/services";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  AFFILIATED_SUBJECT_LOADED_COLS,
  AFFILIATED_SUBJECT_VERIFY_COLS,
  buildAffiliatedSubjectStagingColDefs,
} from "../_lib/affiliated-subject-upload-columns";
import {
  downloadAffiliatedStudentSubjectsTemplateExcel,
  findSubjectStudentGroup,
  pivotAffiliatedSubjectStagingRows,
  type AffiliatedSubjectPivotRow,
} from "../_lib/affiliated-subject-upload-excel";
import {
  contextToInitialSelection,
  readAffiliatedSummaryContext,
  saveAffiliatedSummaryContext,
} from "../_lib/affiliated-summary-context";
import { resolveRegulationFromFilterContext } from "../_lib/resolve-affiliated-regulation";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

type AnyRow = Record<string, unknown>;

function numParam(sp: URLSearchParams, key: string): number {
  const n = Number(sp.get(key) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickFilterRowId(row: AnyRow | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function pickUploadFileId(rows: AnyRow[]): number {
  const first = rows[0] ?? {};
  return Number(
    first.univUploadFilesId ??
      first.univ_uploadfile_id ??
      first.univUploadFileId ??
      0,
  );
}

export function CollegeStudentSubjectsUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryContext = useMemo(() => readAffiliatedSummaryContext(), []);
  const fromSummary =
    searchParams.has("collegeId") || (summaryContext?.fk_college_id ?? 0) > 0;

  const initialSelection = useMemo(() => {
    const regulationSeed = searchParams.has("regulationId")
      ? numParam(searchParams, "regulationId")
      : summaryContext?.fk_regulation_id;
    if (searchParams.has("collegeId")) {
      return {
        collegeId: numParam(searchParams, "collegeId"),
        academicYearId: numParam(searchParams, "academicYearId"),
        courseId: numParam(searchParams, "courseId"),
        courseGroupId: numParam(searchParams, "courseGroupId"),
        courseYearId: numParam(searchParams, "courseYearId"),
        regulationId: regulationSeed,
      };
    }
    if (summaryContext) {
      return {
        ...contextToInitialSelection(summaryContext),
        regulationId: regulationSeed,
      };
    }
    return undefined;
  }, [searchParams, summaryContext]);

  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !fromSummary,
    trackRegulation: true,
    requirePositiveRegulation: true,
    initialSelection: fromSummary ? initialSelection : undefined,
  });

  const [templateData, setTemplateData] = useState<unknown[][] | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [stagingRows, setStagingRows] = useState<AnyRow[]>([]);
  const [pivotRows, setPivotRows] = useState<AffiliatedSubjectPivotRow[]>([]);
  const [subjectCodes, setSubjectCodes] = useState<string[]>([]);
  const [loadedRows, setLoadedRows] = useState<AnyRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyProblems, setVerifyProblems] = useState<AnyRow[] | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [comments, setComments] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filterParams = useMemo(
    () => ({
      collegeId: cascade.collegeId ?? 0,
      academicYearId: cascade.academicYearId ?? 0,
      courseId: cascade.courseId ?? 0,
      courseGroupId: cascade.courseGroupId ?? 0,
      courseYearId: cascade.courseYearId ?? 0,
    }),
    [
      cascade.collegeId,
      cascade.academicYearId,
      cascade.courseId,
      cascade.courseGroupId,
      cascade.courseYearId,
    ],
  );

  const collegeRow = useMemo(
    () =>
      cascade.colleges.find(
        (c) =>
          pickFilterRowId(c as AnyRow, ["fk_college_id", "collegeId"]) ===
          cascade.collegeId,
      ),
    [cascade.colleges, cascade.collegeId],
  );

  const regulationId = useMemo(() => {
    if ((cascade.regulationId ?? 0) > 0) return cascade.regulationId ?? 0;
    return resolveRegulationFromFilterContext({
      filtersData: cascade.filtersData as AnyRow[],
      regulationData: cascade.regulationData as AnyRow[],
      collegeId: filterParams.collegeId,
      courseId: filterParams.courseId,
      courseGroupId: filterParams.courseGroupId,
      courseYearId: filterParams.courseYearId,
      universityId: pickFilterRowId(collegeRow as AnyRow, [
        "fk_university_id",
        "universityId",
      ]),
      queryRegulationId: numParam(searchParams, "regulationId"),
      contextRegulationId: summaryContext?.fk_regulation_id,
    });
  }, [
    cascade.regulationId,
    cascade.filtersData,
    cascade.regulationData,
    filterParams,
    collegeRow,
    searchParams,
    summaryContext?.fk_regulation_id,
  ]);

  const importMeta = useMemo(() => {
    const academicYear = cascade.academicYears.find(
      (a) =>
        pickFilterRowId(a as AnyRow, [
          "fk_academic_year_id",
          "academicYearId",
        ]) === cascade.academicYearId,
    );
    const course = cascade.courses.find(
      (c) =>
        pickFilterRowId(c as AnyRow, ["fk_course_id", "courseId"]) ===
        cascade.courseId,
    );
    const courseGroup = cascade.courseGroups.find(
      (g) =>
        pickFilterRowId(g as AnyRow, [
          "fk_course_group_id",
          "courseGroupId",
        ]) === cascade.courseGroupId,
    );
    const courseYear = cascade.courseYears.find(
      (y) =>
        pickFilterRowId(y as AnyRow, ["fk_course_year_id", "courseYearId"]) ===
        cascade.courseYearId,
    );

    const collegeCode = pickAffiliatedText(collegeRow as AnyRow, [
      "college_code",
      "collegeCode",
    ]);
    const academicYearLabel = pickAffiliatedText(academicYear as AnyRow, [
      "academic_year",
      "academicYear",
    ]);
    const courseCode = pickAffiliatedText(course as AnyRow, [
      "course_code",
      "courseCode",
    ]);
    const courseGroupLabel =
      cascade.courseGroupId === 0
        ? "All"
        : pickAffiliatedText(courseGroup as AnyRow, [
            "group_code",
            "groupCode",
            "group_name",
            "groupName",
          ]);
    const courseYearLabel =
      cascade.courseYearId === 0
        ? "All"
        : pickAffiliatedText(courseYear as AnyRow, [
            "course_year_name",
            "courseYearName",
          ]);

    const fileDescription = `collegeCode : ${collegeCode} academicYear : ${academicYearLabel} courseCode : ${courseCode} courseGroup : ${courseGroupLabel} courseYear : ${courseYearLabel}`;

    return {
      collegeCode,
      courseCode,
      fileDescription,
      fileUploadedByEmpId: resolveAffiliatedEmployeeId(),
      regulationId,
      ...filterParams,
    };
  }, [
    collegeRow,
    cascade.academicYears,
    cascade.courses,
    cascade.courseGroups,
    cascade.courseYears,
    cascade.academicYearId,
    cascade.courseId,
    cascade.courseGroupId,
    cascade.courseYearId,
    regulationId,
    filterParams,
  ]);

  // Refs so async helpers can read latest values without being deps that cause re-renders
  const filterParamsRef = useRef(filterParams);
  filterParamsRef.current = filterParams;
  const regulationIdRef = useRef(regulationId);
  regulationIdRef.current = regulationId;
  const cascadeRef = useRef(cascade);
  cascadeRef.current = cascade;

  /**
   * Angular `getTemplate()` — load sampleExcelData for the selected regulation only.
   */
  const loadTemplate = useCallback(async (
    params: typeof filterParams,
    regId: number,
  ) => {
    if (regId <= 0) return;
    setTemplateLoading(true);
    try {
      const result = await getAffiliatedStudentSubjectsUploadTemplate({
        ...params,
        regulationId: regId,
      });
      if (!Array.isArray(result) || result.length === 0 || !result[0]) {
        setTemplateData(null);
        return;
      }
      setTemplateData(result);
    } catch (err) {
      toastError(getErrorMessage(err));
      setTemplateData(null);
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cascade.filtersValid || cascade.isLoading || regulationId <= 0) return;
    void loadTemplate(filterParams, regulationId);
  }, [
    cascade.filtersValid,
    cascade.isLoading,
    filterParams.collegeId,
    filterParams.academicYearId,
    filterParams.courseId,
    filterParams.courseGroupId,
    filterParams.courseYearId,
    regulationId,
    // loadTemplate is stable (only fetchTemplateWithStudents dep, which is stable)
    loadTemplate,
  ]);

  useEffect(() => {
    const collegeId =
      numParam(searchParams, "collegeId") ||
      (summaryContext?.fk_college_id ?? 0);
    if (collegeId <= 0) {
      router.replace("/affiliated-colleges/student-subject-summary");
    }
  }, [searchParams, summaryContext, router]);

  const stagingColumnDefs = useMemo<ColDef<AffiliatedSubjectPivotRow>[]>(
    () => buildAffiliatedSubjectStagingColDefs(subjectCodes),
    [subjectCodes],
  );

  async function onUploadFile(selected: File) {
    if (!cascade.filtersValid) {
      toastError("Select all filters before uploading.");
      return;
    }
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toastError(
        "Invalid file type. Please upload an Excel file (.xlsx or .xls).",
      );
      return;
    }
    setUploading(true);
    setLoadedRows([]);
    try {
      const rows = await importAffiliatedStudentSubjectsFile(selected, importMeta);
      setStagingRows(rows);
      const pivot = pivotAffiliatedSubjectStagingRows(rows);
      setPivotRows(pivot.rows);
      setSubjectCodes(pivot.subjectCodes);
      setFile(selected);
      toastSuccess("File uploaded. Review staged subjects and click Verify.");
    } catch (err) {
      toastError(getErrorMessage(err));
      setFile(null);
      setStagingRows([]);
      setPivotRows([]);
      setSubjectCodes([]);
    } finally {
      setUploading(false);
    }
  }

  async function onVerify() {
    const uploadId = pickUploadFileId(stagingRows);
    if (!uploadId) {
      toastError("Upload file id missing. Re-upload the Excel file.");
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyAffiliatedStudentSubjectsUpload({
        ...filterParams,
        regulationId,
        univUploadfileId: uploadId,
      });
      const flag = String(
        result[0]?.Flag ?? result[0]?.flag ?? "",
      ).toLowerCase();
      if (flag === "success") {
        setSubmitOpen(true);
      } else if (result.length > 0) {
        setVerifyProblems(result);
      } else {
        toastSuccess("Verification completed.");
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmitToUniversity() {
    const uploadId = pickUploadFileId(stagingRows);
    if (!uploadId) {
      toastError("Upload file id missing.");
      return;
    }
    setSubmitting(true);
    try {
      const loaded = await submitAffiliatedStudentSubjectsUpload({
        ...filterParams,
        regulationId,
        univUploadfileId: uploadId,
        comments,
      });
      setLoadedRows(loaded);
      setStagingRows([]);
      setPivotRows([]);
      setSubjectCodes([]);
      setFile(null);
      setSubmitOpen(false);
      setComments("");
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess("Student subjects submitted to university successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const downloadBaseName = `${importMeta.collegeCode || "college"}_${importMeta.courseCode || "course"}_Std_Subjects`;
  const showUploadCard = Boolean(templateData?.length) && !templateLoading;

  useEffect(() => {
    // Sync resolved regulationId into cascade when it differs (e.g. seeded from URL/context).
    // Only run once per change; guard prevents a loop.
    if (regulationId > 0 && cascadeRef.current.regulationId !== regulationId) {
      cascadeRef.current.onRegulationChange(regulationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regulationId]);

  /** Angular `exportToExcel()` — uses already-loaded sampleExcelData, no re-fetch. */
  function onDownloadTemplateExcel() {
    if (templateLoading) return;
    if (regulationIdRef.current <= 0) {
      toastInfo("Select a regulation before downloading.");
      return;
    }
    if (!templateData) {
      toastInfo("No Students Dsta");
      return;
    }
    const result = downloadAffiliatedStudentSubjectsTemplateExcel(
      templateData,
      `${downloadBaseName}.xlsx`,
    );
    if (!result.ok) toastInfo(result.message);
  }

  return (
    <FilteredPage
      title="College Student Subjects Upload"
      filtersCollapsible={false}
      filters={
        <AffiliatedCollegeFilters
          title="Student Subjects Bulk Upload"
          cascade={cascade}
          onGetDetails={() => void loadTemplate(filterParamsRef.current, regulationIdRef.current)}
          loadingDetails={templateLoading}
          allowAllGroupYear
          readOnly
          showRegulation
          hideAllRegulation
          hideGetDetails
          showBack
          onBack={() => {
            saveAffiliatedSummaryContext({
              fk_college_id: filterParams.collegeId,
              fk_academic_year_id: filterParams.academicYearId,
              fk_course_id: filterParams.courseId,
              fk_course_group_id: filterParams.courseGroupId,
              fk_course_year_id: filterParams.courseYearId,
              fk_regulation_id: regulationId || undefined,
            });
            router.push("/affiliated-colleges/student-subject-summary");
          }}
          bare
        />
      }
    >
      {showUploadCard ? (
        <div className="app-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">
              Download &amp; Upload — Student Subjects
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={templateLoading}
                onClick={() => void onDownloadTemplateExcel()}
              >
                <Download className="h-4 w-4" />
                {templateLoading ? "Loading…" : "Download Excel"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={uploading || templateLoading}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload Excel"}
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) void onUploadFile(selected);
                e.target.value = "";
              }}
            />
            {file?.name ? (
              <div className="inline-flex max-w-full items-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
                <div className="min-w-0 inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-xs font-medium text-emerald-800 truncate">
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setStagingRows([]);
                      setPivotRows([]);
                      setSubjectCodes([]);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-emerald-700 hover:bg-emerald-100 shrink-0"
                    aria-label="Remove uploaded file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {pivotRows.length > 0 ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title={
                cascade.contextLabel
                  ? `Verify — Student Subjects : ${cascade.contextLabel}`
                  : "Verify — Student Subjects"
              }
              rowData={pivotRows}
              columnDefs={stagingColumnDefs}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
          <div className="flex justify-end px-1">
            <Button
              type="button"
              onClick={() => void onVerify()}
              disabled={verifying}
            >
              {verifying ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </div>
      ) : null}

      {loadedRows.length > 0 ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title={
                cascade.contextLabel
                  ? `Uploaded — Student Subjects : ${cascade.contextLabel}`
                  : "Uploaded — Student Subjects"
              }
              rowData={loadedRows}
              columnDefs={AFFILIATED_SUBJECT_LOADED_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        </div>
      ) : null}

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Student Subjects Upload"
        // submitLabel="Close"
        cancelLabel="Close"
        onSubmit={(e) => {
          e.preventDefault();
          setVerifyProblems(null);
        }}
        size="lg"
      >
        <DataTable
          title=""
          rowData={verifyProblems ?? []}
          columnDefs={AFFILIATED_SUBJECT_VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Verify Student Subjects Upload"
        submitLabel="Submit To University"
        isSubmitting={submitting}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitToUniversity();
        }}
        size="md"
      >
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden />
          <p className="text-sm font-semibold text-emerald-700">
            Data Verified Successfully
          </p>
        </div>
        <label className="text-sm font-medium text-primary">
          Notes / Terms
        </label>
        <Textarea
          className="mt-2 min-h-[80px]"
          placeholder="Comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </FormModal>
    </FilteredPage>
  );
}
