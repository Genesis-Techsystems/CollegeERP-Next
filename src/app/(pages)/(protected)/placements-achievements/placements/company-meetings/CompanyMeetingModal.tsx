"use client";

/**
 * Angular parity: company-meetings-modal
 * Cascades: College → active Companies → active Contacts; Incharge via employeesearch
 * Meeting types: GeneralDetail where GeneralMaster.generalMasterCode==PSTTYPE & isActive
 * Dates: YYYY-MM-DD; times: Angular convert_to_24h → H:M:00
 * Update body includes companyMeetingId + createdDt (parent adds these)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createCompanyMeeting,
  listActiveCollegesForGeneralSettings,
  listActiveCompaniesForMeetings,
  listActiveCompanyContactsForMeetings,
  listGeneralDetailsByCode,
  searchEmployeesForCompanyMeeting,
  updateCompanyMeeting,
} from "@/services";
import type {
  Company,
  CompanyContact,
  CompanyMeeting,
} from "@/types/placements";

type AnyRow = Record<string, unknown>;

const schema = z
  .object({
    collegeId: z.string().min(1, "College is required"),
    companyId: z.string().min(1, "Company is required"),
    companyContactId: z.string().optional(),
    poEmpId: z.string().optional(),
    meetingTypeCatdetId: z.string().optional(),
    meetingTitle: z.string().min(1, "Meeting title is required"),
    meetingDescription: z.string().optional(),
    meetingOutput: z.string().optional(),
    attendeesNames: z.string().optional(),
    meetingOn: z.date().nullable().optional(),
    meetingFromTime: z.string().optional(),
    meetingToTime: z.string().optional(),
    followupMeetingOn: z.date().nullable().optional(),
    followupPoints: z.string().optional(),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !String(values.reason ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when inactive",
        path: ["reason"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Angular `momentFormatYMD1` → YYYY-MM-DD at local midnight. */
function toYmd(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
}

/** Normalize API time (`9:0:00` / `09:00:00` / `09:00`) → HTML `HH:mm`. */
function toHtmlTime(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  const matched = String(value).match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!matched) return fallback;
  const h = String(Number(matched[1])).padStart(2, "0");
  const m = String(Number(matched[2])).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Angular `convert_to_24h` output shape: `H:M:00` (no zero-padding).
 * Input from HTML time is `HH:mm`.
 */
function toAngularTime(hhmm: string | null | undefined): string | null {
  const raw = String(hhmm ?? "").trim();
  if (!raw) return null;
  const matched = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!matched) return null;
  return `${Number(matched[1])}:${Number(matched[2])}:00`;
}

