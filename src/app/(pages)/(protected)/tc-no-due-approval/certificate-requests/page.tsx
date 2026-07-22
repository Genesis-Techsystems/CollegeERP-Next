"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Info, Plus, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listActiveOrganizations,
  listCollegeCertificatesByOrgAndCollege,
  listCollegesByOrganization,
  listFeeCertificateIssuesByCertificate,
  updateCertificateIssueAmount,
} from "@/services";
import type {
  ApplyCertificateRequestPayload,
  FeeCertificateIssueRow,
} from "@/types/tc-no-due";
import type { CollegeCertificate } from "@/types/college-certificate";
import { ApplyCertificateModal } from "./ApplyCertificateModal";
import { IssueCertificateModal } from "./IssueCertificateModal";

const RECEIPT_STORAGE_KEY = "certificate-receipt-row";

function ymKey(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 7);
  return format(d, "yyyy-MM");
}

function academicDetails(row: FeeCertificateIssueRow): string {
  const dto = row.studentDetailListDTO;
  if (!dto) return "—";
  return [
    dto.collegeCode,
    dto.academicYear,
    dto.courseCode,
    dto.groupCode,
    dto.courseYearName,
  ]
    .filter(Boolean)
    .join(" / ")
    .concat(dto.section ? ` - ${dto.section}` : "");
}

function statusClass(code: string): string {
  switch (code.toUpperCase()) {
    case "TCISSUED":
      return "text-emerald-700 font-semibold";
    case "REJECTED":
      return "text-red-600 font-semibold";
    case "APPLIED":
      return "text-amber-700 font-semibold";
    case "CLEARED":
      return "text-blue-700 font-semibold";
    default:
      return "text-foreground";
  }
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeCertificateIssueRow>,
  student: {
    headerName: "Student Name",
    minWidth: 180,
    valueGetter: (p) => {
      const name =
        p.data?.firstName ?? p.data?.studentDetailListDTO?.firstName ?? "—";
      const ht = p.data?.studentDetailListDTO?.hallticketNumber;
      return ht ? `${name} (${ht})` : name;
    },
  } as ColDef<FeeCertificateIssueRow>,
  certificate: {
    field: "certificateName",
    headerName: "Certificate",
    minWidth: 140,
  } as ColDef<FeeCertificateIssueRow>,
  certificateFor: {
    headerName: "Certificate For",
    minWidth: 120,
    valueGetter: (p) => p.data?.certificateFor ?? "—",
  } as ColDef<FeeCertificateIssueRow>,
  academic: {
    headerName: "Academic Datials",
    minWidth: 220,
    valueGetter: (p) => (p.data ? academicDetails(p.data) : "—"),
  } as ColDef<FeeCertificateIssueRow>,
  appliedOn: {
    headerName: "Applied Date",
    minWidth: 130,
    valueGetter: (p) => {
      const raw = p.data?.appliedOn;
      if (!raw) return "—";
      const d = new Date(raw);
      return Number.isNaN(d.getTime())
        ? String(raw)
        : format(d, "MMMM d, yyyy");
    },
  } as ColDef<FeeCertificateIssueRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<FeeCertificateIssueRow>,
  actions: {
    headerName: "Actions",
    minWidth: 140,
    flex: 0,
    width: 150,
    sortable: false,
    filter: false,
  } as ColDef<FeeCertificateIssueRow>,
};

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = String(p.data?.applicationStatusCode ?? "");
  const label =
    p.data?.applicationStatusDisplayName ??
    p.data?.applicationStatusName ??
    code ??
    "—";
  return <span className={statusClass(code)}>{label}</span>;
}

