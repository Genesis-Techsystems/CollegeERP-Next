"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Inbox,
  AlertTriangle,
  Users,
} from "lucide-react";

export type SubjectCard = {
  code: string;
  name: string;
  course: string;
  lastDate: string;
  reEvaluation: boolean;
  assigned: number;
  evaluated: number | null;
  due: number | null;
  rejected?: number | null;
  // Carried through to the assigned-scripts view (populated from the live API).
  examEvaluatorProfileId?: string | number | null;
  examEvaluatorProfileDetId?: string | number | null;
  subjectName?: string;
  /** Angular checkpaperValidator → isValidator=true (Moderator tab). */
  isValidator?: boolean;
  examId?: string | number | null;
  maxNoOfEvaluationsAssign?: number | null;
  maxNoOfReevaluationsAssign?: number | null;
};

function daysLeftLabel(lastDate: string): string | null {
  if (!lastDate || lastDate === "—") return null;
  const d = new Date(lastDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days > 0) return `(${days} day${days === 1 ? "" : "s"} left)`;
  if (days === 0) return "(due today)";
  return `(${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue)`;
}

function progressPercent(
  assigned: number,
  evaluated: number | null,
  due: number | null,
): number {
  if (!assigned || assigned <= 0) return 0;
  // Still work remaining — never show 100% (Math.round(459/460) was wrongly 100).
  if (due != null && due > 0) {
    const raw = Math.floor((Math.max(0, evaluated ?? 0) / assigned) * 100);
    return Math.min(99, Math.max(0, raw));
  }
  const safeEvaluated = Math.max(0, evaluated ?? 0);
  if (safeEvaluated >= assigned) return 100;
  return Math.min(100, Math.floor((safeEvaluated / assigned) * 100));
}

