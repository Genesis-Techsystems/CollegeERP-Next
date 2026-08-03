"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
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
import { cn, rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  loadUnitTopicStaging,
  uploadStgUnitTopicExcel,
  verifyUnitTopicStaging,
  type SubjectUnitTopicStagingRow,
  type UnitTopicVerifyRow,
} from "@/services";

function ExcelActionTile({
  icon,
  label,
  onClick,
  href,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const className = cn(
    "flex w-full max-w-[14rem] flex-col items-center rounded-[5px] bg-[#00b9ff] px-3 py-3 text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition",
    "hover:bg-[#00a8e8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)]",
    "disabled:pointer-events-none disabled:opacity-60",
  );

  const content = (
    <>
      <span className="mb-2 inline-flex items-center justify-center text-white">
        {icon}
      </span>
      <span className="text-center text-sm font-semibold leading-tight">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} download className={className}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
}

function ExcelActionPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[3px] border-2 border-[#89c5ff] px-3 py-4">
      <h3 className="mb-4 w-full text-center text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

const STAGING_COLS: ColDef<SubjectUnitTopicStagingRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: "university", headerName: "University", minWidth: 140 },
  { field: "college", headerName: "College", minWidth: 140 },
  { field: "course", headerName: "Course", minWidth: 140 },
  { field: "regulation", headerName: "Regulation", minWidth: 120 },
  { field: "courseYear", headerName: "Course Year", minWidth: 110 },
  { field: "subjectCode", headerName: "Subject Code", minWidth: 120 },
  { field: "unitCode", headerName: "Unit Code", minWidth: 110 },
  { field: "unitSortOrder", headerName: "Unit SortOrder", minWidth: 120 },
  { field: "unitName", headerName: "Unit Name", minWidth: 150 },
  { field: "topicName", headerName: "Topic", minWidth: 150 },
  { field: "topicSortOrder", headerName: "Topic SortOrder", minWidth: 130 },
  { field: "startPeriodNo", headerName: "startPeriodNo", minWidth: 120 },
  { field: "endPeriodNo", headerName: "endPeriodNo", minWidth: 120 },
];

const VERIFY_COLS: ColDef<UnitTopicVerifyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: "Data", headerName: "Unit", minWidth: 180, flex: 1 },
  { field: "Problem", headerName: "Problem", minWidth: 220, flex: 1.2 },
];

/** Angular `subject-unit-topics-bulk-upload` → `/excel-bulk-uploads/subject-unit-topic-upload`. */
export default function SubjectUnitTopicUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stagingRows, setStagingRows] = useState<SubjectUnitTopicStagingRow[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyProblems, setVerifyProblems] = useState<
    UnitTopicVerifyRow[] | null
  >(null);
  const [loadConfirmOpen, setLoadConfirmOpen] = useState(false);

  const showVerify = useMemo(
    () => stagingRows.length > 0,
    [stagingRows.length],
  );

  async function onUploadFile(selected: File) {
    setFile(selected);
    setUploading(true);
    setStagingRows([]);
    setVerifyProblems(null);
    setLoadConfirmOpen(false);
    try {
      const rows = await uploadStgUnitTopicExcel(selected);
      setStagingRows(rows);
      if (rows.length === 0) {
        toastSuccess("Upload completed");
      }
    } catch (err) {
      toastError(err, "Unit Topic Bulk Upload failed");
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function onVerify() {
    setVerifying(true);
    try {
      const outcome = await verifyUnitTopicStaging();
      if (outcome.kind === "success") {
        setLoadConfirmOpen(true);
        return;
      }
      if (outcome.kind === "problems") {
        setVerifyProblems(outcome.rows);
        return;
      }
      toastSuccess(outcome.message);
    } catch (err) {
      toastError(err, "Verify failed");
    } finally {
      setVerifying(false);
    }
  }

  async function onLoadData() {
    setLoading(true);
    try {
      const msg = await loadUnitTopicStaging();
      setLoadConfirmOpen(false);
      setStagingRows([]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess(msg || "Loaded successfully");
    } catch (err) {
      toastError(err, "Load failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FilteredPage
      title="Unit Topic Bulk Upload"
      filtersCollapsible={false}
      filters={
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <ExcelActionPanel title="1. Download Unit Topic Sample Excel">
            <ExcelActionTile
              href="/assets/docs/Subject_UnitTopic_bulk_upload.xlsx"
              label="Download Sample Excel"
              icon={<Download className="h-10 w-10" strokeWidth={1.75} />}
            />
          </ExcelActionPanel>
          <ExcelActionPanel title="2. Upload Unit Topic">
            <ExcelActionTile
              label={uploading ? "Uploading…" : "Upload Excel"}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              icon={<Upload className="h-10 w-10" strokeWidth={1.75} />}
            />
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
              <div className="mt-3 inline-flex max-w-full items-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
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
          </ExcelActionPanel>
        </div>
      }
    >
      {showVerify ? (
        <div className="space-y-2">
          <TableCard withHeaderBorder={false}>
            <DataTable
              title="Unit Topic Bulk Upload List"
              rowData={stagingRows}
              columnDefs={STAGING_COLS}
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

      <FormModal
        open={verifyProblems != null}
        onClose={() => setVerifyProblems(null)}
        title="Verify Unit Topic Upload"
        submitLabel="Close"
        cancelLabel="Close"
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
          columnDefs={VERIFY_COLS}
          subtitle=""
          height="auto"
          pagination
        />
      </FormModal>

      <FormModal
        open={loadConfirmOpen}
        onClose={() => setLoadConfirmOpen(false)}
        title="Verify Unit Topic Upload"
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
