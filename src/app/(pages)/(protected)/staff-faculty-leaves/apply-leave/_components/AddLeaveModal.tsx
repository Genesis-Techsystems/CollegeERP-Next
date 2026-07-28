"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CellStyleFunc,
  ColDef,
  ICellRendererParams,
} from "ag-grid-community";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, LibraryBig, Loader2 } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, rowIndexGetter } from "@/lib/utils";
import {
  LEAVE_DAYS,
  listEmpProxyDetails,
  listLeaveDayCalSettings,
  listLeaveHolidayEvents,
  listLeaveProcessStatuses,
  listLeaveTypesForEntitlement,
  toLeaveSlashYmd,
  toLeaveYmd,
  type AnyRow,
} from "@/services";
import { toastError, toastInfo } from "@/lib/toast";
import { LopConfirmDialog } from "./LopConfirmDialog";

const schema = z.object({
  leavetypeId: z.number().min(1, "Leave Type is required"),
  isForenoonAfternoon: z.enum(["F", "A", "H"]),
  leaveFromDate: z.custom<Date>(
    (v) => v instanceof Date && !Number.isNaN(v.getTime()),
    { message: "Leave From is required" },
  ),
  leaveToDate: z.custom<Date>(
    (v) => v instanceof Date && !Number.isNaN(v.getTime()),
    { message: "Leave To is required" },
  ),
  leaveDescription: z.string().min(1, "Description is mandatory"),
  isWorkload: z.boolean().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PROXY_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  classDate: { headerName: "Class Date", minWidth: 110 } as ColDef<AnyRow>,
  course: { headerName: "Course", minWidth: 180 } as ColDef<AnyRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 100,
  } as ColDef<AnyRow>,
  proxyEmployee: {
    headerName: "Proxy Employee",
    minWidth: 140,
  } as ColDef<AnyRow>,
  period: { headerName: "Peroid", minWidth: 90, flex: 0 } as ColDef<AnyRow>,
  timing: { headerName: "Timing", minWidth: 110, flex: 0 } as ColDef<AnyRow>,
};

const proxyMissingCellStyle: CellStyleFunc<AnyRow> = (params) => {
  if (Number(params.data?.assinedProxy) === 0) {
    return { backgroundColor: "#ffa0a0" };
  }
  return undefined;
};

function proxyClassDateRenderer(p: ICellRendererParams<AnyRow>) {
  return formatShortDate(p.data?.classDate);
}

function proxyCourseRenderer(p: ICellRendererParams<AnyRow>) {
  return String(p.data?.secDisplayName ?? "");
}

function proxyEmployeeRenderer(p: ICellRendererParams<AnyRow>) {
  return String(p.data?.proxyEmp ?? "");
}

function proxyPeriodRenderer(p: ICellRendererParams<AnyRow>) {
  return String(p.data?.periodno ?? "");
}

function proxyTimingRenderer(p: ICellRendererParams<AnyRow>) {
  return `${String(p.data?.startTime ?? "")} - ${String(p.data?.endTime ?? "")}`;
}

const PROXY_COLUMN_DEFS: ColDef<AnyRow>[] = [
  { ...PROXY_COL_DEFS.siNo, cellStyle: proxyMissingCellStyle },
  {
    ...PROXY_COL_DEFS.classDate,
    cellRenderer: proxyClassDateRenderer,
    cellStyle: proxyMissingCellStyle,
  },
  {
    ...PROXY_COL_DEFS.course,
    cellRenderer: proxyCourseRenderer,
    cellStyle: proxyMissingCellStyle,
  },
  { ...PROXY_COL_DEFS.subject, cellStyle: proxyMissingCellStyle },
  {
    ...PROXY_COL_DEFS.proxyEmployee,
    cellRenderer: proxyEmployeeRenderer,
    cellStyle: proxyMissingCellStyle,
  },
  {
    ...PROXY_COL_DEFS.period,
    cellRenderer: proxyPeriodRenderer,
    cellStyle: proxyMissingCellStyle,
  },
  {
    ...PROXY_COL_DEFS.timing,
    cellRenderer: proxyTimingRenderer,
    cellStyle: proxyMissingCellStyle,
  },
];

export interface AddLeaveDialogData {
  collegeId: number;
  leaveYear: number;
  employeeId: number;
  reportingManagerId: number | null;
  leaveCounts: AnyRow[];
  /** Edit mode — existing application fields */
  leaveApplictionId?: number;
  leaveApplicationId?: number;
  leavetypeId?: number;
  leaveFromDate?: string;
  leaveToDate?: string;
  leaveDescription?: string;
  noOfLeaves?: number;
  isForenoonAfternoon?: string;
  isActive?: boolean;
  reason?: string;
  academicYearId?: number;
}

