"use client";

/**
 * Secure Exam Marks Entry — printable MARKS SHEET (Angular #printsection).
 *
 * Header: college logo + "Practical / Laboratory / Project / Viva Voce / Term
 * Paper" + "<exam> - MARKS SHEET"; faculty / programme / semester / batch /
 * date / time / course table; marks table (HallTicket No | Marks | Present /
 * Absent with P / Ab / Not Marked); Total Present / Total Absent; and the
 * Internal / External examiner signature block.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type AnyRow = Record<string, any>;

const txt = (v: unknown) => (v == null ? "" : String(v));

const tConvert = (time?: string) => {
  const raw = txt(time).trim();
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return raw;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

const fmtDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return txt(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const cellTh: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px",
  fontWeight: 700,
  fontSize: "14px",
  textAlign: "center",
};
const cellTd: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px",
  fontSize: "14px",
  textAlign: "left",
};
const signatureCell: React.CSSProperties = {
  border: 0,
  padding: 0,
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  fontWeight: 600,
  textAlign: "center",
};

export function useSecureMarksPrint(params: {
  students: AnyRow[];
  internalEvaluators: AnyRow[];
  externalEvaluators: AnyRow[];
  logoUrl: string | null;
  orgCode?: string;
  universityCode?: string;
}): {
  printMode: "marks" | null;
  printButton: ReactNode;
  printView: ReactNode;
} {
  const {
    students,
    internalEvaluators,
    externalEvaluators,
    logoUrl,
    orgCode,
    universityCode,
  } = params;
  const [printMode, setPrintMode] = useState<"marks" | null>(null);
  const normalizedUniversity = (universityCode ?? "").trim().toUpperCase();
  const normalizedOrg = (orgCode ?? "").trim().toUpperCase();
  const isSuk = normalizedUniversity === "SUK";
  const banner =
    normalizedUniversity === "SUK"
      ? { src: "/assets/images/avatars/SUK_BANNER_NEW.jpg", height: "auto" }
      : normalizedUniversity === "MECS"
        ? { src: "/assets/images/avatars/MECS_BANNER.png", height: "auto" }
        : normalizedUniversity === "MVSR"
          ? { src: "/assets/images/avatars/MVSR_BANNER.png", height: "90px" }
          : null;

  const printButton = (
    <Button
      className="h-8 bg-blue-600 text-[12px] text-white hover:bg-blue-700"
      disabled={students.length === 0}
      onClick={() => setPrintMode("marks")}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Print
    </Button>
  );

  let printView: ReactNode = null;
  if (printMode === "marks") {
    const head = students[0] ?? {};
    const totalPresents = students.filter((s) => s.isPresent === true).length;
    const totalAbsents = students.filter((s) => s.isPresent !== true).length;
    const semester = txt(head.courseYearCode ?? head.course_year_code);
    const internalName = txt(internalEvaluators[0]?.evaluator_name);
    const externalName = txt(externalEvaluators[0]?.evaluator_name);

    printView = (
      <div
        data-print-root
        className="text-black"
        style={{
          fontFamily: "Arial, sans-serif",
          padding: "0 10px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {banner ? (
          <>
            <div style={{ width: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.src}
                alt={normalizedUniversity}
                style={{
                  display: "block",
                  width: "100%",
                  height: banner.height,
                  objectFit: "fill",
                }}
              />
            </div>
            {normalizedOrg === "SUK" && (
              <p
                style={{
                  margin: "0 0 -8px",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                KALABURAGI-585103, KARNATAKA, INDIA
              </p>
            )}
          </>
        ) : (
          <div style={{ textAlign: "left" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/assets/images/avatars/default_logo.png"}
              data-print-fallback-src="/assets/images/avatars/default_logo.png"
              alt=""
              style={{
                display: "block",
                width: "150px",
                maxHeight: "120px",
                objectFit: "contain",
              }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.endsWith("default_logo.png"))
                  img.src = "/assets/images/avatars/default_logo.png";
              }}
            />
          </div>
        )}

        <hr
          style={{
            border: 0,
            borderTop: "1px solid #000",
            margin: "12px 0 26px",
          }}
        />

        <p
          style={{
            textAlign: "center",
            margin: 0,
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          Practical / Laboratory / Project / Viva Voce / Term Paper
        </p>
        <p
          style={{
            textAlign: "center",
            margin: "2px 0 12px",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          {txt(head.examName)} - MARKS SHEET
        </p>

        {/* Faculty / programme / batch */}
        <table
          style={{
            width: "calc(100% - 40px)",
            borderCollapse: "collapse",
            margin: "0 20px 20px",
          }}
        >
          <tbody>
            <tr>
              <th style={{ ...cellTh, width: "120px" }}>Faculty :</th>
              <td style={cellTd} colSpan={2}>
                {txt(head.collegeName)}
              </td>
            </tr>
            <tr>
              <th style={cellTh}>Programme :</th>
              <td style={cellTd}>{txt(head.groupName)}</td>
              <td style={cellTd}>Semester : {semester}</td>
            </tr>
            <tr>
              <th style={cellTh}>Batch :</th>
              <td style={cellTd} colSpan={2}>
                {txt(head.batchName)},&nbsp; Date : {fmtDate(head.examDate)},
                &nbsp; Time : {tConvert(head.sessionStartTime)} TO{" "}
                {tConvert(head.sessionEndTime)}, &nbsp; Course Title with code :{" "}
                {txt(head.subjectName)}({txt(head.subjectCode)})
              </td>
            </tr>
          </tbody>
        </table>

        {/* Marks table */}
        <table
          style={{
            width: "80%",
            borderCollapse: "collapse",
            margin: "0 auto 0",
          }}
        >
          <thead>
            <tr>
              <th style={cellTh}>{isSuk ? "USN" : "HallTicket No"}</th>
              <th style={cellTh}>Marks</th>
              <th style={cellTh}>Present / Absent</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={`${txt(s.hallticketNumber)}-${i}`}>
                <td style={cellTd}>{txt(s.hallticketNumber)}</td>
                <td style={cellTd}>{txt(s.marks)}</td>
                <td style={cellTd}>
                  {s.isPresent === true
                    ? "P"
                    : s.isPresent === false
                      ? "Ab"
                      : "Not Marked"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "80%",
            margin: "5px auto",
            fontSize: "14px",
          }}
        >
          <span>Total Present : {totalPresents}</span>
          <span>Total Absent : {totalAbsents}</span>
        </div>

        {/* Signatures */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "60px",
          }}
        >
          <tbody>
            <tr>
              <td style={signatureCell}>Internal Examiner</td>
              <td style={signatureCell}>External Examiner</td>
            </tr>
            <tr>
              <td style={signatureCell}>Name with Signature</td>
              <td style={signatureCell}>Name with Signature</td>
            </tr>
            <tr>
              <td style={signatureCell}>{internalName}</td>
              <td style={signatureCell}>{externalName}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  useEffect(() => {
    if (printMode !== "marks") return;

    const printRoot = document.querySelector<HTMLElement>("[data-print-root]");
    if (!printRoot) {
      setPrintMode(null);
      return;
    }

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);

    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) {
      frame.remove();
      setPrintMode(null);
      return;
    }

    printDocument.open();
    printDocument.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.origin}/" />
          <title>Secure Exam Marks Entry</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #000; }
            [data-print-root] { width: 100% !important; max-width: 900px; margin: 0 auto !important; }
            table { page-break-inside: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            @page { size: portrait; margin: 10mm; }
          </style>
        </head>
        <body>${printRoot.outerHTML}</body>
      </html>`);
    printDocument.close();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      frame.remove();
      setPrintMode(null);
    };
    printWindow.addEventListener("afterprint", cleanup, { once: true });

    const images = Array.from(printDocument.images);
    const imagesReady = images.length
      ? Promise.all(
          images.map(
            (image) =>
              new Promise<void>((resolve) => {
                const fallback = image.dataset.printFallbackSrc;
                const loadFallback = () => {
                  if (!fallback || image.src.endsWith(fallback)) {
                    resolve();
                    return;
                  }
                  image.addEventListener("load", () => resolve(), {
                    once: true,
                  });
                  image.addEventListener("error", () => resolve(), {
                    once: true,
                  });
                  image.src = fallback;
                };
                if (image.complete) {
                  if (image.naturalWidth === 0) loadFallback();
                  else resolve();
                  return;
                }
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", loadFallback, { once: true });
              }),
          ),
        )
      : Promise.resolve();

    void imagesReady.then(() => {
      if (cleanedUp) return;
      printWindow.focus();
      printWindow.print();
      window.setTimeout(cleanup, 1500);
    });

    return () => {
      if (!cleanedUp) frame.remove();
    };
  }, [printMode]);

  return { printMode, printButton, printView };
}
