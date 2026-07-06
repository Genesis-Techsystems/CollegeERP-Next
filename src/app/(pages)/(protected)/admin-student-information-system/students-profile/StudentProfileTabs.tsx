"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/common/components/feedback";
import { Table, type TableColumn } from "@/common/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadStudentProfileTabData,
  pickProfileCell,
  type StudentProfileTab,
} from "@/services";
import { loadAngularStudentTimetable } from "@/services/student-timetable";
import { BacklogsTab } from "./BacklogsTab";
import { BooksTab } from "./BooksTab";
import { CounselorMeetingsTab } from "./CounselorMeetingsTab";
import { CurriculumTab } from "./CurriculumTab";
import { ExamResultsTab } from "./ExamResultsTab";
import { FeeDetailsTab } from "./FeeDetailsTab";
import { PlacementsTab } from "./PlacementsTab";
import { ProfileFieldGrid } from "./ProfileFieldGrid";
import { buildFields, formatProfileDate, pickDisplay } from "./profile-utils";

type AnyRow = Record<string, any>;

type MainTab = "general" | "personal" | StudentProfileTab;

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[12px] whitespace-nowrap data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none";

const MAIN_TABS: Array<{ id: MainTab; label: string }> = [
  { id: "general", label: "General Information" },
  { id: "personal", label: "Personal Information" },
  { id: "curriculum", label: "Curriculum" },
  { id: "timetable", label: "Time Table" },
  { id: "attendance", label: "Attendance" },
  { id: "fee", label: "Fee Details" },
  { id: "counselor", label: "Counselor Meetings" },
  { id: "books", label: "Books" },
  { id: "exam_results", label: "Exam Results" },
  { id: "backlogs", label: "Backlogs" },
  { id: "placements", label: "Placements" },
];

function columnsFromRows(
  rows: AnyRow[],
  defs: Array<{ id: string; label: string; keys: string[] }>,
): TableColumn<AnyRow>[] {
  return defs.map((def) => ({
    id: def.id,
    label: def.label,
    render: (row) => pickProfileCell(row, def.keys) || "—",
  }));
}

function TabPanel({
  loading,
  rows,
  columns,
  emptyText,
}: {
  loading: boolean;
  rows: AnyRow[];
  columns: TableColumn<AnyRow>[];
  emptyText: string;
}) {
  if (loading)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  if (!rows.length) return <EmptyState title={emptyText} />;
  return (
    <Table rows={rows} columns={columns} pageSize={10} density="compact" />
  );
}

function GeneralTab({ student }: { student: AnyRow }) {
  const fields = buildFields(
    [
      {
        label: "College",
        keys: ["collegeName", "college_code", "collegeCode"],
      },
      { label: "Course", keys: ["courseName", "course_code", "courseCode"] },
      {
        label: "Course Group",
        keys: ["courseGroupName", "groupCode", "group_code"],
      },
      {
        label: "Course Year - Section",
        keys: ["courseYearName", "course_year_name"],
      },
      { label: "Academic Year", keys: ["academicYear", "academic_year"] },
      { label: "Batch", keys: ["batchName", "batch_name"] },
      { label: "Regulation", keys: ["regulationName", "regulation_name"] },
      {
        label: "Student Category",
        keys: ["studentTypeDisplayName", "studentTypeName"],
      },
    ],
    student,
  );
  const section = pickDisplay(student, ["section"]);
  if (section !== "—") {
    const yearField = fields.find((f) => f.label === "Course Year - Section");
    if (yearField) yearField.value = `${yearField.value} - ${section}`;
  }
  return <ProfileFieldGrid fields={fields} />;
}

function PersonalTab({ student }: { student: AnyRow }) {
  const fields = buildFields(
    [
      { label: "Aadhar Card No.", keys: ["aadharCardNo", "aadhar_card_no"] },
      {
        label: "Date Of Birth",
        keys: ["dateOfBirth", "dob"],
        format: formatProfileDate,
      },
      { label: "SSC No", keys: ["sscNo", "ssc_no"] },
      {
        label: "Qualified Exam Type",
        keys: ["qualifyingCode", "qualifying_code"],
      },
      {
        label: "Qualified HallTicket No.",
        keys: ["entranceHtNo", "entrance_ht_no"],
      },
      { label: "Eamcet Rank", keys: ["eamcetRank", "eamcet_rank"] },
      { label: "Father Name", keys: ["fatherName", "father_name"] },
      {
        label: "Father Mobile No.",
        keys: ["fatherMobileNo", "father_mobile_no"],
      },
      { label: "Father Mail Id", keys: ["fatherEmailId", "father_email_id"] },
      {
        label: "Father Occupation",
        keys: ["fatherOccupation", "father_occupation"],
      },
      { label: "Mother Name", keys: ["motherName", "mother_name"] },
      {
        label: "Mother Mobile No.",
        keys: ["motherMobileNo", "mother_mobile_no"],
      },
      { label: "Mother Mail Id", keys: ["motherEmailId", "mother_email_id"] },
      {
        label: "Mother Occupation",
        keys: ["motherOccupation", "mother_occupation"],
      },
      { label: "Present Address", keys: ["presentAddress", "present_address"] },
      {
        label: "Present State",
        keys: ["presentStateName", "present_state_name"],
      },
      { label: "Present City", keys: ["presentCityName", "present_city_name"] },
      {
        label: "Permanent Address",
        keys: ["permanentAddress", "permanent_address"],
      },
      {
        label: "Permanent State",
        keys: ["permanentStateName", "permanent_state_name"],
      },
      {
        label: "Permanent City",
        keys: ["permanentCityName", "permanent_city_name"],
      },
    ],
    student,
  );
  return <ProfileFieldGrid fields={fields} />;
}

