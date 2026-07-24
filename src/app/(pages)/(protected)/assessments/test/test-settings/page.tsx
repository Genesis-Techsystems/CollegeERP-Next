"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Monitor } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/common/components/select";
import { getAssessmentById, saveTestSettings } from "@/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Assessment } from "@/types/question-bank";

const SECTION_BAR =
  "mb-2 bg-[#8ecdff] px-3 py-2 text-sm font-semibold uppercase text-white";
const LABEL = "text-sm font-medium text-slate-800";
const HELP = "mt-1 text-xs text-[#848484]";
const UNDERLINE_INPUT =
  "h-9 w-28 rounded-none border-0 border-b border-slate-400 bg-transparent px-1 shadow-none focus-visible:ring-0 focus:border-primary";

function FormRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 px-2 py-2 md:grid-cols-[20%_1fr] md:items-start",
        className,
      )}
    >
      <p className={cn(LABEL, "md:pt-2")}>{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function RadioOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800">
      <input
        type="radio"
        className="accent-primary"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}

/** Angular `w-mat-timepicker` look — duration as H:MM with clock icon (not wall-clock AM/PM). */
function DurationTimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  hour: string;
  minute: string;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        value: String(i),
        label: String(i).padStart(2, "0"),
      })),
    [],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: String(i),
        label: String(i).padStart(2, "0"),
      })),
    [],
  );
  const display = `${Number(hour)}:${String(Number(minute)).padStart(2, "0")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-[7.5rem] items-center gap-2 border-0 border-b border-slate-400 bg-transparent px-1 text-left text-sm text-slate-900 outline-none hover:bg-muted/30 focus-visible:border-primary"
        >
          <Clock
            className="h-4 w-4 shrink-0 text-slate-500"
            strokeWidth={1.75}
          />
          <span>{display}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <Select
            label="Hour"
            value={hour}
            onChange={(v) => onHourChange(v ?? "0")}
            options={hourOptions}
            searchable={false}
          />
          <Select
            label="Minute"
            value={minute}
            onChange={(v) => onMinuteChange(v ?? "0")}
            options={minuteOptions}
            searchable={false}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function TestSettingsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const assessmentName = params.get("assessmentName") ?? "Test";
  const assessmentId = Number(params.get("assessmentId") ?? 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<Assessment | null>(null);

  const [durationHour, setDurationHour] = useState("0");
  const [durationMinute, setDurationMinute] = useState("0");
  const [noOfMaxAttempts, setNoOfMaxAttempts] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [minMarksToPass, setMinMarksToPass] = useState(0);
  const [minMarksPercentage, setMinMarksPercentage] = useState(0);

  const [allowReattempts, setAllowReattempts] = useState<"yes" | "no">("no");
  const [unlimitedAttempts, setUnlimitedAttempts] = useState(false);
  const [gapDay, setGapDay] = useState("0");
  const [gapHour, setGapHour] = useState("0");
  const [gapMinute, setGapMinute] = useState("0");
  const [allowResume, setAllowResume] = useState<"yes" | "no">("no");
  const [questionSequence, setQuestionSequence] = useState<
    "random" | "sequence"
  >("random");
  const [displayQuestion, setDisplayQuestion] = useState<"one" | "all">("one");
  const [backButton, setBackButton] = useState<"allowed" | "not_allowed">(
    "not_allowed",
  );
  const [sectionNavigation, setSectionNavigation] = useState<"one" | "choice">(
    "one",
  );
  const [privacyType, setPrivacyType] = useState<"public" | "private">(
    "public",
  );

  const tinyNumberOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        value: String(i),
        label: String(i).padStart(2, "0"),
      })),
    [],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: String(i),
        label: String(i).padStart(2, "0"),
      })),
    [],
  );

  useEffect(() => {
    async function load() {
      if (!assessmentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const row = await getAssessmentById(assessmentId);
        setTest(row);
        if (row?.duration) {
          const [h, m] = String(row.duration).split(":");
          setDurationHour(String(Number(h ?? 0)));
          setDurationMinute(String(Number(m ?? 0)));
        }
        setNoOfMaxAttempts(Number(row?.noOfMaxAttempts ?? 0));
        setTotalQuestions(Number(row?.totalQuestions ?? 0));
        setMinMarksToPass(Number(row?.minMarksToPass ?? 0));
        setMinMarksPercentage(Number(row?.minMarksPercentage ?? 0));
        setPrivacyType(row?.isPublic ? "public" : "private");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load test settings",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [assessmentId]);

  const save = async () => {
    if (!assessmentId || !test) return;
    setSaving(true);
    try {
      // Angular convert_to_24h(hour:minute:00 AM) — pad like Angular duration save
      const duration = `${String(Number(durationHour)).padStart(2, "0")}:${String(Number(durationMinute)).padStart(2, "0")}:00`;
      // Angular updateSettings: POST assessmentUrl with full assessment row
      await saveTestSettings({
        ...test,
        assessmentId,
        duration,
        noOfMaxAttempts: unlimitedAttempts ? 0 : Number(noOfMaxAttempts),
        totalQuestions: Number(totalQuestions),
        minMarksToPass: Number(minMarksToPass),
        minMarksPercentage: Number(minMarksPercentage),
        isPublic: privacyType === "public",
      });
      toast.success("Test settings updated");
      router.push("/assessments/test");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update test settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer className="space-y-4">
      <div className="rounded-sm border border-[#dedede] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#dedede] px-4 py-3">
          <Monitor className="h-5 w-5 text-slate-600" aria-hidden />
          <h1 className="text-base font-semibold text-slate-800">
            Test Settings ({assessmentName})
          </h1>
        </div>

        <div className="px-3 py-3 md:px-4">
          {loading ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              Loading settings…
            </p>
          ) : (
            <div className="space-y-4">
              {/* TIME SETTINGS */}
              <section>
                <h3 className={SECTION_BAR}>Time Settings</h3>
                <FormRow label="Time Duration :">
                  <DurationTimePicker
                    hour={durationHour}
                    minute={durationMinute}
                    onHourChange={setDurationHour}
                    onMinuteChange={setDurationMinute}
                  />
                  <p className={HELP}>( Duration of Test )</p>
                </FormRow>
              </section>

              {/* ATTEMPT SETTINGS */}
              <section>
                <h3 className={SECTION_BAR}>Attempt Settings</h3>
                <FormRow label="Allow Reattempts :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={allowReattempts === "yes"}
                      onChange={() => setAllowReattempts("yes")}
                    >
                      Yes
                    </RadioOption>
                    <RadioOption
                      checked={allowReattempts === "no"}
                      onChange={() => setAllowReattempts("no")}
                    >
                      No
                    </RadioOption>
                  </div>
                </FormRow>
                <FormRow label="How Many :">
                  <div className="flex flex-wrap items-start gap-4">
                    <label className="inline-flex items-center gap-2 pt-2 text-sm text-slate-800">
                      <Checkbox
                        checked={unlimitedAttempts}
                        onCheckedChange={(v) =>
                          setUnlimitedAttempts(v === true)
                        }
                      />
                      Unlimited
                    </label>
                    <div>
                      <Input
                        type="number"
                        className={UNDERLINE_INPUT}
                        value={noOfMaxAttempts}
                        onChange={(e) =>
                          setNoOfMaxAttempts(Number(e.target.value))
                        }
                        disabled={unlimitedAttempts}
                      />
                      <p className={HELP}>( Max attempts to attend a Test )</p>
                    </div>
                  </div>
                </FormRow>
                <FormRow label="Gap Between Reattempts :">
                  <div className="flex max-w-xl flex-wrap gap-3">
                    <Select
                      label="Day"
                      value={gapDay}
                      onChange={(v) => setGapDay(v ?? "0")}
                      options={tinyNumberOptions}
                      searchable={false}
                      className="w-28"
                    />
                    <Select
                      label="Hour"
                      value={gapHour}
                      onChange={(v) => setGapHour(v ?? "0")}
                      options={tinyNumberOptions}
                      searchable={false}
                      className="w-28"
                    />
                    <Select
                      label="Minutes"
                      value={gapMinute}
                      onChange={(v) => setGapMinute(v ?? "0")}
                      options={minuteOptions}
                      searchable={false}
                      className="w-28"
                    />
                  </div>
                </FormRow>
              </section>

              {/* RESUME */}
              <section>
                <h3 className={SECTION_BAR}>Resume</h3>
                <FormRow label="Allow Test Resume :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={allowResume === "yes"}
                      onChange={() => setAllowResume("yes")}
                    >
                      Yes
                    </RadioOption>
                    <RadioOption
                      checked={allowResume === "no"}
                      onChange={() => setAllowResume("no")}
                    >
                      No
                    </RadioOption>
                  </div>
                  <p className={cn(HELP, "mt-2 max-w-2xl")}>
                    ( Users can restart the test from the same point where they
                    stopped test in case of Power Cut-off, System Crash etc. due
                    to unexpected circumstances )
                  </p>
                </FormRow>
              </section>

              {/* APPEARANCE */}
              <section>
                <h3 className={SECTION_BAR}>Appearance</h3>
                <FormRow label="Question Sequence :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={questionSequence === "random"}
                      onChange={() => setQuestionSequence("random")}
                    >
                      Random
                    </RadioOption>
                    <RadioOption
                      checked={questionSequence === "sequence"}
                      onChange={() => setQuestionSequence("sequence")}
                    >
                      In Sequence
                    </RadioOption>
                  </div>
                </FormRow>
                <FormRow label="Display Question :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={displayQuestion === "one"}
                      onChange={() => setDisplayQuestion("one")}
                    >
                      One By One
                    </RadioOption>
                    <RadioOption
                      checked={displayQuestion === "all"}
                      onChange={() => setDisplayQuestion("all")}
                    >
                      All At Once
                    </RadioOption>
                  </div>
                </FormRow>
                <FormRow label="Back Button/Previous Question :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={backButton === "not_allowed"}
                      onChange={() => setBackButton("not_allowed")}
                    >
                      Not Allowed
                    </RadioOption>
                    <RadioOption
                      checked={backButton === "allowed"}
                      onChange={() => setBackButton("allowed")}
                    >
                      Allowed
                    </RadioOption>
                  </div>
                </FormRow>
                <FormRow label="Section Navigation :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={sectionNavigation === "one"}
                      onChange={() => setSectionNavigation("one")}
                    >
                      One By One
                    </RadioOption>
                    <RadioOption
                      checked={sectionNavigation === "choice"}
                      onChange={() => setSectionNavigation("choice")}
                    >
                      Users Choice
                    </RadioOption>
                  </div>
                </FormRow>
              </section>

              {/* TEST EVALUATION */}
              <section>
                <h3 className={SECTION_BAR}>Test Evaluation</h3>
                <FormRow label="Questions :">
                  <Input
                    type="number"
                    className={UNDERLINE_INPUT}
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  />
                </FormRow>
                <FormRow label="Min. Pass Marks :">
                  <Input
                    type="number"
                    className={UNDERLINE_INPUT}
                    value={minMarksToPass}
                    onChange={(e) => setMinMarksToPass(Number(e.target.value))}
                  />
                </FormRow>
                <FormRow label="Pass Percentage :">
                  <Input
                    type="number"
                    className={UNDERLINE_INPUT}
                    value={minMarksPercentage}
                    onChange={(e) =>
                      setMinMarksPercentage(Number(e.target.value))
                    }
                  />
                </FormRow>
              </section>

              {/* PRIVACY SETTINGS */}
              <section>
                <h3 className={SECTION_BAR}>Privacy Settings</h3>
                <FormRow label="Test Type :">
                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <RadioOption
                      checked={privacyType === "public"}
                      onChange={() => setPrivacyType("public")}
                    >
                      Public
                    </RadioOption>
                    <RadioOption
                      checked={privacyType === "private"}
                      onChange={() => setPrivacyType("private")}
                    >
                      Private
                    </RadioOption>
                  </div>
                </FormRow>
              </section>

              <div className="flex flex-wrap items-center gap-3 px-2 pb-2 pt-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/assessments/test")}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
