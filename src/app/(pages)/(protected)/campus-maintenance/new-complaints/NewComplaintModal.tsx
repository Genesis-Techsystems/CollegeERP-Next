"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CampusIssue } from "@/types/campus-maintenance";
import type { College } from "@/types/college";
import type { Department } from "@/types/department";
import type { Room } from "@/types/room";
import type { GeneralMasterDetail } from "@/types/general-master";
import { GM_CODES } from "@/config/constants/ui";
import { listColleges } from "@/services/admin/college";
import { listDepartmentsByCollege } from "@/services/admin/department";
import { listRooms } from "@/services/admin/room";
import { listGeneralDetailsByCode } from "@/services";
import {
  createCampusIssue,
  updateCampusIssue,
  uploadIssueImages,
} from "@/services/campus-maintenance";

const schema = z.object({
  issueLogDate: z.string().min(1, "Date is required"),
  collegeId: z.string().min(1, "College is required"),
  departmentId: z.string().optional(),
  issueInroomId: z.string().optional(),
  serviceCatId: z.string().optional(),
  issueTitle: z.string().min(1, "Title is required"),
  issueDescription: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function toDateInput(value?: string | null) {
  if (!value) return getToday();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

/** Angular `{{ issueLogDate | date:'MMM d, y' }}` — same as table column */
function formatComplaintDate(value?: string | null): string {
  if (!value) return "";
  const raw = String(value);
  const d = parseISO(raw.includes("T") ? raw : `${raw.slice(0, 10)}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(raw);
    return isValid(fallback) ? format(fallback, "MMM d, y") : raw.slice(0, 10);
  }
  return format(d, "MMM d, y");
}

function getDefaults(collegeId = ""): FormValues {
  return {
    issueLogDate: getToday(),
    collegeId,
    departmentId: "",
    issueInroomId: "",
    serviceCatId: "",
    issueTitle: "",
    issueDescription: "",
    location: "",
    isActive: true,
    reason: "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: CampusIssue | null;
  viewMode: boolean;
  raisedEmpId: number;
  /** Session college — Angular dataSecurityLevelPrincipal auto-select */
  sessionCollegeId?: number;
  /** Employee dept — Angular dataSecurityLevel auto-select */
  sessionDeptId?: number;
  /** Angular dataSecurityLevelPrincipal() — college locked when true */
  lockCollege?: boolean;
  /** Angular dataSecurityLevel() — department locked when true */
  lockDepartment?: boolean;
  onSaved: () => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="col-span-2 text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default function NewComplaintModal({
  open,
  onClose,
  editData,
  viewMode,
  raisedEmpId,
  sessionCollegeId = 0,
  sessionDeptId = 0,
  lockCollege = false,
  lockDepartment = false,
  onSaved,
}: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [serviceTypes, setServiceTypes] = useState<GeneralMasterDetail[]>([]);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEditing = Boolean(editData) && !viewMode;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  });

  const collegeId = watch("collegeId");

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName,
      })),
    [colleges],
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.departmentId),
        label: d.deptCode || d.deptName,
      })),
    [departments],
  );

  const roomOptions = useMemo(
    () =>
      rooms.map((r) => ({
        value: String(r.roomId),
        label: r.roomCode || r.roomName,
      })),
    [rooms],
  );

  const serviceTypeOptions = useMemo(
    () =>
      serviceTypes.map((s) => ({
        value: String(s.generalDetailId),
        label: s.generalDetailDisplayName,
      })),
    [serviceTypes],
  );

  useEffect(() => {
    if (!open) return;
    listColleges().then(setColleges).catch(console.error);
    listRooms().then(setRooms).catch(console.error);
    // Angular: generalDetailsByCode(SERVICECATEGORY, isActive)
    listGeneralDetailsByCode(GM_CODES.SERVICE_CATEGORY)
      .then((rows) => {
        setServiceTypes(
          rows.map((r) => ({
            generalDetailId: Number(r.generalDetailId),
            generalDetailDisplayName: String(
              r.generalDetailDisplayName ?? r.generalDetailCode ?? "",
            ),
            generalDetailCode: String(r.generalDetailCode ?? ""),
            isActive: r.isActive !== false,
          })),
        );
      })
      .catch(console.error);
  }, [open]);

  // Angular: after colleges load, non-admin → set collegeId from localStorage
  useEffect(() => {
    if (!open || isEditing || editData) return;
    if (lockCollege && sessionCollegeId > 0 && colleges.length > 0) {
      setValue("collegeId", String(sessionCollegeId));
    }
  }, [
    open,
    isEditing,
    editData,
    lockCollege,
    sessionCollegeId,
    colleges,
    setValue,
  ]);

  useEffect(() => {
    if (!collegeId) {
      setDepartments([]);
      return;
    }
    listDepartmentsByCollege(Number(collegeId))
      .then((deps) => {
        setDepartments(deps);
        // Angular dataSecStaff: auto-select empDeptId after departments load
        if (!isEditing && !editData && lockDepartment && sessionDeptId > 0) {
          const match = deps.find((d) => d.departmentId === sessionDeptId);
          if (match) setValue("departmentId", String(sessionDeptId));
        }
      })
      .catch(console.error);
  }, [collegeId, isEditing, editData, lockDepartment, sessionDeptId, setValue]);

  useEffect(() => {
    if (!open) return;
    setBeforeFile(null);
    setAfterFile(null);
    setSubmitError(null);

    if (editData && !viewMode) {
      reset({
        issueLogDate: toDateInput(editData.issueLogDate),
        collegeId: editData.collegeId ? String(editData.collegeId) : "",
        departmentId: editData.departmentId
          ? String(editData.departmentId)
          : "",
        issueInroomId: editData.issueInroomId
          ? String(editData.issueInroomId)
          : "",
        serviceCatId: editData.issueCategoryCatId
          ? String(editData.issueCategoryCatId)
          : "",
        issueTitle: editData.issueTitle ?? "",
        issueDescription: editData.issueDescription ?? "",
        location: editData.location ?? "",
        isActive: editData.isActive ?? true,
        reason:
          editData.reason ?? (editData.isActive === false ? "" : "active"),
      });
      return;
    }

    if (!editData) {
      const lockedCollege =
        lockCollege && sessionCollegeId > 0 ? String(sessionCollegeId) : "";
      const lockedDept =
        lockDepartment && sessionDeptId > 0 ? String(sessionDeptId) : "";
      reset({
        ...getDefaults(lockedCollege),
        departmentId: lockedDept,
      });
    }
  }, [
    open,
    editData,
    viewMode,
    lockCollege,
    lockDepartment,
    sessionCollegeId,
    sessionDeptId,
    reset,
  ]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const issueCategoryCatId = values.serviceCatId
        ? Number(values.serviceCatId)
        : undefined;

      if (isEditing && editData) {
        // Angular editDialog → updateComplaint body = form value
        // + managementIssueId + expectedResolvedOn (no invented workflow fields)
        const updated = await updateCampusIssue(editData.managementIssueId, {
          managementIssueId: editData.managementIssueId,
          collegeId: editData.collegeId,
          departmentId: editData.departmentId ?? undefined,
          issueInroomId: editData.issueInroomId ?? undefined,
          issueCategoryCatId: editData.issueCategoryCatId ?? undefined,
          issueTitle: editData.issueTitle,
          issueDescription: editData.issueDescription ?? "",
          location: editData.location ?? "",
          raisedEmpId: editData.raisedEmpId || raisedEmpId,
          workflowStageId: editData.workflowStageId ?? undefined,
          issueLogDate: editData.issueLogDate,
          expectedResolvedOn: editData.expectedResolvedOn,
          issuepriorityCatId: editData.issuepriorityCatId ?? undefined,
          isMgmtApprovalReq: editData.isMgmtApprovalReq ?? false,
          isClosed: editData.isClosed ?? false,
          isActive: values.isActive,
          reason: values.isActive
            ? values.reason || "active"
            : values.reason?.trim() || "inactive",
        });
        if ((beforeFile || afterFile) && updated.managementIssueId) {
          await uploadIssueImages(
            updated.managementIssueId,
            beforeFile,
            afterFile,
          );
        }
      } else {
        // Angular create defaults from NewComplaintModal ngOnInit
        const issue = await createCampusIssue({
          issueLogDate: values.issueLogDate,
          collegeId: Number(values.collegeId),
          departmentId: values.departmentId
            ? Number(values.departmentId)
            : undefined,
          issueInroomId: values.issueInroomId
            ? Number(values.issueInroomId)
            : undefined,
          issueCategoryCatId,
          issueTitle: values.issueTitle,
          issueDescription: values.issueDescription ?? "",
          location: values.location ?? "",
          raisedEmpId,
          aprvrejstatusCatCode: "INPROGRESS",
          isActive: values.isActive,
          isMgmtApprovalReq: false,
          isClosed: false,
          reason: values.isActive ? "active" : values.reason || "inactive",
          statusComments: "",
        });
        if ((beforeFile || afterFile) && issue.managementIssueId) {
          await uploadIssueImages(
            issue.managementIssueId,
            beforeFile,
            afterFile,
          );
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to submit complaint",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {isEditing || viewMode ? "Complaint Details" : "New Complaint"}
          </DialogTitle>
        </DialogHeader>

        {viewMode && editData ? (
          <>
            <div className="space-y-2.5 py-2">
              <Row
                label="Complaint From"
                value={
                  [
                    editData.collegeCode,
                    editData.deptCode,
                    editData.issueInroomCode,
                  ]
                    .filter(Boolean)
                    .join(" / ") || editData.collegeName
                }
              />
              <Row
                label="Complaint LogDate"
                value={formatComplaintDate(editData.issueLogDate)}
              />
              <Row label="Issue Title" value={editData.issueTitle} />
              {editData.issueCategoryDisplayName && (
                <Row
                  label="Service Type"
                  value={editData.issueCategoryDisplayName}
                />
              )}
              <Row label="Description" value={editData.issueDescription} />
              {editData.wfStatusComments && (
                <Row
                  label="Work Flow Status Comments"
                  value={editData.wfStatusComments}
                />
              )}
              {editData.closedEmpName && (
                <Row label="Closed By" value={editData.closedEmpName} />
              )}
              {editData.closingComments && (
                <Row
                  label="Closing Comments"
                  value={editData.closingComments}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : isEditing && editData ? (
          /* Angular editOption: read-only details + Active checkbox + pictures */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Row
                  label="Complaint From"
                  value={
                    [
                      editData.collegeCode,
                      editData.deptCode,
                      editData.issueInroomCode,
                    ]
                      .filter(Boolean)
                      .join(" / ") || editData.collegeName
                  }
                />
                <Row label="Issue Title" value={editData.issueTitle} />
                <Row
                  label="Service Type"
                  value={editData.issueCategoryDisplayName || ""}
                />
                <Row
                  label="Description"
                  value={editData.issueDescription || ""}
                />
                <Row
                  label="Work Flow Status Comments"
                  value={editData.wfStatusComments || ""}
                />
              </div>
              <div className="space-y-2.5">
                <Row
                  label="Complaint LogDate"
                  value={formatComplaintDate(editData.issueLogDate)}
                />
                {editData.isClosed && editData.closedEmpName && (
                  <Row
                    label="Issue Closed Employee"
                    value={editData.closedEmpName}
                  />
                )}
                {editData.isClosed && editData.closingComments && (
                  <Row
                    label="Issue Close Comment"
                    value={editData.closingComments}
                  />
                )}
              </div>
            </div>

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch("reason") ?? ""}
                  onActiveChange={(v) => field.onChange(v === true)}
                  onReasonChange={(v) => setValue("reason", v)}
                  reasonError={errors.reason?.message}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Before Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                {editData.beforeComplaintPicture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editData.beforeComplaintPicture}
                    alt="Before"
                    className="mt-1 max-h-32 w-full object-contain rounded border"
                  />
                )}
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">After Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                {editData.afterComplaintPicture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editData.afterComplaintPicture}
                    alt="After"
                    className="mt-1 max-h-32 w-full object-contain rounded border"
                  />
                )}
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
                {submitError}
              </p>
            )}

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Complaint Date *</Label>
                <Input type="date" {...register("issueLogDate")} />
                {errors.issueLogDate && (
                  <p className="text-xs text-red-500">
                    {errors.issueLogDate.message}
                  </p>
                )}
              </div>
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="[&>label]:text-xs"
                    label="College"
                    required
                    value={field.value || null}
                    onChange={(v) => {
                      field.onChange(v ?? "");
                      setValue("departmentId", "");
                    }}
                    options={collegeOptions}
                    placeholder="Select college"
                    searchable
                    clearable={!lockCollege}
                    disabled={lockCollege}
                    error={errors.collegeId?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="[&>label]:text-xs"
                    label="Department"
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={departmentOptions}
                    placeholder="Select dept"
                    searchable
                    clearable={!lockDepartment}
                    disabled={
                      !collegeId ||
                      departmentOptions.length === 0 ||
                      lockDepartment
                    }
                  />
                )}
              />
              <Controller
                name="issueInroomId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="[&>label]:text-xs"
                    label="Room"
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={roomOptions}
                    placeholder="Select room"
                    searchable
                    clearable
                  />
                )}
              />
              <Controller
                name="serviceCatId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="[&>label]:text-xs"
                    label="Service Type"
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={serviceTypeOptions}
                    placeholder="Select type"
                    searchable
                    clearable
                  />
                )}
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Issue Title *</Label>
              <Input
                {...register("issueTitle")}
                placeholder="Brief title of the issue"
              />
              {errors.issueTitle && (
                <p className="text-xs text-red-500">
                  {errors.issueTitle.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Description of the Problem</Label>
              <Textarea
                {...register("issueDescription")}
                placeholder="Description of the Problem"
                rows={6}
                className="min-h-[140px] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="space-y-0.5">
                <Label className="text-xs">Location</Label>
                <Input
                  {...register("location")}
                  placeholder="Exact location of the issue"
                />
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <ActiveStatusField
                    isActive={field.value}
                    reason={watch("reason") ?? ""}
                    onActiveChange={(v) => field.onChange(v === true)}
                    onReasonChange={(v) => setValue("reason", v)}
                    reasonError={errors.reason?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Before Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">After Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
                {submitError}
              </p>
            )}

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit Complaint"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
