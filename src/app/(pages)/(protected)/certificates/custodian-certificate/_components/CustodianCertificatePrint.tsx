"use client";

import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";
const MVSR_BANNER = "/assets/images/avatars/MVSR_BANNER.png";
const DEFAULT_STUDENT = "/assets/images/avatars/default_Student.png";

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

function formatDob(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM yyyy");
}

export interface CustodianCertificatePrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  awaitingResults: boolean;
  purposeLabel: string;
  ssc: boolean;
  inter: boolean;
  diploma: boolean;
  degreeType: "1" | "2" | null;
  provisional: boolean;
  consolidatedMarksMemo: boolean;
  printDate: Date;
}

export function CustodianCertificatePrint({
  orgCode,
  student,
  awaitingResults,
  purposeLabel,
  ssc,
  inter,
  diploma,
  degreeType,
  provisional,
  consolidatedMarksMemo,
  printDate,
}: CustodianCertificatePrintProps) {
  const code = orgCode.trim().toUpperCase();
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const rollNo = pickText(student, [
    "rollNo",
    "rollNumber",
    "hallticketNumber",
  ]);
  const courseName = pickText(student, ["courseName"]);
  const academicYear = pickText(student, ["academicYear"]);
  const collegeName = pickText(student, ["collegeName"]);
  const collegeAddress = pickText(student, ["collegeAddress"]);
  const orgLogo = pickText(student, ["orgLogo"]);
  const dob = student.dateOfBirth;
  const dateStr = format(printDate, "dd/MM/yyyy");
  const verb = awaitingResults ? "is" : "was";

  const certificateItems: string[] = [];
  if (ssc) certificateItems.push("S.S.C");
  if (inter) certificateItems.push("Intermediate");
  if (diploma) certificateItems.push("Diploma");
  if (degreeType === "1") certificateItems.push("Degree");
  if (degreeType === "2") certificateItems.push("B.Tech");
  if (consolidatedMarksMemo) certificateItems.push("ConsolidatedMarksMemo");
  if (provisional) certificateItems.push("Provisional");

  const listBlock = (
    <ol className="ml-6 list-decimal">
      {certificateItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );

  if (code === "AMS" || code === "MECS") {
    return (
      <div className="certificate-print-root hidden print:block">
        {code === "MECS" ? (
          <div className="flex">
            <img
              src={logoUrl(orgLogo)}
              alt=""
              className="h-[110px] w-[110px] object-contain"
            />
            <div className="flex-1 text-center">
              <p className="certificate-p1 text-[35px] capitalize">
                {collegeName}
              </p>
              <p className="certificate-p1 text-lg">{collegeAddress}</p>
            </div>
          </div>
        ) : null}
        <div
          className={
            code === "AMS"
              ? "certificate-border-2"
              : "certificate-border mt-2.5"
          }
        >
          {code === "AMS" ? (
            <div className="flex">
              <img
                src={logoUrl(orgLogo)}
                alt=""
                className="mx-5 h-[110px] w-[110px] object-contain"
              />
              <div className="flex-1 text-center">
                <p className="certificate-p1 mt-[2%]">
                  ANDRA MAHILA SABHA ARTS &amp; SCIENCE
                </p>
                <p className="certificate-p1">COLLEGE FOR WOMEN</p>
                <p className="certificate-p1 text-xl">
                  (Affiliated to Osmania University)
                </p>
              </div>
            </div>
          ) : null}
          <p className="certificate-p-date mt-2">Date : {dateStr}</p>
          <p className="certificate-p1 underline">CUSTODIAN CERTIFICATE</p>
          <p className="certificate-p3 px-2.5">
            This is to certify that
            <span className="certificate-span">
              {" "}
              {studentName} ({hallticketNo}){" "}
            </span>
            [S/O]/[D/O].Sri{" "}
            <span className="certificate-span"> {fatherName} </span>
            {verb} a student of this college Studying{" "}
            <span className="certificate-span">{courseName}</span>
            during the academic year{" "}
            <span className="certificate-span">{academicYear}</span>
          </p>
          <p className="certificate-p3 px-2.5">
            His/Her Date of Birth as per SSC memo is {formatDob(dob)}.
            <span className="mt-2 block">
              The following original certificates of {studentName} are with the
              college
              {listBlock}
            </span>
            <span className="mt-2 block">
              This certificate is issued on his request to apply for{" "}
              {purposeLabel}.
            </span>
          </p>
          <p className="certificate-data mt-9 text-right text-[22px]">
            PRINCIPAL
          </p>
        </div>
      </div>
    );
  }

  if (code === "MVSR") {
    return (
      <div className="certificate-print-root hidden print:block">
        <img src={MVSR_BANNER} alt="" className="w-full object-contain" />
        <hr className="my-2 border border-black" />
        <div className="flex justify-between px-4">
          <p>Cert No:</p>
          <div className="text-right">
            <p>Date: {dateStr}</p>
            <img
              src={DEFAULT_STUDENT}
              alt=""
              className="ml-auto mt-2 h-[120px] w-[100px] border object-cover"
            />
          </div>
        </div>
        <h2 className="my-4 text-center text-2xl font-bold">
          Custodian Certificate
        </h2>
        <p className="certificate-p3 px-4">
          This is to certify that{" "}
          <b>
            Mr/Miss. {studentName} S/D/o. {fatherName}
          </b>{" "}
          bearing Roll No. <b>{rollNo}</b> is a bonafide student of this
          college. She is pursuing <b>{courseName}</b> during the Academic Year{" "}
          <b>{academicYear}</b>.
          <br />
          <br />
          Her SSC/Intermediate/Diploma/Provisional &amp; Marks Memo Certificates
          (in Originals) are with this institution for verification.
          <br />
          <br />
          Her date of birth is <b>{formatDob(dob)}</b> as per records.
          <br />
          <br />
          This certificate is issued for the purpose of <b>{purposeLabel}</b> at
          her request.
        </p>
        <div className="mt-12 flex justify-between px-8 text-lg">
          <p className="text-center font-bold">Academic Section</p>
          <p className="text-center font-bold">Principal</p>
        </div>
      </div>
    );
  }

  return null;
}
