'use client'

import { Scale, CheckCircle2, PenLine, AlertTriangle, Flag } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "./stat-card";
import { ChartCard } from "./chart-card";

const modStatus = [
  { name: "Approved", value: 3, color: "var(--chart-1)" },
  { name: "Pending", value: 2, color: "var(--chart-2)" },
  { name: "Modified", value: 3, color: "var(--chart-4)" },
  { name: "Sent Back", value: 1, color: "var(--chart-3)" },
  { name: "Flagged", value: 1, color: "var(--chart-5)" },
];
const perf = [
  { name: "Evaluator 1", scripts: 3, avg: 50 },
  { name: "Evaluator 2", scripts: 1, avg: 72 },
  { name: "Evaluator 3", scripts: 4, avg: 62 },
];

export function ChiefEvaluatorDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pending" value={2} icon={Scale} />
        <StatCard label="Approved" value={3} icon={CheckCircle2} />
        <StatCard label="Modified" value={3} icon={PenLine} tone="warning" />
        <StatCard label="Sent Back" value={1} icon={AlertTriangle} tone="info" />
        <StatCard label="Flagged" value={1} icon={Flag} tone="danger" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Moderation Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={modStatus} dataKey="value" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {modStatus.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Evaluator Performance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perf}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="scripts" name="Scripts" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg" name="Avg Marks" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}