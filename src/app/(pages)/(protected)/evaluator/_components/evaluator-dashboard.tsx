'use client'

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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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


// Map a live aggregated API row onto the existing card visual shape.
function toSubjectCard(row: EvaluatorSubjectRow): SubjectCard {
  const code = row.subjectCode != null ? String(row.subjectCode) : "";
  return {
    code,
    name: row.subjectName ?? code ?? "Subject",
    course: row.courseName ?? "—",
    lastDate: formatDeadline(row.validityEndDate),
    // The API does not distinguish fresh vs re-evaluation; treat all as fresh for now.
    reEvaluation: false,
    assigned: row.noOfStudentsAssigned ?? 0,
    evaluated: row.noOfEvaluationsCompleted ?? null,
    due: row.evaluationsPending ?? null,
    examEvaluatorProfileId: row.examEvaluatorProfileId,
    examEvaluatorProfileDetId: row.examEvaluatorProfileDetId,
    subjectName: row.subjectName ?? undefined,
  };
}

function formatDeadline(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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

export function EvaluatorDashboard({ onOpenSubject }: { onOpenSubject?: (s: SubjectCard) => void }) {
  const { user } = useSessionContext();
  const userId = user?.userId != null ? String(user.userId) : undefined;
  const { data, isLoading, isError, error, refetch } = useEvaluatorSubjects(userId);
  const subjects = (data ?? []).map(toSubjectCard);

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
          subjects={subjects}
          onCheck={(s) => onOpenSubject?.(s)}
          isLoading={!!userId && isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </TabsContent>
      <TabsContent value="analysis" className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assigned" value={10} icon={FileText} />
          <StatCard label="Evaluated" value={8} hint="44%" icon={CheckCircle2} />
          <StatCard label="Drafts" value={1} icon={PenLine} tone="warning" />
          <StatCard label="Pending" value={10} icon={Timer} tone="info" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Marks Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marks}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="n" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Evaluation Status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {status.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Evaluations</CardTitle>
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
                        variant="secondary"
                        className={
                          r.status === "draft"
                            ? "bg-[oklch(0.95_0.09_75)] text-[oklch(0.4_0.14_75)]"
                            : "bg-accent text-accent-foreground"
                        }
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