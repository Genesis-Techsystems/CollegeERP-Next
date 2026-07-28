"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, MessageSquare, Pencil, PlusIcon, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  createCounselorActivities,
  listSchedulePtmMeetings,
  listSchedulePtmStudents,
  sendCounselorSmsToStudents,
  updateCounselorActivity,
  type MentorshipRow,
} from "@/services";
import { CounselorSendSmsModal } from "./CounselorSendSmsModal";
import { MeetingOverviewModal } from "./MeetingOverviewModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";

type MeetingRow = MentorshipRow;

const COL_DEFS = {
  siNo: {
    headerName: "No.",
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
    minWidth: 130,
  } as ColDef<MeetingRow>,
  status: {
    field: "activityStatusCode",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<MeetingRow>,
  actions: {
    headerName: "Actions",
    minWidth: 200,
    width: 200,
    flex: 0,
  } as ColDef<MeetingRow>,
};

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function readStorageNum(key: string): number {
  return Number(readStorage(key) || 0) || 0;
}

function toYmd(d: Date | null): string {
  if (!d) return "";
  // Angular `momentFormatYMD` → YYYY/MM/DD for counselordetails
  return format(d, "yyyy/MM/dd");
}

function parseQueryDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function studentOptionLabel(row: MentorshipRow): string {
  const roll = row.rollNumber != null ? `(${String(row.rollNumber)}) ` : "";
  const name = String(row.studentName ?? row.firstName ?? "");
  return `${roll}${name}`.trim() || String(row.studentId ?? "");
}

function activityStatus(row: MeetingRow | undefined): string {
  return String(row?.activityStatusCode ?? "").toUpperCase();
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
    return (
      <div className="flex items-center gap-1">
        {scheduled ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit scheduled meeting"
              onClick={() => onEdit(row)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="link"
              className="h-auto px-1 text-primary"
              onClick={() => onMeeting(row)}
            >
              Meeting
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="View meeting details"
          onClick={() => onOverview(row)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

function statusCellRenderer(p: ICellRendererParams<MeetingRow>) {
  const code = activityStatus(p.data);
  if (!code) return "—";
  const cls =
    code === "COMPLETED"
      ? "text-emerald-600 font-medium"
      : code === "CANCELLED"
        ? "text-destructive font-medium"
        : code === "SCHEDULED"
          ? "text-amber-600 font-medium"
          : "";
  return <span className={cls}>{code}</span>;
}

function attendeesRenderer(p: ICellRendererParams<MeetingRow>) {
  const v = p.data?.attendeesName;
  return v == null || String(v).trim() === "" ? "—" : String(v);
}

function activityDateRenderer(p: ICellRendererParams<MeetingRow>) {
  const v = p.data?.activityDate;
  if (v == null || String(v).trim() === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return format(d, "MMM d, yyyy h:mm a");
}

function scheduleDateRenderer(p: ICellRendererParams<MeetingRow>) {
  const v = p.data?.nextScheduledActivityDate;
  if (v == null || String(v).trim() === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return format(d, "MMM d, yyyy");
}

/** Angular `staff-mentorship/schedule-ptm` — Meetings filter + activity grid. */
export function SchedulePtmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const userRole = String(
    user?.userRole ?? readStorage("userRole") ?? "",
  ).toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
  const staffCollegeId =
    Number(user?.collegeId ?? readStorageNum("collegeId")) || 0;
  const staffEmployeeId = loginEmployeeId || readStorageNum("employeeId");

  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [students, setStudents] = useState<MentorshipRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [mapping, setMapping] = useState<MentorshipRow | null>(null);
  const [listReady, setListReady] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MeetingRow | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewRow, setOverviewRow] = useState<MeetingRow | null>(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [querySeeded, setQuerySeeded] = useState(false);

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: String(s.studentId),
        label: studentOptionLabel(s),
      })),
    [students],
  );

  const loadStudents = useCallback(
    async (opts?: { preferStudentId?: number; silentEmpty?: boolean }) => {
      const from = toYmd(fromDate);
      const to = toYmd(toDate);
      if (!from || !to) return;
      if (!isAdmin && !staffEmployeeId) return;

      setLoadingStudents(true);
      setStudents([]);
      setRows([]);
      setMapping(null);
      setListReady(false);
      try {
        const list = await listSchedulePtmStudents({
          fromDate: from,
          toDate: to,
          employeeId: staffEmployeeId,
          isAdmin,
        });
        setStudents(list);
        const prefer = opts?.preferStudentId;
        if (prefer && list.some((s) => Number(s.studentId) === prefer)) {
          setStudentId(prefer);
        } else if (!list.some((s) => Number(s.studentId) === studentId)) {
          setStudentId(null);
        }
      } catch (e) {
        const msg = getErrorMessage(e).toLowerCase();
        if (!msg.includes("no record")) {
          toastError(getErrorMessage(e));
        }
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    },
    [fromDate, toDate, isAdmin, staffEmployeeId, studentId],
  );

  const loadMeetings = useCallback(
    async (sid: number, opts?: { silentEmpty?: boolean }) => {
      let collegeId = staffCollegeId;
      if (isAdmin) {
        collegeId =
          Number(
            students.find((s) => Number(s.studentId) === sid)?.collegeId ?? 0,
          ) || staffCollegeId;
      }
      if (!collegeId || !sid) {
        toastError("Please select a student");
        return;
      }
      if (!isAdmin && !staffEmployeeId) return;

      setLoadingMeetings(true);
      setListReady(true);
      setRows([]);
      setMapping(null);
      try {
        const result = await listSchedulePtmMeetings({
          collegeId,
          studentId: sid,
          employeeId: staffEmployeeId,
          isAdmin,
        });
        setMapping(result.mapping);
        setRows(result.activities);
      } catch (e) {
        const msg = getErrorMessage(e).toLowerCase();
        if (!msg.includes("no record")) {
          toastError(getErrorMessage(e));
        }
        setRows([]);
        setMapping(null);
      } finally {
        setLoadingMeetings(false);
      }
    },
    [staffCollegeId, staffEmployeeId, isAdmin, students],
  );

  // Seed dates from query params (return from teacher-meeting).
  useEffect(() => {
    if (querySeeded) return;
    const f = parseQueryDate(searchParams.get("fDate"));
    const t = parseQueryDate(searchParams.get("tDate"));
    if (f) setFromDate(f);
    if (t) setToDate(t);
    setQuerySeeded(true);
  }, [searchParams, querySeeded]);

  // Initial / date-driven student load (Angular selectedEmployee on init + calDay/selectedDate).
  useEffect(() => {
    if (sessionLoading || isResolving || !querySeeded) return;
    if (!isAdmin && !staffEmployeeId) return;
    const prefer = Number(searchParams.get("studentId") || 0) || undefined;
    void loadStudents({ preferStudentId: prefer, silentEmpty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- date/role driven; avoid prefer loops
  }, [
    sessionLoading,
    isResolving,
    querySeeded,
    isAdmin,
    staffEmployeeId,
    fromDate,
    toDate,
  ]);

  // Auto-load meetings when student selected (Angular selectionChange → selectedStudent).
  useEffect(() => {
    if (!studentId) {
      setListReady(false);
      setRows([]);
      setMapping(null);
      return;
    }
    void loadMeetings(studentId, { silentEmpty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on student change only
  }, [studentId]);

  function onFromDateChange(d: Date | null) {
    if (!d) return;
    setFromDate(d);
    setListReady(false);
    setRows([]);
    if (toDate && d.getTime() > toDate.getTime()) {
      setToDate(d);
    }
  }

  function onToDateChange(d: Date | null) {
    if (!d) return;
    setToDate(d);
    setListReady(false);
    setRows([]);
  }

  function openSchedule() {
    const counselorId = Number(mapping?.counselorId ?? 0);
    const collegeId =
      (isAdmin
        ? Number(
            students.find((s) => Number(s.studentId) === studentId)
              ?.collegeId ?? 0,
          )
        : staffCollegeId) || Number(mapping?.collegeId ?? 0);
    if (!studentId) {
      toastError("Please select a student");
      return;
    }
    if (!counselorId || !collegeId) {
      toastError("Counselor mapping not found for this student");
      return;
    }
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
    const student = students.find((s) => Number(s.studentId) === studentId);
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
    if (studentId) params.set("studentId", String(studentId));
    if (fromDate) params.set("fDate", fromDate.toISOString());
    if (toDate) params.set("tDate", toDate.toISOString());
    const collegeId =
      (isAdmin ? Number(student?.collegeId ?? 0) : staffCollegeId) ||
      Number(mapping?.collegeId ?? 0);
    if (collegeId) params.set("collegeId", String(collegeId));
    const empN = readStorage("empNumber");
    if (empN) params.set("empN", empN);
    router.push(
      `/mentorship/schedule-ptm/teacher-meeting?${params.toString()}`,
    );
  }

  async function onScheduleSaved(payload: MentorshipRow) {
    const activityId = Number(payload.counselorActivityId ?? 0);
    if (activityId > 0) {
      await updateCounselorActivity(activityId, payload);
      toastSuccess("Meeting updated");
    } else {
      const counselorId = Number(
        payload.counselorId ?? mapping?.counselorId ?? 0,
      );
      await createCounselorActivities([
        {
          ...payload,
          counselorId: counselorId || payload.counselorId,
        },
      ]);
      toastSuccess("Meeting scheduled");
    }
    if (studentId) await loadMeetings(studentId, { silentEmpty: true });
  }

  async function onSmsSubmit(form: {
    messageContent: string;
    subject: string;
    fromEmailId: string;
    isSmsAlert: boolean;
  }) {
    if (!mapping || !studentId) {
      toastError("Select a student with meetings first");
      return;
    }
    try {
      await sendCounselorSmsToStudents({
        ...form,
        numbers: [studentId],
        courseGroupId: mapping.courseGroupId,
        courseYearId: mapping.courseYearId,
        groupSectionId: mapping.groupSectionId,
        courseId: mapping.courseId,
        collegeId: staffCollegeId || Number(mapping.collegeId ?? 0),
      });
      toastSuccess("SMS sent successfully");
    } catch (e) {
      toastError(getErrorMessage(e));
      throw e;
    }
  }

  function printMeetings() {
    const activities = rows;
    if (!mapping || activities.length === 0) return;
    const courseLine = [
      mapping.collegeCode,
      mapping.courseCode,
      mapping.groupCode,
      mapping.courseYearName,
      mapping.section,
    ]
      .filter(Boolean)
      .join(" / ");
    const studentLine = `${String(mapping.studentName ?? "")} ( ${String(mapping.rollNumber ?? "")} )`;

    const escape = (v: unknown) =>
      String(v ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    const bodyRows = activities
      .map((a, i) => {
        const sched = a.nextScheduledActivityDate
          ? format(new Date(String(a.nextScheduledActivityDate)), "yyyy-MM-dd")
          : "-";
        const act = a.activityDate
          ? format(new Date(String(a.activityDate)), "yyyy-MM-dd")
          : "-";
        return `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${escape(a.activityTypeCode)}</td>
          <td>${escape(sched)}</td>
          <td>${escape(a.discussionPoints ?? "-")}</td>
          <td>${escape(a.outputFromMeeting ?? "-")}</td>
          <td>${escape(act)}</td>
          <td>${escape(a.activityStatusCode ?? "-")}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Meetings List</title>
      <style>
        body{font-family:Arial,sans-serif;padding:16px}
        h2{margin:0 0 8px} .meta{margin:4px 0 16px;font-size:13px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #333;padding:6px 8px;font-size:12px}
        th{background:#eee}
      </style></head>
      <body onload="window.print();window.close()">
        <h2>Meetings List</h2>
        <div class="meta">Course : ${escape(courseLine)}</div>
        <div class="meta">Student Name : ${escape(studentLine)}</div>
        <table><thead><tr>
          <th>S.No</th><th>Activity Type</th><th>Schedule Date</th>
          <th>Discussion Points</th><th>Suggestions</th>
          <th>Activity Date</th><th>Status</th>
        </tr></thead><tbody>${bodyRows}</tbody></table>
      </body></html>`;

    const popup = window.open("", "_blank");
    if (!popup) {
      toastError("Unable to open print window");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  const effectiveCollegeId =
    (isAdmin
      ? Number(
          students.find((s) => Number(s.studentId) === studentId)?.collegeId ??
            0,
        )
      : staffCollegeId) ||
    Number(mapping?.collegeId ?? 0) ||
    0;
  const effectiveCounselorId =
    Number(editingRow?.counselorId ?? mapping?.counselorId ?? 0) || 0;

  const columnDefs = useMemo<ColDef<MeetingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.activityType,
      { ...COL_DEFS.nextDate, cellRenderer: scheduleDateRenderer },
      { ...COL_DEFS.attendees, cellRenderer: attendeesRenderer },
      COL_DEFS.discussion,
      COL_DEFS.summary,
      { ...COL_DEFS.activityDate, cellRenderer: activityDateRenderer },
      { ...COL_DEFS.status, cellRenderer: statusCellRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit, goToMeeting, openOverview),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over latest handlers
    [students, studentId, mapping, fromDate, toDate, isAdmin, staffCollegeId],
  );

  const loading = loadingStudents || loadingMeetings;

  return (
    <FilteredListPage
      title="Schedule PTM"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <DatePicker
            label="From Date"
            value={fromDate}
            onChange={onFromDateChange}
            className="md:col-span-2"
            clearable={false}
          />
          <DatePicker
            label="To Date"
            value={toDate}
            onChange={onToDateChange}
            className="md:col-span-2"
            clearable={false}
          />
          <Select
            label="Student *"
            value={studentId ? String(studentId) : null}
            onChange={(v) => setStudentId(v ? Number(v) : null)}
            options={studentOptions}
            searchable
            isLoading={loadingStudents}
            placeholder="Student"
            className="md:col-span-5"
          />
        </div>
      }
      rowData={listReady ? rows : []}
      columnDefs={listReady ? columnDefs : undefined}
      body={!listReady ? null : undefined}
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
              onClick={() => setSmsOpen(true)}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Send SMS
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-[30px] w-[30px] p-0"
              aria-label="Print report"
              onClick={printMeetings}
            >
              <Printer className="h-4 w-4" />
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
      <CounselorSendSmsModal
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        onSubmit={onSmsSubmit}
      />
    </FilteredListPage>
  );
}
