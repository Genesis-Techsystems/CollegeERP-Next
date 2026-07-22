"use client";

/**
 * Angular parity: certificates/certificate-requests/certificate-issued-list
 * Filters: Organization → College → Certificates (org+college)
 * List: FeeCertificateIssue where status is TCISSUED | CLEARED
 * Print: sessionStorage → print-certificate-receipt (printReceipt)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { GlobalFilterBarRow } from "@/common/components/forms";
import { FilteredListPage } from "@/components/layout";
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
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";
import type { CollegeCertificate } from "@/types/college-certificate";
import { IssueCertificateModal } from "../certificate-requests/IssueCertificateModal";

const RECEIPT_STORAGE_KEY = "certificate-receipt-row";

function academicDetails(row: FeeCertificateIssueRow): string {
  const dto = row.studentDetailListDTO;
  if (!dto) return "—";
  // Angular: collegeCode / academicYear / courseCode / groupCode / courseYearName - section
  const base = [
    dto.collegeCode,
    dto.academicYear,
    dto.courseCode,
    dto.groupCode,
    dto.courseYearName,
  ]
    .filter(Boolean)
    .join(" / ");
  return dto.section ? `${base} - ${dto.section}` : base || "—";
}

function statusClass(code: string): string {
  switch (code.toUpperCase()) {
    case "TCISSUED":
      return "inline-flex rounded px-2 py-0.5 text-xs font-semibold text-white bg-emerald-600";
    case "REJECTED":
      return "inline-flex rounded px-2 py-0.5 text-xs font-semibold text-white bg-red-600";
    case "APPLIED":
      return "inline-flex rounded px-2 py-0.5 text-xs font-semibold text-white bg-amber-500";
    case "CLEARED":
      return "inline-flex rounded px-2 py-0.5 text-xs font-semibold text-white bg-sky-600";
    default:
      return "text-sm text-foreground";
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
  } as ColDef<FeeCertificateIssueRow>,
  certificate: {
    field: "certificateName",
    headerName: "Certificate",
    minWidth: 150,
  } as ColDef<FeeCertificateIssueRow>,
  certificateFor: {
    headerName: "Certificate For",
    minWidth: 120,
    valueGetter: (p) => p.data?.certificateFor ?? "—",
  } as ColDef<FeeCertificateIssueRow>,
  academic: {
    headerName: "Academic Datials",
    minWidth: 240,
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
  receipt: {
    headerName: "Receipt No",
    minWidth: 110,
    valueGetter: (p) => {
      const no = p.data?.paymentReceiptsNo;
      return no != null && String(no).trim() !== "" ? `${no}/-` : "—";
    },
  } as ColDef<FeeCertificateIssueRow>,
  collectedAmount: {
    headerName: "Collected Amount",
    minWidth: 130,
    valueGetter: (p) => {
      const amt = p.data?.collectedAmount;
      return amt != null ? `${amt}/-` : "—";
    },
  } as ColDef<FeeCertificateIssueRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<FeeCertificateIssueRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 110,
    sortable: false,
    filter: false,
  } as ColDef<FeeCertificateIssueRow>,
};

function studentRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const row = p.data;
  if (!row) return null;
  const name = row.firstName ?? row.studentDetailListDTO?.firstName ?? "—";
  // Angular sets rollNumber from studentDetailListDTO.rollNumber when building list
  const roll =
    (row as { rollNumber?: string }).rollNumber ??
    row.studentDetailListDTO?.rollNumber ??
    row.studentDetailListDTO?.hallticketNumber;
  return (
    <span>
      {name} {roll ? <span className="text-blue-600">({roll})</span> : null}
    </span>
  );
}

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = String(p.data?.applicationStatusCode ?? "");
  if (!code) return null;
  const label =
    p.data?.applicationStatusDisplayName ??
    p.data?.applicationStatusName ??
    code;
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

    // Template branches (list is filtered to TCISSUED|CLEARED; keep parity)
    if (code === "APPLIED" && certCode !== "TC") {
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
    if (code === "REJECTED") {
      return <span className="text-sm text-muted-foreground">Rejected</span>;
    }
    if (code === "CLEARED") {
      return <span className="text-sm text-muted-foreground">Cleared</span>;
    }
    if (code === "APPLIED" && certCode === "TC") {
      return <span className="text-sm text-muted-foreground">Applied</span>;
    }

    // Angular: printReceipt for TCISSUED except STDIDCRD; TC also uses printReceipt
    if (code === "TCISSUED" && certCode !== "STDIDCRD") {
      const tip = certCode === "TC" ? "Print TC" : "Print Certificate";
      return (
        <button
          type="button"
          title={tip}
          aria-label={tip}
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

export default function CertificatesIssuedListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CollegeCertificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [editing, setEditing] = useState<FeeCertificateIssueRow | null>(null);

  const orgNum = Number(organizationId ?? 0);
  const collegeNum = Number(collegeId ?? 0);
  const certNum = Number(certificateId ?? 0);

  const selectedCert = certificates.find(
    (c) => c.collegeCertificateId === certNum,
  );
  const isIdCard =
    String(selectedCert?.certifcateCode ?? "").toUpperCase() === "STDIDCRD";
  const certAmount = selectedCert?.amount;

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["CertificatesIssuedList", "organizations"],
    queryFn: listActiveOrganizations,
  });

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["CertificatesIssuedList", "colleges", orgNum],
    queryFn: () => listCollegesByOrganization(orgNum),
    enabled: orgNum > 0,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.certIssues(certNum),
    queryFn: () => listFeeCertificateIssuesByCertificate(certNum),
    enabled: certNum > 0 && showTable,
  });

  const notifiedEmptyCert = useRef<number | null>(null);

  // Angular: only TCISSUED | CLEARED; attach rollNumber from DTO
  const issuedRows = useMemo(() => {
    const list: FeeCertificateIssueRow[] = [];
    for (const row of rows) {
      const code = String(row.applicationStatusCode ?? "").toUpperCase();
      if (code !== "TCISSUED" && code !== "CLEARED") continue;
      list.push({
        ...row,
        rollNumber: row.studentDetailListDTO?.rollNumber,
      } as FeeCertificateIssueRow & { rollNumber?: string });
    }
    return list;
  }, [rows]);

  useEffect(() => {
    if (!showTable || isLoading || certNum <= 0) return;
    if (issuedRows.length === 0 && notifiedEmptyCert.current !== certNum) {
      notifiedEmptyCert.current = certNum;
      toastInfo("No records found");
    }
    if (issuedRows.length > 0) notifiedEmptyCert.current = null;
  }, [issuedRows, isLoading, showTable, certNum]);

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

  useEffect(() => {
    if (!organizationId && orgs.length > 0) {
      setOrganizationId(String(orgs[0].organizationId));
    }
  }, [orgs, organizationId]);

  useEffect(() => {
    const qpCollege = searchParams.get("collegeId");
    const qpCert = searchParams.get("collegeCertificateId");
    if (qpCollege) setCollegeId(qpCollege);
    if (qpCert) {
      setCertificateId(qpCert);
      setShowTable(true);
    }
  }, [searchParams]);

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
  }

  async function handleIssueSubmit(payload: FeeCertificateIssueRow) {
    try {
      await updateCertificateIssueAmount([payload]);
      toastSuccess("Certificate request updated");
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.certIssues(certNum),
      });
      setIssueOpen(false);
    } catch (e) {
      toastError(e, "Update failed");
    }
  }

  function handlePrintReceipt(row: FeeCertificateIssueRow) {
    // Angular: row.page = "certificate-issued"; parameterservice.certificatereceipt = row
    const payload = {
      ...row,
      page: "certificate-issued",
      collegeId: row.collegeId ?? (collegeNum > 0 ? collegeNum : undefined),
      collegeCertificateId:
        row.collegeCertificateId ?? (certNum > 0 ? certNum : undefined),
    };
    try {
      sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
    router.push(
      "/tc-no-due-approval/certificate-requests/print-certificate-receipt",
    );
  }

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.student, cellRenderer: studentRenderer },
      COL_DEFS.certificate,
      COL_DEFS.certificateFor,
      COL_DEFS.academic,
      COL_DEFS.appliedOn,
      COL_DEFS.receipt,
      COL_DEFS.collectedAmount,
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

  // Angular hides table card until there are rows; we show once a certificate is chosen.
  const tableVisible = showTable && certNum > 0;

  return (
    <FilteredListPage
      title="Certificate Issued List"
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
              // Angular: certificateName - collegeCode
              label: [c.certificateName ?? c.certifcateCode, c.collegeCode]
                .filter(Boolean)
                .join(" - "),
            }))}
            placeholder="Select certificate"
            isLoading={loadingCerts}
            disabled={!collegeNum}
          />
        </GlobalFilterBarRow>
      }
      rowData={tableVisible ? issuedRows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        // Angular Export as Excel only when certificate code is STDIDCRD
        exportExcel: isIdCard,
        exportPdf: false,
      }}
    >
      <IssueCertificateModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        row={editing}
        defaultAmount={certAmount}
        onSubmit={(p) => void handleIssueSubmit(p)}
      />
    </FilteredListPage>
  );
}
