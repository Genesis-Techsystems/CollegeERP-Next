"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Printer, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { resolveOrganizationId } from "@/lib/user-context";
import { toastError, toastInfo } from "@/lib/toast";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  distinctColleges,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";
import {
  fetchTimetableFilterRows,
  getAttendanceCollegeDeptFilters,
  getStaffClassDiaryReport,
  listEmployeesForStaffClassDiaryReport,
} from "@/services";

const REPORT_TITLE = "Staff Class Diary Report";

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
  comments?: string;
  fk_staff_id?: number;
  fk_mngt_emp_id?: number;
  is_active?: boolean;
  [key: string]: unknown;
};

export default function StaffClassDiaryReportPage() {
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

  const orgId = resolveOrganizationId(user);
  const empId = loginEmployeeId;

  const [collegeId, setCollegeId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date(),
  );
  const [weekDaysList, setWeekDaysList] = useState<DayGroup[]>([]);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedTab, setSelectedTab] = useState("0");

  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const activeCollegeId = Number(collegeId || user?.collegeId || 0);

  const employeesQuery = useQuery({
    queryKey: ["staffClassDiaryEmployees", activeCollegeId],
    queryFn: () => listEmployeesForStaffClassDiaryReport(activeCollegeId),
    enabled: activeCollegeId > 0,
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const rawEmployees = useMemo(
    () => (Array.isArray(employeesQuery.data) ? employeesQuery.data : []),
    [employeesQuery.data],
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

  const employeeOptions = useMemo(() => {
    if (!rawEmployees.length) return [];
    const empMap = new Map<number, string>();
    for (const r of rawEmployees) {
      const catId = Number(r.empCategoryId ?? r.emp_category_id ?? 18);
      if (catId !== 18) continue;
      const eId = Number(
        r.employeeId ?? r.employee_id ?? r.fk_emp_id ?? r.id ?? 0,
      );
      const name = txt(
        r.firstName ?? r.employee_name ?? r.employeeName ?? r.empName,
      );
      const empNum = txt(r.empNumber ?? r.emp_number);
      if (eId > 0 && name) {
        const label = empNum ? `${name} (${empNum})` : name;
        empMap.set(eId, label);
      }
    }
    return Array.from(empMap.entries()).map(([value, label]) => ({
      value: String(value),
      label,
    }));
  }, [rawEmployees]);

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
            Number(c.fk_staff_id) === Number(employeeId) &&
            Number(c.fk_mngt_emp_id) === empId,
        ),
      );

      const grouped: Record<string, DayGroup> = {};
      for (const item of rawDiary) {
        const cDate = String(item.class_date ?? "");
        if (!cDate) continue;
        if (!grouped[cDate]) {
          grouped[cDate] = {
            classDate: cDate,
            weekDay: format(new Date(cDate), "EEEE"),
            periods: [],
          };
        }
        grouped[cDate].periods.push({
          periodNo: Number(item.period_no ?? 0),
          classDate: cDate,
          startTime: String(item.start_time ?? ""),
          endTime: String(item.end_time ?? ""),
          slotType: String(item.slot_type ?? ""),
          subjectCode: String(item.subject_code ?? ""),
          subjectName: String(item.subject_name ?? ""),
          course: String(item.course ?? ""),
          roomName: String(item.room_name ?? ""),
          batchName: String(item.batch_name ?? ""),
          diaryNotes:
            item.diary_notes != null ? String(item.diary_notes) : null,
          pkTimetableScheduleId: Number(item.pk_timetable_schedule_id ?? 0),
        });
      }

      setWeekDaysList(Object.values(grouped));
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

  const employeeName = useMemo(
    () => employeeOptions.find((e) => e.value === employeeId)?.label ?? "",
    [employeeOptions, employeeId],
  );

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
          <Select
            label="Employee"
            required
            value={employeeId}
            onChange={(v) => setEmployeeId(v ?? "")}
            options={employeeOptions}
            placeholder="Select Employee"
            searchable
            isLoading={employeesQuery.isLoading}
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Select Week
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
              disabled={loadingList || !employeeId}
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
        searched && weekDaysList.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Diary Entries for {employeeName}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>

            <Tabs
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="w-full"
            >
              <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
                {weekDaysList.map((day, idx) => (
                  <TabsTrigger
                    key={day.classDate}
                    value={String(idx)}
                    className="px-4 py-2 text-xs font-medium"
                  >
                    {day.weekDay} (
                    {format(new Date(day.classDate), "dd-MM-yyyy")})
                  </TabsTrigger>
                ))}
              </TabsList>

              {weekDaysList.map((day, idx) => {
                const comment = commentsList.find(
                  (c) => c.date_for === day.classDate && c.is_active !== false,
                );

                return (
                  <TabsContent
                    key={day.classDate}
                    value={String(idx)}
                    className="mt-4 space-y-4"
                  >
                    {day.periods.map((period) => (
                      <Card
                        key={period.periodNo}
                        className={`border-l-4 ${
                          period.slotType === "CLASS"
                            ? "border-l-blue-600 bg-blue-50/20"
                            : period.slotType === "LUNCH"
                              ? "border-l-amber-500 bg-amber-50/20"
                              : "border-l-slate-300 bg-slate-50/50"
                        }`}
                      >
                        <CardContent className="flex items-start justify-between p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {period.slotType === "LUNCH"
                                  ? "Lunch Break"
                                  : `Period ${period.periodNo}`}
                              </span>
                              <span className="text-xs text-slate-500">
                                ({period.startTime} - {period.endTime})
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                  period.slotType === "CLASS"
                                    ? "bg-blue-100 text-blue-800"
                                    : period.slotType === "LUNCH"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {period.slotType}
                              </span>
                            </div>

                            {period.slotType === "CLASS" ||
                            period.diaryNotes ? (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800">
                                  {period.subjectName}{" "}
                                  {period.subjectCode
                                    ? `(${period.subjectCode})`
                                    : ""}
                                </h4>
                                <p className="text-xs text-slate-600">
                                  {period.course}{" "}
                                  {period.batchName
                                    ? `- ${period.batchName}`
                                    : ""}
                                </p>
                                <div className="mt-2 rounded border bg-white p-2 text-xs text-slate-700">
                                  {period.diaryNotes ?? "No Class Diary Added"}
                                </div>
                              </div>
                            ) : period.slotType === "EMPTY" ? (
                              <p className="text-xs italic text-slate-500">
                                No Class Scheduled
                              </p>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Card className="border border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium text-slate-800">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <span>Comments</span>
                          </div>
                        </div>

                        {comment ? (
                          <div className="rounded border bg-slate-50 p-3 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900 block mb-1">
                              Comment:
                            </span>
                            {comment.comments}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            No comments added for this day.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
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
