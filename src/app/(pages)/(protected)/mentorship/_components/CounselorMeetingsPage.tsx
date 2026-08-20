"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil, PlusIcon, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  Select,
  toEmployeeSearchSelectOptions,
} from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { escapeHtml } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { rowIndexGetter } from "@/lib/utils";
import { printHtmlInIframe } from "@/lib/print";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  createCounselorActivities,
  listActiveCollegesForDepartments,
  listCounselorActivitiesForStudent,
  listCounselorActivitiesInDateRange,
  listCounselorStudentsForEmployee,
  listCounselorStudentsInDateRange,
  searchEmployeesForMentorship,
  updateCounselorActivity,
  type MentorshipRow,
} from "@/services";
import type { College } from "@/types/college";
import { MeetingOverviewModal } from "./MeetingOverviewModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";

type MeetingRow = MentorshipRow;

export type CounselorMeetingsMode = "staff" | "admin";

const COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<MeetingRow>,
  activityType: {
    field: "activityTypeCode",
    headerName: "Activity Type",
    minWidth: 120,
  } as ColDef<MeetingRow>,
  nextDate: {
    field: "nextScheduledActivityDate",
    headerName: "Schedule Date",
    minWidth: 130,
  } as ColDef<MeetingRow>,
  attendees: {
    field: "attendeesName",
    headerName: "Attendees Name",
    minWidth: 140,
  } as ColDef<MeetingRow>,
  discussion: {
    field: "discussionPoints",
    headerName: "Discussion Points",
    minWidth: 160,
  } as ColDef<MeetingRow>,
  summary: {
    field: "summary",
    headerName: "Summary",
    minWidth: 140,
  } as ColDef<MeetingRow>,
  activityDate: {
    field: "activityDate",
    headerName: "Activity Date",
    minWidth: 120,
  } as ColDef<MeetingRow>,
  status: {
    field: "activityStatusCode",
    headerName: "Status",
    minWidth: 100,
  } as ColDef<MeetingRow>,
  actions: {
    headerName: "Actions",
    minWidth: 180,
    width: 180,
    flex: 0,
  } as ColDef<MeetingRow>,
};

