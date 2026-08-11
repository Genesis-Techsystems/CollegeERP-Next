"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, isSameMonth } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Select } from "@/common/components/select";
import { ConfirmDialog } from "@/common/components/feedback";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  createTodo,
  listActiveCollegesForTodo,
  listAcademicYearsForCollege,
  listAllTodos,
  updateTodo,
} from "@/services";
import type { College } from "@/types/college";
import type { EmpTodoListItem } from "@/types/todo";
import TodoListModal, { type TodoFormValues } from "./TodoListModal";
import { TodoMonthCalendar } from "./TodoMonthCalendar";

type AcademicYearRow = { academicYearId?: number; academicYear?: string };
type FlagAction = { type: "flag" | "complete"; row: EmpTodoListItem };

const BTN_NAVY =
  "h-9 bg-[#001f3f] px-4 text-white hover:bg-[#002a54] disabled:opacity-60";
const CHEVRON_BTN =
  "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#dedede] text-blue-600 shadow-sm hover:bg-[#d0d0d0]";

function fmtDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "dd MMM yyyy");
}

export default function TodoListPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [allTodos, setAllTodos] = useState<EmpTodoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmpTodoListItem | null>(null);
  const [flagAction, setFlagAction] = useState<FlagAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    setAllTodos([]);
    setLoaded(false);
    if (!cid) return;
    try {
      const ay = await listAcademicYearsForCollege(cid);
      setAcademicYears(ay);
    } catch {
      setAcademicYears([]);
    }
  }

  const loadTodos = useCallback(async () => {
    if (!collegeId || !academicYearId) return;
    setLoading(true);
    setLoaded(true);
    try {
      const data = await listAllTodos();
      setAllTodos(data);
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [collegeId, academicYearId]);

  const monthTodos = useMemo(
    () =>
      allTodos.filter(
        (t) => t.todoDate && isSameMonth(new Date(t.todoDate), viewMonth),
      ),
    [allTodos, viewMonth],
  );

  async function handleSubmitTodo(data: TodoFormValues) {
    const { displayTime: _displayTime, ...rest } = data;
    const payload = {
      ...rest,
      parentTodoListId:
        typeof rest.parentTodoListId === "string"
          ? Number(rest.parentTodoListId) || rest.parentTodoListId
          : rest.parentTodoListId,
      todoTime: data.todoTime || "11:00:00",
      isCompleted: Boolean(rest.isCompleted),
    };
    if (editing) {
      await updateTodo(
        editing.empTodoListId,
        payload as Partial<EmpTodoListItem>,
      );
      toastSuccess("TODO updated");
    } else {
      await createTodo(payload as Partial<EmpTodoListItem>);
      toastSuccess("TODO created");
    }
    setModalOpen(false);
    setEditing(null);
    await loadTodos();
  }

  async function confirmFlagAction() {
    if (!flagAction) return;
    setActionLoading(true);
    try {
      const { type, row } = flagAction;
      const patch =
        type === "flag"
          ? { isFlaged: !row.isFlaged }
          : { isCompleted: !row.isCompleted };
      await updateTodo(row.empTodoListId, { ...row, ...patch });
      toastSuccess(type === "flag" ? "Flag updated" : "Status updated");
      setFlagAction(null);
      await loadTodos();
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

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
        label="Academic Year *"
        value={academicYearId ? String(academicYearId) : null}
        onChange={(v) => {
          setAcademicYearId(v ? Number(v) : null);
          setAllTodos([]);
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
          onClick={() => void loadTodos()}
          disabled={loading || !collegeId || !academicYearId}
        >
          {loading ? "Loading…" : "Get Events"}
        </Button>
      </div>
    </div>
  );

  return (
    <FilteredPage title="TODO Scheduler" filters={filters} filtersCollapsible>
      {loaded && academicYearId ? (
        <div className="space-y-4">
          <div className="relative rounded-[3px] bg-white px-4 py-3 shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_0_rgba(0,0,0,.14),0_1px_5px_0_rgba(0,0,0,.12)]">
            <div className="flex items-center justify-center gap-3 pr-14">
              <button
                type="button"
                className={CHEVRON_BTN}
                aria-label="Previous month"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="rounded-[3px] bg-[#c3d9ff] px-5 py-[7px] text-[14px] font-medium text-slate-900">
                {format(viewMonth, "MMMM yyyy")}
              </div>
              <button
                type="button"
                className={CHEVRON_BTN}
                aria-label="Next month"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              title="Add TODO"
              aria-label="Add TODO"
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#2196f3] text-white shadow-md hover:bg-[#1e88e5]"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1 lg:max-w-[68%]">
              <TodoMonthCalendar
                viewMonth={viewMonth}
                todos={monthTodos}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onTodoClick={(todo) => {
                  setEditing(todo);
                  setModalOpen(true);
                }}
              />
            </div>
            <div className="w-full shrink-0 lg:w-[32%]">
              {monthTodos.length === 0 ? (
                <p className="pt-1 text-[15px] font-medium text-blue-600">
                  No TODO-Scheduler in this month.
                </p>
              ) : (
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {monthTodos.map((todo) => (
                    <div
                      key={todo.empTodoListId}
                      className="rounded-[3px] border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {todo.title}
                          </p>
                          {todo.notes ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {todo.notes}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {fmtDate(todo.todoDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            aria-label="Edit TODO"
                            onClick={() => {
                              setEditing(todo);
                              setModalOpen(true);
                            }}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${todo.isFlaged ? "text-amber-600" : ""}`}
                            aria-label="Toggle flag"
                            onClick={() =>
                              setFlagAction({ type: "flag", row: todo })
                            }
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${todo.isCompleted ? "text-emerald-600" : ""}`}
                            aria-label="Toggle completed"
                            onClick={() =>
                              setFlagAction({ type: "complete", row: todo })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <TodoListModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        collegeId={collegeId}
        colleges={colleges}
        defaultDate={selectedDate}
        onSubmit={handleSubmitTodo}
      />
      <ConfirmDialog
        open={flagAction != null}
        onCancel={() => setFlagAction(null)}
        onConfirm={() => void confirmFlagAction()}
        title={flagAction?.type === "flag" ? "Update flag" : "Update status"}
        description={
          flagAction?.type === "flag"
            ? `${flagAction.row.isFlaged ? "Remove flag from" : "Flag"} "${flagAction.row.title}"?`
            : `Mark "${flagAction?.row.title}" as ${flagAction?.row.isCompleted ? "not completed" : "completed"}?`
        }
        confirmLabel="Yes"
        confirmVariant="default"
        isLoading={actionLoading}
      />
    </FilteredPage>
  );
}
