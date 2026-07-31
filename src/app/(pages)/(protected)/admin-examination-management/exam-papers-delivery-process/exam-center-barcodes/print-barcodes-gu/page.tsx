"use client";

/**
 * Angular `print-exam-center-barcodes-gu` — Print Stickers New for Exam Center Barcodes.
 * Student rows are passed via sessionStorage (base64 barcodes are too large for query params).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  SubjectStickers,
  txt,
  type StickerConfig,
  type StickerRow,
} from "../../_print/SubjectStickers";
import { EXAM_CENTER_BARCODES_PRINT_KEY } from "../print-storage";

function PrintExamCenterBarcodesGuInner() {
  const [rows, setRows] = useState<StickerRow[] | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EXAM_CENTER_BARCODES_PRINT_KEY);
      if (!raw) {
        setRows([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setRows(Array.isArray(parsed) ? (parsed as StickerRow[]) : []);
    } catch {
      setRows([]);
    }
  }, []);

  const config = useMemo<StickerConfig>(
    () => ({
      // Angular groupByRoomId uses item.subjectId
      groupBy: (row) =>
        String(
          row.subjectId ??
            row.fk_subject_id ??
            row.subject_id ??
            row.subjectCode ??
            row.subject_code ??
            "__nogroup__",
        ),
      header: (first) => [
        txt(first.exam_group_code ?? first.examGroupCode),
        txt(first.examcenterCode ?? first.examCenterCode ?? first.ec_code),
        txt(first.exam_date ?? first.examDate),
        [
          txt(first.subjectName ?? first.subject_name),
          txt(first.subjectCode ?? first.subject_code),
        ]
          .filter(Boolean)
          .join("-"),
      ],
      // Angular: <b>{{seat_no}}</b>({{hallticketNumber}})
      cellTop: (row) => {
        const seat = txt(row.seat_no ?? row.ec_seat_no ?? row.ec_seatno);
        const ht = txt(
          row.hallticketNumber ??
            row.hallticket_number ??
            row.hall_ticket_number,
        );
        return (
          <>
            <b>{seat}</b>
            {ht ? `(${ht})` : null}
          </>
        );
      },
      // Angular GU: {{exam_date}}{{subjectCode}}
      cellBottom: (row) =>
        `${txt(row.exam_date ?? row.examDate)}${txt(row.subjectCode ?? row.subject_code)}`,
      barcodeField: "omr_barcode",
      marginX: 4,
      backHref:
        "/admin-examination-management/exam-papers-delivery-process/exam-center-barcodes",
      backParamKeys: [
        "academicYearId",
        "examGroupId",
        "univExamcenterId",
        "courseGroupId",
        "courseYearId",
        "subjectId",
      ],
    }),
    [],
  );

  if (rows === undefined) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading stickers…</div>
    );
  }

  return <SubjectStickers config={config} rows={rows} />;
}

export default function PrintExamCenterBarcodesGuPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading stickers…
        </div>
      }
    >
      <PrintExamCenterBarcodesGuInner />
    </Suspense>
  );
}
