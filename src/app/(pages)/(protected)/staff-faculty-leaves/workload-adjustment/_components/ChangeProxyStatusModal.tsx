"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSessionContext } from "@/context/SessionContext";
import {
  listActualClassesScheduleForProxy,
  listProxyProcessStatuses,
  saveStaffProxiesList,
  scheduleProxyLiveClasses,
  toLeaveSlashYmd,
  toLeaveYmd,
  type AnyRow,
} from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  processStatusCatdetId: z.coerce.number().min(1, "Process Status is required"),
  isScheduleLiveClass: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ChangeProxyStatusModalProps {
  open: boolean;
  row: AnyRow | null;
  rawAccepted: AnyRow[];
  onClose: () => void;
  onSaved: () => void;
}

export function ChangeProxyStatusModal({
  open,
  row,
  rawAccepted,
  onClose,
  onSaved,
}: ChangeProxyStatusModalProps) {
  const { user } = useSessionContext();
  const [statuses, setStatuses] = useState<AnyRow[]>([]);
  const [attendanceTaken, setAttendanceTaken] = useState(false);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      processStatusCatdetId: 0,
      isScheduleLiveClass: false,
    },
  });

  useEffect(() => {
    if (!open || !row) return;
    reset({
      processStatusCatdetId: Number(row.processStatusCatdetId ?? 0),
      isScheduleLiveClass: false,
    });
    setAttendanceTaken(false);

    let cancelled = false;
    (async () => {
      try {
        const [statusRows, attendanceRows] = await Promise.all([
          listProxyProcessStatuses(),
          (async () => {
            const times = Array.isArray(row.times)
              ? (row.times as AnyRow[])
              : [];
            const timetableScheduleId = Number(
              row.timetableScheduleId ?? times[0]?.timetableScheduleId ?? 0,
            );
            const classDate = toLeaveSlashYmd(row.proxyDate);
            if (!timetableScheduleId || !classDate) return [];
            return listActualClassesScheduleForProxy({
              proxyEmpId: Number(row.proxyEmpId ?? 0),
              timetableScheduleId,
              classDate,
              subjectId: Number(row.subjectId ?? 0),
            });
          })(),
        ]);
        if (cancelled) return;
        setStatuses(statusRows);
        setAttendanceTaken(attendanceRows.length > 0);
      } catch (e) {
        toastError(e, "Failed to load status form");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    if (!row || attendanceTaken) return;

    const status = statuses.find(
      (s) => Number(s.generalDetailId) === values.processStatusCatdetId,
    );
    const statusCode = String(status?.generalDetailCode ?? "");
    const isApproved = statusCode === "ACCEPTED";
    const reason = statusCode === "REJECTED" ? null : row.subjectCourseyearId;

    const payload: AnyRow[] = [];
    for (const item of rawAccepted) {
      if (
        String(item.reason) === String(row.reason) &&
        String(item.proxyDate) === String(row.proxyDate)
      ) {
        payload.push({
          staffProxyId: item.staffProxyId,
          startTime: item.startTime,
          endTime: item.endTime,
          staffCourseyrSubjectId: row.staffCourseyrSubjectId,
          isActive: row.isActive,
          groupSectionId: item.groupSectionId,
          classTimingId: item.classTimingId,
          weekdayId: item.weekdayId,
          subjectName: item.subjectName,
          reason,
          proxyDate: toLeaveYmd(row.proxyDate) ?? row.proxyDate,
          subjectId: row.subjectId,
          subjectTypeId: row.proxySubjecttypeId ?? row.subjectTypeId,
          createdDt: item.createdDt,
          collegeId: row.collegeId,
          proxyEmpId: row.proxyEmpId,
          isApproved,
          processStatusCatdetId: values.processStatusCatdetId,
          processStatusName: status?.generalDetailDisplayName,
          assignedbyEmployeeId: row.assignedbyEmployeeId,
          studentbatchId: row.studentbatchId,
          subjectCourseyearId: row.subjectCourseyearId,
          timetableScheduleId: item.timetableScheduleId,
          proxySubjecttypeId: row.proxySubjecttypeId,
        });
      }
    }

    if (payload.length === 0) return;

    setSaving(true);
    try {
      const result = await saveStaffProxiesList(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Status updated");
        if (isApproved && values.isScheduleLiveClass) {
          const userId = Number(user?.userId ?? 0);
          await scheduleProxyLiveClasses(payload, userId);
        }
        onSaved();
      } else {
        toastInfo(result.message ?? "Unable to update status");
      }
    } catch (e) {
      toastError(e, "Failed to change status");
    } finally {
      setSaving(false);
    }
  }

  if (!row) return null;

  const statusOptions: SelectOption[] = statuses.map((s) => ({
    value: String(s.generalDetailId),
    label: String(s.generalDetailDisplayName ?? s.generalDetailName ?? ""),
  }));

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Change Status"
      cancelLabel="Close"
      isSubmitting={saving}
      showSubmitButton={!attendanceTaken}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      size="sm"
      showHeaderDivider
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>
            Process Status <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="processStatusCatdetId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={statusOptions}
                placeholder="Process Status"
                disabled={attendanceTaken}
                searchable={false}
              />
            )}
          />
        </div>

        <Controller
          name="isScheduleLiveClass"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={attendanceTaken}
              />
              Schedule Live Class
            </label>
          )}
        />

        {attendanceTaken ? (
          <p className="text-sm font-medium text-[#976f6f]">
            Note: Status update is disabled as attendance marked for this class
            timing.
          </p>
        ) : null}
      </div>
    </FormModal>
  );
}
