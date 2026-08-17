"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart } from "@/common/components/charts";
import { Select } from "@/common/components/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QK } from "@/lib/query-keys";
import { getApplicationSummaryChart, type VcDashRow } from "@/services";
import { buildAreaCollegeFilters } from "./vc-chart-utils";

const CATEGORIES = ["Admissions", "Applications", "Enquiries"] as const;
const PIE_COLORS = ["#62b58f", "#f2726f", "#bc95df"];

type Props = {
  collegeId: number;
  year: string;
  enabled: boolean;
};

type AreaBucket = {
  [k: string]: number | Record<string, Record<string, number>>;
  college: Record<string, Record<string, number>>;
};

function emptyCounts(): Record<string, number> {
  return { Admissions: 0, Applications: 0, Enquiries: 0 };
}

function processApplicationData(rows: VcDashRow[]) {
  const data: Record<string, AreaBucket | Record<string, number>> = {};
  for (const record of rows) {
    const area = String(record.district_name ?? "");
    const college = String(record.college_shortname ?? "");
    const type = String(record.Name ?? "");
    const val = Number(record.Count ?? 0) || 0;

    if (!data.ALL) data.ALL = emptyCounts();
    const all = data.ALL as Record<string, number>;
    all[type] = (all[type] ?? 0) + val;

    if (!data[area]) {
      data[area] = { ...emptyCounts(), college: {} } as AreaBucket;
    }
    const bucket = data[area] as AreaBucket;
    bucket[type] = Number(bucket[type] ?? 0) + val;
    if (!bucket.college[college]) bucket.college[college] = emptyCounts();
    bucket.college[college][type] = (bucket.college[college][type] ?? 0) + val;
  }
  return data;
}

export function AdmissionsPieChart({ collegeId, year, enabled }: Props) {
  const [area, setArea] = useState("ALL");
  const [college, setCollege] = useState("ALL");

  const q = useQuery({
    queryKey: QK.vcDashboard.chart("application-summary", collegeId, year),
    queryFn: () => getApplicationSummaryChart(collegeId, year),
    enabled,
  });

  const processed = useMemo(
    () => processApplicationData(q.data ?? []),
    [q.data],
  );
  const filters = useMemo(
    () => buildAreaCollegeFilters(q.data ?? []),
    [q.data],
  );

  useEffect(() => {
    setArea("ALL");
    setCollege("ALL");
  }, [year, collegeId]);

  const collegeOptions = filters.collegesByArea[area] ?? ["ALL"];

  const sliceSource = useMemo(() => {
    if (area === "ALL" || college === "ALL") {
      return (processed[area] ?? processed.ALL) as
        | Record<string, number>
        | undefined;
    }
    const bucket = processed[area] as AreaBucket | undefined;
    return bucket?.college?.[college];
  }, [processed, area, college]);

  const pieData = CATEGORIES.map((name, i) => ({
    name,
    value: Number(sliceSource?.[name] ?? 0),
    color: PIE_COLORS[i],
  }));

  if (q.isLoading) return <Skeleton className="h-[280px] w-full" />;
  if (!q.data?.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No Records Found
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        <div className="w-[160px]">
          <Select
            label="Area"
            value={area}
            onChange={(v) => {
              setArea(v ?? "ALL");
              setCollege("ALL");
            }}
            options={filters.areas.map((a) => ({ value: a, label: a }))}
            searchable={false}
            clearable={false}
          />
        </div>
        <div className="w-[160px]">
          <Select
            label="College"
            value={college}
            onChange={(v) => setCollege(v ?? "ALL")}
            options={collegeOptions.map((c) => ({ value: c, label: c }))}
            searchable={false}
            clearable={false}
          />
        </div>
      </div>
      <PieChart
        data={pieData}
        colors={PIE_COLORS}
        donut
        showLabels={false}
        height={260}
      />
    </div>
  );
}
