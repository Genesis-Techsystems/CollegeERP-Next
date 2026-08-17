"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { QK } from "@/lib/query-keys";
import type { VcDashRow } from "@/services";
import { DrilldownColumnChart } from "./DrilldownColumnChart";
import { buildDrillTree, type DrillSpec } from "./vc-chart-utils";

type Props = {
  name: string;
  collegeId: number;
  year: string;
  enabled: boolean;
  fetchRows: (collegeId: number, year: string) => Promise<VcDashRow[]>;
  spec: DrillSpec;
};

export function ProcDrilldownChart({
  name,
  collegeId,
  year,
  enabled,
  fetchRows,
  spec,
}: Props) {
  const q = useQuery({
    queryKey: QK.vcDashboard.chart(name, collegeId, year),
    queryFn: () => fetchRows(collegeId, year),
    enabled,
  });

  const roots = useMemo(
    () => buildDrillTree(q.data ?? [], spec),
    [q.data, spec],
  );

  if (q.isLoading) return <Skeleton className="h-[280px] w-full" />;
  return <DrilldownColumnChart roots={roots} spec={spec} />;
}
