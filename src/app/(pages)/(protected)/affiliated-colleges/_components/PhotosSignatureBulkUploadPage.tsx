"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import { FileDropzone } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import {
  listAffiliatedOrganizationsForUpload,
  uploadAffiliatedPhotosAndSignatures,
  type AffiliatedMediaUploadRow,
} from "@/services";
import {
  readAffiliatedMediaSummaryContext,
  saveAffiliatedMediaSummaryContext,
} from "../_lib/affiliated-media-summary-context";

type UploadRow = AffiliatedMediaUploadRow & {
  previewUrl?: string;
  fileBase?: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const UPLOADED_COLS: ColDef<UploadRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  { field: "fileName", headerName: "File Name", minWidth: 180, flex: 1.2 },
  {
    headerName: "Status",
    minWidth: 110,
    flex: 0.8,
    valueGetter: (p) => (p.data?.status ? String(p.data.status) : "Pending"),
  },
  {
    headerName: "View",
    minWidth: 120,
    flex: 0.8,
    cellRenderer: (p: { data?: UploadRow }) => {
      const row = p.data;
      if (!row) return null;
      const path = row.studentSignaturePath ?? "";
      const src =
        row.previewUrl ||
        (path.startsWith("data:") ? path : path ? `${MINIO_URL}${path}` : "");
      if (!src) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={row.fileName}
          className="h-10 w-10 rounded object-cover border border-border"
        />
      );
    },
  },
];

export function PhotosSignatureBulkUploadPage() {
  const router = useRouter();
  const summaryContext = useMemo(
    () => readAffiliatedMediaSummaryContext("photo"),
    [],
  );

  const [orgCode, setOrgCode] = useState<string | null>(
    summaryContext?.org_code || null,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: [...QK.affiliatedColleges.all, "organizations"] as const,
    queryFn: listAffiliatedOrganizationsForUpload,
  });

  useEffect(() => {
    if (orgCode) return;
    if (organizations.length > 0) {
      setOrgCode(organizations[0].orgCode);
    }
  }, [orgCode, organizations]);

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: o.orgCode,
        label: o.orgCode,
      })),
    [organizations],
  );

  async function handleFilesChange(files: File[]) {
    setSelectedFiles(files);
    const rows = await Promise.all(
      files.map(async (file) => {
        const previewUrl = await fileToDataUrl(file);
        const fileName = file.name;
        const fileBase = fileName.includes(".")
          ? fileName.slice(0, fileName.lastIndexOf("."))
          : fileName;
        return {
          fileName,
          fileBase,
          status: "Pending",
          previewUrl,
          studentSignaturePath: previewUrl,
        };
      }),
    );
    setUploadedRows(rows);
  }

  async function onUpload() {
    if (!orgCode) {
      toastError("Please select organization.");
      return;
    }
    if (selectedFiles.length === 0) {
      toastError("Please choose photo/signature files.");
      return;
    }
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("file", file, file.name);
    }
    formData.append("orgCode", orgCode);

    setUploading(true);
    try {
      const res = await uploadAffiliatedPhotosAndSignatures(formData);
      toastSuccess(res.message || "Photos/signatures uploaded successfully");
      setUploadedRows(
        res.files.map((r) => ({
          ...r,
          previewUrl: "",
          fileBase: r.fileName,
        })),
      );
      setSelectedFiles([]);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function goBack() {
    if (summaryContext) {
      saveAffiliatedMediaSummaryContext(summaryContext);
      router.push("/affiliated-colleges/student-photo-summary");
      return;
    }
    router.push("/affiliated-colleges/college-bulk-uploads");
  }

  return (
    <FilteredListPage
      title="Photos & Signatures Bulk Upload"
      filters={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <Select
                label="Organization"
                value={orgCode}
                onChange={(v) => setOrgCode(v)}
                options={orgOptions}
                isLoading={loadingOrgs}
                searchable
              />
            </div>
            <div className="md:col-span-4 flex flex-wrap items-end gap-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              {selectedFiles.length > 0 ? (
                <Button
                  type="button"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => void onUpload()}
                >
                  <UploadIcon className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              ) : null}
            </div>
          </div>
          <FileDropzone
            accept="image/*"
            multiple
            onFilesChange={(files) => void handleFilesChange(files)}
          >
            <p className="text-xs text-muted-foreground">
              Drag and drop photo / signature images here, or click to select
            </p>
          </FileDropzone>
        </div>
      }
      rowData={uploadedRows}
      columnDefs={UPLOADED_COLS}
      pagination={uploadedRows.length > 0}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Photos & Signatures Bulk Upload",
      }}
    />
  );
}
