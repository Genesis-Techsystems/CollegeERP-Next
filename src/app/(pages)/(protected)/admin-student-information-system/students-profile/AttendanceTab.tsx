"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart } from "@/common/components/charts";
import {
  buildStudentAttendanceView,
  loadStudentProfileTabData,
  pickProfileCell,
} from "@/services";
import { PROFILE_TD, PROFILE_TH } from "./profile-table";

type AnyRow = Record<string, any>;

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key] ?? NaN);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pct(row: AnyRow): string {
  const v = num(row, [
    "Percentage",
    "percentage",
    "attendancePercentage",
    "attendance_percent",
  ]);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

/** Angular `attendance-information` — donut + Attendance Report table */
export function AttendanceTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData("attendance", student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const view = useMemo(() => buildStudentAttendanceView(rows), [rows]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (!view.subjects.length && view.totalClasses <= 0) {
    return null;
  }

  const chartData = [
    { name: "Present", value: view.present || 0, color: "#f59e0b" },
    { name: "Absent", value: view.absent || 0, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative w-full border border-[#e8e8e8] p-2 lg:w-[30%]">
        {chartData.length > 0 ? (
          <>
            <PieChart
              data={chartData}
              donut
              showLabels={false}
              height={320}
              colors={chartData.map((d) => d.color)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-10">
              <span className="text-center text-sm font-semibold text-[#333]">
                Total Classes: {view.totalClasses}
              </span>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No attendance chart data.
          </p>
        )}
      </div>

      <div className="w-full border border-[#e8e8e8] lg:w-[70%]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#ffcf46] bg-[#ecf3ff] px-3 py-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-[#042956]">
            <span className="material-icons text-[18px]" aria-hidden>
              ballot
            </span>
            Attendance Report
          </div>
          <div className="text-sm font-medium text-[#333]">
            Total Attendance : {view.totalAttendancePct.toFixed(2)} %
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={PROFILE_TH}>SI.No</th>
                <th className={PROFILE_TH}>Subject Code</th>
                <th className={PROFILE_TH}>Subject Name</th>
                <th className={PROFILE_TH}>Total Classes</th>
                <th className={PROFILE_TH}>Present Classes</th>
                <th className={PROFILE_TH}>Absent Classes</th>
                <th className={PROFILE_TH}>Percentage %</th>
              </tr>
            </thead>
            <tbody>
              {view.subjects.map((row, i) => (
                <tr
                  key={`${pickProfileCell(row, ["Subject_Code", "subjectCode"])}-${i}`}
                  className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                >
                  <td className={PROFILE_TD}>{i + 1}</td>
                  <td className={PROFILE_TD}>
                    {pickProfileCell(row, [
                      "Subject_Code",
                      "subjectCode",
                      "subject_code",
                    ])}
                  </td>
                  <td className={PROFILE_TD}>
                    {pickProfileCell(row, [
                      "Subject_name",
                      "subjectName",
                      "subject_name",
                    ])}
                  </td>
                  <td className={PROFILE_TD}>
                    {num(row, [
                      "Total_classes",
                      "totalClasses",
                      "total_classes",
                    ])}
                  </td>
                  <td className={PROFILE_TD}>
                    {num(row, ["Present_classes", "present", "presentCount"])}
                  </td>
                  <td className={PROFILE_TD}>
                    {num(row, ["Absent_classes", "absent", "absentCount"])}
                  </td>
                  <td className={PROFILE_TD}>{pct(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
