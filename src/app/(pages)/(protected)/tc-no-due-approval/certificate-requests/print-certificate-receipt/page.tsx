"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import {
  feeAmountInWords,
  formatInrAmount,
} from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_lib/fee-receipt-print";
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";

const RECEIPT_STORAGE_KEY = "certificate-receipt-row";
const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

type CertificateReceiptRow = FeeCertificateIssueRow & {
  page?: string;
  orgLogo?: string;
  paymentReceiptsNo?: string | null;
  paymentType?: string | null;
  payment_mode?: string | null;
  card_name?: string | null;
  receiptDt?: string | null;
  collegeCertificateId?: number;
};

function logoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = MINIO_URL.replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function formatReceiptDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  // Angular: date:'dd/MM/yyyy,hh:mm:ss'
  return format(d, "dd/MM/yyyy,hh:mm:ss");
}

function pickDto(row: CertificateReceiptRow, key: string): string {
  const dto = row.studentDetailListDTO as Record<string, unknown> | undefined;
  const fromDto = dto?.[key];
  if (fromDto != null && String(fromDto).trim() !== "") return String(fromDto);
  const fromRow = (row as unknown as Record<string, unknown>)[key];
  if (fromRow != null && String(fromRow).trim() !== "") return String(fromRow);
  return "";
}

