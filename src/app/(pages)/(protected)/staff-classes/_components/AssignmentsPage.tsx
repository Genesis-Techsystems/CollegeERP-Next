"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { Plus, Pencil } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DATE_FORMATS } from "@/config/constants";
import { useSessionContext } from "@/context/SessionContext";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { isStudentPortalViewer } from "@/lib/erp-modules-navigation";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listStaffAssignments,
  loadAssignmentCourseYearOptions,
  searchDeptEmployeesByQuery,
  searchDeptEmployeesForAssignments,
} from "@/services";
import type { StaffSubjectClass } from "@/services/staff-dashboard";
import { AssignmentFormModal } from "./AssignmentFormModal";

type AnyRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return "—";
  return format(d, DATE_FORMATS.DISPLAY);
}

function mapEmployeesToOptions(list: AnyRow[]): SelectOption[] {
  return list.map((e) => ({
    value: String(e.employeeId ?? ""),
    label: `${e.empNumber ?? ""}${e.firstName ? ` (${e.firstName})` : ""}`,
  }));
}

function filterEmployeesLocal(list: AnyRow[], term: string): AnyRow[] {
  const q = term.trim().toLowerCase();
  if (!q) return list;
  return list.filter((e) => {
    const name = String(e.firstName ?? "").toLowerCase();
    const num = String(e.empNumber ?? "").toLowerCase();
    return name.includes(q) || num.includes(q);
  });
}
function courseLabel(row: AnyRow): string {
  const group = row.courseGroupCode ?? row.groupCode ?? "";
  const year = row.courseYearName ?? "";
  const section = row.section ?? "";
  return `${group} / ${year} / - ${section}`;
}

function assignmentStatusRenderer(p: ICellRendererParams<AnyRow>) {
  const label = String(p.data?.assignmentStatusCatDisplayName ?? "—");
  return (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      {label}
    </span>
  );
}

function makeSubmissionsRenderer(onView: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button size="sm" onClick={() => onView(row)}>
        View
      </Button>
    );
  };
}

