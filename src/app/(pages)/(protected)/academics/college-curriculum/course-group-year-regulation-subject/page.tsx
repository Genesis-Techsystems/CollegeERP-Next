"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { AddCurriculumSubjectModal } from "../_components/AddCurriculumSubjectModal";
import {
  listGroupYearRegulationSubjects,
  listSubjectsByCourse,
  saveGroupYearRegulationSubjects,
  softDeleteGroupYearRegulationDetail,
} from "@/services";

type AnyRow = Record<string, any>;

type FormState = {
  subjectId: number | null;
  lectures: string;
  tutorials: string;
  practicals: string;
  internalmarks: string;
  externalmarks: string;
  finalIntPercentage: string;
  finalExtPercentage: string;
  passPercentage: string;
  externalPassPercentage: string;
  credits: string;
};

const defaultForm: FormState = {
  subjectId: null,
  lectures: "",
  tutorials: "",
  practicals: "",
  internalmarks: "",
  externalmarks: "",
  finalIntPercentage: "",
  finalExtPercentage: "",
  passPercentage: "",
  externalPassPercentage: "",
  credits: "",
};

const BACK_BTN =
  "h-9 min-w-20 !rounded-[5px] !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]";
const SAVE_BTN =
  "h-9 min-w-20 !rounded-[5px] bg-[#042956] px-4 text-white hover:bg-[#031f42]";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safe(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function toNumberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const BASE_COLS = {
  siNo: {
    headerName: "S.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    minWidth: 80,
    flex: 0,
    pinned: "left",
    sortable: false,
    filter: false,
    suppressSizeToFit: true,
  } as ColDef<AnyRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    width: 130,
    minWidth: 130,
    flex: 0,
    suppressSizeToFit: true,
  },
  subjectName: {
    field: "subjectName",
    headerName: "Subject Name",
    width: 200,
    minWidth: 200,
    flex: 0,
    suppressSizeToFit: true,
  },
  subjectType: {
    field: "subjecttypeCode",
    headerName: "Subject Type",
    width: 130,
    minWidth: 130,
    flex: 0,
    suppressSizeToFit: true,
  },
  lectures: {
    field: "lectures",
    headerName: "Lecture",
    width: 110,
    minWidth: 110,
    flex: 0,
    suppressSizeToFit: true,
  },
  tutorials: {
    field: "tutorials",
    headerName: "Tutorial",
    width: 110,
    minWidth: 110,
    flex: 0,
    suppressSizeToFit: true,
  },
  practicals: {
    field: "practicals",
    headerName: "Practical",
    width: 110,
    minWidth: 110,
    flex: 0,
    suppressSizeToFit: true,
  },
  internal: {
    field: "internalmarks",
    headerName: "Internal Marks",
    width: 130,
    minWidth: 130,
    flex: 0,
    suppressSizeToFit: true,
  },
  external: {
    field: "externalmarks",
    headerName: "External Marks",
    width: 130,
    minWidth: 130,
    flex: 0,
    suppressSizeToFit: true,
  },
  finalIntPercentage: {
    field: "finalIntPercentage",
    headerName: "Final IntPercentage",
    width: 160,
    minWidth: 160,
    flex: 0,
    suppressSizeToFit: true,
  },
  finalExtPercentage: {
    field: "finalExtPercentage",
    headerName: "Final ExtPercentage",
    width: 160,
    minWidth: 160,
    flex: 0,
    suppressSizeToFit: true,
  },
  passPercentage: {
    field: "passPercentage",
    headerName: "Pass Percentage",
    width: 140,
    minWidth: 140,
    flex: 0,
    suppressSizeToFit: true,
  },
  externalPassPercentage: {
    field: "externalPassPercentage",
    headerName: "External PassPercentage",
    width: 180,
    minWidth: 180,
    flex: 0,
    suppressSizeToFit: true,
  },
  credits: {
    field: "credits",
    headerName: "Credits",
    width: 100,
    minWidth: 100,
    flex: 0,
    suppressSizeToFit: true,
  },
  actions: {
    headerName: "Actions",
    width: 110,
    minWidth: 110,
    flex: 0,
    pinned: "right",
    sortable: false,
    filter: false,
    suppressSizeToFit: true,
  } as ColDef<AnyRow>,
};