/** Mirrors Angular print-certificate-receipt Student/Department copy card. */
function ReceiptCopy({
  row,
  copyLabel,
  orgCode,
}: {
  row: CertificateReceiptRow;
  copyLabel: string;
  orgCode: string;
}) {
  const [logoError, setLogoError] = useState(false);
  const logo = logoUrl(row.orgLogo);
  const amount = row.collectedAmount;
  const paymentMode = String(row.payment_mode ?? "").trim();
  const cardName = String(row.card_name ?? "").trim();
  const courseCode = pickDto(row, "courseCode");
  const groupCode = pickDto(row, "groupCode");
  const section = pickDto(row, "section");
  const courseGroup = [
    courseCode,
    groupCode || section
      ? `(${[groupCode, section].filter(Boolean).join("-")})`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const paymentType = [
    row.paymentType ?? "",
    paymentMode ? `(${paymentMode}${cardName ? ` -${cardName}` : ""})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cert-receipt-doc">
      {orgCode === "SUK" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/images/avatars/SUK_BANNER_NEW.jpg"
          alt=""
          className="cert-receipt-banner"
        />
      ) : null}

      <div className="cert-receipt-title-row">
        <div className="cert-receipt-title-wrap">
          <h3 className="cert-receipt-title">RECEIPT</h3>
        </div>
        <div className="cert-receipt-copy-label">{copyLabel}</div>
      </div>
      <hr className="cert-receipt-line" />

      <div className="cert-receipt-main">
        {!logoError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="cert-receipt-watermark"
            onError={() => setLogoError(true)}
          />
        ) : null}

        <div className="cert-receipt-columns">
          <table className="cert-receipt-info">
            <tbody>
              <InfoRow label="Receipt No" value={row.paymentReceiptsNo ?? ""} />
              <InfoRow label="Student Name" value={pickDto(row, "firstName")} />
              <InfoRow label="USN" value={pickDto(row, "hallticketNumber")} />
              <InfoRow label="Course Group" value={courseGroup} />
            </tbody>
          </table>
          <table className="cert-receipt-info">
            <tbody>
              <InfoRow
                label="Date"
                value={formatReceiptDateTime(
                  row.receiptDt ??
                    row.updatedDt ??
                    row.appliedOn ??
                    row.createdDt,
                )}
              />
              <InfoRow label="Father Name" value={pickDto(row, "fatherName")} />
              <InfoRow
                label="Year"
                value={
                  pickDto(row, "courseYearCode") ||
                  pickDto(row, "courseYearName")
                }
              />
              <InfoRow label="Payment Type" value={paymentType} />
            </tbody>
          </table>
        </div>

        <div className="cert-receipt-amount-wrap">
          <table className="cert-receipt-amount">
            <thead>
              <tr>
                <th>Details</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Amount Paid</th>
                <td>{amount == null ? "₹" : `₹${formatInrAmount(amount)}`}</td>
              </tr>
              <tr>
                <th>Amount In Words</th>
                <td>
                  {amount != null ? `${feeAmountInWords(amount)} Only` : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cert-receipt-note">
          <p>NOTE:</p>
          <p>1. Please check the receipt before leaving the window</p>
          <p>2. This is system generated receipt</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th>{label}</th>
      <td className="cert-receipt-dots">:</td>
      <td>{value}</td>
    </tr>
  );
}

export default function PrintCertificateReceiptPage() {
  const router = useRouter();
  const [row, setRow] = useState<CertificateReceiptRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RECEIPT_STORAGE_KEY);
      if (!raw) {
        setReady(true);
        router.replace("/tc-no-due-approval/certificate-requests");
        return;
      }
      setRow(JSON.parse(raw) as CertificateReceiptRow);
    } catch {
      router.replace("/tc-no-due-approval/certificate-requests");
    } finally {
      setReady(true);
    }
  }, [router]);

  const orgCode = useMemo(() => {
    try {
      return String(localStorage.getItem("orgCode") ?? "").trim();
    } catch {
      return "";
    }
  }, [row]);

  const backHref = useMemo(() => {
    if (!row) return "/tc-no-due-approval/certificate-requests";
    const qs = new URLSearchParams();
    if (row.collegeId) qs.set("collegeId", String(row.collegeId));
    if (row.collegeCertificateId) {
      qs.set("collegeCertificateId", String(row.collegeCertificateId));
    }
    const q = qs.toString();
    // Angular goBack: page == 'certificate-requests' | else certificates-issued-list
    // Issued list sets page = "certificate-issued"
    const fromIssued =
      row.page === "certificate-issued" ||
      row.page === "certificates-issued-list" ||
      row.page === "certificate-issued-list";
    const base = fromIssued
      ? "/tc-no-due-approval/certificates-issued-list"
      : "/tc-no-due-approval/certificate-requests";
    return q ? `${base}?${q}` : base;
  }, [row]);

  if (!ready || !row) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading receipt…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <style>{`
        .cert-receipt-doc {
          position: relative;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          border: 2px solid #000;
          border-radius: 10px;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          box-sizing: border-box;
          padding-bottom: 10px;
        }
        .cert-receipt-banner {
          display: block;
          width: 100%;
          padding: 5px;
          object-fit: contain;
        }
        .cert-receipt-title-row {
          display: flex;
          align-items: flex-start;
          width: 100%;
        }
        .cert-receipt-title-wrap {
          flex: 0 0 55%;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
        }
        .cert-receipt-title {
          margin: 8px 0 0;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
        }
        .cert-receipt-copy-label {
          flex: 0 0 45%;
          display: flex;
          justify-content: flex-end;
          padding: 17px 12px 0 0;
          font-size: 13px;
        }
        .cert-receipt-line {
          width: 90%;
          margin: 4px auto 0;
          border: none;
          border-top: 2px solid #000;
        }
        .cert-receipt-main {
          position: relative;
          padding: 12px 15px 8px;
        }
        .cert-receipt-watermark {
          position: absolute;
          left: 50%;
          top: 8%;
          width: 40%;
          max-width: 180px;
          height: auto;
          opacity: 0.2;
          transform: translateX(-50%);
          pointer-events: none;
          z-index: 0;
        }
        .cert-receipt-columns {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
        }
        .cert-receipt-info {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .cert-receipt-info th {
          width: 32%;
          text-align: left;
          font-weight: 500;
          padding: 2px 0;
          border: none;
          vertical-align: top;
          white-space: nowrap;
        }
        .cert-receipt-info td {
          text-align: left;
          font-weight: 600;
          padding: 2px 0;
          border: none;
          vertical-align: top;
        }
        .cert-receipt-dots {
          width: 5%;
          font-weight: 600 !important;
          padding-left: 2px !important;
          padding-right: 6px !important;
        }
        .cert-receipt-amount-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }
        .cert-receipt-amount {
          width: 60%;
          min-width: 280px;
          border-collapse: collapse;
          border: 1px solid #000;
          font-size: 12px;
        }
        .cert-receipt-amount th,
        .cert-receipt-amount td {
          border: 1px solid #000;
          padding: 3px 6px;
        }
        .cert-receipt-amount thead th {
          text-align: center;
          font-weight: 600;
        }
        .cert-receipt-amount tbody th {
          text-align: left;
          font-weight: 600;
        }
        .cert-receipt-amount tbody td {
          text-align: right;
          font-weight: 550;
        }
        .cert-receipt-note {
          position: relative;
          z-index: 1;
          width: 90%;
          margin: 12px auto 4px;
          border: 1px solid #000;
          padding: 6px 10px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
        }
        .cert-receipt-note p {
          margin: 0 0 2px;
          text-align: left;
        }
        .cert-receipt-sep {
          border-top: 2px dashed #000;
          margin: 10px 0;
          width: 100%;
        }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body * { visibility: hidden !important; }
          .cert-receipt-print-area,
          .cert-receipt-print-area * { visibility: visible !important; }
          .cert-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .cert-receipt-no-print { display: none !important; }
          .cert-receipt-doc {
            max-width: none !important;
            width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cert-receipt-copies {
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
          }
        }
      `}</style>

      <div className="overflow-hidden" data-no-page-name>
        <div className="cert-receipt-no-print px-1 py-1">
          <h1 className="text-base font-semibold text-black">Receipt</h1>
        </div>

        {/* Angular #print-section: Student Copy + dashed cut line + Department Copy */}
        <div className="cert-receipt-print-area py-3">
          <div className="cert-receipt-copies mx-auto flex max-w-[720px] flex-col">
            <ReceiptCopy row={row} copyLabel="Student Copy" orgCode={orgCode} />
            <div className="cert-receipt-sep" />
            <ReceiptCopy
              row={row}
              copyLabel="Department Copy"
              orgCode={orgCode}
            />
          </div>
        </div>

        <div className="cert-receipt-no-print flex justify-end gap-2 px-1 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[88px]"
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
          <Button
            type="button"
            className="h-9 min-w-[88px]"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
