"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, CheckCircle2, PenLine, Timer } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { StatCard } from "./stat-card";
import { ChartCard } from "./chart-card";
import { SubjectCards, type SubjectCard } from "./subject-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSessionContext } from "@/context/SessionContext";
import { useEvaluatorSubjects } from "../_lib/queries";
import type { EvaluatorSubjectRow } from "../_lib/api-types";

// Map a live API row onto the card visual shape (Angular evaluation-subjects-list).
function toSubjectCard(
  row: EvaluatorSubjectRow,
  isValidator = false,
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

const marks = [
  { range: "0-20", n: 0 },
  { range: "21-40", n: 2 },
  { range: "41-60", n: 4 },
  { range: "61-80", n: 5 },
  { range: "81-100", n: 0 },
];
const status = [
  { name: "Submitted", value: 7, color: "var(--chart-1)" },
  { name: "Draft", value: 1, color: "var(--chart-2)" },
  { name: "Pending", value: 10, color: "var(--chart-4)" },
];
const rows = [
  { s: "ESE25CS301-0004", sub: "CS301", marks: "38/80", status: "draft" },
  { s: "ESE25CS301-0005", sub: "CS301", marks: "72/80", status: "submitted" },
  { s: "ESE25CS301-0003", sub: "CS301", marks: "72/80", status: "submitted" },
  { s: "ESE25CS302-0001", sub: "CS302", marks: "58/80", status: "submitted" },
  { s: "ESE25CS302-0002", sub: "CS302", marks: "43/80", status: "submitted" },
  { s: "ESE25CS301-0001", sub: "CS301", marks: "62/80", status: "submitted" },
];

export function EvaluatorDashboard({
  onOpenSubject,
  roleTab,
  onRoleTabChange,
}: {
  onOpenSubject?: (s: SubjectCard) => void;
  /** Controlled Evaluator/Moderator tab — restored when returning from answer papers. */
  roleTab?: "evaluator" | "moderator";
  onRoleTabChange?: (tab: "evaluator" | "moderator") => void;
}) {
  const { user } = useSessionContext();
  const searchParams = useSearchParams();
  const userId = user?.userId != null ? String(user.userId) : undefined;
  const { data, isLoading, isError, error, refetch } =
    useEvaluatorSubjects(userId);

  const evaluatorSubjects = useMemo(() => {
    const evaluation = (data?.evaluation ?? []).map((r) =>
      toSubjectCard(r, false),
    );
    const reEvaluation = (data?.reEvaluation ?? []).map((r) =>
      toSubjectCard(r, false),
    );
    return [...evaluation, ...reEvaluation];
  }, [data]);

  const moderatorSubjects = useMemo(
    () => (data?.moderator ?? []).map((r) => toSubjectCard(r, true)),
    [data],
  );

  // Angular: when opened as validator and moderator list exists, default to Moderator tab.
  const isValidatorFlag =
    searchParams.get("isValidator") === "true" ||
    searchParams.get("isValidator") === "1";
  const urlDefaultTab =
    isValidatorFlag && moderatorSubjects.length > 0 ? "moderator" : "evaluator";
  const activeRoleTab = roleTab ?? urlDefaultTab;

  return (
    <Tabs defaultValue="subjects" className="space-y-8">
      <div className="space-y-3">
        <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          View Type
        </p>
        <TabsList
          className={cn(
            "h-auto w-fit gap-1.5 rounded-2xl border border-border bg-muted p-1.5",
            "[&>[data-state=active]]:border-border [&>[data-state=active]]:bg-card [&>[data-state=active]]:text-foreground [&>[data-state=active]]:shadow-sm",
            "[&>:not([data-state=active])]:text-muted-foreground [&>:not([data-state=active])]:hover:text-foreground",
          )}
        >
          <TabsTrigger
            value="subjects"
            className="rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Assigned Subjects
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Analysis
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="subjects" className="space-y-3">
        <SubjectCards
          subjects={evaluatorSubjects}
          moderatorSubjects={moderatorSubjects}
          roleTab={activeRoleTab}
          onRoleTabChange={onRoleTabChange}
          onCheck={(s) => {
            if (s.subjectName) {
              try {
                localStorage.setItem("subjectName", s.subjectName);
              } catch {
                /* ignore */
              }
            }
            onOpenSubject?.(s);
          }}
          isLoading={!!userId && isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </TabsContent>
      <TabsContent value="analysis" className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assigned" value={10} icon={FileText} />
          <StatCard
            label="Evaluated"
            value={8}
            hint="44%"
            icon={CheckCircle2}
          />
          <StatCard label="Drafts" value={1} icon={PenLine} tone="warning" />
          <StatCard label="Pending" value={10} icon={Timer} tone="info" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Marks Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marks}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.92 0.008 255)"
                />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="n" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Status Breakdown">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {status.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Script</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.s}>
                    <TableCell className="font-mono text-xs">{r.s}</TableCell>
                    <TableCell>{r.sub}</TableCell>
                    <TableCell>{r.marks}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "draft" ? "secondary" : "default"}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
