"use client";

import { useMemo, useState, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import * as XLSX from "xlsx";
import { format, parseISO, isValid } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  clearStudentBulkStagingRows,
  getStudentBulkStagingRows,
  importStudentBulkFile,
  processStudentBulkStagingRows,
  type StudentBulkStagingRow,
} from "@/services";

function decodeBase64Safe(value?: string): string {
  if (!value) return "";
  try {
    return atob(value);
  } catch {
    return value;
  }
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    return isValid(d) ? format(d, "dd/MM/yyyy") : String(value);
  } catch {
    return String(value);
  }
}

const STAGING_COLS: ColDef<StudentBulkStagingRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Problem",
    minWidth: 180,
    flex: 1.2,
    valueGetter: (p) => decodeBase64Safe(p.data?.Problems),
  },
  { field: "first_name", headerName: "Student", minWidth: 140, flex: 1 },
  {
    headerName: "Course",
    minWidth: 260,
    flex: 1.8,
    valueGetter: (p) =>
      [
        p.data?.college,
        p.data?.academic_year,
        p.data?.course,
        p.data?.group,
        p.data?.course_year,
        p.data?.s_section,
      ]
        .filter(Boolean)
        .join(" / "),
  },
  { field: "batch", headerName: "Batch", minWidth: 90, flex: 0.8 },
  {
    field: "date_of_birth",
    headerName: "D.O.B",
    minWidth: 110,
    flex: 0.9,
    valueFormatter: (p) => formatDate(p.value),
  },
  {
    field: "student_emailid",
    headerName: "Student Email",
    minWidth: 170,
    flex: 1.2,
  },
  { field: "mobile", headerName: "Mobile", minWidth: 110, flex: 0.9 },
  { field: "father_name", headerName: "Father Name", minWidth: 150, flex: 1.1 },
  {
    field: "father_mobile",
    headerName: "Father Mobile",
    minWidth: 130,
    flex: 1,
  },
];

export default function StudentsUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<StudentBulkStagingRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [xlsxCount, setXlsxCount] = useState(0);

  function clearSelectedFile() {
    setSelectedFile(null);
    setXlsxCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (!file) {
      setXlsxCount(0);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        let size = 0;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (row && row !== "undefined" && row.length > 0) {
            size++;
          }
        }
        setXlsxCount(size);
      } catch (err) {
        console.error("Failed to parse excel file client side", err);
        setXlsxCount(0);
      }
    };
    reader.readAsBinaryString(file);
  }

  async function refreshStaging() {
    const list = await getStudentBulkStagingRows();
    setRows(Array.isArray(list) ? list : []);
  }

  async function onUpload() {
    const file = selectedFile;
    if (!file) {
      toastError(new Error("Please choose a file."), "Student Bulk Upload");
      return;
    }
    setUploading(true);
    try {
      await importStudentBulkFile(file);
      await refreshStaging();
      toastSuccess("Student file uploaded successfully");
    } catch (err) {
      toastError(err, "Student upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onClearStaging() {
    setClearing(true);
    try {
      await clearStudentBulkStagingRows();
      setRows([]);
      clearSelectedFile();
      toastSuccess("Staging rows cleared");
    } catch (err) {
      toastError(err, "Clear staging failed");
    } finally {
      setClearing(false);
    }
  }

  async function onSaveStaging() {
    setSaving(true);
    try {
      const msg = await processStudentBulkStagingRows();
      toastSuccess(msg || "Saved successfully");
      setRows([]);
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onDownload() {
    const link = document.createElement("a");
    link.href = "/assets/docs/Student__Bulk_Details.xlsx";
    link.download = "Student__Bulk_Details.xlsx";
    link.click();
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <FilteredListPage
      title="Student Bulk Upload"
      filters={
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 py-2 px-1">
            <div className="flex items-center shrink-0">
              <span className="text-sm font-semibold text-slate-700">
                Upload Students :
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".xlsx"
                className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              <Button
                type="button"
                className="bg-[#042956] hover:bg-[#031f42] text-white font-medium px-6 shrink-0"
                onClick={onUpload}
                disabled={uploading}
              >
                Upload
              </Button>
              <Button
                type="button"
                className="bg-[#ffcf46] hover:bg-[#ffa000] text-black font-semibold border-0 px-4 shrink-0"
                onClick={onDownload}
              >
                Download Sample XLSX
              </Button>
            </div>
          </div>

          {xlsxCount > 0 ? (
            <p className="text-sm text-red-600 font-semibold px-1">
              Total number of students listed in xlsx sheet are {xlsxCount - 1}.
            </p>
          ) : null}
        </div>
      }
      rowData={rows}
      columnDefs={STAGING_COLS}
      loading={uploading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search students…",
        columnPicker: false,
        exportPdf: false,
      }}
    >
      {hasRows && (
        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onClearStaging()}
            disabled={clearing || saving}
          >
            {clearing ? "Clearing..." : "Clear"}
          </Button>
          <Button
            type="button"
            onClick={() => void onSaveStaging()}
            disabled={saving || clearing}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </FilteredListPage>
  );
}
