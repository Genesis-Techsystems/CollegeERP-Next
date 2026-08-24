"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/common/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormFieldVariantContext } from "@/common/components/forms";
import { loadStudentCounselorMappings, pickProfileCell } from "@/services";
import { formatProfileDate } from "./profile-utils";
import { PROFILE_TD, PROFILE_TH, ProfileEmptyRow } from "./profile-table";

type AnyRow = Record<string, unknown>;

const SEM_TAB_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[12px] whitespace-nowrap text-[#333] data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46] data-[state=active]:text-[#333] data-[state=active]:shadow-none";

function meetingValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

function formatMeetingDate(value: unknown): string {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return formatProfileDate(value);
}

function counselorActivities(mapping: AnyRow): AnyRow[] {
  const acts = mapping.counselorActivityDTOs ?? mapping.counselorActivities;
  return Array.isArray(acts) ? (acts as AnyRow[]) : [];
}

function counselorMappingId(mapping: AnyRow): number {
  const id =
    mapping.counselorId ?? mapping.counselor_id ?? mapping.counselorMappingId;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function counselorOptionLabel(mapping: AnyRow): string {
  const name = meetingValue(mapping, [
    "empFirstName",
    "employeeName",
    "counselorName",
    "staffName",
  ]);
  const empNo = meetingValue(mapping, [
    "empNumber",
    "employeeNumber",
    "emp_number",
  ]);
  const from = formatMeetingDate(mapping.fromDate ?? mapping.from_date);
  const to = formatMeetingDate(mapping.toDate ?? mapping.to_date);
  const parts = [name !== "—" ? name : "Counselor"];
  if (empNo !== "—") parts.push(`(${empNo})`);
  if (from !== "—" || to !== "—") parts.push(`(${from} - ${to})`);
  return parts.join(" ");
}

function activityStatusCode(row: AnyRow): string {
  return String(
    row.activityStatusCode ?? row.activity_status_code ?? "",
  ).toUpperCase();
}

function dashCell(value: string): string {
  return value && value !== "—" ? value : " - ";
}

function MeetingsTable({
  rows,
  dateKey,
  emptyMessage,
}: {
  rows: AnyRow[];
  dateKey: "conducted" | "scheduled";
  emptyMessage: string;
}) {
  const dateKeys =
    dateKey === "scheduled"
      ? [
          "nextScheduledActivityDate",
          "next_scheduled_activity_date",
          "scheduleDate",
          "scheduledDate",
        ]
      : ["activityDate", "activity_date", "meetingDate", "counselingDate"];

  return (
    <div className="overflow-x-auto p-2.5">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${PROFILE_TH} w-[3%]`}>SI.No</th>
            <th className={PROFILE_TH}>
              {dateKey === "scheduled" ? "Schedule Date" : "Activity Date"}
            </th>
            <th className={PROFILE_TH}>Activity Type</th>
            <th className={PROFILE_TH}>Attendee</th>
            <th className={PROFILE_TH}>Relationship</th>
            <th className={PROFILE_TH}>Discussion Points</th>
            <th className={PROFILE_TH}>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <ProfileEmptyRow colSpan={7} message={emptyMessage} />
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${meetingValue(row, ["activityTypeName", "activity_type_name"])}-${index}`}
                className={index % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
              >
                <td className={PROFILE_TD}>{index + 1}</td>
                <td className={PROFILE_TD}>
                  {formatMeetingDate(dateKeys.map((k) => row[k]).find(Boolean))}
                </td>
                <td className={PROFILE_TD}>
                  {meetingValue(row, [
                    "activityTypeName",
                    "activity_type_name",
                    "activityName",
                  ])}
                </td>
                <td className={PROFILE_TD}>
                  {dashCell(
                    meetingValue(row, [
                      "attendeesName",
                      "attendees_name",
                      "attendeeName",
                    ]),
                  )}
                </td>
                <td className={PROFILE_TD}>
                  {dashCell(meetingValue(row, ["relationship", "relation"]))}
                </td>
                <td className={PROFILE_TD}>
                  {dashCell(
                    meetingValue(row, [
                      "discussionPoints",
                      "discussion_points",
                      "remarks",
                    ]),
                  )}
                </td>
                <td className={PROFILE_TD}>
                  {dashCell(
                    meetingValue(row, ["summary", "notes", "description"]),
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Angular `student-counselor-meetings` — always show select + tabs + table. */
export function CounselorMeetingsTab({
  student,
}: {
  readonly student: AnyRow;
}) {
  const [counselors, setCounselors] = useState<AnyRow[]>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("conducted");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const rows = await loadStudentCounselorMappings(student);
        if (cancelled) return;
        setCounselors(rows);
        if (rows[0]) {
          const id = counselorMappingId(rows[0]);
          setSelectedCounselorId(id > 0 ? String(id) : "0");
        } else {
          setSelectedCounselorId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const counselorOptions = useMemo(
    () =>
      counselors.map((c, index) => {
        const id = counselorMappingId(c) || index + 1;
        return { value: String(id), label: counselorOptionLabel(c) };
      }),
    [counselors],
  );

  const selectedMapping = useMemo(() => {
    if (!selectedCounselorId) return null;
    return (
      counselors.find((c, index) => {
        const id = counselorMappingId(c) || index + 1;
        return String(id) === selectedCounselorId;
      }) ?? null
    );
  }, [counselors, selectedCounselorId]);

  const { conducted, scheduled } = useMemo(() => {
    const activities = selectedMapping
      ? counselorActivities(selectedMapping)
      : [];
    return {
      conducted: activities.filter(
        (a) => activityStatusCode(a) === "COMPLETED",
      ),
      scheduled: activities.filter(
        (a) => activityStatusCode(a) === "SCHEDULED",
      ),
    };
  }, [selectedMapping]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <div className="space-y-3 rounded-sm border-2 border-[#B2EBF2] p-2.5">
      <p className="text-base font-medium text-[#0c51a4]">
        Student Counselor Meetings
      </p>

      <FormFieldVariantContext.Provider value="standard">
        <div className="max-w-[60%]">
          <Select
            label="Counselor"
            required
            value={selectedCounselorId}
            onChange={setSelectedCounselorId}
            options={counselorOptions}
            placeholder="Counselor"
            searchable
            clearable={false}
          />
        </div>
      </FormFieldVariantContext.Provider>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto border border-[#ffcf46]">
          <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
            <TabsTrigger value="conducted" className={SEM_TAB_CLASS}>
              Meetings Conducted
            </TabsTrigger>
            <TabsTrigger value="scheduled" className={SEM_TAB_CLASS}>
              Scheduled Meetings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conducted" className="mt-0">
            <MeetingsTable
              rows={conducted}
              dateKey="conducted"
              emptyMessage="No meetings are conducted."
            />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-0">
            <MeetingsTable
              rows={scheduled}
              dateKey="scheduled"
              emptyMessage="No meetings are scheduled."
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
