"use client";

import { useRef, useState } from "react";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { uploadUnitTopicsFile } from "@/services";

export default function UnitTopicBulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  async function onUpload() {
    const file = selectedFile;
    if (!file) {
      toastError(new Error("Please choose a file."), "Unit Topic Bulk Upload");
      return;
    }

    setUploading(true);
    try {
      const summary = await uploadUnitTopicsFile(file);
      const totalUnits = Number(summary.totalUnitsUploaded ?? 0);
      const totalUnitTopics = Number(summary.totalUnitTopicsUploaded ?? 0);
      toastSuccess(
        `Total Units - ${totalUnits} and Total UnitTopics - ${totalUnitTopics}`,
      );
      clearSelectedFile();
    } catch (err) {
      toastError(err, "Unit Topic Bulk Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FilteredPage
      title="Unit Topic Bulk Upload"
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="unit-topic-bulk-file"
            className="text-sm font-medium text-slate-700 shrink-0"
          >
            Upload Unit Topics :
          </label>
          <input
            id="unit-topic-bulk-file"
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="w-fit max-w-full text-sm bg-transparent border-0 p-0 shadow-none outline-none
              file:mr-2 file:cursor-pointer
              file:rounded-sm file:border file:border-slate-400
              file:bg-gradient-to-b file:from-[#f0f0f0] file:to-[#e3e3e3]
              file:px-3 file:py-1 file:text-sm file:font-normal file:text-slate-800
              file:shadow-none"
          />
          <Button
            type="button"
            onClick={() => void onUpload()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <Button
            asChild
            className="bg-[#ffcf46] text-slate-900 hover:bg-[#f5c434]"
          >
            <a href="/assets/docs/Subject_UnitTopic_bulk_upload.xlsx" download>
              Download Sample XLSX
            </a>
          </Button>
        </div>
      }
    />
  );
}