function makeActionsRenderer(handlers: {
  onIssue: (row: FeeCertificateIssueRow) => void;
  onPrintReceipt: (row: FeeCertificateIssueRow) => void;
}) {
  return (p: ICellRendererParams<FeeCertificateIssueRow>) => {
    const row = p.data;
    if (!row) return null;
    const code = String(row.applicationStatusCode ?? "").toUpperCase();
    const certCode = String(row.certifcateCode ?? "").toUpperCase();

    if (code === "APPLIED" && certCode !== "NODUE") {
      return (
        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:underline"
          onClick={() => handlers.onIssue(row)}
        >
          Issue Certificate
        </button>
      );
    }
    if (code === "REJECTED")
      return <span className="text-sm text-muted-foreground">Rejected</span>;
    if (code === "CLEARED")
      return <span className="text-sm text-muted-foreground">Cleared</span>;
    if (code === "APPLIED" && certCode === "NODUE") {
      return <span className="text-sm text-muted-foreground">Applied</span>;
    }
    if (code === "TCISSUED" && certCode !== "TC" && certCode !== "CERBC") {
      return (
        <button
          type="button"
          title="Print Receipt"
          aria-label="Print Receipt"
          className="inline-flex items-center justify-center text-[#e91e63] hover:opacity-80"
          onClick={() => handlers.onPrintReceipt(row)}
        >
          <Printer className="h-4 w-4" />
        </button>
      );
    }
    if (certCode === "CERBC" && code === "TCISSUED") {
      return (
        <button
          type="button"
          title="Print Receipt"
          aria-label="Print Receipt"
          className="inline-flex items-center justify-center text-[#e91e63] hover:opacity-80"
          onClick={() => handlers.onPrintReceipt(row)}
        >
          <Printer className="h-4 w-4" />
        </button>
      );
    }
    return null;
  };
}

