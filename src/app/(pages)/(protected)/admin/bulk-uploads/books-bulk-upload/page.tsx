"use client";

import { useMemo, useState, useRef } from "react";
import type { ColDef } from "ag-grid-community";
import * as XLSX from "xlsx";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  importBookBulkFile,
  processBookBulkStagingRows,
  type BookBulkRow,
} from "@/services";

const BOOK_COLS: ColDef<BookBulkRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  { field: "libraryCode", headerName: "Library", minWidth: 110, flex: 0.9 },
  { field: "accNo", headerName: "Acession No", minWidth: 120, flex: 0.9 },
  { field: "title", headerName: "Title", minWidth: 200, flex: 1.4 },
  { field: "author", headerName: "Author", minWidth: 140, flex: 1 },
  { field: "publisher", headerName: "Publisher", minWidth: 140, flex: 1 },
  { field: "edition", headerName: "edition", minWidth: 100, flex: 0.8 },
  { field: "volume", headerName: "Volume", minWidth: 90, flex: 0.8 },
  { field: "year", headerName: "Year", minWidth: 90, flex: 0.8 },
  { field: "cost", headerName: "Cost", minWidth: 90, flex: 0.8 },
  { field: "invoiceNo", headerName: "Invoice No", minWidth: 110, flex: 0.9 },
  { field: "supplier", headerName: "Supplier", minWidth: 140, flex: 1 },
];

export default function BooksBulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BookBulkRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function onUpload() {
    const file = selectedFile;
    if (!file) {
      toastError(new Error("Please choose a file."), "Books Bulk Upload");
      return;
    }
    setUploading(true);
    try {
      const list = await importBookBulkFile(file);
      setRows(Array.isArray(list) ? list : []);
      toastSuccess("Book file uploaded successfully");
    } catch (err) {
      toastError(err, "Book upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const summary = await processBookBulkStagingRows();
      setRows([]);
      clearSelectedFile();
      const totalBooks = Number(summary.totalBooksUploaded ?? 0);
      const totalCopies = Number(summary.totalBooksCopiesUploaded ?? 0);
      toastSuccess(
        `Total Books - ${totalBooks} and Total Books Copies - ${totalCopies}`,
      );
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onDownload() {
    const link = document.createElement("a");
    link.href = "/assets/docs/BookDetails.xlsx";
    link.download = "BookDetails.xlsx";
    link.click();
  }

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <FilteredListPage
      title="Books Bulk Upload"
      filters={
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 py-2 px-1">
            <div className="flex items-center shrink-0">
              <span className="text-sm font-semibold text-slate-700">
                Upload Books :
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
                className="bg-[#ffb300] hover:bg-[#ffa000] text-black font-semibold border-0 px-4 shrink-0"
                onClick={onDownload}
              >
                Download Sample XLSX
              </Button>
            </div>
          </div>

          {xlsxCount > 0 ? (
            <p className="text-sm text-red-600 font-semibold px-1">
              Total number of Books listed in xsl sheet are {xlsxCount - 1}.
            </p>
          ) : null}
        </div>
      }
      rowData={rows}
      columnDefs={BOOK_COLS}
      loading={uploading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search books…",
        columnPicker: false,
        exportPdf: false,
      }}
    >
      {hasRows && (
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </FilteredListPage>
  );
}
