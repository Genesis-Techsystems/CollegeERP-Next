"use client";

/**
 * Home for QuestionPaperSetter logins.
 * Angular lands them on main-dashboard (staff), not the evaluator subjects portal.
 * This page is the React role home: welcome + shortcuts to their working screens.
 */
import Link from "next/link";
import { FileText, Library } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";

const EXAM_QUESTION_PAPERS_HREF =
  "/admin-examination-management/evaluation-process/exam-question-paper-marks";
const QUESTION_BANK_HREF = "/assessments/question-bank";

const ACTIONS = [
  {
    href: EXAM_QUESTION_PAPERS_HREF,
    title: "Exam Question Papers",
    description:
      "View assigned papers, manage questions, and upload question / answer sheets.",
    icon: FileText,
  },
  {
    href: QUESTION_BANK_HREF,
    title: "Question Bank",
    description: "Browse and maintain the question bank for your subjects.",
    icon: Library,
  },
] as const;

export function QuestionPaperSetterDashboard() {
  const { user } = useSessionContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.userName ||
    "Question Paper Setter";

  return (
    <PageContainer className="space-y-6">
      <div className="rounded-lg border border-[#dbe3ef] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
          Home
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[#0f172a]">
          Question Paper Setter Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#475569]">
          Welcome, {displayName}. Use the shortcuts below to work on assigned
          exam question papers and the question bank.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex gap-4 rounded-lg border border-[#dbe3ef] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#0c51a4]/hover:bg-[#f5f8fc]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0c51a4]/10 text-[#0c51a4]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-[#0f172a] group-hover:text-[#0c51a4]">
                  {action.title}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[#64748b]">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
