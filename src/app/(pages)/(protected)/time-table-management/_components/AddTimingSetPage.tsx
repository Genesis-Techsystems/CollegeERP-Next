"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CirclePlus, Clock, PencilIcon, Trash2 } from "lucide-react";
import { TimePicker } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  addTimingSet,
  getTimingSetById,
  listAcademicYearsForCollege,
  listCollegesForTimetable,
  listMasterWeekdays,
  listTimingSets,
  updateTimingSet,
} from "@/services";
import { getTimingSetContext } from "../_lib/timetable-context";
import {
  buildAddTimingSetPayload,
  buildUpdateTimingSetPayload,
  defaultTimingSlotRow,
  isEndAfterStart,
  type TimingSlotDraft,
  type WeekdayDraft,
} from "../_lib/timing-set-utils";

const TIMING_SETS_HREF = "/time-table-management/timing-sets";

function slotsFromApiRows(rows: Record<string, unknown>[]): TimingSlotDraft[] {
  if (!rows.length) return [defaultTimingSlotRow(1)];
  return rows.map((r, idx) => ({
    key: `api-${String(r.classTimingsId ?? idx)}`,
    classTimingsId: Number(r.classTimingsId) || undefined,
    name: String(r.name ?? ""),
    startTime: String(r.startTime ?? "09:00:00"),
    endTime: String(r.endTime ?? "10:00:00"),
    isBreak: r.isBreak === true,
    sortOrder: Number(r.sortOrder ?? idx + 1),
    isActive: r.isActive !== false,
  }));
}

function draftsToApiTimings(
  drafts: TimingSlotDraft[],
  collegeId: number,
): Record<string, unknown>[] {
  return drafts
    .filter((s) => s.name.trim())
    .map((s, idx) => ({
      ...(s.classTimingsId ? { classTimingsId: s.classTimingsId } : {}),
      name: s.name.trim(),
      startTime: s.startTime,
      endTime: s.endTime,
      isBreak: s.isBreak,
      sortOrder: s.sortOrder || idx + 1,
      isActive: s.isActive !== false,
      collegeId,
    }));
}

