"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Quote,
  UtensilsCrossed,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, type SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { FormModal } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  buildStaffClassDiaryPrintHtml,
  employeePrintName,
} from "../_lib/staff-class-diary-print";
import { staffDiaryEmployeeSelectOption } from "../_lib/staff-class-diary-employees";
import {
  getStaffClassDiaryReport,
  listEmployeesForStaffClassDiaryReport,
  saveEmployeeManagementDiaryComments,
  searchEmployeesForManagerAssign,
} from "@/services";

const REPORT_TITLE = "Staff Class Diary Report";
const PRIMARY_ACTION_BTN =
  "h-9 shrink-0 rounded-[5px] bg-[#042956] px-4 text-[13px] text-white hover:bg-[#031f42]";

type PeriodItem = {
  periodNo: number;
  classDate: string;
  startTime: string;
  endTime: string;
  slotType: string;
  subjectCode: string;
  subjectName: string;
  course: string;
  roomName: string;
  batchName: string;
  diaryNotes: string | null;
  pkTimetableScheduleId: number;
};

type DayGroup = {
  classDate: string;
  weekDay: string;
  periods: PeriodItem[];
};

type CommentItem = {
  date_for?: string;
  dateFor?: string;
  comments?: string;
  fk_staff_id?: number;
  fkStaffId?: number;
  fk_mngt_emp_id?: number;
  fkMngtEmpId?: number;
  is_active?: boolean;
  isActive?: boolean;
  [key: string]: unknown;
};

function commentDateKey(c: CommentItem): string {
  const raw = c.date_for ?? c.dateFor;
  if (raw == null) return "";
  return String(raw).slice(0, 10);
}

function isCommentActive(c: CommentItem): boolean {
  return c.is_active !== false && c.isActive !== false;
}

