"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Upload as UploadFileIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MINIO_URL } from "@/config/constants/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  listActiveUniversities,
  uploadPhotosBulk,
  verifyPhotosUpload,
  type PhotoPreviewRow,
  type VerifyPhotoRow,
} from "@/services";
import {
  readAffiliatedMediaSummaryContext,
  saveAffiliatedMediaSummaryContext,
} from "@/app/(pages)/(protected)/affiliated-colleges/_lib/affiliated-media-summary-context";

type PersonType = "student" | "employee";
type UploadRow = PhotoPreviewRow & { previewUrl?: string; fileBase?: string };
type TableRow = UploadRow | VerifyPhotoRow;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === "string" ? result : "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function statusRenderer(p: ICellRendererParams<UploadRow>) {
  const status = p.data?.status;
  // Angular: empty status → Success; any status → Pending
  if (!status) {
    return <StatusBadge status="active" label="Success" />;
  }
  return <StatusBadge status="pending" label="Pending" />;
}

function makePreviewRenderer(useMinio: boolean) {
  return (p: ICellRendererParams<UploadRow>) => {
    const row = p.data;
    if (!row) return null;
    const path = row.studentSignaturePath ?? "";
    const src =
      row.previewUrl ||
      (path.startsWith("data:")
        ? path
        : path
          ? useMinio
            ? `${MINIO_URL}${path}`
            : path
          : "");
    if (!src) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={row.fileName}
        className="h-[50px] max-w-full object-contain"
      />
    );
  };
}

/**
 * Angular fuse-widget tile — wide `#00b9ff` rectangle with soft shadow.
 */
function PhotosUploadTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-[5px] bg-[#00b9ff] px-5 py-3",
        "shadow-[rgba(50,50,93,0.25)_0px_30px_60px_-12px,rgba(0,0,0,0.3)_0px_18px_36px_-18px]",
        "transition hover:bg-[#00a8e8]",
      )}
    >
      <UploadFileIcon
        className="h-8 w-8 text-white"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="mt-2 text-center text-sm font-semibold leading-tight text-slate-900">
        Upload Students Photos
      </span>
    </button>
  );
}

