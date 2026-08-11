"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  listActiveCollegesForTodo,
  listAcademicYearsForCollege,
  listTodoListTagsByCollege,
} from "@/services";
import type { College } from "@/types/college";
import type { EmpTodoListTag } from "@/types/todo";
import TodoListTagModal from "./TodoListTagModal";

type AcademicYearRow = { academicYearId?: number; academicYear?: string };

const BTN_NAVY =
  "h-9 bg-[#001f3f] px-4 text-white hover:bg-[#002a54] disabled:opacity-60";

const COLS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpTodoListTag>,
  tag: {
    field: "tag",
    headerName: "Tag",
    minWidth: 200,
    flex: 1,
  } as ColDef<EmpTodoListTag>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.5,
  } as ColDef<EmpTodoListTag>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<EmpTodoListTag>,
};

function statusRenderer(p: ICellRendererParams<EmpTodoListTag>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: EmpTodoListTag | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<EmpTodoListTag>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setRow(p.data ?? null);
        setOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function TodoListTagsPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [rows, setRows] = useState<EmpTodoListTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<EmpTodoListTag | null>(null);

  useEffect(() => {
    void listActiveCollegesForTodo()
      .then(setColleges)
      .catch(() => setColleges([]));
  }, []);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [colleges],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  );

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid);
    setAcademicYearId(null);
    setAcademicYears([]);
    setRows([]);
    setLoaded(false);
    if (!cid) return;
    try {
      const ay = await listAcademicYearsForCollege(cid);
      setAcademicYears(ay);
    } catch {
      setAcademicYears([]);
    }
  }

  async function loadTags() {
    if (!collegeId) return;
    setLoading(true);
    setLoaded(true);
    try {
      const data = await listTodoListTagsByCollege(collegeId);
      setRows(data);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const columnDefs = useMemo<ColDef<EmpTodoListTag>[]>(
    () => [
      COLS.siNo,
      COLS.tag,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  const filters = (
    <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
      <Select
        label="College *"
        value={collegeId ? String(collegeId) : null}
        onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
        options={collegeOptions}
        searchable
        className="md:col-span-3"
      />
      <Select
        label="Academic Year"
        value={academicYearId ? String(academicYearId) : null}
        onChange={(v) => {
          setAcademicYearId(v ? Number(v) : null);
          setRows([]);
          setLoaded(false);
        }}
        options={academicYearOptions}
        searchable
        disabled={!collegeId}
        className="md:col-span-3"
      />
      <div className="md:col-span-2">
        <Button
          type="button"
          className={`w-full ${BTN_NAVY}`}
          onClick={() => void loadTags()}
          disabled={loading || !collegeId}
        >
          {loading ? "Loading…" : "Get Tags"}
        </Button>
      </div>
    </div>
  );

  return (
    <FilteredListPage
      title="TODO List Tags"
      filters={filters}
      filtersCollapsible
      rowData={loaded ? rows : []}
      columnDefs={loaded ? columnDefs : undefined}
      /* `null` keeps FilteredPage (filters only) until Get Tags; avoids empty AG Grid. */
      body={loaded ? undefined : null}
      loading={loading}
      pagination={loaded}
      toolbar={
        loaded
          ? {
              search: true,
              searchPlaceholder: "Search",
              pdfDocumentTitle: "TODO List Tags",
            }
          : undefined
      }
      toolbarTrailing={
        loaded ? (
          <Button
            size="sm"
            className={BTN_NAVY}
            onClick={() => {
              setRow(null);
              setOpen(true);
            }}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Add List-Tags
          </Button>
        ) : undefined
      }
    >
      <TodoListTagModal
        key={getCrudModalKey(row, open, "empTodoListTagId")}
        open={open}
        onClose={() => {
          setOpen(false);
          setRow(null);
        }}
        row={row}
        collegeId={collegeId}
        colleges={colleges}
        onSaved={() => void loadTags()}
      />
    </FilteredListPage>
  );
}
