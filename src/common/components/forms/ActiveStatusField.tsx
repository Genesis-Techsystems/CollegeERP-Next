"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField } from "@/common/components/forms";

// ─── ActiveStatusField ────────────────────────────────────────────────────────
// Compound field for the isActive checkbox + conditional reason input.
// Eliminates the repeated isActive/reason JSX block found in every CRUD modal.
//
// Usage with react-hook-form:
//   <Controller name="isActive" control={control} render={({ field }) => (
//     <ActiveStatusField
//       isActive={field.value}
//       reason={watch('reason')}
//       onActiveChange={field.onChange}
//       onReasonChange={(v) => setValue('reason', v)}
//       reasonError={errors.reason?.message}
//     />
//   )} />

interface ActiveStatusFieldProps {
  isActive: boolean;
  reason: string;
  onActiveChange: (v: boolean | "indeterminate") => void;
  onReasonChange: (v: string) => void;
  reasonError?: string;
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
}

export function ActiveStatusField({
  isActive,
  reason,
  onActiveChange,
  onReasonChange,
  reasonError,
  reasonRequired,
  reasonPlaceholder = "Reason for deactivation",
}: ActiveStatusFieldProps) {
  return (
    <div
      className={
        isActive
          ? "flex items-center gap-2"
          : "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end"
      }
    >
      <div className="flex h-9 items-center gap-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={onActiveChange}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Is Active
        </Label>
      </div>
      {!isActive && (
        <FormField label="Reason" required={reasonRequired} error={reasonError}>
          <Input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={reasonPlaceholder}
          />
        </FormField>
      )}
    </div>
  );
}
