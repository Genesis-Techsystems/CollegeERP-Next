"use client";

import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";
const DEFAULT_STUDENT = "/assets/images/avatars/default_Student.png";
const MVSR_BANNER = "/assets/images/avatars/MVSR_BANNER.png";
const MECS_BANNER = "/assets/images/avatars/MECS_BANNER.png";
const WATERMARK = "/assets/images/avatars/watermark.png";

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

export interface BonafideConductCertificatePrintProps {
  orgCode: string;
  student: StudentFeeSearchRow;
  purpose?: string | null;
  printDate: Date;
  /** Optional certificate meta from fee certificate issue proc (MECS/MVSR cert no). */
  feeCertificateData?: Record<string, unknown> | null;
}

/** Angular AMS print block — BONAFIDE AND CONDUCT CERTIFICATE */
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
    <div className="certificate-border">
      <div className="flex">
        <div className="flex w-[15%] items-start justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl(orgLogo)}
            alt=""
            className="h-[110px] w-[110px] object-contain"
          />
        </div>
        <div className="w-[85%] text-center">
          <p className="certificate-p1">
            ANDRA MAHILA SABHA ARTS &amp; SCIENCE
          </p>
          <p className="certificate-p1">COLLEGE FOR WOMEN</p>
          <p className="certificate-p1 text-[17px] font-normal">
            (Affiliated to Osmania University)
          </p>
          <p className="certificate-p1">
            (AUTONOMOUS) NAAC R2-Accredited O.U.Campus,
          </p>
          <p className="certificate-p1">Hyderabad -500 007</p>
        </div>
      </div>

      <div className="mt-10 flex">
        <div className="w-[15%]">
          <p className="certificate-p1">S.No.</p>
        </div>
        <div className="w-[85%] text-center">
          <p className="certificate-p1 underline">
            BONAFIDE AND CONDUCT CERTIFICATE
          </p>
        </div>
      </div>

      <div className="mt-[60px] flex">
        <div className="w-[70%]">
          <p className="certificate-p3 font-cursive">
            Hall Ticket NO. :{" "}
            <span className="certificate-data">{hallticketNo}</span>
          </p>
        </div>
        <div className="w-[30%]">
          <p className="certificate-p3 font-cursive">
            Date :{" "}
            <span className="certificate-data">
              {format(printDate, "dd-MM-yyyy")}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-[50px]">
        <p className="certificate-p3 leading-[3]">
          This is to Certify that Miss{" "}
          <span className="certificate-span">
            &nbsp;&nbsp;&nbsp;{studentName}&nbsp;&nbsp;&nbsp;
          </span>{" "}
          Daughter
          <span className="certificate-span">
            &nbsp;&nbsp;&nbsp;{fatherName}&nbsp;&nbsp;&nbsp;
          </span>{" "}
          was a Bonafide student of this college during the Academics years{" "}
          <span className="certificate-span">
            &nbsp;&nbsp;&nbsp;{academicYear}&nbsp;&nbsp;&nbsp;
          </span>{" "}
          and Studied{" "}
          <span className="certificate-span">
            &nbsp;&nbsp;&nbsp;{courseCode}&nbsp;&nbsp;&nbsp;
          </span>{" "}
          course During het stay of this college, her conduct and character we
          are found to be to be{" "}
          <span className="certificate-span">
            &nbsp;&nbsp;&nbsp;SATISFIED&nbsp;&nbsp;&nbsp;
          </span>
        </p>
      </div>

      <div className="mt-[10%] flex justify-end pr-[10%]">
        <p className="certificate-data text-xl">PRINCIPAL</p>
      </div>
    </div>
  );
}

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
  const certNo = pickText(feeCertificateData, ["tc_number"]);
  const purposeText = String(purpose ?? "").trim() || "Bus Pass";

  return (
    <div className="certificate-border-2 mt-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MVSR_BANNER} alt="" className="h-full w-full object-contain" />
      <hr className="my-2.5 border-t-2 border-black" />

      <div className="flex text-base">
        <div className="w-1/2">
          Cert No: <strong>{certNo}</strong>
        </div>
        <div className="w-1/2 text-right">
          Date: <strong>{format(printDate, "dd-MMM-yyyy")}</strong>
        </div>
      </div>

      <div className="relative px-[18px] pt-2.5">
        <div className="mt-3.5 text-center">
          <p className="certificate-p1 font-bold underline">
            BONAFIDE CERTIFICATE
          </p>
        </div>

        <div className="mt-2.5 text-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_STUDENT}
            alt="Student Photo"
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
          <div className="mx-auto max-w-[90%] text-justify text-[21px] leading-[2] text-[#111]">
            <p>
              This is to certify that{" "}
              <span className="certificate-data">Mr/Ms. {studentName}</span>{" "}
              S/D/o. <span className="certificate-data">{fatherName}</span>{" "}
              bearing Roll No.{" "}
              <span className="certificate-data">{hallticketNo}</span> is a
              bonafide student of this college studying in{" "}
              <span className="certificate-data">{courseCode}</span>{" "}
              {courseYearName} Year, {courseYearName} Semester during{" "}
              <span className="certificate-data">{academicYear}</span>.
            </p>
            <p className="mt-2">
              Her Conduct is{" "}
              <span className="certificate-data">Satisfactory.</span>
            </p>
            <p className="mt-2">
              This certificate is issued for applying{" "}
              <span className="certificate-data">{purposeText}</span>.
            </p>
          </div>
        </div>

        <div className="relative z-[2] mt-10 flex px-[30px]">
          <p className="certificate-data w-1/2 text-xl">Academic Section</p>
          <p className="certificate-data w-1/2 text-right text-xl">Principal</p>
        </div>
      </div>
    </div>
  );
}