export function AddTimingSetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const timingsetIdParam = Number(searchParams.get("timingsetId") ?? 0);
  const ctx = getTimingSetContext();
  const timingsetId = timingsetIdParam || Number(ctx?.timingsetId ?? 0);
  const isEdit = timingsetId > 0;

  const [timingsetName, setTimingsetName] = useState("");
  const [collegeId, setCollegeId] = useState<number>(0);
  const [academicYearId, setAcademicYearId] = useState<number>(0);
  const [slots, setSlots] = useState<TimingSlotDraft[]>(() => [
    defaultTimingSlotRow(1),
  ]);
  const [weekdays, setWeekdays] = useState<WeekdayDraft[]>([]);
  /** Angular `timingSlots` — full object POST/PUT to addTimingSet / updateTimingsets */
  const [timingSlots, setTimingSlots] = useState<Record<string, unknown> | null>(
    null,
  );
  /** Angular `tableStructure` */
  const [tableStructure, setTableStructure] = useState(false);
  /** Angular `show` — add mode ready to save after Add clicked */
  const [showSave, setShowSave] = useState(false);
  /** Angular `weekdayHeader` — true in edit mode */
  const [weekdayHeader, setWeekdayHeader] = useState(false);
  /** Angular `TimingPanel` */
  const [timingPanelOpen, setTimingPanelOpen] = useState(!isEdit);
  /** Index into timingSlots.classWeekdays being edited */
  const [editingWeekdayIndex, setEditingWeekdayIndex] = useState<number | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  const { data: colleges = [] } = useQuery({
    queryKey: ["TimetableManagement", "colleges"],
    queryFn: listCollegesForTimetable,
  });

  const { data: masterWeekdays = [] } = useQuery({
    queryKey: QK.timetableManagement.weekdays(),
    queryFn: listMasterWeekdays,
  });

  const { data: existingSets = [] } = useQuery({
    queryKey: QK.timetableManagement.timingSets(),
    queryFn: listTimingSets,
  });

  const { data: timingSetDetail, isFetching: loadingDetail } = useQuery({
    queryKey: QK.timetableManagement.timingSetDetail(timingsetId),
    queryFn: () => getTimingSetById(timingsetId),
    enabled: isEdit,
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ["TimetableManagement", "academicYears", collegeId],
    queryFn: () => listAcademicYearsForCollege(collegeId),
    enabled: collegeId > 0,
  });

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const yearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((y) => ({
        value: String(y.academicYearId),
        label: String(y.academicYear ?? y.academicYearId),
      })),
    [academicYears],
  );

  const structureWeekdays = useMemo(() => {
    if (!timingSlots?.classWeekdays || !Array.isArray(timingSlots.classWeekdays)) {
      return [];
    }
    return timingSlots.classWeekdays as Record<string, unknown>[];
  }, [timingSlots]);

  useEffect(() => {
    if (weekdays.length > 0 || masterWeekdays.length === 0) return;
    setWeekdays(
      masterWeekdays.map((w) => ({
        weekdayId: Number(w.weekdayId ?? 0),
        name: String(w.name ?? w.weekdayName ?? ""),
        checked: false,
      })),
    );
  }, [masterWeekdays, weekdays.length]);

  useEffect(() => {
    if (!isEdit || !timingSetDetail || hydrated) return;
    setTimingsetName(String(timingSetDetail.timingsetName ?? ""));
    setCollegeId(Number(timingSetDetail.collegeId ?? 0));
    setAcademicYearId(Number(timingSetDetail.academicYearId ?? 0));
    setTimingSlots({ ...timingSetDetail });
    setTableStructure(true);
    setWeekdayHeader(true);
    setTimingPanelOpen(false);

    const apiWeekdays = Array.isArray(timingSetDetail.classWeekdays)
      ? (timingSetDetail.classWeekdays as Record<string, unknown>[])
      : [];

    setWeekdays((prev) =>
      prev.map((w) => {
        const match = apiWeekdays.find(
          (aw) => Number(aw.weekdayId) === w.weekdayId,
        );
        return match
          ? {
              ...w,
              checked: true,
              classWeekdayId: Number(match.classWeekdayId) || undefined,
              collegeId: Number(match.collegeId) || undefined,
            }
          : { ...w, checked: false };
      }),
    );
    setHydrated(true);
  }, [isEdit, timingSetDetail, hydrated]);

  const title = isEdit ? "Edit Timing Set" : "Add Timing Set";

  const validateSlots = useCallback((): boolean => {
    for (const row of slots) {
      if (!row.name.trim()) {
        toastInfo("Enter a name for each class timing.");
        return false;
      }
      if (!isEndAfterStart(row.startTime, row.endTime)) {
        toastInfo("End time must be greater than start time.");
        return false;
      }
    }
    return true;
  }, [slots]);

  /** Sync draft slots back into timingSlots.classWeekdays when editing a weekday */
  const syncEditingWeekday = useCallback(
    (drafts: TimingSlotDraft[]) => {
      if (editingWeekdayIndex == null || !timingSlots) return;
      const cws = [...(timingSlots.classWeekdays as Record<string, unknown>[])];
      const cw = { ...cws[editingWeekdayIndex] };
      cw.classTimings = draftsToApiTimings(drafts, collegeId);
      cws[editingWeekdayIndex] = cw;
      setTimingSlots({ ...timingSlots, classWeekdays: cws });
    },
    [collegeId, editingWeekdayIndex, timingSlots],
  );

  const updateSlots = useCallback(
    (updater: (prev: TimingSlotDraft[]) => TimingSlotDraft[]) => {
      setSlots((prev) => {
        const next = updater(prev);
        if (weekdayHeader && editingWeekdayIndex != null) {
          syncEditingWeekday(next);
        }
        return next;
      });
    },
    [editingWeekdayIndex, syncEditingWeekday, weekdayHeader],
  );

  /** Angular addSlot() */
  const handleAddSlot = () => {
    if (!timingsetName.trim() || !collegeId || !academicYearId) {
      toastInfo("Please Select Required Fields");
      return;
    }

    const duplicate = existingSets.some(
      (s) =>
        String(s.timingsetName ?? "").toLowerCase() ===
          timingsetName.trim().toLowerCase() &&
        Number(s.timingsetId) !== timingsetId,
    );
    if (duplicate) {
      toastInfo("Already TimingSet exists with same name.");
      return;
    }

    if (!weekdays.some((w) => w.checked)) {
      toastInfo("Select at least one weekday.");
      return;
    }

    if (!validateSlots()) return;

    const built = buildAddTimingSetPayload(
      {
        timingsetName,
        collegeId,
        academicYearId,
        isActive: true,
        reason: null,
      },
      weekdays,
      slots,
    );
    setTimingSlots(built);
    setTableStructure(true);
    setShowSave(true);
    setSlots([defaultTimingSlotRow(1)]);
  };

  /** Angular editTimings(weekday) */
  const editWeekdayTimings = (weekdayIndex: number) => {
    const cw = structureWeekdays[weekdayIndex];
    if (!cw) return;
    const apiTimings = Array.isArray(cw.classTimings)
      ? (cw.classTimings as Record<string, unknown>[])
      : [];
    setEditingWeekdayIndex(weekdayIndex);
    setTimingPanelOpen(true);
    setSlots(slotsFromApiRows(apiTimings));
    setWeekdays((prev) =>
      prev.map((w) => ({
        ...w,
        checked: Number(cw.weekdayId) === w.weekdayId,
      })),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        if (!timingSlots) throw new Error("Timing set not loaded.");
        const payload = buildUpdateTimingSetPayload(timingSlots, {
          timingsetName,
          collegeId,
          academicYearId,
        });
        return updateTimingSet(payload as Record<string, unknown>);
      }

      if (!timingSlots) {
        throw new Error("Add timings and weekdays before saving.");
      }
      return addTimingSet({
        ...timingSlots,
        timingsetName: timingsetName.trim(),
        collegeId,
        academicYearId,
      } as Record<string, unknown>);
    },
    onSuccess: () => {
      toastSuccess(isEdit ? "Timing set updated." : "Timing set saved.");
      void queryClient.invalidateQueries({
        queryKey: QK.timetableManagement.timingSets(),
      });
      router.push(TIMING_SETS_HREF);
    },
    onError: (err) => toastError(err),
  });

  const handleSave = () => {
    if (!timingsetName.trim() || !collegeId || !academicYearId) {
      toastInfo("Please fill required fields.");
      return;
    }
    if (!isEdit && !showSave) {
      toastInfo("Click Add to build the timetable structure before saving.");
      return;
    }
    saveMutation.mutate();
  };

  const addTimingRow = (afterIndex: number) => {
    const row = slots[afterIndex];
    if (!row || !isEndAfterStart(row.startTime, row.endTime)) {
      toastInfo("End time must be greater than start time.");
      return;
    }
    const nextOrder = (row.sortOrder || afterIndex + 1) + 1;
    const newRow = defaultTimingSlotRow(nextOrder);
    newRow.startTime = row.endTime;
    updateSlots((prev) => [...prev, newRow]);
  };

  /** Angular deleteTiming (add) / inActiveTiming (edit weekdayHeader) */
  const removeTimingRow = (index: number) => {
    const row = slots[index];
    if (!row) return;
    if (weekdayHeader) {
      updateSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, isActive: false } : s)),
      );
      return;
    }
    updateSlots((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <PageContainer className="space-y-4">
      <div className="app-card px-4 py-3">
        <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold leading-none text-[#5da394]">
          <Clock className="h-4 w-4 text-[#5da394]" aria-hidden />
          {title}
        </h1>
      </div>

      {loadingDetail && isEdit ? (
        <p className="text-sm text-muted-foreground px-1">
          Loading timing set…
        </p>
      ) : null}

      <div className="app-card p-4 space-y-5 text-[12px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2 sm:max-w-md">
            <Label className="text-[12px] font-medium text-slate-700">
              Timing Set Name <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9 text-[12px]"
              value={timingsetName}
              onChange={(e) => setTimingsetName(e.target.value)}
              placeholder="Timing set name"
            />
          </div>
          <Select
            label="College"
            required
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(Number(v ?? 0));
              setAcademicYearId(0);
            }}
            options={collegeOptions}
            placeholder="Select an option"
            searchable
          />
          <Select
            label="Academic Year"
            required
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(Number(v ?? 0))}
            options={yearOptions}
            placeholder="Select an option"
            disabled={!collegeId}
            searchable
          />
        </div>

        {/* Edit mode: Timetable Structure with per-weekday edit */}
        {tableStructure && weekdayHeader ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[hsl(var(--primary))]">
              Timetable Structure
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-[12px]">
                <tbody>
                  {structureWeekdays.map((wd, wi) => (
                    <tr key={String(wd.weekdayId ?? wi)} className="border-b last:border-0">
                      <td className="p-2 w-10 text-center">
                        <button
                          type="button"
                          className="p-0.5 text-blue-700"
                          title="Edit"
                          onClick={() => editWeekdayTimings(wi)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      <th className="bg-muted/40 p-2 text-left font-semibold uppercase tracking-wide w-28">
                        {String(wd.weekdayName ?? wd.name ?? "")}
                      </th>
                      {(Array.isArray(wd.classTimings)
                        ? (wd.classTimings as Record<string, unknown>[])
                        : []
                      )
                        .filter((t) => t.isActive !== false)
                        .map((t, i) => (
                          <td
                            key={`${String(wd.weekdayId)}-${i}`}
                            className={`p-2 text-center ${t.isBreak === true ? "bg-amber-50" : ""}`}
                          >
                            {String(t.name ?? "")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-amber-400 text-amber-900 hover:bg-amber-50"
                onClick={() => router.push(TIMING_SETS_HREF)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={saveMutation.isPending}
                onClick={handleSave}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Add mode: preview after Add clicked */}
        {tableStructure && !weekdayHeader ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[hsl(var(--primary))]">
              Timetable Structure
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-[12px]">
                <tbody>
                  {structureWeekdays.map((wd, wi) => (
                    <tr key={String(wd.weekdayId ?? wi)} className="border-b last:border-0">
                      <th className="bg-muted/40 p-2 text-left font-semibold uppercase tracking-wide w-28">
                        {String(wd.name ?? wd.weekdayName ?? "")}
                      </th>
                      {(Array.isArray(wd.classTimings)
                        ? (wd.classTimings as Record<string, unknown>[])
                        : []
                      ).map((t, i) => (
                        <td
                          key={`${String(wd.weekdayId)}-${i}`}
                          className={`p-2 text-center ${t.isBreak === true ? "bg-amber-50" : ""}`}
                        >
                          {String(t.name ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {timingPanelOpen ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)]">
            <div className="rounded-lg border bg-card">
              <div className="border-b bg-[hsl(var(--primary))]/10 px-3 py-2">
                <h2 className="text-sm font-semibold text-[hsl(var(--primary))]">
                  Select Weekdays
                </h2>
              </div>
              <div className="space-y-2 p-3">
                {weekdays.map((wd) => (
                  <label
                    key={wd.weekdayId}
                    className="flex items-center gap-2 text-[12px] cursor-pointer"
                  >
                    <Checkbox
                      checked={wd.checked}
                      disabled={weekdayHeader}
                      onCheckedChange={(v) =>
                        setWeekdays((prev) =>
                          prev.map((w) =>
                            w.weekdayId === wd.weekdayId
                              ? { ...w, checked: !!v }
                              : w,
                          ),
                        )
                      }
                    />
                    {wd.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border min-w-0">
              <div className="border-b bg-[hsl(var(--primary))]/10 px-3 py-2">
                <h2 className="text-sm font-semibold text-[hsl(var(--primary))]">
                  Timing
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="p-2 w-14">SI.No</th>
                      <th className="p-2 min-w-[120px]">Class Timing</th>
                      <th className="p-2 min-w-[130px]">Start Time</th>
                      <th className="p-2 min-w-[130px]">End Time</th>
                      <th className="p-2 w-20">Break</th>
                      <th className="p-2 w-24">Sort Order</th>
                      <th className="p-2 w-20">Status</th>
                      <th className="p-2 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((row, index) => (
                      <tr key={row.key} className="border-b align-top">
                        <td className="p-2 pt-3">{index + 1}</td>
                        <td className="p-2">
                          <Input
                            className="h-8 text-[12px]"
                            placeholder="Timing *"
                            value={row.name}
                            onChange={(e) =>
                              updateSlots((prev) =>
                                prev.map((s) =>
                                  s.key === row.key
                                    ? { ...s, name: e.target.value }
                                    : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <TimePicker
                            label=""
                            value={row.startTime}
                            onChange={(v) =>
                              updateSlots((prev) =>
                                prev.map((s) =>
                                  s.key === row.key
                                    ? { ...s, startTime: v }
                                    : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <TimePicker
                            label=""
                            value={row.endTime}
                            onChange={(v) =>
                              updateSlots((prev) =>
                                prev.map((s) =>
                                  s.key === row.key ? { ...s, endTime: v } : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2 pt-3">
                          <label className="inline-flex items-center gap-1.5">
                            <Checkbox
                              checked={row.isBreak}
                              onCheckedChange={(v) =>
                                updateSlots((prev) =>
                                  prev.map((s) =>
                                    s.key === row.key
                                      ? { ...s, isBreak: !!v }
                                      : s,
                                  ),
                                )
                              }
                            />
                            <span>Break</span>
                          </label>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            className="h-8 text-[12px]"
                            value={row.sortOrder}
                            onChange={(e) =>
                              updateSlots((prev) =>
                                prev.map((s) =>
                                  s.key === row.key
                                    ? {
                                        ...s,
                                        sortOrder: Number(e.target.value) || 0,
                                      }
                                    : s,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="p-2 pt-3">
                          <StatusBadge status={row.isActive} />
                        </td>
                        <td className="p-2 pt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-[hsl(var(--primary))]"
                              onClick={() => addTimingRow(index)}
                              aria-label="Add row"
                            >
                              <CirclePlus className="h-4 w-4" />
                            </Button>
                            {index > 0 ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeTimingRow(index)}
                                aria-label={
                                  weekdayHeader ? "Inactivate" : "Remove"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!weekdayHeader ? (
                <div className="border-t p-3">
                  <Button
                    type="button"
                    className="w-full sm:w-auto min-w-[120px]"
                    onClick={handleAddSlot}
                  >
                    Add
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!weekdayHeader ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-w-[120px] border-amber-400 text-amber-900 hover:bg-amber-50"
              onClick={() => router.push(TIMING_SETS_HREF)}
            >
              Back
            </Button>
            {showSave ? (
              <Button
                type="button"
                className="w-full sm:w-auto min-w-[120px]"
                disabled={saveMutation.isPending}
                onClick={handleSave}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