function readStorageNum(key: string): number {
  return Number(readStorage(key) || 0) || 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function toYmd(d: Date | null): string {
  if (!d) return "";
  // Angular `momentFormatYMD` — counselor endpoints reject hyphenated dates with a 500.
  return format(d, "yyyy/MM/dd");
}

function activityStatus(row: MeetingRow | undefined): string {
  return String(row?.activityStatusCode ?? "").toUpperCase();
}

function meetingStatusBadgeClass(code: string): string {
  switch (code) {
    case "SCHEDULED":
      return "inline-block rounded px-2 py-0.5 text-xs font-semibold text-black bg-[#ffff00]";
    case "CANCELLED":
      return "inline-block rounded px-2 py-0.5 text-xs font-semibold text-white bg-[#ff7f7f] line-through";
    case "COMPLETED":
      return "inline-block rounded px-2 py-0.5 text-xs font-semibold text-black bg-[#4caf50]";
    default:
      return "text-sm";
  }
}

function statusCellRenderer(p: ICellRendererParams<MeetingRow>) {
  const code = activityStatus(p.data);
  if (!code) return "—";
  return <span className={meetingStatusBadgeClass(code)}>{code}</span>;
}

function emptyDashRenderer(
  p: ICellRendererParams<MeetingRow>,
  field: keyof MeetingRow,
) {
  const v = p.data?.[field];
  return v == null || String(v).trim() === "" ? "—" : String(v);
}

function attendeesRenderer(p: ICellRendererParams<MeetingRow>) {
  return emptyDashRenderer(p, "attendeesName");
}

function discussionRenderer(p: ICellRendererParams<MeetingRow>) {
  return emptyDashRenderer(p, "discussionPoints");
}

function summaryRenderer(p: ICellRendererParams<MeetingRow>) {
  return emptyDashRenderer(p, "summary");
}

function formatScheduleDateValue(v: unknown): string {
  if (v == null || String(v).trim() === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return format(d, "MMM d, yyyy");
}

function formatActivityDateValue(v: unknown): string {
  if (v == null || String(v).trim() === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return format(d, "MMM d, yyyy");
}

function scheduleDateRenderer(p: ICellRendererParams<MeetingRow>) {
  return formatScheduleDateValue(p.data?.nextScheduledActivityDate);
}

function activityDateRenderer(p: ICellRendererParams<MeetingRow>) {
  return formatActivityDateValue(p.data?.activityDate);
}

function printStatusHtml(code: string): string {
  const normalized = code.toUpperCase();
  const label = escapeHtml(normalized || "—");
  if (normalized === "SCHEDULED") {
    return `<span style="background:#ffff00;color:#000;padding:2px 8px;font-weight:600;display:inline-block;">${label}</span>`;
  }
  if (normalized === "CANCELLED") {
    return `<span style="background:#ff7f7f;color:#fff;padding:2px 8px;font-weight:600;text-decoration:line-through;display:inline-block;">${label}</span>`;
  }
  if (normalized === "COMPLETED") {
    return `<span style="background:#4caf50;color:#000;padding:2px 8px;font-weight:600;display:inline-block;">${label}</span>`;
  }
  return label;
}

function cellText(v: unknown): string {
  return v == null || String(v).trim() === "" ? "—" : String(v);
}

type CounselorMeetingsPageProps = {
  mode: CounselorMeetingsMode;
  title: string;
  filterTitle?: string;
};

const DATE_FILTER_COL = "md:col-span-3";
const COLLEGE_FILTER_COL = "md:col-span-2";
const EMPLOYEE_FILTER_COL = "md:col-span-4";
const STUDENT_FILTER_COL = "md:col-span-4";
const GET_LIST_COL = "md:col-span-2";

function meetingActionDivider() {
  return (
    <span
      className="select-none px-0.5 text-[13px] font-normal leading-none text-[#0c51a4]"
      aria-hidden
    >
      |
    </span>
  );
}

function makeActionsRenderer(
  onEdit: (row: MeetingRow) => void,
  onMeeting: (row: MeetingRow) => void,
  onOverview: (row: MeetingRow) => void,
) {
  return (p: ICellRendererParams<MeetingRow>) => {
    const row = p.data;
    if (!row) return null;
    const scheduled = activityStatus(row) === "SCHEDULED";

    const viewButton = (
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border-0 bg-transparent text-black/45 hover:bg-black/5"
        aria-label="View meeting details"
        title="View meeting details"
        onClick={(e) => {
          e.stopPropagation();
          onOverview(row);
        }}
      >
        <Eye className="h-4 w-4" strokeWidth={2} />
      </button>
    );

    if (!scheduled) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          {viewButton}
        </div>
      );
    }

    return (
      <div className="app-table-row-actions inline-flex items-center gap-0">
        <button
          type="button"
          className="app-table-action-edit inline-flex h-7 w-7 items-center justify-center rounded-sm text-[#0c51a4] hover:bg-[#0c51a4]/10"
          aria-label="Edit scheduled meeting"
          title="Edit scheduled meeting"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        {meetingActionDivider()}
        <button
          type="button"
          className="inline-flex h-7 items-center border-0 bg-transparent px-0.5 text-[13px] font-bold leading-none text-[#0c51a4] hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onMeeting(row);
          }}
        >
          Meeting
        </button>
        {meetingActionDivider()}
        {viewButton}
      </div>
    );
  };
}

