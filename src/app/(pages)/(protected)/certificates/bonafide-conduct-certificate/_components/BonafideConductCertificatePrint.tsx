"use client";

import type { CSSProperties, ReactNode } from "react";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";
const DEFAULT_STUDENT = "/assets/images/avatars/default_Student.png";
const MVSR_BANNER = "/assets/images/avatars/MVSR_BANNER.png";
const MECS_BANNER = "/assets/images/avatars/MECS_BANNER.png";
const WATERMARK = "/assets/images/avatars/watermark.png";

const SERIF = '"Times New Roman", Times, serif';

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

function studentPhotoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${MINIO_URL.replace(/\/$/, "")}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/** Angular span1–span5 — bold + dotted underline */
function Field({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        borderBottom: "1px dotted #000",
        textDecoration: "none",
        textAlign: "center",
        textTransform: "capitalize",
        fontWeight: "bold",
        fontFamily: SERIF,
      }}
    >
      {"\u00A0\u00A0\u00A0 "}
      {children}
      {" \u00A0\u00A0\u00A0"}
    </span>
  );
}

/** Angular .highlight — bold dynamic values */
function Highlight({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontWeight: "bold", fontFamily: SERIF }}>{children}</span>
  );
}

export interface BonafideConductCertificatePrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  purpose?: string | null;
  printDate: Date;
  feeCertificateData?: Record<string, unknown> | null;
}

/** Angular AMS print block */
function AmsConductTemplate({
  student,
  printDate,
}: {
  student: StudentFeeSearchRow;
  printDate: Date;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const academicYear = pickText(student, ["academicYear"]);
  const courseCode = pickText(student, ["courseName", "courseCode"]);
  const orgLogo = pickText(student, ["orgLogo"]);

  return (
    <div
      style={{
        margin: "0 auto",
        padding: 20,
        width: "100%",
        maxWidth: 1000,
        minHeight: 1048,
        border: "double 5px #000",
        boxSizing: "border-box",
        fontFamily: SERIF,
        color: "#000",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(orgLogo)}
          alt=""
          style={{
            margin: 20,
            height: 110,
            width: 110,
            objectFit: "contain",
            borderRadius: "50%",
            border: "none",
          }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={amsTitleStyle}>ANDRA MAHILA SABHA ARTS &amp; SCIENCE</p>
          <p style={amsTitleStyle}>COLLEGE FOR WOMEN</p>
          <p style={{ ...amsTitleStyle, fontSize: 17, fontWeight: 500 }}>
            (Affiliated to Osmania University)
          </p>
          <p style={amsTitleStyle}>
            (AUTONOMOUS) NAAC R2-Accredited O.U.Campus,
          </p>
          <p style={amsTitleStyle}>Hyderabad -500 007</p>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 40 }}>
        <div style={{ width: "15%" }}>
          <p style={amsTitleStyle}>S.No.</p>
        </div>
        <div style={{ width: "85%", textAlign: "center" }}>
          <p style={{ ...amsTitleStyle, textDecoration: "underline" }}>
            BONAFIDE AND CONDUCT CERTIFICATE
          </p>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 60 }}>
        <div style={{ width: "70%" }}>
          <p style={amsMetaStyle}>
            <span style={{ fontFamily: "cursive" }}>Hall Ticket NO. </span>:
            <span style={{ fontWeight: "bold" }}>{hallticketNo}</span>
          </p>
        </div>
        <div style={{ width: "30%" }}>
          <p style={amsMetaStyle}>
            <span style={{ fontFamily: "cursive" }}>Date : </span>
            <span style={{ fontWeight: "bold" }}>
              {format(printDate, "dd-MM-yyyy")}
            </span>
          </p>
        </div>
      </div>

      <div style={{ marginTop: 50 }}>
        <p
          style={{
            margin: "17px 0",
            fontSize: 17,
            fontWeight: 500,
            lineHeight: 3,
            fontFamily: "cursive",
            color: "#000",
          }}
        >
          This is to Certify that Miss <Field>{studentName}</Field> Daughter
          <Field>{fatherName}</Field> was a Bonafide student of this college
          during the Academics years <Field>{academicYear}</Field> and Studied{" "}
          <Field>{courseCode}</Field> course During het stay of this college,
          her conduct and character we are found to be to be{" "}
          <Field>SATISFIED</Field>
        </p>
      </div>

      <div style={{ marginTop: "10%", marginLeft: "80%" }}>
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: "bold",
            fontFamily: SERIF,
          }}
        >
          PRINCIPAL
        </p>
      </div>
    </div>
  );
}

const amsTitleStyle: CSSProperties = {
  margin: "3px",
  marginBottom: -7,
  fontSize: 19,
  fontWeight: 500,
  textAlign: "center",
  fontFamily: SERIF,
  color: "#000",
};

