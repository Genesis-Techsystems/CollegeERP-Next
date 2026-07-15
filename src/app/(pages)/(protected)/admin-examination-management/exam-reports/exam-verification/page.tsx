"use client";

import { useRouter } from "next/navigation";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";

const REPORTS = [
  {
    title: "1. Exam AnswerSheets Upload Report",
    description:
      "this report gives count of no.of students register , Answerpaper upload for every subject.",
    button: "Exam AnswerSheets Upload Report",
    // Angular: admin-exam-reports/exam-answer-sheets-report
    href: "/admin-examination-management/exam-reports/exam-answer-sheets-report",
  },
  {
    title: "2. Subject Wise Evaluators List Report",
    description:
      "This report will give all the evaluators list for every subject.",
    button: "Subject Wise Evaluators List Report",
    // Angular: admin-exam-reports/subject-wise-evaluators-report
    href: "/admin-examination-management/exam-reports/subject-wise-evaluators-report",
  },
  {
    title: "3. Exam Evaluation Status Report",
    description:
      "This report list of all evaluation status by evaluators for on exam.",
    button: "Exam Evaluation Status Report",
    // Angular ExamEvaluationReport → exam-evaluation-report
    href: "/admin-examination-management/exam-reports/exam-evaluation-report",
  },
  {
    title: "4. Evaluator report in data range",
    description:
      "This report will give no.of evaluations done by evaluators in a date range.",
    button: "Daily Evaluated Report",
    // Angular DailyEvaluatedReport → daily-evaluated-report
    href: "/admin-examination-management/exam-reports/daily-evaluated-report",
  },
  {
    title: "5. Marks Entered Status",
    description: "This report  will give list of evaluator marks status.",
    button: "Verify Exam Marks",
    // Angular VerifyExamMarks → admin-post-examination/verify-exam-marks
    href: "/admin-examination-management/post-examination/verify-exam-marks",
  },
] as const;

function ReportCard({
  title,
  description,
  button,
  onClick,
}: Readonly<{
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}>) {
  return (
    <div className="flex flex-col rounded-sm border-2 border-[#89c5ff] p-3 mx-1 mb-4 min-h-[140px]">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground flex-1">{description}</p>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          className="h-10 min-w-[40%] px-3 text-[13px]"
          onClick={onClick}
        >
          {button}
        </Button>
      </div>
    </div>
  );
}

export default function ExamVerificationReportPage() {
  const router = useRouter();

  return (
    <FilteredPage
      title="Exam Verification Report"
      filtersCollapsible={false}
      filters={
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2 pt-1">
          {REPORTS.map((item) => (
            <ReportCard
              key={item.href}
              title={item.title}
              description={item.description}
              button={item.button}
              onClick={() => {
                // Angular ParametersService.back = 'back' for return navigation
                try {
                  sessionStorage.setItem("examVerificationBack", "back");
                } catch {
                  /* ignore */
                }
                router.push(item.href);
              }}
            />
          ))}
        </div>
      }
    />
  );
}