export default function CertificateRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CollegeCertificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateLabel, setDuplicateLabel] = useState("");

  const [issueOpen, setIssueOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [editing, setEditing] = useState<FeeCertificateIssueRow | null>(null);

  const orgNum = Number(organizationId ?? 0);
  const collegeNum = Number(collegeId ?? 0);
  const certNum = Number(certificateId ?? 0);

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["CertificateRequests", "organizations"],
    queryFn: listActiveOrganizations,
  });

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["CertificateRequests", "colleges", orgNum],
    queryFn: () => listCollegesByOrganization(orgNum),
    enabled: orgNum > 0,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.certIssues(certNum),
    queryFn: () => listFeeCertificateIssuesByCertificate(certNum),
    enabled: certNum > 0 && showTable,
  });

  const orgOptions = useMemo(
    () =>
      orgs.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [orgs],
  );

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const certAmount = certificates.find(
    (c) => c.collegeCertificateId === certNum,
  )?.amount;

  // Auto-select first organization (Angular constructor)
  useEffect(() => {
    if (!organizationId && orgs.length > 0) {
      setOrganizationId(String(orgs[0].organizationId));
    }
  }, [orgs, organizationId]);

  // Restore query params (Angular route.queryParams)
  useEffect(() => {
    const qpCollege = searchParams.get("collegeId");
    const qpCert = searchParams.get("collegeCertificateId");
    if (qpCollege) setCollegeId(qpCollege);
    if (qpCert) {
      setCertificateId(qpCert);
      setShowTable(true);
    }
  }, [searchParams]);

  // Auto-select first college after org load
  useEffect(() => {
    if (!orgNum || colleges.length === 0) return;
    const qpCollege = searchParams.get("collegeId");
    if (qpCollege) return;
    if (!collegeId) setCollegeId(String(colleges[0].collegeId));
  }, [orgNum, colleges, collegeId, searchParams]);

  async function loadCertificates(orgId: number, colId: number) {
    if (!orgId || !colId) {
      setCertificates([]);
      return;
    }
    setLoadingCerts(true);
    try {
      const list = await listCollegeCertificatesByOrgAndCollege(orgId, colId);
      setCertificates(list);
      const qpCert = searchParams.get("collegeCertificateId");
      if (qpCert) {
        setCertificateId(qpCert);
        setShowTable(true);
      }
    } catch (e) {
      toastError(e, "Failed to load certificates");
      setCertificates([]);
    } finally {
      setLoadingCerts(false);
    }
  }

  useEffect(() => {
    if (orgNum > 0 && collegeNum > 0) {
      void loadCertificates(orgNum, collegeNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgNum, collegeNum]);

  function handleCertificateChange(value: string | null) {
    setCertificateId(value);
    setShowTable(Boolean(value));
    setDuplicateWarning(false);
  }

  function checkDateValidation(data: ApplyCertificateRequestPayload): boolean {
    if (rows.length === 0) return false;
    const matches = rows.filter(
      (x) =>
        Number(x.studentDetailListDTO?.studentId ?? x.studentId) ===
          Number(data.studentId) &&
        String(x.certifcateCode ?? "").toUpperCase() ===
          String(data.certifcateCode ?? "").toUpperCase(),
    );
    if (matches.length === 0) return false;
    const latest = matches[0];
    const status = String(latest.applicationStatusCode ?? "").toUpperCase();
    if (status !== "TCISSUED" && status !== "APPLIED") return false;
    return ymKey(data.appliedOn) === ymKey(latest.updatedDt);
  }

  async function handleApplySubmit(payload: ApplyCertificateRequestPayload) {
    if (checkDateValidation(payload)) {
      setDuplicateWarning(true);
      let label = payload.certificateName ?? "certificate";
      if (payload.certificateFor) label = `${label}(${payload.certificateFor})`;
      setDuplicateLabel(label);
      toastInfo("Contact Office, already applied for the certificate");
      return;
    }
    try {
      await updateCertificateIssueAmount([
        payload as unknown as FeeCertificateIssueRow,
      ]);
      toastSuccess("Certificate applied successfully");
      setDuplicateWarning(false);
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.certIssues(certNum),
      });
    } catch (e) {
      toastError(e, "Failed to apply certificate");
    }
  }

  async function handleIssueSubmit(payload: FeeCertificateIssueRow) {
    try {
      await updateCertificateIssueAmount([payload]);
      toastSuccess("Certificate request updated");
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.certIssues(certNum),
      });
    } catch (e) {
      toastError(e, "Update failed");
    }
  }

  function handlePrintReceipt(row: FeeCertificateIssueRow) {
    // Angular: parameterservice.certificatereceipt = row; then navigate to print page.
    const payload = {
      ...row,
      page: "certificate-requests",
      collegeId: row.collegeId ?? (collegeNum > 0 ? collegeNum : undefined),
      collegeCertificateId:
        row.collegeCertificateId ?? (certNum > 0 ? certNum : undefined),
    };
    try {
      sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
    router.push(
      "/tc-no-due-approval/certificate-requests/print-certificate-receipt",
    );
  }

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.certificate,
      COL_DEFS.certificateFor,
      COL_DEFS.academic,
      COL_DEFS.appliedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer({
          onIssue: (row) => {
            setEditing(row);
            setIssueOpen(true);
          },
          onPrintReceipt: handlePrintReceipt,
        }),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <FilteredListPage
      title="Certificate Requests"
      filters={
        <GlobalFilterBarRow>
          <Select
            label="Organization *"
            value={organizationId}
            onChange={(v) => {
              setOrganizationId(v);
              setCollegeId(null);
              setCertificateId(null);
              setCertificates([]);
              setShowTable(false);
            }}
            options={orgOptions}
            placeholder="Select organization"
            searchable
            isLoading={loadingOrgs}
          />
          <Select
            label="College *"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setCertificateId(null);
              setShowTable(false);
            }}
            options={collegeOptions}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
            disabled={!orgNum}
          />
          <Select
            label="Certificates *"
            value={certificateId}
            onChange={handleCertificateChange}
            options={certificates.map((c) => ({
              value: String(c.collegeCertificateId),
              label: c.certificateName ?? c.certifcateCode,
            }))}
            placeholder="Select certificate"
            isLoading={loadingCerts}
            disabled={!collegeNum}
          />
        </GlobalFilterBarRow>
      }
      rowData={showTable && certNum > 0 ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            onClick={() => setApplyOpen(true)}
            disabled={!certNum}
          >
            <Plus className="mr-1 h-4 w-4" />
            Apply certificate
          </Button>
        ) : null
      }
    >
      {duplicateWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You have already applied for this certificate within last one month
            please contact office{duplicateLabel ? ` (${duplicateLabel})` : ""}.
          </span>
        </div>
      ) : null}

      <IssueCertificateModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        row={editing}
        defaultAmount={certAmount}
        onSubmit={(p) => void handleIssueSubmit(p)}
      />

      <ApplyCertificateModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        collegeId={collegeNum}
        collegeCertificateId={certNum}
        onSubmit={(p) => void handleApplySubmit(p)}
      />
    </FilteredListPage>
  );
}
