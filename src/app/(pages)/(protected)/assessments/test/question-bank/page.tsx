"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, MonitorIcon } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { MathContent } from "@/common/components/rich-text-editor";
import { listActiveQuestionBanks, addOrUpdateQuestion } from "@/services";
import type { Assessment, AssessmentQuestion } from "@/types/question-bank";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/query-keys";

type SelectableQuestion = AssessmentQuestion & { check: boolean };

function QuestionPickItem({
  aq,
  checked,
  onToggle,
}: {
  aq: SelectableQuestion;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = aq.courseQuestionDTO;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="flex items-start gap-2 bg-slate-50 px-3 py-2.5">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 cursor-pointer"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          onClick={() => setOpen((p) => !p)}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
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
      </div>
      {open && (
        <ul className="space-y-1 border-t border-border px-8 py-3 text-sm font-semibold">
          {(q?.courseQuestionOptionDTOs ?? []).map((opt, i) => (
            <li
              key={opt.courseQuestionOptionId ?? i}
              className={cn(opt.isCorrectAnswer && "text-green-700")}
            >
              <MathContent html={opt.options} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TestQuestionBankPickerPage() {
  const router = useRouter();
  const params = useSearchParams();
  const assessmentId = Number(params.get("assessmentId") ?? 0);
  const assessmentName = params.get("assessmentName") ?? "Test";
  const returnPage = params.get("page") ?? "assessments/test/manage-question";

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [questionList, setQuestionList] = useState<SelectableQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: questionBanks = [], isLoading } = useQuery<Assessment[]>({
    queryKey: [...QK.questionBanks.all, "active-for-test"],
    queryFn: listActiveQuestionBanks,
  });

  const bankOptions = useMemo(
    () =>
      questionBanks.map((b) => ({
        value: String(b.assessmentId),
        label: b.assessmentName,
      })),
    [questionBanks],
  );

  const onSelectBank = (id: string | null) => {
    setSelectedBankId(id);
    if (!id) {
      setQuestionList([]);
      return;
    }
    const bank = questionBanks.find((b) => String(b.assessmentId) === id);
    const list = (bank?.assessmentQuestionDTOs ?? []).map((q) => ({
      ...q,
      check: false,
    }));
    setQuestionList(list);
  };

  const goBack = () => {
    const path = returnPage.startsWith("/") ? returnPage : `/${returnPage}`;
    router.push(`${path}?assessmentId=${assessmentId}`);
  };

  const saveSelected = async () => {
    const selected = questionList.filter((q) => q.check);
    if (selected.length === 0) {
      toast.info("Please select at least one question.");
      return;
    }
    if (!assessmentId) return;

    setSaving(true);
    try {
      // Angular addQuestionsList: POST addQuestion for each checked row
      for (const item of selected) {
        const dto = item.courseQuestionDTO;
        const options = (dto.courseQuestionOptionDTOs ?? []).map((opt) => ({
          ...opt,
          courseQuestionOptionId: null,
          courseQuestionId: null,
        }));
        await addOrUpdateQuestion({
          assessmentId,
          question: dto.question,
          fbInputTypeCatId: dto.fbInputTypeCatId,
          isActive: true,
          marks: dto.marks,
          correctAnswerIds: [],
          courseQuestionOptionDTOs:
            options as import("@/types/question-bank").CourseQuestionOption[],
          onlineCourseId: null,
          courseLessonId: null,
          courseLessonTopicId: null,
        });
      }
      toast.success("Questions added");
      goBack();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add questions",
      );
      setSaving(false);
    }
  };

  return (
    <PageContainer className="max-w-none space-y-4">
      <div className="rounded-sm border border-border bg-white px-4 py-3 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <MonitorIcon className="h-5 w-5 text-[hsl(var(--primary))]" />
          <span className="text-base font-semibold">Question Bank</span>
        </div>

        <div className="rounded-sm border border-[#dedede] p-3">
          <h4 className="mb-3 text-sm font-semibold">
            Add Questions in &apos;{assessmentName}&apos;
          </h4>

          <div className="max-w-md">
            <Select
              label="Select Question Bank"
              value={selectedBankId}
              onChange={onSelectBank}
              options={bankOptions}
              placeholder="Select Question Bank"
              isLoading={isLoading}
            />
          </div>

          {questionList.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="border-b-2 border-[#ffcf46] bg-white px-3 py-2 text-lg font-semibold">
                List of <span className="text-blue-600">Questions</span>
              </p>
              {questionList.map((aq) => (
                <QuestionPickItem
                  key={aq.assessmentQuestionId}
                  aq={aq}
                  checked={aq.check}
                  onToggle={(next) =>
                    setQuestionList((prev) =>
                      prev.map((q) =>
                        q.assessmentQuestionId === aq.assessmentQuestionId
                          ? { ...q, check: next }
                          : q,
                      ),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={saveSelected} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={saving}
          >
            Back
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
