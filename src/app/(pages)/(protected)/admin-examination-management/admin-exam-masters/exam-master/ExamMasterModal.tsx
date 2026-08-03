"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Eye, Paperclip, X } from "lucide-react";
import type { ExamMaster } from "@/types/exam-master";
import {
  createExamMaster,
  updateExamMaster,
  uploadExamFiles,
} from "@/services/exam-master";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker, MonthYearPicker } from "@/common/components/date-picker";
import { ActiveStatusField } from "@/common/components/forms";
import { DEFAULT_ACTIVE_REASON } from "@/config/constants/defaults";
import { toastSuccess } from "@/lib/toast";

const schema = z.object({
  examName: z.string().min(1, "Exam name is required"),
  examShortName: z.string().min(1, "Exam short name is required"),
  examMonthYr: z.date().nullable(),
  fromDate: z.date().nullable(),
  toDate: z.date().nullable(),
  isRegularExam: z.boolean(),
  isSupplyExam: z.boolean(),
  isInternalExam: z.boolean(),
  isPublished: z.boolean(),
  isResultprocessStarted: z.boolean(),
  isActive: z.boolean(),
  reason: z.string(),
  notificationPublishedOn: z.date().nullable(),
  feeNotificationPublishedOn: z.date().nullable(),
});

type FormValues = z.infer<typeof schema>;

export type ExamMasterModalTitleContext = {
  universityCode?: string;
  collegeCode?: string;
  courseCode?: string;
  academicYear?: string;
};

interface ExamMasterModalProps {
  open: boolean;
  onClose: () => void;
  exam: ExamMaster | null;
  context: {
    universityId: number | null;
    collegeId: number | null;
    courseId: number | null;
    academicYearId: number | null;
  };
  titleContext?: ExamMasterModalTitleContext;
  onSaved: () => void;
}

/** Angular: path after `cms/` stored on form for update payload. */
function stripCmsPath(path?: string | null): string | null {
  if (path == null || path === "") return null;
  const parts = String(path).split("cms/");
  return parts.length > 1 ? parts[1] : String(path);
}

function FileInput({
  file,
  onChange,
  existingPath,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  existingPath?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayName = file
    ? file.name
    : existingPath
      ? (existingPath.split("cms/")[1] ?? existingPath).split("/").pop()
      : null;
  const viewUrl = localUrl ?? existingPath ?? null;

  return (
    <div className="mt-1">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,.doc"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
          {displayName ? "Replace" : "Choose file"}
        </Button>
        {displayName && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-slate-500 truncate max-w-[140px]">
              {displayName}
            </span>
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="View uploaded file"
                title="View file"
                className="inline-flex items-center justify-center h-5 w-5 shrink-0 rounded text-slate-400 hover:text-slate-600"
              >
                <Eye className="h-3.5 w-3.5" />
              </a>
            )}
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  onChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        {!displayName && (
          <span className="text-xs text-slate-400">No file chosen</span>
        )}
      </div>
    </div>
  );
}

