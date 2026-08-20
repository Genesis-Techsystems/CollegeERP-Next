"use client";

import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import type { ChangeEvent, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

/**
 * Angular fuse-widget tile — `#00b9ff` card, white icon above label.
 */
export function AffiliatedExcelActionTile({
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
      <span className="text-center text-[13px] font-semibold leading-tight">
        {label}
      </span>
    </>
  );

  if (href && !disabled) {
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

/** Angular `yar-bordr` column around each download/upload action. */
export function AffiliatedExcelActionPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[3px] border-2 border-[#89c5ff] px-3 py-4">
      <h3 className="mb-4 w-full text-center text-[16px] font-semibold text-[rgba(0,0,0,0.87)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function AffiliatedSelectedFileChip({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 inline-flex max-w-full items-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
      <div className="min-w-0 inline-flex items-center gap-1.5">
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="truncate text-xs font-medium text-emerald-800">{name}</p>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-emerald-700 hover:bg-emerald-100"
          aria-label="Remove uploaded file"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type AffiliatedExcelDownloadUploadProps = {
  downloadTitle: string;
  uploadTitle: string;
  downloadHref?: string;
  onDownload?: () => void;
  downloadDisabled?: boolean;
  onUploadClick: () => void;
  uploadDisabled?: boolean;
  uploading?: boolean;
  fileName?: string | null;
  onClearFile?: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  accept?: string;
  onFileSelected: (file: File) => void;
};

/** Two side-by-side Angular download / upload panels. */
export function AffiliatedExcelDownloadUpload({
  downloadTitle,
  uploadTitle,
  downloadHref,
  onDownload,
  downloadDisabled,
  onUploadClick,
  uploadDisabled,
  uploading,
  fileName,
  onClearFile,
  inputRef,
  accept = ".xls,.xlsx",
  onFileSelected,
}: AffiliatedExcelDownloadUploadProps) {
  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) onFileSelected(selected);
    e.target.value = "";
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-6">
      <AffiliatedExcelActionPanel title={downloadTitle}>
        <AffiliatedExcelActionTile
          href={downloadHref}
          label="Download Excel"
          disabled={downloadDisabled}
          onClick={onDownload}
          icon={<Download className="h-10 w-10" strokeWidth={1.75} />}
        />
      </AffiliatedExcelActionPanel>
      <AffiliatedExcelActionPanel title={uploadTitle}>
        <AffiliatedExcelActionTile
          label={uploading ? "Uploading…" : "Upload Excel"}
          disabled={uploadDisabled || uploading}
          onClick={onUploadClick}
          icon={<Upload className="h-10 w-10" strokeWidth={1.75} />}
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />
        {fileName && onClearFile ? (
          <AffiliatedSelectedFileChip name={fileName} onClear={onClearFile} />
        ) : null}
      </AffiliatedExcelActionPanel>
    </div>
  );
}
