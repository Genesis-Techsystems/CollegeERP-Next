"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  ChevronDownIcon,
  ClipboardList,
  Inbox,
  MonitorIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MathContent } from "@/common/components/rich-text-editor";
import {
  getAssessmentById,
  importQuestionsFromExcel,
  addOrUpdateQuestion,
  buildImportedQuestionPayload,
} from "@/services";
import type { Assessment, AssessmentQuestion } from "@/types/question-bank";
import { cn } from "@/lib/utils";

/** Angular fuse-widget tile — #00b9ff card + white circular icon (exam/fee/sug). */
function ActionCard({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full max-w-[11.5rem] flex-col items-center rounded-[5px] bg-[#00b9ff] px-4 py-5 text-white shadow-sm transition",
        "hover:bg-[#00a6e6] hover:shadow-md disabled:opacity-60",
      )}
    >
      <span className="mb-3 inline-flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white text-[#4e93e6]">
        {icon}
      </span>
      <span className="text-center text-base font-semibold leading-tight">
        {title}
      </span>
    </button>
  );
}

function AddedQuestionItem({
  aq,
  index,
}: {
  aq: AssessmentQuestion;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const q = aq.courseQuestionDTO;
  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 text-left",
          open && "border-b-2 border-[#ffcf46]",
        )}
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="shrink-0 font-medium">{index + 1})</span>
          <MathContent
            html={q?.question ?? ""}
            className="min-w-0 font-semibold"
          />
          <span className="shrink-0 font-semibold">
            ({q?.marks ?? 0} marks)
          </span>
        </div>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-border px-8 py-3 text-sm font-semibold">
          {(q?.courseQuestionOptionDTOs ?? []).map((opt, i) => (
            <li
              key={opt.courseQuestionOptionId ?? i}
              className={cn(opt.isCorrectAnswer && "text-[#00c700]")}
            >
              <MathContent html={opt.options} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ManageQuestionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const assessmentId = Number(params.get("assessmentId") ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: assessment, isLoading } = useQuery<Assessment | null>({
    queryKey: ["test", "manage-question", assessmentId],
    queryFn: () => getAssessmentById(assessmentId),
    enabled: !!assessmentId,
  });

  const assessmentName = assessment?.assessmentName ?? "Test";
  const addedQuestions = assessment?.assessmentQuestionDTOs ?? [];

  const onUploadExcelChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      toast.info("Please choose a file.");
      return;
    }
    if (!assessmentId) return;

    setImporting(true);
    try {
      const questions = await importQuestionsFromExcel(file);
      for (const q of questions) {
        await addOrUpdateQuestion(
          buildImportedQuestionPayload(q, assessmentId),
        );
      }
      toast.success("Questions imported successfully");
      await queryClient.invalidateQueries({
        queryKey: ["test", "manage-question", assessmentId],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer className="max-w-none space-y-4">
      {/* data-no-page-name: hide AppShell injected "Test" title + underline */}
      <div
        className="rounded-sm border border-[#dedede] bg-white px-3 py-2 shadow-sm md:px-4"
        data-no-page-name
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#ffcf46] px-1 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <MonitorIcon className="h-5 w-5 text-[#042956]" />
            <span className="text-lg font-medium text-[#042956]">
              Manage Questions ({assessmentName})
            </span>
          </div>
          <Button asChild variant="outline">
            <a href="/assets/docs/QuestionSheet_bulk_upload.xlsx" download>
              Download Sample XL
            </a>
          </Button>
        </div>

        <div className="border border-[#dedede] px-2.5 py-2">
          <div className="flex flex-wrap gap-4">
            <ActionCard
              icon={<ClipboardList className="h-9 w-9" strokeWidth={1.5} />}
              title="Question Bank"
              onClick={() =>
                router.push(
                  `/assessments/test/question-bank?assessmentId=${assessmentId}&assessmentName=${encodeURIComponent(assessmentName)}&page=assessments/test/manage-question`,
                )
              }
            />
            <ActionCard
              icon={<Calculator className="h-9 w-9" strokeWidth={1.5} />}
              title="Manually"
              onClick={() =>
                router.push(
                  `/assessments/question-bank/add-question?assessmentId=${assessmentId}&assessmentQuestionId=&permission=Add&page=assessments/test/manage-question`,
                )
              }
            />
            <ActionCard
              icon={<Inbox className="h-9 w-9" strokeWidth={1.5} />}
              title={importing ? "Uploading…" : "Upload Excel"}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={onUploadExcelChange}
        />

        {/* Angular: Added Questions accordion */}
        {!isLoading && addedQuestions.length > 0 && (
          <div className="mt-4 space-y-2 px-1">
            <p className="border-b-2 border-[#ffcf46] bg-white px-3 py-2 text-[19px] font-semibold">
              Added <span className="text-blue-600">Questions</span>
            </p>
            {addedQuestions.map((aq, i) => (
              <AddedQuestionItem
                key={aq.assessmentQuestionId}
                aq={aq}
                index={i}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-end px-1 pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/assessments/test")}
          >
            Back
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
