"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastInfo, toastSuccess } from "@/lib/toast";
import {
  formatAttendanceProcDate,
  formatLeaveYmd,
  getEmpAttendanceDetail,
  getEmployeeRunningLeaves,
  readDashStorage,
  submitEmployeeLeaveApplication,
  type StaffDashRow,
  type EmpAttendanceDay,
  type LeaveTotalRow,
} from "@/services";
import {
  ApplyLateLeaveModal,
  type ApplyLateLeaveContext,
} from "./ApplyLateLeaveModal";

interface LoginCalendarProps {
  initialDays: EmpAttendanceDay[];
  employeeInfo: StaffDashRow[];
  leaveHistory: LeaveTotalRow[];
  collegeId: number;
  employeeId: number;
  organizationId: number;
  arrows?: boolean;
  onLeaveApplied?: () => void;
}

function eventsForDay(days: EmpAttendanceDay[], day: Date): EmpAttendanceDay[] {
  return days.filter((e) => {
    if (!e.start && !e.Attendance_Date) return false;
    const d = e.start
      ? e.start instanceof Date
        ? e.start
        : new Date(e.start)
      : new Date(`${String(e.Attendance_Date).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    return isSameDay(d, day);
  });
}

function formatAttendanceDate(value?: string): string {
  if (!value) return "";
  try {
    const d = value.includes("T")
      ? parseISO(value)
      : new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return format(d, "MMM d, yyyy");
  } catch {
    return value;
  }
}

function formatInfoDate(value: unknown): string {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "dd MMM, yyyy");
  } catch {
    return String(value);
  }
}

/** Angular login-calendar Attendance Details hover panel */
function AttendanceTooltip({ event }: { event: EmpAttendanceDay }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-full z-40 mt-1 w-56 -translate-x-1/2",
        "rounded border border-border bg-white p-2 text-left shadow-lg",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity",
      )}
    >
      <h5 className="mb-1 text-sm font-semibold text-foreground">
        Attendance Details
      </h5>
      <p className="text-xs text-foreground">
        <span className="font-bold text-black">Date :</span>{" "}
        {formatAttendanceDate(event.Attendance_Date)}
      </p>
      {event.Day != null ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Day :</span> {event.Day}
        </p>
      ) : null}
      {event.Login != null && event.Login !== "" ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Login :</span> {event.Login}
        </p>
      ) : null}
      {event.Logout != null && event.Logout !== "" ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Logout :</span> {event.Logout}
        </p>
      ) : null}
      {Number(event.Late_By) > 0 ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Late By :</span>{" "}
          {event.Late_By} mins
        </p>
      ) : null}
      {Number(event.Early_By) > 0 ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Early By :</span>{" "}
          {event.Early_By} mins
        </p>
      ) : null}
      {Number(event.Running_Late_Minutes) > 0 ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Running Late Minutes :</span>{" "}
          {event.Running_Late_Minutes} mins
        </p>
      ) : null}
      {event.Is_Forenoon_Leaves != null ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Is Forenoon Leaves :</span> Yes
        </p>
      ) : null}
      {event.Is_Afternoon_Leaves != null ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Is Afternoon Leaves :</span>{" "}
          Yes
        </p>
      ) : null}
      {event.Remarks != null && event.Remarks !== "" ? (
        <p className="text-xs text-foreground">
          <span className="font-bold text-black">Remarks :</span>{" "}
          <span dangerouslySetInnerHTML={{ __html: String(event.Remarks) }} />
        </p>
      ) : null}
    </div>
  );
}

/** Angular EmpInfoDialog — Biometric Details */
function BiometricInfoModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: StaffDashRow[];
}) {
  if (!open) return null;
  const row = data[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Biometric Details</h4>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4 space-y-3 text-sm">
          {data.length === 0 ? (
            <p className="text-red-600">
              <span className="font-medium">Note :</span> Biometric data is not
              configured with skolo application, please contact application
              incharge.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded border border-border p-3">
                <InfoRow label="Company :" value={row?.companyname} />
                <InfoRow
                  label="Status :"
                  value={row?.recordstatus ? "Active" : "In Active"}
                />
                <InfoRow label="Employee Code :" value={row?.employeecode} />
                <InfoRow label="Employee :" value={row?.employeename} />
                <InfoRow label="String Code :" value={row?.stringcode} />
                <InfoRow
                  label="Date From :"
                  value={formatInfoDate(row?.start_attendance_date)}
                />
                <InfoRow label="Numeric Code :" value={row?.numericcode} />
                <InfoRow
                  label="Last Updated On :"
                  value={formatInfoDate(row?.latest_attendance_date)}
                />
              </div>

              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        SI.No
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        Shift Name
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        Begin Time
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        End Time
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        From Date
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        To Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((dt, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {String(dt.shift_name ?? "")}
                        </td>
                        <td className="px-2 py-1.5">
                          {String(dt.begintime ?? "")}
                        </td>
                        <td className="px-2 py-1.5">
                          {String(dt.endtime ?? "")}
                        </td>
                        <td className="px-2 py-1.5">
                          {formatInfoDate(dt.from_date)}
                        </td>
                        <td className="px-2 py-1.5">
                          {formatInfoDate(dt.to_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-red-600">
                <span className="font-medium">Note :</span> If you find any data
                incorrect, please contact application incharge.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-primary">{String(value ?? "—")}</span>
    </div>
  );
}

export function LoginCalendar({
  initialDays,
  employeeInfo,
  leaveHistory,
  collegeId,
  employeeId,
  organizationId,
  arrows = true,
  onLeaveApplied,
}: LoginCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [days, setDays] = useState(initialDays);
  const [info, setInfo] = useState(employeeInfo);
  const [lvHistory, setLvHistory] = useState(leaveHistory);
  const [loading, setLoading] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveCtx, setLeaveCtx] = useState<ApplyLateLeaveContext | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setLvHistory(leaveHistory);
  }, [leaveHistory]);

  useEffect(() => {
    setDays(initialDays);
    setInfo(employeeInfo);
  }, [initialDays, employeeInfo]);

  const isPastMonth = useMemo(() => {
    const today = new Date();
    const cur = new Date(today.getFullYear(), today.getMonth(), 1);
    const view = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    return view < cur;
  }, [viewDate]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  async function loadMonth(date: Date) {
    setLoading(true);
    try {
      const { days: next, employeeInfo: nextInfo } =
        await getEmpAttendanceDetail({
          collegeId,
          employeeId,
          attendanceDate: formatAttendanceProcDate(date),
        });
      setDays(next);
      setInfo(nextInfo);
    } finally {
      setLoading(false);
    }
  }

  async function goPrev() {
    if (!arrows) return;
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    setViewDate(next);
    await loadMonth(next);
  }

  async function goNext() {
    if (!isPastMonth) return;
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(next);
    await loadMonth(next);
  }

  async function onDayClick(day: Date) {
    const events = eventsForDay(days, day);
    if (events.length === 0) return;
    const ev = events[0];
    if (ev.Day !== "Apply Leave") return;

    const reportingManagerId =
      ev.fk_reporting_manager_id ?? readDashStorage("reportingManagerId");

    if (reportingManagerId == null || reportingManagerId === "") {
      toastInfo("Reporting manager is empty.");
      return;
    }

    let counts = lvHistory;
    if (!counts.length) {
      const year = Number(formatLeaveYmd(new Date()).split("-")[0]);
      counts = await getEmployeeRunningLeaves({
        collegeId,
        employeeId: Number(ev.pk_emp_id ?? employeeId),
        leaveYear: year,
      });
      setLvHistory(counts);
    }

    setLeaveCtx({
      events,
      leaveCounts: counts,
      first_name: ev.Employee_Name,
      emp_number: ev.Emp_Number,
      login_date_time: ev.Login,
      logout_date_time: ev.Logout,
      reportingManagerId,
      running_late_min: Number(ev.Running_Late_Minutes ?? 0),
    });
    setLeaveOpen(true);
  }

  async function handleLeaveSubmit(form: StaffDashRow) {
    if (!leaveCtx?.events?.[0]) return;
    const ev = leaveCtx.events[0];
    setSubmitting(true);
    try {
      const payload: StaffDashRow = {
        ...form,
        collegeId,
        leaveYear: Number(String(ev.Attendance_Date ?? "").split("-")[0]),
        employeeId: Number(ev.pk_emp_id ?? employeeId),
        employeeNumber: leaveCtx.emp_number,
        applicationDate: formatLeaveYmd(new Date()),
      };
      const result = await submitEmployeeLeaveApplication(payload);
      if (result.success) {
        toastSuccess(result.message || "Leave applied");
        setLeaveOpen(false);
        onLeaveApplied?.();
        await loadMonth(viewDate);
      } else {
        toastInfo(result.message || "Unable to apply leave");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-visible shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full shadow-sm text-blue-600"
            disabled={!arrows || loading}
            onClick={() => void goPrev()}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold px-1">
            Biometric ({format(viewDate, "MMM yyyy")})
          </h3>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full shadow-sm text-blue-600"
            disabled={!isPastMonth || loading}
            onClick={() => void goNext()}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <button
          type="button"
          className={cn(
            "hover:opacity-80",
            info.length > 0 ? "text-blue-600" : "text-red-500",
          )}
          onClick={() => setInfoOpen(true)}
          aria-label="Biometric details"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("p-2 overflow-visible", loading && "opacity-60")}>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/60 rounded-sm overflow-visible">
          {calendarDays.map((day) => {
            const events = eventsForDay(days, day);
            const inMonth = isSameMonth(day, viewDate);
            const primary = events[0];
            const badges =
              primary?.dayTypes?.filter(
                (dt) => dt.type !== "Apply Leave" && dt.type !== "",
              ) ?? [];
            const isApply = primary?.Day === "Apply Leave";
            const showTooltip =
              Boolean(primary) &&
              Boolean(
                primary?.Attendance_Date ||
                primary?.Login ||
                primary?.Logout ||
                primary?.Day,
              );

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={!inMonth}
                onClick={() => void onDayClick(day)}
                className={cn(
                  "group relative min-h-[4.5rem] bg-card p-1 text-left align-top hover:bg-muted/40",
                  !inMonth && "bg-muted/30 text-muted-foreground/50",
                )}
              >
                <div className="flex items-start justify-between gap-0.5">
                  <div className="flex flex-wrap gap-0.5">
                    {badges.map((b) => (
                      <span
                        key={`${day.toISOString()}-${b.type}`}
                        className="rounded px-0.5 text-[9px] font-semibold text-black"
                        style={{ background: b.color }}
                      >
                        {b.type}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium leading-none">
                    {format(day, "d")}
                  </span>
                </div>
                {primary?.Login ? (
                  <p className="text-[10px] text-emerald-700 truncate mt-0.5">
                    {primary.Login}
                  </p>
                ) : null}
                {primary?.Logout ? (
                  <p className="text-[10px] text-rose-700 truncate">
                    {primary.Logout}
                  </p>
                ) : null}
                {isApply ? (
                  <p className="mt-1 text-center text-[10px] font-semibold text-amber-700">
                    Apply Leave
                  </p>
                ) : null}
                {showTooltip && primary ? (
                  <AttendanceTooltip event={primary} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <BiometricInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        data={info}
      />

      <ApplyLateLeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onSubmit={handleLeaveSubmit}
        data={leaveCtx}
        organizationId={organizationId}
        isSubmitting={submitting}
      />
    </div>
  );
}
