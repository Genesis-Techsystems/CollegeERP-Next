"use client";

/**
 * Angular `staff-digital-class-room/live-class-schedule` — weekly timetable grid
 * with live-class scheduling modal on period click.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, Filter, Loader2 } from "lucide-react";
import { Select, type SelectOption } from "@/common/components/select";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  buildStaffMyTimetable,
  loadMyTimetableSchedules,
  searchEmployeesForHr,
  tConvert,
  type MyTimetableSchedule,
  type MyTimetableTiming,
  type MyTimetableWeekday,
} from "@/services";
import { LiveClassScheduleModal } from "./LiveClassScheduleModal";

type AnyRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function isAdminUser(user: { isAdmin?: boolean } | null | undefined): boolean {
  if (user?.isAdmin) return true;
  return readStorage("isAdmin") === "true";
}

function TimetableCell({
  timing,
  weekday,
  onSchedule,
}: {
  timing: MyTimetableTiming;
  weekday: MyTimetableWeekday;
  onSchedule: (timing: MyTimetableTiming, weekday: MyTimetableWeekday) => void;
}) {
  const subBatches = Array.isArray(timing.subBatches) ? timing.subBatches : [];
  const resources = Array.isArray(timing.subjectResource)
    ? timing.subjectResource
    : [];
  const fg = String(timing.color ?? "#000");
  const bg =
    timing.isBreak === true
      ? "#efefef"
      : timing.colorCode != null
        ? String(timing.colorCode)
        : undefined;

  return (
    <td
      className={cn(
        "relative border border-[#ddd] px-2 py-2 align-top text-left",
        timing.isBreak === true && "break",
      )}
      colSpan={Math.max(1, Number(timing.colspan ?? 1) || 1)}
      style={{ background: bg }}
    >
      {timing.isBreak !== true ? (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 z-10 rounded p-0.5 text-[#666] hover:text-foreground cursor-pointer"
          aria-label="Schedule live class"
          onClick={(e) => {
            e.stopPropagation();
            onSchedule(timing, weekday);
          }}
        >
          <Clock3 className="h-5 w-5" />
        </button>
      ) : null}
      <div className={timing.isBreak !== true ? "pr-8" : undefined}>
        {subBatches.length > 0 ? (
          subBatches.map((batch, i) => (
            <div
              key={`${String(batch.studentBatchId ?? i)}-${i}`}
              className="mb-1 last:mb-0"
            >
              <p
                className="break-words text-[15px] font-medium leading-snug"
                style={{ color: fg }}
              >
                {batch.studentBatchId != null
                  ? `[${String(batch.studentBatchName ?? "")}] `
                  : ""}
                {batch.shortName != null
                  ? `${String(batch.subjectName ?? "")} - ${String(batch.shortName)}`
                  : `${String(batch.subjectName ?? "")} - ${String(batch.subjectCode ?? "")}`}
              </p>
              <p
                className="break-words text-[10px] leading-snug"
                style={{ color: fg }}
              >
                {String(timing.collegeCode ?? "")} /{" "}
                {String(timing.academicYearName ?? "")} /{" "}
                {String(timing.courseName ?? "")} /{" "}
                {String(timing.groupName ?? "")} /{" "}
                {String(timing.courseYearName ?? "")} / Section -{" "}
                {String(timing.groupSectionName ?? "")}
              </p>
              <p className="text-[12px] font-semibold text-blue-700">
                {tConvert(timing.startTime)} - {tConvert(timing.endTime)}
              </p>
            </div>
          ))
        ) : resources.length === 0 ? (
          <p className="text-sm">{String(timing.classTimingName ?? "")}</p>
        ) : null}
      </div>
    </td>
  );
}

function WeekTimetableTable({
  schedule,
  onSchedule,
}: {
  schedule: MyTimetableSchedule;
  onSchedule: (timing: MyTimetableTiming, weekday: MyTimetableWeekday) => void;
}) {
  return (
    <table className="w-full min-w-[720px] border-separate border-spacing-px text-sm">
      <tbody>
        {schedule.weekdays.map((weekday) => (
          <tr key={weekday.weekdayId}>
            <th className="border border-[#ddd] bg-[hsl(var(--sidebar-active-bg))] px-[5px] py-[5px] text-left font-medium uppercase text-[hsl(var(--sidebar-foreground-active))]">
              {weekday.weekdayName}
            </th>
            {weekday.timings.map((timing, ti) => (
              <TimetableCell
                key={`${weekday.weekdayId}-${ti}`}
                timing={timing}
                weekday={weekday}
                onSchedule={onSchedule}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatEmployeeLabel(name: string, empNumber: string): string {
  return empNumber ? `${name} (${empNumber})` : name;
}

export function LiveClassSchedulePage() {
  const pageTitle = usePageNavLabel() ?? "Live Class Schedule";
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const isAdmin = isAdminUser(user);
  const userRole = String(user?.userRole ?? readStorage("userRole") ?? "");
  const isStaffRole = userRole.toUpperCase() === "STAFF";
  const userId = positiveId(user?.userId, readStorage("userId"));

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeLabel, setEmployeeLabel] = useState("");

  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<MyTimetableSchedule>({
    weekdays: [],
  });
  const [modalContext, setModalContext] = useState<{
    timing: MyTimetableTiming;
    weekday: MyTimetableWeekday;
  } | null>(null);

  const activeEmployeeId = useMemo(() => {
    if (!isAdmin) {
      return positiveId(loginEmployeeId, readStorage("employeeId"));
    }
    return positiveId(
      selectedEmployeeId,
      loginEmployeeId,
      readStorage("employeeId"),
    );
  }, [isAdmin, selectedEmployeeId, loginEmployeeId]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    if (!isAdmin) return;
    if (isStaffRole) {
      const id = String(positiveId(loginEmployeeId, readStorage("employeeId")));
      if (id !== "0") {
        setSelectedEmployeeId(id);
        const name =
          String(
            user?.firstName ??
              readStorage("uName") ??
              readStorage("firstName") ??
              "",
          ) || "Employee";
        const num = readStorage("empNumber");
        setEmployeeLabel(formatEmployeeLabel(name, num));
        setEmployeeOptions([
          { value: id, label: formatEmployeeLabel(name, num) },
        ]);
      }
      return;
    }
    if (!selectedEmployeeId && loginEmployeeId) {
      setSelectedEmployeeId(String(loginEmployeeId));
    }
  }, [
    sessionLoading,
    isResolving,
    isAdmin,
    isStaffRole,
    loginEmployeeId,
    user?.firstName,
    selectedEmployeeId,
  ]);

  useEffect(() => {
    if (!isAdmin || isStaffRole) return;
    const term = employeeSearch.trim();
    if (term.length < 4) {
      setEmployeeOptions([]);
      return;
    }
    let cancelled = false;
    setEmployeeLoading(true);
    void searchEmployeesForHr(term)
      .then((rows) => {
        if (cancelled) return;
        setEmployeeOptions(
          rows.map((row) => {
            const id = String(row.employeeId ?? "");
            const name = String(row.firstName ?? "Employee");
            const num = row.empNumber ? ` (${String(row.empNumber)})` : "";
            return { value: id, label: `${name}${num}` };
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setEmployeeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeSearch, isAdmin, isStaffRole]);

  const loadTimetable = useCallback(async (employeeId: number) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const result = await loadMyTimetableSchedules(employeeId);
      if (!result.success) {
        setSchedule({ weekdays: [] });
        if (result.message && !/no record/i.test(result.message)) {
          toastError(result.message);
        } else {
          toastInfo(result.message ?? "No timetable found");
        }
        return;
      }
      if (result.rows.length === 0) {
        setSchedule({ weekdays: [] });
        toastInfo("No timetable found");
        return;
      }
      setSchedule(buildStaffMyTimetable(result.rows));
    } catch (e) {
      toastError(getErrorMessage(e));
      setSchedule({ weekdays: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    if (!activeEmployeeId) return;
    void loadTimetable(activeEmployeeId);
  }, [sessionLoading, isResolving, activeEmployeeId, loadTimetable]);

  function onEmployeeChange(value: string | null) {
    setSelectedEmployeeId(value);
    const opt = employeeOptions.find((o) => o.value === value);
    setEmployeeLabel(opt?.label ?? "");
  }

  function onScheduleClick(
    timing: MyTimetableTiming,
    weekday: MyTimetableWeekday,
  ) {
    const resources = Array.isArray(timing.subjectResource)
      ? timing.subjectResource
      : [];
    if (resources.length === 0) return;
    setModalContext({ timing, weekday });
  }

  const hasSchedule = schedule.weekdays.length > 0;

  return (
    <PageContainer>
      {isAdmin ? (
        <div className="mb-4 rounded-lg border bg-card">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Filter className="h-4 w-4" />
              {pageTitle}
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              Filter
              {filtersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>
          {filtersOpen ? (
            <div className="border-t px-4 pb-4 pt-3">
              <Select
                label="Employee"
                value={selectedEmployeeId}
                onChange={onEmployeeChange}
                options={employeeOptions}
                placeholder="Search employee (min 4 chars)"
                searchable
                onSearch={setEmployeeSearch}
                isLoading={employeeLoading}
                disabled={isStaffRole}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border bg-card py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading timetable...
        </div>
      ) : hasSchedule ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">
              Timetable
              {isAdmin && employeeLabel ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  - {employeeLabel}
                </span>
              ) : null}
            </h3>
          </div>
          <div className="overflow-x-auto p-3">
            <WeekTimetableTable
              schedule={schedule}
              onSchedule={onScheduleClick}
            />
          </div>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No timetable to display.
        </p>
      )}

      {modalContext ? (
        <LiveClassScheduleModal
          open={Boolean(modalContext)}
          onClose={() => setModalContext(null)}
          timing={modalContext.timing}
          weekday={modalContext.weekday}
          userId={userId}
          onScheduled={() => {
            toastSuccess("Live class scheduled");
            if (activeEmployeeId) void loadTimetable(activeEmployeeId);
          }}
        />
      ) : null}
    </PageContainer>
  );
}
