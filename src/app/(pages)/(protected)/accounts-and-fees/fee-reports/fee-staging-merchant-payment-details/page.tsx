"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { uploadFeeStgMerchantPaymentFile } from "@/services";

const SAMPLE_HREF = "/assets/docs/Fee_Stg_Merchant_Payment.xlsx";

export default function FeeStagingMerchantPaymentDetailsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!file) {
      toastInfo("Please choose a file.");
      return;
    }
    setUploading(true);
    try {
      const message = await uploadFeeStgMerchantPaymentFile(file);
      toastSuccess(message || "Success");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toastError(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FilteredPage
      title="Fee Staging Merchant Payment Details"
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            Upload Fee Merchant Payment Details :
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            onChange={onFileChange}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={() => void handleUpload()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <Button type="button" size="sm" variant="secondary" asChild>
            <a href={SAMPLE_HREF} download>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download Sample XLSX
            </a>
          </Button>
          {file ? (
            <span className="w-full text-xs text-muted-foreground">
              Selected: {file.name}
            </span>
          ) : null}
        </div>
      }
    />
  );
}
