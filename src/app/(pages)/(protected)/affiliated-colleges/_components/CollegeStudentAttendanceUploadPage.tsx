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
import { DatePicker } from "@/common/components/date-picker";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toDateOnlyISO } from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getAffiliatedStudentAttendanceUploadTemplate,
  importAffiliatedStudentAttendanceFile,
  resolveAffiliatedEmployeeId,
  submitAffiliatedStudentAttendanceUpload,
  verifyAffiliatedStudentAttendanceUpload,
} from "@/services";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  AFFILIATED_ATTENDANCE_LOADED_COLS,
  AFFILIATED_ATTENDANCE_VERIFY_COLS,
  buildAffiliatedAttendanceStagingColDefs,
} from "../_lib/affiliated-attendance-upload-columns";
import {
  downloadAffiliatedStudentAttendanceTemplateExcel,
  pivotAffiliatedAttendanceStagingRows,
  type AffiliatedAttendancePivotRow,
} from "../_lib/affiliated-attendance-upload-excel";
import {
  contextToAttendanceInitialSelection,
  parseAttendanceContextDate,
  readAffiliatedAttendanceSummaryContext,
  saveAffiliatedAttendanceSummaryContext,
} from "../_lib/affiliated-attendance-summary-context";
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

export function CollegeStudentAttendanceUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryContext = useMemo(
    () => readAffiliatedAttendanceSummaryContext(),
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
      };
    }
    if (summaryContext) {
      return contextToAttendanceInitialSelection(summaryContext);
    }
    return undefined;
  }, [searchParams, summaryContext]);

  const [fromDate, setFromDate] = useState<Date | null>(() => {
    if (searchParams.has("fromDate")) {
      return parseAttendanceContextDate(searchParams.get("fromDate") ?? undefined);
    }
    return parseAttendanceContextDate(summaryContext?.fdate) ?? new Date();
  });
  const [toDate, setToDate] = useState<Date | null>(() => {
    if (searchParams.has("toDate")) {
      return parseAttendanceContextDate(searchParams.get("toDate") ?? undefined);
    }
    return parseAttendanceContextDate(summaryContext?.tdate) ?? new Date();
  });

  // Same filter source as Student Attendance Summary (`cls_timtable_filters`).
  // `clg_exam_filters` often has college/AY but no course rows for this cascade,
  // which left Course / Group / Year empty after Upload navigation.
  const cascade = useAffiliatedCascade({
    allowAllGroupYear: true,
    autoSelectFirst: !fromSummary,
    timetableFilters: true,
    scopeByAcademicYear: true,
    initialSelection: fromSummary ? initialSelection : undefined,
  });

  const [templateData, setTemplateData] = useState<unknown[][] | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [stagingRows, setStagingRows] = useState<AnyRow[]>([]);
  const [pivotRows, setPivotRows] = useState<AffiliatedAttendancePivotRow[]>([]);
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

  const fromDateYmd = fromDate ? toDateOnlyISO(fromDate) : "";
  const toDateYmd = toDate ? toDateOnlyISO(toDate) : "";

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

    const fileDescription = [
      collegeCode ? `collegeCode : ${collegeCode}` : "",
      academicYearLabel ? ` academicYear : ${academicYearLabel}` : "",
      courseCode ? `courseCode : ${courseCode}` : "",
      groupCode ? ` courseGroup : ${groupCode}` : "",
      courseYearLabel ? ` courseYear : ${courseYearLabel}` : "",
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
      fileUploadedByEmpId: resolveAffiliatedEmployeeId(),
      fromDate: fromDateYmd,
      toDate: toDateYmd,
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
    fromDateYmd,
    toDateYmd,
  ]);

  const filterParamsRef = useRef(filterParams);
  filterParamsRef.current = filterParams;
  const dateParamsRef = useRef({ fromDate: fromDateYmd, toDate: toDateYmd });
  dateParamsRef.current = { fromDate: fromDateYmd, toDate: toDateYmd };

  const loadTemplate = useCallback(async (
    params: typeof filterParams,
    dates: { fromDate: string; toDate: string },
  ) => {
    if (!dates.fromDate || !dates.toDate) return;
    setTemplateLoading(true);
    try {
      const result = await getAffiliatedStudentAttendanceUploadTemplate({
        ...params,
        fromDate: dates.fromDate,
        toDate: dates.toDate,
      });
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
  }, []);

  useEffect(() => {
    if (
      !cascade.filtersValid ||
      cascade.isLoading ||
      !fromDateYmd ||
      !toDateYmd
    ) {
      return;
    }
    void loadTemplate(filterParams, {
      fromDate: fromDateYmd,
      toDate: toDateYmd,
    });
  }, [
    cascade.filtersValid,
    cascade.isLoading,
    filterParams.collegeId,
    filterParams.academicYearId,
    filterParams.courseId,
    filterParams.courseGroupId,
    filterParams.courseYearId,
    fromDateYmd,
    toDateYmd,
    loadTemplate,
  ]);

  useEffect(() => {
    const collegeId =
      numParam(searchParams, "collegeId") ||
      (summaryContext?.fk_college_id ?? 0);
    if (collegeId <= 0) {
      router.replace("/affiliated-colleges/student-attendance-summary");
    }
  }, [searchParams, summaryContext, router]);

  const stagingColumnDefs = useMemo<ColDef<AffiliatedAttendancePivotRow>[]>(
    () => buildAffiliatedAttendanceStagingColDefs(subjectCodes),
    [subjectCodes],
  );

  async function onUploadFile(selected: File) {
    if (!cascade.filtersValid || !fromDateYmd || !toDateYmd) {
      toastError("Select all filters and dates before uploading.");
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
      const rows = await importAffiliatedStudentAttendanceFile(selected, importMeta);
      setStagingRows(rows);
      const pivot = pivotAffiliatedAttendanceStagingRows(rows);
      setPivotRows(pivot.rows);
      setSubjectCodes(pivot.subjectCodes);
      setFile(selected);
      toastSuccess("File uploaded. Review staged attendance and click Verify.");
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
      const result = await verifyAffiliatedStudentAttendanceUpload({
        ...filterParams,
        univUploadfileId: uploadId,
        fromDate: fromDateYmd,
        toDate: toDateYmd,
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
      const loaded = await submitAffiliatedStudentAttendanceUpload({
        ...filterParams,
        univUploadfileId: uploadId,
        comments,
        fromDate: fromDateYmd,
        toDate: toDateYmd,
      });
      setLoadedRows(loaded);
      setStagingRows([]);
      setPivotRows([]);
      setSubjectCodes([]);
      setFile(null);
      setSubmitOpen(false);
      setComments("");
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess("Student attendance submitted to university successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const downloadBaseName = `${importMeta.collegeCode || "college"}_${importMeta.courseCode || "course"}_Attendance`;
  const showUploadCard = Boolean(templateData?.length) && !templateLoading;

  function onDownloadTemplateExcel() {
    if (templateLoading) return;
    if (!templateData) {
      toastInfo("No Students");
      return;
    }
    const result = downloadAffiliatedStudentAttendanceTemplateExcel(
      templateData,
      `${downloadBaseName}.xlsx`,
    );
    if (!result.ok) toastInfo(result.message);
  }

  return (
    <FilteredPage
      title="College Student Attendance Upload"
      filtersCollapsible={false}
      filters={
        <AffiliatedCollegeFilters
          title="Student Attendance Bulk Upload"
          cascade={cascade}
          onGetDetails={() => {}}
          loadingDetails={templateLoading}
          allowAllGroupYear
          readOnly
          hideGetDetails
          showBack
          onBack={() => {
            if (fromDate && toDate) {
              saveAffiliatedAttendanceSummaryContext({
                fk_college_id: filterParams.collegeId,
                fk_academic_year_id: filterParams.academicYearId,
                fk_course_id: filterParams.courseId,
                fk_course_group_id: filterParams.courseGroupId,
                fk_course_year_id: filterParams.courseYearId,
                fdate: toDateOnlyISO(fromDate),
                tdate: toDateOnlyISO(toDate),
              });
            }
            router.push("/affiliated-colleges/student-attendance-summary");
          }}
          footerExtraAlign="start"
          footerExtra={
            <>
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                disabled
              />
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                disabled
              />
            </>
          }
          bare
        />
      }
    >
      {showUploadCard ? (
        <div className="app-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">
              Download &amp; Upload — Students Attendance
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
                  ? `Verify — Student Attendance : ${cascade.contextLabel}`
                  : "Verify — Student Attendance"
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
                  ? `Uploaded — Student Attendance : ${cascade.contextLabel}`
                  : "Uploaded — Student Attendance"
              }
              rowData={loadedRows}
              columnDefs={AFFILIATED_ATTENDANCE_LOADED_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        </div>
      ) : null}

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Student Attendance Upload"
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
          columnDefs={AFFILIATED_ATTENDANCE_VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Load Student Attendance"
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
