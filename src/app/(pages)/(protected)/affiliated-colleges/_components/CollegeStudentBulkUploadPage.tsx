"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import { DataTable, TableCard } from "@/common/components/table";
import { FormModal } from "@/common/components/feedback";
import { FilteredPage, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import {
  getAffiliatedStudentUploadTemplate,
  importAffiliatedDostFileOnly,
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
import { AffiliatedExcelDownloadUpload } from "./AffiliatedExcelActionPanel";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

type AnyRow = Record<string, unknown>;
type UploadMode = "students" | "dost";

/** Angular embedded DOST tab columns on `college-student-bulk-upload`. */
const DOST_INLINE_STAGING_COLS: ColDef<AnyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: "nominalRollNumber", headerName: "Roll Number", minWidth: 130 },
  { field: "applicantName", headerName: "Applicant Name", minWidth: 170 },
  { field: "collegeName", headerName: "College Name", minWidth: 180 },
  { field: "courseCategory", headerName: "Course Category", minWidth: 140 },
  { field: "mobileNumber", headerName: "Mobile", minWidth: 120 },
  { field: "dateOfJoining", headerName: "Date Of Joining", minWidth: 130 },
];

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

  /** Angular `check` — 1 = College Students Upload, 2 = DOST */
  const [uploadMode, setUploadMode] = useState<UploadMode>("students");
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
  const [dostStagingRows, setDostStagingRows] = useState<AnyRow[]>([]);
  const [dostFile, setDostFile] = useState<File | null>(null);
  const [dostUploading, setDostUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dostInputRef = useRef<HTMLInputElement>(null);

  /** Angular `clear($event)` — reset grids/template when switching radio. */
  function clearUploadMode(next: UploadMode) {
    setUploadMode(next);
    setTemplateData(null);
    setStagingRows([]);
    setLoadedRows([]);
    setFile(null);
    setVerifyProblems(null);
    setSubmitOpen(false);
    setComments("");
    setDostStagingRows([]);
    setDostFile(null);
    if (inputRef.current) inputRef.current.value = "";
    if (dostInputRef.current) dostInputRef.current.value = "";
  }

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
      if (!Array.isArray(result) || result.length === 0 || !result[0]) {
        setTemplateData(null);
        toastInfo("No template data returned for the selected filters.");
        return;
      }
      setTemplateData(enrichAffiliatedStudentTemplate(result, templateMeta));
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setTemplateLoading(false);
    }
  }, [cascade.filtersValid, filterParams, templateMeta]);

  useEffect(() => {
    if (uploadMode !== "students") return;
    if (!cascade.filtersValid) return;
    void loadTemplate();
  }, [
    uploadMode,
    cascade.filtersValid,
    filterParams.collegeId,
    filterParams.academicYearId,
    filterParams.courseId,
    filterParams.courseGroupId,
    filterParams.courseYearId,
    loadTemplate,
  ]);

  useEffect(() => {
    if (uploadMode !== "students") return;
    const collegeId =
      numParam(searchParams, "collegeId") ||
      (summaryContext?.fk_college_id ?? 0);
    if (collegeId <= 0) {
      router.replace("/affiliated-colleges/student-summary");
    }
  }, [uploadMode, searchParams, summaryContext, router]);

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

  /** Angular `uploadFileDost` — file-only POST to `importStdDostDetails`. */
  async function onUploadDostFile(selected: File) {
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toastError(
        "Invalid file type. Please upload an Excel file (.xlsx or .xls).",
      );
      return;
    }
    setDostUploading(true);
    try {
      const rows = await importAffiliatedDostFileOnly(selected);
      setDostStagingRows(rows);
      setDostFile(selected);
      toastSuccess("DOST file uploaded successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
      setDostFile(null);
      setDostStagingRows([]);
    } finally {
      setDostUploading(false);
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

  function onDownloadSampleExcel() {
    if (!templateData) {
      toastInfo("Template is still loading. Please wait and try again.");
      return;
    }
    const result = downloadAffiliatedStudentTemplateExcel(
      templateData,
      `${downloadBaseName}_Students.xlsx`,
    );
    if (!result.ok) toastInfo(result.message);
  }

  function onDownloadExistingStudentsExcel() {
    if (!templateData) return;
    const result = downloadAffiliatedExistingStudentsExcel(
      templateData,
      `${downloadBaseName}_existingStudents.xlsx`,
    );
    if (!result.ok) toastInfo(result.message);
  }

  function onDownloadDictionaryExcel() {
    if (!templateData) return;
    const result = downloadAffiliatedStudentDictionaryExcel(templateData);
    if (!result.ok) toastInfo(result.message);
  }

  const modeToggle = (
    <RadioGroup
      value={uploadMode}
      className="mb-2 flex flex-wrap gap-x-10 gap-y-2 px-1"
      onValueChange={(value) => clearUploadMode(value as UploadMode)}
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem id="affiliated-upload-students" value="students" />
        <Label htmlFor="affiliated-upload-students" className="font-normal">
          College Students Upload
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="affiliated-upload-dost" value="dost" />
        <Label htmlFor="affiliated-upload-dost" className="font-normal">
          DOST
        </Label>
      </div>
    </RadioGroup>
  );

  if (uploadMode === "dost") {
    return (
      <PageContainer className="space-y-4">
        {modeToggle}
        <div className="app-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">Dost Upload</h2>
          </div>
          <AffiliatedExcelDownloadUpload
            downloadTitle="1. Download Dost Sample"
            uploadTitle="2. Upload Dost"
            downloadHref="/assets/docs/DostUpload_bulk_upload.xlsx"
            onUploadClick={() => dostInputRef.current?.click()}
            uploading={dostUploading}
            fileName={dostFile?.name}
            onClearFile={() => {
              setDostFile(null);
              setDostStagingRows([]);
              if (dostInputRef.current) dostInputRef.current.value = "";
            }}
            inputRef={dostInputRef}
            onFileSelected={(selected) => void onUploadDostFile(selected)}
          />
        </div>

        {dostStagingRows.length > 0 ? (
          <TableCard withHeaderBorder={false}>
            <DataTable
              title="Students Dost Upload List"
              rowData={dostStagingRows}
              columnDefs={DOST_INLINE_STAGING_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        ) : null}
      </PageContainer>
    );
  }

  return (
    <FilteredPage
      title="College Student Bulk Upload"
      filtersCollapsible={false}
      notice={modeToggle}
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
                  onClick={onDownloadExistingStudentsExcel}
                >
                  Download Existing Students Data
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!templateData}
                onClick={onDownloadDictionaryExcel}
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
          <AffiliatedExcelDownloadUpload
            downloadTitle="1. Download Students Upload Sample"
            uploadTitle="2. Upload Students"
            onDownload={onDownloadSampleExcel}
            onUploadClick={() => inputRef.current?.click()}
            uploading={uploading}
            fileName={file?.name}
            onClearFile={() => {
              setFile(null);
              setStagingRows([]);
              if (inputRef.current) inputRef.current.value = "";
            }}
            inputRef={inputRef}
            onFileSelected={(selected) => void onUploadFile(selected)}
          />
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
        showCancelButton={false}
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