const amsMetaStyle: CSSProperties = {
  margin: "17px 0",
  fontSize: 17,
  fontWeight: 500,
  fontFamily: "cursive",
  color: "#000",
};

/** Angular MVSR print block */
function MvsrConductTemplate({
  student,
  purpose,
  printDate,
  feeCertificateData,
}: {
  student: StudentFeeSearchRow;
  purpose?: string | null;
  printDate: Date;
  feeCertificateData?: Record<string, unknown> | null;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const courseCode = pickText(student, ["courseName", "courseCode"]);
  const courseYearName = pickText(student, ["courseYearName"]);
  const academicYear = pickText(student, ["academicYear"]);
  const photo = pickText(student, ["studentPhotoPath"]);
  const certNo = pickText(feeCertificateData, ["tc_number"]);
  const purposeText = String(purpose ?? "").trim() || "Bus Pass";

  return (
    <div
      style={{
        margin: "10px auto 0",
        padding: 20,
        width: "100%",
        maxWidth: 1000,
        minHeight: 850,
        border: "3px solid #000",
        boxSizing: "border-box",
        fontFamily: SERIF,
        color: "#000",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MVSR_BANNER}
        alt=""
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: 0,
          border: "none",
        }}
      />
      <hr
        style={{
          border: "none",
          borderTop: "2px solid #000",
          margin: "10px 0 20px",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 16,
        }}
      >
        <span>
          Cert No: <strong>{certNo}</strong>
        </span>
        <span>
          Date: <strong>{format(printDate, "dd-MMM-yyyy")}</strong>
        </span>
      </div>

      <div
        style={{ position: "relative", padding: "10px 18px 0", minHeight: 420 }}
      >
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            textDecoration: "underline",
            fontFamily: SERIF,
          }}
        >
          BONAFIDE CERTIFICATE
        </p>

        <div style={{ textAlign: "right", marginTop: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={studentPhotoUrl(photo)}
            alt="Student"
            style={{
              width: 120,
              height: 150,
              border: "3px solid #000",
              borderRadius: 4,
              objectFit: "cover",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -45%)",
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WATERMARK}
            alt=""
            style={{ maxWidth: 480, maxHeight: 480, display: "block" }}
          />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 18,
            padding: "0 10px",
          }}
        >
          <div
            style={{
              maxWidth: "90%",
              margin: "0 auto",
              fontSize: 19,
              lineHeight: 2.1,
              textAlign: "justify",
              color: "#111",
              fontFamily: SERIF,
            }}
          >
            <p style={{ margin: 0 }}>
              This is to certify that{" "}
              <Highlight>Mr/Ms. {studentName}</Highlight> S/D/o.{" "}
              <Highlight>{fatherName}</Highlight> bearing Roll No.{" "}
              <Highlight>{hallticketNo}</Highlight> is a bonafide student of
              this college studying in <Highlight>{courseCode}</Highlight>{" "}
              {courseYearName} Year, {courseYearName} Semester during{" "}
              <Highlight>{academicYear}</Highlight>.
            </p>
            <p style={{ margin: "8px 0 0", lineHeight: 2 }}>
              Her Conduct is <Highlight>Satisfactory.</Highlight>
            </p>
            <p style={{ margin: "8px 0 0", lineHeight: 2 }}>
              This certificate is issued for applying{" "}
              <Highlight>{purposeText}</Highlight>.
            </p>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 30px",
            marginTop: 40,
          }}
        >
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            Academic Section
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              textAlign: "right",
            }}
          >
            Principal
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Common / MECS — matches Angular Matrusri print:
 * banner (or logo+college) → Certificate No / Date with thin rules →
 * title → body → Prepared By / I/C Academic Section / PRINCIPAL
 * (Ignores toast errors like "Unable to process your request…")
 */
