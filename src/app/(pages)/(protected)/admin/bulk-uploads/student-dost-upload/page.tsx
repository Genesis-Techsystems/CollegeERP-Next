"use client";

import { useMemo, useState, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { toastError, toastSuccess } from "@/lib/toast";
import { importDostStudents, type DostUploadRow } from "@/services";

const DOST_COLS: ColDef<DostUploadRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    field: "nominalRollNumber",
    headerName: "Roll Number",
    minWidth: 130,
    flex: 0.9,
  },
  {
    field: "applicantName",
    headerName: "Applicant Name",
    minWidth: 170,
    flex: 1.1,
  },
  {
    field: "collegeName",
    headerName: "college Name",
    minWidth: 180,
    flex: 1.1,
  },
  {
    field: "courseCategory",
    headerName: "Course Category",
    minWidth: 140,
    flex: 1,
  },
  { field: "mobileNumber", headerName: "Mobile", minWidth: 120, flex: 0.9 },
  {
    field: "dateOfJoining",
    headerName: "Date Of Joining",
    minWidth: 130,
    flex: 0.9,
  },
];

export default function StudentDostUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DostUploadRow[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    setUploading(true);
    try {
      const list = await importDostStudents(file);
      setRows(Array.isArray(list) ? list : []);
      toastSuccess("Dost file uploaded successfully");
    } catch (err) {
      toastError(err, "Dost upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onDownload() {
    const link = document.createElement("a");
    link.href = "/assets/docs/DostUpload_bulk_upload.xlsx";
    link.download = "DostUpload_bulk_upload.xlsx";
    link.click();
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <FilteredListPage
      title="Dost Upload"
      filtersCollapsible={false}
      filters={
        <div className="border border-border rounded-lg p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
            {/* Left Card: Download */}
            <div className="flex flex-col items-center p-4 border border-border bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 text-center">
                1. Download Dost Sample
              </h3>
              <button
                type="button"
                onClick={onDownload}
                className="w-full max-w-[200px] flex flex-col items-center justify-center p-6 rounded-lg bg-[#00b9ff] text-white hover:bg-[#00a6e6] transition shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer"
              >
                <div className="border border-white/40 rounded-full p-3 mb-2 flex items-center justify-center bg-white/10 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-download shrink-0"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </div>
                <span className="text-sm font-bold tracking-wide">
                  Download Excel
                </span>
              </button>
            </div>

            {/* Right Card: Upload */}
            <div className="flex flex-col items-center p-4 border border-border bg-white rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 text-center">
                2. Upload Dost
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-[200px] flex flex-col items-center justify-center p-6 rounded-lg bg-[#00b9ff] text-white hover:bg-[#00a6e6] transition shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer"
              >
                <div className="border border-white/40 rounded-full p-3 mb-2 flex items-center justify-center bg-white/10 shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-upload shrink-0"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <span className="text-sm font-bold tracking-wide">
                  Upload Excel
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </div>
          </div>
        </div>
      }
      rowData={hasRows ? rows : []}
      columnDefs={hasRows ? DOST_COLS : []}
      loading={uploading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search dost rows…",
        columnPicker: false,
        exportPdf: false,
      }}
      body={<div />}
    />
  );
}
