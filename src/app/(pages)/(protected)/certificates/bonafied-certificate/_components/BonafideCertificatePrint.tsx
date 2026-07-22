"use client";

import { format } from "date-fns";
import { MINIO_URL } from "@/config/constants/api";
import type { BonafideCertificateIssueRow } from "@/services";
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
          <img
            src={logoUrl(orgLogo)}
            alt=""
            className="mx-5 h-[110px] w-[110px] object-contain"
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
          <img
            src={DEFAULT_STUDENT}
            alt="Student"
            className="inline-block h-[150px] w-[120px] rounded border-[3px] border-black object-cover"
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[45%] opacity-10">
          <img
            src={WATERMARK}
            alt=""
            className="mx-auto max-h-[480px] max-w-[480px]"
          />
        </div>

        <div className="relative z-[2] mt-[18px] px-2.5">
          <div className="mx-auto max-w-[90%] text-justify font-serif text-[21px] leading-[2.1] text-[#111]">
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

function MecsTemplate({
  student,
  feeCertificateData,
  printDate,
  variant,
}: {
  student: StudentFeeSearchRow;
  feeCertificateData: BonafideCertificateIssueRow | null;
  printDate: Date;
  variant: 1 | 2;
}) {
  const studentName = pickText(student, ["firstName"]);
  const fatherName = pickText(student, ["fatherName"]);
  const hallticketNo = pickText(student, ["hallticketNumber", "rollNumber"]);
  const courseName = pickText(student, ["courseName", "courseCode"]);
  const courseYearName = pickText(student, ["courseYearName"]);
  const academicYear = pickText(student, ["academicYear"]);

  return (
    <div className="bonafide-border">
      <img src={MECS_BANNER} alt="" className="h-full w-full object-contain" />

      <div className="flex">
        <div className="w-1/2 text-sm">
          No: <strong>{feeCertificateData?.tc_number ?? ""}</strong>
        </div>
        <div className="w-1/2 text-right text-sm">
          Date: <strong>{formatCertDate(printDate, "dd-MMM-yyyy")}</strong>
        </div>
      </div>

      <div className="relative min-h-[420px] px-[18px] pt-2.5">
        <div className="text-center">
          <p className="bonafide-p1 font-bold underline">
            BONAFIDE CERTIFICATE
          </p>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[45%] opacity-10">
          <img
            src={WATERMARK}
            alt=""
            className="mx-auto max-h-[480px] max-w-[480px]"
          />
        </div>

        <div className="relative z-[2] mt-[18px] px-2.5">
          <div className="mx-auto max-w-[90%] text-justify font-serif text-[21px] leading-[2.1] text-[#111]">
            {variant === 1 ? (
              <p>
                This is to certify that
                <strong className="uppercase">
                  {" "}
                  {studentName || "Mr./Ms. NAME"}{" "}
                </strong>
                bearing Roll No.
                <strong> {hallticketNo || "0000-00-000-000"} </strong>
                <span>
                  {" "}
                  {String(
                    feeCertificateData?.relationLabel ??
                      student.relation ??
                      "S/D/O",
                  )}{" "}
                </span>
                <strong className="uppercase">
                  {" "}
                  {fatherName || "FATHER NAME"}{" "}
                </strong>
                is a bonafide student of this college studying
                <strong>
                  {" "}
                  {String(
                    feeCertificateData?.course ?? courseName ?? "Course Name",
                  )}{" "}
                </strong>
                <span>
                  {" "}
                  {String(
                    feeCertificateData?.year ?? courseYearName ?? "",
                  )}{" "}
                </span>
                for the academic year
                <strong>
                  {" "}
                  {String(
                    feeCertificateData?.academicYear ?? academicYear ?? "—",
                  )}{" "}
                </strong>
                .
                <span>
                  {" "}
                  His/Her originals (SSC, Intermediate Marks Memo) certificates
                  are with Matrusri Engineering College, Saidabad, Hyderabad.
                </span>
                His / Her Date of Birth is
                <strong>
                  {" "}
                  {feeCertificateData?.dob
                    ? formatDob(feeCertificateData.dob)
                    : String(
                        feeCertificateData?.dobString ??
                          formatDob(student.dateOfBirth) ??
                          "—",
                      )}
                </strong>
                .
              </p>
            ) : (
              <p>
                This is to certify that
                <strong className="uppercase">
                  {" "}
                  {studentName || "Mr./Ms. NAME"}{" "}
                </strong>
                S/o / D/o Sri / Smt.
                <strong className="uppercase">
                  {" "}
                  {fatherName || "FATHER NAME"}{" "}
                </strong>
                of this College studying
                <strong>
                  {" "}
                  {String(
                    feeCertificateData?.course ?? courseName ?? "Course Name",
                  )}{" "}
                </strong>
                <span>
                  {" "}
                  {String(
                    feeCertificateData?.year ?? courseYearName ?? "",
                  )}{" "}
                </span>
                for the academic year
                <strong>
                  {" "}
                  {String(
                    feeCertificateData?.academicYear ?? academicYear ?? "—",
                  )}{" "}
                </strong>
                . His / Her Roll No. is
                <strong> {hallticketNo || "0000-00-000-000"} </strong>. This
                certificate is issued for the purpose of
                __________________________ at his / her request.
              </p>
            )}

            {variant === 1 ? (
              <p className="mt-4">
                This certificate is issued for the purpose of
                __________________________ at his / her request.
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative z-[2] mt-10 flex px-8">
          <p className="bonafide-data w-1/3 text-xl">Prepared By</p>
          <p className="bonafide-data w-1/3 text-center text-xl" />
          <p className="bonafide-data w-1/3 text-right text-xl">PRINCIPAL</p>
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

  if (code === "AMS") {
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

  if (code === "MVSR") {
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

  if (code === "MECS") {
    return (
      <div className="bonafide-print-root hidden print:block">
        <MecsTemplate
          student={student}
          feeCertificateData={feeCertificateData}
          printDate={printDate}
          variant={1}
        />
        <MecsTemplate
          student={student}
          feeCertificateData={feeCertificateData}
          printDate={printDate}
          variant={2}
        />
      </div>
    );
  }

  return null;
}