function makeEditRenderer(canEdit: boolean, onEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    if (!canEdit) return <span className="text-muted-foreground">—</span>;
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(row)}
        aria-label="Edit assignment"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectName: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 160,
  } as ColDef<AnyRow>,
  title: {
    field: "title",
    headerName: "Title",
    minWidth: 180,
  } as ColDef<AnyRow>,
  submissionDueDate: {
    field: "submissionDueDate",
    headerName: "Submission Date",
    minWidth: 140,
    valueFormatter: (p) => formatDisplayDate(p.value),
  } as ColDef<AnyRow>,
  course: {
    headerName: "Course",
    minWidth: 220,
    valueGetter: (p) => courseLabel(p.data ?? {}),
  } as ColDef<AnyRow>,
  submissions: {
    headerName: "Submissions",
    minWidth: 120,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
  isActive: {
    field: "isActive",
    headerName: "Active",
    minWidth: 100,
    flex: 0,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

export function AssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const {
    employeeId: loginEmployeeId,
    isHod,
    deptId,
    loginCtx,
    isResolving,
  } = useStaffLoginContext(user, sessionLoading);

  // Student Academics "Assignments" menus often share staff-classes/assignments.
  const studentViewer = !sessionLoading && isStudentPortalViewer();
  useEffect(() => {
    if (studentViewer) {
      router.replace("/student-academics/student-assignments");
    }
  }, [studentViewer, router]);

  const [check, setCheck] = useState<"1" | "2">("1");
  const [groupSectionId, setGroupSectionId] = useState<string>("0");
  const [courseOptions, setCourseOptions] = useState<StaffSubjectClass[]>([]);
  const [employeeCache, setEmployeeCache] = useState<AnyRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [employeeListRequested, setEmployeeListRequested] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);

  const employeeIdForList = useMemo(() => {
    if (check === "2") return positiveId(selectedEmployeeId);
    return loginEmployeeId;
  }, [check, selectedEmployeeId, loginEmployeeId]);

  const loadCourses = useCallback(async () => {
    if (!loginEmployeeId) return;
    try {
      const courses = await loadAssignmentCourseYearOptions({
        employeeId: loginEmployeeId,
      });
      setCourseOptions(courses);
    } catch (e) {
      toastError(e, "Failed to load course years");
      setCourseOptions([]);
    }
  }, [loginEmployeeId]);

  const loadAssignments = useCallback(async (): Promise<AnyRow[]> => {
    if (!employeeIdForList) {
      setRows([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const sectionId = check === "1" ? positiveId(groupSectionId) : 0;
      const list = await listStaffAssignments({
        employeeId: employeeIdForList,
        groupSectionId: sectionId > 0 ? sectionId : undefined,
      });
      setRows(list);
      return list;
    } catch (e) {
      toastError(e, "Failed to load assignments");
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [employeeIdForList, groupSectionId, check]);

  useEffect(() => {
    if (studentViewer || sessionLoading || isResolving || !loginEmployeeId)
      return;
    void loadCourses();
  }, [
    studentViewer,
    sessionLoading,
    isResolving,
    loginEmployeeId,
    loadCourses,
  ]);

  useEffect(() => {
    const qpCheck = searchParams.get("check");
    const qpGroup = searchParams.get("groupSectionId");
    const qpEmployeeId = searchParams.get("employeeId");
    const qpEmpNumber = searchParams.get("empNumber");

    if (qpCheck === "1" || qpCheck === "2") setCheck(qpCheck);
    if (!isHod && qpCheck) {
      setGroupSectionId("0");
    } else if (qpGroup != null) {
      setGroupSectionId(qpGroup || "0");
    }

    if (qpEmployeeId) {
      setSelectedEmployeeId(qpEmployeeId);
      setEmployeeListRequested(true);
    }

    if (qpEmpNumber && deptId) {
      void searchDeptEmployeesByQuery(deptId, qpEmpNumber).then((list) => {
        setEmployeeCache(list);
        setEmployeeOptions(mapEmployeesToOptions(list));
      });
    } else if (readStorage("uName") && deptId && qpCheck === "2") {
      void searchDeptEmployeesByQuery(deptId, readStorage("uName")).then(
        (list) => {
          setEmployeeCache(list);
          setEmployeeOptions(mapEmployeesToOptions(list));
        },
      );
    }
  }, [searchParams, deptId, isHod]);

  // Angular: when switching to Employee Wise, preload employee search via uName
  useEffect(() => {
    if (check !== "2" || !isHod || !deptId) return;
    const term =
      loginCtx?.uName ||
      readStorage("uName") ||
      readStorage("empNumber") ||
      user?.userName ||
      "";
    if (!term.trim()) return;
    void searchDeptEmployeesByQuery(deptId, term.trim()).then((list) => {
      setEmployeeCache(list);
      setEmployeeOptions(mapEmployeesToOptions(list));
    });
  }, [check, isHod, deptId, loginCtx?.uName, user?.userName]);

  useEffect(() => {
    if (studentViewer || sessionLoading || isResolving || !loginEmployeeId)
      return;
    if (check === "2") {
      if (!selectedEmployeeId || !employeeListRequested) {
        setRows([]);
        setLoading(false);
        return;
      }
    }
    void loadAssignments().then((list) => {
      if (
        check === "2" &&
        employeeListRequested &&
        selectedEmployeeId &&
        list.length === 0
      ) {
        toastInfo("No assignments found.");
      }
    });
  }, [
    studentViewer,
    sessionLoading,
    isResolving,
    loginEmployeeId,
    check,
    selectedEmployeeId,
    employeeListRequested,
    loadAssignments,
  ]);

  const courseYearSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "0", label: "All" },
      ...courseOptions.map((c) => ({
        value: String(c.groupSectionId ?? ""),
        label: `${c.groupCode ?? ""} / ${c.courseYearName ?? ""} / ${c.section ?? ""}`,
      })),
    ],
    [courseOptions],
  );

  const handleCheckChange = (value: string) => {
    const next = value === "2" ? "2" : "1";
    setCheck(next);
    setRows([]);
    if (next === "1") {
      setSelectedEmployeeId(null);
      setEmployeeCache([]);
      setEmployeeOptions([]);
      setEmployeeListRequested(false);
    } else {
      setGroupSectionId("0");
      setEmployeeListRequested(false);
      setSelectedEmployeeId(null);
    }
  };

  const handleCourseYearChange = (value: string | null) => {
    const next = value ?? "0";
    setGroupSectionId(next);
    setRows([]);
    // Angular selectedSection: reload immediately when course year changes
    if (check !== "1") return;
    if (!loginEmployeeId) return;
    void (async () => {
      setLoading(true);
      try {
        const sectionId = positiveId(next);
        const list = await listStaffAssignments({
          employeeId: loginEmployeeId,
          groupSectionId: sectionId > 0 ? sectionId : undefined,
        });
        setRows(list);
        if (list.length === 0) {
          toastInfo("No assignments found.");
        }
      } catch (e) {
        toastError(e, "Failed to load assignments");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleEmployeeSearch = async (term: string) => {
    const q = term.trim();
    if (!deptId) {
      setEmployeeOptions([]);
      return;
    }
    // Angular filterEmp: local filter when search is short
    if (q.length < 5) {
      setEmployeeOptions(
        mapEmployeesToOptions(filterEmployeesLocal(employeeCache, q)),
      );
      return;
    }
    try {
      const list = await searchDeptEmployeesForAssignments(deptId, q);
      setEmployeeCache(list);
      setEmployeeOptions(mapEmployeesToOptions(list));
    } catch (e) {
      toastError(e, "Employee search failed");
    }
  };

  const handleGetList = async () => {
    if (!selectedEmployeeId) {
      toastInfo("Please select an employee.");
      return;
    }
    if (!employeeListRequested) {
      setEmployeeListRequested(true);
      return;
    }
    const list = await loadAssignments();
    if (list.length === 0) {
      toastInfo("No assignments found.");
    }
  };

  const viewSubmissions = useCallback(
    (row: AnyRow) => {
      const params = new URLSearchParams();
      const set = (k: string, v: unknown) => {
        if (v != null && String(v) !== "") params.set(k, String(v));
      };
      set("assignmentId", row.assignmentId);
      set("check", check);
      set("employeeId", row.employeeId);
      set("empNumber", row.empNumber);
      set("courseYearName", row.courseYearName);
      set("section", row.section);
      set("staffCourseyrSubjectId", row.staffCourseyrSubjectId);
      set("subjectName", row.subjectName);
      set("groupSectionId", groupSectionId);
      set("courseYearId", row.courseYearId);
      set("courseGroupId", row.courseGroupId);
      set("title", row.title);
      router.push(
        `/staff-classes/assignments/view-submissions?${params.toString()}`,
      );
    },
    [router, check, groupSectionId],
  );

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: AnyRow) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSaved = () => {
    toastSuccess("Assignment saved successfully.");
    void loadAssignments();
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectName,
      COL_DEFS.title,
      COL_DEFS.submissionDueDate,
      COL_DEFS.course,
      {
        ...COL_DEFS.submissions,
        cellRenderer: makeSubmissionsRenderer(viewSubmissions),
      },
      {
        ...COL_DEFS.status,
        cellRenderer: assignmentStatusRenderer,
      },
      {
        ...COL_DEFS.isActive,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeEditRenderer(check === "1", openEdit),
      },
    ],
    [viewSubmissions, check],
  );

  if (studentViewer) {
    return null;
  }

  return (
    <>
      <FilteredListPage
        title="Assignment List"
        filtersDefaultOpen
        filters={
          <form
            className="space-y-4"
            onSubmit={(e) => e.preventDefault()}
            noValidate
          >
            {isHod ? (
              <RadioGroup
                value={check}
                onValueChange={handleCheckChange}
                className="flex flex-wrap items-center gap-6 pb-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="assignments-my" />
                  <Label
                    htmlFor="assignments-my"
                    className="cursor-pointer font-normal"
                  >
                    My Assignments
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="assignments-emp" />
                  <Label
                    htmlFor="assignments-emp"
                    className="cursor-pointer font-normal"
                  >
                    Employee Wise Assignments
                  </Label>
                </div>
              </RadioGroup>
            ) : null}

            {check === "1" ? (
              <Select
                value={groupSectionId}
                onChange={(v) => handleCourseYearChange(v)}
                options={courseYearSelectOptions}
                searchable
                placeholder="Course Year"
                className="max-w-xs sm:max-w-sm"
              />
            ) : isHod ? (
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  value={selectedEmployeeId}
                  onChange={(v) => {
                    setSelectedEmployeeId(v);
                    setRows([]);
                    setEmployeeListRequested(false);
                  }}
                  options={employeeOptions}
                  searchable
                  onSearch={handleEmployeeSearch}
                  placeholder="Employee"
                  className="min-w-[280px] max-w-md"
                />
                <Button type="button" onClick={handleGetList}>
                  Get List
                </Button>
              </div>
            ) : null}
          </form>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        paginationPageSize={10}
        toolbar={{ searchPlaceholder: "Search" }}
        toolbarTrailing={
          check === "1" ? (
            <Button type="button" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add Assignment
            </Button>
          ) : null
        }
      />

      <AssignmentFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
        employeeId={loginEmployeeId}
        onSaved={handleSaved}
      />
    </>
  );
}
