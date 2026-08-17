"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { DrillNode, DrillSpec } from "./vc-chart-utils";
import {
  formatInrScale,
  formatInrTooltip,
  VC_CHART_COLORS,
} from "./vc-chart-utils";

type Props = {
  roots: DrillNode[];
  spec: DrillSpec;
  height?: number;
};

export function DrilldownColumnChart({ roots, spec, height = 260 }: Props) {
  const [path, setPath] = useState<DrillNode[]>([]);

  const currentNodes =
    path.length === 0 ? roots : (path[path.length - 1]?.children ?? []);
  const xTitle =
    currentNodes[0]?.title ??
    spec.category[Math.min(path.length, spec.category.length - 1)] ??
    spec.xAxisTitle;
  const canDrill = currentNodes.some((n) => n.children.length > 0);

  const chartData = useMemo(
    () =>
      currentNodes.map((node, index) => {
        const row: Record<string, string | number> = {
          name: node.name,
          __id: node.id,
          __color: VC_CHART_COLORS[index % VC_CHART_COLORS.length],
        };
        for (const col of spec.columns) {
          row[col] = node.values[col] ?? 0;
        }
        return row;
      }),
    [currentNodes, spec.columns],
  );

  function drillInto(id: string) {
    const node = currentNodes.find((n) => n.id === id);
    if (!node || node.children.length === 0) return;
    setPath((prev) => [...prev, node]);
  }

  function drillUp() {
    setPath((prev) => prev.slice(0, -1));
  }

  if (roots.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No Records Found
      </p>
    );
  }

  const legendItems = spec.showLegend
    ? [...spec.columns]
        .map((col, i) => ({
          col,
          title: spec.columnsTitle[i] ?? col,
          color: spec.colors[i] ?? VC_CHART_COLORS[i % VC_CHART_COLORS.length],
        }))
        .reverse()
    : [];

  return (
    <div className="overflow-hidden">
      {path.length > 0 ? (
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 flex-wrap items-center text-xs text-muted-foreground">
            {path.map((node) => (
              <span key={node.id} className="inline-flex items-center">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{node.name}</span>
              </span>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2"
            onClick={drillUp}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="flex min-w-0">
        <div
          className="flex w-8 shrink-0 items-center justify-center self-stretch"
          aria-hidden
        >
          <span
            className="max-h-full text-[13px] leading-none text-foreground"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {spec.yAxisTitle}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "gray", fontWeight: 700, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                width={44}
                tickFormatter={formatInrScale}
                tick={{ fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatInrTooltip(Number(value ?? 0)),
                  spec.columnsTitle[spec.columns.indexOf(String(name))] ??
                    String(name),
                ]}
              />
              {spec.columns.map((col, i) => (
                <Bar
                  key={col}
                  dataKey={col}
                  name={col}
                  fill={
                    spec.colors[i] ??
                    VC_CHART_COLORS[i % VC_CHART_COLORS.length]
                  }
                  stackId={spec.stacked ? "stack" : undefined}
                  maxBarSize={60}
                  cursor={canDrill ? "pointer" : undefined}
                  onClick={(entry) => {
                    const id = String(
                      (entry as { payload?: { __id?: string } }).payload
                        ?.__id ?? "",
                    );
                    if (id) drillInto(id);
                  }}
                >
                  {spec.colorByPoint
                    ? chartData.map((row) => (
                        <Cell
                          key={String(row.__id)}
                          fill={String(row.__color)}
                        />
                      ))
                    : null}
                </Bar>
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-0.5 text-center text-[13px] font-bold text-gray-500">
        {xTitle}
      </p>

      {legendItems.length > 0 ? (
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pb-1">
          {legendItems.map((item) => (
            <li
              key={item.col}
              className="flex items-center gap-1.5 text-[13px] text-foreground"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
