"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DATE_FORMATS } from "@/config/constants/app";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildLeaveEntitlementEmployeeRows,
  getLeaveYears,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listLeaveEntitlementsByDept,
  listLeaveTypesForEntitlement,
  listEmployeesForLeaveEntitlement,
  resolveLeaveTypeId,
  saveLeaveEntitlements,
  type LeaveEntitlementEmployeeRow,
} from "@/services";

type LeaveTypeRow = Record<string, unknown>;

function formatYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, DATE_FORMATS.DISPLAY);
}

export function LeaveEntitlementPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [leaveYear, setLeaveYear] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState<Date>(new Date());
  const [validTo, setValidTo] = useState<Date>(new Date());

  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [years, setYears] = useState<SelectOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);

  const [employees, setEmployees] = useState<LeaveEntitlementEmployeeRow[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, unknown>[]>(
    [],
  );
  const [searchText, setSearchText] = useState("");

  const [collegesLoading, setCollegesLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const organizationId = useMemo(() => {
    if (typeof globalThis.window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("organizationId") ?? 0);
  }, []);

  const loadCollegeDependents = useCallback(
    async (cid: number) => {
      setDepartmentsLoading(true);
      try {
        const [depts, types] = await Promise.all([
          listDepartmentsByCollege(cid),
          listLeaveTypesForEntitlement(organizationId),
        ]);
        setDepartments(
          depts.map((d) => ({
            value: String(d.departmentId),
            label: String(d.deptCode ?? d.deptName ?? d.departmentId),
          })),
        );
        setLeaveTypes(types);
      } catch (e) {
        toastError(e, "Failed to load college data");
      } finally {
        setDepartmentsLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true);
      try {
        const [collegeList, yearList] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          getLeaveYears(),
        ]);
        const orgId = organizationId;
        const filtered = orgId
          ? collegeList.filter((c) => Number(c.organizationId) === orgId)
          : collegeList;
        setColleges(
          filtered.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        );
        setYears(yearList.map((y) => ({ value: y, label: y })));
        if (filtered.length > 0) {
          const cid = Number(filtered[0]!.collegeId);
          setCollegeId(cid);
          await loadCollegeDependents(cid);
        }
        if (yearList.length > 0) setLeaveYear(yearList[0]!);
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setCollegesLoading(false);
      }
    })();
  }, [organizationId, loadCollegeDependents]);

  const loadEntitlementGrid = useCallback(async () => {
    if (!collegeId || !departmentId || !leaveYear) {
      setEmployees([]);
      setEntitlements([]);
      return;
    }
    setGridLoading(true);
    setLoadError(null);
    try {
      const [empRows, types] = await Promise.all([
        listEmployeesForLeaveEntitlement(collegeId, departmentId),
        listLeaveTypesForEntitlement(organizationId),
      ]);
      setLeaveTypes(types);

      const entRows = await listLeaveEntitlementsByDept(
        collegeId,
        leaveYear,
        departmentId,
      );

      setEntitlements(entRows);
      const grid = buildLeaveEntitlementEmployeeRows(empRows, types, entRows);
      setEmployees(grid);
      if (entRows.length > 0) {
        const from = entRows[0]?.validFrom;
        const to = entRows[0]?.validTo;
        if (from) setValidFrom(new Date(String(from)));
        if (to) setValidTo(new Date(String(to)));
      }
    } catch (e) {
      setLoadError(getErrorMessage(e));
      setEmployees([]);
      setEntitlements([]);
    } finally {
      setGridLoading(false);
    }
  }, [collegeId, departmentId, leaveYear, organizationId]);

  useEffect(() => {
    void loadEntitlementGrid();
  }, [loadEntitlementGrid]);

  function handleCollegeChange(v: string | null) {
    const cid = v ? Number(v) : null;
    setCollegeId(cid);
    setDepartmentId(null);
    setLeaveYear(null);
    setEmployees([]);
    setEntitlements([]);
    if (cid) void loadCollegeDependents(cid);
  }

  function handleLeaveYearChange(v: string | null) {
    setLeaveYear(v);
    setDepartmentId(null);
    setEmployees([]);
    setEntitlements([]);
  }

  function handleDepartmentChange(v: string | null) {
    setDepartmentId(v ? Number(v) : null);
  }

  function onValidFromChange(date: Date | null) {
    if (!date) return;
    setValidFrom(date);
    if (validTo && date > validTo) {
      toast.info("From date should be less than to date.");
      setValidTo(date);
    }
  }

  function updateCount(employeeId: number, leaveIndex: number, value: string) {
    const n = value === "" ? 0 : Number(value);
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.employeeId === employeeId
          ? {
              ...emp,
              isUpdate: true,
              counts: emp.counts.map((c, i) =>
                i === leaveIndex ? (Number.isNaN(n) ? 0 : n) : c,
              ),
            }
          : emp,
      ),
    );
  }

  const filteredEmployees = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = emp.firstName.toLowerCase();
      const num = emp.empNumber.toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [employees, searchText]);

  const assignedDatesLabel = useMemo(() => {
    if (entitlements.length === 0) return null;
    const from = formatDisplayDate(entitlements[0]?.validFrom);
    const to = formatDisplayDate(entitlements[0]?.validTo);
    if (!from && !to) return null;
    return `${from} - ${to}`;
  }, [entitlements]);

  const canSave =
    collegeId != null &&
    departmentId != null &&
    leaveYear != null &&
    employees.length > 0 &&
    leaveTypes.length > 0;

  async function handleSave() {
    if (!canSave || !collegeId || !departmentId || !leaveYear) return;
    const fromStr = formatYmd(validFrom);
    const toStr = formatYmd(validTo);

    const payload: Record<string, unknown>[] = [];
    for (const emp of employees) {
      for (let j = 0; j < leaveTypes.length; j++) {
        const lt = leaveTypes[j]!;
        const typeId = resolveLeaveTypeId(lt);
        const base = {
          collegeId,
          leaveYear,
          employeeId: emp.employeeId,
          leavetypeId: typeId,
          isActive: true,
          isUpdate: emp.isUpdate,
          allocatedLeaves: emp.counts[j] ?? 0,
          validFrom: fromStr,
          validTo: toStr,
        };
        const match = entitlements.find(
          (e) =>
            Number(e.employeeId) === emp.employeeId &&
            Number(e.leavetypeId ?? e.leaveTypeId) === typeId,
        );
        if (match) {
          if (emp.isUpdate) {
            payload.push({
              ...base,
              leaveEntitlementId: match.leaveEntitlementId,
              createdDt: match.createdDt,
            });
          }
        } else {
          payload.push(base);
        }
      }
    }

    if (payload.length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const result = (await saveLeaveEntitlements(payload)) as {
        success?: boolean;
        message?: string;
      };
      if (result?.success === false) {
        toastError(result.message ?? "Failed to save leave entitlements");
        return;
      }
      toastSuccess(result?.message ?? "Leave entitlements saved");
      await loadEntitlementGrid();
    } catch (e) {
      toastError(e, "Failed to save leave entitlements");
    } finally {
      setSaving(false);
    }
  }

  const showGrid = employees.length > 0 || gridLoading;
  const showEmptyState = Boolean(
    departmentId && !gridLoading && employees.length === 0,
  );

  return (
    <FilteredListPage
      title="Leave Entitlement"
      bodyClassName="border-t-0"
      notice={
        loadError ? (
          <p className="text-sm text-destructive px-1">{loadError}</p>
        ) : null
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId != null ? String(collegeId) : null}
              onChange={handleCollegeChange}
              options={colleges}
              placeholder="Select college"
              searchable
              isLoading={collegesLoading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Leave Year">
            <Select
              value={leaveYear}
              onChange={handleLeaveYearChange}
              options={years}
              placeholder="Select year"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Department">
            <Select
              value={departmentId != null ? String(departmentId) : null}
              onChange={handleDepartmentChange}
              options={departments}
              placeholder="Select department"
              searchable
              isLoading={departmentsLoading}
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Valid From">
            <DatePicker
              value={validFrom}
              onChange={onValidFromChange}
              className="h-9 text-[12px]"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Valid To">
            <DatePicker
              value={validTo}
              onChange={(date) => {
                if (date) setValidTo(date);
              }}
              minDate={validFrom}
              className="h-9 text-[12px]"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        showGrid ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder="Search employees…"
                className="max-w-sm flex-1 min-w-[200px]"
              />
              {assignedDatesLabel ? (
                <p className="text-[12px] text-muted-foreground">
                  Leave Assigned Dates:{" "}
                  <span className="font-medium text-foreground">
                    {assignedDatesLabel}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-md border border-border scrollbar-hidden">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium w-14">SI.No</th>
                    <th className="px-3 py-2 font-medium min-w-[160px]">
                      Employee
                    </th>
                    {leaveTypes.map((lt) => (
                      <th
                        key={String(resolveLeaveTypeId(lt))}
                        className="px-3 py-2 font-medium min-w-[90px]"
                      >
                        {String(lt.leaveName ?? lt.leaveCode ?? "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridLoading ? (
                    <tr>
                      <td
                        colSpan={2 + leaveTypes.length}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, index) => (
                      <tr
                        key={emp.employeeId}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">
                          {emp.firstName}
                          {emp.empNumber ? (
                            <>
                              {" "}
                              (
                              <span className="font-medium text-primary">
                                {emp.empNumber}
                              </span>
                              )
                            </>
                          ) : null}
                        </td>
                        {emp.counts.map((count, j) => (
                          <td
                            key={`${emp.employeeId}-${j}`}
                            className="px-3 py-2"
                          >
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20 text-[12px]"
                              value={count}
                              onChange={(e) =>
                                updateCount(emp.employeeId, j, e.target.value)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={!canSave || saving}
                onClick={() => void handleSave()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : showEmptyState ? (
          <p className="text-sm text-muted-foreground">
            No employees found for the selected filters.
          </p>
        ) : null
      }
    />
  );
}
