"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  buildFormADocument,
  buildDFormDocument,
  EXAM_FORMS_PRINT_CSS,
  extractPrintLayoutBody,
  printHtmlInIframe,
  type ExamFormsPrintMeta,
} from "../_print/print-documents";
import {
  clearExamFormsPrintPayload,
  EXAM_FORMS_RETURN_HREF,
  loadExamFormsPrintPayload,
  saveReturnStateFromPrintPayload,
  type ExamFormsPrintPayload,
  type ExamFormsPrintVariant,
} from "../_print/store";

type Props = {
  variant: ExamFormsPrintVariant;
  title: string;
  breadcrumb: string;
  buildDocument: (
    students: Record<string, unknown>[],
    meta: ExamFormsPrintMeta,
  ) => string;
};

function HtmlFormPrintPage({
  variant,
  title,
  breadcrumb,
  buildDocument,
}: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<ExamFormsPrintPayload | null>(null);

  useEffect(() => {
    const data = loadExamFormsPrintPayload();
    if (!data || data.variant !== variant || !data.students?.length) {
      router.replace(EXAM_FORMS_RETURN_HREF);
      return;
    }
    setPayload(data);
  }, [router, variant]);

  const meta: ExamFormsPrintMeta = useMemo(
    () => ({
      courseYear: payload?.courseYear ?? "",
      examName: payload?.examName ?? "",
      logoUrl: payload?.logoUrl,
      groupName: payload?.groupName,
    }),
    [payload],
  );

  const bodyHtml = useMemo(() => {
    if (!payload?.students?.length) return "";
    return extractPrintLayoutBody(buildDocument(payload.students, meta));
  }, [payload, meta, buildDocument]);

  function goBack() {
    if (payload) saveReturnStateFromPrintPayload(payload);
    clearExamFormsPrintPayload();
    router.push(EXAM_FORMS_RETURN_HREF);
  }

  function onPrint() {
    if (!payload?.students?.length) return;
    printHtmlInIframe(buildDocument(payload.students, meta));
  }

  if (!payload) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading {title}…</div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center gap-2 text-[13px] text-muted-foreground print:hidden">
        <span>Examination</span>
        <span>/</span>
        <span>Exam Forms</span>
        <span>/</span>
        <span>{breadcrumb}</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: EXAM_FORMS_PRINT_CSS }} />
      <div
        id="printsection"
        className="layout mx-auto max-w-full bg-white"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <div className="mt-4 flex justify-end gap-2 print:hidden">
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
  );
}

export function FormAPrintPage() {
  return (
    <HtmlFormPrintPage
      variant="formA"
      title="Form-A"
      breadcrumb="Print Form-A"
      buildDocument={buildFormADocument}
    />
  );
}

export function DFormPrintPage() {
  return (
    <HtmlFormPrintPage
      variant="dform"
      title="D-Form"
      breadcrumb="Print D Forms"
      buildDocument={buildDFormDocument}
    />
  );
}