function makeActionsRenderer(
  onEdit: (row: AnyRow) => void,
  onDelete: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={() => p.data && onEdit(p.data)}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-red-50"
        onClick={() => p.data && onDelete(p.data)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CourseGroupYearRegulationSubjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const context = useMemo(
    () => ({
      universityId: num(searchParams.get("universityId")),
      universityName: safe(searchParams.get("universityName")),
      courseGroupId: num(searchParams.get("courseGroupId")),
      groupName: safe(searchParams.get("groupName")),
      courseYearId: num(searchParams.get("courseYearId")),
      courseYearName: safe(searchParams.get("courseYearName")),
      courseId: num(searchParams.get("courseId")),
      courseName: safe(searchParams.get("courseName")),
      regulationId: num(searchParams.get("regulationId")),
      regulationName: safe(searchParams.get("regulationName")),
    }),
    [searchParams],
  );

  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [removedRows, setRemovedRows] = useState<AnyRow[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  useEffect(() => {
    if (!context.courseId) return;
    listSubjectsByCourse(context.courseId)
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, [context.courseId]);

  const loadRows = useCallback(async () => {
    if (
      !context.courseGroupId ||
      !context.courseYearId ||
      !context.regulationId
    )
      return;
    setLoading(true);
    try {
      const list = await listGroupYearRegulationSubjects(
        context.courseGroupId,
        context.courseYearId,
        context.regulationId,
      );
      setRows(Array.isArray(list) ? list : []);
      setRemovedRows([]);
      setEditingId(null);
      setForm(defaultForm);
    } finally {
      setLoading(false);
    }
  }, [context.courseGroupId, context.courseYearId, context.regulationId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const subjectCodeOptions = useMemo(
    () =>
      subjects.map((x) => ({
        value: String(num(x.subjectId ?? x.pk_subject_id)),
        label: safe(x.subjectCode),
      })),
    [subjects],
  );
  const subjectNameOptions = useMemo(
    () =>
      subjects.map((x) => ({
        value: String(num(x.subjectId ?? x.pk_subject_id)),
        label: safe(x.subjectName),
      })),
    [subjects],
  );

  function selectSubject(subjectId: number | null) {
    const details = subjectId ? hydrateSubjectFields(subjectId) : {};
    setForm((prev) => ({
      ...prev,
      subjectId,
      credits:
        details.credits != null && details.credits !== ""
          ? String(details.credits)
          : subjectId
            ? prev.credits
            : "",
    }));
  }

  function clearForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function hydrateSubjectFields(subjectId: number): Partial<AnyRow> {
    const s = subjects.find(
      (x) => num(x.subjectId ?? x.pk_subject_id) === subjectId,
    );
    if (!s) return {};
    return {
      subjectId,
      subjectCode: safe(s.subjectCode),
      subjectName: safe(s.subjectName),
      subjecttypeId: num(s.subjectTypeId ?? s.subjecttypeId),
      subjecttypeCode: safe(s.subjecttypeCode ?? s.subjectTypeName),
      credits: num(s.subCredits),
    };
  }

  function buildRowFromForm(current?: AnyRow): AnyRow | null {
    if (!form.subjectId) return null;
    const fromSubject = hydrateSubjectFields(form.subjectId);
    if (!fromSubject.subjectId) return null;
    return {
      ...current,
      ...fromSubject,
      lectures: toNumberOrNull(form.lectures),
      tutorials: toNumberOrNull(form.tutorials),
      practicals: toNumberOrNull(form.practicals),
      internalmarks: toNumberOrNull(form.internalmarks),
      externalmarks: toNumberOrNull(form.externalmarks),
      finalIntPercentage: toNumberOrNull(form.finalIntPercentage),
      finalExtPercentage: toNumberOrNull(form.finalExtPercentage),
      passPercentage: toNumberOrNull(form.passPercentage),
      externalPassPercentage: toNumberOrNull(form.externalPassPercentage),
      credits: toNumberOrNull(form.credits) ?? num(fromSubject.credits),
      courseYearId: context.courseYearId,
      regulationId: context.regulationId,
      courseGroupId: context.courseGroupId,
      isActive: true,
    };
  }

  function onAddOrUpdate() {
    if (!form.subjectId) {
      toastInfo("Subject Code and Subject Name not be Empty.");
      return;
    }
    const row = buildRowFromForm(
      rows.find((x) => num(x.subjectId) === editingId),
    );
    if (!row) return;
    if (!editingId) {
      const duplicate = rows.some(
        (x) => num(x.subjectId) === num(row.subjectId),
      );
      if (duplicate) {
        toastInfo("Subject Already Present in Subject List.");
        return;
      }
      setRows((prev) => [...prev, row]);
      clearForm();
      return;
    }
    setRows((prev) =>
      prev.map((x) => (num(x.subjectId) === editingId ? row : x)),
    );
    clearForm();
  }

  function onEdit(row: AnyRow) {
    setEditingId(num(row.subjectId));
    setForm({
      subjectId: num(row.subjectId),
      lectures: safe(row.lectures),
      tutorials: safe(row.tutorials),
      practicals: safe(row.practicals),
      internalmarks: safe(row.internalmarks),
      externalmarks: safe(row.externalmarks),
      finalIntPercentage: safe(row.finalIntPercentage),
      finalExtPercentage: safe(row.finalExtPercentage),
      passPercentage: safe(row.passPercentage),
      externalPassPercentage: safe(row.externalPassPercentage),
      credits: safe(row.credits),
    });
  }

  function onDelete(row: AnyRow) {
    setRows((prev) =>
      prev.filter((x) => num(x.subjectId) !== num(row.subjectId)),
    );
    if (num(row.groupyrRegDetailId)) setRemovedRows((prev) => [...prev, row]);
    if (editingId && editingId === num(row.subjectId)) clearForm();
  }

  async function onSave() {
    setSaving(true);
    try {
      for (const row of removedRows) {
        if (num(row.groupyrRegDetailId)) {
          // eslint-disable-next-line no-await-in-loop
          await softDeleteGroupYearRegulationDetail(
            num(row.groupyrRegDetailId),
          );
        }
      }
      if (rows.length > 0) await saveGroupYearRegulationSubjects(rows);
      await loadRows();
      toastSuccess("Subjects saved successfully.");
    } catch {
      toastError("Failed to save subjects. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      BASE_COLS.siNo,
      // Angular displayedColumns: subjectName then subjectCode
      BASE_COLS.subjectName,
      BASE_COLS.subjectCode,
      BASE_COLS.subjectType,
      BASE_COLS.lectures,
      BASE_COLS.tutorials,
      BASE_COLS.practicals,
      BASE_COLS.internal,
      BASE_COLS.external,
      BASE_COLS.finalIntPercentage,
      BASE_COLS.finalExtPercentage,
      BASE_COLS.passPercentage,
      BASE_COLS.externalPassPercentage,
      BASE_COLS.credits,
      {
        ...BASE_COLS.actions,
        cellRenderer: makeActionsRenderer(onEdit, onDelete),
      },
    ],
    [editingId, rows],
  );

  return (
    <>
      <FilteredListPage
        title="University Curriculum Regulation Subjects"
        filterTitle="Add Regulation Subject"
        notice={
          <div className="flex items-center justify-between rounded bg-[#edf0f3] px-2 p-1.5 text-[15px]">
            <strong className="font-medium text-primary">
              University Curriculum Regulation Subjects
            </strong>
            <div className="font-medium text-muted-foreground">
              {context.universityName} / {context.courseName} /{" "}
              {context.groupName} / {context.courseYearName} /{" "}
              {context.regulationName}
            </div>
          </div>
        }
        filters={
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[13px] font-medium text-red-600 hover:underline"
                onClick={() => setSubjectModalOpen(true)}
              >
                + New Subject
              </button>
            </div>
            <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Select
                label="Subject Code"
                value={form.subjectId ? String(form.subjectId) : null}
                onChange={(v) => selectSubject(v ? Number(v) : null)}
                options={subjectCodeOptions}
                placeholder="Subject Code"
                searchable
                clearable
              />
              <Select
                label="Subject Name"
                value={form.subjectId ? String(form.subjectId) : null}
                onChange={(v) => selectSubject(v ? Number(v) : null)}
                options={subjectNameOptions}
                placeholder="Subject Name"
                searchable
                clearable
              />
              <Input
                placeholder="Lectures *"
                type="number"
                value={form.lectures}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lectures: e.target.value }))
                }
              />
              <Input
                placeholder="Tutorials *"
                type="number"
                value={form.tutorials}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tutorials: e.target.value }))
                }
              />
              <Input
                placeholder="Practicals"
                type="number"
                value={form.practicals}
                onChange={(e) =>
                  setForm((p) => ({ ...p, practicals: e.target.value }))
                }
              />
              <Input
                placeholder="Internal Marks"
                type="number"
                value={form.internalmarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, internalmarks: e.target.value }))
                }
              />
              <Input
                placeholder="External Marks"
                type="number"
                value={form.externalmarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, externalmarks: e.target.value }))
                }
              />
              <Input
                placeholder="Final Int Percentage"
                type="number"
                value={form.finalIntPercentage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, finalIntPercentage: e.target.value }))
                }
              />
              <Input
                placeholder="Final Ext Percentage"
                type="number"
                value={form.finalExtPercentage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, finalExtPercentage: e.target.value }))
                }
              />
              <Input
                placeholder="Pass Percentage"
                type="number"
                value={form.passPercentage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, passPercentage: e.target.value }))
                }
              />
              <Input
                placeholder="External Pass Percentage"
                type="number"
                value={form.externalPassPercentage}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    externalPassPercentage: e.target.value,
                  }))
                }
              />
              <Input
                placeholder="Credits *"
                type="number"
                value={form.credits}
                onChange={(e) =>
                  setForm((p) => ({ ...p, credits: e.target.value }))
                }
              />
              <div className="flex items-center justify-end gap-2 lg:col-span-6 xl:col-span-1">
                <Button
                  type="button"
                  className={SAVE_BTN}
                  onClick={onAddOrUpdate}
                >
                  {editingId ? "Update" : "Add"}
                </Button>
                <Button type="button" className={BACK_BTN} onClick={clearForm}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{ search: true, searchPlaceholder: "Search subjects..." }}
        pagination
        paginationPageSize={10}
        fitColumnsToWidth={false}
        autoHeight={false}
      />

      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          className={BACK_BTN}
          onClick={() => {
            // Angular goBack — restore University Curriculum filters via queryParams
            const params = new URLSearchParams();
            if (context.universityId)
              params.set("universityId", String(context.universityId));
            if (context.courseId)
              params.set("courseId", String(context.courseId));
            if (context.courseGroupId)
              params.set("courseGroupId", String(context.courseGroupId));
            if (context.regulationId)
              params.set("regulationId", String(context.regulationId));
            const qs = params.toString();
            router.push(
              qs
                ? `/academics/university-curriculum?${qs}`
                : "/academics/university-curriculum",
            );
          }}
        >
          Back
        </Button>
        <Button
          type="button"
          className={SAVE_BTN}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {context.courseId ? (
        <AddCurriculumSubjectModal
          open={subjectModalOpen}
          onClose={() => setSubjectModalOpen(false)}
          universityId={context.universityId}
          courseId={context.courseId}
          existingRows={subjects}
          onSaved={async () => {
            const list = await listSubjectsByCourse(context.courseId).catch(
              () => subjects,
            );
            setSubjects(list);
          }}
        />
      ) : null}
    </>
  );
}