function CommonConductTemplate({
  student,
  printDate,
  feeCertificateData,
  useMecsBanner,
}: {
  student: StudentFeeSearchRow;
  printDate: Date;
  feeCertificateData?: Record<string, unknown> | null;
  useMecsBanner: boolean;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const groupCode = pickText(student, ["groupCode"]);
  const collegeName = pickText(student, ["collegeName"]);
  const collegeAddress = pickText(student, ["collegeAddress"]);
  const orgLogo = pickText(student, ["orgLogo"]);
  const certNo = pickText(feeCertificateData, ["tc_number"]);
  // Angular: fromDate || batch_name only — no academicYear fallback
  const fromDate = pickText(feeCertificateData, ["fromDate", "batch_name"]);
  const toDate = pickText(feeCertificateData, ["toDate"]);

  return (
    <div
      style={{
        margin: "0 auto",
        padding: "16px 28px 28px",
        width: "100%",
        maxWidth: 1000,
        boxSizing: "border-box",
        fontFamily: SERIF,
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header — MECS banner image, or logo + college for other orgs */}
      {useMecsBanner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={MECS_BANNER}
          alt="Matrusri Engineering College"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            border: "none",
            borderRadius: 0,
            margin: 0,
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl(orgLogo)}
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
                margin: "0 0 4px",
                fontSize: 32,
                fontWeight: "bold",
                textTransform: "capitalize",
                fontFamily: SERIF,
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
                fontFamily: SERIF,
                lineHeight: 1.3,
              }}
            >
              {collegeAddress}
            </p>
          </div>
        </div>
      )}

      {/* Angular .meta-box — thin top/bottom rules, Cert No | Date */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #000",
          borderBottom: "1px solid #000",
          padding: "8px 4px",
          marginTop: 10,
          boxSizing: "border-box",
          fontSize: 16,
          fontFamily: SERIF,
          color: "#000",
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1.4 }}>
          Certificate No: <strong>{certNo}</strong>
        </span>
        <span style={{ fontSize: 16, lineHeight: 1.4 }}>
          Date: {format(printDate, "dd-MM-yyyy")}
        </span>
      </div>

      {/* Title + body + footer */}
      <div
        style={{
          position: "relative",
          padding: "10px 18px 0",
          minHeight: 480,
        }}
      >
        <p
          style={{
            margin: "48px 0 0",
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            textDecoration: "underline",
            letterSpacing: "0.5px",
            fontFamily: SERIF,
            color: "#000",
          }}
        >
          BONAFIDE &amp; CONDUCT CERTIFICATE
        </p>

        {/* Faint watermark — Angular .watermark-container */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -45%)",
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WATERMARK}
            alt=""
            style={{
              maxWidth: 480,
              maxHeight: 480,
              width: "auto",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Body — Angular .certificate-text */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 56,
            padding: "0 10px",
          }}
        >
          <p
            style={{
              margin: 0,
              maxWidth: "92%",
              marginLeft: "auto",
              marginRight: "auto",
              fontSize: 19,
              lineHeight: 2.1,
              textAlign: "justify",
              color: "#111",
              fontFamily: SERIF,
              fontWeight: 400,
            }}
          >
            This is to certify that Mr./Ms.
            <Highlight>
              {" "}
              {studentName} ({hallticketNo})
            </Highlight>{" "}
            S/D/O of Mr./Ms.
            <Highlight> {fatherName} </Highlight>, was a student of this college
            bearing Roll No.
            <Highlight> {hallticketNo} </Highlight>, studied
            {groupCode ? (
              <>
                {" "}
                <Highlight> {groupCode} </Highlight>
              </>
            ) : null}{" "}
            from <Highlight> {fromDate} </Highlight>
            to <Highlight> {toDate} </Highlight>. His/Her conduct is found to be
            satisfactory.
          </p>
        </div>

        {/* Footer — Prepared By / I/C Academic Section / PRINCIPAL */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            width: "100%",
            padding: "0 30px",
            marginTop: 120,
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              margin: 0,
              width: "33.33%",
              fontSize: 15,
              fontWeight: 700,
              textAlign: "left",
              fontFamily: SERIF,
              color: "#000",
            }}
          >
            Prepared By
          </p>
          <p
            style={{
              margin: 0,
              width: "33.33%",
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              fontFamily: SERIF,
              color: "#000",
            }}
          >
            I/C Academic Section
          </p>
          <p
            style={{
              margin: 0,
              width: "33.33%",
              fontSize: 15,
              fontWeight: 700,
              textAlign: "right",
              fontFamily: SERIF,
              textTransform: "uppercase",
              color: "#000",
            }}
          >
            PRINCIPAL
          </p>
        </div>
      </div>
    </div>
  );
}

export function BonafideConductCertificatePrint({
  orgCode,
  student,
  purpose,
  printDate,
  feeCertificateData,
}: BonafideConductCertificatePrintProps) {
  const code = orgCode.trim().toUpperCase();
  const isAms = code === "AMS";
  const isMvsr = code === "MVSR";
  const isMecs = code === "MECS";

  if (isAms) {
    return (
      <div className="certificate-print-root hidden print:block">
        <AmsConductTemplate student={student} printDate={printDate} />
      </div>
    );
  }

  if (isMvsr) {
    return (
      <div className="certificate-print-root hidden print:block">
        <MvsrConductTemplate
          student={student}
          purpose={purpose}
          printDate={printDate}
          feeCertificateData={feeCertificateData}
        />
      </div>
    );
  }

  // Common for all other orgs (+ MECS banner when MECS)
  return (
    <div className="certificate-print-root hidden print:block">
      <CommonConductTemplate
        student={student}
        printDate={printDate}
        feeCertificateData={feeCertificateData}
        useMecsBanner={isMecs}
      />
    </div>
  );
}