export default function StaffClassDiaryReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const empId = loginEmployeeId;

  const activeCollegeId = useMemo(() => {
    if (user?.collegeId) return Number(user.collegeId);
    if (typeof window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("collegeId") ?? 0);
  }, [user?.collegeId]);

  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearchOptions, setEmployeeSearchOptions] = useState<
    SelectOption[]
  >([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );
  const [weekDaysList, setWeekDaysList] = useState<DayGroup[]>([]);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedTab, setSelectedTab] = useState("0");
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ["staffClassDiaryEmployees", activeCollegeId],
    queryFn: () => listEmployeesForStaffClassDiaryReport(activeCollegeId),
    enabled: activeCollegeId > 0,
  });

  const rawEmployees = useMemo(
    () => (Array.isArray(employeesQuery.data) ? employeesQuery.data : []),
    [employeesQuery.data],
  );

  const collegeName = useMemo(() => {
    if (user?.collegeName) return user.collegeName;
    if (typeof window === "undefined") return "";
    return (
      globalThis.localStorage.getItem("collegeName") ??
      globalThis.localStorage.getItem("currentCollege") ??
      ""
    );
  }, [user?.collegeName]);

  const employeeOptions = useMemo(() => {
    const byValue = new Map<string, SelectOption>();
    for (const opt of employeeSearchOptions) {
      byValue.set(opt.value, opt);
    }
    // Keep the selected employee visible after the dropdown closes.
    if (employeeId && !byValue.has(employeeId)) {
      const row = rawEmployees.find(
        (r) =>
          String(r.employeeId ?? r.employee_id ?? r.fk_emp_id ?? r.id ?? "") ===
          employeeId,
      );
      if (row) {
        byValue.set(employeeId, staffDiaryEmployeeSelectOption(row));
      }
    }
    return Array.from(byValue.values());
  }, [employeeSearchOptions, employeeId, rawEmployees]);

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 3) {
      setEmployeeSearchOptions([]);
      return;
    }
    setEmployeeSearchLoading(true);
    try {
      const list = await searchEmployeesForManagerAssign(q);
      setEmployeeSearchOptions(
        list.map((r) => staffDiaryEmployeeSelectOption(r)),
      );
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to search employees");
      setEmployeeSearchOptions([]);
    } finally {
      setEmployeeSearchLoading(false);
    }
  }, []);

  const weekRange = useMemo(() => {
    const d = selectedDate ?? new Date();
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      fromDate: format(start, "yyyy-MM-dd"),
      toDate: format(end, "yyyy-MM-dd"),
    };
  }, [selectedDate]);

  const handleGetClassDiary = useCallback(async () => {
    if (!employeeId) {
      toastInfo("Please select an employee.");
      return;
    }
    setLoadingList(true);
    setSearched(true);
    try {
      const res = await getStaffClassDiaryReport({
        employeeId: Number(employeeId),
        fromDate: weekRange.fromDate,
        toDate: weekRange.toDate,
      });

      const rawDiary = (res.result?.[0] ?? []) as Record<string, unknown>[];
      const rawComments = (res.result?.[1] ?? []) as CommentItem[];

      setCommentsList(
        rawComments.filter(
          (c) =>
            Number(c.fk_staff_id ?? c.fkStaffId) === Number(employeeId) &&
            Number(c.fk_mngt_emp_id ?? c.fkMngtEmpId) === empId,
        ),
      );

      const grouped: Record<string, DayGroup> = {};
      for (const item of rawDiary) {
        const cDate = String(item.class_date ?? item.classDate ?? "");
        if (!cDate) continue;
        if (!grouped[cDate]) {
          grouped[cDate] = {
            classDate: cDate,
            weekDay: format(new Date(cDate), "EEEE"),
            periods: [],
          };
        }
        grouped[cDate].periods.push({
          periodNo: Number(item.period_no ?? item.periodNo ?? 0),
          classDate: cDate,
          startTime: String(item.start_time ?? item.startTime ?? ""),
          endTime: String(item.end_time ?? item.endTime ?? ""),
          slotType: String(item.slot_type ?? item.slotType ?? ""),
          subjectCode: String(item.subject_code ?? item.subjectCode ?? ""),
          subjectName: String(item.subject_name ?? item.subjectName ?? ""),
          course: String(item.course ?? ""),
          roomName: String(item.room_name ?? item.roomName ?? ""),
          batchName: String(item.batch_name ?? item.batchName ?? ""),
          diaryNotes:
            item.diary_notes != null || item.diaryNotes != null
              ? String(item.diary_notes ?? item.diaryNotes)
              : null,
          pkTimetableScheduleId: Number(
            item.pk_timetable_schedule_id ?? item.pkTimetableScheduleId ?? 0,
          ),
        });
      }

      for (const day of Object.values(grouped)) {
        day.periods = sortDiaryPeriods(day.periods);
      }

      setWeekDaysList(
        Object.values(grouped).sort((a, b) =>
          a.classDate.localeCompare(b.classDate),
        ),
      );
      setSelectedTab("0");
      if (rawDiary.length === 0) {
        toastInfo("No class diary records found for selected week.");
      }
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to load class diary.");
      setWeekDaysList([]);
    } finally {
      setLoadingList(false);
    }
  }, [employeeId, weekRange, empId]);

  const goBack = useCallback(() => {
    const catalog = searchParams.get("path");
    if (catalog) {
      router.push(resolveReportCatalogHref(catalog));
      return;
    }
    router.back();
  }, [router, searchParams]);

  const selectedDayIndex = Number(selectedTab) || 0;
  const selectedDay = weekDaysList[selectedDayIndex] ?? null;
  const selectedDayComment = useMemo(() => {
    if (!selectedDay) return undefined;
    return commentsList.find(
      (c) => commentDateKey(c) === selectedDay.classDate && isCommentActive(c),
    );
  }, [commentsList, selectedDay]);

  const openCommentModal = useCallback(() => {
    setCommentDraft(String(selectedDayComment?.comments ?? ""));
    setCommentModalOpen(true);
  }, [selectedDayComment]);

  const handleSaveComment = useCallback(async () => {
    if (!employeeId || !selectedDay || !empId) return;
    const text = commentDraft.trim();
    if (!text) {
      toastInfo("Please enter comments.");
      return;
    }
    setSavingComment(true);
    try {
      await saveEmployeeManagementDiaryComments([
        {
          managementEmployeeId: empId,
          staffEmployeeId: Number(employeeId),
          dateFor: selectedDay.classDate,
          comments: text,
          isActive: true,
        },
      ]);
      toastSuccess("Comments saved successfully!");
      setCommentModalOpen(false);
      setCommentsList((prev) => {
        const rest = prev.filter(
          (c) => commentDateKey(c) !== selectedDay.classDate,
        );
        return [
          ...rest,
          {
            date_for: selectedDay.classDate,
            comments: text,
            fk_staff_id: Number(employeeId),
            fk_mngt_emp_id: empId,
            is_active: true,
          },
        ];
      });
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to save comments.");
    } finally {
      setSavingComment(false);
    }
  }, [commentDraft, employeeId, empId, selectedDay]);

  const selectedPeriods = useMemo(
    () => (selectedDay ? sortDiaryPeriods(selectedDay.periods) : []),
    [selectedDay],
  );

  const goToPrevDay = () => {
    setSelectedTab(String(Math.max(0, selectedDayIndex - 1)));
  };

  const goToNextDay = () => {
    setSelectedTab(
      String(Math.min(weekDaysList.length - 1, selectedDayIndex + 1)),
    );
  };

  const handlePrint = useCallback(() => {
    if (!weekDaysList.length) {
      toastInfo("No class diary records to print.");
      return;
    }
    const label =
      employeeOptions.find((e) => e.value === employeeId)?.label ?? "";
    const weekStart = startOfWeek(selectedDate ?? new Date(), {
      weekStartsOn: 1,
    });
    printHtmlInIframe(
      buildStaffClassDiaryPrintHtml({
        collegeName,
        employeeName: employeePrintName(label),
        weekStart,
        days: weekDaysList.map((day) => ({
          classDate: day.classDate,
          weekDay: day.weekDay,
          periods: day.periods.map((period) => ({
            periodNo: period.periodNo,
            slotType: period.slotType,
            subjectName: period.subjectName,
            subjectCode: period.subjectCode,
          })),
        })),
      }),
    );
  }, [weekDaysList, employeeOptions, employeeId, selectedDate, collegeName]);

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      tableHeader={null}
      filters={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:items-end">
          <Select
            label="Employee"
            required
            value={employeeId}
            onChange={(v) => setEmployeeId(v ?? "")}
            options={employeeOptions}
            placeholder="Search..."
            searchable
            onSearch={onEmployeeSearch}
            isLoading={employeeSearchLoading}
            listClassName="max-h-[400px] divide-y divide-[#9e9e9e52]"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Select Week
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="Date"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={PRIMARY_ACTION_BTN}
              disabled={loadingList || !employeeId}
              onClick={() => void handleGetClassDiary()}
            >
              {loadingList ? "Loading…" : "Get Class Diary"}
            </Button>
            <Button
              type="button"
              className="h-9 min-w-20 !rounded-[5px] !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      resultsVisible={searched}
      loading={loadingList}
      body={
        searched && weekDaysList.length > 0 && selectedDay ? (
          <div className="space-y-0">
            <StaffDiaryWeekTabs
              days={weekDaysList}
              selectedIndex={selectedDayIndex}
              onSelect={(idx) => setSelectedTab(String(idx))}
              onPrev={goToPrevDay}
              onNext={goToNextDay}
            />

            <div className="mt-4 space-y-3">
              {selectedPeriods.map((period) => (
                <StaffDiaryPeriodCard
                  key={`${period.classDate}-${period.periodNo}-${period.startTime}-${period.slotType}`}
                  period={period}
                />
              ))}
            </div>

            <StaffDiaryComments
              comment={selectedDayComment}
              onAddComments={openCommentModal}
            />

            <FormModal
              open={commentModalOpen}
              onClose={() => {
                if (!savingComment) setCommentModalOpen(false);
              }}
              title={
                selectedDayComment?.comments ? "Edit Comments" : "Add Comments"
              }
              submitLabel="Save"
              cancelLabel="Close"
              isSubmitting={savingComment}
              showHeaderDivider
              titleClassName="text-[#0c51a4] font-semibold"
              contentClassName="sm:max-w-md"
              onSubmit={() => void handleSaveComment()}
            >
              <div className="space-y-1">
                <Label
                  htmlFor="staff-diary-comment"
                  className="text-[13px] font-medium text-destructive"
                >
                  {selectedDayComment?.comments
                    ? "Edit Comments"
                    : "Add Comments"}{" "}
                  *
                </Label>
                <Textarea
                  id="staff-diary-comment"
                  rows={5}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="min-h-[120px] resize-y rounded-none border-0 border-b border-destructive bg-transparent px-0 shadow-none focus-visible:ring-0"
                  placeholder=""
                />
              </div>
            </FormModal>

            <div className="mt-6 flex justify-end print:hidden">
              <Button
                type="button"
                className="h-9 min-w-[5.5rem] rounded-[5px] bg-[#042956] px-6 text-[13px] text-white shadow-sm hover:bg-[#031f42]"
                onClick={handlePrint}
              >
                Print
              </Button>
            </div>
          </div>
        ) : searched && !loadingList ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No class diary entries found.
          </div>
        ) : null
      }
    />
  );
}

