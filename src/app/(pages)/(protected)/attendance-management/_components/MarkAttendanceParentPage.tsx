"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ClipboardCheck, ClipboardList, Keyboard } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { BookIssueCollapsible } from "@/app/(pages)/(protected)/library/bookIssue/_components/BookIssueCollapsible";
import { useSessionContext } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  formatClassDateYmdSlash,
  getStaffSubjectsForToday,
  searchDeptEmployeesForAssignments,
  searchEmployeesForFacultyDataSecurity,
  searchEmployeesForHr,
  type StaffSubjectClass,
} from "@/services";

type EmpOption = { value: string; label: string; firstName?: string };

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function parseDayParam(raw: string | null): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Angular class panel title. */
function classTitle(row: StaffSubjectClass): string {
  const batch =
    String(row.subjectType ?? "").toUpperCase() === "LAB" && row.batchName
      ? `${row.batchName} - `
      : "";
  return `${row.collegeCode ?? ""} / ${row.groupCode ?? ""} / ${row.courseYearName ?? ""} / ${row.section ?? ""} - ${row.regulationCode ?? ""} - ${row.subjectName ?? ""} (${batch}${row.subjectType ?? ""})`;
}

function classQuery(
  row: StaffSubjectClass,
  employeeId: number,
  day: Date,
  empName: string,
): URLSearchParams {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v != null && String(v) !== "") params.set(k, String(v));
  };
  set("collegeId", row.collegeId);
  set("collegeCode", row.collegeCode);
  set("courseGroupId", row.courseGroupId);
  set("groupCode", row.groupCode);
  set("groupName", row.groupName);
  set("groupSectionId", row.groupSectionId);
  set("academicYearId", row.academicYearId);
  set("academicYear", row.academicYear);
  set("courseYearId", row.courseYearId);
  set("courseYearName", row.courseYearName);
  set("empName", empName || row.firstName);
  set("employeeId", employeeId);
  set("section", row.section);
  set("regulationCode", row.regulationCode);
  set("regulationId", row.regulationId);
  set("subjectId", row.subjectId);
  set("subjectName", row.subjectName);
  set("batchName", row.batchName);
  set("day", format(day, "yyyy-MM-dd"));
  set("studentbatchId", row.studentbatchId);
  set("subjectCode", row.subjectCode);
  set("subjectType", row.subjectType);
  return params;
}

function ActionItem({
  label,
  icon,
  onClick,
}: Readonly<{ label: string; icon: ReactNode; onClick: () => void }>) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex items-center gap-3 rounded-[5px] p-[15px] text-left",
        "hover:bg-[#dedede] hover:shadow-[0_2px_6px_0_rgba(218,218,253,0.65)] cursor-pointer",
      )}
      onClick={onClick}
    >
      <span className="inline-flex shrink-0 [&_svg]:h-6 [&_svg]:w-6">
        {icon}
      </span>
      <span className="text-[15px] font-medium text-foreground">{label}</span>
    </button>
  );
}

/**
 * Angular `staff-classes/attendance-update` (update-mark-attendance parent) —
 * Day + Employee search → staffSubjects → View / Update Attendance.
 */
