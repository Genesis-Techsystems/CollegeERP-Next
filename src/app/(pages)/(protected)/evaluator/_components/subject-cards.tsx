'use client'

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight, Inbox, AlertTriangle } from "lucide-react";

export type SubjectCard = {
  code: string;
  name: string;
  course: string;
  lastDate: string;
  reEvaluation: boolean;
  assigned: number;
  evaluated: number | null;
  due: number | null;
  // Carried through to the assigned-scripts view (populated from the live API).
  examEvaluatorProfileId?: string | number | null;
  examEvaluatorProfileDetId?: string | number | null;
  subjectName?: string;
};

function SubjectCard({ s, onCheck }: { s: SubjectCard; onCheck: (s: SubjectCard) => void }) {
  const inProgress = s.due !== null && s.due > 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{s.name}</h3>
          <p className="mt-0.5 font-mono text-xs tracking-wider text-primary-foreground/60">
            {s.code.replace(/-\d+$/, "")}
          </p>
        </div>
        <div className="rounded border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            {inProgress ? "In Progress" : "Complete"}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Course</p>
            <p className="mt-0.5 font-semibold text-foreground">{s.course}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Evaluation Deadline</p>
            <p className="mt-0.5 font-semibold text-foreground">{s.lastDate}</p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-3 overflow-hidden rounded-xl border border-border">
          <div className="border-r border-border bg-muted/50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">Assigned</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.assigned}</p>
          </div>
          <div className="border-r border-border bg-primary-soft/40 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-tight text-primary">Evaluated</p>
            <p className="mt-1 text-2xl font-bold text-primary">{s.evaluated ?? "-"}</p>
          </div>
          <div className="bg-warning/10 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-tight text-warning">Due</p>
            <p className="mt-1 text-2xl font-bold text-warning">{s.due ?? "-"}</p>
          </div>
        </div>
        <Button
          onClick={() => onCheck(s)}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Check Paper
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SubjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-primary/80 p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 bg-primary-foreground/20" />
          <Skeleton className="h-3 w-24 bg-primary-foreground/20" />
        </div>
        <Skeleton className="h-6 w-20 bg-primary-foreground/20" />
      </div>
      <div className="p-6">
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="mb-6 h-20 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function CardsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
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
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SubjectCards({
  subjects = [],
  onCheck,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
}: {
  subjects?: SubjectCard[];
  onCheck: (s: SubjectCard) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const fresh = subjects.filter((s) => !s.reEvaluation);
  const reEval = subjects.filter((s) => s.reEvaluation);

  return (
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
          description={errorMessage || "Something went wrong while fetching your assigned subjects. Please try again."}
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
                  <SubjectCard key={`${s.examEvaluatorProfileDetId ?? s.code}-${i}`} s={s} onCheck={onCheck} />
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
                  <SubjectCard key={`${s.examEvaluatorProfileDetId ?? s.code}-${i}`} s={s} onCheck={onCheck} />
                ))}
              </CardsGrid>
            )}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}