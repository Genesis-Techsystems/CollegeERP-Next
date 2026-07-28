"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { MultiSelect, type SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DATE_FORMATS } from "@/config/constants";
import { cn, rowIndexGetter } from "@/lib/utils";
import {
  createLiveClassSchedule,
  formatLeaveYmd,
  getDigitalLiveClassEnv,
  listLiveClassSchedulesForSlot,
  startZoomLiveClassSchedules,
  tConvert,
  type LiveScheduleRow,
  type MyTimetableTiming,
  type MyTimetableWeekday,
} from "@/services";

type AnyRow = Record<string, unknown>;

type LiveClassScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  timing: MyTimetableTiming;
  weekday: MyTimetableWeekday;
  userId: number;
  onScheduled: () => void;
};

type WeekdayOption = { id: number; name: string; checked: boolean };

const RECURRING_WEEKDAYS: WeekdayOption[] = [
  { id: 7, name: "Sunday", checked: false },
  { id: 1, name: "Monday", checked: false },
  { id: 2, name: "Tuesday", checked: false },
  { id: 3, name: "Wednesday", checked: false },
  { id: 4, name: "Thursday", checked: false },
  { id: 5, name: "Friday", checked: false },
  { id: 6, name: "Saturday", checked: false },
];

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

function subjectResourceOf(timing: MyTimetableTiming): AnyRow | null {
  const resources = Array.isArray(timing.subjectResource)
    ? timing.subjectResource
    : [];
  return (resources[0] as AnyRow | undefined) ?? null;
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, DATE_FORMATS.DISPLAY);
}

type FieldErrors = {
  scheduledOnDate?: string;
  scheduledEndDate?: string;
  agenda?: string;
};

function StableFieldError({ message }: { message?: string }) {
  return (
    <p className="min-h-4 text-[11px] leading-4 text-destructive" role="alert">
      {message ?? "\u00a0"}
    </p>
  );
}

function datePickerErrorClass(hasError?: string) {
  return hasError
    ? "[&_button]:border-destructive [&_button]:focus-visible:ring-destructive"
    : undefined;
}

const SLOT_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LiveScheduleRow>,
  faculty: { headerName: "Faculty", minWidth: 160 } as ColDef<LiveScheduleRow>,
  subject: { headerName: "Subject", minWidth: 180 } as ColDef<LiveScheduleRow>,
  scheduleDate: {
    headerName: "Schedule Date",
    minWidth: 140,
  } as ColDef<LiveScheduleRow>,
  scheduleTime: {
    headerName: "Schedule Time",
    minWidth: 140,
  } as ColDef<LiveScheduleRow>,
};

function facultyRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  const row = p.data;
  if (!row) return null;
  const name = String(row.empName ?? row.employesName ?? "").trim();
  const num = row.empNumber ? `(${row.empNumber})` : "";
  return (
    <span>
      {name}{" "}
      {num ? <span className="font-semibold text-blue-700">{num}</span> : null}
    </span>
  );
}

function subjectRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  return String(p.data?.topic ?? "");
}

function scheduleDateRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  return formatDisplayDate(p.data?.scheduledOnDate);
}

function scheduleTimeRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  const row = p.data;
  if (!row) return null;
  return `${tConvert(row.fromTime)} - ${tConvert(row.toTime)}`;
}

