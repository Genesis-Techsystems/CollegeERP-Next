"use client";

import { useState, useRef } from "react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/toast";
import { uploadTemporaryStagingTable } from "@/services";

export default function TemporaryStagingTablesBulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tableName, setTableName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onUpload() {
    const file = selectedFile;
    if (!tableName.trim()) {
      toastError(
        new Error("Please enter Table Name."),
        "Temporary Staging Tables",
      );
      return;
    }
    if (!file) {
      toastError(
        new Error("Please choose a file."),
        "Temporary Staging Tables",
      );
      return;
    }

    setUploading(true);
    try {
      const msg = await uploadTemporaryStagingTable(tableName.trim(), file);
      toastSuccess(msg || "Upload successful");
      setTableName("");
      clearSelectedFile();
    } catch (err) {
      toastError(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDownload() {
    const link = document.createElement("a");
    link.href = "/assets/docs/UnitTopic_bulk_upload.xlsx";
    link.download = "UnitTopic_bulk_upload.xlsx";
    link.click();
  }

  return (
    <FilteredListPage
      title="Temporary Staging Tables Bulk Upload"
      filtersCollapsible={false}
      filters={
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 py-2 px-1">
            <div className="flex items-center shrink-0 gap-3">
              <label
                htmlFor="temp-table-name"
                className="text-sm font-semibold text-slate-700 whitespace-nowrap"
              >
                Table Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="temp-table-name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Table Name"
                className="h-9 w-[180px] text-xs"
              />
            </div>

            <div className="flex items-center shrink-0">
              <span className="text-sm font-semibold text-slate-700">
                Upload Tables :
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
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
        </div>
      }
      body={<div />}
    />
  );
}
