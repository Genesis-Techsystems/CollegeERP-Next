"use client";

import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { toastInfo } from "@/lib/toast";
import {
  LEAVE_DAY_OPTIONS,
  formatLeaveYmd,
  getLeaveProcessStatuses,
  getLeaveTypesForOrg,
  type StaffDashRow,
  type EmpAttendanceDay,
  type LeaveTotalRow,
} from "@/services";

export interface ApplyLateLeaveContext {
  events: EmpAttendanceDay[];
  leaveCounts: LeaveTotalRow[];
  first_name?: string;
  emp_number?: string;
  login_date_time?: string | null;
  logout_date_time?: string | null;
  reportingManagerId?: number | string | null;
  Month_Year?: string;
  running_late_min?: number;
  leaveCode?: string;
}

interface ApplyLateLeaveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: StaffDashRow) => Promise<void>;
  data: ApplyLateLeaveContext | null;
  organizationId: number;
  isSubmitting?: boolean;
}

function leaveTypeIdOf(row: StaffDashRow): number {
  return Number(row.leavetypeId ?? row.leaveTypeId ?? 0);
}

function balanceOf(row: LeaveTotalRow): number {
  return Number(row.balance_leaves ?? row.balanceLeaves ?? 0);
}

function consumedOf(row: LeaveTotalRow): number {
  return Number(row.consumed_leaves ?? row.consumedLeaves ?? 0);
}

function typeIdFromCount(row: LeaveTotalRow): number {
  return Number(row.leavetypeId ?? 0);
}

