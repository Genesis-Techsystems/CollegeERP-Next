"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionContext } from "@/context/SessionContext";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  buildLeaveAllotmentSavePayload,
  buildLeaveAllotmentTypeRows,
  getLeaveSummaryFilters,
  getLeaveYears,
  listLeaveEntitlementsForEmployee,
  listLeaveTypesForEntitlement,
  saveLeaveEntitlements,
  searchEmployeesForHr,
  type LeaveAllotmentTypeRow,
} from "@/services";

type AnyRow = Record<string, unknown>;

const DEFAULT_EMPLOYEE_PHOTO = "/assets/images/avatars/default_Student.png";

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function readStorageNumber(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  return n(globalThis.localStorage.getItem(key));
}

/** Angular `uniq by fk_college_id` on the clg_filters result set. */
function uniqueColleges(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r.fk_college_id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function employeeOptionLabel(row: AnyRow): string {
  const name = s(row.firstName);
  const empNumber = s(row.empNumber);
  return empNumber ? `${name} (${empNumber})` : name || s(row.employeeId);
}

export function LeaveAllotmentPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();

  /** Angular `dataSecStaff || dataSECPrincipal` — both are false only for admins. */
  const showCollegeContext = !user?.isAdmin;

  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([]);
  const [years, setYears] = useState<SelectOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [leaveYear, setLeaveYear] = useState<string | null>(null);

  const [employeeRows, setEmployeeRows] = useState<AnyRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<AnyRow | null>(null);

  const [allotmentRows, setAllotmentRows] = useState<LeaveAllotmentTypeRow[]>(
    [],
  );
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const organizationId =
    user?.organizationId ?? readStorageNumber("organizationId");
  const loginEmployeeId = user?.employeeId ?? readStorageNumber("employeeId");

  // Angular ngOnInit → getLeaveYears() + getFiltersList()
  useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;
    (async () => {
      setFiltersLoading(true);
      try {
        const [filterBundle, yearList] = await Promise.all([
          getLeaveSummaryFilters(organizationId, loginEmployeeId),
          getLeaveYears(),
        ]);
        if (cancelled) return;

        const colleges = uniqueColleges(filterBundle.colleges).sort(
          (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
        );
        setCollegeRows(colleges);
        setYears(yearList.map((y) => ({ value: y, label: y })));
        if (colleges.length > 0) setCollegeId(n(colleges[0]!.fk_college_id));
      } catch (e) {
        if (!cancelled) toastError(getErrorMessage(e));
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, organizationId, loginEmployeeId]);

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      collegeRows.map((c) => ({
        value: String(n(c.fk_college_id)),
        label: s(c.college_code) || s(c.collegeCode),
      })),
    [collegeRows],
  );

  const collegeCode = useMemo(() => {
    const row = collegeRows.find((c) => n(c.fk_college_id) === collegeId);
    return s(row?.college_code) || s(row?.collegeCode);
  }, [collegeRows, collegeId]);

  const resetEmployee = useCallback(() => {
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
    setEmployeeRows([]);
    setEmployeeOptions([]);
    setAllotmentRows([]);
  }, []);

  // Angular getLeaveTypes() → getLeaveEntitles() merge
  const loadAllotment = useCallback(
    async (employeeId: number) => {
      if (!collegeId || !leaveYear || !employeeId || !organizationId) {
        setAllotmentRows([]);
        return;
      }
      setAllotmentLoading(true);
      try {
        const types = await listLeaveTypesForEntitlement(organizationId);
        const entitlements = await listLeaveEntitlementsForEmployee(
          collegeId,
          employeeId,
          leaveYear,
        );
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
        toastError(getErrorMessage(e));
        setAllotmentRows([]);
      } finally {
        setAllotmentLoading(false);
      }
    },
    [collegeId, leaveYear, organizationId],
  );

  // Angular enteredEmployee — employeesearch once the term is longer than 4 chars
  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return;
      const q = term.trim();
      if (q.length <= 4) {
        setEmployeeRows([]);
        setEmployeeOptions([]);
        return;
      }
      setEmployeeSearchLoading(true);
      try {
        const list = await searchEmployeesForHr(q, collegeId);
        setEmployeeRows(list);
        setEmployeeOptions(
          list
            .filter((r) => n(r.employeeId) > 0)
            .map((r) => ({
              value: String(n(r.employeeId)),
              label: employeeOptionLabel(r),
            })),
        );
      } catch {
        setEmployeeRows([]);
        setEmployeeOptions([]);
      } finally {
        setEmployeeSearchLoading(false);
      }
    },
    [collegeId],
  );

  // Angular selectedCollege — clears leave year, employee and the search list
  function handleCollegeChange(v: string | null) {
    setCollegeId(v ? Number(v) : null);
    setLeaveYear(null);
    resetEmployee();
  }

  // Angular selectedLeaveYear — clears employee and the search list
  function handleLeaveYearChange(v: string | null) {
    setLeaveYear(v);
    resetEmployee();
  }

  // Angular selectedEmployee — leave year is mandatory before loading entitlements
  function handleEmployeeChange(v: string | null) {
    if (!v) {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
      setAllotmentRows([]);
      return;
    }
    if (!leaveYear) {
      toastInfo("Please select the given filters");
      return;
    }
    const id = Number(v);
    const row = employeeRows.find((e) => n(e.employeeId) === id);
    if (!row) return;
    setSelectedEmployeeId(id);
    setSelectedEmployee(row);
    void loadAllotment(id);
  }

  function updateAllocated(leavetypeId: number, value: string) {
    const parsed = value === "" ? 0 : Number(value);
    setAllotmentRows((prev) =>
      prev.map((r) =>
        r.leavetypeId === leavetypeId
          ? { ...r, allocatedLeaves: Number.isNaN(parsed) ? 0 : parsed }
          : r,
      ),
    );
  }

  // Angular addLeaveEntitle — POST leaveentitlement, then reload on success
  async function handleSave() {
    if (!collegeId || !leaveYear || !selectedEmployeeId) {
      toastInfo("Please select the given filters");
      return;
    }
    setSaving(true);
    try {
      await saveLeaveEntitlements(
        buildLeaveAllotmentSavePayload(allotmentRows),
      );
      toastSuccess("Leave allotment saved");
      await loadAllotment(selectedEmployeeId);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const photoSrc =
    s(selectedEmployee?.studentPhotoPath) || s(selectedEmployee?.photoPath);

  return (
    <FilteredListPage
      title="Leave Allotment"
      filterTitle={
        showCollegeContext && collegeCode
          ? `Leave Allotment For : ${collegeCode}`
          : "Leave Allotment"
      }
      bodyClassName="px-5 pt-2 pb-4"
      tableHeader={
        <div className="table-context-header">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            computer
          </span>
          <strong className="table-context-header__title">
            Leaves Entitled
          </strong>
        </div>
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId != null ? String(collegeId) : null}
              onChange={handleCollegeChange}
              options={collegeOptions}
              placeholder="College"
              searchable
              isLoading={filtersLoading && collegeRows.length === 0}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Leave Year">
            <Select
              value={leaveYear}
              onChange={handleLeaveYearChange}
              options={years}
              placeholder="Leave Year"
              searchable
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Employee"
            className="!min-w-[16rem] !flex-[1_1_20rem]"
          >
            <Select
              value={
                selectedEmployeeId != null ? String(selectedEmployeeId) : null
              }
              onChange={handleEmployeeChange}
              options={employeeOptions}
              placeholder="Search by Employee name or Id."
              searchable
              clearable
              onSearch={onEmployeeSearch}
              isLoading={employeeSearchLoading}
              disabled={!collegeId || !leaveYear}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        selectedEmployee ? (
          <div className="space-y-3">
            <div className="flex items-stretch overflow-hidden rounded-[3px] border border-[#c3d9ff] bg-white">
              <div className="flex w-[120px] shrink-0 items-center justify-center bg-[#d9e7f8] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc || DEFAULT_EMPLOYEE_PHOTO}
                  alt=""
                  className="h-[86px] w-full object-contain"
                  onError={(e) => {
                    const image = e.currentTarget;
                    if (!image.src.endsWith("default_Student.png")) {
                      image.src = DEFAULT_EMPLOYEE_PHOTO;
                    }
                  }}
                />
              </div>
              <div className="flex flex-col justify-center gap-1.5 px-5 py-3 text-[13px]">
                <p className="font-medium text-[#0c51a4]">
                  {s(selectedEmployee.firstName)}
                </p>
                <p className="text-[#8c8c8c]">
                  {s(selectedEmployee.empNumber)}
                </p>
                {selectedEmployee.empDeptName ? (
                  <p className="text-[#8c8c8c]">
                    {s(selectedEmployee.empDeptName)}
                  </p>
                ) : null}
                <p className="text-[#8c8c8c]">{s(selectedEmployee.mobile)}</p>
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