/** Angular MECS print block */
function MecsConductTemplate({
  student,
  printDate,
  feeCertificateData,
}: {
  student: StudentFeeSearchRow;
  printDate: Date;
  feeCertificateData?: Record<string, unknown> | null;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const groupCode = pickText(student, ["groupCode"]);
  const certNo = pickText(feeCertificateData, ["tc_number"]);
  const fromDate =
    pickText(feeCertificateData, ["fromDate", "batch_name"]) ||
    pickText(student, ["academicYear"]);
  const toDate = pickText(feeCertificateData, ["toDate"]);

  return (
    <div className="certificate-border mt-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MECS_BANNER} alt="" className="h-full w-full object-contain" />

      <div className="mt-4 flex text-base">
        <div className="w-1/2">
          Certificate No: <strong>{certNo}</strong>
        </div>
        <div className="w-1/2 text-right">
          Date: {format(printDate, "dd-MM-yyyy")}
        </div>
      </div>

      <div className="relative px-[18px] pt-2.5">
        <div className="mt-3.5 text-center">
          <p className="font-bold underline">
            BONAFIDE &amp; CONDUCT CERTIFICATE
          </p>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[45%] opacity-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WATERMARK}
            alt=""
            className="mx-auto max-h-[480px] max-w-[480px]"
          />
        </div>

        <div className="relative z-[2] mt-10 px-2.5">
          <div className="mx-auto max-w-[90%] text-justify text-[21px] leading-[2.1] text-[#111]">
            <p>
              This is to certify that Mr./Ms.
              <span className="certificate-data">
                {" "}
                {studentName} ({hallticketNo})
              </span>{" "}
              S/D/O of Mr./Ms.
              <span className="certificate-data"> {fatherName} </span>, was a
              student of this college bearing Roll No.
              <span className="certificate-data"> {hallticketNo} </span>,
              studied <span className="certificate-data"> {groupCode} </span>
              from <span className="certificate-data"> {fromDate} </span>
              to <span className="certificate-data"> {toDate} </span>. His/Her
              conduct is found to be satisfactory.
            </p>
          </div>
        </div>

        <div className="relative z-[2] mt-10 flex px-[30px]">
          <p className="certificate-data w-1/3 text-[15px]">Prepared By</p>
          <p className="certificate-data w-1/3 text-center text-[15px]">
            I/C Academic Section
          </p>
          <p className="certificate-data w-1/3 text-right text-[15px]">
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

  if (code === "AMS") {
    return (
      <div className="certificate-print-root hidden print:block">
        <AmsConductTemplate student={student} printDate={printDate} />
      </div>
    );
  }

  if (code === "MVSR") {
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

  if (code === "MECS") {
    return (
      <div className="certificate-print-root hidden print:block">
        <MecsConductTemplate
          student={student}
          printDate={printDate}
          feeCertificateData={feeCertificateData}
        />
      </div>
    );
  }

  return null;
}
