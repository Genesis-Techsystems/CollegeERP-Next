"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, User } from "lucide-react";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import { useSessionContext } from "@/context/SessionContext";
import {
  buildLeaveAllotmentTypeRows,
  getLeaveYears,
  listActiveCollegesForGeneralSettings,
  listLeaveEntitlementsForEmployee,
  listLeaveTypesForEntitlement,
  saveLeaveEntitlements,
  searchEmployeesForHr,
  type LeaveAllotmentTypeRow,
} from "@/services";
import type { SessionUser } from "@/types/user";

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function isStaffOrPrincipal(user: SessionUser | null | undefined): boolean {
  if (user?.isPrincipal) return true;
  return (
    readStorage("isPRINCIPAL") === "true" ||
    readStorage("isPrincipal") === "true" ||
    readStorage("dataSecStaff") === "true"
  );
}

function employeeOptionLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? "");
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : "";
  return name + num || String(row.employeeId ?? "");
}

export function EmployeeLeaveAllotmentPage() {
  const { user } = useSessionContext();
  const sessionCollegeId =
    user?.collegeId ?? Number(readStorage("collegeId") || 0);
  const isPrincipal =
    user?.isPrincipal ?? readStorage("isPRINCIPAL") === "true";
  const showCollegeContext = isStaffOrPrincipal(user);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [leaveYear, setLeaveYear] = useState<string | null>(null);
  const [collegeCode, setCollegeCode] = useState("");

  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [collegeRows, setCollegeRows] = useState<Record<string, unknown>[]>([]);
  const [years, setYears] = useState<SelectOption[]>([]);

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>(
    [],
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [allotmentRows, setAllotmentRows] = useState<LeaveAllotmentTypeRow[]>(
    [],
  );
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const organizationId = useMemo(() => {
    if (typeof globalThis.window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("organizationId") ?? 0);
  }, []);

  const collegeLocked = isPrincipal && sessionCollegeId > 0;

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
        setCollegeRows(filtered as unknown as Record<string, unknown>[]);
        setColleges(
          filtered.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        );
        setYears(yearList.map((y) => ({ value: y, label: y })));

        let cid: number | null = null;
        if (collegeLocked) {
          cid = sessionCollegeId;
        } else if (filtered.length > 0) {
          cid = Number(filtered[0]!.collegeId);
        }
        if (cid) {
          setCollegeId(cid);
          const row = filtered.find((c) => Number(c.collegeId) === cid);
          setCollegeCode(String(row?.collegeCode ?? ""));
        }
        if (yearList.length > 0) setLeaveYear(yearList[0]!);
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setCollegesLoading(false);
      }
    })();
  }, [organizationId, collegeLocked, sessionCollegeId]);

  const loadAllotment = useCallback(
    async (employeeId: number) => {
      if (!collegeId || !leaveYear || !employeeId || !organizationId) {
        setAllotmentRows([]);
        return;
      }
      setAllotmentLoading(true);
      try {
        const [types, entitlements] = await Promise.all([
          listLeaveTypesForEntitlement(organizationId),
          listLeaveEntitlementsForEmployee(collegeId, employeeId, leaveYear),
        ]);
        setAllotmentRows(
          buildLeaveAllotmentTypeRows(
            types,
            entitlements,
            collegeId,
            leaveYear,
            employeeId,
          ),
        );
      } catch (e) {
        toastError(e, "Failed to load leave allotment");
        setAllotmentRows([]);
      } finally {
        setAllotmentLoading(false);
      }
    },
    [collegeId, leaveYear, organizationId],
  );

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return;
      const q = term.trim();
      if (q.length < 4) {
        setEmployeeRows([]);
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const list = await searchEmployeesForHr(q, collegeId);
        setEmployeeRows(list as Record<string, unknown>[]);
        setEmployeeOptions(
          list.map((e) => ({
            value: String(e.employeeId),
            label: employeeOptionLabel(e as Record<string, unknown>),
          })),
        );
      } catch (e) {
        toastError(e, "Employee search failed");
        setEmployeeRows([]);
        setEmployeeOptions([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    },
    [collegeId],
  );

  function handleCollegeChange(v: string | null) {
    if (collegeLocked) return;
    const cid = v ? Number(v) : null;
    setCollegeId(cid);
    const row = collegeRows.find((c) => Number(c.collegeId) === cid);
    setCollegeCode(String(row?.collegeCode ?? ""));
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
    setAllotmentRows([]);
    setEmployeeRows([]);
    setEmployeeOptions([]);
  }

  function handleLeaveYearChange(v: string | null) {
    setLeaveYear(v);
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
    setAllotmentRows([]);
    setEmployeeRows([]);
    setEmployeeOptions([]);
  }

  function handleEmployeeChange(v: string | null) {
    if (!v) {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
      setAllotmentRows([]);
      return;
    }
    if (!leaveYear) {
      toast.info("Please select the given filters");
      return;
    }
    const id = Number(v);
    const row = employeeRows.find((e) => Number(e.employeeId) === id);
    if (!row) return;
    setSelectedEmployeeId(id);
    setSelectedEmployee(row);
    void loadAllotment(id);
  }

  function updateAllocated(leavetypeId: number, value: string) {
    const n = value === "" ? 0 : Number(value);
    setAllotmentRows((prev) =>
      prev.map((r) =>
        r.leavetypeId === leavetypeId
          ? { ...r, allocatedLeaves: Number.isNaN(n) ? 0 : n }
          : r,
      ),
    );
  }

  async function handleSave() {
    if (!collegeId || !leaveYear || !selectedEmployeeId) {
      toast.info("Please select the given filters");
      return;
    }
    setSaving(true);
    try {
      const payload = allotmentRows.map((r) => ({
        ...r,
        leavetypeId: r.leavetypeId,
        allocatedLeaves: r.allocatedLeaves,
        collegeId: r.collegeId,
        leaveYear: r.leaveYear,
        employeeId: r.employeeId,
        leaveEntitlementId: r.leaveEntitlementId,
      }));
      const result = (await saveLeaveEntitlements(payload)) as {
        success?: boolean;
        message?: string;
      };
      if (result?.success === false) {
        toastError(result.message ?? "Save failed");
        return;
      }
      toastSuccess(result?.message ?? "Leave allotment saved");
      await loadAllotment(selectedEmployeeId);
    } catch (e) {
      toastError(getErrorMessage(e), "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const collegeNotice =
    showCollegeContext && collegeCode ? (
      <p className="text-sm text-muted-foreground px-1">
        College:{" "}
        <span className="font-medium text-foreground">{collegeCode}</span>
      </p>
    ) : null;

  return (
    <FilteredListPage
      title="Employee Leave Allotment"
      bodyClassName="border-t-0"
      notice={collegeNotice}
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
              disabled={collegeLocked}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Leave Year">
            <Select
              value={leaveYear}
              onChange={handleLeaveYearChange}
              options={years}
              placeholder="Select year"
              searchable
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Employee">
            <Select
              value={
                selectedEmployeeId != null ? String(selectedEmployeeId) : null
              }
              onChange={handleEmployeeChange}
              options={employeeOptions}
              placeholder="Search by name or ID (min 4 chars)"
              searchable
              onSearch={onEmployeeSearch}
              isLoading={employeeSearchLoading}
              disabled={!collegeId || !leaveYear}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        selectedEmployee ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Leaves Entitled
            </p>

            <div className="flex gap-4 rounded-md border border-border bg-muted/30 p-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted"
                aria-hidden
              >
                <User
                  className="h-8 w-8 text-muted-foreground"
                  strokeWidth={1.25}
                />
              </div>
              <div className="space-y-0.5 text-[12px]">
                <p className="font-medium text-primary">
                  {String(selectedEmployee.firstName ?? "")}
                </p>
                <p className="text-muted-foreground">
                  {String(selectedEmployee.empNumber ?? "")}
                </p>
                <p className="text-muted-foreground">
                  {String(selectedEmployee.empDeptName ?? "")}
                </p>
                <p className="text-muted-foreground">
                  {String(selectedEmployee.mobile ?? "")}
                </p>
              </div>
            </div>

            {allotmentLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading leave types…
              </div>
            ) : allotmentRows.length > 0 ? (
              <div className="space-y-3">
                {allotmentRows.map((leave) => (
                  <div
                    key={leave.leavetypeId}
                    className="flex flex-wrap items-end gap-4 border-b border-border pb-3 last:border-0"
                  >
                    <p className="min-w-[200px] flex-1 text-[12px] text-foreground">
                      {leave.leaveName}{" "}
                      <span className="text-primary">({leave.leaveCode})</span>
                    </p>
                    <div className="w-full max-w-[180px]">
                      <Label
                        htmlFor={`alloc-${leave.leavetypeId}`}
                        className="text-xs text-muted-foreground"
                      >
                        Allocated Leaves
                      </Label>
                      <Input
                        id={`alloc-${leave.leavetypeId}`}
                        type="number"
                        min={0}
                        className="h-8 text-[12px]"
                        value={leave.allocatedLeaves}
                        onChange={(e) =>
                          updateAllocated(leave.leavetypeId, e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No leave types found for this employee.
              </p>
            )}
          </div>
        ) : null
      }
    />
  );
}