function parseDate(val: string | Date | undefined | null): Date | null {
  if (val == null || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(val);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toYMDOrNull(val: Date | null): string | null {
  return val ? format(val, "yyyy-MM-dd") : null;
}

function buildDialogTitle(
  isEdit: boolean,
  titleContext?: ExamMasterModalTitleContext,
): string {
  const base = isEdit ? "Edit Exam" : "Add Exam";
  const uni = titleContext?.universityCode?.trim();
  const course = titleContext?.courseCode?.trim();
  const ay = titleContext?.academicYear?.trim();
  if (!uni && !course && !ay) return base;
  const college = titleContext?.collegeCode?.trim();
  const parts = [uni, college || null, course, ay].filter(Boolean);
  return `${base} ( ${parts.join(" / ")} )`;
}

export default function ExamMasterModal({
  open,
  onClose,
  exam,
  context,
  titleContext,
  onSaved,
}: ExamMasterModalProps) {
  const isEdit = exam !== null;

  const [notificationFile, setNotificationFile] = useState<File | null>(null);
  const [feeNotificationFile, setFeeNotificationFile] = useState<File | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(exam),
  });

  useEffect(() => {
    if (open) {
      reset(getDefaults(exam));
      setNotificationFile(null);
      setFeeNotificationFile(null);
      setToast(null);
    }
  }, [open, exam, reset]);

  const fromDate = watch("fromDate");
  const toDate = watch("toDate");
  const examMonthYr = watch("examMonthYr");
  const isRegularExam = watch("isRegularExam");
  const isSupplyExam = watch("isSupplyExam");
  const isInternalExam = watch("isInternalExam");

  // Angular checkboxValidation(): flag 0 = all, 1 = Regular/Supple, 2 = Internal
  const examTypeFlag = useMemo(() => {
    if (isRegularExam || isSupplyExam) return 1;
    if (isInternalExam) return 2;
    return 0;
  }, [isRegularExam, isSupplyExam, isInternalExam]);

  const showRegularSupple = examTypeFlag === 0 || examTypeFlag === 1;
  const showInternal = examTypeFlag === 0 || examTypeFlag === 2;

  const fromMinDate = useMemo(() => {
    if (!examMonthYr) return undefined;
    return new Date(examMonthYr.getFullYear(), examMonthYr.getMonth(), 1);
  }, [examMonthYr]);

  useEffect(() => {
    if (fromDate && toDate && toDate < fromDate) {
      setValue("toDate", fromDate);
      setToast({
        message: "From date should be less then To date.",
        type: "error",
      });
    }
  }, [fromDate, toDate, setValue]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setToast(null);
    try {
      const payload = buildPayload(values, exam, context);

      let savedExam: ExamMaster;
      if (isEdit) savedExam = await updateExamMaster(exam!.examId, payload);
      else savedExam = await createExamMaster(payload);

      await uploadExamFiles(
        savedExam.examId,
        notificationFile,
        feeNotificationFile,
      );

      toastSuccess(
        isEdit ? "Exam updated successfully." : "Exam created successfully.",
      );
      onSaved();
      onClose();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Something went wrong",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden"
        closeOnOutsideClick={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-6 py-4 pr-12">
          <DialogTitle className="text-[hsl(var(--primary))]">
            {buildDialogTitle(isEdit, titleContext)}
          </DialogTitle>
        </DialogHeader>

        {toast && (
          <div
            className={`mx-6 mt-3 rounded-md px-3 py-2 text-sm ${
              toast.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {toast.message}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 px-6 pb-6 pt-1"
        >
          <div className="space-y-1.5">
            <Label className="text-[12px] text-slate-700">
              Exam Name <span className="text-red-500">*</span>
            </Label>
            <input
              {...register("examName")}
              placeholder="Exam Name"
              aria-invalid={Boolean(errors.examName)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-2 text-[12px] shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.examName && (
              <p className="text-[11px] text-destructive">
                {errors.examName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">
                Exam Short Name <span className="text-red-500">*</span>
              </Label>
              <input
                {...register("examShortName")}
                placeholder="Exam Short Name"
                aria-invalid={Boolean(errors.examShortName)}
                className="flex h-7 w-full rounded-md border border-input bg-transparent px-3 py-2 text-[12px] shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {errors.examShortName && (
                <p className="text-[11px] text-destructive">
                  {errors.examShortName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">
                Exam Month and Year
              </Label>
              <Controller
                control={control}
                name="examMonthYr"
                render={({ field }) => (
                  <MonthYearPicker
                    value={field.value}
                    onChange={(d) => {
                      field.onChange(d);
                      if (d) {
                        const firstOfMonth = new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          1,
                        );
                        setValue("fromDate", firstOfMonth);
                        setValue("toDate", firstOfMonth);
                      }
                    }}
                    placeholder="Exam Month and Year"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">From Date</Label>
              <Controller
                control={control}
                name="fromDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={fromMinDate}
                    placeholder="From Date"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">To Date</Label>
              <Controller
                control={control}
                name="toDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={fromDate ?? undefined}
                    placeholder="To Date"
                  />
                )}
              />
            </div>
          </div>

          <div>
            <Label className="text-[12px] text-slate-700 mb-2 block">
              Exam Type
            </Label>
            <div className="flex flex-nowrap items-center gap-5 overflow-x-auto">
              {showRegularSupple && (
                <>
                  <Controller
                    control={control}
                    name="isRegularExam"
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            field.onChange(checked);
                            if (checked) setValue("isInternalExam", false);
                          }}
                        />
                        Regular Exam
                      </label>
                    )}
                  />
                  <Controller
                    control={control}
                    name="isSupplyExam"
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            field.onChange(checked);
                            if (checked) setValue("isInternalExam", false);
                          }}
                        />
                        Supple Exam
                      </label>
                    )}
                  />
                </>
              )}
              {showInternal && (
                <Controller
                  control={control}
                  name="isInternalExam"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => {
                          const checked = v === true;
                          field.onChange(checked);
                          if (checked) {
                            setValue("isRegularExam", false);
                            setValue("isSupplyExam", false);
                          }
                        }}
                      />
                      Internal Exam
                    </label>
                  )}
                />
              )}
            </div>
          </div>

          <div className="flex gap-6">
            <Controller
              control={control}
              name="isResultprocessStarted"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  Is Result Process Started
                </label>
              )}
            />
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-[12px]">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  Is Published
                </label>
              )}
            />
          </div>

          <div className="text-[12px] font-semibold text-slate-700 border-b border-border pb-1">
            Exam Notification
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">Date</Label>
              <Controller
                control={control}
                name="notificationPublishedOn"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Date"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">
                Notification File
              </Label>
              <FileInput
                file={notificationFile}
                onChange={setNotificationFile}
                existingPath={isEdit ? exam?.notificationFilePath : undefined}
              />
            </div>
          </div>

          <div className="text-[12px] font-semibold text-slate-700 border-b border-border pb-1">
            Exam Fee Notification
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">Date</Label>
              <Controller
                control={control}
                name="feeNotificationPublishedOn"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Date"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-700">
                Fee Notification File
              </Label>
              <FileInput
                file={feeNotificationFile}
                onChange={setFeeNotificationFile}
                existingPath={
                  isEdit ? exam?.feeNotificationFilePath : undefined
                }
              />
            </div>
          </div>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason")}
                onActiveChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  if (active) setValue("reason", DEFAULT_ACTIVE_REASON);
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(exam: ExamMaster | null): FormValues {
  if (exam) {
    return {
      examName: exam.examName ?? "",
      examShortName: exam.examShortName ?? "",
      examMonthYr: parseDate(exam.examMonthYr),
      fromDate: parseDate(exam.fromDate),
      toDate: parseDate(exam.toDate),
      isRegularExam: exam.isRegularExam ?? false,
      isSupplyExam: exam.isSupplyExam ?? false,
      isInternalExam: exam.isInternalExam ?? false,
      isPublished: exam.isPublished ?? false,
      isResultprocessStarted: exam.isResultprocessStarted ?? false,
      isActive: exam.isActive ?? false,
      reason: exam.reason ?? "",
      notificationPublishedOn: parseDate(exam.notificationPublishedOn),
      feeNotificationPublishedOn: parseDate(exam.feeNotificationPublishedOn),
    };
  }
  return {
    examName: "",
    examShortName: "",
    examMonthYr: null,
    fromDate: new Date(),
    toDate: new Date(),
    isRegularExam: false,
    isSupplyExam: false,
    isInternalExam: false,
    isPublished: false,
    isResultprocessStarted: false,
    isActive: true,
    reason: DEFAULT_ACTIVE_REASON,
    notificationPublishedOn: new Date(),
    feeNotificationPublishedOn: new Date(),
  };
}

function buildPayload(
  values: FormValues,
  exam: ExamMaster | null,
  ctx: ExamMasterModalProps["context"],
) {
  const base = {
    examName: values.examName,
    examShortName: values.examShortName,
    examMonthYr: toYMDOrNull(values.examMonthYr),
    fromDate: toYMDOrNull(values.fromDate),
    toDate: toYMDOrNull(values.toDate),
    isRegularExam: values.isRegularExam,
    isSupplyExam: values.isSupplyExam,
    isInternalExam: values.isInternalExam,
    isPublished: values.isPublished,
    isResultprocessStarted: values.isResultprocessStarted,
    isActive: values.isActive,
    reason: values.reason,
    notificationPublishedOn: toYMDOrNull(values.notificationPublishedOn),
    feeNotificationPublishedOn: toYMDOrNull(values.feeNotificationPublishedOn),
    // Angular form always carries stripped paths on edit
    notificationFilePath: stripCmsPath(exam?.notificationFilePath),
    feeNotificationFilePath: stripCmsPath(exam?.feeNotificationFilePath),
  };

  if (exam) {
    return {
      examId: exam.examId,
      ...base,
    };
  }

  // Angular create: inject filter IDs after dialog close
  return {
    ...base,
    universityId: ctx.universityId ?? undefined,
    collegeId: ctx.collegeId ?? undefined,
    courseId: ctx.courseId ?? undefined,
    academicYearId: ctx.academicYearId ?? undefined,
  };
}
