"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { FormModal } from "@/common/components/feedback";
import { Label } from "@/components/ui/label";
import {
  checkAttendanceTaken,
  listLeaveHolidayEvents,
  listStaffForProxy,
  listStaffSubjectsForProxy,
  subjectResourceOf,
  tConvert,
  toLeaveSlashYmd,
  type AnyRow,
} from "@/services";
import { toastError } from "@/lib/toast";

const schema = z.object({
  empId: z.coerce.number().min(1, "Staff is required"),
  staffCourseyrSubjectId: z.coerce.number().optional(),
  proxyDate: z.custom<Date>(
    (v) => v instanceof Date && !Number.isNaN(v.getTime()),
    { message: "Date is required" },
  ),
  isActive: z.boolean().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SetProxyModalProps {
  open: boolean;
  /** Angular passes array of schedule rows (LAB may have multiple). */
  items: AnyRow[];
  employeeId: number;
  onClose: () => void;
  onSave: (payload: AnyRow) => void;
}

export function SetProxyModal({
  open,
  items,
  employeeId,
  onClose,
  onSave,
}: SetProxyModalProps) {
  const detail = items[0] ?? null;
  const resource = detail ? subjectResourceOf(detail) : {};
  const isLab = String(resource.subjectTypeName ?? "") === "LAB";

  const [staff, setStaff] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<AnyRow[]>([]);
  const [events, setEvents] = useState<AnyRow[]>([]);
  const [isDay, setIsDay] = useState(true);
  const [isTakenAttendance, setIsTakenAttendance] = useState(false);
  const [loading, setLoading] = useState(false);

  const minDate = useMemo(() => {
    const raw = resource.fromDate;
    if (!raw) return undefined;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [resource.fromDate]);

  const maxDate = useMemo(() => {
    const raw = resource.toDate;
    if (!raw) return undefined;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [resource.toDate]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      empId: 0,
      staffCourseyrSubjectId: undefined,
      proxyDate: new Date(),
      isActive: true,
      reason: "active",
    },
  });

  const proxyDate = watch("proxyDate");

  useEffect(() => {
    if (!open || !detail) return;
    reset({
      empId: 0,
      staffCourseyrSubjectId: undefined,
      proxyDate: new Date(),
      isActive: true,
      reason: "active",
    });
    setEvents([]);
    setFilteredSubjects([]);
    setSubjects([]);
    setIsTakenAttendance(false);
    setIsDay(true);

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await listStaffForProxy({
          groupSectionId: Number(detail.groupSectionId),
          weekdayName: String(detail.labelName ?? detail.weekdayName ?? ""),
          startTime: String(detail.startTime ?? ""),
          endTime: String(detail.endTime ?? ""),
          empId: employeeId,
        });
        if (cancelled) return;
        setStaff(
          rows.filter((r) => String(r.fk_emp_id) !== String(employeeId)),
        );
        await checkEventsForDate(getValues("proxyDate"));
      } catch (e) {
        toastError(e, "Failed to load proxy staff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail, employeeId]);

  async function checkEventsForDate(date: Date | undefined) {
    if (!detail || !date) return;
    setEvents([]);
    setIsDay(true);
    const weekday = date.getDay();
    const names = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = names[weekday];
    const expected = String(detail.weekdayName ?? "");
    if (dayName !== expected) {
      setIsDay(false);
      return;
    }

    const slash = toLeaveSlashYmd(date);
    if (!slash) return;

    const [taken, holidayEvents] = await Promise.all([
      checkAttendanceTaken(Number(detail.timetableScheduleId), slash),
      listLeaveHolidayEvents({
        collegeId: Number(detail.collegeId),
        startDate: slash,
        endDate: slash,
      }),
    ]);
    setIsTakenAttendance(taken);
    setEvents(holidayEvents);
  }

  async function onStaffChange(empId: number) {
    setValue("empId", empId);
    setFilteredSubjects([]);
    if (!detail || !empId) return;
    try {
      const rows = await listStaffSubjectsForProxy({
        collegeId: Number(detail.collegeId),
        academicYearId: Number(detail.academicYearId),
        employeeId: empId,
        groupSectionId: Number(detail.groupSectionId),
        withStatus: true,
      });
      setSubjects(rows);
      const filtered = rows.filter((s) => {
        const t = String(s.subjectType ?? "");
        return t === "THEORY" || t === "ELECTIVE";
      });
      setFilteredSubjects(filtered);
      if (isLab) setValue("staffCourseyrSubjectId", undefined);
    } catch (e) {
      toastError(e, "Failed to load subjects");
    }
  }

  function onSubmit(values: FormValues) {
    if (!detail) return;
    if (!isLab && !values.staffCourseyrSubjectId) return;

    const Obj: AnyRow = {
      empId: values.empId,
      staffCourseyrSubjectId: isLab ? null : values.staffCourseyrSubjectId,
      proxyDate: values.proxyDate,
      isActive: values.isActive ?? true,
      reason: values.reason ?? "active",
    };

    const match = subjects.find(
      (x) =>
        Number(x.staffCourseyrSubjectId) ===
        Number(values.staffCourseyrSubjectId),
    );
    if (match) {
      Obj.subjectId = match.subjectId;
      Obj.subjectTypeId = match.subjectTypeId;
    } else {
      Obj.subjectId = resource.subjectId;
      Obj.subjectTypeId = resource.subjectTypeId;
    }

    onSave(Obj);
  }

  const staffOptions: SelectOption[] = staff.map((s) => ({
    value: String(s.fk_emp_id),
    label: String(s.first_name ?? ""),
  }));

  const subjectOptions: SelectOption[] = filteredSubjects.map((s) => ({
    value: String(s.staffCourseyrSubjectId),
    label: `${String(s.subjectName ?? "")} (${String(s.subjectType ?? "")})`,
  }));

  if (!detail) return null;

  const canSave = isDay && !isTakenAttendance && events.length === 0;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Set Proxy"
      size="lg"
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={loading}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="space-y-2 rounded-md border p-3 text-sm">
        <Detail
          label="College"
          value={`${String(detail.collegeCode ?? "")} (${String(detail.academicYearName ?? "")})`}
        />
        <Detail
          label="Course"
          value={`${String(detail.courseName ?? "")} / ${String(detail.groupName ?? "")} / ${String(detail.courseYearName ?? "")} / ${String(detail.groupSectionName ?? "")}`}
        />
        <Detail
          label="Subject"
          value={`${String(resource.subjectName ?? "")}${resource.studentBatchName ? ` (${String(resource.studentBatchName)})` : ""}`}
        />
        <Detail label="Weekday" value={String(detail.weekdayName ?? "")} />
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <span className="text-muted-foreground">Timing :</span>
          <div>
            {items.map((item, i) => (
              <p key={i} className="text-blue-700">
                {tConvert(item.startTime)} - {tConvert(item.endTime)}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full max-w-[11rem] space-y-1.5">
          <Label>Proxy Date *</Label>
          <Controller
            name="proxyDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={(d) => {
                  if (d) {
                    field.onChange(d);
                    void checkEventsForDate(d);
                  }
                }}
                minDate={minDate}
                maxDate={maxDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
            )}
          />
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <Label>Staff *</Label>
          <Controller
            name="empId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => void onStaffChange(v ? Number(v) : 0)}
                options={staffOptions}
                placeholder="Staff"
                isLoading={loading}
              />
            )}
          />
          {errors.empId ? (
            <p className="text-xs text-destructive">{errors.empId.message}</p>
          ) : null}
        </div>
        {!isLab ? (
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label>Subject *</Label>
            <Controller
              name="staffCourseyrSubjectId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={subjectOptions}
                  placeholder="Subject"
                />
              )}
            />
          </div>
        ) : null}
      </div>

      {!isDay ? (
        <p className="text-sm font-medium text-destructive">
          Note : Selected day is not matched.
        </p>
      ) : null}
      {isTakenAttendance && isDay ? (
        <p className="text-sm font-medium text-destructive">
          Not possible to adjust as attendance is already marked.
        </p>
      ) : null}
      {events.length > 0 ? (
        <ul className="rounded-sm border border-yellow-400 bg-[#ffffbf] px-3 py-2 text-sm font-medium">
          {events.map((ev, i) => (
            <li key={i}>
              {String(ev.eventName ?? "")} ({String(ev.startDate ?? "")} -{" "}
              {String(ev.endDate ?? "")})
            </li>
          ))}
        </ul>
      ) : null}

      {/* Hide save via FormModal always showing Save — gate in onSubmit with canSave */}
      {!canSave ? (
        <p className="text-xs text-muted-foreground">
          Save is disabled until the selected day matches and
          attendance/holidays allow proxy.
        </p>
      ) : null}
    </FormModal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <span className="text-muted-foreground">{label} :</span>
      <span className="text-blue-700">{value}</span>
    </div>
  );
}