function TimetableTab({ student }: { student: AnyRow }) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const angular = await loadAngularStudentTimetable(student).catch(
          () => null,
        );
        if (cancelled) return;
        if (angular?.weekdays?.length) {
          setTitle(
            angular.dateRangeLabel
              ? `Timetable (${angular.dateRangeLabel})`
              : "Timetable",
          );
          const flat: AnyRow[] = [];
          for (const day of angular.weekdays) {
            for (const timing of day.timings) {
              const batch = timing.subBatches?.[0];
              flat.push({
                day: day.weekdayName ?? timing.weekdayName,
                time: `${timing.startTime ?? ""} – ${timing.endTime ?? ""}`,
                subject:
                  batch?.shortName ??
                  batch?.subjectCode ??
                  timing.classTimingName ??
                  (timing.isBreak ? "Break" : "—"),
                staff: batch?.staffName ?? "—",
                room: batch?.roomName ?? "—",
              });
            }
          }
          setRows(flat);
          return;
        }
        const fallback = await loadStudentProfileTabData("timetable", student);
        setRows(fallback);
        setTitle("Timetable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  return (
    <div className="space-y-3">
      {title ? (
        <p className="text-sm font-medium text-primary">{title}</p>
      ) : null}
      <TabPanel
        loading={loading}
        rows={rows}
        columns={columnsFromRows(rows, [
          { id: "day", label: "Day", keys: ["day", "weekDay", "weekdayName"] },
          { id: "time", label: "Time", keys: ["time", "startTime", "timing"] },
          {
            id: "subject",
            label: "Subject",
            keys: ["subject", "subjectCode", "subjectName"],
          },
          {
            id: "staff",
            label: "Staff",
            keys: ["staff", "staffName", "employeeName"],
          },
          { id: "room", label: "Room", keys: ["room", "roomName"] },
        ])}
        emptyText="No timetable found."
      />
    </div>
  );
}

function DataTab({
  tab,
  student,
  columns,
  emptyText,
}: {
  tab: StudentProfileTab;
  student: AnyRow;
  columns: Array<{ id: string; label: string; keys: string[] }>;
  emptyText: string;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnyRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData(tab, student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, student]);

  return (
    <TabPanel
      loading={loading}
      rows={rows}
      columns={columnsFromRows(rows.length ? rows : [{}], columns)}
      emptyText={emptyText}
    />
  );
}

export function StudentProfileTabs({ student }: { readonly student: AnyRow }) {
  const [activeTab, setActiveTab] = useState<MainTab>("general");

  const renderTab = useCallback(
    (tab: MainTab) => {
      switch (tab) {
        case "general":
          return <GeneralTab student={student} />;
        case "personal":
          return <PersonalTab student={student} />;
        case "curriculum":
          return <CurriculumTab student={student} />;
        case "timetable":
          return <TimetableTab student={student} />;
        case "attendance":
          return (
            <DataTab
              tab="attendance"
              student={student}
              emptyText="No attendance records found."
              columns={[
                {
                  id: "subject",
                  label: "Subject",
                  keys: [
                    "subjectCode",
                    "subjectName",
                    "subject_code",
                    "subject_name",
                  ],
                },
                {
                  id: "conducted",
                  label: "Conducted",
                  keys: [
                    "conductedClasses",
                    "classesConducted",
                    "totalClasses",
                  ],
                },
                {
                  id: "attended",
                  label: "Attended",
                  keys: ["attendedClasses", "classesAttended", "present"],
                },
                {
                  id: "percent",
                  label: "%",
                  keys: [
                    "attendancePercent",
                    "attendance_percentage",
                    "percentage",
                  ],
                },
              ]}
            />
          );
        case "fee":
          return <FeeDetailsTab student={student} />;
        case "counselor":
          return <CounselorMeetingsTab student={student} />;
        case "books":
          return <BooksTab student={student} />;
        case "exam_results":
          return <ExamResultsTab student={student} />;
        case "backlogs":
          return <BacklogsTab student={student} />;
        case "placements":
          return <PlacementsTab student={student} />;
        default:
          return null;
      }
    },
    [student],
  );

  return (
    <div className="app-card overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)}>
        <div className="overflow-x-auto border-b border-border bg-muted/20">
          <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
            {MAIN_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={TAB_TRIGGER_CLASS}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {MAIN_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="m-0 p-4">
            {activeTab === tab.id ? renderTab(tab.id) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