function SubjectCard({
  s,
  onCheck,
}: {
  s: SubjectCard;
  onCheck: (s: SubjectCard) => void;
}) {
  const inProgress = s.due !== null && s.due > 0;
  const deadlineHint = daysLeftLabel(s.lastDate);
  const code = s.code.replace(/-\d+$/, "");
  const progress = progressPercent(s.assigned, s.evaluated, s.due);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-snug text-primary">
            {s.name}
          </h3>
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
            {code}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
            inProgress
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {inProgress ? "In Progress" : "Completed"}
          </span>
        </div>
      </div>

      <div className="mx-5 border-t border-border" />

      <div className="grid grid-cols-2 gap-4 px-5 py-4">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
              Course
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
              {s.course}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
              Deadline
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
              {s.lastDate}
            </p>
            {deadlineHint && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                {deadlineHint}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-muted/40">
        <div className="flex flex-col items-center gap-1 border-r border-border px-2 py-3.5 text-center">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            Assigned
          </p>
          <p className="text-2xl font-bold text-primary">{s.assigned}</p>
        </div>
        <div className="flex flex-col items-center gap-1 border-r border-border px-2 py-3.5 text-center">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            Evaluated
          </p>
          <p className="text-2xl font-bold text-primary">
            {s.evaluated ?? "-"}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 py-3.5 text-center">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
            Due
          </p>
          <p className="text-2xl font-bold text-primary">{s.due ?? "-"}</p>
        </div>
      </div>

      <div className="mt-auto px-5 pb-5">
        <Button
          onClick={() => onCheck(s)}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Check Paper
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Overall Progress
            </p>
            <p
              className={cn(
                "text-xl font-bold",
                progress >= 100 ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {progress}%
            </p>
          </div>
          <div
            className={cn(
              "h-2 overflow-hidden rounded-full",
              progress >= 100 ? "bg-emerald-500/15" : "bg-amber-500/15",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progress >= 100 ? "bg-emerald-500" : "bg-amber-400",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {(s.evaluated ?? 0).toLocaleString()} of{" "}
            {s.assigned.toLocaleString()} scripts evaluated
          </p>
        </div>
      </div>
    </div>
  );
}

function SubjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mx-5 border-t border-border" />
      <div className="grid grid-cols-2 gap-4 px-5 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="mx-5 mb-4">
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <div className="px-5 pb-5">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

function CardsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

function StateBox({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SubjectCards({
  subjects = [],
  moderatorSubjects = [],
  onCheck,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  defaultRoleTab = "evaluator",
  roleTab,
  onRoleTabChange,
}: {
  /** Evaluator-role subjects (roleId 64) — split into Fresh / Re-Evaluation internally. */
  subjects?: SubjectCard[];
  /** Moderator-role subjects (roleId ≠ 64). Tab shown only when non-empty (Angular *ngIf). */
  moderatorSubjects?: SubjectCard[];
  onCheck: (s: SubjectCard) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  /** Angular selectedTabIndex when opened with isValidator=true (uncontrolled fallback). */
  defaultRoleTab?: "evaluator" | "moderator";
  /** Controlled role tab — keeps Moderator selected after Back from answer papers. */
  roleTab?: "evaluator" | "moderator";
  onRoleTabChange?: (tab: "evaluator" | "moderator") => void;
}) {
  const fresh = subjects.filter((s) => !s.reEvaluation);
  const reEval = subjects.filter((s) => s.reEvaluation);
  const showModeratorTab = moderatorSubjects.length > 0;
  const roleDefault =
    showModeratorTab && defaultRoleTab === "moderator"
      ? "moderator"
      : "evaluator";
  const activeRoleTab =
    showModeratorTab && roleTab === "moderator"
      ? "moderator"
      : roleTab === "evaluator"
        ? "evaluator"
        : roleDefault;

  const statusTabs = (
    <Tabs defaultValue="fresh" className="space-y-3">
      <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Evaluation Status
      </p>
      <TabsList
        className={cn(
          "mb-2 h-auto w-fit gap-4 bg-transparent p-0",
          "[&>[data-state=active]]:bg-primary [&>[data-state=active]]:text-primary-foreground [&>[data-state=active]]:shadow-md",
          "[&>:not([data-state=active])]:border [&>:not([data-state=active])]:border-border [&>:not([data-state=active])]:bg-card [&>:not([data-state=active])]:text-muted-foreground [&>:not([data-state=active])]:hover:bg-muted",
        )}
      >
        <TabsTrigger
          value="fresh"
          className="group/tabs-trigger flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
        >
          Fresh Evaluation
          <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-muted px-1.5 text-[11px] font-bold text-muted-foreground transition-colors group-data-[state=active]/tabs-trigger:bg-primary-foreground/20 group-data-[state=active]/tabs-trigger:text-primary-foreground">
            {fresh.length.toString().padStart(2, "0")}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="re-evaluation"
          className="group/tabs-trigger flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
        >
          Re-Evaluation
          <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-muted px-1.5 text-[11px] font-bold text-muted-foreground transition-colors group-data-[state=active]/tabs-trigger:bg-primary-foreground/20 group-data-[state=active]/tabs-trigger:text-primary-foreground">
            {reEval.length.toString().padStart(2, "0")}
          </span>
        </TabsTrigger>
      </TabsList>

      {isLoading ? (
        <CardsGrid>
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
        </CardsGrid>
      ) : isError ? (
        <StateBox
          icon={AlertTriangle}
          title="Could not load your subjects"
          description={
            errorMessage ||
            "Something went wrong while fetching your assigned subjects. Please try again."
          }
          action={
            onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : subjects.length === 0 ? (
        <StateBox
          icon={Inbox}
          title="No subjects assigned"
          description="You don't have any subjects assigned for evaluation yet. New assignments will appear here."
        />
      ) : (
        <>
          <TabsContent value="fresh">
            {fresh.length === 0 ? (
              <StateBox
                icon={Inbox}
                title="No fresh evaluations"
                description="There are no fresh-evaluation subjects assigned right now."
              />
            ) : (
              <CardsGrid>
                {fresh.map((s, i) => (
                  <SubjectCard
                    key={`${s.examEvaluatorProfileDetId ?? s.code}-e-${i}`}
                    s={s}
                    onCheck={onCheck}
                  />
                ))}
              </CardsGrid>
            )}
          </TabsContent>
          <TabsContent value="re-evaluation">
            {reEval.length === 0 ? (
              <StateBox
                icon={Inbox}
                title="No re-evaluations"
                description="There are no re-evaluation subjects assigned right now."
              />
            ) : (
              <CardsGrid>
                {reEval.map((s, i) => (
                  <SubjectCard
                    key={`${s.examEvaluatorProfileDetId ?? s.code}-r-${i}`}
                    s={s}
                    onCheck={onCheck}
                  />
                ))}
              </CardsGrid>
            )}
          </TabsContent>
        </>
      )}
    </Tabs>
  );

  const moderatorPanel = (
    <div className="space-y-3">
      {isLoading ? (
        <CardsGrid>
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
          <SubjectCardSkeleton />
        </CardsGrid>
      ) : isError ? (
        <StateBox
          icon={AlertTriangle}
          title="Could not load your subjects"
          description={
            errorMessage ||
            "Something went wrong while fetching your assigned subjects. Please try again."
          }
          action={
            onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : moderatorSubjects.length === 0 ? (
        <StateBox
          icon={Inbox}
          title="No moderator subjects"
          description="You don't have any subjects assigned for moderation yet."
        />
      ) : (
        <CardsGrid>
          {moderatorSubjects.map((s, i) => (
            <SubjectCard
              key={`${s.examEvaluatorProfileDetId ?? s.code}-m-${i}`}
              s={s}
              onCheck={onCheck}
            />
          ))}
        </CardsGrid>
      )}
    </div>
  );

  // Angular: always show Evaluator tab; Moderator tab only when moderatorDetails.length > 0.
  if (!showModeratorTab) {
    return statusTabs;
  }

  return (
    <Tabs
      value={activeRoleTab}
      onValueChange={(v) => {
        if (v === "evaluator" || v === "moderator") onRoleTabChange?.(v);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Role
        </p>
        <TabsList
          className={cn(
            "h-auto w-fit gap-1.5 rounded-2xl border border-border bg-muted p-1.5",
            "[&>[data-state=active]]:border-border [&>[data-state=active]]:bg-card [&>[data-state=active]]:text-foreground [&>[data-state=active]]:shadow-sm",
            "[&>:not([data-state=active])]:text-muted-foreground [&>:not([data-state=active])]:hover:text-foreground",
          )}
        >
          <TabsTrigger
            value="evaluator"
            className="rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Evaluator
            <span className="ml-2 text-xs tabular-nums opacity-70">
              {(fresh.length + reEval.length).toString().padStart(2, "0")}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="moderator"
            className="rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Moderator
            <span className="ml-2 text-xs tabular-nums opacity-70">
              {moderatorSubjects.length.toString().padStart(2, "0")}
            </span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="evaluator">{statusTabs}</TabsContent>
      <TabsContent value="moderator">{moderatorPanel}</TabsContent>
    </Tabs>
  );
}
