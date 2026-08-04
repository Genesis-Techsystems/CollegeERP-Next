"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  buildHallticketPrintHtml,
  HallticketPrintDocuments,
} from "../_print/useHallticketPrint";
import { printHtmlInIframe } from "@/lib/print";
import {
  clearExamHallticketPrintPayload,
  EXAM_HALLTICKET_RETURN_HREF,
  loadExamHallticketPrintPayload,
  type ExamHallticketPrintPayload,
} from "../_print/store";

export default function ExamHallticketPrintPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ExamHallticketPrintPayload | null>(
    null,
  );
  const autoPrinted = useRef(false);

  useEffect(() => {
    const data = loadExamHallticketPrintPayload();
    if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
      router.replace(EXAM_HALLTICKET_RETURN_HREF);
      return;
    }
    setPayload(data);
  }, [router]);

  // Angular Print All → preview route; open browser print so layout matches
  // print-exam-hallticket (affix photo, R20, HOD / Controller, instructions).
  useEffect(() => {
    if (!payload?.rows?.length || autoPrinted.current) return;
    autoPrinted.current = true;
    const t = window.setTimeout(() => {
      printHtmlInIframe(
        buildHallticketPrintHtml(payload.rows, payload.universityCode, "bulk"),
      );
    }, 400);
    return () => window.clearTimeout(t);
  }, [payload]);

  function goBack() {
    clearExamHallticketPrintPayload();
    router.push(EXAM_HALLTICKET_RETURN_HREF);
  }

  function onPrint() {
    if (!payload?.rows?.length) return;
    printHtmlInIframe(
      buildHallticketPrintHtml(payload.rows, payload.universityCode, "bulk"),
    );
  }

  if (!payload) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading halltickets…
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8"
          onClick={goBack}
        >
          Back
        </Button>
        <Button type="button" className="h-8" onClick={onPrint}>
          Print
        </Button>
      </div>
      <div id="printsection" style={{ padding: "1rem" }} data-print-root>
        <HallticketPrintDocuments
          rows={payload.rows}
          universityCode={payload.universityCode}
          variant="bulk"
        />
      </div>
    </div>
  );
}
