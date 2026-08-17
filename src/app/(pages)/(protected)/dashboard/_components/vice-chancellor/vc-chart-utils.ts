import type { VcDashRow } from "@/services";

export const VC_CHART_COLORS = ["#f2726f", "#29c3be", "#5d62b5"] as const;

export type DrillNode = {
  id: string;
  name: string;
  title: string;
  values: Record<string, number>;
  children: DrillNode[];
};

export type DrillSpec = {
  category: string[];
  categoryName: string[];
  categoryId: string[];
  columns: string[];
  columnsTitle: string[];
  colors: string[];
  valueMode: "suffix" | "direct";
  stacked: boolean;
  colorByPoint: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
  showLegend: boolean;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Angular Highcharts y-axis: Cr / Lac. */
export function formatInrScale(value: number): string {
  const val = Math.abs(value);
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(0)} Cr`;
  if (val >= 100_000) return `${(val / 100_000).toFixed(0)} Lac`;
  return String(Math.round(val));
}

export function formatInrTooltip(value: number): string {
  return value.toLocaleString("en-IN");
}

/**
 * Angular `processData` + nested parent keys — District → College → …
 */
export function buildDrillTree(rows: VcDashRow[], spec: DrillSpec): DrillNode[] {
  const roots: DrillNode[] = [];
  const index = new Map<string, DrillNode>();

  for (const record of rows) {
    let parentKey = "";
    let siblings = roots;
    spec.category.forEach((title, i) => {
      const pk = String(record[spec.categoryId[i]] ?? "");
      const key = `${parentKey}${pk}:`;
      let node = index.get(key);
      if (!node) {
        node = {
          id: key,
          name: String(record[spec.categoryName[i]] ?? ""),
          title,
          values: Object.fromEntries(spec.columns.map((c) => [c, 0])),
          children: [],
        };
        index.set(key, node);
        siblings.push(node);
      }
      for (const col of spec.columns) {
        const raw =
          spec.valueMode === "suffix"
            ? record[`${col}_amount`]
            : record[col];
        node.values[col] += num(raw);
      }
      parentKey = key;
      siblings = node.children;
    });
  }
  return roots;
}

export type AreaCollegeFilterState = {
  areas: string[];
  collegesByArea: Record<string, string[]>;
};

export function buildAreaCollegeFilters(
  rows: VcDashRow[],
): AreaCollegeFilterState {
  const collegesByArea: Record<string, string[]> = { ALL: ["ALL"] };
  const areaSet = new Set<string>(["ALL"]);

  for (const record of rows) {
    const area = String(record.district_name ?? "");
    const college = String(record.college_shortname ?? "");
    if (!area) continue;
    areaSet.add(area);
    if (!collegesByArea[area]) collegesByArea[area] = ["ALL"];
    if (college && !collegesByArea[area].includes(college)) {
      collegesByArea[area].push(college);
    }
  }

  return { areas: Array.from(areaSet), collegesByArea };
}

export function filterByAreaCollege(
  rows: VcDashRow[],
  area: string,
  college: string,
): VcDashRow[] {
  if (area === "ALL") return rows;
  if (college === "ALL") {
    return rows.filter((r) => String(r.district_name ?? "") === area);
  }
  return rows.filter(
    (r) =>
      String(r.district_name ?? "") === area &&
      String(r.college_shortname ?? "") === college,
  );
}