export function LiveClassScheduleModal({
  open,
  onClose,
  timing,
  weekday,
  userId,
  onScheduled,
}: LiveClassScheduleModalProps) {
  const env = getDigitalLiveClassEnv();
  const subject = subjectResourceOf(timing);

  const [scheduledOnDate, setScheduledOnDate] = useState<Date | null>(
    () => new Date(),
  );
  const [scheduledEndDate, setScheduledEndDate] = useState<Date | null>(
    () => new Date(),
  );
  const [agenda, setAgenda] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [weekdays, setWeekdays] = useState<WeekdayOption[]>(RECURRING_WEEKDAYS);
  const [periodIds, setPeriodIds] = useState<string[]>([]);
  const [slotSchedules, setSlotSchedules] = useState<LiveScheduleRow[]>([]);
  const [loadingSlot, setLoadingSlot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const periodOptions = useMemo<SelectOption[]>(() => {
    return (weekday.classTimings ?? [])
      .filter((row) => row.isBreak !== true)
      .map((row) => {
        const id = String(row.timetableScheduleId ?? "");
        const label = `${row.classTimingName ?? "Period"} [${tConvert(row.startTime)} - ${tConvert(row.endTime)}]`;
        return { value: id, label };
      })
      .filter((opt) => opt.value);
  }, [weekday.classTimings]);

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    setScheduledOnDate(today);
    setScheduledEndDate(today);
    setAgenda("");
    setIsRecurring(false);
    setFieldErrors({});
    setWeekdays(RECURRING_WEEKDAYS.map((d) => ({ ...d, checked: false })));

    const defaultPeriod = String(timing.timetableScheduleId ?? "");
    if (defaultPeriod) {
      setPeriodIds([defaultPeriod]);
    } else if (periodOptions[0]?.value) {
      setPeriodIds([periodOptions[0].value]);
    } else {
      setPeriodIds([]);
    }
  }, [open, timing.timetableScheduleId, periodOptions]);

  useEffect(() => {
    if (!open || !subject) {
      setSlotSchedules([]);
      return;
    }
    const staffId = positiveId(subject.staffId);
    const groupSectionId = positiveId(subject.groupSectionId);
    const timetableScheduleId = positiveId(timing.timetableScheduleId);
    if (!staffId || !groupSectionId || !timetableScheduleId) {
      setSlotSchedules([]);
      return;
    }

    let cancelled = false;
    setLoadingSlot(true);
    void listLiveClassSchedulesForSlot({
      employeeId: staffId,
      timetableScheduleId,
      groupSectionId,
    })
      .then((rows) => {
        if (!cancelled) setSlotSchedules(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlot(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, subject, timing.timetableScheduleId]);

  const slotColumnDefs = useMemo<ColDef<LiveScheduleRow>[]>(
    () => [
      SLOT_COL_DEFS.siNo,
      { ...SLOT_COL_DEFS.faculty, cellRenderer: facultyRenderer },
      { ...SLOT_COL_DEFS.subject, cellRenderer: subjectRenderer },
      { ...SLOT_COL_DEFS.scheduleDate, cellRenderer: scheduleDateRenderer },
      { ...SLOT_COL_DEFS.scheduleTime, cellRenderer: scheduleTimeRenderer },
    ],
    [],
  );

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();

    const next: FieldErrors = {};
    if (!scheduledOnDate) {
      next.scheduledOnDate = "Schedule From Date is required";
    }
    if (!scheduledEndDate) {
      next.scheduledEndDate = "Schedule To Date is required";
    }
    if (!agenda.trim()) {
      next.agenda = "Agenda is required";
    }
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }
    if (!scheduledOnDate || !scheduledEndDate) return;
    if (!subject) return;

    setFieldErrors({});

    const payload: AnyRow = {
      scheduledOnDate: formatLeaveYmd(scheduledOnDate),
      scheduledEndDate: formatLeaveYmd(scheduledEndDate),
      fromTime: timing.startTime,
      toTime: timing.endTime,
      password: "123456789",
      sessionIds: [],
      hostVideo: true,
      isOnetime: true,
      isRecurring,
      agenda: agenda.trim(),
      topic: String(subject.subjectName ?? ""),
      collegeId: timing.collegeId,
      userId: userId || positiveId(readStorage("userId")),
      groupSectionId: subject.groupSectionId,
      timetableScheduleId: timing.timetableScheduleId,
      clsEmpId: subject.staffId,
      subjectId: subject.subjectId,
      stdbatchId: subject.studentBatchId,
      weekdayId: timing.weekdayId,
      classTimingId: timing.classTimingId,
      subjecttypeCatdetId: subject.subjectTypeId,
      weekDays: weekdays.filter((d) => d.checked).map((d) => d.id),
    };

    if (env === "CODIIS") {
      payload.sessionId = 1;
    }

    setSubmitting(true);
    try {
      const data = await createLiveClassSchedule(payload, env);
      if (env === "ZOOM" && Array.isArray(data)) {
        const ids = data
          .map((row) =>
            positiveId(
              (row as LiveScheduleRow).liveClsScheduleId,
              (row as AnyRow).liveClsScheduleId,
            ),
          )
          .filter(Boolean);
        if (ids.length > 0) {
          await startZoomLiveClassSchedules(ids);
        }
      }
      onScheduled();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Live Class Schedule"
      onSubmit={onSubmit}
      isSubmitting={submitting}
      submitLabel="Schedule"
      cancelLabel="Close"
      size="xl"
      formClassName="space-y-4 py-0"
    >
      <div className="space-y-1 text-[15px]">
        <p>
          College :{" "}
          <span className="font-medium text-blue-700">
            {String(timing.collegeCode ?? "")} (
            {String(timing.academicYearName ?? "")})
          </span>
        </p>
        <p>
          Course :{" "}
          <span className="font-medium text-blue-700">
            {[
              timing.courseName,
              timing.groupName,
              timing.courseYearName,
              timing.groupSectionName,
            ]
              .filter(Boolean)
              .join(" / ")}
          </span>
        </p>
        <p>
          Timetable :{" "}
          <span className="font-medium text-blue-700">
            {String(timing.timetableName ?? "")}
          </span>
        </p>
        {subject ? (
          <>
            <p>
              Staff :{" "}
              <span className="font-medium text-blue-700">
                {String(subject.staffName ?? "")}
                {subject.empNumber ? (
                  <>
                    {" "}
                    -{" "}
                    <span className="text-muted-foreground">
                      ({String(subject.empNumber)})
                    </span>
                  </>
                ) : null}
              </span>
            </p>
            <p>
              Subject :{" "}
              <span className="font-medium text-blue-700">
                {String(subject.subjectCode ?? subject.subjectName ?? "")}
                {subject.subjectTypeName ? (
                  <>
                    {" "}
                    -{" "}
                    <span className="text-muted-foreground">
                      ({String(subject.subjectTypeName)})
                    </span>
                  </>
                ) : null}
              </span>
            </p>
          </>
        ) : null}
      </div>

      <MultiSelect
        label="Peroids"
        value={periodIds}
        onChange={setPeriodIds}
        options={periodOptions}
        disabled={Boolean(subject)}
        placeholder="Select periods"
        className="max-w-md"
      />

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-[220px_220px_minmax(200px,1fr)_auto]">
        <div
          className={cn(
            "flex w-full max-w-[220px] flex-col",
            datePickerErrorClass(fieldErrors.scheduledOnDate),
          )}
        >
          <DatePicker
            label="Schedule From Date"
            value={scheduledOnDate}
            onChange={(d) => {
              setScheduledOnDate(d);
              if (d) setScheduledEndDate(d);
              setFieldErrors((prev) => ({
                ...prev,
                scheduledOnDate: undefined,
              }));
            }}
            minDate={new Date()}
            displayFormat="dd/MM/yyyy"
            className="w-full"
            required
          />
          <StableFieldError message={fieldErrors.scheduledOnDate} />
        </div>

        <div
          className={cn(
            "flex w-full max-w-[220px] flex-col",
            datePickerErrorClass(fieldErrors.scheduledEndDate),
          )}
        >
          <DatePicker
            label="Schedule To Date"
            value={scheduledEndDate}
            onChange={(d) => {
              setScheduledEndDate(d);
              setFieldErrors((prev) => ({
                ...prev,
                scheduledEndDate: undefined,
              }));
            }}
            minDate={scheduledOnDate ?? new Date()}
            displayFormat="dd/MM/yyyy"
            className="w-full"
            required
          />
          <StableFieldError message={fieldErrors.scheduledEndDate} />
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="live-class-agenda"
              className="text-[12px] font-medium"
            >
              Agenda
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              id="live-class-agenda"
              value={agenda}
              onChange={(ev) => {
                setAgenda(ev.target.value);
                if (ev.target.value.trim()) {
                  setFieldErrors((prev) => ({ ...prev, agenda: undefined }));
                }
              }}
              placeholder="Agenda"
              aria-invalid={Boolean(fieldErrors.agenda)}
              className={cn(
                "h-8 text-[12px] font-normal",
                fieldErrors.agenda && "border-destructive",
              )}
            />
          </div>
          <StableFieldError message={fieldErrors.agenda} />
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[12px] font-medium leading-none opacity-0"
              aria-hidden
            >
              Recurring
            </span>
            <label className="flex h-8 items-center gap-2 whitespace-nowrap text-sm">
              <Checkbox
                checked={isRecurring}
                onCheckedChange={(v) => setIsRecurring(v === true)}
              />
              Recurring
            </label>
          </div>
          <StableFieldError />
        </div>
      </div>

      {isRecurring ? (
        <div className="flex flex-wrap gap-3">
          {weekdays.map((day) => (
            <label key={day.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={day.checked}
                onCheckedChange={(v) =>
                  setWeekdays((prev) =>
                    prev.map((d) =>
                      d.id === day.id ? { ...d, checked: v === true } : d,
                    ),
                  )
                }
              />
              {day.name}
            </label>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-blue-700">
          Live Classe Schedules
        </h4>
        <DataTable
          rowData={slotSchedules}
          columnDefs={slotColumnDefs}
          loading={loadingSlot}
          height="auto"
          pagination={false}
          toolbar={false}
        />
      </div>
    </FormModal>
  );
}