const UPLOADED_COLS_BASE = {
  siNo: {
    headerName: "SI.No",
    valueGetter: (p: { node?: { rowIndex?: number | null } }) =>
      (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  } as ColDef<UploadRow>,
  fileName: {
    field: "fileName",
    headerName: "File Name",
    minWidth: 180,
    flex: 1.2,
  } as ColDef<UploadRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<UploadRow>,
  view: { headerName: "View", minWidth: 120, flex: 0.8 } as ColDef<UploadRow>,
};

const VERIFIED_COLS: ColDef<VerifyPhotoRow>[] = [
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

export default function PhotosBulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryContext = useMemo(
    () => readAffiliatedMediaSummaryContext("photo"),
    [],
  );

  const [universityCode, setUniversityCode] = useState<string | null>(
    summaryContext?.university_code ?? null,
  );
  const [photoPerson, setPhotoPerson] = useState<PersonType>("student");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([]);
  const [verifiedRows, setVerifiedRows] = useState<VerifyPhotoRow[]>([]);
  /** Angular `isUpdate` — show the cyan upload tile */
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  /** Angular `isUpload` — show uploaded-files table */
  const [showUploadedTable, setShowUploadedTable] = useState(false);
  /** Angular `isVerified` — show verified-files table + Upload File */
  const [showVerifiedTable, setShowVerifiedTable] = useState(false);
  /** Angular `verifyBtn` */
  const [showVerifyBtn, setShowVerifyBtn] = useState(false);
  const [useMinio, setUseMinio] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [comments, setComments] = useState("");

  const { data: universities, isLoading: loadingUniversities } = useCrudList({
    queryKey: QK.universities.list(),
    queryFn: listActiveUniversities,
  });

  useEffect(() => {
    if (universityCode) return;
    if (universities.length > 0) {
      setUniversityCode(universities[0].universityCode);
    }
  }, [universityCode, universities]);

  const universityOptions = useMemo(
    () =>
      universities.map((u) => ({
        value: u.universityCode,
        label: u.universityCode,
      })),
    [universities],
  );

  const photoPersonOptions = useMemo(
    () => [
      { value: "student", label: "Student" },
      { value: "employee", label: "Employee" },
    ],
    [],
  );

  const uploadedColumnDefs = useMemo<ColDef<UploadRow>[]>(
    () => [
      UPLOADED_COLS_BASE.siNo,
      UPLOADED_COLS_BASE.fileName,
      { ...UPLOADED_COLS_BASE.status, cellRenderer: statusRenderer },
      {
        ...UPLOADED_COLS_BASE.view,
        cellRenderer: makePreviewRenderer(useMinio),
      },
    ],
    [useMinio],
  );

  const showingVerified = showVerifiedTable && verifiedRows.length > 0;
  const showingUploaded =
    showUploadedTable && uploadedRows.length > 0 && !showingVerified;
  const showResults = showingUploaded || showingVerified;

  const tableRows: TableRow[] = showingVerified ? verifiedRows : uploadedRows;
  const tableCols = (
    showingVerified ? VERIFIED_COLS : uploadedColumnDefs
  ) as ColDef<TableRow>[];

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (!universityCode) {
      toastError(new Error("Please select university."), "Photos Bulk Upload");
      return;
    }

    const files = Array.from(fileList);
    setSelectedFiles(files);
    setVerifiedRows([]);
    setUseMinio(false);
    setShowUploadPanel(false);
    setShowVerifiedTable(false);

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
    setShowUploadedTable(rows.length > 0);
    setShowVerifyBtn(rows.length > 0);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function buildFormData(): FormData | null {
    if (!universityCode) {
      toastError(new Error("Please select university."), "Photos Bulk Upload");
      return null;
    }
    if (selectedFiles.length === 0) {
      toastError(new Error("Please choose photos."), "Photos Bulk Upload");
      return null;
    }
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("file", file, file.name);
    }
    formData.append("photoPerson", photoPerson);
    formData.append("universityCode", universityCode);
    return formData;
  }

  async function onVerify() {
    const formData = buildFormData();
    if (!formData) return;
    setVerifying(true);
    try {
      const rows = await verifyPhotosUpload(formData);
      setVerifiedRows(rows);
      if (rows.length > 0) {
        setShowUploadedTable(false);
        setShowVerifiedTable(true);
        setShowVerifyBtn(false);
      }
      toastSuccess("Verification completed");
    } catch (err) {
      toastError(err, "Verify photos failed");
    } finally {
      setVerifying(false);
    }
  }

  function openUploadConfirm() {
    setComments("");
    setConfirmOpen(true);
  }

  async function onConfirmUpload() {
    if (comments.length === 0) {
      toastError(
        new Error("Please add a comment before submitting"),
        "Confirm Your Action",
      );
      return;
    }
    const formData = buildFormData();
    if (!formData) return;
    setUploading(true);
    try {
      const res = await uploadPhotosBulk(formData);
      toastSuccess(res.message || "Photos uploaded successfully");
      setUseMinio(true);
      setUploadedRows(
        res.files.map((r) => ({
          ...r,
          previewUrl: "",
          fileBase: r.fileName,
        })),
      );
      setVerifiedRows([]);
      setSelectedFiles([]);
      setShowVerifiedTable(false);
      setShowVerifyBtn(false);
      setShowUploadedTable(res.files.length > 0);
      setShowUploadPanel(false);
      setConfirmOpen(false);
      setComments("");
      goBack();
    } catch (err) {
      toastError(err, "Upload photos failed");
    } finally {
      setUploading(false);
    }
  }

  function goBack() {
    if (summaryContext) {
      saveAffiliatedMediaSummaryContext(summaryContext);
    }
    router.push("/affiliated-colleges/student-photo-summary");
  }

  return (
    <FilteredListPage<TableRow>
      title="Photos Bulk Upload"
      filters={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <Select
              label="University"
              placeholder="University"
              value={universityCode}
              onChange={setUniversityCode}
              options={universityOptions}
              isLoading={loadingUniversities}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Photo Person"
              placeholder="Photo Person"
              value={photoPerson}
              onChange={(v) => setPhotoPerson((v as PersonType) ?? "student")}
              options={photoPersonOptions}
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <Button
              type="button"
              className="w-full bg-[#ffcf46] text-slate-900 hover:bg-[#f5c434]"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      filtersFooter={
        showUploadPanel ? (
          <div className="w-full sm:w-1/2">
            <div className="rounded-[3px] border-2 border-[#89c5ff] px-3 py-4">
              <h3 className="mb-4 text-center text-sm font-semibold">
                Upload Students Photos
              </h3>
              <div className="mx-auto w-[70%] max-w-[15rem]">
                <PhotosUploadTile
                  onClick={() => fileInputRef.current?.click()}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleFilesSelected(e.target.files)}
              />
            </div>
          </div>
        ) : null
      }
      rowData={tableRows}
      columnDefs={tableCols}
      hideEmptyGrid
      resultsVisible={showResults}
      pagination={showResults}
      toolbar={
        showResults
          ? {
              search: true,
              searchPlaceholder: "Search",
              pdfDocumentTitle: showingVerified
                ? "Verified Files"
                : "Uploaded Files",
            }
          : false
      }
      toolbarTrailing={
        showVerifyBtn ? (
          <Button
            type="button"
            onClick={() => void onVerify()}
            disabled={verifying || uploading}
          >
            {verifying ? "Verifying..." : "Verify File"}
          </Button>
        ) : showingVerified ? (
          <Button
            type="button"
            onClick={openUploadConfirm}
            disabled={uploading}
          >
            Upload File
          </Button>
        ) : null
      }
    >
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Your Action"
        confirmLabel="Submit"
        cancelLabel="Close"
        confirmVariant="default"
        isLoading={uploading}
        onConfirm={() => void onConfirmUpload()}
        onCancel={() => {
          setConfirmOpen(false);
          setComments("");
        }}
      >
        <p className="font-medium text-foreground">
          Are you sure you want to approve this? Once confirmed, all data will
          be permanently committed to the system with no option to reverse the
          action
        </p>
        <div className="space-y-2">
          <Label htmlFor="photo-upload-comments" className="text-[#0c51a4]">
            Notes / Terms
          </Label>
          <textarea
            id="photo-upload-comments"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </FilteredListPage>
  );
}
