"use client";

import { useEffect, useState } from "react";
import { loadStudentProfileTabData, pickProfileCell } from "@/services";
import { formatProfileDate } from "./profile-utils";
import { PROFILE_TD, PROFILE_TH } from "./profile-table";

type AnyRow = Record<string, unknown>;

function isRegistered(row: AnyRow): boolean {
  const raw =
    row.isRegistered ?? row.is_registered ?? row.registered ?? row.isActive;
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && raw.toLowerCase() === "true") return true;
  return false;
}

/** Angular `student-placements` */
export function PlacementsTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData("placements", student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  return (
    <div className="border border-[#e8e8e8]">
      <div className="border-b-2 border-[#ffcf46] bg-[#ecf3ff] px-3 py-2">
        <p className="text-sm font-medium text-[#042956]">
          Student Placement Details
        </p>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <div className="overflow-x-auto p-2">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={PROFILE_TH}>No.</th>
                <th className={PROFILE_TH}>Company</th>
                <th className={PROFILE_TH}>Placement</th>
                <th className={PROFILE_TH}>Date</th>
                <th className={PROFILE_TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={PROFILE_TD}>
                    —
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                  >
                    <td className={PROFILE_TD}>{i + 1}</td>
                    <td className={PROFILE_TD}>
                      {pickProfileCell(row, [
                        "companyName",
                        "company_name",
                        "organizationName",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      {pickProfileCell(row, [
                        "placementTitle",
                        "placement_title",
                        "plaecmentTitle",
                        "jobRole",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      {formatProfileDate(
                        row.registeredDate ??
                          row.registered_date ??
                          row.placementStartDate ??
                          row.placement_start_date,
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {isRegistered(row) ? (
                        <span className="rounded px-2 py-0.5 text-[11px] font-medium text-[#1bc5bd] bg-[#c9f7f5]">
                          Registered
                        </span>
                      ) : (
                        <span className="rounded px-2 py-0.5 text-[11px] font-medium text-[#ffa800] bg-[#fff4de]">
                          Register
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
