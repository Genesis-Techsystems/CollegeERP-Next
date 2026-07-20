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
  getAffiliatedExamRegistrationUploadTemplate,
  importAffiliatedExamRegistrationFile,
  resolveAffiliatedEmployeeId,
  submitAffiliatedExamRegistrationUpload,
  verifyAffiliatedExamRegistrationUpload,
} from "@/services";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  AFFILIATED_EXAM_REG_LOADED_COLS,
  AFFILIATED_EXAM_REG_VERIFY_COLS,
  buildAffiliatedExamRegStagingColDefs,
} from "../_lib/affiliated-exam-reg-upload-columns";
import {
  downloadAffiliatedExamRegistrationTemplateExcel,
  pivotAffiliatedExamRegStagingRows,
  type AffiliatedExamRegPivotRow,
} from "../_lib/affiliated-exam-reg-upload-excel";
import {
  contextToExamRegInitialSelection,
  readAffiliatedExamRegSummaryContext,
  saveAffiliatedExamRegSummaryContext,
} from "../_lib/affiliated-exam-reg-summary-context";
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
  const keys = [
    "univUploadFileId",
    "univUploadFilesId",
    "univ_uploadfile_id",
    "univUploadfileId",
    "pk_univ_uploadfile_id",
  ];
  for (const key of keys) {
    const n = Number(first[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  for (const [key, value] of Object.entries(first)) {
    if (/univ.?upload.?file.?id/i.test(key)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

export function CollegeStudentExamFeeRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryContext = useMemo(
    () => readAffiliatedExamRegSummaryContext(),
    [],
  );
  const fromSummary =
    searchParams.has("collegeId") || (summaryContext?.fk_college_id ?? 0) > 0;

  const initialSelection = useMemo(() => {
    if (searchParams.has("collegeId")) {
      return {
        collegeId: numParam(searchParams, "collegeId"),
        academicYearId: numParam(searchParams, "academicYearId"),
        courseId: numParam(searchParams, "courseId"),
        courseGroupId: numParam(searchParams, "courseGroupId"),
        courseYearId: numParam(searchParams, "courseYearId"),
        examId: numParam(searchParams, "examId"),
      };
    }
    if (summaryContext) {
      return contextToExamRegInitialSelection(summaryContext);
    }
    return undefined;
  }, [searchParams, summaryContext]);

  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !fromSummary,
    examFilters: true,
    examFirstCascade: true,
    initialSelection: fromSummary ? initialSelection : undefined,
  });

  const [templateData, setTemplateData] = useState<unknown[][] | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [stagingRows, setStagingRows] = useState<AnyRow[]>([]);
  const [pivotRows, setPivotRows] = useState<AffiliatedExamRegPivotRow[]>([]);
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
      examId: cascade.examId ?? 0,
    }),
    [
      cascade.collegeId,
      cascade.academicYearId,
      cascade.courseId,
      cascade.courseGroupId,
      cascade.courseYearId,
      cascade.examId,
    ],
  );

  const importMeta = useMemo(() => {
    const college = cascade.colleges.find(
      (c) =>
        pickFilterRowId(c as AnyRow, ["fk_college_id", "collegeId"]) ===
        cascade.collegeId,
    );
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
        pickFilterRowId(y as AnyRow, [
          "fk_course_year_id",
          "courseYearId",
        ]) === cascade.courseYearId,
    );
    const exam = cascade.exams.find(
      (e) =>
        pickFilterRowId(e as AnyRow, ["fk_exam_id", "examId"]) ===
        cascade.examId,
    );

    const collegeCode = pickAffiliatedText(college as AnyRow, [
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
    const groupCode = pickAffiliatedText(courseGroup as AnyRow, [
      "group_code",
      "groupCode",
    ]);
    const courseYearLabel = pickAffiliatedText(courseYear as AnyRow, [
      "course_year_name",
      "courseYearName",
    ]);
    const examName = pickAffiliatedText(exam as AnyRow, [
      "exam_name",
      "examName",
    ]);

    const fileDescription = [
      collegeCode ? `collegeCode : ${collegeCode}` : "",
      academicYearLabel ? ` academicYear : ${academicYearLabel}` : "",
      courseCode ? `courseCode : ${courseCode}` : "",
      groupCode ? ` courseGroup : ${groupCode}` : "",
      courseYearLabel ? ` courseYear : ${courseYearLabel}` : "",
      examName ? ` exam : ${examName}` : "",
    ]
      .filter(Boolean)
      .join("");

    return {
      collegeCode,
      courseCode,
      fileDescription,
      collegeId: filterParams.collegeId,
      academicYearId: filterParams.academicYearId,
      courseId: filterParams.courseId,
      courseGroupId: filterParams.courseGroupId,
      courseYearId: filterParams.courseYearId,
      examId: filterParams.examId,
      fileUploadedByEmpId: resolveAffiliatedEmployeeId(),
    };
  }, [
    cascade.colleges,
    cascade.academicYears,
    cascade.courses,
    cascade.courseGroups,
    cascade.courseYears,
    cascade.exams,
    cascade.collegeId,
    cascade.academicYearId,
    cascade.courseId,
    cascade.courseGroupId,
    cascade.courseYearId,
    cascade.examId,
    filterParams,
  ]);

  const loadTemplate = useCallback(
    async (params: typeof filterParams) => {
      if (!params.examId) return;
      setTemplateLoading(true);
      try {
        const result = await getAffiliatedExamRegistrationUploadTemplate(params);
        if (!Array.isArray(result) || result.length === 0) {
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
    },
    [],
  );

  useEffect(() => {
    if (!cascade.filtersValid || cascade.isLoading || !filterParams.examId) {
      return;
    }
    void loadTemplate(filterParams);
  }, [
    cascade.filtersValid,
    cascade.isLoading,
    filterParams.collegeId,
    filterParams.academicYearId,
    filterParams.courseId,
    filterParams.courseGroupId,
    filterParams.courseYearId,
    filterParams.examId,
    loadTemplate,
  ]);

  useEffect(() => {
    const collegeId =
      numParam(searchParams, "collegeId") ||
      (summaryContext?.fk_college_id ?? 0);
    if (collegeId <= 0) {
      router.replace("/affiliated-colleges/student-exam-registration-summary");
    }
  }, [searchParams, summaryContext, router]);

  const stagingColumnDefs = useMemo<ColDef<AffiliatedExamRegPivotRow>[]>(
    () => buildAffiliatedExamRegStagingColDefs(subjectCodes),
    [subjectCodes],
  );

  async function onUploadFile(selected: File) {
    if (!cascade.filtersValid || !filterParams.examId) {
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
      const rows = await importAffiliatedExamRegistrationFile(
        selected,
        importMeta,
      );
      setStagingRows(rows);
      const pivot = pivotAffiliatedExamRegStagingRows(rows);
      setPivotRows(pivot.rows);
      setSubjectCodes(pivot.subjectCodes);
      setFile(selected);
      if (rows.length === 0) {
        toastInfo(
          "Upload succeeded but no staged rows were returned. Try re-uploading the file.",
        );
      } else if (pivot.rows.length === 0) {
        toastInfo(
          "Upload succeeded but staged rows could not be displayed. You can still try Verify if upload id exists.",
        );
      } else {
        toastSuccess(
          "File uploaded. Review staged exam registration and click Verify.",
        );
      }
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
      const result = await verifyAffiliatedExamRegistrationUpload({
        ...filterParams,
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
      const loaded = await submitAffiliatedExamRegistrationUpload({
        ...filterParams,
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
      toastSuccess("Exam registration submitted to university successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const downloadBaseName = `${importMeta.collegeCode || "college"}_${importMeta.courseCode || "course"}_Std_Exam_Reg`;
  const showUploadCard = Boolean(templateData?.length) && !templateLoading;

  function onDownloadTemplateExcel() {
    if (templateLoading) return;
    // Angular: if (sampleExcelData && sampleExcelData.length > 0) download; else "No Students"
    if (!templateData || templateData.length === 0) {
      toastInfo("No Students");
      return;
    }
    const result = downloadAffiliatedExamRegistrationTemplateExcel(
      templateData,
      `${downloadBaseName}.xlsx`,
    );
    if (!result.ok) toastInfo(result.message);
  }

  return (
    <FilteredPage
      title="College Student Exam Fee Registration"
      filtersCollapsible={false}
      filters={
        <AffiliatedCollegeFilters
          title="Student Exam Registration Bulk Upload"
          cascade={cascade}
          onGetDetails={() => {}}
          loadingDetails={templateLoading}
          allowAllGroupYear
          readOnly
          showExam
          examFirst
          hideGetDetails
          showBack
          onBack={() => {
            saveAffiliatedExamRegSummaryContext({
              fk_college_id: filterParams.collegeId,
              fk_academic_year_id: filterParams.academicYearId,
              fk_course_id: filterParams.courseId,
              fk_course_group_id: filterParams.courseGroupId,
              fk_course_year_id: filterParams.courseYearId,
              fk_exam_id: filterParams.examId,
            });
            router.push(
              "/affiliated-colleges/student-exam-registration-summary",
            );
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
              Download &amp; Upload — Exam Registration
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

      {pivotRows.length > 0 || stagingRows.length > 0 ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title={
                cascade.contextLabel
                  ? `Verify — Exam Registration : ${cascade.contextLabel}`
                  : "Verify — Exam Registration"
              }
              rowData={
                pivotRows.length > 0
                  ? pivotRows
                  : stagingRows
              }
              columnDefs={
                pivotRows.length > 0
                  ? stagingColumnDefs
                  : AFFILIATED_EXAM_REG_LOADED_COLS
              }
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
          <div className="flex justify-end px-1">
            <Button
              type="button"
              onClick={() => void onVerify()}
              disabled={verifying || stagingRows.length === 0}
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
                  ? `Uploaded — Exam Registration : ${cascade.contextLabel}`
                  : "Uploaded — Exam Registration"
              }
              rowData={loadedRows}
              columnDefs={AFFILIATED_EXAM_REG_LOADED_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        </div>
      ) : null}

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Exam Registration Upload"
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
          columnDefs={AFFILIATED_EXAM_REG_VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Load Exam Registration"
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
