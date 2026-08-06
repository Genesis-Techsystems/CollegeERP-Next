"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { BonafideCertificateIssueRow } from "@/services";
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

function formatCertDate(value: Date, pattern: string): string {
  return format(value, pattern);
}

function formatDob(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd-MM-yyyy");
}

function logoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_LOGO;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${MINIO_URL.replace(/\/$/, "")}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export interface BonafideCertificatePrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  feeCertificateData: BonafideCertificateIssueRow | null;
  printDate: Date;
}

function AmsTemplate({
  student,
  feeCertificateData,
  printDate,
  orgLogo,
}: {
  student: StudentFeeSearchRow;
  feeCertificateData: BonafideCertificateIssueRow | null;
  printDate: Date;
  orgLogo?: string | null;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const groupCode = pickText(student, ["groupCode"]);

  const body = (
    <>
      <div className="mt-10 flex">
        <div className="w-[15%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl(orgLogo)}
            alt=""
            className="mx-5 h-[110px] w-[110px] object-contain"
            style={{ borderRadius: "50%" }}
          />
        </div>
        <div className="w-[85%] text-center">
          <p className="bonafide-p1">ANDHRA MAHILA SABHA ARTS &amp; SCIENCE</p>
          <p className="bonafide-p1">COLLEGE FOR WOMEN</p>
          <p className="bonafide-p1 text-xl text-black">
            (Affiliated to Osmania University)
          </p>
          <p className="bonafide-p1 text-lg text-black">
            (AUTONOMOUS) NAAC Re-Accredited O.U.Campus,
          </p>
          <p className="bonafide-p1 text-lg text-black">Hyderabad -500 007</p>
        </div>
      </div>

      <div className="mt-10 flex">
        <div className="w-[30%]">
          <p className="bonafide-p1">
            S.No. {feeCertificateData?.tc_number ?? ""}
          </p>
        </div>
        <div className="w-[40%] text-center">
          <p className="bonafide-p1 underline">BONAFIDE CERTIFICATE</p>
        </div>
        <div className="w-[30%] text-right">
          <p className="bonafide-p1">
            {formatCertDate(printDate, "dd/MM/yyyy")}
          </p>
        </div>
      </div>

      <div className="mt-5 px-2.5">
        <p className="bonafide-p3 leading-8">
          Kum
          <span className="bonafide-span">
            {" "}
            {studentName} ({hallticketNo}){" "}
          </span>
          [D/O].Sri
          <span className="bonafide-span"> {fatherName} </span>
          is a Bonafide student of this college He/She Studying
          <span className="bonafide-span"> {groupCode} </span>
          Class during the year from
          <span className="bonafide-span">
            {" "}
            {feeCertificateData?.batch_name ?? ""}{" "}
          </span>
        </p>
      </div>

      <div className="mt-5 text-center">
        <p className="bonafide-p3 leading-8">
          Her Conduct and Character are Satisfactory
        </p>
      </div>

      <div className="mt-6 flex px-8">
        <p className="bonafide-data w-1/2">CLERK/INCHARGE</p>
        <p className="bonafide-data w-1/2 text-right">PRINCIPAL</p>
      </div>
    </>
  );

  return (
    <>
      <div className="bonafide-border">{body}</div>
      <div className="bonafide-border mt-2.5">{body}</div>
    </>
  );
}

function MvsrTemplate({
  student,
  feeCertificateData,
  printDate,
}: {
  student: StudentFeeSearchRow;
  feeCertificateData: BonafideCertificateIssueRow | null;
  printDate: Date;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const groupCode = pickText(student, ["groupCode"]);
  const courseYearName = pickText(student, ["courseYearName"]);
  const academicYear = pickText(student, ["academicYear"]);

  return (
    <div className="bonafide-border-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MVSR_BANNER} alt="" className="h-full w-full object-contain" />
      <hr className="my-2.5 border-t-2 border-black" />

      <div className="flex">
        <div className="w-1/2 text-base">
          Cer No: <strong>{feeCertificateData?.tc_number ?? ""}</strong>
        </div>
        <div className="w-1/2 text-right text-base">
          Date: <strong>{formatCertDate(printDate, "dd-MMM-yyyy")}</strong>
        </div>
      </div>

      <div className="relative min-h-[420px] px-[18px] pt-2.5">
        <div className="text-center">
          <p className="bonafide-p1 font-bold underline">
            BONAFIDE &amp; CONDUCT CERTIFICATE
          </p>
        </div>

        <div className="mt-2.5 text-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_STUDENT}
            alt="Student"
            className="inline-block h-[150px] w-[120px] rounded border-[3px] border-black object-cover"
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[45%] opacity-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WATERMARK}
            alt=""
            className="mx-auto max-h-[480px] max-w-[480px]"
          />
        </div>

        <div className="relative z-[2] mt-[18px] px-2.5">
          <div
            className="mx-auto max-w-[90%] text-justify text-[21px] leading-[2.1] text-[#111]"
            style={{ fontFamily: SERIF }}
          >
            <p>
              This is to certify that Mr./Ms.
              <span className="font-bold"> {studentName}</span>
              S/D/O of Mr./Ms.
              <span className="font-bold"> {fatherName} </span>, bearing Roll No{" "}
              <span className="font-bold"> {hallticketNo} </span>
              is a bonafied student of this college studying in{" "}
              <span className="font-bold"> {groupCode} </span>
              <span className="font-bold"> {courseYearName} </span>
              <span className="font-bold"> {academicYear} </span>.<br />
              His/Her conduct is found to be satisfactory.
            </p>
          </div>
        </div>

        <div className="relative z-[2] mt-10 flex px-8">
          <p className="bonafide-data w-1/3 text-xl">Academic Section</p>
          <p className="bonafide-data w-1/3 text-center text-xl">
            Incharge Academic
          </p>
          <p className="bonafide-data w-1/3 text-right text-xl">Principal</p>
        </div>
      </div>
    </div>
  );
}

/** MECS / common body variants (Angular prints two pages for MECS). */
function Highlight({
  children,
  uppercase,
  italic,
}: {
  children: ReactNode;
  uppercase?: boolean;
  italic?: boolean;
}) {
  return (
    <strong
      style={{
        color: "#0000ee",
        fontWeight: 700,
        fontFamily: SERIF,
        textTransform: uppercase ? "uppercase" : undefined,
        fontStyle: italic ? "italic" : undefined,
      }}
    >
      {children}
    </strong>
  );
}

function CommonBonafidePage({
  student,
  feeCertificateData,
  printDate,
  variant,
  useMecsBanner,
}: {
  student: StudentFeeSearchRow;
  feeCertificateData: BonafideCertificateIssueRow | null;
  printDate: Date;
  variant: 1 | 2;
  useMecsBanner: boolean;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const courseName = pickText(student, ["courseName", "courseCode"]);
  const courseYearName = pickText(student, ["courseYearName"]);
  const academicYear = pickText(student, ["academicYear"]);
  const collegeName = pickText(student, ["collegeName"]);
  const collegeAddress = pickText(student, ["collegeAddress"]);
  const orgLogo = pickText(student, ["orgLogo"]);
  const relation = String(
    feeCertificateData?.relationLabel ??
      (student as Record<string, unknown>).relation ??
      "S/D/O",
  );
  const course = String(feeCertificateData?.course ?? courseName ?? "");
  const year = String(feeCertificateData?.year ?? courseYearName ?? "");
  const yearLabel = String(
    feeCertificateData?.academicYear ?? academicYear ?? "—",
  );
  const dobRaw =
    feeCertificateData?.dob ??
    feeCertificateData?.dobString ??
    (student as Record<string, unknown>).dateOfBirth;
  const dobLabel = formatDob(dobRaw);

  return (
    <div
      className="bonafide-border"
      style={{
        fontFamily: SERIF,
        color: "#000",
        pageBreakAfter: variant === 1 && useMecsBanner ? "always" : undefined,
        breakAfter: variant === 1 && useMecsBanner ? "page" : undefined,
      }}
    >
      {useMecsBanner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={MECS_BANNER}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            border: "none",
            borderRadius: 0,
          }}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl(orgLogo)}
            alt=""
            style={{
              margin: "10px 20px",
              height: 110,
              width: 110,
              objectFit: "contain",
              borderRadius: "50%",
              border: "none",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, textAlign: "center", paddingRight: 20 }}>
            <p
              className="bonafide-p1"
              style={{
                fontSize: 32,
                textTransform: "capitalize",
                fontFamily: SERIF,
              }}
            >
              {collegeName}
            </p>
            <p
              className="bonafide-p1"
              style={{ fontSize: 16, fontFamily: SERIF }}
            >
              {collegeAddress}
            </p>
          </div>
        </div>
      )}

      {/* No / Date — Angular meta row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 8,
          fontSize: 14,
          fontFamily: SERIF,
        }}
      >
        <span>
          No:{" "}
          <Highlight>{String(feeCertificateData?.tc_number ?? "")}</Highlight>
        </span>
        <span>
          Date:{" "}
          <Highlight>{formatCertDate(printDate, "dd-MMM-yyyy")}</Highlight>
        </span>
      </div>

      <div
        style={{
          position: "relative",
          padding: "10px 18px 0",
          minHeight: 420,
        }}
      >
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 22,
            fontWeight: 700,
            textAlign: "center",
            textDecoration: "underline",
            fontFamily: SERIF,
            color: "#000",
          }}
        >
          BONAFIDE CERTIFICATE
        </p>

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
            marginTop: 28,
            padding: "0 10px",
          }}
        >
          <div
            style={{
              maxWidth: "92%",
              margin: "0 auto",
              fontSize: 21,
              lineHeight: 2.1,
              textAlign: "justify",
              color: "#111",
              fontFamily: SERIF,
            }}
          >
            {variant === 1 ? (
              <>
                <p style={{ margin: 0 }}>
                  This is to certify that{" "}
                  <Highlight uppercase>
                    {studentName || "Mr./Ms. NAME"}
                  </Highlight>{" "}
                  bearing Roll No. <Highlight>{hallticketNo || "—"}</Highlight>{" "}
                  {relation}{" "}
                  <Highlight uppercase>{fatherName || "FATHER NAME"}</Highlight>{" "}
                  is a bonafide student of this college studying{" "}
                  <Highlight italic>{course || "—"}</Highlight>{" "}
                  <span>{year}</span> for the academic year{" "}
                  <Highlight>{yearLabel}</Highlight>.
                  {useMecsBanner ? (
                    <>
                      {" "}
                      His/Her originals (SSC, Intermediate Marks Memo)
                      certificates are with Matrusri Engineering College,
                      Saidabad, Hyderabad.{" "}
                    </>
                  ) : (
                    " "
                  )}
                  His / Her Date of Birth is <Highlight>{dobLabel}</Highlight>.
                </p>
                <p style={{ margin: "18px 0 0" }}>
                  This certificate is issued for the purpose of
                  __________________________ at his / her request.
                </p>
              </>
            ) : (
              <p style={{ margin: 0 }}>
                This is to certify that{" "}
                <Highlight uppercase>{studentName || "Mr./Ms. NAME"}</Highlight>{" "}
                S/o / D/o Sri / Smt.{" "}
                <Highlight uppercase>{fatherName || "FATHER NAME"}</Highlight>{" "}
                of this College studying{" "}
                <Highlight italic>{course || "—"}</Highlight>{" "}
                <span>{year}</span> for the academic year{" "}
                <Highlight>{yearLabel}</Highlight>. His / Her Roll No. is{" "}
                <Highlight>{hallticketNo || "—"}</Highlight>. This certificate
                is issued for the purpose of __________________________ at his /
                her request.
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            padding: "0 30px",
            marginTop: 48,
          }}
        >
          <p
            style={{
              margin: 0,
              width: "33.33%",
              fontSize: 20,
              fontWeight: 600,
              fontFamily: SERIF,
            }}
          >
            Prepared By
          </p>
          <p style={{ margin: 0, width: "33.33%" }} />
          <p
            style={{
              margin: 0,
              width: "33.33%",
              fontSize: 20,
              fontWeight: 700,
              textAlign: "right",
              textTransform: "uppercase",
              fontFamily: SERIF,
            }}
          >
            PRINCIPAL
          </p>
        </div>
      </div>
    </div>
  );
}

export function BonafideCertificatePrint({
  orgCode,
  student,
  feeCertificateData,
  printDate,
}: BonafideCertificatePrintProps) {
  const code = orgCode.trim().toUpperCase();
  const orgLogo = pickText(student, ["orgLogo"]);
  const isAms = code === "AMS";
  const isMvsr = code === "MVSR";
  const isMecs = code === "MECS";

  if (isAms) {
    return (
      <div className="bonafide-print-root hidden print:block">
        <AmsTemplate
          student={student}
          feeCertificateData={feeCertificateData}
          printDate={printDate}
          orgLogo={orgLogo}
        />
      </div>
    );
  }

  if (isMvsr) {
    return (
      <div className="bonafide-print-root hidden print:block">
        <MvsrTemplate
          student={student}
          feeCertificateData={feeCertificateData}
          printDate={printDate}
        />
      </div>
    );
  }

  // Common for all other orgs; MECS keeps banner + two Angular pages
  return (
    <div className="bonafide-print-root hidden print:block">
      <CommonBonafidePage
        student={student}
        feeCertificateData={feeCertificateData}
        printDate={printDate}
        variant={1}
        useMecsBanner={isMecs}
      />
      {isMecs ? (
        <div className="mt-2.5">
          <CommonBonafidePage
            student={student}
            feeCertificateData={feeCertificateData}
            printDate={printDate}
            variant={2}
            useMecsBanner
          />
        </div>
      ) : null}
    </div>
  );
}
