"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";
const MVSR_BANNER = "/assets/images/avatars/MVSR_BANNER.png";
const MECS_BANNER = "/assets/images/avatars/MECS_BANNER.png";

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

/** Angular span padding around dynamic fields */
function Field({ children }: { children: ReactNode }) {
  return (
    <span className="certificate-span">
      {"\u00A0\u00A0\u00A0 "}
      {children}
      {" \u00A0\u00A0\u00A0"}
    </span>
  );
}

export interface CourseCompletionPrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  awaitingResults: boolean;
  passoutMonth: string;
  passoutYear: string;
  purpose?: string | null;
  printDate: Date;
}

export function CourseCompletionCertificatePrint({
  orgCode,
  student,
  awaitingResults,
  passoutMonth,
  passoutYear,
  purpose,
  printDate,
}: CourseCompletionPrintProps) {
  const code = orgCode.trim().toUpperCase();
  const isAms = code === "AMS";
  const isMecs = code === "MECS";
  const isMvsr = code === "MVSR";

  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const courseName = pickText(student, ["courseName"]);
  const courseCode = pickText(student, ["courseCode"]);
  const academicYear = pickText(student, ["academicYear"]);
  const courseYearName = pickText(student, ["courseYearName"]);
  const collegeName = pickText(student, ["collegeName"]);
  const collegeAddress = pickText(student, ["collegeAddress"]);
  const orgLogo = pickText(student, ["orgLogo"]);
  const dateStr = format(printDate, "dd/MM/yyyy");
  const mvsrDate = format(printDate, "dd.MM.yyyy");
  const purposeLabel = String(purpose ?? "").trim() || "Higher Studies";

  // MVSR — distinct Angular letter layout
  if (isMvsr) {
    return (
      <div className="certificate-print-root hidden print:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MVSR_BANNER}
          alt=""
          className="w-full object-contain"
          style={{ borderRadius: 0 }}
        />
        <hr
          style={{
            border: "1px solid #000",
            margin: "6px 0 0 0",
            width: "100%",
          }}
        />
        <div className="mt-2.5 flex justify-between px-0">
          <p>Cert No: </p>
          <p className="certificate-p-date1">Date : {mvsrDate}</p>
        </div>
        <p
          className="certificate-p5"
          style={{
            textDecoration: "underline",
            fontWeight: "bold",
            textAlign: "center",
            marginTop: 40,
            marginBottom: 40,
          }}
        >
          TO WHOMSOEVER IT MAY CONCERN
        </p>
        <p
          className="certificate-p3"
          style={{ padding: "0 10px", textAlign: "justify" }}
        >
          This is to certify that{" "}
          <b>
            Mr. <Field>{studentName}</Field> S/o Mr. <Field>{fatherName}</Field>
          </b>{" "}
          bearing Roll No. <b>{hallticketNo}</b> is a bonafide student of this
          college from the academic year <Field>{academicYear}</Field>.
          <br />
          He has completed <Field>{courseYearName}</Field> Semesters of his
          course work and is awaiting for <Field>{courseYearName}</Field>{" "}
          semester results. His course may be completed in the academic year{" "}
          <Field>{academicYear}</Field>.
          <br />
          This certificate is issued on the specific request of the student for
          the purpose of <b>{purposeLabel}</b>.
        </p>
        <div
          className="flex justify-between"
          style={{ marginTop: 50, padding: "0 30px", fontSize: 18 }}
        >
          <p style={{ textAlign: "left", margin: 0 }}>Academic Section</p>
          <p style={{ textAlign: "right", margin: 0 }}>PRINCIPAL</p>
        </div>
      </div>
    );
  }

  const awaitingText = (
    <>
      This is to certify that
      <Field>
        {studentName} ({hallticketNo})
      </Field>
      [S/O]/[D/O].Sri <Field>{fatherName}</Field>
      is a student of this college Studying
      <Field>{courseName}</Field>
      during the academic year
      <Field>{academicYear}</Field>
      and course will be completed in the month of {passoutMonth},{passoutYear}.
      The final semester results are likely to be declared in {passoutMonth},
      {passoutYear} after which He/She will be awarded for {courseCode}.
    </>
  );

  const declaredText = (
    <>
      This is to certify that
      <Field>
        {studentName} ({hallticketNo})
      </Field>
      [S/O]/[D/O].Sri <Field>{fatherName}</Field>
      is a student of this college Studying
      <Field>{courseName}</Field>
      during the academic year
      <Field>{academicYear}.</Field>
      He has completed all the requirements of course.
    </>
  );

  const bodyText = awaitingResults ? awaitingText : declaredText;
  const logoSrc = logoUrl(orgLogo || (isMecs ? MECS_BANNER : undefined));
  const certTitle = isMecs
    ? "BONAFIED CUM COURSE COMPLETION CERTIFICATE"
    : "COURSE COMPLETION CERTIFICATE";
  const borderClass = isMecs ? "certificate-border" : "certificate-border-2";

  const header = isAms ? (
    <div className="flex items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" className="certificate-img-logo" />
      <div className="flex-1 text-center">
        <p className="certificate-p1" style={{ marginTop: "2%" }}>
          ANDRA MAHILA SABHA ARTS &amp; SCIENCE
        </p>
        <p className="certificate-p1">COLLEGE FOR WOMEN</p>
        <p className="certificate-p1" style={{ fontSize: 20 }}>
          (Affiliated to Osmania University)
        </p>
      </div>
    </div>
  ) : (
    <div className="flex items-start" style={{ marginTop: 40 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" className="certificate-img-logo" />
      <div className="flex-1 text-center">
        <p
          className="certificate-p1"
          style={{
            fontSize: 35,
            textTransform: "capitalize",
            marginTop: "3%",
          }}
        >
          {collegeName}
        </p>
        <p className="certificate-p1" style={{ fontSize: 18 }}>
          {collegeAddress}
        </p>
      </div>
    </div>
  );

  const bodyBlock = (
    <>
      <div className="flex justify-between" style={{ marginTop: 40 }}>
        {isMecs ? <p> Ref:</p> : <span />}
        <p className="certificate-p-date">Date : {dateStr}</p>
      </div>

      <div style={{ marginTop: 40 }}>
        <p className="certificate-p1" style={{ textDecoration: "underline" }}>
          {certTitle}
        </p>
      </div>

      <div style={{ marginTop: 25, padding: "0 15px", marginBottom: "2%" }}>
        <p className="certificate-p3" style={{ lineHeight: 2 }}>
          {bodyText}
        </p>
      </div>

      <div style={{ padding: "0 10px", marginBottom: "0%" }}>
        <p
          className="certificate-p3"
          style={{ lineHeight: 2, textAlign: "left" }}
        >
          His/Her character and conduct are good.
        </p>
      </div>

      <div style={{ padding: "0 10px" }}>
        <p
          className="certificate-p3"
          style={{ lineHeight: 2, textAlign: "left" }}
        >
          This certificate is issued on his request to apply for {purposeLabel}.
        </p>
      </div>

      <div style={{ padding: "0 30px", marginTop: 35 }}>
        <p
          className="certificate-data"
          style={{ textAlign: "end", fontSize: 22 }}
        >
          PRINCIPAL
        </p>
      </div>
    </>
  );

  // AMS: header + body inside one border (Angular). Others: header outside, body in border.
  if (isAms) {
    return (
      <div className="certificate-print-root hidden print:block">
        <div className={borderClass} style={{ marginTop: 10 }}>
          {header}
          {bodyBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-print-root hidden print:block">
      {header}
      <div className={borderClass} style={{ marginTop: 10 }}>
        {bodyBlock}
      </div>
    </div>
  );
}
