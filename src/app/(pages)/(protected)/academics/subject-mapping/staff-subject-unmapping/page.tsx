"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getDigitalOnlineSyncFilters,
  listActiveEmployeesByCollege,
  listEmployeeMappedSubjects,
  saveStaffSubjectMappings,
} from "@/services";
import { toDateStr } from "@/common/generic-functions";
import { StatusBadge } from "@/common/components/data-display";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

function toInputDate(value: unknown): string {
  const raw = s(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split(/[/-]/);
  if (parts.length !== 3) return "";
  const [a, b, c] = parts;
  if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  return "";
}

const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function makeActionsRenderer(onUnmap: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="inline-flex items-center"
      onClick={() => onUnmap(p.data ?? {})}
      title="Unmap"
    >
      <Pencil className="h-3.5 w-3.5 text-sky-700" />
    </button>
  );
}

export default function StaffSubjectUnmappingPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<AnyRow[]>([]);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [unmapOpen, setUnmapOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null);
  const [editToDate, setEditToDate] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
      });
  }, []);

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);

  useEffect(() => {
    async function loadEmployees() {
      if (!collegeId) {
        setEmployees([]);
        setEmployeeId(null);
        return;
      }
      setEmployeeLoading(true);
      const list = await listActiveEmployeesByCollege(collegeId).catch(
        () => [],
      );
      setEmployees(list);
      setEmployeeId(null);
      setEmployeeLoading(false);
    }
    void loadEmployees();
  }, [collegeId]);

  useEffect(() => {
    if (!collegeId || !employeeId) return setRows([]);
    setLoading(true);
    listEmployeeMappedSubjects({ collegeId, employeeId })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [collegeId, employeeId]);

  function openUnmap(row: AnyRow) {
    setSelectedRow(row);
    setEditToDate(
      toInputDate(row.toDate) || new Date().toISOString().slice(0, 10),
    );
    setEditIsActive(String(row.status ?? "").toLowerCase() !== "inactive");
    setUnmapOpen(true);
  }

  async function saveUnmapping() {
    if (!selectedRow || !employeeId || !collegeId) return;
    const payload = [
      {
        ...selectedRow,
        employeeId,
        isActive: editIsActive,
        toDate:
          editToDate ||
          selectedRow.toDate ||
          new Date().toISOString().slice(0, 10),
      },
    ];
    try {
      await saveStaffSubjectMappings(payload);
      toastSuccess("Staff subject updated successfully");
      setUnmapOpen(false);
      const refreshed = await listEmployeeMappedSubjects({
        collegeId,
        employeeId,
      });
      setRows(refreshed);
    } catch {
      toastError("Failed to unmap staff subject");
    }
  }

  function statusRenderer(p: ICellRendererParams<AnyRow>) {
    return (
      <StatusBadge
        status={
          String(p.data?.status ?? "active").toLowerCase() === "active"
            ? "active"
            : "inactive"
        }
      />
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        field: "courseDisplay",
        headerName: "Course",
        minWidth: 240,
        flex: 1.3,
      },
      {
        headerName: "Subject",
        minWidth: 260,
        flex: 1.4,
        valueGetter: (p: any) => {
          const name = s(p.data?.subjectName);
          const code = s(p.data?.subjectCode);
          return code ? `${name} (${code})` : name;
        },
      },
      {
        field: "subjectType",
        headerName: "Subject Type",
        minWidth: 130,
        flex: 0.9,
      },
      {
        field: "fromDate",
        headerName: "From Date",
        minWidth: 120,
        flex: 0.8,
        valueGetter: (p: any) => toDateStr(s(p.data?.fromDate)) || "-",
      },
      {
        field: "toDate",
        headerName: "To Date",
        minWidth: 120,
        flex: 0.8,
        valueGetter: (p: any) => toDateStr(s(p.data?.toDate)) || "-",
      },
      {
        headerName: "Status",
        minWidth: 100,
        flex: 0.6,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 90,
        maxWidth: 100,
        flex: 0,
        cellRenderer: makeActionsRenderer(openUnmap),
      },
    ],
    [],
  );

  return (
    <>
      <FilteredListPage
        title="Staff Subject Unmapping"
        filters={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
            />
            <Select
              label="Employee"
              value={employeeId ? String(employeeId) : null}
              onChange={(v) => setEmployeeId(v ? Number(v) : null)}
              options={employees.map((x) => {
                const name = [x.firstName, x.middleName, x.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                const empNo = s(x.empNumber);
                return {
                  value: String(n(x.employeeId)),
                  label: empNo ? `${name} (${empNo})` : name,
                };
              })}
              searchable
              disabled={!collegeId || employeeLoading}
              isLoading={employeeLoading}
            />
          </div>
        }
        rowData={employeeId ? rows : []}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        // Angular has mat-paginator commented out — show the full mapped list
        pagination={false}
        height="auto"
      />

      <Dialog open={unmapOpen} onOpenChange={setUnmapOpen}>
        <DialogContent className="sm:max-w-3xl overflow-hidden">
          <DialogHeader className="px-5 py-3 pr-12 border-b bg-background">
            <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
              Staff Subject Edit
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-3 space-y-3">
            <div className="rounded-md border border-cyan-100 p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1.5 text-[11px]">
                <div className="font-semibold text-foreground">
                  Course Details :
                </div>
                <div className="font-semibold text-blue-700 text-xs">
                  {s(selectedRow?.courseDisplay) || "-"}
                </div>
                <div className="font-semibold text-foreground">Subject :</div>
                <div className="font-semibold text-blue-700 text-xs">
                  {s(selectedRow?.subjectName) || "-"}{" "}
                  {s(selectedRow?.subjectCode)
                    ? `(${s(selectedRow?.subjectCode)})`
                    : ""}
                </div>
                <div className="font-semibold text-foreground">
                  Subject Type :
                </div>
                <div className="font-semibold text-blue-700 text-xs">
                  {s(selectedRow?.subjectType) || "-"}
                </div>
                <div className="font-semibold text-foreground">Date :</div>
                <div className="font-semibold text-blue-700 text-xs">
                  {(toDateStr(s(selectedRow?.fromDate)) || "-") +
                    " - " +
                    (toDateStr(s(selectedRow?.toDate)) || "-")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="endDate"
                  className="text-xs text-muted-foreground"
                >
                  End Date
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={editToDate}
                  onChange={(e) => setEditToDate(e.target.value)}
                  className="w-[170px] h-8 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <span className="text-xs text-muted-foreground">Active</span>
              </label>
            </div>
          </div>
          <DialogFooter className="px-5 py-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnmapOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void saveUnmapping();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