interface AddLeaveModalProps {
  open: boolean;
  data: AddLeaveDialogData | null;
  organizationId: number;
  academicYearId: number;
  onClose: () => void;
  onSave: (rows: AnyRow[]) => void;
}

export function AddLeaveModal({
  open,
  data,
  organizationId,
  academicYearId,
  onClose,
  onSave,
}: AddLeaveModalProps) {
  const [leaveTypes, setLeaveTypes] = useState<AnyRow[]>([]);
  const [leaveStatuses, setLeaveStatuses] = useState<AnyRow[]>([]);
  const [settingsDetails, setSettingsDetails] = useState<AnyRow[]>([]);
  const [proxies, setProxies] = useState<AnyRow[]>([]);
  const [events, setEvents] = useState<AnyRow[]>([]);
  const [proxyOk, setProxyOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [availableCount, setAvailableCount] = useState(0);
  const [noOfLeaves, setNoOfLeaves] = useState(1);
  const [toDateOverride, setToDateOverride] = useState<Date | null>(null);
  const [lopOpen, setLopOpen] = useState(false);
  const [lopBal, setLopBal] = useState(0);
  const [lopDays, setLopDays] = useState(0);
  const [classesOpen, setClassesOpen] = useState(false);

  const minDate = useMemo(() => {
    if (!data) return undefined;
    return new Date(data.leaveYear, 0, 1);
  }, [data]);

  const maxDate = useMemo(() => {
    if (!data) return undefined;
    return new Date(data.leaveYear, 11, 31);
  }, [data]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      leavetypeId: 0,
      isForenoonAfternoon: "H",
      leaveFromDate: new Date(),
      leaveToDate: new Date(),
      leaveDescription: "",
      isWorkload: true,
      reason: "",
    },
  });

  const dayCode = watch("isForenoonAfternoon");
  const fromDate = watch("leaveFromDate");

  const leaveTypeOptions: SelectOption[] = useMemo(
    () =>
      leaveTypes.map((lt) => ({
        value: String(lt.leavetypeId),
        label: String(lt.leaveName ?? ""),
      })),
    [leaveTypes],
  );

  const dayOptions: SelectOption[] = useMemo(
    () =>
      LEAVE_DAYS.map((d) => ({
        value: d.code,
        label: `${d.name} (${d.time})`,
      })),
    [],
  );

  const applicationId = Number(
    data?.leaveApplictionId ?? data?.leaveApplicationId ?? 0,
  );

  const applyLeaveTypeBalance = useCallback(
    (leavetypeId: number) => {
      if (!data || !leavetypeId) {
        setAvailableCount(0);
        return;
      }
      const match = data.leaveCounts.find(
        (x) => Number(x.leavetypeId) === leavetypeId,
      );
      if (match) {
        setAvailableCount(Number(match.balanceLeaves ?? 0));
      } else {
        setAvailableCount(0);
      }
    },
    [data],
  );

  const loadProxies = useCallback(async () => {
    if (!data?.employeeId) {
      setProxies([]);
      setProxyOk(true);
      return;
    }
    const values = getValues();
    let ishalfday = 0;
    let fromTime = "00:00:00";
    let toTime = "23:59:59";
    if (values.isForenoonAfternoon === "F") {
      fromTime = "00:00:00";
      toTime = "13:00:00";
      ishalfday = 1;
    } else if (values.isForenoonAfternoon === "A") {
      fromTime = "13:00:00";
      toTime = "23:59:59";
      ishalfday = 1;
    }

    const fromSlash = toLeaveSlashYmd(values.leaveFromDate);
    let toSlash = toLeaveSlashYmd(values.leaveToDate);
    if (!fromSlash) return;
    if (!toSlash) toSlash = fromSlash;

    const date1 = `${fromSlash}-${fromTime}`;
    const date2 = `${toSlash}-${toTime}`;

    try {
      const rows = await listEmpProxyDetails({
        empId: data.employeeId,
        fromDate: date1,
        toDate: date2,
        ishalfday,
      });
      setProxies(rows);
      let ok = true;
      for (const p of rows) {
        if (Number(p.assinedProxy) === 0) {
          ok = false;
          break;
        }
      }
      setProxyOk(ok);
    } catch (e) {
      toastError(e, "Failed to load proxy details");
    }
  }, [data?.employeeId, getValues]);

  const loadHolidayEvents = useCallback(
    async (days: number) => {
      if (!data?.collegeId) return;
      if (
        settingsDetails.length === 0 ||
        Number(settingsDetails[0]?.settingValue ?? 0) <= days
      ) {
        setEvents([]);
        return;
      }
      const values = getValues();
      const date1 = toLeaveSlashYmd(values.leaveFromDate);
      let date2 = toLeaveSlashYmd(values.leaveToDate);
      if (!date1) return;
      if (!date2) date2 = date1;
      try {
        const rows = await listLeaveHolidayEvents({
          collegeId: data.collegeId,
          startDate: date1,
          endDate: date2,
        });
        setEvents(rows);
        if (rows.length > 0) {
          setNoOfLeaves((n) => n - rows.length);
        }
      } catch (e) {
        toastError(e, "Failed to load holidays");
      }
    },
    [data?.collegeId, getValues, settingsDetails],
  );

  const calDays = useCallback(
    async (changed: "from" | "to") => {
      setEvents([]);
      const values = getValues();
      if (!applicationId && changed === "from") {
        setValue("leaveToDate", values.leaveFromDate);
      }

      let effectiveTo = values.leaveToDate;
      if (
        values.isForenoonAfternoon === "F" ||
        values.isForenoonAfternoon === "A"
      ) {
        setValue("leaveToDate", values.leaveFromDate);
        effectiveTo = values.leaveFromDate;
        setToDateOverride(values.leaveFromDate);
      } else {
        setToDateOverride(null);
      }

      await loadProxies();

      const date1 = new Date(toLeaveYmd(values.leaveFromDate) ?? "");
      const date2 = new Date(toLeaveYmd(effectiveTo) ?? "");
      if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime()))
        return;

      const hasEl = leaveTypes.some((x) => String(x.leaveCode) === "EL");
      const timeDiff = Math.round(date2.getTime() - date1.getTime());
      let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      const applyHalfDay = () => {
        if (
          values.isForenoonAfternoon === "F" ||
          values.isForenoonAfternoon === "A"
        ) {
          setNoOfLeaves(0.5);
          return true;
        }
        return false;
      };

      if (hasEl) {
        setNoOfLeaves(diffDays);
        if (!applyHalfDay()) {
          /* full day already set */
        }
      } else if (date1.getTime() > date2.getTime()) {
        toastInfo("From date should be less then To date.");
        setValue("leaveFromDate", effectiveTo);
        setNoOfLeaves(1);
      } else {
        setNoOfLeaves(diffDays);
        if (!applyHalfDay()) {
          const rem = availableCount - diffDays;
          if (rem < 0) {
            toastInfo("Leaves are exceeding.");
            setNoOfLeaves(1);
            setValue("leaveToDate", values.leaveFromDate);
            diffDays = 1;
          }
        }
      }

      const finalDays =
        values.isForenoonAfternoon === "F" || values.isForenoonAfternoon === "A"
          ? 0.5
          : getValues("leavetypeId")
            ? Math.max(diffDays, 0)
            : diffDays;

      await loadHolidayEvents(
        values.isForenoonAfternoon === "F" || values.isForenoonAfternoon === "A"
          ? 0.5
          : finalDays,
      );
    },
    [
      applicationId,
      availableCount,
      getValues,
      leaveTypes,
      loadHolidayEvents,
      loadProxies,
      setValue,
    ],
  );

  useEffect(() => {
    if (!open || !data) return;
    let cancelled = false;
    setLoading(true);
    setClassesOpen(false);
    (async () => {
      try {
        const [types, statuses, settings] = await Promise.all([
          listLeaveTypesForEntitlement(organizationId),
          listLeaveProcessStatuses(),
          listLeaveDayCalSettings(),
        ]);
        if (cancelled) return;
        setLeaveTypes(types);
        setLeaveStatuses(statuses);
        setSettingsDetails(settings);

        const today = new Date();
        const from = data.leaveFromDate
          ? new Date(String(data.leaveFromDate))
          : today;
        const to = data.leaveToDate
          ? new Date(String(data.leaveToDate))
          : today;
        const day =
          data.isForenoonAfternoon === "F" ||
          data.isForenoonAfternoon === "A" ||
          data.isForenoonAfternoon === "H"
            ? data.isForenoonAfternoon
            : "H";

        reset({
          leavetypeId: Number(data.leavetypeId ?? 0),
          isForenoonAfternoon: day,
          leaveFromDate: Number.isNaN(from.getTime()) ? today : from,
          leaveToDate: Number.isNaN(to.getTime()) ? today : to,
          leaveDescription: String(data.leaveDescription ?? ""),
          isWorkload: data.isActive ?? true,
          reason: String(data.reason ?? ""),
        });

        if (data.leavetypeId) {
          applyLeaveTypeBalance(Number(data.leavetypeId));
        }
        if (data.noOfLeaves != null) {
          setNoOfLeaves(Number(data.noOfLeaves));
        }

        // defer proxy/day calc after form reset
        setTimeout(() => {
          if (!cancelled) void calDays(applicationId ? "from" : "from");
        }, 0);
      } catch (e) {
        toastError(e, "Failed to load leave form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per open/data
  }, [open, data, organizationId]);

  function selectedLeaveDay(day: string) {
    if (day === "F" || day === "A") {
      const from = getValues("leaveFromDate");
      setValue("leaveToDate", from);
      setToDateOverride(from);
      setNoOfLeaves(0.5);
    } else {
      setToDateOverride(null);
      setNoOfLeaves(1);
    }
    if (applicationId) void calDays("from");
    void loadProxies();
  }

  function onSubmit(values: FormValues) {
    if (!data) return;

    let leaveTo = values.leaveToDate;
    if (
      values.isForenoonAfternoon === "F" ||
      values.isForenoonAfternoon === "A"
    ) {
      leaveTo = toDateOverride ?? values.leaveFromDate;
    }

    const leaveFromYmd = toLeaveYmd(values.leaveFromDate);
    const leaveToYmd = toLeaveYmd(leaveTo);
    if (!leaveFromYmd || !leaveToYmd) return;

    const fromYear = Number(leaveFromYmd.slice(0, 4));
    const toYear = Number(leaveToYmd.slice(0, 4));
    if (fromYear !== data.leaveYear || toYear !== data.leaveYear) {
      toastInfo(
        "Please check leave year and selected date year should be same.",
      );
      return;
    }

    const appliedStatus = leaveStatuses.find(
      (x) => String(x.generalDetailCode) === "LPSAPPLIED",
    );
    const leaveType = leaveTypes.find(
      (x) => Number(x.leavetypeId) === values.leavetypeId,
    );
    const leaveTypeCode = String(leaveType?.leaveCode ?? "");

    const Obj: AnyRow = {
      academicYearId,
      assignedEmployeeId: data.reportingManagerId,
      isActive: true,
      isForenoonAfternoon: values.isForenoonAfternoon,
      isWorkload: values.isWorkload ?? true,
      leaveDescription: values.leaveDescription,
      leaveFromDate: leaveFromYmd,
      leaveToDate: leaveToYmd,
      leaveprocessStatusId: appliedStatus
        ? Number(appliedStatus.generalDetailId)
        : null,
      leavetypeId: values.leavetypeId,
      noOfLeaves,
      reason: values.reason ?? null,
      userId: data.reportingManagerId,
      leaveTypeCode,
      leaveCode: leaveTypeCode,
    };

    if (
      leaveTypeCode !== "OD" &&
      leaveTypeCode !== "CCL" &&
      leaveTypeCode !== "LOP"
    ) {
      if (availableCount < noOfLeaves) {
        setLopBal(availableCount);
        setLopDays(noOfLeaves - availableCount);
        setLopOpen(true);
        return;
      }
      onSave([
        {
          academicYearId: Obj.academicYearId,
          assignedEmployeeId: Obj.assignedEmployeeId,
          isActive: Obj.isActive,
          isForenoonAfternoon: Obj.isForenoonAfternoon,
          isWorkload: Obj.isWorkload,
          leaveDescription: Obj.leaveDescription,
          leaveFromDate: Obj.leaveFromDate,
          leaveToDate: Obj.leaveToDate,
          leaveprocessStatusId: Obj.leaveprocessStatusId,
          leavetypeId: Obj.leavetypeId,
          noOfLeaves: Obj.noOfLeaves,
          reason: Obj.reason,
          userId: Obj.userId,
        },
      ]);
    } else {
      onSave([Obj]);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto"
          closeOnOutsideClick={false}
          hasDescription
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <LibraryBig className="h-5 w-5" aria-hidden />
              Apply Leave
            </DialogTitle>
            <DialogDescription className="sr-only">
              Apply or edit leave application
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {!proxyOk ? (
                <p className="rounded-[3px] border-2 border-[#f53a3a] bg-[#ffc4c4] px-2.5 py-1 text-center text-sm font-medium text-black">
                  Please set proxy to your classes.
                </p>
              ) : null}

              {/* Leave Type ~50% / Day ~32% — Angular fxFlex layout */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full space-y-1.5 sm:w-[48%] sm:max-w-[48%]">
                  <Label>
                    Leave Type <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="leavetypeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : null}
                        onChange={(v) => {
                          const id = v ? Number(v) : 0;
                          field.onChange(id);
                          applyLeaveTypeBalance(id);
                          void loadProxies();
                        }}
                        options={leaveTypeOptions}
                        placeholder="Leave Type"
                      />
                    )}
                  />
                  {errors.leavetypeId ? (
                    <p className="text-xs text-destructive">
                      {errors.leavetypeId.message}
                    </p>
                  ) : null}
                </div>
                <div className="w-full space-y-1.5 sm:w-[30%] sm:max-w-[30%]">
                  <Label>
                    Day <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="isForenoonAfternoon"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={(v) => {
                          const code = (v ?? "H") as "F" | "A" | "H";
                          field.onChange(code);
                          selectedLeaveDay(code);
                        }}
                        options={dayOptions}
                        placeholder="Day"
                        searchable={false}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Leave From / time / Leave To / time — Angular compact date fields */}
              <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                <div className="w-full max-w-[11rem] space-y-1.5">
                  <Label>
                    Leave From <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="leaveFromDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={(d) => {
                          if (d) {
                            field.onChange(d);
                            void calDays("from");
                          }
                        }}
                        minDate={minDate}
                        maxDate={maxDate}
                        displayFormat="dd/MM/yyyy"
                        clearable={false}
                      />
                    )}
                  />
                </div>
                <TimeBadge>{dayCode === "A" ? "1:00 PM" : "9:00 AM"}</TimeBadge>
                <div className="w-full max-w-[11rem] space-y-1.5">
                  <Label>
                    Leave To <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="leaveToDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={(d) => {
                          if (d) {
                            field.onChange(d);
                            void calDays("to");
                          }
                        }}
                        minDate={fromDate ?? minDate}
                        maxDate={maxDate}
                        disabled={dayCode === "F" || dayCode === "A"}
                        displayFormat="dd/MM/yyyy"
                        clearable={false}
                      />
                    )}
                  />
                </div>
                <TimeBadge>{dayCode === "F" ? "1:00 PM" : "4:00 PM"}</TimeBadge>
              </div>

              {proxies.length > 0 ? (
                <Collapsible
                  open={classesOpen}
                  onOpenChange={setClassesOpen}
                  className="rounded-md border border-border bg-background"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-muted/30"
                      aria-label="Toggle Classes List"
                    >
                      <span className="text-[13px] font-semibold">
                        Classes List
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                          classesOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border px-2 pb-2 pt-1">
                      <DataTable
                        rowData={proxies}
                        columnDefs={PROXY_COLUMN_DEFS}
                        bordered={false}
                        height="auto"
                        pagination={false}
                        toolbar={false}
                        fitColumnsToWidth={false}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {events.length > 0 ? (
                <ul className="space-y-1 rounded-sm border border-yellow-400 bg-[#ffffbf] px-3 py-2 text-sm font-medium">
                  {events.map((ev, i) => (
                    <li key={`${String(ev.eventName)}-${i}`}>
                      {String(ev.eventName ?? "")} (
                      {formatShortDate(ev.startDate)} -{" "}
                      {formatShortDate(ev.endDate)})
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-1.5">
                <h3 className="text-base font-medium text-muted-foreground">
                  Leave Description{" "}
                  {!watch("leaveDescription") ? (
                    <span className="text-destructive font-normal">
                      Description is mandatory *
                    </span>
                  ) : null}
                </h3>
                <Controller
                  name="leaveDescription"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      placeholder="Leave Description"
                      rows={5}
                      className="min-h-[130px] rounded-[3px] border-2 border-[#dedede]"
                      {...field}
                    />
                  )}
                />
                {errors.leaveDescription ? (
                  <p className="text-xs text-destructive">
                    {errors.leaveDescription.message}
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                {proxyOk ? <Button type="submit">Save</Button> : null}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <LopConfirmDialog
        open={lopOpen}
        bal={lopBal}
        lop={lopDays}
        onClose={() => setLopOpen(false)}
      />
    </>
  );
}

/** Angular `.t_time` badge next to leave date pickers. */
function TimeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 inline-flex rounded border-2 border-[#c7c7ff] bg-[#eaeaff] px-2 py-1 text-sm font-medium">
      {children}
    </span>
  );
}

function formatShortDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
