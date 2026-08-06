"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { utcMidnightIso } from "@/common/generic-functions";
import {
  createGrievanceCommitteeMember,
  listActiveOrganizationsForGrievanceMasters,
  listCollegesForGrievanceMember,
  listDepartmentsForGrievanceMember,
  listEmployeesForGrievanceMemberAdd,
  listEmployeesForGrievanceMemberEdit,
  updateGrievanceCommitteeMember,
  type GrievanceCommittee,
  type GrievanceCommitteeMember,
  type GrievanceEmployeeOption,
} from "@/services";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  collegeId: z.number().optional().nullable(),
  departmentId: z.number().optional().nullable(),
  employeeId: z.number().min(1, "Employee is required"),
  fromDate: z.date().nullable().optional(),
  toDate: z.date().nullable().optional(),
  isApprover: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function presentDateAsDate(): Date {
  const raw = String(
    globalThis?.localStorage?.getItem("presentDate") ?? "",
  ).trim();
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  }
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function employeeLabel(e: GrievanceEmployeeOption): string {
  const name = e.firstName ?? e.empName ?? "";
  const num = e.empNumber ?? "";
  if (name && num) return `${name} (${num})`;
  return name || num || String(e.employeeId);
}

export function GrievanceCommitteeMemberModal({
  open,
  onClose,
  committee,
  member,
  hierarchyLevel,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Required for Add (committee row from hub). */
  committee?: GrievanceCommittee | null;
  /** When set, modal is Edit mode. */
  member?: GrievanceCommitteeMember | null;
  hierarchyLevel?: number | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(member);
  const level = Number(hierarchyLevel ?? committee?.hierarchyLevel ?? 0);
  const showCollege = level === 2 || level === 3;
  const showDepartment = level === 3;
  const committeeCode =
    committee?.committeeCode ?? member?.committeeCode ?? null;
  const grvCommitteeId =
    committee?.grvCommitteeId ?? member?.grvCommitteeId ?? 0;
  const committeeName =
    committee?.committeeName ?? member?.grvCommitteeName ?? "";

  const [organizations, setOrganizations] = useState<
    Array<{ organizationId: number; orgCode?: string; orgName?: string }>
  >([]);
  const [colleges, setColleges] = useState<
    Array<{ collegeId: number; collegeCode?: string; collegeName?: string }>
  >([]);
  const [departments, setDepartments] = useState<
    Array<{ departmentId: number; deptCode?: string; departmentName?: string }>
  >([]);
  const [employees, setEmployees] = useState<GrievanceEmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      collegeId: null,
      departmentId: null,
      employeeId: 0,
      fromDate: presentDateAsDate(),
      toDate: presentDateAsDate(),
      isApprover: false,
      isActive: true,
      reason: "active",
    },
  });

  const organizationId = watch("organizationId");
  const collegeId = watch("collegeId");

  useEffect(() => {
    if (!open) return;
    listActiveOrganizationsForGrievanceMasters()
      .then(setOrganizations)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (member) {
      reset({
        organizationId: member.organizationId,
        collegeId: member.collegeId ?? null,
        departmentId: member.departmentId ?? null,
        employeeId: member.employeeId,
        fromDate: parseApiDate(member.fromDate) ?? presentDateAsDate(),
        toDate: parseApiDate(member.toDate) ?? presentDateAsDate(),
        isApprover: Boolean(member.isApprover),
        isActive: member.isActive !== false,
        reason: member.reason ?? "active",
      });
    } else {
      reset({
        organizationId: undefined,
        collegeId: null,
        departmentId: null,
        employeeId: 0,
        fromDate: presentDateAsDate(),
        toDate: presentDateAsDate(),
        isApprover: false,
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [member, open, reset]);

  // Load colleges when org changes (Angular selectedOrg)
  useEffect(() => {
    if (!open || !organizationId) {
      setColleges([]);
      return;
    }
    let cancelled = false;
    listCollegesForGrievanceMember(organizationId)
      .then((rows) => {
        if (!cancelled) setColleges(rows);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [open, organizationId]);

  // Load departments when college changes
  useEffect(() => {
    if (!open || !collegeId) {
      setDepartments([]);
      return;
    }
    let cancelled = false;
    listDepartmentsForGrievanceMember(collegeId)
      .then((rows) => {
        if (!cancelled) setDepartments(rows);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [open, collegeId]);

  // Load employees — Add vs Edit Angular parity
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEmployeesLoading(true);
    const load = isEditing
      ? listEmployeesForGrievanceMemberEdit({
          committeeCode,
          organizationId,
          collegeId,
        })
      : listEmployeesForGrievanceMemberAdd({
          committeeCode,
          organizationId,
        });
    load
      .then((rows) => {
        if (!cancelled) setEmployees(rows);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEditing, committeeCode, organizationId, collegeId]);

  const organizationOptions = useMemo(
    () =>
      organizations.map((org) => ({
        value: String(org.organizationId),
        label: org.orgCode ?? org.orgName ?? String(org.organizationId),
      })),
    [organizations],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  );
  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.departmentId),
        label: d.deptCode ?? d.departmentName ?? String(d.departmentId),
      })),
    [departments],
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: String(e.employeeId),
        label: employeeLabel(e),
      })),
    [employees],
  );

  function validateDates(
    from: Date | null | undefined,
    to: Date | null | undefined,
  ) {
    if (from && to && from.getTime() > to.getTime()) {
      toast.info("From date should be less then To date.");
      setValue("toDate", from);
      return from;
    }
    return to;
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    if (!grvCommitteeId) {
      setSubmitError("Committee is missing");
      return;
    }
    const toDate = isEditing
      ? data.toDate
      : validateDates(data.fromDate, data.toDate);
    const payload = {
      organizationId: data.organizationId,
      collegeId: data.collegeId ?? null,
      departmentId: data.departmentId ?? null,
      employeeId: data.employeeId,
      grvCommitteeId,
      fromDate: data.fromDate ? utcMidnightIso(data.fromDate) : null,
      toDate: toDate ? utcMidnightIso(toDate) : null,
      isApprover: Boolean(data.isApprover),
      isActive: data.isActive,
      reason: data.reason,
    };
    try {
      if (isEditing) {
        await updateGrievanceCommitteeMember(
          member!.committeeMemberId,
          payload,
        );
      } else {
        await createGrievanceCommitteeMember(payload);
      }
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save member",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            {isEditing ? "Edit Committee Member" : "Add Committee Member"}
          </DialogTitle>
          {!isEditing && committeeName ? (
            <p className="text-sm text-muted-foreground pt-1">
              Committee : {committeeName}
            </p>
          ) : null}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => {
                  field.onChange(value ? Number(value) : undefined);
                  setValue("collegeId", null);
                  setValue("departmentId", null);
                  setValue("employeeId", 0);
                }}
                options={organizationOptions}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          {showCollege ? (
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => {
                    field.onChange(value ? Number(value) : null);
                    setValue("departmentId", null);
                    setValue("employeeId", 0);
                  }}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  clearable
                />
              )}
            />
          ) : null}
          {showDepartment ? (
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department"
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : null)
                  }
                  options={departmentOptions}
                  placeholder="Select department"
                  searchable
                  clearable
                />
              )}
            />
          ) : null}
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Employee"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : 0)}
                options={employeeOptions}
                placeholder="Search by Employee name or Id."
                searchable
                isLoading={employeesLoading}
                error={errors.employeeId?.message}
              />
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="fromDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="From Date"
                  value={field.value ?? null}
                  onChange={(d) => {
                    field.onChange(d);
                    if (!isEditing) validateDates(d, watch("toDate"));
                  }}
                />
              )}
            />
            <Controller
              name="toDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="To Date"
                  value={field.value ?? null}
                  onChange={(d) => {
                    field.onChange(d);
                    if (!isEditing) validateDates(watch("fromDate"), d);
                  }}
                  minDate={watch("fromDate") ?? undefined}
                />
              )}
            />
          </div>
          <Controller
            name="isApprover"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="isApprover"
                  checked={Boolean(field.value)}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isApprover" className="cursor-pointer">
                  Approver
                </Label>
              </div>
            )}
          />
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(value) => setValue("reason", value)}
                reasonError={errors.reason?.message}
              />
            )}
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
