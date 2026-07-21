'use client'

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "warning" | "info" | "danger";
};

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  primary: "text-primary",
  warning: "text-[oklch(0.78_0.14_75)]",
  info: "text-[oklch(0.65_0.15_240)]",
  danger: "text-[oklch(0.65_0.22_25)]",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "primary" }: Props) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className={`rounded-full bg-primary/10 p-2 ${toneMap[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}