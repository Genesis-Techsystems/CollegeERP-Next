"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { getFeeStudentData, saveFeeStudentWiseDiscount } from "@/services";
import type {
  FeeStudentData,
  FeeStudentParticularRow,
  FeeStudentWiseDiscountPayload,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";

const schema = z.object({
  feeCategoryId: z.coerce.number().min(1, "Fee category is required"),
  feeParticularsId: z.coerce.number().optional(),
  value: z.coerce.number().min(0.01, "Discount must be greater than 0"),
  authComments: z.string().min(1, "Reason is required"),
});

type FormValues = z.infer<typeof schema>;

interface AddConcessionModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentFeeSearchRow;
  feeRow: StudentFeeStructureRow;
  onSaved: () => void;
}

function uniqueCategories(
  particulars: FeeStudentParticularRow[],
): FeeStudentParticularRow[] {
  const seen = new Set<number>();
  const out: FeeStudentParticularRow[] = [];
  for (const p of particulars) {
    const id = Number(p.feeCategoryId ?? 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

export function AddConcessionModal({
  open,
  onClose,
  student,
  feeRow,
  onSaved,
}: Readonly<AddConcessionModalProps>) {
  const { user } = useSession();
  const [feeData, setFeeData] = useState<FeeStudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [balanceAmt, setBalanceAmt] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      feeCategoryId: undefined,
      feeParticularsId: undefined,
      value: 0,
      authComments: "",
    },
  });

  const categoryId = watch("feeCategoryId");
  const particulars = useMemo(
    () =>
      Array.isArray(feeData?.feeStudentDataParticulars)
        ? feeData!.feeStudentDataParticulars!
        : [],
    [feeData],
  );
  const categories = useMemo(
    () => uniqueCategories(particulars),
    [particulars],
  );
  const particularOptions = useMemo(
    () =>
      particulars
        .filter((p) => Number(p.feeCategoryId) === Number(categoryId))
        .map((p) => ({
          value: String(p.feeParticularsId ?? ""),
          label: p.particularsName ?? String(p.feeParticularsId ?? ""),
        }))
        .filter((o) => o.value),
    [particulars, categoryId],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      feeCategoryId: undefined,
      feeParticularsId: undefined,
      value: 0,
      authComments: "",
    });
    setBalanceAmt(0);
    setFeeData(null);

    const collegeId = Number(student.collegeId ?? 0);
    const academicYearId = Number(feeRow.academicYearId ?? 0);
    const studentId = Number(student.studentId ?? 0);
    const feeStructureId = Number(feeRow.feeStructureId ?? 0);
    if (!collegeId || !academicYearId || !studentId || !feeStructureId) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getFeeStudentData({
          collegeId,
          academicYearId,
          studentId,
          feeStructureId,
        });
        if (!cancelled) setFeeData(data);
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load fee structure data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, student, feeRow, reset]);

  function onCategoryChange(value: string | null) {
    const id = value ? Number(value) : 0;
    setValue("feeCategoryId", id as FormValues["feeCategoryId"]);
    setValue("feeParticularsId", undefined as unknown as number);
    const match = particulars.filter((p) => Number(p.feeCategoryId) === id);
    setBalanceAmt(Number(match[0]?.balanceAmount ?? 0));
  }

  async function onSubmit(data: FormValues) {
    if (data.value > balanceAmt && balanceAmt > 0) {
      toast.error("Discount amount is greater than balance amount.");
      setValue("value", 0);
      return;
    }
    const employeeId = Number(user?.employeeId ?? 0);
    const payload: FeeStudentWiseDiscountPayload = {
      feeCategoryId: data.feeCategoryId,
      feeParticularsId: data.feeParticularsId || undefined,
      value: data.value,
      isActive: true,
      authComments: data.authComments.trim(),
      requestedEmployeeId: employeeId,
      authorizedEmployeeId: employeeId,
      collegeId: Number(student.collegeId ?? 0),
      studentId: Number(student.studentId ?? 0),
      feeStructureId: Number(
        feeData?.feeStructureId ?? feeRow.feeStructureId ?? 0,
      ),
      feeStdDataId: Number(feeData?.feeStdDataId ?? 0),
    };
    if (!payload.feeStdDataId) {
      toast.error("Fee student data id is missing");
      return;
    }
    try {
      await saveFeeStudentWiseDiscount([payload]);
      toastSuccess("Institutional scholarship saved");
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, "Failed to save institutional scholarship");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Institutional Scholarship"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting || loading}
      size="sm"
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label>Fee Category</Label>
          <Controller
            name="feeCategoryId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : null}
                onChange={onCategoryChange}
                options={categories.map((c) => ({
                  value: String(c.feeCategoryId),
                  label: c.categoryName ?? String(c.feeCategoryId),
                }))}
                placeholder="Select fee category"
                searchable
                isLoading={loading}
              />
            )}
          />
          {errors.feeCategoryId && (
            <p className="text-xs text-destructive">
              {errors.feeCategoryId.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Fee Particular</Label>
          <Select
            value={
              watch("feeParticularsId")
                ? String(watch("feeParticularsId"))
                : null
            }
            onChange={(v) =>
              setValue(
                "feeParticularsId",
                v ? Number(v) : (undefined as unknown as number),
              )
            }
            options={particularOptions}
            placeholder="Select fee particular"
            searchable
            disabled={!categoryId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discountValue">Discount Amount</Label>
          <Input
            id="discountValue"
            type="number"
            min={0}
            {...register("value")}
            onBlur={(e) => {
              const v = Number(e.target.value) || 0;
              if (balanceAmt > 0 && v > balanceAmt) {
                toast.error("Discount amount is greater than balance amount.");
                setValue("value", 0);
              }
            }}
          />
          {errors.value && (
            <p className="text-xs text-destructive">{errors.value.message}</p>
          )}
          {categoryId ? (
            <p className="text-xs text-blue-600">
              Balance Amount is {balanceAmt}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="authComments">Reason</Label>
          <Input id="authComments" {...register("authComments")} />
          {errors.authComments && (
            <p className="text-xs text-destructive">
              {errors.authComments.message}
            </p>
          )}
        </div>
      </div>
    </FormModal>
  );
}
