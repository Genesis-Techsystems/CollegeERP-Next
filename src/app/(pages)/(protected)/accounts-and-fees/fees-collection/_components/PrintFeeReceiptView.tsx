"use client";

/**
 * Angular `student-fees/fee-payment/student-print-receipt`
 * → `StudentFeeReceiptPrintComponent` / `fee-receipts/print-reciept`.
 * Screen: one 60% preview. Print: iframe with Angular-sized Student + Department copies.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  FEE_RECEIPT_PRINT_PATH,
  feeAmountInWords,
  formatInrAmount,
  printStudentFeeReceipt,
  readFeeReceiptPrint,
  type FeeReceiptPrintData,
} from "../_lib/fee-receipt-print";

function logoSrc(path?: string): string {
  const p = String(path ?? "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return p;
  return `${MINIO_URL}${p.replace(/^\/+/, "")}`;
}

function formatReceiptDateTime(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd/MM/yyyy,HH:mm:ss");
}

function pick(data: FeeReceiptPrintData, ...keys: string[]): string {
  for (const key of keys) {
    const v = data[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

/** On-screen preview — Angular `First-Border` / print-reciept.component.html */
function ReceiptPreview({
  data,
  resolvedLogo,
  fallbackLogo,
}: {
  data: FeeReceiptPrintData;
  resolvedLogo: string;
  fallbackLogo: string;
}) {
  const [imgSrc, setImgSrc] = useState(resolvedLogo);

  useEffect(() => {
    setImgSrc(resolvedLogo || fallbackLogo || DEFAULT_COLLEGE_LOGO);
  }, [fallbackLogo, resolvedLogo]);

  function handleLogoError() {
    if (imgSrc !== fallbackLogo && fallbackLogo) {
      setImgSrc(fallbackLogo);
      return;
    }
    if (!imgSrc.endsWith("default_logo.png")) {
      setImgSrc(DEFAULT_COLLEGE_LOGO);
    }
  }

  const collegeName = pick(data, "college_name", "collegeName") || "College";
  const address = pick(data, "address", "college_address");
  const paymentType = pick(data, "payment_type", "paymentType");
  const paymentMode = pick(data, "payment_mode", "paymentMode");
  const cardName = pick(data, "card_name", "cardName");
  const amount = pick(data, "receipt_amount", "receiptAmount") || "0";
  const courseCode = pick(data, "course_code", "courseCode");
  const groupCode = pick(data, "group_code", "groupCode");
  const section = pick(data, "section");
  const branch =
    courseCode || groupCode || section
      ? `${courseCode}${groupCode || section ? ` (${[groupCode, section].filter(Boolean).join("-")})` : ""}`
      : "";

  const infoTh: CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    border: "none",
    width: "30%",
    textAlign: "left",
    fontWeight: 500,
    padding: "2px 0",
    verticalAlign: "top",
  };
  const infoTd: CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: 12,
    border: "none",
    textAlign: "left",
    fontWeight: 600,
    padding: "2px 0",
    verticalAlign: "top",
  };
  const dotsTd: CSSProperties = {
    ...infoTd,
    width: "5%",
  };

  return (
    <div
      className="First-Border relative mx-auto bg-white text-black"
      style={{
        width: "60%",
        minWidth: 420,
        maxWidth: 780,
        border: "2px solid #000",
        borderRadius: 10,
        marginTop: 10,
      }}
    >
      {/* Angular `.firstborder` — logo left, college name/address centered */}
      <div
        className="firstborder flex items-center"
        style={{ borderBottom: "2px solid #000" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="h-logo shrink-0 object-contain"
          style={{ height: 100, width: 110, padding: 10 }}
          onError={handleLogoError}
        />
        <div className="min-w-0 flex-1">
          <h2
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 26,
              margin: 5,
              textTransform: "uppercase",
            }}
          >
            {collegeName}
          </h2>
          {address ? (
            <h4
              style={{
                textAlign: "center",
                fontWeight: "bold",
                margin: 5,
                fontSize: 14,
              }}
            >
              {address}
            </h4>
          ) : null}
        </div>
      </div>

      <h3
        style={{
          textAlign: "center",
          fontWeight: "bold",
          margin: "12px 0 8px",
          fontSize: 16,
        }}
      >
        FEE-RECEIPT
      </h3>
      <hr
        className="line"
        style={{
          backgroundColor: "#000",
          height: 2,
          width: "90%",
          margin: "0 auto 8px",
          border: "none",
        }}
      />

      {/* Angular `.main-card` + `.img-3` backdrop logo */}
      <div className="main-card flex" style={{ padding: 15 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="img-3 pointer-events-none"
          style={{
            width: "40%",
            height: "70%",
            opacity: 0.2,
            position: "absolute",
            top: "22%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 0,
            marginLeft: 0,
            objectFit: "contain",
            zIndex: 0,
          }}
          onError={handleLogoError}
        />

        <div className="relative z-[1] w-1/2 pr-2">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <th style={infoTh}>Receipt No</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(data, "payment_receipts_no", "paymentReceiptsNo")}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Student Name</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(data, "student_name", "studentName", "firstName")}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>HallTicket No</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(
                    data,
                    "hallticket_number",
                    "hallTicketNo",
                    "rollNumber",
                  )}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Branch</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>{branch}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="relative z-[1] w-1/2 pl-2">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <th style={infoTh}>Date</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {formatReceiptDateTime(
                    pick(data, "receipt_date", "receiptDt"),
                  )}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Father Name</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(data, "father_name", "fatherName")}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Year</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(data, "year_name", "yearName", "courseYearName")}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Payment Type</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {paymentType}
                  {paymentMode ? (
                    <span>
                      {" "}
                      ({paymentMode}
                      {cardName ? ` -${cardName}` : ""})
                    </span>
                  ) : null}
                </td>
              </tr>
              <tr>
                <th style={infoTh}>Merchant Ref.No</th>
                <td style={dotsTd}>:</td>
                <td style={infoTd}>
                  {pick(
                    data,
                    "transaction_no",
                    "transactionNo",
                    "referenceNumber",
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Angular `#table2` — 60% centered */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "60%" }}>
          <table
            id="table2"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderSpacing: 0,
              border: "1px solid #000",
              fontFamily: "Arial, sans-serif",
              fontSize: 12,
            }}
          >
            <tbody>
              <tr>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  Details
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  Amount
                </th>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  Amount Paid
                </th>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "right",
                    fontWeight: 550,
                  }}
                >
                  ₹{formatInrAmount(amount)}
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  Amount In Words
                </th>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: 1,
                    textAlign: "right",
                    fontWeight: 550,
                  }}
                >
                  {feeAmountInWords(amount)} Only
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Angular `.border` NOTE box */}
      <div style={{ padding: 15 }}>
        <div
          className="border"
          style={{
            border: "1px solid #000",
            width: "90%",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              margin: "4px 0 4px 10px",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            NOTE:{" "}
          </p>
          <p
            style={{
              margin: "-4px 0 2px 10px",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            1. Please check the receipt before leaving the window
          </p>
          <p
            style={{
              margin: "-4px 0 6px 10px",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "left",
            }}
          >
            2. This is system generated receipt
          </p>
        </div>
      </div>
    </div>
  );
}

export function PrintFeeReceiptView() {
  const router = useRouter();
  const [data, setData] = useState<FeeReceiptPrintData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readFeeReceiptPrint();
    setData(stored);
    setReady(true);
    if (!stored) {
      router.replace("/accounts-and-fees/fees-collection/payment/fee-payment");
    }
  }, [router]);

  const collegeId = useMemo(() => {
    if (!data) return null;
    const id = Number(pick(data, "collegeId", "college_id", "fk_college_id"));
    return id > 0 ? id : null;
  }, [data]);

  const collegeLogo = useCollegeLogo(collegeId);

  const resolvedLogo = useMemo(() => {
    if (!data) return collegeLogo || DEFAULT_COLLEGE_LOGO;
    // Angular: MINIO + studentDetails.logo_path when present
    const fromReceipt = logoSrc(pick(data, "logo_path", "logoPath", "logo"));
    if (fromReceipt) return fromReceipt;
    return collegeLogo || DEFAULT_COLLEGE_LOGO;
  }, [collegeLogo, data]);

  const backHref = useMemo(() => {
    const fallback = "/accounts-and-fees/fees-collection/payment/fee-payment";
    if (!data) return fallback;
    const returnPath = pick(data, "returnPath");
    if (returnPath.startsWith("/")) return returnPath;

    const qs = new URLSearchParams();
    const sid = pick(data, "fk_student_id", "studentId");
    const roll = pick(data, "hallticket_number", "hallTicketNo", "rollNumber");
    if (sid) qs.set("studentId", sid);
    if (roll) qs.set("rollNumber", roll);
    const cid = pick(data, "collegeId");
    if (cid) qs.set("collegeId", cid);
    const q = qs.toString();
    return q ? `${fallback}?${q}` : fallback;
  }, [data]);

  function handlePrint() {
    if (!data) return;
    // Use the same logo URL as the on-screen preview (absolute / data URL).
    // Raw MinIO keys often break inside the about:blank print iframe.
    const previewImg = document.querySelector<HTMLImageElement>(
      ".First-Border img.h-logo",
    );
    const screenLogo =
      previewImg?.currentSrc ||
      previewImg?.src ||
      resolvedLogo ||
      collegeLogo ||
      DEFAULT_COLLEGE_LOGO;
    printStudentFeeReceipt({
      ...data,
      logo_path: screenLogo,
    });
  }

  if (!ready || !data) return null;

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-no-page-name data-print-hide>
        <div className="table-context-header !m-0">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            ballot
          </span>
          <strong className="table-context-header__title">Fee-Receipt</strong>
        </div>

        <div className="px-4 py-4">
          <ReceiptPreview
            data={data}
            resolvedLogo={resolvedLogo}
            fallbackLogo={collegeLogo || DEFAULT_COLLEGE_LOGO}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[88px] bg-white px-5 text-[13px] font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => router.push(backHref)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-9 min-w-[88px] bg-[#1565c0] px-5 text-[13px] font-medium text-white hover:bg-[#0d47a1]"
              onClick={handlePrint}
            >
              Print
            </Button>
          </div>
        </div>
      </div>

      <span className="sr-only">{FEE_RECEIPT_PRINT_PATH}</span>
    </PageContainer>
  );
}
