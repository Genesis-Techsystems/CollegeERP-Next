"use client";

/**
 * Shared sticker layout for exam-papers-delivery print pages.
 * Mirrors the Angular `print-exam-center-barcodes`, `scan-bundles-print-stickers`,
 * `print-exam-seatno-stickers` (+ GU variants) layout:
 *
 *   ┌─ Header (group code | exam center | exam date | subject) ─┐
 *   │ [seat_no](hallticket)   [seat_no](hallticket)   …          │
 *   │  base64 barcode img       base64 barcode img               │
 *   │  exam_date(session)code   exam_date(session)code           │
 *   └────────────────────────────────────────────────────────────┘
 *
 * `marginX` matches the Angular style (`margin:0px 4px` regular vs `0px 35px` GU).
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export type StickerRow = Record<string, unknown>;

export interface StickerConfig {
  /** Field used to group rows (e.g. 'subjectId', 'fk_univ_exam_scan_bundle_id'). */
  groupBy: string | ((row: StickerRow) => string | number);
  /** Header lines for each group (4 rows max). */
  header: (
    first: StickerRow,
    queryGroupCode: string,
  ) => Array<string | null | undefined>;
  /** Top line in each sticker cell — usually `{seat}({hallticket})`. */
  cellTop: (row: StickerRow) => ReactNode;
  /** Bottom line in each sticker cell — usually `{date}{subject_code}` or with session_time. */
  cellBottom: (row: StickerRow) => ReactNode;
  /** Which row field holds the base64 barcode. */
  barcodeField?: string;
  /** Sticker row horizontal margin in pixels (4 = default, 35 = GU). */
  marginX?: number;
  /** Where the Back button should navigate. */
  backHref: string;
  /** When set, append the listed search-param keys (taken from the current URL) to backHref. */
  backParamKeys?: string[];
}

function pickGroupKey(cfg: StickerConfig, row: StickerRow): string {
  const v =
    typeof cfg.groupBy === "function"
      ? cfg.groupBy(row)
      : (row[cfg.groupBy] as string | number | undefined);
  return v == null ? "__nogroup__" : String(v);
}

export function SubjectStickers({
  config,
  rows: rowsProp,
}: {
  readonly config: StickerConfig;
  /** When set, prefer these rows over the `data` query param (avoids huge URLs with base64 barcodes). */
  readonly rows?: StickerRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [groups, setGroups] = useState<[string, StickerRow[]][]>([]);
  const queryGroupCode = params?.get("examGroupCode") ?? "";

  useEffect(() => {
    let parsed: StickerRow[] = [];
    if (Array.isArray(rowsProp)) {
      parsed = rowsProp;
    } else {
      const raw = params?.get("data");
      if (raw) {
        try {
          const v = JSON.parse(raw);
          if (Array.isArray(v)) parsed = v as StickerRow[];
        } catch {
          parsed = [];
        }
      }
    }
    const map = new Map<string, StickerRow[]>();
    for (const r of parsed) {
      const key = pickGroupKey(config, r);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    setGroups(Array.from(map.entries()));
  }, [params, config, rowsProp]);

  const marginX = config.marginX ?? 4;
  const barcodeField = config.barcodeField ?? "omr_barcode";

  function onBack() {
    let href = config.backHref;
    const keys = config.backParamKeys ?? [];
    if (keys.length && params) {
      const sp = new URLSearchParams();
      for (const k of keys) {
        const v = params.get(k);
        if (v != null && v !== "") sp.set(k, v);
      }
      const qs = sp.toString();
      if (qs) href = `${href}?${qs}`;
    }
    router.push(href);
  }

  return (
    <div
      data-print-root
      data-no-page-name
      className="subject-stickers-print print-page bg-white text-black"
      style={{
        fontFamily: "arial, sans-serif",
        width: "100%",
        margin: 0,
        padding: "0 8px",
        backgroundColor: "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* Same 4-col float grid on screen and print (Angular .layout / .sticker-td). */}
      <style>{`
        .subject-stickers-print .sticker-grid {
          overflow: auto;
          width: 100%;
        }
        .subject-stickers-print .sticker-td {
          float: left;
          width: 25%;
          box-sizing: border-box;
          margin: 0 auto;
          border: none !important;
          vertical-align: middle;
          padding: 27px 0 9px !important;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .subject-stickers-print .sticker-td img {
          display: block;
          margin: 0 auto;
          height: 30px;
          width: 180px !important;
          vertical-align: middle;
        }
        .subject-stickers-print .sticker-td .sticker-top {
          display: flex;
          justify-content: center;
          margin-bottom: -3px;
          font-size: 12px !important;
        }
        .subject-stickers-print .sticker-td .sticker-bottom {
          display: flex;
          justify-content: center;
          font-size: 6.5px;
          margin-top: 1px;
        }
        .subject-stickers-print .header-cell {
          width: 100%;
          border: 1px solid #000;
          padding: 25px 0 9px;
          text-align: center;
          vertical-align: middle;
          font-size: 10px !important;
          font-weight: bold;
          box-sizing: border-box;
        }
        .subject-stickers-print .header-cell .span-1 {
          font-size: 10px !important;
          font-weight: bold !important;
        }
        @media print {
          .subject-stickers-print .sticker-toolbar { display: none !important; }
          .subject-stickers-print {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .subject-stickers-print .sticker-td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div
        className="sticker-toolbar print-hide flex justify-end gap-2 p-3"
        data-print-hide
      >
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-[11px] text-center py-6">No data to print.</p>
      ) : (
        groups.map(([gKey, rows], gi) => {
          const head = rows[0] ?? {};
          const headLines = config
            .header(head, queryGroupCode)
            .filter((s) => s != null && s !== "");
          return (
            <div
              key={gKey}
              className={gi !== 0 ? "page-break" : undefined}
              style={{ marginBottom: 18 }}
            >
              <div className="header-cell">
                {headLines.map((line, i) => (
                  <span
                    key={i}
                    className={i === 0 ? "span-1" : undefined}
                    style={{ display: "block" }}
                  >
                    {line}
                  </span>
                ))}
              </div>
              <div
                className="sticker-grid"
                style={{ margin: `0 ${marginX}px` }}
              >
                {rows.map((row, ri) => {
                  const barcode = row[barcodeField] as string | undefined;
                  return (
                    <div key={ri} className="sticker-td">
                      <div className="sticker-top">
                        <span>{config.cellTop(row)}</span>
                      </div>
                      {barcode ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`data:image/jpg;base64,${barcode}`} alt="" />
                      ) : null}
                      <div className="sticker-bottom">
                        {config.cellBottom(row)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
