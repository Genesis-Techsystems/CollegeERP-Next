"use client";

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

  const bodyText = (
    <>
      This is to certify that
      <span className="certificate-span">
        {" "}
        {studentName} ({hallticketNo}){" "}
      </span>
      [S/O]/[D/O].Sri <span className="certificate-span"> {fatherName} </span>
      {verb} a student of this college Studying
      <span className="certificate-span"> {courseName} </span>
      during the academic year
      <span className="certificate-span"> {academicYear} </span>
      in English Medium of instructions only. This certificate is issued on the
      request of the individuals.
    </>
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
          <p className="certificate-p1 underline">
            TO WHOM SO EVER IT MAY CONCERN
          </p>
          <p className="certificate-p3 px-2.5">{bodyText}</p>
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
        <div className="flex justify-between px-2">
          <p>Cert No :</p>
          <p className="certificate-p-date">Date : {dateStr}</p>
        </div>
        <p className="certificate-p1 my-4 text-center underline">
          TO WHOM SO EVER IT MAY CONCERN
        </p>
        <p className="certificate-p3 px-2.5 text-justify">
          This is to certify that Mr. {studentName} S/o. Mr. {fatherName}{" "}
          bearing Roll No. {hallticketNo} was a <b>bonafide</b> student of this
          institution and completed his course in {courseName} in {academicYear}
          . The course was offered and examinations were conducted in{" "}
          <b>English as Medium of Instruction</b> as per O.U. regulations. This
          certificate is issued on the request of the above student for Higher
          Studies.
        </p>
        <div className="mt-16 flex justify-between px-8 text-xl">
          <p>Academic</p>
          <p>Principal</p>
        </div>
      </div>
    );
  }

  return null;
}
