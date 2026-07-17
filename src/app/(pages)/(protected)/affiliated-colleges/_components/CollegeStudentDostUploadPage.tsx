"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
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
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  importAffiliatedDostFile,
  loadAffiliatedDostUpload,
  resolveAffiliatedEmployeeId,
  verifyAffiliatedDostUpload,
} from "@/services";
import { pickAffiliatedText } from "../_lib/enrich-affiliated-summary-rows";
import {
  contextToDostInitialSelection,
  readAffiliatedDostSummaryContext,
  saveAffiliatedDostSummaryContext,
} from "../_lib/affiliated-dost-summary-context";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";

type AnyRow = Record<string, unknown>;

const DOST_STAGING_COLS: ColDef<AnyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: "dostId", headerName: "Dost Id", minWidth: 100 },
  { field: "nominalRollNumber", headerName: "Roll Number", minWidth: 130 },
  { field: "applicantName", headerName: "Applicant Name", minWidth: 170 },
  { field: "collegeName", headerName: "College Name", minWidth: 180 },
  { field: "courseCategory", headerName: "Course Category", minWidth: 140 },
  { field: "mobileNumber", headerName: "Mobile", minWidth: 120 },
  { field: "fatherName", headerName: "Father Name", minWidth: 140 },
  { field: "dateOfJoining", headerName: "Date Of Joining", minWidth: 130 },
];

const DOST_VERIFY_COLS: ColDef<AnyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Reference Number",
    minWidth: 140,
    valueGetter: (p) => String(p.data?.dost_id ?? p.data?.dostId ?? ""),
  },
  {
    headerName: "Course Category",
    minWidth: 140,
    valueGetter: (p) =>
      String(p.data?.course_category ?? p.data?.courseCategory ?? ""),
  },
  {
    headerName: "Problem",
    minWidth: 220,
    flex: 1,
    valueGetter: (p) => String(p.data?.problem ?? p.data?.Problem ?? ""),
  },
];

function pickUploadFileId(rows: AnyRow[]): number {
  const first = rows[0] ?? {};
  return Number(
    first.univUploadFilesId ??
      first.univ_uploadfile_id ??
      first.univUploadFileId ??
      0,
  );
}

