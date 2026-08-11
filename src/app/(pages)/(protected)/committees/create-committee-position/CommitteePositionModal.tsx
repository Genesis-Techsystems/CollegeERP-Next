"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusField } from "@/common/components/forms";
import { createCommitteePosition, updateCommitteePosition } from "@/services";
import type { UnivCommitteePosition } from "@/types/committees";

const schema = z.object({
  committeePossitoinName: z.string().min(1, "Committee position is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: UnivCommitteePosition | null): FormValues {
  return {
    committeePossitoinName: edit?.committeePossitoinName ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

function readOrgCode(): string {
  if (typeof globalThis === "undefined") return "";
  return String(globalThis.localStorage?.getItem("orgCode") ?? "").trim();
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: UnivCommitteePosition | null;
  organizationId: number;
  onSaved: () => void;
}

export default function CommitteePositionModal({
  open,
  onClose,
  editData,
  organizationId,
  onSaved,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(editData);
  const orgCode = readOrgCode();

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

  useEffect(() => {
    reset(getDefaults(editData));
    setSubmitError(null);
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const payload: Partial<UnivCommitteePosition> = {
        committeePossitoinName: values.committeePossitoinName.trim(),
        organizationId,
        isActive: values.isActive,
        reason: values.isActive
          ? "active"
          : values.reason?.trim() || "inactive",
      };
      if (editData) {
        await updateCommitteePosition(
          editData.univCommitteePositionId,
          payload,
        );
      } else {
        await createCommitteePosition(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save committee position.",
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {isEdit ? "Edit Committee Position" : "Add Committee Position"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Angular: read-only Organisation : {orgCode} chip */}
          <div className="inline-flex max-w-full rounded-md border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.04)] px-3 py-2 text-sm font-medium text-[hsl(var(--primary))]">
            Organisation : {orgCode || "—"}
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">
              Committee Position
            </Label>
            <Input
              className="h-9 rounded-none border-0 border-b border-input bg-transparent px-0 text-sm shadow-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0"
              placeholder="Committee Position"
              {...register("committeePossitoinName")}
            />
            {errors.committeePossitoinName && (
              <p className="text-xs text-red-500">
                {errors.committeePossitoinName.message}
              </p>
            )}
          </div>

          {isEdit ? (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch("reason") ?? ""}
                  onActiveChange={field.onChange}
                  onReasonChange={(v) => setValue("reason", v)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          ) : null}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
