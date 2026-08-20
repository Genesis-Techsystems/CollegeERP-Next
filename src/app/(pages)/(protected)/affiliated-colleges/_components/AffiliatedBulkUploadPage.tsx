"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { getAffiliatedConfig } from "../_lib/route-config";
import { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";
import { AffiliatedCollegeFilters } from "./AffiliatedCollegeFilters";
import { AffiliatedExcelDownloadUpload } from "./AffiliatedExcelActionPanel";

type AffiliatedBulkUploadPageProps = { slug: string };

const UPLOAD_LABELS: Record<string, { sample: string; upload: string }> = {
  "college-student-fee-bulk-upload": {
    sample: "1. Download Fee Sample",
    upload: "2. Upload Fee",
  },
  "college-student-exam-fee-bulk-upload": {
    sample: "1. Download Exam Fee Sample",
    upload: "2. Upload Exam Fee",
  },
  "student-exam-form-bulk-upload": {
    sample: "1. Download Exam Form Sample",
    upload: "2. Upload Exam Form",
  },
  "college-student-exaternal-labexam-data-upload": {
    sample: "1. Download Lab Exam Sample",
    upload: "2. Upload Lab Exam",
  },
};

export function AffiliatedBulkUploadPage({
  slug,
}: AffiliatedBulkUploadPageProps) {
  const config = getAffiliatedConfig(slug);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cascade = useAffiliatedCascade({
    autoSelectFirst: !searchParams.has("collegeId"),
  });
  const [file, setFile] = useState<File | null>(null);
  const [verified, setVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = UPLOAD_LABELS[slug] ?? {
    sample: "1. Download Sample",
    upload: "2. Upload",
  };

  return (
    <PageContainer>
      <PageHeader title={config.title} />
      <AffiliatedCollegeFilters
        title={config.title}
        cascade={cascade}
        onGetDetails={() =>
          toastSuccess("Filters applied. Upload your Excel file below.")
        }
        showBack={config.showBackToHub}
        onBack={() => router.push("/affiliated-colleges/college-bulk-uploads")}
      />

      <div className="app-card mt-4">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Download &amp; Upload</h2>
        </div>
        <AffiliatedExcelDownloadUpload
          downloadTitle={labels.sample}
          uploadTitle={labels.upload}
          downloadDisabled
          onUploadClick={() => inputRef.current?.click()}
          uploadDisabled={!cascade.filtersValid}
          fileName={file?.name}
          onClearFile={() => {
            setFile(null);
            setVerified(false);
            if (inputRef.current) inputRef.current.value = "";
          }}
          inputRef={inputRef}
          onFileSelected={(selected) => {
            setFile(selected);
            setVerified(false);
          }}
        />
        <div className="flex flex-wrap gap-2 justify-end border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="back-btn"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!file || !cascade.filtersValid}
            onClick={() => {
              if (!file) {
                toastError("Select an Excel file first.");
                return;
              }
              setVerified(true);
              toastSuccess("File ready for verification (UI parity).");
            }}
          >
            Verify
          </Button>
          <Button
            type="button"
            disabled={!verified}
            onClick={() =>
              toastSuccess("Load will run after import API is connected.")
            }
          >
            Load
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
