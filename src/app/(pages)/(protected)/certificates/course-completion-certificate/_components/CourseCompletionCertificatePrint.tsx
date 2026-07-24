"use client";

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

export interface CourseCompletionPrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  awaitingResults: boolean;
  passoutMonth: string;
  passoutYear: string;
  printDate: Date;
}

export function CourseCompletionCertificatePrint({
  orgCode,
  student,
  awaitingResults,
  passoutMonth,
  passoutYear,
  printDate,
}: CourseCompletionPrintProps) {
  const code = orgCode.trim().toUpperCase();
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

  const awaitingText = (
    <>
      This is to certify that
      <span className="certificate-span">
        {" "}
        {studentName} ({hallticketNo}){" "}
      </span>
      [S/O]/[D/O].Sri <span className="certificate-span"> {fatherName} </span>
      is a student of this college Studying
      <span className="certificate-span"> {courseName} </span>
      during the academic year
      <span className="certificate-span"> {academicYear} </span>
      and course will be completed in the month of {passoutMonth},{passoutYear}.
      The final semester results are likely to be declared in {passoutMonth},
      {passoutYear} after which He/She will be awarded for {courseCode}.
    </>
  );

  const declaredText = (
    <>
      This is to certify that
      <span className="certificate-span">
        {" "}
        {studentName} ({hallticketNo}){" "}
      </span>
      [S/O]/[D/O].Sri <span className="certificate-span"> {fatherName} </span>
      is a student of this college Studying
      <span className="certificate-span"> {courseName} </span>
      during the academic year
      <span className="certificate-span"> {academicYear}. </span>
      He has completed all the requirements of course.
    </>
  );

  const bodyText = awaitingResults ? awaitingText : declaredText;

  if (code === "AMS") {
    return (
      <div className="certificate-print-root hidden print:block">
        <div className="certificate-border-2">
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
          <p className="certificate-p-date mt-2">Date : {dateStr}</p>
          <p className="certificate-p1 underline">
            COURSE COMPLETION CERTIFICATE
          </p>
          <p className="certificate-p3 px-2.5">{bodyText}</p>
          <p className="certificate-p3 px-2.5">
            His/Her character and conduct are good.
          </p>
          <p className="certificate-p3 px-2.5">
            This certificate is issued on his request to apply for Higher
            Studies.
          </p>
          <p className="certificate-data mt-9 text-right text-[22px]">
            PRINCIPAL
          </p>
        </div>
      </div>
    );
  }

  if (code === "MECS") {
    return (
      <div className="certificate-print-root hidden print:block">
        <div className="flex">
          <img
            src={logoUrl(orgLogo || MECS_BANNER)}
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
        <div className="certificate-border mt-2.5">
          <div className="flex justify-between">
            <p>Ref:</p>
            <p className="certificate-p-date">Date : {dateStr}</p>
          </div>
          <p className="certificate-p1 underline">
            BONAFIED CUM COURSE COMPLETION CERTIFICATE
          </p>
          <p className="certificate-p3 px-2.5">{bodyText}</p>
          <p className="certificate-p3 px-2.5">
            His/Her character and conduct are good.
          </p>
          <p className="certificate-p3 px-2.5">
            This certificate is issued on his request to apply for Higher
            Studies.
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
        <hr className="my-1.5 border border-black" />
        <div className="flex justify-between px-2">
          <p>Cert No:</p>
          <p className="certificate-p-date">Date : {mvsrDate}</p>
        </div>
        <p className="certificate-p1 my-4 text-center font-bold underline">
          TO WHOMSOEVER IT MAY CONCERN
        </p>
        <p className="certificate-p3 px-2.5 text-justify">
          This is to certify that{" "}
          <b>
            Mr. {studentName} S/o Mr. {fatherName}
          </b>{" "}
          bearing Roll No. <b>{hallticketNo}</b> is a bonafide student of this
          college from the academic year {academicYear}. He has completed{" "}
          {courseYearName} Semesters of his course work and is awaiting for{" "}
          {courseYearName} semester results. His course may be completed in the
          academic year {academicYear}. This certificate is issued on the
          specific request of the student for the purpose of{" "}
          <b>Higher Studies</b>.
        </p>
        <div className="mt-12 flex justify-between px-8 text-lg">
          <p>Academic Section</p>
          <p>PRINCIPAL</p>
        </div>
      </div>
    );
  }

  return null;
}
