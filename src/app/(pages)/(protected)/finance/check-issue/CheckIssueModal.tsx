import { useEffect, useMemo } from "react";
import { useForm, Resolver } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FinChequeIssue } from "@/types/finance";
import {
  listFinBankAccounts,
  listFinChequeBooks,
  createFinChequeIssue,
  updateFinChequeIssue,
} from "@/services/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  editData: FinChequeIssue | null;
  onSaved: () => void;
  isIntersection: boolean;
}

const schema = z.object({
  issuedToFinBankAccountId: z.coerce
    .number()
    .min(1, "Issued To Bank Account is required"),
  chequeBookId: z.coerce.number().min(1, "Cheque Book is required"),
  issuedChequeNo: z.string().min(1, "Issued Cheque No is required"),
  inFavourTowards: z.string().min(1, "In Favour Of/Towards is required"),
  particulars: z.string().optional(),
  paymentNoteNo: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  payment: z.string().optional(),
  receiptNo: z.string().optional(),
  chequeDate: z.date({ required_error: "Cheque Date is required" }),
  issuedDate: z.date({ required_error: "Issued Date is required" }),
  isSettled: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: FinChequeIssue | null): FormValues {
  return {
    issuedToFinBankAccountId: edit?.issuedToFinBankAccountId ?? 0,
    chequeBookId: edit?.chequeBookId ?? 0,
    issuedChequeNo: edit?.issuedChequeNo ?? "",
    inFavourTowards: edit?.inFavourTowards ?? "",
    particulars: edit?.particulars ?? "",
    paymentNoteNo: edit?.paymentNoteNo ?? "",
    amount: edit?.amount ?? 0,
    payment: String(edit?.payment ?? ""),
    receiptNo: edit?.receiptNo ?? "",
    chequeDate: edit?.chequeDate ? new Date(edit.chequeDate) : new Date(),
    issuedDate: edit?.issuedDate ? new Date(edit.issuedDate) : new Date(),
    isSettled: edit?.isSettled ?? false,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export default function CheckIssueModal({
  open,
  onClose,
  editData,
  onSaved,
  isIntersection,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const issuedToFinBankAccountId = watch("issuedToFinBankAccountId");
  const isActive = watch("isActive");

  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery({
    queryKey: ["FinBankAccount", "list"],
    queryFn: listFinBankAccounts,
    enabled: open,
  });

  const { data: allChequeBooks = [], isLoading: chequeBooksLoading } = useQuery(
    {
      queryKey: ["FinChequeBook", "list"],
      queryFn: listFinChequeBooks,
      enabled: open && issuedToFinBankAccountId > 0,
    },
  );

  const bankAccountOptions = useMemo<SelectOption[]>(
    () =>
      bankAccounts.map((b) => ({
        value: String(b.bankAccountId),
        label: String(b.accountNumber ?? b.bankAccountNo ?? b.bankAccountId),
      })),
    [bankAccounts],
  );

  const chequeBookOptions = useMemo<SelectOption[]>(
    () =>
      allChequeBooks
        .filter(
          (cb) =>
            cb.finBankAccountId === issuedToFinBankAccountId ||
            cb.bankAccountId === issuedToFinBankAccountId,
        )
        .map((cb) => ({
          value: String(cb.chequeBookId),
          label: String(cb.chequebookSerialNo ?? cb.chequeBookId),
        })),
    [allChequeBooks, issuedToFinBankAccountId],
  );

  useEffect(() => {
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload: Partial<FinChequeIssue> = {
        chequeBookId: values.chequeBookId,
        issuedChequeNo: values.issuedChequeNo.trim(),
        inFavourTowards: values.inFavourTowards.trim(),
        particulars: values.particulars?.trim(),
        paymentNoteNo: values.paymentNoteNo?.trim(),
        amount: values.amount,
        issuedToFinBankAccountId: values.issuedToFinBankAccountId,
        isActive: values.isActive,
        reason: values.isActive
          ? "active"
          : values.reason?.trim() || "inactive",
        chequeDate: values.chequeDate.toISOString(),
        issuedDate: values.issuedDate.toISOString(),
        isSettled: values.isSettled,
        isIntersection: isIntersection,
        status: editData?.status || "Issued",
        payment: isIntersection ? values.payment : "",
        receiptNo: isIntersection ? values.receiptNo : "",
      };

      if (editData) {
        await updateFinChequeIssue(editData.chequeIssueId, payload);
        toast.success("Successfully updated");
      } else {
        await createFinChequeIssue(payload);
        toast.success("Successfully created");
      }
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>
            {editData ? "Edit" : "Add"}{" "}
            {isIntersection ? "Intersection" : "Cheque Issue"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Issued To Bank Account *"
              value={
                issuedToFinBankAccountId ? String(issuedToFinBankAccountId) : ""
              }
              onChange={(v) => {
                setValue("issuedToFinBankAccountId", Number(v));
                setValue("chequeBookId", 0);
              }}
              options={bankAccountOptions}
              disabled={bankAccountsLoading}
              error={errors.issuedToFinBankAccountId?.message}
            />

            <Select
              label="Cheque Book *"
              value={watch("chequeBookId") ? String(watch("chequeBookId")) : ""}
              onChange={(v) => setValue("chequeBookId", Number(v))}
              options={chequeBookOptions}
              disabled={chequeBooksLoading || !issuedToFinBankAccountId}
              error={errors.chequeBookId?.message}
            />

            <div>
              <Label>Issued Cheque No *</Label>
              <Input {...register("issuedChequeNo")} />
              {errors.issuedChequeNo && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.issuedChequeNo.message}
                </p>
              )}
            </div>

            <div>
              <Label>In Favour Of/Towards *</Label>
              <Input {...register("inFavourTowards")} />
              {errors.inFavourTowards && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.inFavourTowards.message}
                </p>
              )}
            </div>

            <div>
              <Label>Particulars</Label>
              <Input {...register("particulars")} />
            </div>

            {!isIntersection && (
              <div>
                <Label>Payment Note No</Label>
                <Input {...register("paymentNoteNo")} />
              </div>
            )}

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>

            {isIntersection && (
              <>
                <div>
                  <Label>Payment</Label>
                  <Input {...register("payment")} />
                </div>
                <div>
                  <Label>Receipt Number</Label>
                  <Input {...register("receiptNo")} />
                </div>
              </>
            )}

            <DatePicker
              label="Cheque Date"
              value={watch("chequeDate")}
              onChange={(d) => d && setValue("chequeDate", d)}
            />

            <DatePicker
              label="Issued Date"
              value={watch("issuedDate")}
              onChange={(d) => d && setValue("issuedDate", d)}
            />

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="isSettled"
                checked={watch("isSettled")}
                onCheckedChange={(c) => setValue("isSettled", !!c)}
              />
              <Label htmlFor="isSettled">Is Settled</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(c) => setValue("isActive", !!c)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            {!isActive && (
              <div>
                <Label>Reason</Label>
                <Input
                  {...register("reason")}
                  placeholder="Reason for inactive"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editData ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
