"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer, Save, Users } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import { getConsolidatedStaffDiaryReport, postDetails } from "@/services";

const REPORT_TITLE = "Consolidated Staff Class Diary Report";

type PeriodSlot = {
  slot_type: string;
  subject_name: string;
  subject_code: string;
  course: string;
  batch_name: string;
  diary_notes: string;
  present_students?: number;
  total_students?: number;
  period_no: number;
};

type StaffDiaryRow = {
  fk_emp_id: number;
  first_name: string;
  class_date: string;
  comments: string;
  periods: Record<number, PeriodSlot[]>;
};

function mapPeriodSlot(item: Record<string, unknown>): PeriodSlot {
  return {
    slot_type: String(item.slot_type ?? item.slotType ?? ""),
    subject_name: String(item.subject_name ?? item.subjectName ?? ""),
    subject_code: String(item.subject_code ?? item.subjectCode ?? ""),
    course: String(item.course ?? ""),
    batch_name: String(item.batch_name ?? item.batchName ?? ""),
    diary_notes: String(item.diary_notes ?? item.diaryNotes ?? ""),
    present_students:
      item.present_students != null || item.presentStudents != null
        ? Number(item.present_students ?? item.presentStudents)
        : undefined,
    total_students:
      item.total_students != null || item.totalStudents != null
        ? Number(item.total_students ?? item.totalStudents)
        : undefined,
    period_no: Number(item.period_no ?? item.periodNo ?? 0),
  };
}

export default function ConsolidatedStaffClassDiaryReportPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const empId = loginEmployeeId;

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );
  const [staffDiaryList, setStaffDiaryList] = useState<StaffDiaryRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [savingComments, setSavingComments] = useState(false);
  const [searched, setSearched] = useState(false);

  const dateStr = useMemo(
    () => format(selectedDate ?? new Date(), "yyyy-MM-dd"),
    [selectedDate],
  );

  const handleGetClassDiary = useCallback(async () => {
    setLoadingList(true);
    setSearched(true);
    try {
      const res = await getConsolidatedStaffDiaryReport({
        fromDate: dateStr,
        toDate: dateStr,
      });

      const rawDiary = (res.result?.[0] ?? []) as Record<string, unknown>[];
      const rawComments = (res.result?.[1] ?? []) as Record<string, unknown>[];

      const userComments = rawComments.filter(
        (c) => Number(c.fk_mngt_emp_id ?? c.fkMngtEmpId ?? 0) === empId,
      );

      const map = new Map<number, StaffDiaryRow>();

      for (const item of rawDiary) {
        const empIdNum = Number(item.fk_emp_id ?? item.fkEmpId ?? 0);
        if (!empIdNum) continue;

        const classDate = String(item.class_date ?? item.classDate ?? "");

        if (!map.has(empIdNum)) {
          const commentObj = userComments.find(
            (c) =>
              Number(c.fk_staff_id ?? c.fkStaffId ?? 0) === empIdNum &&
              String(c.date_for ?? c.dateFor ?? "") === classDate,
          );

          map.set(empIdNum, {
            fk_emp_id: empIdNum,
            first_name: String(item.first_name ?? item.firstName ?? "—"),
            class_date: classDate,
            comments: commentObj ? String(commentObj.comments ?? "") : "",
            periods: {},
          });
        }

        const employee = map.get(empIdNum)!;
        const slot = mapPeriodSlot(item);
        const pNo = slot.period_no;
        if (pNo > 0) {
          if (!employee.periods[pNo]) {
            employee.periods[pNo] = [];
          }
          employee.periods[pNo].push(slot);
        }
      }

      setStaffDiaryList(Array.from(map.values()));
      if (map.size === 0) {
        toastInfo("No consolidated class diary entries found for this date.");
      }
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to load consolidated diary.");
      setStaffDiaryList([]);
    } finally {
      setLoadingList(false);
    }
  }, [dateStr, empId]);

  const handleSaveComments = useCallback(async () => {
    const payload = staffDiaryList
      .filter((emp) => emp.comments && emp.comments.trim() !== "")
      .map((emp) => ({
        managementEmployeeId: empId,
        staffEmployeeId: emp.fk_emp_id,
        dateFor: dateStr,
        comments: emp.comments.trim(),
        isActive: true,
      }));

    if (payload.length === 0) {
      toastInfo("No comments entered to save.");
      return;
    }

    setSavingComments(true);
    try {
      await postDetails("employeemanagementdiaries", payload);
      toastSuccess("Comments saved successfully!");
      void handleGetClassDiary();
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to save comments.");
    } finally {
      setSavingComments(false);
    }
  }, [staffDiaryList, empId, dateStr, handleGetClassDiary]);

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return staffDiaryList;
    const q = searchText.toLowerCase().trim();
    return staffDiaryList.filter((r) => r.first_name.toLowerCase().includes(q));
  }, [staffDiaryList, searchText]);

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      tableHeader={null}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Select Date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="Date"
            />
          </div>
          <Button
            type="button"
            className="h-9 rounded-[5px] px-4"
            disabled={loadingList}
            onClick={() => void handleGetClassDiary()}
          >
            {loadingList ? "Loading…" : "Get Class Diary"}
          </Button>
        </div>
      }
      resultsVisible={searched}
      loading={loadingList}
      bodyClassName="overflow-hidden p-0"
      body={
        searched && staffDiaryList.length > 0 ? (
          <ConsolidatedDiaryResults
            rows={filteredRows}
            searchText={searchText}
            onSearchChange={setSearchText}
            savingComments={savingComments}
            onSaveComments={() => void handleSaveComments()}
            onCommentsChange={(empIdValue, comments) => {
              setStaffDiaryList((prev) =>
                prev.map((r) =>
                  r.fk_emp_id === empIdValue ? { ...r, comments } : r,
                ),
              );
            }}
          />
        ) : searched && !loadingList ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No consolidated class diary entries found.
          </div>
        ) : null
      }
    />
  );
}

