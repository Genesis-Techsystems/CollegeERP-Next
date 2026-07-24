"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Label } from "@/components/ui/label";
import {
  listProxyProcessStatuses,
  saveStaffProxiesList,
  toLeaveYmd,
  type AnyRow,
} from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  processStatusCatdetId: z.coerce.number().min(1, "Status is required"),
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
  const [statuses, setStatuses] = useState<AnyRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { processStatusCatdetId: 0 },
  });

  useEffect(() => {
    if (!open || !row) return;
    reset({
      processStatusCatdetId: Number(row.processStatusCatdetId ?? 0),
    });
    let cancelled = false;
    (async () => {
      try {
        const rows = await listProxyProcessStatuses();
        if (!cancelled) setStatuses(rows);
      } catch (e) {
        toastError(e, "Failed to load statuses");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    if (!row) return;
    const status = statuses.find(
      (s) => Number(s.generalDetailId) === values.processStatusCatdetId,
    );
    const payload: AnyRow[] = [];
    for (const item of rawAccepted) {
      if (
        String(item.reason) === String(row.reason) &&
        String(item.proxyDate) === String(row.proxyDate)
      ) {
        payload.push({
          staffProxyId: item.staffProxyId,
          staffCourseyrSubjectId: row.staffCourseyrSubjectId,
          isActive: row.isActive,
          reason: row.reason,
          proxyDate: toLeaveYmd(row.proxyDate) ?? row.proxyDate,
          subjectId: row.subjectId,
          subjectTypeId: row.proxySubjecttypeId ?? row.subjectTypeId,
          createdDt: item.createdDt,
          collegeId: row.collegeId,
          proxyEmpId: row.proxyEmpId,
          isApproved: row.isApproved,
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

    setSaving(true);
    try {
      const result = await saveStaffProxiesList(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Status updated");
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

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Change Status"
      isSubmitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Subject: </span>
          {String(row.subjectName ?? "")}
        </p>
        <p>
          <span className="text-muted-foreground">Requested by: </span>
          {String(row.assignedFirstName ?? "")}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Status *</Label>
        <Controller
          name="processStatusCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={statuses.map(
                (s): SelectOption => ({
                  value: String(s.generalDetailId),
                  label: String(
                    s.generalDetailDisplayName ?? s.generalDetailName ?? "",
                  ),
                }),
              )}
              placeholder="Status"
            />
          )}
        />
      </div>
    </FormModal>
  );
}
