"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExamFormPrintPreview } from "../_print/ExamFormPrintPreview";
import { ExamFormPrintStyles } from "../_print/ExamFormPrintStyles";
import type { ExamFormsPrintMeta } from "../_print/print-documents";
import {
  clearExamFormsPrintPayload,
  EXAM_FORMS_RETURN_HREF,
  loadExamFormsPrintPayload,
  saveReturnStateFromPrintPayload,
  type ExamFormsPrintPayload,
} from "../_print/store";

export default function ExamFormsPrintFormPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ExamFormsPrintPayload | null>(null);
  const orgCode =
    typeof window !== "undefined"
      ? (localStorage.getItem("orgCode") ?? "")
      : "";

  useEffect(() => {
    const data = loadExamFormsPrintPayload();
    if (!data || data.variant !== "form" || !data.students?.length) {
      router.replace(EXAM_FORMS_RETURN_HREF);
      return;
    }
    setPayload(data);
  }, [router]);

  const meta: ExamFormsPrintMeta = useMemo(
    () => ({
      courseYear: payload?.courseYear ?? "",
      examName: payload?.examName ?? "",
      logoUrl: payload?.logoUrl,
      groupName: payload?.groupName,
    }),
    [payload],
  );

  function goBack() {
    if (payload) saveReturnStateFromPrintPayload(payload);
    clearExamFormsPrintPayload();
    router.push(EXAM_FORMS_RETURN_HREF);
  }

  /** Angular printPage() — prints the on-screen preview so Absent/Malpractice marks persist. */
  function onPrint() {
    window.print();
  }

  if (!payload) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading exam form…
      </div>
    );
  }

  return (
    <>
      <ExamFormPrintStyles />
      <div className="pb-8">
        <div className="exam-form-screen-only mb-4 flex items-center gap-2 text-[13px] text-muted-foreground">
          <span>Examination</span>
          <span>/</span>
          <span>Exam Forms</span>
          <span>/</span>
          <span>Print Form</span>
        </div>

        <div id="printsection" className="exam-form-print-root">
          <ExamFormPrintPreview
            students={payload.students}
            meta={meta}
            orgCode={orgCode}
          />
        </div>

        <div className="exam-form-screen-only mt-4 flex justify-end gap-2">
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
      </div>
    </>
  );
}
