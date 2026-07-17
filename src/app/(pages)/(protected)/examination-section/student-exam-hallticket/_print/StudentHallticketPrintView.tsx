"use client";

/**
 * Angular parity: student-exam-section/exam-hallticket/print-hallticket
 * Structure + styles mirrored from print-hallticket.component.html/.scss
 */

import type { ReactNode } from "react";
import defaultStudent from "@/assets/images/avatars/default_Student.png";
import { MINIO_URL } from "@/config/constants/api";
import "./print-hallticket.css";

const DEFAULT_LOGO = "/assets/images/avatars/default_logo.png";

type AnyRow = Record<string, unknown>;

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Angular: CONSTANTS.MINIO + relative path */
function resolveMinioBase(): string {
  const fromEnv = String(MINIO_URL ?? "").trim();
  if (fromEnv) return fromEnv.replace(/\/?$/, "/");

  if (typeof globalThis !== "undefined") {
    const fromLs = String(
      globalThis.localStorage?.getItem("MINIO") ?? "",
    ).trim();
    if (fromLs) return fromLs.replace(/\/?$/, "/");
  }

  return "";
}

function minioSrc(path: unknown): string {
  const p = txt(path).trim();
  if (!p) return "";
  if (/^(https?:\/\/|data:)/i.test(p)) return p;
  const base = resolveMinioBase();
  if (!base) return "";
  return `${base}${p.replace(/^\/+/, "")}`;
}

export type StudentHallticketPrintViewProps = {
  data: AnyRow;
  /** Angular printbtn — Back / Print rendered by parent into the same layout */
  actions?: ReactNode;
};

