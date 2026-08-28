"use client";

import { useMemo } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionContext } from "@/context/SessionContext";
import { useEvaluatorSubjects } from "../_lib/queries";
import type { EvaluatorSubjectRow } from "../_lib/api-types";
import type { SubjectCard } from "./subject-cards";

function formatDeadline(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toSubjectCard(
  row: EvaluatorSubjectRow,
  isValidator = true,
): SubjectCard {
  const code = row.subjectCode != null ? String(row.subjectCode) : "";
  const assigned = row.noOfStudentsAssigned ?? 0;
  return {
    code,
    name: row.subjectName ?? code ?? "Subject",
    course: row.courseName ?? "—",
    lastDate: formatDeadline(row.validityEndDate),
    reEvaluation: !!row.isReEvaluation,
    assigned,
    evaluated: row.noOfEvaluationsCompleted,
    due: row.evaluationsPending,
    rejected: row.rejectedCount ?? null,
    examEvaluatorProfileId: row.examEvaluatorProfileId,
    examEvaluatorProfileDetId: row.examEvaluatorProfileDetId,
    subjectName: row.subjectName ?? undefined,
    isValidator,
    examId: row.examId ?? null,
    maxNoOfEvaluationsAssign: row.maxNoOfEvaluationsAssign ?? null,
    maxNoOfReevaluationsAssign: row.maxNoOfReevaluationsAssign ?? null,
  };
}

/** Angular evaluation-subjects-list card — teal header, colored stats table. */
function AngularSubjectCard({
  subject,
  onCheck,
}: {
  subject: SubjectCard;
  onCheck: (subject: SubjectCard) => void;
}) {
  const code = subject.code ?? "";
  const title = `${subject.name}(${code})`;
  const due =
    subject.assigned != null && subject.evaluated != null
      ? subject.assigned - subject.evaluated
      : subject.due;

  return (
    <div className="overflow-hidden border border-[#ddd] bg-white shadow-sm">
      <h3 className="bg-[#009688] px-3 py-2 text-center text-base font-medium text-white">
        {title}
      </h3>
      <div className="px-3 py-2 text-center text-sm font-medium">
        <p>Course : {subject.course}</p>
        <p>Evaluation Last Date : {subject.lastDate}</p>
        <p>Is Re-Evaluation : {String(subject.reEvaluation)}</p>
      </div>
      <table className="w-full border-collapse border border-[#ddd] text-center text-sm">
        <thead>
          <tr>
            <th className="w-1/3 border border-[#ddd] bg-[#d6d8db] px-2 py-3 font-medium text-black">
              Assigned
            </th>
            <th className="w-1/3 border border-[#ddd] bg-[#c3e6cb] px-2 py-3 font-medium text-black">
              Evaluated
            </th>
            <th className="w-1/3 border border-[#ddd] bg-[#f5c6cb] px-2 py-3 font-medium text-black">
              Due
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#ddd] bg-[#d6d8db] px-2 py-3">
              {subject.assigned ?? "-"}
            </td>
            <td className="border border-[#ddd] bg-[#c3e6cb] px-2 py-3">
              {subject.evaluated ?? "-"}
            </td>
            <td className="border border-[#ddd] bg-[#f5c6cb] px-2 py-3">
              {due ?? "-"}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-center py-3">
        <Button
          type="button"
          className="bg-[#009688] text-white hover:bg-[#00897b]"
          onClick={() => onCheck(subject)}
        >
          Check Paper
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
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
    <div className="flex flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-card px-6 py-16 text-center">
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

/**
 * Chief Evaluator home — Angular Moderator Dashboard parity (evaluation-subjects-list).
 * No View Type / Role / Status tabs; shows moderator-assigned subjects as simple cards.
 */
export function ChiefEvaluatorDashboard({
  onOpenSubject,
}: {
  onOpenSubject?: (subject: SubjectCard) => void;
}) {
  const { user } = useSessionContext();
  const userId = user?.userId != null ? String(user.userId) : undefined;
  const { data, isLoading, isError, error, refetch } =
    useEvaluatorSubjects(userId);

  const subjects = useMemo(() => {
    const moderator = (data?.moderator ?? [])
      .filter((row) => row.noOfStudentsAssigned != null)
      .map((row) => toSubjectCard(row, true));
    if (moderator.length > 0) return moderator;

    const all = [
      ...(data?.evaluation ?? []),
      ...(data?.reEvaluation ?? []),
      ...(data?.moderator ?? []),
    ].filter((row) => row.noOfStudentsAssigned != null);
    return all.map((row) =>
      toSubjectCard(row, Number(row.evaluatorRoleId) !== 64),
    );
  }, [data]);

  function handleCheck(subject: SubjectCard) {
    if (subject.subjectName) {
      try {
        localStorage.setItem("subjectName", subject.subjectName);
      } catch {
        /* ignore */
      }
    }
    onOpenSubject?.(subject);
  }

  return (
    <div className="space-y-4">
      <div className="-mx-2 -mt-2 border-b-2 border-[#ffcf46] bg-white">
        <div className="inline-flex min-h-8 items-center bg-[#ffcf46] px-5 text-sm font-medium text-[#111]">
          Moderator Dashboard
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64 w-full rounded border" />
          <Skeleton className="h-64 w-full rounded border" />
          <Skeleton className="h-64 w-full rounded border" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load your subjects"
          description={
            error instanceof Error
              ? error.message
              : "Something went wrong while fetching your assigned subjects. Please try again."
          }
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No subjects assigned"
          description="You don't have any subjects assigned for moderation yet. New assignments will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject, index) => (
            <AngularSubjectCard
              key={`${subject.examEvaluatorProfileDetId ?? subject.code}-${index}`}
              subject={subject}
              onCheck={handleCheck}
            />
          ))}
        </div>
      )}
    </div>
  );
}
