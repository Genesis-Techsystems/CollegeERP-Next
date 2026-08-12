"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Printer, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { resolveOrganizationId } from "@/lib/user-context";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  distinctColleges,
  toSelectOptions,
} from "../_lib/timetable-report-filters";
import {
  fetchTimetableFilterRows,
  getConsolidatedStaffDiaryReport,
  postDetails,
} from "@/services";

const REPORT_TITLE = "Consolidated Staff Class Diary Report";

type PeriodSlot = {
  slot_type?: string;
  subject_name?: string;
  subject_code?: string;
  course?: string;
  batch_name?: string;
  diary_notes?: string;
  present_students?: number;
  total_students?: number;
  period_no?: number;
  [key: string]: unknown;
};

type StaffDiaryRow = {
  fk_emp_id: number;
  first_name: string;
  class_date: string;
  comments: string;
  periods: Record<number, PeriodSlot[]>;
};

export default function ConsolidatedStaffClassDiaryReportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isPrincipal = useMemo(() => {
    if (pathname.includes("staff-reports") || pathname.includes("principal")) {
      return true;
    }
    if (!mounted) return false;
    if (user?.isPrincipal) return true;
    if (
      user?.userRole?.toUpperCase().includes("PRINCIPAL") ||
      user?.roleName?.toUpperCase().includes("PRINCIPAL") ||
      user?.userTypeCode?.toUpperCase().includes("PRINCIPAL")
    ) {
      return true;
    }
    if (typeof window === "undefined") return false;
    const storage = globalThis.localStorage;
    const isPStorage =
      storage.getItem("isPRINCIPAL") === "true" ||
      storage.getItem("isPrincipal") === "true";
    const roleName = String(storage.getItem("roleName") ?? "").toUpperCase();
    const userRole = String(storage.getItem("userRole") ?? "").toUpperCase();
    const userTypeCode = String(
      storage.getItem("userTypeCode") ?? "",
    ).toUpperCase();
    const isAdminStorage = storage.getItem("isAdmin") === "true";

    if (
      isPStorage ||
      roleName.includes("PRINCIPAL") ||
      userRole.includes("PRINCIPAL") ||
      userTypeCode.includes("PRIN")
    ) {
      return true;
    }
    if (
      !user?.isAdmin &&
      !isAdminStorage &&
      (userTypeCode === "STAFF" || userRole === "STAFF")
    ) {
      return true;
    }
    return false;
  }, [
    mounted,
    pathname,
    user?.isPrincipal,
    user?.userRole,
    user?.roleName,
    user?.userTypeCode,
    user?.isAdmin,
  ]);

  const empId = loginEmployeeId;

  const [collegeId, setCollegeId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );
  const [staffDiaryList, setStaffDiaryList] = useState<StaffDiaryRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [savingComments, setSavingComments] = useState(false);
  const [searched, setSearched] = useState(false);

  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const colleges = useMemo(() => distinctColleges(filterRows), [filterRows]);
  const collegeOptions = useMemo(
    () =>
      toSelectOptions(
        colleges,
        ["fk_college_id", "collegeId"],
        ["college_code", "collegeCode"],
      ),
    [colleges],
  );

  useEffect(() => {
    if (!collegeId && collegeOptions.length > 0) {
      setCollegeId(collegeOptions[0].value);
    }
  }, [collegeOptions, collegeId]);

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
        (c) => Number(c.fk_mngt_emp_id) === empId,
      );

      const map = new Map<number, StaffDiaryRow>();

      for (const item of rawDiary) {
        const empIdNum = Number(item.fk_emp_id ?? 0);
        if (!empIdNum) continue;

        if (!map.has(empIdNum)) {
          const commentObj = userComments.find(
            (c) =>
              Number(c.fk_staff_id) === empIdNum &&
              String(c.date_for ?? "") === String(item.class_date ?? ""),
          );

          map.set(empIdNum, {
            fk_emp_id: empIdNum,
            first_name: String(item.first_name ?? item.firstName ?? "—"),
            class_date: String(item.class_date ?? ""),
            comments: commentObj ? String(commentObj.comments ?? "") : "",
            periods: {},
          });
        }

        const employee = map.get(empIdNum)!;
        const pNo = Number(item.period_no ?? 0);
        if (pNo > 0) {
          if (!employee.periods[pNo]) {
            employee.periods[pNo] = [];
          }
          employee.periods[pNo].push(item as PeriodSlot);
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
    return staffDiaryList.filter(
      (r) =>
        r.first_name.toLowerCase().includes(q) ||
        r.comments.toLowerCase().includes(q),
    );
  }, [staffDiaryList, searchText]);

  const goBack = useCallback(() => {
    const catalog = searchParams.get("path");
    if (catalog) {
      router.push(resolveReportCatalogHref(catalog));
      return;
    }
    router.back();
  }, [router, searchParams]);

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      filters={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          {!isPrincipal && (
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => setCollegeId(v ?? "")}
              options={collegeOptions}
              placeholder="Select College"
              searchable
              isLoading={filtersQuery.isLoading}
            />
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Select Date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetClassDiary()}
            >
              {loadingList ? "Loading…" : "Get Class Diary"}
            </Button>
            {!isPrincipal && (
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-fit px-4"
                onClick={goBack}
              >
                Back
              </Button>
            )}
          </div>
        </div>
      }
      showTable={false}
      loading={loadingList}
      body={
        searched && staffDiaryList.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Input
                placeholder="Search employee or comment..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="max-w-xs h-9 text-xs"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={savingComments}
                  onClick={() => void handleSaveComments()}
                >
                  <Save className="h-4 w-4" />
                  {savingComments ? "Saving…" : "Save Comments"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2 border-r border-slate-200 w-12 text-center">
                      S.No
                    </th>
                    <th className="p-2 border-r border-slate-200 min-w-[140px]">
                      Name
                    </th>
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <th
                        key={p}
                        className="p-2 border-r border-slate-200 min-w-[160px] text-center"
                      >
                        Period {p}
                      </th>
                    ))}
                    <th className="p-2 min-w-[200px]">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((emp, idx) => (
                    <tr key={emp.fk_emp_id} className="hover:bg-slate-50/80">
                      <td className="p-2 border-r border-slate-200 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                        {emp.first_name}
                      </td>

                      {[1, 2, 3, 4, 5, 6].map((pNo) => {
                        const slots = emp.periods[pNo];
                        if (!slots || slots.length === 0) {
                          return (
                            <td
                              key={pNo}
                              className="p-2 border-r border-slate-200 text-center text-slate-400"
                            >
                              —
                            </td>
                          );
                        }
                        return (
                          <td
                            key={pNo}
                            className="p-2 border-r border-slate-200 space-y-2"
                          >
                            {slots.map((slot, sIdx) => (
                              <div
                                key={sIdx}
                                className={`rounded border p-2 text-[11px] ${
                                  slot.slot_type === "CLASS"
                                    ? "border-blue-200 bg-blue-50/50"
                                    : slot.slot_type === "LUNCH"
                                      ? "border-amber-200 bg-amber-50/50"
                                      : "border-slate-200 bg-slate-50"
                                }`}
                              >
                                <span className="font-bold text-slate-800 block">
                                  {slot.subject_name || slot.slot_type}
                                </span>
                                {slot.subject_code ? (
                                  <span className="text-[10px] text-slate-500 block">
                                    ({slot.subject_code})
                                  </span>
                                ) : null}
                                {slot.course ? (
                                  <span className="text-[10px] text-slate-600 block">
                                    {slot.course}{" "}
                                    {slot.batch_name
                                      ? `• ${slot.batch_name}`
                                      : ""}
                                  </span>
                                ) : null}
                                {slot.diary_notes ? (
                                  <p className="mt-1 text-slate-700 italic border-t pt-1">
                                    {slot.diary_notes}
                                  </p>
                                ) : null}
                                {slot.total_students != null ? (
                                  <span className="mt-1 block text-[10px] font-medium text-blue-700">
                                    Attendance: {slot.present_students ?? 0}/
                                    {slot.total_students}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </td>
                        );
                      })}

                      <td className="p-2">
                        <Textarea
                          rows={3}
                          value={emp.comments}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStaffDiaryList((prev) =>
                              prev.map((r) =>
                                r.fk_emp_id === emp.fk_emp_id
                                  ? { ...r, comments: val }
                                  : r,
                              ),
                            );
                          }}
                          placeholder="Enter comments..."
                          className="text-xs min-h-[60px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={savingComments}
                onClick={() => void handleSaveComments()}
              >
                <Save className="h-4 w-4" />
                {savingComments ? "Saving…" : "Save Comments"}
              </Button>
            </div>
          </div>
        ) : searched && !loadingList ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No consolidated class diary entries found.
          </div>
        ) : null
      }
    />
  );
}