export function StudentHallticketPrintView({
  data,
  actions,
}: StudentHallticketPrintViewProps) {
  // Angular template uses orgLogo; collegeLogo is a valid fallback from the same API.
  const orgLogo =
    data.orgLogo ?? data.org_logo ?? data.collegeLogo ?? data.college_logo;
  const studentPhotoPath = data.studentPhotoPath ?? data.student_photo_path;
  const hasOrgLogo = orgLogo != null && txt(orgLogo).trim() !== "";
  const hasPhoto =
    studentPhotoPath != null && txt(studentPhotoPath).trim() !== "";

  const logoSrc = hasOrgLogo ? minioSrc(orgLogo) || DEFAULT_LOGO : DEFAULT_LOGO;
  const photoSrc = hasPhoto
    ? minioSrc(studentPhotoPath) || defaultStudent.src
    : defaultStudent.src;

  const subjects = Array.isArray(data.subjectDTOList)
    ? (data.subjectDTOList as AnyRow[])
    : Array.isArray(data.subjects)
      ? (data.subjects as AnyRow[])
      : [];

  return (
    <div className="student-print-hallticket" data-print-root>
      <div className="layout">
        <div id="printsection" className="page-layout simple">
          {/* Header — Angular firstborder row */}
          <div className="fx-row">
            <div className="fx-row fx-100 firstborder">
              <div className="fx-col fx-15">
                <img
                  src={logoSrc}
                  alt=""
                  style={{ height: 100, width: 100 }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    const fallbackLogo = data.collegeLogo ?? data.college_logo;
                    const alt =
                      fallbackLogo && txt(fallbackLogo) !== txt(orgLogo)
                        ? minioSrc(fallbackLogo)
                        : "";
                    if (alt && el.src !== alt) {
                      el.src = alt;
                      return;
                    }
                    el.src = DEFAULT_LOGO;
                  }}
                />
              </div>
              <div className="fx-col fx-85 ht-header-text">
                <p
                  className="ht-college-name"
                  style={{
                    fontSize: 25,
                    marginTop: 20,
                    marginBottom: 4,
                    fontFamily: "Arial, sans-serif",
                    color: "rgb(36, 99, 154)",
                    lineHeight: 1.2,
                  }}
                >
                  {txt(data.collegeName)}
                </p>
                <p
                  className="ht-college-address"
                  style={{
                    fontSize: 15,
                    marginTop: 0,
                    marginBottom: 8,
                    fontFamily: "Arial, sans-serif",
                    color: "rgb(36, 99, 154)",
                    lineHeight: 1.3,
                  }}
                >
                  {txt(data.collegeAddress)}
                </p>
                <p
                  style={{
                    fontSize: 30,
                    marginTop: 4,
                    marginBottom: 4,
                    fontFamily: "Arial, sans-serif",
                    lineHeight: 1.2,
                  }}
                >
                  HALL TICKET
                </p>
                <p
                  style={{
                    fontSize: 15,
                    marginTop: 0,
                    marginBottom: 7,
                    fontFamily: "Arial, sans-serif",
                    display: "flex",
                    justifyContent: "center",
                    lineHeight: 1.3,
                  }}
                >
                  {txt(data.examName)}
                </p>
              </div>
            </div>
          </div>

          {/* Student info — Angular firstborder + info tables */}
          <div className="fx-row">
            <div className="fx-row fx-100 firstborder">
              <div className="fx-col fx-80 ht-student-fields">
                <table className="ht-info-table">
                  <tbody>
                    <tr>
                      <th>Hallticket No :</th>
                      <td>{txt(data.hallticketNo)}</td>
                    </tr>
                    <tr>
                      <th>Name :</th>
                      <td>{txt(data.studentName)}</td>
                    </tr>
                    <tr>
                      <th>Course :</th>
                      <td>{txt(data.courseYearName)}</td>
                    </tr>
                    <tr>
                      <th>Center :</th>
                      <td style={{ textTransform: "uppercase" }}>
                        {txt(data.collegeName)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="fx-col fx-20 ht-student-photo">
                <img
                  src={photoSrc}
                  alt=""
                  style={{ height: 100, width: 100 }}
                  onError={(e) => {
                    e.currentTarget.src = defaultStudent.src;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Subject table — Angular #table2 */}
          <div className="fx-row">
            <div className="fx-row fx-100">
              <table id="table2">
                <tbody>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Exam Date </th>
                    <th>Exam Time</th>
                    <th>Invigilator Signature</th>
                  </tr>
                  {subjects.map((d, idx) => (
                    <tr key={idx}>
                      <td>{txt(d.subjectCode)}</td>
                      <td>{txt(d.subjectName)}</td>
                      <td>{txt(d.examDate)}</td>
                      <td>
                        {txt(d.sessionStartTime)} - {txt(d.sessionEndTime)}
                      </td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="fx-row">
            <div className="fx-row fx-100 fx-center">
              <table className="ht-info-table" style={{ marginTop: "60px" }}>
                <tbody>
                  <tr>
                    <th
                      style={{
                        textAlign: "center",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Signature Of Student
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Controller Of Examination
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Principal
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions heading */}
          <div className="fx-row">
            <div className="fx-row fx-100 fx-center">
              <span style={{ textAlign: "left", color: "red", marginTop: 40 }}>
                {" "}
                <b>***** Instructions to Students *****</b>
              </span>
            </div>
          </div>

          {/* Instructions list — Angular lastborder */}
          <div className="fx-row">
            <div className="fx-col fx-100 lastborder">
              <div style={{ textAlign: "left" }}>
                <ol>
                  <li>
                    You are provisionally permitted to appear in the above
                    subjects.
                  </li>
                  <li>
                    Please check your exam room and seat carefully, which is
                    near the main&nbsp;porch&nbsp;gate
                  </li>
                  <li>
                    Please check your exam room and seat carefully, which is
                    near the main porch gate
                  </li>
                  <li>
                    Please check time, subject code(s) its title from time table
                    very carefully
                  </li>
                  <li>
                    Any electronics gudget except calculator is not allowed. It
                    will be considered as UFM case
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {actions ? <div className="printbtn">{actions}</div> : null}
      </div>
    </div>
  );
}