/** Angular `college-student-dost-upload` — locked university/college/AY, sample download, verify/load. */
export function CollegeStudentDostUploadPage() {
  const router = useRouter();
  const dostContext = useMemo(() => readAffiliatedDostSummaryContext(), []);
  const cascade = useAffiliatedCascade({
    requireGroupYear: false,
    requireCourse: false,
    requireUniversity: true,
    autoSelectFirst: false,
    initialSelection: dostContext
      ? contextToDostInitialSelection(dostContext)
      : undefined,
  });

  const [showUpload, setShowUpload] = useState(false);
  const [stagingRows, setStagingRows] = useState<AnyRow[]>([]);
  const [loadedRows, setLoadedRows] = useState<AnyRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyProblems, setVerifyProblems] = useState<AnyRow[] | null>(null);
  const [loadConfirmOpen, setLoadConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dostContext) {
      router.replace("/affiliated-colleges/student-dost-upload-summary");
    }
  }, [dostContext, router]);

  useEffect(() => {
    if (cascade.filtersValid) setShowUpload(true);
  }, [cascade.filtersValid]);

  const filterParams = useMemo(
    () => ({
      collegeId: cascade.collegeId ?? 0,
      academicYearId: cascade.academicYearId ?? 0,
    }),
    [cascade.collegeId, cascade.academicYearId],
  );

  const contextLabel = useMemo(() => {
    const college = cascade.colleges.find(
      (c) => Number(c.fk_college_id ?? c.collegeId) === cascade.collegeId,
    );
    const academicYear = cascade.academicYears.find(
      (a) =>
        Number(a.fk_academic_year_id ?? a.academicYearId) ===
        cascade.academicYearId,
    );
    const parts = [
      pickAffiliatedText(college, ["college_code", "collegeCode"]),
      pickAffiliatedText(academicYear, ["academic_year", "academicYear"]),
    ].filter(Boolean);
    return parts.join(" / ");
  }, [
    cascade.colleges,
    cascade.academicYears,
    cascade.collegeId,
    cascade.academicYearId,
  ]);

  const importMeta = useMemo(() => {
    const college = cascade.colleges.find(
      (c) => Number(c.fk_college_id ?? c.collegeId) === cascade.collegeId,
    );
    const academicYear = cascade.academicYears.find(
      (a) =>
        Number(a.fk_academic_year_id ?? a.academicYearId) ===
        cascade.academicYearId,
    );
    const collegeCode = pickAffiliatedText(college, [
      "college_code",
      "collegeCode",
    ]);
    const academicYearLabel = pickAffiliatedText(academicYear, [
      "academic_year",
      "academicYear",
    ]);
    const fileDescription = `collegeCode : ${collegeCode} academicYear : ${academicYearLabel}`;
    return {
      collegeId: filterParams.collegeId,
      academicYearId: filterParams.academicYearId,
      fileDescription,
      fileUploadedByEmpId: resolveAffiliatedEmployeeId(),
    };
  }, [
    cascade.colleges,
    cascade.academicYears,
    cascade.collegeId,
    cascade.academicYearId,
    filterParams,
  ]);

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
      const rows = await importAffiliatedDostFile(selected, importMeta);
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
      const result = await verifyAffiliatedDostUpload({
        ...filterParams,
        univUploadfileId: uploadId,
      });
      if (result.length > 0) {
        setVerifyProblems(result);
      } else {
        setLoadConfirmOpen(true);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function onLoadData() {
    const uploadId = pickUploadFileId(stagingRows);
    if (!uploadId) {
      toastError("Upload file id missing.");
      return;
    }
    setLoading(true);
    try {
      const rows = await loadAffiliatedDostUpload({
        ...filterParams,
        univUploadfileId: uploadId,
      });
      setLoadedRows(rows);
      setStagingRows([]);
      setFile(null);
      setLoadConfirmOpen(false);
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess("Dost students loaded successfully.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!dostContext) return null;

  return (
    <FilteredPage
      title="College Student Dost Upload"
      filtersCollapsible={false}
      filters={
        <AffiliatedCollegeFilters
          title="College Student Dost Upload"
          cascade={cascade}
          onGetDetails={() => setShowUpload(true)}
          hideCourse
          showUniversity
          readOnly
          getDetailsLabel="Get Template"
          showBack
          onBack={() => {
            saveAffiliatedDostSummaryContext({
              fk_university_id:
                cascade.universityId ?? dostContext.fk_university_id,
              fk_college_id: filterParams.collegeId,
              fk_academic_year_id: filterParams.academicYearId,
            });
            router.push("/affiliated-colleges/student-dost-upload-summary");
          }}
          bare
        />
      }
    >
      {showUpload ? (
        <div className="app-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">Dost Upload</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" asChild>
                <a href="/assets/docs/DostUpload_bulk_upload.xlsx" download>
                  <Download className="h-4 w-4" />
                  Download Sample Excel
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={uploading || !cascade.filtersValid}
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
                contextLabel
                  ? `Students Dost Upload List : ${contextLabel}`
                  : "Students Dost Upload List"
              }
              rowData={stagingRows}
              columnDefs={DOST_STAGING_COLS}
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
                contextLabel
                  ? `Uploaded Dost — Students Data : ${contextLabel}`
                  : "Uploaded Dost — Students Data"
              }
              rowData={loadedRows}
              columnDefs={DOST_STAGING_COLS}
              subtitle=""
              toolbar={{ search: true, columnPicker: false, exportPdf: false }}
            />
          </TableCard>
        </div>
      ) : null}

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Student Dost Upload"
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
          columnDefs={DOST_VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={loadConfirmOpen}
        onClose={() => setLoadConfirmOpen(false)}
        title="Verify Students Upload"
        cancelLabel="Close"
        submitLabel="Load Data"
        isSubmitting={loading}
        onSubmit={(e) => {
          e.preventDefault();
          void onLoadData();
        }}
        size="md"
      >
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden />
          <p className="text-sm font-semibold text-emerald-700">
            Data Verified Successfully
          </p>
        </div>
      </FormModal>
    </FilteredPage>
  );
}
