"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { FileDropzone } from "@/common/components/forms";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import {
  bulkUploadAffiliatedStudentSignatures,
  listAffiliatedOrganizationsForUpload,
  validateAffiliatedStudentSignatures,
  type AffiliatedMediaUploadRow,
  type AffiliatedMediaVerifyRow,
} from "@/services";
import {
  readAffiliatedMediaSummaryContext,
  saveAffiliatedMediaSummaryContext,
} from "../_lib/affiliated-media-summary-context";

type PersonType = "student" | "employee";
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

const VERIFIED_COLS: ColDef<AffiliatedMediaVerifyRow>[] = [
  {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  { field: "fileName", headerName: "File Name", minWidth: 180, flex: 1.1 },
  { field: "status", headerName: "Status", minWidth: 140, flex: 0.9 },
  { field: "message", headerName: "Message", minWidth: 220, flex: 1.4 },
];

export function SignatureBulkUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryContext = useMemo(
    () => readAffiliatedMediaSummaryContext("signature"),
    [],
  );

  const [orgCode, setOrgCode] = useState<string | null>(
    searchParams.get("orgCode") || summaryContext?.org_code || null,
  );
  const [signaturePerson, setSignaturePerson] = useState<PersonType>("student");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([]);
  const [verifiedRows, setVerifiedRows] = useState<AffiliatedMediaVerifyRow[]>(
    [],
  );
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: [...QK.affiliatedColleges.all, "organizations"] as const,
    queryFn: listAffiliatedOrganizationsForUpload,
  });

  useEffect(() => {
    if (orgCode) return;
    const seed =
      searchParams.get("orgCode") || summaryContext?.org_code || null;
    if (seed) {
      setOrgCode(seed);
      return;
    }
    if (organizations.length > 0) {
      setOrgCode(organizations[0].orgCode);
    }
  }, [orgCode, organizations, searchParams, summaryContext?.org_code]);

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: o.orgCode,
        label: o.orgCode,
      })),
    [organizations],
  );

  async function handleFilesChange(files: File[]) {
    setVerifiedRows([]);
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

  function buildFormData(): FormData | null {
    if (!orgCode) {
      toastError("Please select organization.");
      return null;
    }
    if (selectedFiles.length === 0) {
      toastError("Please choose signature files.");
      return null;
    }
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("file", file, file.name);
    }
    formData.append("signaturePerson", signaturePerson);
    formData.append("orgCode", orgCode);
    return formData;
  }

  async function onVerify() {
    const formData = buildFormData();
    if (!formData) return;
    setVerifying(true);
    try {
      const rows = await validateAffiliatedStudentSignatures(formData);
      setVerifiedRows(rows);
      if (rows.length > 0) {
        setConfirmOpen(true);
      } else {
        toastSuccess("Verification completed");
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function onUpload() {
    const formData = buildFormData();
    if (!formData) return;
    setUploading(true);
    try {
      const res = await bulkUploadAffiliatedStudentSignatures(formData);
      toastSuccess(res.message || "Signatures uploaded successfully");
      setUploadedRows(
        res.files.map((r) => ({
          ...r,
          previewUrl: "",
          fileBase: r.fileName,
        })),
      );
      setVerifiedRows([]);
      setSelectedFiles([]);
      setConfirmOpen(false);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function goBack() {
    if (summaryContext) {
      saveAffiliatedMediaSummaryContext(summaryContext);
    }
    router.push("/affiliated-colleges/student-signature-summary");
  }

  return (
    <FilteredListPage
      title="Signature Bulk Upload"
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
            <div className="md:col-span-4">
              <Select
                label="Signature Person"
                value={signaturePerson}
                onChange={(v) =>
                  setSignaturePerson((v as PersonType) || "student")
                }
                options={[
                  { value: "student", label: "Student" },
                  { value: "employee", label: "Employee" },
                ]}
              />
            </div>
            <div className="md:col-span-4 flex flex-wrap items-end gap-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
            </div>
          </div>
          <FileDropzone
            accept="image/*"
            multiple
            onFilesChange={(files) => void handleFilesChange(files)}
          >
            <p className="text-xs text-muted-foreground">
              Drag and drop signature images here, or click to select
            </p>
          </FileDropzone>
          {selectedFiles.length > 0 || uploadedRows.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={verifying || selectedFiles.length === 0}
                onClick={() => void onVerify()}
              >
                <UploadIcon className="h-4 w-4" />
                {verifying ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={uploading || selectedFiles.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                <UploadIcon className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          ) : null}
        </div>
      }
      rowData={uploadedRows}
      columnDefs={UPLOADED_COLS}
      pagination={uploadedRows.length > 0}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Signature Bulk Upload",
      }}
    >
      {verifiedRows.length > 0 ? (
        <div className="mt-4">
          <DataTable
            title="Verification Results"
            rowData={verifiedRows}
            columnDefs={VERIFIED_COLS}
            subtitle=""
            toolbar={{ search: true, columnPicker: false, exportPdf: false }}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Upload Signatures"
        description="Confirm uploading verified signature files."
        confirmLabel={uploading ? "Uploading…" : "Upload"}
        confirmVariant="default"
        isLoading={uploading}
        onConfirm={() => void onUpload()}
        onCancel={() => setConfirmOpen(false)}
      />
    </FilteredListPage>
  );
}