function ConsolidatedDiaryResults({
  rows,
  searchText,
  onSearchChange,
  savingComments,
  onSaveComments,
  onCommentsChange,
}: {
  rows: StaffDiaryRow[];
  searchText: string;
  onSearchChange: (value: string) => void;
  savingComments: boolean;
  onSaveComments: () => void;
  onCommentsChange: (empId: number, comments: string) => void;
}) {
  return (
    <div className="overflow-hidden bg-white">
      <div className="border-b border-[#c3d9ff] bg-white px-4 py-2.5">
        <div className="table-context-header !mb-0">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            book
          </span>
          <strong className="table-context-header__title">
            {REPORT_TITLE}
          </strong>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] px-4 py-3">
        <label className="relative min-w-[220px] flex-1 max-w-sm">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full border-0 border-b border-[#777] bg-transparent pb-1 text-[13px] text-slate-800 outline-none placeholder:text-slate-500 focus:border-[#337ab7]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-[5px] bg-[#042956] px-4 text-[12px] text-white hover:bg-[#031f42]"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-[5px] bg-[#042956] px-4 text-[12px] text-white hover:bg-[#031f42]"
            disabled={savingComments}
            onClick={onSaveComments}
          >
            <Save className="h-4 w-4" />
            {savingComments ? "Saving…" : "Save Comments"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#d9edf7] text-[#0b4f8a]">
              <th className="w-12 border border-[#c5d6e0] px-2 py-2.5 text-center font-semibold">
                S.No
              </th>
              <th className="min-w-[120px] border border-[#c5d6e0] px-2 py-2.5 text-left font-semibold">
                Name
              </th>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <th
                  key={p}
                  className="min-w-[150px] border border-[#c5d6e0] px-2 py-2.5 text-center font-semibold"
                >
                  Period {p}
                </th>
              ))}
              <th className="min-w-[180px] border border-[#c5d6e0] px-2 py-2.5 text-left font-semibold">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((emp, idx) => (
              <tr key={emp.fk_emp_id} className="align-top bg-white">
                <td className="border border-[#ddd] px-2 py-2 text-center font-medium text-slate-800">
                  {idx + 1}
                </td>
                <td className="border border-[#ddd] px-2 py-2 font-medium text-slate-900">
                  {emp.first_name}
                </td>

                {[1, 2, 3, 4, 5, 6].map((pNo) => {
                  const slots = emp.periods[pNo] ?? [];
                  return (
                    <td
                      key={pNo}
                      className="border border-[#ddd] px-1.5 py-1.5 align-top"
                    >
                      {slots.map((slot, sIdx) => (
                        <ConsolidatedDiarySlotCard key={sIdx} slot={slot} />
                      ))}
                    </td>
                  );
                })}

                <td className="border border-[#ddd] px-2 py-2">
                  <Textarea
                    rows={4}
                    value={emp.comments}
                    onChange={(e) =>
                      onCommentsChange(emp.fk_emp_id, e.target.value)
                    }
                    placeholder="Enter comments"
                    className="min-h-[88px] resize-y rounded-[3px] border-[#ccc] bg-white text-[12px] shadow-none focus-visible:ring-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsolidatedDiarySlotCard({ slot }: { slot: PeriodSlot }) {
  const type = slot.slot_type.toUpperCase();
  const isClass = type === "CLASS";
  const isLunch = type === "LUNCH";
  const label = isClass ? "CLASS" : isLunch ? "LUNCH" : type || "EMPTY";

  const headerClass = isClass
    ? "bg-[#dff0d8] text-[#3c763d]"
    : isLunch
      ? "bg-[#fdebd0] text-[#b8741a]"
      : "bg-[#eceeef] text-[#555]";

  const present = slot.present_students ?? 0;
  const total = slot.total_students ?? 0;
  const attendance =
    slot.total_students != null ? `${present}/${total}` : "0/0";

  return (
    <div className="mb-2 overflow-hidden rounded-[4px] border border-[#ddd] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] last:mb-0">
      <div
        className={`py-1 text-center text-[11px] font-bold uppercase tracking-wide ${headerClass}`}
      >
        {label}
      </div>
      <div className="px-2 py-2 text-center">
        {isClass ? (
          <>
            <div className="text-[13px] font-bold uppercase leading-tight text-slate-900">
              {slot.subject_name || "—"}
            </div>
            {slot.subject_code ? (
              <div className="mt-0.5 text-[11px] text-slate-700">
                {slot.subject_code}
              </div>
            ) : null}
            {slot.course ? (
              <div className="text-[11px] text-slate-700">{slot.course}</div>
            ) : null}
            {slot.batch_name ? (
              <div className="text-[11px] text-slate-700">
                {slot.batch_name}
              </div>
            ) : null}
          </>
        ) : null}
        <div className="mt-2 flex items-center justify-center gap-1 text-[#337ab7]">
          <Users className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="text-[12px] font-semibold">{attendance}</span>
        </div>
      </div>
    </div>
  );
}
