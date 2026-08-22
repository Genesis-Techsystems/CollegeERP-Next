"use client";

import { useEffect, useState } from "react";
import { loadStudentProfileTabData, pickProfileCell } from "@/services";
import { formatProfileDate } from "./profile-utils";
import { PROFILE_TD, PROFILE_TH } from "./profile-table";

type AnyRow = Record<string, unknown>;

function bookDetailValue(row: AnyRow, keys: string[]): string {
  const nested = row.bookDetail ?? row.book_detail ?? row.book;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const detail = nested as AnyRow;
    for (const key of keys) {
      const value = detail[key];
      if (value != null && String(value).trim() !== "")
        return String(value).trim();
    }
  }
  const flat = pickProfileCell(row, keys);
  return flat && flat !== "—" ? flat : "—";
}

function isReturned(row: AnyRow): boolean {
  const raw = row.isreturned ?? row.isReturned ?? row.is_returned;
  return (
    raw === true ||
    raw === 1 ||
    raw === "1" ||
    String(raw).toLowerCase() === "true"
  );
}

function fineTypeCode(row: AnyRow): string {
  return String(row.fineTypeCode ?? row.fine_type_code ?? "").toUpperCase();
}

function ReturnStatus({ row }: { row: AnyRow }) {
  if (fineTypeCode(row) === "BOOKLOST") {
    return (
      <span className="rounded-[3px] bg-[red] px-1.5 py-0.5 text-[11px] font-medium text-white">
        Book Lost
      </span>
    );
  }
  if (isReturned(row)) {
    return <span className="font-medium text-[green]">Returned</span>;
  }
  return (
    <span className="rounded-[3px] bg-[#ff6636] px-1.5 py-0.5 text-[11px] font-medium text-white">
      Not Returned
    </span>
  );
}

/** Angular `student-library-books` */
export function BooksTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData("books", student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  return (
    <div className="border border-[#e8e8e8]">
      <div className="border-b-2 border-[#ffcf46] bg-[#ecf3ff] px-3 py-2">
        <p className="text-sm font-medium text-[#042956]">
          Student Book Details
        </p>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <div className="overflow-x-auto p-2">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={PROFILE_TH}>SI.No</th>
                <th className={PROFILE_TH}>Book Title</th>
                <th className={PROFILE_TH}>Accession No</th>
                <th className={PROFILE_TH}>Issue Date</th>
                <th className={PROFILE_TH}>Return Date</th>
                <th className={PROFILE_TH}>Issued On</th>
                <th className={PROFILE_TH}>Return Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={PROFILE_TD}>
                    —
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                  >
                    <td className={PROFILE_TD}>{i + 1}</td>
                    <td className={PROFILE_TD}>
                      {bookDetailValue(row, [
                        "bookTitle",
                        "book_title",
                        "title",
                        "bookName",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      {bookDetailValue(row, [
                        "accessionno",
                        "accessionNo",
                        "accession_no",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      {formatProfileDate(
                        row.issueFromdate ??
                          row.issueFromDate ??
                          row.issue_from_date ??
                          row.issueDate,
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {formatProfileDate(
                        row.issueTodate ??
                          row.issueToDate ??
                          row.issue_to_date ??
                          row.returnDate,
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {pickProfileCell(row, [
                        "bookIssuedOnCode",
                        "book_issued_on_code",
                        "issuedOn",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      <ReturnStatus row={row} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
