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
import { DataTable, TableCard } from "@/common/components/table";
import { FormModal } from "@/common/components/feedback";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getAffiliatedStudentUploadTemplate,
  importAffiliatedStudentFile,
  resolveAffiliatedEmployeeId,
  submitAffiliatedStudentUpload,
  verifyAffiliatedStudentUpload,
} from "@/services";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  AFFILIATED_STUDENT_LOADED_COLS,
  AFFILIATED_STUDENT_STAGING_COLS,
  AFFILIATED_STUDENT_VERIFY_COLS,
} from "../_lib/affiliated-student-upload-columns";
import {
  buildAffiliatedStudentTemplateMeta,
  downloadAffiliatedExistingStudentsExcel,
  downloadAffiliatedStudentDictionaryExcel,
  downloadAffiliatedStudentTemplateExcel,
  enrichAffiliatedStudentTemplate,
  getAffiliatedExistingStudentsMeta,
  pickAffiliatedExistingStudentsCount,
} from "../_lib/affiliated-student-upload-excel";
import {
  contextToInitialSelection,
  readAffiliatedSummaryContext,
  saveAffiliatedSummaryContext,
} from "../_lib/affiliated-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

type AnyRow = Record<string, unknown>;

function numParam(sp: URLSearchParams, key: string): number {
  const n = Number(sp.get(key) ?? 0);
  return Number.isFinite(n) ? n : 0;
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

function pickFilterRowId(row: AnyRow | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export function CollegeStudentBulkUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryContext = useMemo(() => readAffiliatedSummaryContext(), []);
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
      };
    }
    if (summaryContext) return contextToInitialSelection(summaryContext);
    return undefined;
  }, [searchParams, summaryContext]);

  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !fromSummary,
    initialSelection: fromSummary ? initialSelection : undefined,
  });

  const [templateData, setTemplateData] = useState<unknown[][] | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [stagingRows, setStagingRows] = useState<AnyRow[]>([]);
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

  const importMeta = useMemo(() => {
    const college = cascade.colleges.find(
      (c) => Number(c.fk_college_id ?? c.collegeId) === cascade.collegeId,
    );
    const academicYear = cascade.academicYears.find(
      (a) =>
        Number(a.fk_academic_year_id ?? a.academicYearId) ===
        cascade.academicYearId,
    );
    const course = cascade.courses.find(
      (c) => Number(c.fk_course_id ?? c.courseId) === cascade.courseId,
    );
    const courseGroup = cascade.courseGroups.find(
      (g) =>
        Number(g.fk_course_group_id ?? g.courseGroupId) ===
        cascade.courseGroupId,
    );
    const courseYear = cascade.courseYears.find(
      (y) =>
        Number(y.fk_course_year_id ?? y.courseYearId) === cascade.courseYearId,
    );
    const collegeCode = pickAffiliatedText(college, [
      "college_code",
      "collegeCode",
    ]);
    const academicYearLabel = pickAffiliatedText(academicYear, [
      "academic_year",
      "academicYear",
    ]);
    const courseCode = pickAffiliatedText(course, [
      "course_code",
      "courseCode",
    ]);
    const courseGroupLabel =
      cascade.courseGroupId === 0
        ? "All"
        : pickAffiliatedText(courseGroup, [
            "group_code",
            "groupCode",
            "group_name",
            "groupName",
          ]);
    const courseYearLabel =
      cascade.courseYearId === 0
        ? "All"
        : pickAffiliatedText(courseYear, [
            "course_year_name",
            "courseYearName",
          ]);
    // Angular fileDescription format (exact label spacing, including missing space before courseCode)
    const fileDescription = `collegeCode : ${collegeCode} academicYear : ${academicYearLabel}courseCode : ${courseCode} courseGroup : ${courseGroupLabel} courseYear : ${courseYearLabel}`;
    return {
      universityCode: pickAffiliatedText(college, [
        "university_code",
        "universityCode",
      ]),
      collegeCode,
      courseCode,
      fileDescription,
      fileUploadedByEmpId: resolveAffiliatedEmployeeId(),
      ...filterParams,
    };
  }, [
    cascade.colleges,
    cascade.academicYears,
    cascade.courses,
    cascade.courseGroups,
    cascade.courseYears,
    cascade.collegeId,
    cascade.academicYearId,
    cascade.courseId,
    cascade.courseGroupId,
    cascade.courseYearId,
    filterParams,
  ]);

  const templateMeta = useMemo(() => {
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
        pickFilterRowId(y as AnyRow, ["fk_course_year_id", "courseYearId"]) ===
        cascade.courseYearId,
    );
    return buildAffiliatedStudentTemplateMeta({
      universityCode: pickAffiliatedText(college, [
        "university_code",
        "universityCode",
      ]),
      collegeCode: pickAffiliatedText(college, ["college_code", "collegeCode"]),
      academicYear: pickAffiliatedText(academicYear, [
        "academic_year",
        "academicYear",
      ]),
      courseCode: pickAffiliatedText(course, ["course_code", "courseCode"]),
      courseGroup: pickAffiliatedText(courseGroup, ["group_code", "groupCode"]),
      courseYear: pickAffiliatedText(courseYear, [
        "course_year_name",
        "courseYearName",
      ]),
    });
  }, [
    cascade.colleges,
    cascade.academicYears,
    cascade.courses,
    cascade.courseGroups,
    cascade.courseYears,
    cascade.collegeId,
    cascade.academicYearId,
    cascade.courseId,
    cascade.courseGroupId,
    cascade.courseYearId,
  ]);

  const existingStudentsMeta = useMemo(
    () => getAffiliatedExistingStudentsMeta(templateData),
    [templateData],
  );

  const existingCount = useMemo(
    () => pickAffiliatedExistingStudentsCount(existingStudentsMeta),
    [existingStudentsMeta],
  );

  const loadTemplate = useCallback(async () => {
    if (!cascade.filtersValid) return;
    setTemplateLoading(true);
    try {
      const result = await getAffiliatedStudentUploadTemplate(filterParams);
      setTemplateData(enrichAffiliatedStudentTemplate(result, templateMeta));
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setTemplateLoading(false);
    }
  }, [cascade.filtersValid, filterParams, templateMeta]);

  useEffect(() => {
    if (!cascade.filtersValid) return;
    void loadTemplate();
  }, [
    cascade.filtersValid,
    filterParams.collegeId,
    filterParams.academicYearId,
    filterParams.courseId,
    filterParams.courseGroupId,
    filterParams.courseYearId,
    loadTemplate,
  ]);

  useEffect(() => {
    const collegeId =
      numParam(searchParams, "collegeId") ||
      (summaryContext?.fk_college_id ?? 0);
    if (collegeId <= 0) {
      router.replace("/affiliated-colleges/student-summary");
    }
  }, [searchParams, summaryContext, router]);

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
      const rows = await importAffiliatedStudentFile(selected, importMeta);
      setStagingRows(rows);
      setFile(selected);
      toastSuccess("File uploaded. Review staged students and click Verify.");
    } catch (err) {
      toastError(getErrorMessage(err));
      setFile(null);
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
      const result = await verifyAffiliatedStudentUpload({
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
      const loaded = await submitAffiliatedStudentUpload({
        ...filterParams,
        univUploadfileId: uploadId,
        comments,
      });
      setLoadedRows(loaded);
      setStagingRows([]);
      setFile(null);
      setSubmitOpen(false);
      setComments("");
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess("Students submitted to university successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const downloadBaseName = `${importMeta.collegeCode || "college"}_${importMeta.courseCode || "course"}`;

  return (
    <FilteredPage
      title="College Student Bulk Upload"
      filtersCollapsible={false}
      filters={
        <AffiliatedCollegeFilters
          title="Students Data Upload"
          cascade={cascade}
          onGetDetails={() => void loadTemplate()}
          loadingDetails={templateLoading}
          allowAllGroupYear
          readOnly
          hideGetDetails
          showBack
          onBack={() => {
            saveAffiliatedSummaryContext({
              fk_college_id: filterParams.collegeId,
              fk_academic_year_id: filterParams.academicYearId,
              fk_course_id: filterParams.courseId,
              fk_course_group_id: filterParams.courseGroupId,
              fk_course_year_id: filterParams.courseYearId,
            });
            router.push("/affiliated-colleges/student-summary");
          }}
          footerExtra={
            <div className="flex flex-wrap items-center gap-2 mr-auto">
              {existingStudentsMeta ? (
                <p className="text-sm text-muted-foreground">
                  Existing Students Count&nbsp;:&nbsp;{existingCount}
                </p>
              ) : null}
              {existingStudentsMeta ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!templateData}
                  onClick={() => {
                    if (!templateData) return;
                    downloadAffiliatedExistingStudentsExcel(
                      templateData,
                      `${downloadBaseName}_existingStudents.xlsx`,
                    );
                  }}
                >
                  Download Existing Students Data
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!templateData}
                onClick={() =>
                  templateData &&
                  downloadAffiliatedStudentDictionaryExcel(templateData)
                }
              >
                Download Data Dictionary
              </Button>
            </div>
          }
          bare
        />
      }
    >
      {templateData ? (
        <div className="app-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">
              Download &amp; Upload — Students Data
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  downloadAffiliatedStudentTemplateExcel(
                    templateData,
                    `${downloadBaseName}_Students.xlsx`,
                  )
                }
              >
                <Download className="h-4 w-4" />
                Download Sample Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={uploading}
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

      {stagingRows.length > 0 ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title={
                cascade.contextLabel
                  ? `Verify — Students Data : ${cascade.contextLabel}`
                  : "Verify — Students Data"
              }
              rowData={stagingRows}
              columnDefs={AFFILIATED_STUDENT_STAGING_COLS}
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
                  ? `Uploaded — Students Data : ${cascade.contextLabel}`
                  : "Uploaded — Students Data"
              }
              rowData={loadedRows}
              columnDefs={AFFILIATED_STUDENT_LOADED_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        </div>
      ) : null}

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Student Upload"
        submitLabel="Close"
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
          columnDefs={AFFILIATED_STUDENT_VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Verify Students Upload"
        // cancelLabel="Close"
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