export function CounselorMeetingsPage({
  mode,
  title,
  filterTitle,
}: Readonly<CounselorMeetingsPageProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryStudentId = Number(searchParams.get("studentId") || 0) || null;
  const queryCollegeId = Number(searchParams.get("collegeId") || 0) || null;
  const queryEmployeeId = Number(searchParams.get("employeeId") || 0) || null;
  const queryEmpN = searchParams.get("empN")?.trim() || "";

  const staffCollegeId = readStorageNum("collegeId");
  const staffEmployeeId = readStorageNum("employeeId");

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(
    mode === "staff" ? staffCollegeId || null : queryCollegeId,
  );
  const [employeeId, setEmployeeId] = useState<number | null>(
    mode === "staff" ? staffEmployeeId || null : queryEmployeeId,
  );
  const [employees, setEmployees] = useState<MentorshipRow[]>([]);
  const [employeeSearching, setEmployeeSearching] = useState(false);
  const [allStudents, setAllStudents] = useState<MentorshipRow[]>([]);
  const [displayStudents, setDisplayStudents] = useState<MentorshipRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listReady, setListReady] = useState(false);
  const [counselorId, setCounselorId] = useState<number | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MeetingRow | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewRow, setOverviewRow] = useState<MeetingRow | null>(null);

  useEffect(() => {
    if (mode === "admin") {
      void listActiveCollegesForDepartments()
        .then(setColleges)
        .catch(() => setColleges([]));
    }
  }, [mode]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  );

  const employeeSelectOptions = useMemo(
    () => toEmployeeSearchSelectOptions(employees),
    [employees],
  );

  function setStudentList(list: MentorshipRow[]) {
    setAllStudents(list);
    setDisplayStudents(list);
  }

  const onStudentSearch = useCallback(
    (term: string) => {
      const q = term.trim().toLowerCase();
      if (!q) {
        setDisplayStudents(allStudents);
        return;
      }
      setDisplayStudents(
        allStudents.filter((s) => {
          const name = String(s.studentName ?? s.firstName ?? "").toLowerCase();
          const roll = String(
            s.rollNumber ?? s.hallticketNumber ?? "",
          ).toLowerCase();
          return name.includes(q) || roll.includes(q);
        }),
      );
    },
    [allStudents],
  );

  const selectedStudent = useMemo(
    () => allStudents.find((s) => Number(s.studentId) === studentId) ?? null,
    [allStudents, studentId],
  );

  const resolveCounselorId = useCallback(
    (sid: number | null, activities: MeetingRow[]): number | null => {
      if (!sid) return null;
      const fromStudent = Number(
        allStudents.find((s) => Number(s.studentId) === sid)?.counselorId ?? 0,
      );
      if (fromStudent) return fromStudent;
      const fromActivity = Number(activities[0]?.counselorId ?? 0);
      return fromActivity || null;
    },
    [allStudents],
  );

  const loadStudentsForStaff = useCallback(async (cid: number, eid: number) => {
    try {
      const list = await listCounselorStudentsForEmployee(cid, eid);
      setStudentList(list);
    } catch (e) {
      toastError(getErrorMessage(e));
      setStudentList([]);
    }
  }, []);

  useEffect(() => {
    if (mode === "staff" && staffCollegeId && staffEmployeeId) {
      void loadStudentsForStaff(staffCollegeId, staffEmployeeId);
    }
  }, [mode, staffCollegeId, staffEmployeeId, loadStudentsForStaff]);

  const loadMeetings = useCallback(
    async (opts?: { sid?: number; silentEmpty?: boolean }) => {
      const cid = mode === "staff" ? staffCollegeId : collegeId;
      const eid = mode === "staff" ? staffEmployeeId : employeeId;
      const sid = opts?.sid ?? studentId;
      if (!cid || !eid || !sid) {
        toastError("Please select a student");
        return;
      }
      setLoading(true);
      setRows([]);
      setListReady(true);
      try {
        let activities: MeetingRow[] = [];
        let mappingCounselorId: number | null = null;
        if (mode === "admin") {
          const from = toYmd(fromDate);
          const to = toYmd(toDate);
          if (!from || !to) {
            toastError("Please select from and to dates");
            return;
          }
          const result = await listCounselorActivitiesInDateRange({
            collegeId: cid,
            employeeId: eid,
            studentId: sid,
            fromDate: from,
            toDate: to,
          });
          activities = result.activities;
          mappingCounselorId = result.counselorId;
        } else {
          const result = await listCounselorActivitiesForStudent(cid, eid, sid);
          activities = result.activities;
          mappingCounselorId = result.counselorId;
        }
        setRows(activities);
        setCounselorId(
          mappingCounselorId || resolveCounselorId(sid, activities),
        );
        if (activities.length === 0 && !opts?.silentEmpty) {
          toastSuccess("No meetings found for this filter.");
        }
      } catch (e) {
        toastError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [
      mode,
      staffCollegeId,
      staffEmployeeId,
      collegeId,
      employeeId,
      studentId,
      fromDate,
      toDate,
      resolveCounselorId,
    ],
  );

  useEffect(() => {
    if (mode !== "admin" || !queryCollegeId) return;
    void (async () => {
      try {
        // Angular seeds employee via empN search; React Meeting History passes employeeId.
        if (queryEmployeeId) {
          const list = await listCounselorStudentsForEmployee(
            queryCollegeId,
            queryEmployeeId,
          );
          setStudentList(list);
          setEmployeeId(queryEmployeeId);
          if (queryStudentId) {
            setStudentId(queryStudentId);
            await loadMeetings({ sid: queryStudentId, silentEmpty: true });
          }
          return;
        }
        if (queryEmpN.length >= 4) {
          const found = await searchEmployeesForMentorship(
            queryCollegeId,
            queryEmpN,
          );
          setEmployees(found);
          const first = found[0];
          if (first?.employeeId) {
            const eid = Number(first.employeeId);
            setEmployeeId(eid);
            const from = toYmd(fromDate);
            const to = toYmd(toDate);
            if (from && to) {
              const list = await listCounselorStudentsInDateRange({
                collegeId: queryCollegeId,
                employeeId: eid,
                fromDate: from,
                toDate: to,
              });
              setStudentList(list);
              if (queryStudentId) {
                setStudentId(queryStudentId);
                await loadMeetings({ sid: queryStudentId, silentEmpty: true });
              }
            }
          }
        }
      } catch (e) {
        toastError(getErrorMessage(e));
      }
    })();
    // Intentionally seed once from query params (Angular route.queryParams).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/query seed only
  }, [mode, queryCollegeId, queryEmployeeId, queryStudentId, queryEmpN]);

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (!collegeId || q.length < 4) {
      setEmployees([]);
      return;
    }
    setEmployeeSearching(true);
    try {
      const found = await searchEmployeesForMentorship(collegeId, q);
      setEmployees(found);
    } catch (e) {
      toastError(getErrorMessage(e));
      setEmployees([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  async function onEmployeeSelected(eid: number | null) {
    setEmployeeId(eid);
    setStudentId(null);
    setStudentList([]);
    setRows([]);
    setListReady(false);
    setCounselorId(null);
    if (!eid || !collegeId) return;
    if (mode === "admin") {
      const from = toYmd(fromDate);
      const to = toYmd(toDate);
      if (!from || !to) return;
      try {
        const list = await listCounselorStudentsInDateRange({
          collegeId,
          employeeId: eid,
          fromDate: from,
          toDate: to,
        });
        setStudentList(list);
      } catch (e) {
        toastError(getErrorMessage(e));
      }
    }
  }

  function openSchedule() {
    const cid = mode === "staff" ? staffCollegeId : collegeId;
    const mappedCounselorId =
      counselorId ||
      Number(
        allStudents.find((s) => Number(s.studentId) === studentId)
          ?.counselorId ?? 0,
      ) ||
      Number(rows[0]?.counselorId ?? 0) ||
      null;
    if (!cid || !studentId) {
      toastError("Please select a student and load meetings first");
      return;
    }
    if (!mappedCounselorId) {
      toastError("Counselor mapping not found for this student");
      return;
    }
    setCounselorId(mappedCounselorId);
    setEditingRow(null);
    setScheduleOpen(true);
  }

  function openEdit(row: MeetingRow) {
    setEditingRow(row);
    setScheduleOpen(true);
  }

  function openOverview(row: MeetingRow) {
    setOverviewRow(row);
    setOverviewOpen(true);
  }

  function goToMeeting(row: MeetingRow) {
    const cid = mode === "staff" ? staffCollegeId : collegeId;
    const eid = mode === "staff" ? staffEmployeeId : employeeId;
    const sid = studentId ?? (Number(row.studentId ?? 0) || null);
    const student = allStudents.find((s) => Number(s.studentId) === sid);
    const emp =
      employees.find((e) => Number(e.employeeId) === eid) ??
      (mode === "staff"
        ? ({ empNumber: readStorage("empNumber") } as MentorshipRow)
        : undefined);
    const params = new URLSearchParams();
    if (row.counselorActivityId != null) {
      params.set("counselorActivityId", String(row.counselorActivityId));
    }
    if (row.nextScheduledActivityDate != null) {
      params.set(
        "nextScheduledActivityDate",
        format(new Date(String(row.nextScheduledActivityDate)), "yyyy/MM/dd"),
      );
    }
    if (student) {
      params.set(
        "student",
        String(student.studentName ?? student.firstName ?? ""),
      );
    }
    if (sid) params.set("studentId", String(sid));
    if (cid) params.set("collegeId", String(cid));
    if (emp?.empNumber != null) params.set("empN", String(emp.empNumber));
    router.push(`/mentorship/meeting?${params.toString()}`);
  }

  async function onScheduleSaved(payload: MentorshipRow) {
    const activityId = Number(payload.counselorActivityId ?? 0);
    if (activityId > 0) {
      await updateCounselorActivity(activityId, payload);
      toastSuccess("Meeting updated");
    } else {
      const cid = Number(payload.counselorId ?? counselorId ?? 0);
      await createCounselorActivities([
        {
          ...payload,
          counselorId: cid || payload.counselorId,
        },
      ]);
      toastSuccess("Meeting scheduled");
    }
    await loadMeetings({ silentEmpty: true });
  }

  const effectiveCollegeId =
    (mode === "staff" ? staffCollegeId : collegeId) || 0;
  const collegeLogo = useCollegeLogo(
    effectiveCollegeId > 0 ? effectiveCollegeId : null,
  );
  const collegeName = useMemo(() => {
    if (mode === "staff") {
      return (
        readStorage("collegeName") || readStorage("collegeCode") || "College"
      );
    }
    const college = colleges.find((c) => c.collegeId === collegeId);
    return college?.collegeName ?? college?.collegeCode ?? "College";
  }, [mode, colleges, collegeId]);

  const printDataDetails = useMemo(() => {
    const parts: string[] = [];
    if (selectedStudent) {
      const name = String(
        selectedStudent.studentName ?? selectedStudent.firstName ?? "",
      );
      const roll = String(
        selectedStudent.rollNumber ?? selectedStudent.hallticketNumber ?? "",
      );
      if (name || roll) {
        parts.push(`Student : ${name}${roll ? ` (${roll})` : ""}`.trim());
      }
    }
    if (mode === "admin" && employeeId) {
      const emp = employees.find((e) => Number(e.employeeId) === employeeId);
      if (emp) {
        const name = String(emp.firstName ?? "");
        const num = emp.empNumber != null ? ` (${String(emp.empNumber)})` : "";
        parts.push(`Employee : ${name}${num}`.trim());
      }
    }
    if (mode === "admin" && fromDate && toDate) {
      parts.push(
        `From ${format(fromDate, "MMM d, yyyy")} To ${format(toDate, "MMM d, yyyy")}`,
      );
    }
    return parts.join(" | ");
  }, [mode, selectedStudent, employeeId, employees, fromDate, toDate]);

  const printReport = useCallback(async () => {
    if (rows.length === 0) {
      toastError("No meetings to print");
      return;
    }
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      effectiveCollegeId,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const bodyRows = rows
      .map((row, index) => {
        const sched = formatScheduleDateValue(row.nextScheduledActivityDate);
        const act = formatActivityDateValue(row.activityDate);
        const status = printStatusHtml(activityStatus(row));
        return `<tr>
          <td style="text-align:center">${index + 1}</td>
          <td>${escapeHtml(cellText(row.activityTypeCode))}</td>
          <td>${escapeHtml(String(sched))}</td>
          <td>${escapeHtml(cellText(row.attendeesName))}</td>
          <td>${escapeHtml(cellText(row.discussionPoints))}</td>
          <td>${escapeHtml(cellText(row.summary))}</td>
          <td>${escapeHtml(String(act))}</td>
          <td>${status}</td>
        </tr>`;
      })
      .join("");
    const tableHtml = `<table><thead><tr>
      <th>Sl.No</th><th>Activity Type</th><th>Schedule Date</th>
      <th>Attendees Name</th><th>Discussion Points</th><th>Summary</th>
      <th>Activity Date</th><th>Status</th>
    </tr></thead><tbody>${bodyRows}</tbody></table>`;
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(title),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName),
        dataDetails: printDataDetails
          ? escapeHtml(printDataDetails)
          : undefined,
        tableHtml,
      }),
    );
  }, [
    rows,
    effectiveCollegeId,
    collegeLogo,
    collegeName,
    printDataDetails,
    title,
  ]);

  const effectiveCounselorId =
    counselorId ||
    Number(editingRow?.counselorId ?? 0) ||
    Number(
      allStudents.find((s) => Number(s.studentId) === studentId)?.counselorId ??
        0,
    ) ||
    Number(rows[0]?.counselorId ?? 0) ||
    0;

  const columnDefs = useMemo<ColDef<MeetingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.activityType,
      { ...COL_DEFS.nextDate, cellRenderer: scheduleDateRenderer },
      { ...COL_DEFS.attendees, cellRenderer: attendeesRenderer },
      { ...COL_DEFS.discussion, cellRenderer: discussionRenderer },
      { ...COL_DEFS.summary, cellRenderer: summaryRenderer },
      { ...COL_DEFS.activityDate, cellRenderer: activityDateRenderer },
      { ...COL_DEFS.status, cellRenderer: statusCellRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit, goToMeeting, openOverview),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over latest handlers
    [allStudents, employees, collegeId, employeeId, studentId, mode],
  );

  return (
    <FilteredListPage
      title={title}
      filterTitle={filterTitle}
      filters={
        <div className="space-y-3">
          {mode === "admin" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <DatePicker
                  label="From Date *"
                  value={fromDate}
                  onChange={(d) => {
                    setFromDate(d);
                    setRows([]);
                    setListReady(false);
                    if (d && toDate && d.getTime() > toDate.getTime())
                      setToDate(d);
                  }}
                  className={DATE_FILTER_COL}
                  clearable={false}
                />
                <DatePicker
                  label="To Date *"
                  value={toDate}
                  onChange={(d) => {
                    setToDate(d);
                    setRows([]);
                    setListReady(false);
                  }}
                  className={DATE_FILTER_COL}
                  clearable={false}
                  minDate={fromDate ?? undefined}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <Select
                  label="College *"
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setCollegeId(v ? Number(v) : null);
                    setEmployeeId(null);
                    setStudentList([]);
                    setStudentId(null);
                    setRows([]);
                    setListReady(false);
                    setCounselorId(null);
                    setEmployees([]);
                  }}
                  options={collegeOptions}
                  searchable
                  className={COLLEGE_FILTER_COL}
                />
                <Select
                  label="Employee *"
                  value={employeeId ? String(employeeId) : null}
                  onChange={(v) =>
                    void onEmployeeSelected(v ? Number(v) : null)
                  }
                  options={employeeSelectOptions}
                  searchable
                  isLoading={employeeSearching}
                  disabled={!collegeId}
                  onSearch={(term) => void onEmployeeSearch(term)}
                  placeholder="Search by employee name or number."
                  className={EMPLOYEE_FILTER_COL}
                />
                <StudentSearchSelect
                  label="Student *"
                  value={studentId}
                  students={displayStudents}
                  selectedStudent={selectedStudent}
                  onSearch={onStudentSearch}
                  onChange={(id) => {
                    setStudentId(id);
                    setRows([]);
                    setListReady(false);
                    setCounselorId(null);
                  }}
                  disabled={!employeeId}
                  minChars={1}
                  fullWidth
                  className={STUDENT_FILTER_COL}
                />
                <div className={GET_LIST_COL}>
                  <Button
                    type="button"
                    className="h-8 w-fit shrink-0 px-3 text-[12px]"
                    onClick={() => void loadMeetings()}
                    disabled={loading}
                  >
                    {loading ? "Loading…" : "Get List"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <StudentSearchSelect
                label="Student *"
                value={studentId}
                students={displayStudents}
                selectedStudent={selectedStudent}
                onSearch={onStudentSearch}
                onChange={(id) => {
                  setStudentId(id);
                  setRows([]);
                  setListReady(false);
                  setCounselorId(null);
                }}
                minChars={1}
                fullWidth
                className="md:col-span-4"
              />
              <div className="md:col-span-2">
                <Button
                  type="button"
                  className="h-8 w-fit shrink-0 px-3 text-[12px]"
                  onClick={() => void loadMeetings()}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Get List"}
                </Button>
              </div>
            </div>
          )}
        </div>
      }
      showTable={listReady}
      resultsVisible={listReady}
      hideEmptyGrid
      rowData={listReady ? rows : []}
      columnDefs={listReady ? columnDefs : undefined}
      loading={loading}
      pagination
      height="auto"
      toolbar={
        listReady
          ? {
              search: true,
              searchPlaceholder: "Search",
              exportPdf: false,
            }
          : undefined
      }
      toolbarTrailing={
        listReady ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={openSchedule}
            >
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              Schedule Meeting
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void printReport()}
              disabled={rows.length === 0}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : null
      }
    >
      {effectiveCollegeId > 0 && studentId && effectiveCounselorId > 0 ? (
        <ScheduleMeetingModal
          open={scheduleOpen}
          onClose={() => {
            setScheduleOpen(false);
            setEditingRow(null);
          }}
          row={editingRow}
          collegeId={effectiveCollegeId}
          counselorId={effectiveCounselorId}
          studentId={studentId}
          onSaved={onScheduleSaved}
        />
      ) : null}
      <MeetingOverviewModal
        open={overviewOpen}
        onClose={() => {
          setOverviewOpen(false);
          setOverviewRow(null);
        }}
        row={overviewRow}
      />
    </FilteredListPage>
  );
}