function timeToMinutes(value: string): number {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return 0;
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

/** Angular order: periods 1–3, lunch, then periods 4–6 (by start time). */
function sortDiaryPeriods(periods: PeriodItem[]): PeriodItem[] {
  return [...periods].sort((a, b) => {
    const byTime = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (byTime !== 0) return byTime;
    const aLunch = a.slotType.toUpperCase() === "LUNCH";
    const bLunch = b.slotType.toUpperCase() === "LUNCH";
    if (aLunch !== bLunch) return aLunch ? 1 : -1;
    return a.periodNo - b.periodNo;
  });
}

function slotStyles(slotType: string) {
  const type = slotType.toUpperCase();
  if (type === "CLASS") {
    return {
      rail: "border-l-[#5cb85c] bg-[#edf7ed]",
      badge: "bg-[#dff0d8] text-[#3c763d]",
    };
  }
  if (type === "LUNCH") {
    return {
      rail: "border-l-[#f0ad4e] bg-[#fff6ea]",
      badge: "bg-[#fdebd0] text-[#b8741a]",
    };
  }
  return {
    rail: "border-l-[#5bc0de] bg-[#edf6fb]",
    badge: "bg-[#d9edf7] text-[#31708f]",
  };
}

function StaffDiaryWeekTabs({
  days,
  selectedIndex,
  onSelect,
  onPrev,
  onNext,
}: {
  days: DayGroup[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded border border-[#ddd] bg-white">
      <button
        type="button"
        className="flex w-10 shrink-0 items-center justify-center border-r border-[#ddd] bg-[#f5f5f5] text-slate-600 hover:bg-[#ececec] disabled:opacity-40"
        onClick={onPrev}
        disabled={selectedIndex <= 0}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex flex-1 overflow-x-auto">
        {days.map((day, idx) => {
          const active = idx === selectedIndex;
          return (
            <button
              key={day.classDate}
              type="button"
              onClick={() => onSelect(idx)}
              className={`min-w-[9.5rem] shrink-0 border-r border-[#ddd] px-4 py-2.5 text-center text-[13px] font-medium transition-colors last:border-r-0 ${
                active
                  ? "border-t-[3px] border-t-[#0c51a4] bg-[#ffcf46] text-slate-900"
                  : "border-t-[3px] border-t-transparent bg-white text-slate-700 hover:bg-[#fafafa]"
              }`}
            >
              {day.weekDay} ({format(new Date(day.classDate), "dd-MM-yyyy")})
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="flex w-10 shrink-0 items-center justify-center border-l border-[#ddd] bg-[#f5f5f5] text-slate-600 hover:bg-[#ececec] disabled:opacity-40"
        onClick={onNext}
        disabled={selectedIndex >= days.length - 1}
        aria-label="Next day"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function StaffDiaryPeriodCard({ period }: { period: PeriodItem }) {
  const slotType = period.slotType.toUpperCase();
  const styles = slotStyles(slotType);
  const isClass = slotType === "CLASS";
  const isEmpty = slotType === "EMPTY";
  const isLunch = slotType === "LUNCH";
  const title = isLunch ? "Lunch" : `Period ${period.periodNo || "—"}`;

  return (
    <div className="flex overflow-hidden rounded border border-[#ddd] bg-white shadow-sm">
      <div
        className={`flex w-[150px] shrink-0 flex-col justify-center border-l-[5px] px-4 py-5 ${styles.rail}`}
      >
        <div className="text-[15px] font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-[12px] text-slate-600">
          {period.startTime} - {period.endTime}
        </div>
        <span
          className={`mt-3 inline-flex w-fit rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase ${styles.badge}`}
        >
          {slotType}
        </span>
      </div>

      <div className="flex min-h-[110px] flex-1 items-center px-6 py-4">
        {isEmpty ? (
          <div className="flex w-full items-center gap-4 text-slate-600">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d9edf7] text-[#31708f]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-slate-800">
                No Class Scheduled
              </p>
              <p className="text-[12px] text-slate-500">
                Click Class Diary after class starts.
              </p>
            </div>
          </div>
        ) : isLunch ? (
          <div className="flex w-full flex-col items-center justify-center py-4">
            <UtensilsCrossed
              className="h-8 w-8 text-slate-900"
              strokeWidth={1.75}
            />
            <p className="mt-2 text-[14px] font-medium text-slate-900">
              Lunch Break
            </p>
          </div>
        ) : isClass || period.diaryNotes ? (
          <div className="w-full">
            <h4 className="text-[14px] font-bold uppercase tracking-wide text-slate-900">
              {period.subjectName}
              {period.subjectCode ? ` (${period.subjectCode})` : ""}
            </h4>
            <p className="mt-0.5 text-[12px] font-medium text-slate-600">
              {period.course}
              {period.batchName ? ` - ${period.batchName}` : ""}
            </p>
            <div className="mt-3 rounded border border-dashed border-[#ccc] bg-[#fafafa] px-4 py-3 text-[13px] text-slate-600">
              {period.diaryNotes?.trim()
                ? period.diaryNotes
                : "No Class Diary Added"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StaffDiaryComments({
  comment,
  onAddComments,
}: {
  comment?: CommentItem;
  onAddComments: () => void;
}) {
  const hasComment = Boolean(comment?.comments?.trim());

  return (
    <div className="mt-5 overflow-hidden rounded border border-[#ddd] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee] border-l-[5px] border-l-[#5bc0de] bg-[#edf6fb] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <MessageSquare className="h-4 w-4 text-[#31708f]" />
            Comments
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            Add any additional comments for the day.
          </p>
        </div>
        {hasComment ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-[5px] border-[#ccc] bg-white px-3 text-[12px] text-slate-800 shadow-sm hover:bg-[#f9f9f9]"
            onClick={onAddComments}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5 text-[#337ab7]" />
            Edit Comment
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-[5px] bg-[#337ab7] px-3 text-[12px] text-white hover:bg-[#286090]"
            onClick={onAddComments}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Comments
          </Button>
        )}
      </div>
      <div className="p-4">
        {hasComment ? (
          <div className="flex gap-3 rounded border border-dashed border-[#ccc] bg-[#fafafa] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5bc0de]">
              <Quote className="h-4 w-4 fill-white text-white" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Comment
              </p>
              <p className="mt-0.5 text-[13px] text-slate-700">
                {comment?.comments}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[88px] flex-col items-center justify-center rounded border border-dashed border-[#ccc] bg-[#fafafa] px-4 py-6 text-center">
            <MessageSquare className="mb-2 h-5 w-5 text-[#999]" />
            <p className="text-[13px] text-slate-500">
              No comments added for this day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