export function ApplyLateLeaveModal({
  open,
  onClose,
  onSubmit,
  data,
  organizationId,
  isSubmitting = false,
}: ApplyLateLeaveModalProps) {
  const attendance = data?.events?.[0];
  const [leaveTypes, setLeaveTypes] = useState<StaffDashRow[]>([]);
  const [leaveStatuses, setLeaveStatuses] = useState<StaffDashRow[]>([]);
  const [leavetypeId, setLeavetypeId] = useState<string | null>(null);
  const [isForenoonAfternoon, setIsForenoonAfternoon] = useState<string>("H");
  const [leaveFromDate, setLeaveFromDate] = useState<Date | null>(null);
  const [leaveToDate, setLeaveToDate] = useState<Date | null>(null);
  const [leaveDescription, setLeaveDescription] = useState("");
  const [noOfLeaves, setNoOfLeaves] = useState(1);
  const [availableCount, setAvailableCount] = useState(0);
  const [consumedLeaves, setConsumedLeaves] = useState(0);
  const [remainingLeaves, setRemainingLeaves] = useState(0);
  const [appliedLeaves, setAppliedLeaves] = useState(1);
  const [toDateLocked, setToDateLocked] = useState(false);

  useEffect(() => {
    if (!open || organizationId <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [types, statuses] = await Promise.all([
          getLeaveTypesForOrg(organizationId),
          getLeaveProcessStatuses(),
        ]);
        if (cancelled) return;
        setLeaveTypes(types);
        setLeaveStatuses(statuses);

        const attDate = attendance?.Attendance_Date
          ? new Date(`${attendance.Attendance_Date}T00:00:00`)
          : new Date();
        setLeaveFromDate(attDate);
        setLeaveToDate(attDate);
        setLeaveDescription("");
        setIsForenoonAfternoon("H");
        setToDateLocked(false);
        setNoOfLeaves(1);
        setAppliedLeaves(1);

        let typeId: number | null = null;
        if (data?.leaveCode) {
          const match = types.find(
            (t) => String(t.leaveCode) === String(data.leaveCode),
          );
          if (match) typeId = leaveTypeIdOf(match);
        }
        setLeavetypeId(typeId && typeId > 0 ? String(typeId) : null);
      } catch {
        if (!cancelled) {
          setLeaveTypes([]);
          setLeaveStatuses([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, attendance?.Attendance_Date, data?.leaveCode]);

  useEffect(() => {
    if (!leavetypeId || !data?.leaveCounts) return;
    const id = Number(leavetypeId);
    const match = data.leaveCounts.find((x) => typeIdFromCount(x) === id);
    if (match) {
      setAvailableCount(balanceOf(match));
      setConsumedLeaves(consumedOf(match));
      setRemainingLeaves(balanceOf(match) - appliedLeaves);
    }
  }, [leavetypeId, data?.leaveCounts, appliedLeaves]);

  const leaveTypeOptions = useMemo(
    () =>
      leaveTypes.map((t) => ({
        value: String(leaveTypeIdOf(t)),
        label: String(t.leaveName ?? t.leaveCode ?? "Leave"),
      })),
    [leaveTypes],
  );

  const dayOptions = useMemo(
    () =>
      LEAVE_DAY_OPTIONS.map((d) => ({
        value: d.code,
        label: `${d.name} (${d.time})`,
      })),
    [],
  );

  function recalculateDays(
    from: Date | null,
    to: Date | null,
    dayCode: string,
    typeId: string | null,
  ) {
    if (!from) return;
    let effectiveTo = to ?? from;
    let days = 1;

    if (dayCode === "F" || dayCode === "A") {
      effectiveTo = from;
      setLeaveToDate(from);
      setToDateLocked(true);
      days = 0.5;
    } else {
      setToDateLocked(false);
      const t1 = from.getTime();
      const t2 = effectiveTo.getTime();
      if (t1 > t2) {
        toastInfo("From date should be less then To date.");
        setLeaveFromDate(effectiveTo);
        days = 1;
        setNoOfLeaves(1);
        setAppliedLeaves(1);
        setRemainingLeaves(availableCount - 1);
        return;
      }
      days = Math.ceil((t2 - t1) / (1000 * 3600 * 24)) + 1;
    }

    setNoOfLeaves(days);
    setAppliedLeaves(days);
    if (typeId) {
      const rem = availableCount - days;
      if (rem < 0 && dayCode === "H") {
        toastInfo("Leaves are exceeding.");
        setRemainingLeaves(availableCount);
        setAppliedLeaves(1);
        setLeaveToDate(from);
        setNoOfLeaves(1);
        return;
      }
      setRemainingLeaves(rem);
    }
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!data || !attendance) return;
    if (!leaveDescription.trim()) {
      toastInfo("Description is mandatory *");
      return;
    }
    if (!leavetypeId || !leaveFromDate || !leaveToDate) return;

    const typeRow = leaveTypes.find(
      (t) => leaveTypeIdOf(t) === Number(leavetypeId),
    );
    const leaveTypeCode = String(typeRow?.leaveCode ?? "");
    const statusRow = leaveStatuses.find(
      (s) => String(s.generalDetailCode) === "LPSAPPLIED",
    );

    if (
      leaveTypeCode !== "OD" &&
      leaveTypeCode !== "CCL" &&
      leaveTypeCode !== "LOP"
    ) {
      if (availableCount <= noOfLeaves) {
        toastInfo("Please check your leave balance.");
        return;
      }
    }

    const payload: StaffDashRow = {
      leaveDescription: leaveDescription.trim(),
      leaveFromDate: formatLeaveYmd(leaveFromDate),
      leaveToDate: formatLeaveYmd(
        isForenoonAfternoon === "F" || isForenoonAfternoon === "A"
          ? leaveFromDate
          : leaveToDate,
      ),
      leavetypeId: Number(leavetypeId),
      isForenoonAfternoon,
      noOfLeaves,
      isWorkload: true,
      assignedEmployeeId: data.reportingManagerId,
      leaveprocessStatusId: statusRow
        ? Number(statusRow.generalDetailId)
        : undefined,
      leaveTypeCode,
      isActive: true,
    };

    await onSubmit(payload);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Apply Leave"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      size="xl"
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <span className="text-muted-foreground">Employee :</span>
          <span className="font-medium text-primary">
            {data?.first_name} ({data?.emp_number})
          </span>
        </div>
        {data?.Month_Year ? (
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Month Year :</span>
            <span className="font-medium text-primary">{data.Month_Year}</span>
          </div>
        ) : null}
        {data?.running_late_min != null && data.running_late_min > 0 ? (
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Late Minutes :</span>
            <span className="font-medium text-primary">
              {data.running_late_min}
            </span>
          </div>
        ) : null}
        {data?.login_date_time ? (
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Login Time :</span>
            <span className="font-medium text-primary">
              {data.login_date_time}
            </span>
          </div>
        ) : null}
        {data?.logout_date_time ? (
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Logout Time :</span>
            <span className="font-medium text-primary">
              {data.logout_date_time}
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Leave Type"
            value={leavetypeId}
            onChange={(v) => {
              setLeavetypeId(v);
              recalculateDays(
                leaveFromDate,
                leaveToDate,
                isForenoonAfternoon,
                v,
              );
            }}
            options={leaveTypeOptions}
            placeholder="Leave Type"
          />
          <Select
            label="Day"
            value={isForenoonAfternoon}
            onChange={(v) => {
              const code = v ?? "H";
              setIsForenoonAfternoon(code);
              recalculateDays(leaveFromDate, leaveToDate, code, leavetypeId);
            }}
            options={dayOptions}
            searchable={false}
            clearable={false}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="space-y-1">
            <DatePicker
              label="Leave From"
              value={leaveFromDate}
              onChange={(d) => {
                setLeaveFromDate(d);
                recalculateDays(
                  d,
                  leaveToDate,
                  isForenoonAfternoon,
                  leavetypeId,
                );
              }}
            />
            {(isForenoonAfternoon === "F" || isForenoonAfternoon === "H") && (
              <p className="text-xs text-muted-foreground pl-1">9:00 AM</p>
            )}
            {isForenoonAfternoon === "A" && (
              <p className="text-xs text-muted-foreground pl-1">1:00 PM</p>
            )}
          </div>
          <div className="space-y-1">
            <DatePicker
              label="Leave To"
              value={leaveToDate}
              onChange={(d) => {
                setLeaveToDate(d);
                recalculateDays(
                  leaveFromDate,
                  d,
                  isForenoonAfternoon,
                  leavetypeId,
                );
              }}
              disabled={toDateLocked}
            />
            {isForenoonAfternoon === "F" && (
              <p className="text-xs text-muted-foreground pl-1">1:00 PM</p>
            )}
            {(isForenoonAfternoon === "A" || isForenoonAfternoon === "H") && (
              <p className="text-xs text-muted-foreground pl-1">4:00 PM</p>
            )}
          </div>
        </div>

        {leavetypeId ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <p>
              <span className="text-blue-600">Available Leaves : </span>
              {availableCount}
            </p>
            <p>
              <span className="text-blue-600">Leaves Taken : </span>
              {consumedLeaves}
            </p>
            <p>
              <span className="text-blue-600">Remaining Leaves : </span>
              {remainingLeaves}
            </p>
            <p>
              <span className="text-blue-600">No. of days : </span>
              {appliedLeaves}
            </p>
          </div>
        ) : null}

        <div>
          <h3 className="font-medium mb-1">Leave Description</h3>
          <textarea
            className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Leave Description"
            value={leaveDescription}
            onChange={(e) => setLeaveDescription(e.target.value)}
            required
          />
          {!leaveDescription.trim() ? (
            <span className="text-xs text-red-600">
              Description is mandatory *
            </span>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