function emptyToNull(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function employeeLabel(row: AnyRow): string {
  const name = String(row.firstName ?? row.employeeName ?? row.empName ?? "");
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : "";
  return `${name}${num}`.trim() || String(row.employeeId ?? "");
}

function getDefaults(edit?: CompanyMeeting | null): FormValues {
  return {
    collegeId: edit?.collegeId != null ? String(edit.collegeId) : "",
    companyId: edit?.companyId != null ? String(edit.companyId) : "",
    companyContactId:
      edit?.companyContactId != null ? String(edit.companyContactId) : "",
    poEmpId: edit?.poEmpId != null ? String(edit.poEmpId) : "",
    meetingTypeCatdetId:
      edit?.meetingTypeCatdetId != null ? String(edit.meetingTypeCatdetId) : "",
    meetingTitle: edit?.meetingTitle ?? "",
    meetingDescription: edit?.meetingDescription ?? "",
    meetingOutput: edit?.meetingOutput ?? "",
    attendeesNames: edit?.attendeesNames ?? "",
    meetingOn: edit ? parseDate(edit.meetingOn) : new Date(),
    meetingFromTime: toHtmlTime(edit?.meetingFromTime, "09:00"),
    meetingToTime: toHtmlTime(edit?.meetingToTime, "10:00"),
    followupMeetingOn: edit ? parseDate(edit.followupMeetingOn) : new Date(),
    followupPoints: edit?.followupPoints ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface CompanyMeetingModalProps {
  open: boolean;
  onClose: () => void;
  editData: CompanyMeeting | null;
  onSaved: () => void;
}

export function CompanyMeetingModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<CompanyMeetingModalProps>) {
  const isEditing = editData != null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<
    { collegeId: number; collegeCode: string }[]
  >([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<AnyRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const collegeId = watch("collegeId");
  const companyId = watch("companyId");
  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubmitError(null);

    void listActiveCollegesForGeneralSettings()
      .then((rows) =>
        setColleges(
          rows.map((c) => ({
            collegeId: c.collegeId,
            collegeCode: c.collegeCode ?? String(c.collegeId),
          })),
        ),
      )
      .catch(console.error);

    void listActiveCompaniesForMeetings()
      .then(setCompanies)
      .catch(console.error);

    void listGeneralDetailsByCode(GM_CODES.PLACEMENT_TYPE)
      .then(setMeetingTypes)
      .catch(console.error);

    // Preload incharge option on edit (Angular selectedEmployee with poEmpNumber)
    if (editData?.poEmpId) {
      const label = editData.poEmpName
        ? `${editData.poEmpName}${editData.poEmpNumber ? ` (${editData.poEmpNumber})` : ""}`
        : String(editData.poEmpId);
      setEmployeeOptions([{ value: String(editData.poEmpId), label }]);
      if (editData.collegeId && editData.poEmpNumber) {
        void searchEmployeesForCompanyMeeting(
          editData.collegeId,
          String(editData.poEmpNumber),
        )
          .then((rows) => {
            if (!rows.length) return;
            setEmployeeOptions(
              rows.map((r) => ({
                value: String(r.employeeId ?? ""),
                label: employeeLabel(r),
              })),
            );
          })
          .catch(console.error);
      }
    } else {
      setEmployeeOptions([]);
    }
  }, [open, editData, reset]);

  // Angular selectedCompany: load active contacts when company changes
  useEffect(() => {
    if (!open) return;
    const id = Number(companyId);
    if (!id) {
      setContacts([]);
      return;
    }
    void listActiveCompanyContactsForMeetings(id)
      .then(setContacts)
      .catch(console.error);
  }, [open, companyId]);

  // On edit: Angular finds companyId from companyContactDTOs when college loads
  useEffect(() => {
    if (!open || !editData?.companyContactId || !companies.length) return;
    if (editData.companyId) return;
    for (const company of companies) {
      const match = company.companyContactDTOs?.find(
        (c) => c.companyContactId === editData.companyContactId,
      );
      if (match?.companyId) {
        setValue("companyId", String(match.companyId));
        break;
      }
    }
  }, [open, editData, companies, setValue]);

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode,
      })),
    [colleges],
  );

  const companyOptions = useMemo<SelectOption[]>(
    () =>
      companies.map((c) => ({
        value: String(c.companyId),
        label: c.companyname,
      })),
    [companies],
  );

  const contactOptions = useMemo<SelectOption[]>(
    () =>
      contacts.map((c) => ({
        value: String(c.companyContactId),
        label: c.mobile ? `${c.personName} (${c.mobile})` : c.personName,
      })),
    [contacts],
  );

  const meetingTypeOptions = useMemo<SelectOption[]>(
    () =>
      meetingTypes.map((t) => ({
        value: String(t.generalDetailId ?? t.gd_id ?? ""),
        label: String(t.generalDetailDisplayName ?? t.gd_name ?? "Type"),
      })),
    [meetingTypes],
  );

  const onEmployeeSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      const cid = Number(collegeId);
      if (q.length < 4 || !cid) {
        if (q.length === 0 && editData?.poEmpId) {
          const label = editData.poEmpName
            ? `${editData.poEmpName}${editData.poEmpNumber ? ` (${editData.poEmpNumber})` : ""}`
            : String(editData.poEmpId);
          setEmployeeOptions([{ value: String(editData.poEmpId), label }]);
        }
        return;
      }
      setEmployeeSearchLoading(true);
      // Angular: employeesearch?collegeId=&q=&empStatus=ACTV only
      void searchEmployeesForCompanyMeeting(cid, q)
        .then((rows) => {
          setEmployeeOptions(
            rows.map((r) => ({
              value: String(r.employeeId ?? ""),
              label: employeeLabel(r),
            })),
          );
        })
        .catch(console.error)
        .finally(() => setEmployeeSearchLoading(false));
    },
    [collegeId, editData],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    // Angular submit: form value + formatted dates/times
    const payload: Record<string, unknown> = {
      collegeId: Number(values.collegeId),
      companyId: Number(values.companyId),
      companyContactId: values.companyContactId
        ? Number(values.companyContactId)
        : null,
      poEmpId: values.poEmpId ? Number(values.poEmpId) : null,
      meetingTypeCatdetId: values.meetingTypeCatdetId
        ? Number(values.meetingTypeCatdetId)
        : null,
      meetingTitle: values.meetingTitle.trim(),
      meetingDescription: emptyToNull(values.meetingDescription),
      meetingOutput: emptyToNull(values.meetingOutput),
      attendeesNames: emptyToNull(values.attendeesNames),
      meetingOn: toYmd(values.meetingOn ?? null),
      meetingFromTime: toAngularTime(values.meetingFromTime),
      meetingToTime: toAngularTime(values.meetingToTime),
      followupMeetingOn: toYmd(values.followupMeetingOn ?? null),
      followupPoints: emptyToNull(values.followupPoints),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : (emptyToNull(values.reason) ?? "inactive"),
    };

    try {
      if (isEditing && editData?.companyMeetingId) {
        // Angular parent: details.companyMeetingId + details.createdDt
        payload.companyMeetingId = Number(editData.companyMeetingId);
        payload.createdDt = editData.createdDt ?? null;
        await updateCompanyMeeting(
          editData.companyMeetingId,
          payload as Partial<CompanyMeeting>,
        );
        toastSuccess("Company meeting updated successfully");
      } else {
        await createCompanyMeeting(payload as Partial<CompanyMeeting>);
        toastSuccess("Company meeting created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save company meeting");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Company Meeting" : "Add Company Meeting"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="xl"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College"
              required
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? "");
                setValue("poEmpId", "");
                setEmployeeOptions([]);
              }}
              options={collegeOptions}
              placeholder="College"
              error={errors.collegeId?.message}
            />
          )}
        />

        <Controller
          name="companyId"
          control={control}
          render={({ field }) => (
            <Select
              label="Company"
              required
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? "");
                setValue("companyContactId", "");
              }}
              options={companyOptions}
              placeholder="Company"
              error={errors.companyId?.message}
            />
          )}
        />

        <Controller
          name="companyContactId"
          control={control}
          render={({ field }) => (
            <Select
              label="Company Contact"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={contactOptions}
              placeholder="Company Contact"
              disabled={!companyId}
              clearable
            />
          )}
        />

        <div className="sm:col-span-2">
          <Controller
            name="poEmpId"
            control={control}
            render={({ field }) => (
              <Select
                label="Incharge"
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? "")}
                options={employeeOptions}
                placeholder="Search by Employee name or Id."
                searchable
                onSearch={onEmployeeSearch}
                isLoading={employeeSearchLoading}
                disabled={!collegeId}
                clearable
              />
            )}
          />
        </div>

        <Controller
          name="meetingTypeCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              label="Meeting Type"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={meetingTypeOptions}
              placeholder="Meeting Type"
              clearable
            />
          )}
        />

        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="meetingTitle">Meeting Title *</Label>
          <Input id="meetingTitle" {...register("meetingTitle")} />
          {errors.meetingTitle ? (
            <p className="text-xs text-destructive">
              {errors.meetingTitle.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="meetingDescription">Meeting Description</Label>
          <Textarea
            id="meetingDescription"
            rows={2}
            {...register("meetingDescription")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="meetingOutput">Meeting Output</Label>
          <Textarea
            id="meetingOutput"
            rows={2}
            {...register("meetingOutput")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="attendeesNames">Attendees Names</Label>
          <Input id="attendeesNames" {...register("attendeesNames")} />
        </div>

        <Controller
          name="meetingOn"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Meeting Date"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d)}
              displayFormat="dd/MM/yyyy"
            />
          )}
        />

        <div className="space-y-1.5">
          <Label htmlFor="meetingFromTime">From Time</Label>
          <Input
            id="meetingFromTime"
            type="time"
            {...register("meetingFromTime")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="meetingToTime">To Time</Label>
          <Input
            id="meetingToTime"
            type="time"
            {...register("meetingToTime")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="followupPoints">Followup Points</Label>
          <Textarea
            id="followupPoints"
            rows={2}
            {...register("followupPoints")}
          />
        </div>

        <Controller
          name="followupMeetingOn"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Followup Meeting Date"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d)}
              displayFormat="dd/MM/yyyy"
            />
          )}
        />

        <div className="sm:col-span-2">
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
                reasonRequired={!isActive}
              />
            )}
          />
        </div>
      </div>

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
