"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, Locate, User, Users } from "lucide-react";
import { Select } from "@/common/components/select";
import { Table, type TableColumn } from "@/common/components/table";
import { Skeleton } from "@/components/ui/skeleton";
import { QK } from "@/lib/query-keys";
import {
  getInventoryStockSummary,
  getLibrarySummary,
  getTransportSummary,
  type VcDashRow,
} from "@/services";
import { buildAreaCollegeFilters, filterByAreaCollege } from "./vc-chart-utils";

function AreaCollegeBar({
  areas,
  colleges,
  area,
  college,
  onArea,
  onCollege,
}: {
  areas: string[];
  colleges: string[];
  area: string;
  college: string;
  onArea: (v: string) => void;
  onCollege: (v: string) => void;
}) {
  if (areas.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-3">
      <div className="w-[160px]">
        <Select
          label="Area"
          value={area}
          onChange={(v) => onArea(v ?? "ALL")}
          options={areas.map((a) => ({ value: a, label: a }))}
          searchable={false}
          clearable={false}
        />
      </div>
      <div className="w-[160px]">
        <Select
          label="College"
          value={college}
          onChange={(v) => onCollege(v ?? "ALL")}
          options={colleges.map((c) => ({ value: c, label: c }))}
          searchable={false}
          clearable={false}
        />
      </div>
    </div>
  );
}

function useAreaCollege(rows: VcDashRow[], year: string, collegeId: number) {
  const [area, setArea] = useState("ALL");
  const [college, setCollege] = useState("ALL");
  const filters = useMemo(() => buildAreaCollegeFilters(rows), [rows]);
  useEffect(() => {
    setArea("ALL");
    setCollege("ALL");
  }, [year, collegeId]);
  const colleges = filters.collegesByArea[area] ?? ["ALL"];
  const filtered = useMemo(
    () => filterByAreaCollege(rows, area, college),
    [rows, area, college],
  );
  return {
    area,
    college,
    setArea: (v: string) => {
      setArea(v);
      setCollege("ALL");
    },
    setCollege,
    areas: filters.areas,
    colleges,
    filtered,
  };
}

type GridProps = {
  collegeId: number;
  year: string;
  enabled: boolean;
};

const LIBRARY_COLS: TableColumn<VcDashRow>[] = [
  { id: "si", label: "SI.No", width: 8, render: (_r, i) => i + 1 },
  { id: "district_name", label: "District", width: 16 },
  { id: "college_shortname", label: "College", width: 16 },
  { id: "Year", label: "Year", width: 12 },
  {
    id: "BookCategory",
    label: "Category",
    width: 16,
    render: (r) => String(r.BookCategory ?? r.category ?? ""),
  },
  { id: "Title", label: "Title", width: 18 },
  {
    id: "Total_Books",
    label: "Total Books",
    width: 14,
    render: (r) => String(r.Total_Books ?? r.TotalBooks ?? ""),
  },
];

const INVENTORY_COLS: TableColumn<VcDashRow>[] = [
  { id: "si", label: "SI.No", width: 10, render: (_r, i) => i + 1 },
  { id: "district_name", label: "District", width: 18 },
  { id: "college_shortname", label: "College", width: 18 },
  { id: "Category", label: "Category", width: 18 },
  { id: "TotalItems", label: "Total Items", width: 16 },
  { id: "TotalCost", label: "Total Cost", width: 20 },
];

export function LibrarySummaryGrid({ collegeId, year, enabled }: GridProps) {
  const q = useQuery({
    queryKey: QK.vcDashboard.chart("library", collegeId, year),
    queryFn: () => getLibrarySummary(collegeId, year),
    enabled,
  });
  const f = useAreaCollege(q.data ?? [], year, collegeId);
  if (q.isLoading) return <Skeleton className="h-[240px] w-full" />;
  return (
    <div>
      <AreaCollegeBar
        areas={f.areas}
        colleges={f.colleges}
        area={f.area}
        college={f.college}
        onArea={f.setArea}
        onCollege={f.setCollege}
      />
      <Table
        rows={f.filtered}
        columns={LIBRARY_COLS}
        pageSize={5}
        density="compact"
        emptyText="No Records Found"
      />
    </div>
  );
}

export function InventoryStockSummary({ collegeId, year, enabled }: GridProps) {
  const q = useQuery({
    queryKey: QK.vcDashboard.chart("inventory", collegeId, year),
    queryFn: () => getInventoryStockSummary(collegeId, year),
    enabled,
  });
  const f = useAreaCollege(q.data ?? [], year, collegeId);
  if (q.isLoading) return <Skeleton className="h-[240px] w-full" />;
  return (
    <div>
      <AreaCollegeBar
        areas={f.areas}
        colleges={f.colleges}
        area={f.area}
        college={f.college}
        onArea={f.setArea}
        onCollege={f.setCollege}
      />
      <Table
        rows={f.filtered}
        columns={INVENTORY_COLS}
        pageSize={5}
        density="compact"
        emptyText="No Records Found"
      />
    </div>
  );
}

function StatTile({
  value,
  label,
  color,
  icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center bg-white px-3 py-4 text-center shadow-sm"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div className="text-[30px] font-light leading-[60px]">{value}</div>
      <div className="mb-1">{icon}</div>
      <div className="text-sm text-[#656565]">{label}</div>
    </div>
  );
}

export function TransportSummary({ collegeId, year, enabled }: GridProps) {
  const q = useQuery({
    queryKey: QK.vcDashboard.chart("transport", collegeId, year),
    queryFn: () => getTransportSummary(collegeId, year),
    enabled,
  });
  const f = useAreaCollege(q.data ?? [], year, collegeId);

  const totals = useMemo(() => {
    let totalBuses = 0;
    let totalRoutes = 0;
    let totalStudents = 0;
    let transportStudents = 0;
    for (const record of f.filtered) {
      const type = String(record.Type ?? "");
      const count = Number(record.Count ?? 0) || 0;
      if (type === "No of Vehicles") totalBuses += count;
      else if (type === "Transport Students") transportStudents += count;
      else if (type === "No of Routes") totalRoutes += count;
      else if (type === "Total Students") totalStudents += count;
    }
    return { totalBuses, totalRoutes, totalStudents, transportStudents };
  }, [f.filtered]);

  if (q.isLoading) return <Skeleton className="h-[240px] w-full" />;

  return (
    <div>
      <AreaCollegeBar
        areas={f.areas}
        colleges={f.colleges}
        area={f.area}
        college={f.college}
        onArea={f.setArea}
        onCollege={f.setCollege}
      />
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          value={totals.totalBuses}
          label="Total Buses"
          color="#f2726f"
          icon={<Bus className="h-5 w-5" style={{ color: "#f2726f" }} />}
        />
        <StatTile
          value={totals.totalRoutes}
          label="Total Routes"
          color="#29c3be"
          icon={<Locate className="h-5 w-5" style={{ color: "#29c3be" }} />}
        />
        <StatTile
          value={totals.transportStudents}
          label="Transported Students"
          color="#5d62b5"
          icon={<Users className="h-5 w-5" style={{ color: "#5d62b5" }} />}
        />
        <StatTile
          value={totals.totalStudents}
          label="Total Students"
          color="#bc95df"
          icon={<User className="h-5 w-5" style={{ color: "#bc95df" }} />}
        />
      </div>
    </div>
  );
}
