"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listGrievanceHierarchyCats } from "@/services";
import {
  listActiveOrganizationsForGrievanceMasters,
  listAllGrievanceCommittees,
  listCollegesForGrievanceMember,
  listDepartmentsForGrievanceMember,
  transferAdminGrievance,
  type AdminGrievanceRow,
  type GrievanceCommittee,
} from "@/services";

const schema = z.object({
  grvCommitteeId: z.number().min(1, "Committee is required"),
  organizationId: z.number().min(1, "Organization is required"),
  collegeId: z.number().optional().nullable(),
  departmentId: z.number().optional().nullable(),
});
type FormValues = z.infer<typeof schema>;

function formatGrievanceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

export function GrievanceTransferModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: AdminGrievanceRow | null;
  onSaved: () => void;
}>) {
  const [committees, setCommittees] = useState<GrievanceCommittee[]>([]);
  const [organizations, setOrganizations] = useState<
    Array<{ organizationId: number; orgCode?: string }>
  >([]);
  const [colleges, setColleges] = useState<
    Array<{ collegeId: number; collegeCode?: string }>
  >([]);
  const [departments, setDepartments] = useState<
    Array<{ departmentId: number; deptCode?: string }>
  >([]);
  const [hierarchyCats, setHierarchyCats] = useState<
    Array<{ generalDetailId?: number; generalDetailCode?: string }>
  >([]);
  const [hierarchyLevel, setHierarchyLevel] = useState(0);
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
      grvCommitteeId: 0,
      organizationId: 0,
      collegeId: null,
      departmentId: null,
    },
  });

  const organizationId = watch("organizationId");
  const collegeId = watch("collegeId");
  const grvCommitteeId = watch("grvCommitteeId");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      listAllGrievanceCommittees(),
      listActiveOrganizationsForGrievanceMasters(),
      listGrievanceHierarchyCats(),
    ])
      .then(([c, orgs, cats]) => {
        setCommittees(c);
        setOrganizations(orgs);
        setHierarchyCats(
          cats as Array<{
            generalDetailId?: number;
            generalDetailCode?: string;
          }>,
        );
      })
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open || !row) return;
    reset({
      grvCommitteeId: row.grvCommitteeId ?? 0,
      organizationId: 0,
      collegeId: null,
      departmentId: null,
    });
    setSubmitError(null);
  }, [open, row, reset]);

  // Resolve hierarchy when committee selected (Angular selectedCommittee)
  useEffect(() => {
    if (!grvCommitteeId) {
      setHierarchyLevel(0);
      return;
    }
    const match = committees.find((c) => c.grvCommitteeId === grvCommitteeId);
    setHierarchyLevel(Number(match?.hierarchyLevel ?? 0));
  }, [grvCommitteeId, committees]);

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

  const committeeOptions = useMemo(
    () =>
      committees.map((c) => ({
        value: String(c.grvCommitteeId),
        label: `${c.committeeName} (${c.committeeCode})`,
      })),
    [committees],
  );
  const organizationOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? String(o.organizationId),
      })),
    [organizations],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? String(c.collegeId),
      })),
    [colleges],
  );
  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.departmentId),
        label: d.deptCode ?? String(d.departmentId),
      })),
    [departments],
  );

  const showOrg =
    hierarchyLevel === 1 || hierarchyLevel === 2 || hierarchyLevel === 3;
  const showCollege = hierarchyLevel === 2 || hierarchyLevel === 3;
  const showDepartment = hierarchyLevel === 3;

  async function onSubmit(data: FormValues) {
    if (!row) return;
    setSubmitError(null);

    let grvOnCatdetId: number | undefined;
    if (hierarchyLevel === 1) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "UNVSR");
      grvOnCatdetId = cat?.generalDetailId;
    } else if (hierarchyLevel === 2) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "CLG");
      grvOnCatdetId = cat?.generalDetailId;
    } else if (hierarchyLevel === 3) {
      const cat = hierarchyCats.find((x) => x.generalDetailCode === "DEPT");
      grvOnCatdetId = cat?.generalDetailId;
    }

    // Angular computes grvOnResourse then forces it to null on the form Obj;
    // only grvCommitteeId + grvOnCatdetId are written onto the complaint row POST body.
    void data.organizationId;
    void data.collegeId;
    void data.departmentId;

    const payload: AdminGrievanceRow = {
      ...row,
      grvCommitteeId: data.grvCommitteeId,
      grvOnCatdetId: grvOnCatdetId ?? row.grvOnCatdetId ?? null,
    };

    try {
      await transferAdminGrievance(payload);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to transfer grievance",
      );
    }
  }

  if (!row) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            Grievance Transfer
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3 space-y-1.5 text-sm mb-2">
          <DetailRow label="Grievance No" value={String(row.complaintId)} />
          <DetailRow label="Grievance Type" value={row.complaintDesc ?? "—"} />
          <DetailRow label="Student" value={row.stdName ?? "—"} />
          <DetailRow label="Incident" value={row.incident ?? "—"} />
          <DetailRow label="Acknowledged By" value={row.ackEmpName ?? "--"} />
          <DetailRow
            label="Grievance Date"
            value={formatGrievanceDate(row.complainDate)}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="grvCommitteeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Committee"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => {
                  field.onChange(value ? Number(value) : undefined);
                  setValue("organizationId", 0);
                  setValue("collegeId", null);
                  setValue("departmentId", null);
                }}
                options={committeeOptions}
                placeholder="Select committee"
                searchable
                error={errors.grvCommitteeId?.message}
              />
            )}
          />
          {showOrg ? (
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => {
                    field.onChange(value ? Number(value) : 0);
                    setValue("collegeId", null);
                    setValue("departmentId", null);
                  }}
                  options={organizationOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
          ) : null}
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

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>
        :{" "}
        <span className="font-medium text-[hsl(var(--primary))]">{value}</span>
      </span>
    </div>
  );
}
