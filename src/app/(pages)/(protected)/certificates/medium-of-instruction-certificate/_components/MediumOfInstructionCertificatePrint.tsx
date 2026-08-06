"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";
const MVSR_BANNER = "/assets/images/avatars/MVSR_BANNER.png";

function pickText(
  row: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function logoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${MINIO_URL.replace(/\/$/, "")}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/** Angular span padding — bold + dotted underline under dynamic fields */
function Field({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        borderBottom: "1px dotted #000",
        textDecoration: "none",
        textAlign: "center",
        textTransform: "capitalize",
        fontWeight: "bold",
        fontFamily: '"Times New Roman", Times, serif',
      }}
    >
      {"\u00A0\u00A0\u00A0 "}
      {children}
      {" \u00A0\u00A0\u00A0"}
    </span>
  );
}

export interface MediumOfInstructionPrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  awaitingResults: boolean;
  printDate: Date;
}

export function MediumOfInstructionCertificatePrint({
  orgCode,
  student,
  awaitingResults,
  printDate,
}: MediumOfInstructionPrintProps) {
  const code = orgCode.trim().toUpperCase();
  const isAms = code === "AMS";
  const isMvsr = code === "MVSR";

  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const courseName = pickText(student, ["courseName"]);
  const academicYear = pickText(student, ["academicYear"]);
  const collegeName = pickText(student, ["collegeName"]);
  const collegeAddress = pickText(student, ["collegeAddress"]);
  const orgLogo = pickText(student, ["orgLogo"]);
  const dateStr = format(printDate, "dd/MM/yyyy");
  const verb = awaitingResults ? "is" : "was";
  const logoSrc = logoUrl(orgLogo);

  // MVSR — Angular letter layout (banner + cert body)
  if (isMvsr) {
    return (
      <div
        className="certificate-print-root hidden print:block"
        style={{
          padding: "12px 28px",
          boxSizing: "border-box",
          fontFamily: '"Times New Roman", Times, serif',
          color: "#000",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MVSR_BANNER}
          alt="MVSR Engineering College"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            border: "none",
            borderRadius: 0,
          }}
        />

        {/* Angular .cert-line */}
        <hr
          style={{
            border: "none",
            borderTop: "2px solid #000",
            margin: "10px 0 20px 0",
            width: "100%",
          }}
        />

        {/* Cert No / Date — Angular .certno + .p-date1 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 10,
            fontFamily: '"Times New Roman", Times, serif',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            Cert No :
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              textAlign: "right",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            Date : {dateStr}
          </p>
        </div>

        {/* Title — Angular .p-5 */}
        <p
          style={{
            margin: "48px 0 0 0",
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            textDecoration: "underline",
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000",
          }}
        >
          TO WHOM SO EVER IT MAY CONCERN
        </p>

        {/* Body — Angular .p-3 justified, span1–span5 bold + dotted underline */}
        <div style={{ marginTop: 40, padding: "0 10px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 2,
              textAlign: "justify",
              fontFamily: '"Times New Roman", Times, serif',
              color: "#000",
            }}
          >
            This is to certify that Mr.{" "}
            <span className="certificate-span">{studentName}</span> S/o. Mr.{" "}
            <span className="certificate-span">{fatherName}</span> bearing Roll
            No. <span className="certificate-span">{hallticketNo}</span> was a{" "}
            <b>bonafide</b> student of this institution and completed his course
            in <span className="certificate-span">{courseName}</span> in{" "}
            <span className="certificate-span">{academicYear}</span>.
            <br />
            The course was offered and examinations were conducted in{" "}
            <b>English as Medium of Instruction</b> as per O.U. regulations.
            <br />
            This certificate is issued on the request of the above student for
            Higher Studies.
          </p>
        </div>

        {/* Footer — Angular .data1, large signature gap */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "0 30px",
            marginTop: 140,
            fontFamily: '"Times New Roman", Times, serif',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 20,
              textAlign: "left",
              textTransform: "capitalize",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            Academic
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              textAlign: "right",
              textTransform: "capitalize",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            Principal
          </p>
        </div>
      </div>
    );
  }

  const bodyText = (
    <>
      This is to certify that
      <Field>
        {studentName} ({hallticketNo})
      </Field>
      [S/O]/[D/O].Sri <Field>{fatherName}</Field>
      {verb} a student of this college Studying
      <Field>{courseName}</Field>
      during the academic year
      <Field>{academicYear}</Field>
      in English Medium of instructions only. This certificate is issued on the
      request of the individuals.
    </>
  );

  // AMS — header + body inside one border (Angular borderHeigt-2)
  if (isAms) {
    return (
      <div
        className="certificate-print-root hidden print:block"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          color: "#000",
          padding: "8px 16px",
        }}
      >
        <div
          style={{
            marginTop: 10,
            padding: 20,
            height: 690,
            maxHeight: 690,
            width: "100%",
            maxWidth: 1000,
            marginLeft: "auto",
            marginRight: "auto",
            border: "3px solid #000",
            boxSizing: "border-box",
            fontFamily: '"Times New Roman", Times, serif',
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt=""
              style={{
                margin: 20,
                height: 110,
                width: 110,
                objectFit: "contain",
                border: "none",
                borderRadius: "50%",
              }}
            />
            <div style={{ flex: 1, textAlign: "center" }}>
              <p
                style={{
                  margin: "2% 3px -7px",
                  fontSize: 30,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontFamily: '"Times New Roman", Times, serif',
                }}
              >
                ANDRA MAHILA SABHA ARTS &amp; SCIENCE
              </p>
              <p
                style={{
                  margin: "3px",
                  marginBottom: -7,
                  fontSize: 30,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontFamily: '"Times New Roman", Times, serif',
                }}
              >
                COLLEGE FOR WOMEN
              </p>
              <p
                style={{
                  margin: "3px",
                  marginBottom: -7,
                  fontSize: 20,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontFamily: '"Times New Roman", Times, serif',
                }}
              >
                (Affiliated to Osmania University)
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 40,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: "bold",
                textAlign: "right",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              Date : {dateStr}
            </p>
          </div>

          <p
            style={{
              margin: "40px 3px -7px",
              fontSize: 30,
              fontWeight: "bold",
              textAlign: "center",
              textDecoration: "underline",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            TO WHOM SO EVER IT MAY CONCERN
          </p>

          <div style={{ marginTop: 25, padding: "0 10px" }}>
            <p
              style={{
                margin: "17px 0",
                fontSize: 22,
                fontWeight: 500,
                lineHeight: 2,
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              {bodyText}
            </p>
          </div>

          <div style={{ padding: "0 30px", marginTop: 35 }}>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: "bold",
                textAlign: "right",
                textTransform: "capitalize",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              PRINCIPAL
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Common / MECS — Matrusri-style: header outside, bordered certificate body
  return (
    <div
      className="certificate-print-root hidden print:block"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        color: "#000",
        padding: "8px 20px",
        boxSizing: "border-box",
      }}
    >
      {/* Header: logo left + college name / address center */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          style={{
            margin: "10px 20px",
            height: 110,
            width: 110,
            objectFit: "contain",
            border: "none",
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, textAlign: "center", paddingRight: 20 }}>
          <p
            style={{
              margin: "0 0 4px 0",
              fontSize: 32,
              fontWeight: "bold",
              textAlign: "center",
              textTransform: "capitalize",
              fontFamily: '"Times New Roman", Times, serif',
              color: "#000",
              lineHeight: 1.2,
            }}
          >
            {collegeName}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: "bold",
              textAlign: "center",
              fontFamily: '"Times New Roman", Times, serif',
              color: "#000",
              lineHeight: 1.3,
            }}
          >
            {collegeAddress}
          </p>
        </div>
      </div>

      {/* Bordered certificate body — Angular .borderHeigt */}
      <div
        style={{
          marginTop: 10,
          marginLeft: "auto",
          marginRight: "auto",
          padding: 20,
          width: "100%",
          maxWidth: 1000,
          minHeight: 520,
          height: 520,
          border: "3px solid #000",
          boxSizing: "border-box",
          fontFamily: '"Times New Roman", Times, serif',
        }}
      >
        {/* Date — right */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "right",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            Date : {dateStr}
          </p>
        </div>

        {/* Title */}
        <p
          style={{
            margin: "36px 0 0 0",
            fontSize: 28,
            fontWeight: "bold",
            textAlign: "center",
            textDecoration: "underline",
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000",
          }}
        >
          TO WHOM SO EVER IT MAY CONCERN
        </p>

        {/* Body */}
        <div style={{ marginTop: 28, padding: "0 12px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              lineHeight: 2.1,
              textAlign: "left",
              fontFamily: '"Times New Roman", Times, serif',
              color: "#000",
            }}
          >
            {bodyText}
          </p>
        </div>

        {/* PRINCIPAL */}
        <div style={{ padding: "0 24px", marginTop: 48 }}>
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "right",
              textTransform: "uppercase",
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            PRINCIPAL
          </p>
        </div>
      </div>
    </div>
  );
}