export function MarkAttendanceParentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const isAdmin = Boolean(user?.isAdmin) || readStorage("isAdmin") === "true";
  /** Angular `dataSecurityLevelPrincipal()` — true for all non-admin users. */
  const dataSecurity = !isAdmin;
  const isHod = readStorage("isHOD") === "true";
  const collegeId = Number((user?.collegeId ?? readStorage("collegeId")) || 0);
  const deptId = Number(
    readStorage("departmentId") || readStorage("empDeptId") || 0,
  );

  const [day, setDay] = useState<Date | null>(() =>
    parseDayParam(searchParams.get("day")),
  );
  const [employeeId, setEmployeeId] = useState<string | null>(() => {
    const id = searchParams.get("employeeId");
    return id ? String(id) : null;
  });
  const [empOptions, setEmpOptions] = useState<EmpOption[]>([]);
  const [empSearching, setEmpSearching] = useState(false);
  const [myClasses, setMyClasses] = useState<StaffSubjectClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const selectedEmpName = useMemo(() => {
    const fromOpt = empOptions.find((o) => o.value === employeeId)?.firstName;
    if (fromOpt) return fromOpt;
    return searchParams.get("empName") ?? "";
  }, [empOptions, employeeId, searchParams]);

  const searchEmployees = useCallback(
    async (term: string) => {
      const q = term.trim();
      // Angular `enteredEmployee`: length > 4
      if (q.length <= 4) {
        setEmpOptions([]);
        return;
      }
      setEmpSearching(true);
      try {
        let rows: Record<string, unknown>[] = [];
        if (isHod && deptId) {
          rows = (await searchDeptEmployeesForAssignments(deptId, q)) as Record<
            string,
            unknown
          >[];
        } else if (dataSecurity && collegeId) {
          rows = (await searchEmployeesForHr(q, collegeId)) as Record<
            string,
            unknown
          >[];
        } else {
          rows = (await searchEmployeesForFacultyDataSecurity(q)) as Record<
            string,
            unknown
          >[];
        }
        setEmpOptions(
          rows
            .map((r) => {
              const id = Number(r.employeeId ?? 0);
              if (!id) return null;
              const empNumber = String(r.empNumber ?? "");
              const firstName = String(r.firstName ?? "");
              return {
                value: String(id),
                label: firstName
                  ? `${empNumber} ( ${firstName} )`
                  : empNumber || String(id),
                firstName,
              };
            })
            .filter((o): o is EmpOption => o != null),
        );
      } catch (e) {
        toastError(getErrorMessage(e));
        setEmpOptions([]);
      } finally {
        setEmpSearching(false);
      }
    },
    [isHod, deptId, dataSecurity, collegeId],
  );

  /** Angular `defaultSelectEmployee` — restore options from query empName. */
  useEffect(() => {
    if (restored) return;
    const empName = searchParams.get("empName");
    const empId = searchParams.get("employeeId");
    if (!empName || !empId) {
      setRestored(true);
      return;
    }
    setRestored(true);
    void (async () => {
      try {
        const found = await searchEmployeesForFacultyDataSecurity(empName);
        setEmpOptions(
          found.map((e) => ({
            value: String(e.employeeId),
            label: e.firstName
              ? `${e.empNumber ?? ""} ( ${e.firstName} )`
              : String(e.empNumber ?? e.employeeId),
            firstName: e.firstName ?? undefined,
          })),
        );
        setEmployeeId(String(empId));
        // Angular auto-loads classes after restore via selectedEmp
        if (day) {
          setLoading(true);
          try {
            const list = await getStaffSubjectsForToday({
              employeeId: Number(empId),
              classDate: formatClassDateYmdSlash(day),
            });
            setMyClasses(list);
            setOpenKey(null);
            if (list.length === 0) toastSuccess("No Record(s) found.");
          } catch (e) {
            toastError(getErrorMessage(e));
            setMyClasses([]);
          } finally {
            setLoading(false);
          }
        }
      } catch {
        setEmpOptions([]);
      }
    })();
  }, [searchParams, day, restored]);

  function onDateChange(next: Date | null) {
    setDay(next);
    setEmployeeId(null);
    setEmpOptions([]);
    setMyClasses([]);
    setOpenKey(null);
  }

  async function onSearch() {
    if (!day) {
      toastError("Please select Day");
      return;
    }
    const empId = Number(employeeId || 0);
    if (!empId) {
      toastError("Please select Employee");
      return;
    }
    setLoading(true);
    setMyClasses([]);
    setOpenKey(null);
    try {
      const list = await getStaffSubjectsForToday({
        employeeId: empId,
        classDate: formatClassDateYmdSlash(day),
      });
      setMyClasses(list);
      if (list.length === 0) toastSuccess("No Record(s) found.");
    } catch (e) {
      toastError(getErrorMessage(e));
      setMyClasses([]);
    } finally {
      setLoading(false);
    }
  }

  function goChild(
    path: "mark-attendance" | "view-attendance",
    row: StaffSubjectClass,
  ) {
    const empId = Number(employeeId || 0);
    if (!day || !empId) return;
    const qs = classQuery(row, empId, day, selectedEmpName).toString();
    router.push(`/attendance-management/mark-attendance/${path}?${qs}`);
  }

  return (
    <FilteredListPage
      title="Attendance Update"
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow className="!items-end">
          <GlobalFilterField
            label="Day *"
            className="global-filter-field--shrink w-[180px] max-w-[180px]"
          >
            <DatePicker value={day} onChange={onDateChange} clearable={false} />
          </GlobalFilterField>
          <GlobalFilterField
            label="Employee *"
            className="global-filter-field--shrink w-full max-w-[min(100%,28rem)] sm:w-[min(40%,28rem)]"
          >
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              options={empOptions}
              onSearch={(term) => void searchEmployees(term)}
              searchable
              isLoading={empSearching}
              placeholder="Search by Employee name or Id."
              emptyMessage="no matching data found"
            />
          </GlobalFilterField>
          <div className="global-filter-field--action flex items-end self-end">
            <Button
              type="button"
              className="shrink-0"
              disabled={loading}
              onClick={() => void onSearch()}
            >
              {loading ? "Loading…" : "Search"}
            </Button>
          </div>
        </GlobalFilterBarRow>
      }
      body={
        myClasses.length > 0 ? (
          <div className="space-y-3">
            {myClasses.map((row, idx) => {
              const key = `${row.subjectId ?? ""}-${row.groupSectionId ?? ""}-${row.studentbatchId ?? ""}-${idx}`;
              return (
                <BookIssueCollapsible
                  key={key}
                  title={classTitle(row)}
                  icon={<Keyboard className="h-4 w-4 text-muted-foreground" />}
                  open={openKey === key}
                  onOpenChange={(next) => setOpenKey(next ? key : null)}
                  headerClassName="bg-[#f5f5f5] hover:bg-[#eeeeee]"
                  titleClassName="text-[#039be5] font-bold"
                  contentClassName="border-t border-border"
                >
                  <div className="grid max-w-2xl grid-cols-1 gap-x-2 gap-y-0 px-2 pb-2 sm:grid-cols-2">
                    <ActionItem
                      label="View Attedance"
                      icon={<ClipboardList className="text-[brown]" />}
                      onClick={() => goChild("view-attendance", row)}
                    />
                    <ActionItem
                      label="Update Attedance"
                      icon={<ClipboardCheck className="text-[green]" />}
                      onClick={() => goChild("mark-attendance", row)}
                    />
                  </div>
                </BookIssueCollapsible>
              );
            })}
          </div>
        ) : null
      }
    />
  );
}
