"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { FormModal } from "@/common/components/feedback";
import { Label } from "@/components/ui/label";
import {
  listStaffForProxy,
  listStaffSubjectsForProxy,
  subjectResourceOf,
  tConvert,
  toLeaveYmd,
  updateStaffProxy,
  type AnyRow,
} from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  empId: z.coerce.number().min(1, "Staff is required"),
  staffCourseyrSubjectId: z.coerce.number().min(1, "Subject is required"),
  proxyDate: z.custom<Date>(
    (v) => v instanceof Date && !Number.isNaN(v.getTime()),
    { message: "Date is required" },
  ),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditProxyModalProps {
  open: boolean;
  detail: AnyRow | null;
  proxy: AnyRow | null;
  employeeId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProxyModal({
  open,
  detail,
  proxy,
  employeeId,
  onClose,
  onSaved,
}: EditProxyModalProps) {
  const [staff, setStaff] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      empId: 0,
      staffCourseyrSubjectId: 0,
      proxyDate: new Date(),
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open || !detail || !proxy) return;
    const proxyDate = proxy.proxyDate
      ? new Date(String(proxy.proxyDate))
      : new Date();
    reset({
      empId: Number(proxy.proxyEmpId ?? 0),
      staffCourseyrSubjectId: Number(proxy.staffCourseyrSubjectId ?? 0),
      proxyDate: Number.isNaN(proxyDate.getTime()) ? new Date() : proxyDate,
      isActive: Boolean(proxy.isActive ?? true),
    });

    let cancelled = false;
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
          rows.filter(
            (r) =>
              String(r.fk_emp_id) !== String(employeeId) &&
              Number(r.fk_emp_id) !== Number(detail.selectedEmpNumber),
          ),
        );
        await loadSubjects(Number(proxy.proxyEmpId ?? 0));
      } catch (e) {
        toastError(e, "Failed to load edit proxy data");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail, proxy, employeeId]);

  async function loadSubjects(empId: number) {
    if (!detail || !empId) return;
    const rows = await listStaffSubjectsForProxy({
      collegeId: Number(detail.collegeId),
      academicYearId: Number(detail.academicYearId),
      employeeId: empId,
      groupSectionId: Number(detail.groupSectionId),
      withStatus: false,
    });
    setSubjects(rows);
  }

  async function onSubmit(values: FormValues) {
    if (!detail || !proxy) return;
    if (String(proxy.processStatusName) === "Accepted") {
      toastInfo("Staff already accepted, proxy enable to update.");
      return;
    }
    const match = subjects.find(
      (x) =>
        Number(x.staffCourseyrSubjectId) ===
        Number(values.staffCourseyrSubjectId),
    );
    const res = subjectResourceOf(detail);
    const payload: AnyRow = {
      ...proxy,
      proxyEmpId: values.empId,
      staffCourseyrSubjectId: values.staffCourseyrSubjectId,
      proxyDate: toLeaveYmd(values.proxyDate),
      isActive: values.isActive ?? true,
      isApproved: proxy.isApproved,
      subjectId: match?.subjectId ?? proxy.subjectId ?? res.subjectId,
      subjectTypeId:
        match?.subjectTypeId ?? proxy.subjectTypeId ?? res.subjectTypeId,
      proxySubjecttypeId:
        match?.subjectTypeId ?? proxy.proxySubjecttypeId ?? res.subjectTypeId,
    };
    setSaving(true);
    try {
      const result = await updateStaffProxy(
        Number(proxy.staffProxyId),
        payload,
      );
      if (result.success) {
        toastSuccess(result.message ?? "Proxy updated");
        onSaved();
      } else {
        toastInfo(result.message ?? "Unable to update");
      }
    } catch (e) {
      toastError(e, "Failed to update proxy");
    } finally {
      setSaving(false);
    }
  }

  if (!detail || !proxy) return null;
  const resource = subjectResourceOf(detail);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Proxy"
      size="lg"
      isSubmitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="space-y-1 text-sm rounded-md border p-3">
        <p>
          <span className="text-muted-foreground">Subject: </span>
          <span className="text-blue-700">
            {String(resource.subjectName ?? "")}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Timing: </span>
          <span className="text-blue-700">
            {tConvert(detail.startTime)} - {tConvert(detail.endTime)}
          </span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Proxy Date *</Label>
          <Controller
            name="proxyDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={(d) => d && field.onChange(d)}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Staff *</Label>
          <Controller
            name="empId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  const id = v ? Number(v) : 0;
                  field.onChange(id);
                  setValue("staffCourseyrSubjectId", 0);
                  void loadSubjects(id);
                }}
                options={staff.map(
                  (s): SelectOption => ({
                    value: String(s.fk_emp_id),
                    label: String(s.first_name ?? ""),
                  }),
                )}
                placeholder="Staff"
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subject *</Label>
          <Controller
            name="staffCourseyrSubjectId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={subjects.map(
                  (s): SelectOption => ({
                    value: String(s.staffCourseyrSubjectId),
                    label: `${String(s.subjectName ?? "")} (${String(s.subjectType ?? "")})`,
                  }),
                )}
                placeholder="Subject"
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
