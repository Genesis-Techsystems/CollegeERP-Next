"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const data = loadExamHallticketPrintPayload();
    if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
      router.replace(EXAM_HALLTICKET_RETURN_HREF);
      return;
    }
    setPayload(data);
  }, [router]);

  function goBack() {
    clearExamHallticketPrintPayload();
    router.push(EXAM_HALLTICKET_RETURN_HREF);
  }

  function onPrint() {
    if (!payload?.rows?.length) return;
    // iframe print — same as student Print; avoids AppShell blank PDF
    printHtmlInIframe(
      buildHallticketPrintHtml(payload.rows, payload.universityCode),
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
        />
      </div>
    </div>
  );
}
