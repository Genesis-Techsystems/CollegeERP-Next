"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionContext } from "@/context/SessionContext";
import { formatDate } from "@/common/generic-functions";
import {
  getEmpLeaveCount,
  listEmployeeRunningLeaves,
  type AnyRow,
} from "@/services";
import { toastError } from "@/lib/toast";

const schema = z.object({
  reason: z.string().min(1, "Comments are required"),
});

type FormValues = z.infer<typeof schema>;

interface ApproveLeaveModalProps {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
  onSave: (payload: { reason: string; leaveCode?: string }) => void;
  /** Angular leave-approvals `approve-leave` — show month leave count. */
  includeMonthLeaves?: boolean;
}

/** Angular `change-status2` / `approve-leave` comments dialog. */
export function ApproveLeaveModal({
  open,
  row,
  onClose,
  onSave,
  includeMonthLeaves = false,
}: ApproveLeaveModalProps) {
  const { user } = useSessionContext();
  const [leaveHistory, setLeaveHistory] = useState<AnyRow[]>([]);
  const [balanceLeaves, setBalanceLeaves] = useState<number | string>("--");
  const [consumedLeaves, setConsumedLeaves] = useState<number | string>("--");
  const [leavesTaken, setLeavesTaken] = useState<number | string>("--");
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!open || !row) return;
    reset({ reason: "" });
    setBalanceLeaves("--");
    setConsumedLeaves("--");
    setLeavesTaken("--");
    setLeaveHistory([]);

    const collegeId = Number(row.collegeId ?? 0);
    const employeeId = Number(row.employeeId ?? 0);
    const leaveYear = row.leaveYear;
    const leaveTypeId = Number(row.leavetypeId ?? 0);
    const leaveFromDate = row.leaveFromDate;

    if (!collegeId || !employeeId || leaveYear == null) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const history = await listEmployeeRunningLeaves(
          collegeId,
          employeeId,
          String(leaveYear),
        );
        if (cancelled) return;
        setLeaveHistory(history);
        const match = history.find(
          (x) => Number(x.leavetypeId) === leaveTypeId,
        );
        if (match) {
          setBalanceLeaves(Number(match.balanceLeaves ?? 0));
          setConsumedLeaves(Number(match.consumedLeaves ?? 0));
        }

        if (
          includeMonthLeaves &&
          leaveFromDate != null &&
          leaveFromDate !== ""
        ) {
          const monthRows = await getEmpLeaveCount(
            String(leaveFromDate),
            employeeId,
          );
          if (cancelled) return;
          let total = 0;
          for (const r of monthRows) {
            total += Number(r.noOfLeaves ?? 0);
          }
          setLeavesTaken(total);
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load leave balance");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row, reset, includeMonthLeaves]);

  function onSubmit(values: FormValues) {
    let reason = values.reason;
    if (reason.split("-").length > 1) {
      reason = reason.split("-").slice(1).join("-").trim();
    }
    const uName =
      user?.firstName ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("uName") || user?.userName || ""
        : "") ||
      "";
    onSave({
      reason: `${uName} - ${reason}`,
      leaveCode: row?.leaveCode != null ? String(row.leaveCode) : undefined,
    });
  }

  if (!row) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Comments"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={loading}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="space-y-2 text-sm border rounded-md p-3">
        <DetailRow
          label="Employee"
          value={
            <>
              <span className="text-blue-600">
                {String(row.employeeFirstName ?? "")}
              </span>
              {row.employeeNumber ? (
                <span className="text-muted-foreground">
                  {" "}
                  ({String(row.employeeNumber)})
                </span>
              ) : null}
            </>
          }
        />
        <DetailRow label="Leave Type" value={String(row.leaveName ?? "")} />
        <DetailRow
          label="Leave Dates"
          value={`${formatDisplayDate(row.leaveFromDate)} - ${formatDisplayDate(row.leaveToDate)}`}
        />
        <DetailRow
          label="Leave Description"
          value={String(row.leaveDescription ?? "")}
        />
        <DetailRow
          label="No. of leave days"
          value={String(row.noOfLeaves ?? "")}
        />
        <DetailRow
          label="Leave Status"
          value={String(row.leaveprocessStatusDisplayName ?? "")}
        />
        <DetailRow label="Leaves Consumed" value={String(consumedLeaves)} />
        <DetailRow label="Leave Balance" value={String(balanceLeaves)} />
        {includeMonthLeaves ? (
          <DetailRow
            label="Leaves taken in this month"
            value={String(leavesTaken)}
          />
        ) : null}
      </div>

      {leaveHistory.length > 0 ? (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-2">Leave Type</th>
                <th className="p-2 text-center">Total Leaves</th>
                <th className="p-2 text-center">Consumed Leaves</th>
                <th className="p-2 text-center">Balanced Leaves</th>
              </tr>
            </thead>
            <tbody>
              {leaveHistory.map((item) => (
                <tr
                  key={String(item.leavetypeId ?? item.leaveName)}
                  className="border-t"
                >
                  <td className="p-2">{String(item.leaveName ?? "")}</td>
                  <td className="p-2 text-center">
                    {String(item.totalLeaves ?? "")}
                  </td>
                  <td className="p-2 text-center">
                    {String(item.consumedLeaves ?? "")}
                  </td>
                  <td className="p-2 text-center">
                    {String(item.balanceLeaves ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="leave-request-reason">Comments *</Label>
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <Input
              id="leave-request-reason"
              placeholder="Comments"
              {...field}
            />
          )}
        />
        {errors.reason ? (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        ) : null}
      </div>
    </FormModal>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_12px_1fr] gap-1 items-start">
      <span className="text-muted-foreground">{label}</span>
      <span>:</span>
      <span className="text-blue-700">{value}</span>
    </div>
  );
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "--";
  const raw = formatDate(String(value));
  if (raw === "—" || raw.includes("/")) {
    try {
      const d = new Date(String(value));
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      // fall through
    }
  }
  return raw;
}
