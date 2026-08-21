"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  Select,
  toEmployeeSearchSelectOptions,
} from "@/common/components/select";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/common/components/date-picker";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listEmployeeMappedSubjects,
  saveStaffSubjectMappings,
  searchActiveEmployeesByCollege,
} from "@/services";
import { StatusBadge } from "@/common/components/data-display";
import { format, isValid, parseISO } from "date-fns";

type AnyRow = Record<string, any>;

/** Open-ended mapping end date used by Angular (shows as 31/12/9999). */
const OPEN_END_DATE = new Date(9999, 11, 31);

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

function parseDateValue(value: unknown): Date | null {
  const raw = s(value).trim();
  if (!raw) return null;
  const ymd = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const d = parseISO(ymd);
    return isValid(d) ? d : null;
  }
  const parts = raw.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    let y = 0;
    let m = 0;
    let day = 0;
    if (a.length === 4) {
      y = Number(a);
      m = Number(b);
      day = Number(c);
    } else if (c.length === 4) {
      day = Number(a);
      m = Number(b);
      y = Number(c);
    }
    if (y && m && day) {
      const d = new Date(y, m - 1, day);
      return isValid(d) ? d : null;
    }
  }
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

/** Table display — e.g. `5 Sep, 2025`. */
function formatTableDate(value: unknown): string {
  const d = parseDateValue(value);
  return d ? format(d, "d MMM, yyyy") : "-";
}

/** Modal Date row — Angular: `05 Sep, 25 - 31 Dec, 99`. */
function formatModalDate(value: unknown): string {
  const d = parseDateValue(value);
  return d ? format(d, "dd MMM, yy") : "-";
}

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
  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<AnyRow[]>([]);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [unmapOpen, setUnmapOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null);
  const [editToDate, setEditToDate] = useState<Date | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);

  const employeeOptions = useMemo(
    () => toEmployeeSearchSelectOptions(employees),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => n(e.employeeId) === (employeeId ?? 0)) ?? null,
    [employees, employeeId],
  );

  const selectedEmployeeLabel = useMemo(() => {
    if (!employeeId) return "";
    return (
      employeeOptions.find((o) => o.value === String(employeeId))?.label ?? ""
    );
  }, [employeeId, employeeOptions]);

  const collegeId = n(
    selectedEmployee?.collegeId ??
      selectedEmployee?.College?.collegeId ??
      selectedEmployee?.college?.collegeId,
  );

  const onEmployeeSearch = useCallback((term: string) => {
    const q = term.trim();
    if (q.length < 4) {
      if (!q) setEmployees([]);
      return;
    }
    setEmployeeLoading(true);
    void searchActiveEmployeesByCollege(0, q)
      .then((list) => setEmployees(Array.isArray(list) ? list : []))
      .catch(() => setEmployees([]))
      .finally(() => setEmployeeLoading(false));
  }, []);

  useEffect(() => {
    if (!employeeId) {
      setRows([]);
      return;
    }
    setLoading(true);
    listEmployeeMappedSubjects({ collegeId, employeeId })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [collegeId, employeeId]);

  function openUnmap(row: AnyRow) {
    setSelectedRow(row);
    setEditToDate(parseDateValue(row.toDate) ?? new Date());
    setEditIsActive(String(row.status ?? "").toLowerCase() !== "inactive");
    setUnmapOpen(true);
  }

  async function saveUnmapping() {
    if (!selectedRow || !employeeId) return;
    const toDateYmd = editToDate
      ? format(editToDate, "yyyy-MM-dd")
      : s(selectedRow.toDate).slice(0, 10) || format(new Date(), "yyyy-MM-dd");
    const payload = [
      {
        ...selectedRow,
        employeeId,
        isActive: editIsActive,
        toDate: toDateYmd,
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

  const filtersComplete = Boolean(employeeId);

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
        valueGetter: (p: any) => formatTableDate(p.data?.fromDate),
      },
      {
        field: "toDate",
        headerName: "To Date",
        minWidth: 120,
        flex: 0.8,
        valueGetter: (p: any) => formatTableDate(p.data?.toDate),
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
          <Select
            label="Employee"
            value={employeeId ? String(employeeId) : null}
            onChange={(v) => {
              setEmployeeId(v ? Number(v) : null);
              if (!v) setRows([]);
            }}
            options={employeeOptions}
            searchable
            clearable
            onSearch={onEmployeeSearch}
            placeholder="Type at least 4 characters…"
            isLoading={employeeLoading}
            wrapOptionLabels
            listClassName="max-h-64"
            className="w-full max-w-xl"
          />
        }
        rowData={filtersComplete ? rows : []}
        columnDefs={filtersComplete ? columnDefs : undefined}
        loading={loading}
        showTable={filtersComplete}
        resultsVisible={filtersComplete}
        tableHeader={<TableContextHeader title="Employee Mapped Subjects" />}
        toolbar={
          filtersComplete
            ? {
                search: true,
                searchPlaceholder: "Search",
                exportPdf: false,
                exportExcel: false,
              }
            : undefined
        }
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
          <div className="space-y-3">
            <div className="rounded-md border border-cyan-100 p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1.5 text-[14px]">
                <div className="font-semibold text-foreground">
                  Course Details :
                </div>
                <div className="font-semibold text-blue-700 ">
                  {s(selectedRow?.courseDisplay) || "-"}
                </div>
                <div className="font-semibold text-foreground">Subject :</div>
                <div className="font-semibold text-blue-700">
                  {s(selectedRow?.subjectName) || "-"}{" "}
                  {s(selectedRow?.subjectCode)
                    ? `(${s(selectedRow?.subjectCode)})`
                    : ""}
                </div>
                <div className="font-semibold text-foreground">
                  Subject Type :
                </div>
                <div className="font-semibold text-blue-700">
                  {s(selectedRow?.subjectType) || "-"}
                </div>
                <div className="font-semibold text-foreground">Date :</div>
                <div className="font-semibold text-blue-700">
                  {`${formatModalDate(selectedRow?.fromDate)} - ${formatModalDate(selectedRow?.toDate)}`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <DatePicker
                label="End Date"
                value={editToDate}
                onChange={setEditToDate}
                maxDate={OPEN_END_DATE}
                clearable={false}
                className="w-[170px]"
              />
              <label className="inline-flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <span className="text-xs font-medium text-sky-700">Active</span>
              </label>
            </div>
          </div>
          <DialogFooter className="px-5 py-2 border-t">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setUnmapOpen(false)}
            >
              Close
            </Button>
            <Button
              size="lg"
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
