"use client";

/**
 * Exam Forms print buttons — Angular parity: navigate to preview routes
 * (print-form / print-form-a / print-dform) instead of immediate iframe print.
 */

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { saveExamFormsPrintPayload, type ExamFormsPrintVariant } from "./store";
import type { ExamFormsPrintMeta } from "./print-documents";

type AnyRow = Record<string, any>;

export type { ExamFormsPrintMeta } from "./print-documents";

export type ExamFormsPrintContext = ExamFormsPrintMeta & {
  collegeId?: number | null;
  academicYearId?: number | null;
  courseId?: number | null;
  courseGroupId?: number | null;
  courseYearId?: number | null;
  examId?: number | null;
  subjectId?: number | null;
  regulationId?: number | null;
};

const ROUTE_BY_VARIANT: Record<ExamFormsPrintVariant, string> = {
  form: "/admin-examination-management/pre-examination/exam-forms/print-form",
  formA:
    "/admin-examination-management/pre-examination/exam-forms/print-form-a",
  dform: "/admin-examination-management/pre-examination/exam-forms/print-dform",
};

export function useExamFormsPrint(
  students: AnyRow[],
  context: ExamFormsPrintContext,
): { printButtons: ReactNode } {
  const router = useRouter();

  const navigateToPrint = (variant: ExamFormsPrintVariant) => {
    if (!students.length) return;
    saveExamFormsPrintPayload({
      variant,
      students,
      courseYear: context.courseYear,
      examName: context.examName,
      logoUrl: context.logoUrl,
      groupName: context.groupName,
      collegeId: context.collegeId ?? undefined,
      academicYearId: context.academicYearId ?? undefined,
      courseId: context.courseId ?? undefined,
      courseGroupId: context.courseGroupId ?? undefined,
      courseYearId: context.courseYearId ?? undefined,
      examId: context.examId ?? undefined,
      subjectId: context.subjectId ?? undefined,
      regulationId: context.regulationId ?? undefined,
    });
    router.push(ROUTE_BY_VARIANT[variant]);
  };

  const printButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={() => navigateToPrint("formA")}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Form-A
      </Button>
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={() => navigateToPrint("dform")}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print D Forms
      </Button>
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={() => navigateToPrint("form")}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Forms
      </Button>
    </div>
  );

  return { printButtons };
}
