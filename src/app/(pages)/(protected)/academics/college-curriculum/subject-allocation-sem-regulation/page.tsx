"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listMapRegulationSubjects,
  listRegulationsByCourse,
  listSubjectRegulationsByRegulation,
  listGroupSections,
  listSubjectsByCourse,
  saveSubjectRegulations,
  updateSubjectRegulations,
} from "@/services";

type AnyRow = Record<string, any>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safe(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

const COLS = {
  siNo: {
    headerName: "S.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    minWidth: 70,
    maxWidth: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    minWidth: 130,
    flex: 1,
  },
  subjectName: {
    field: "subjectName",
    headerName: "Subject Name",
    minWidth: 220,
    flex: 1.2,
  },
  subjectTypeName: {
    field: "subjectTypeName",
    headerName: "Subject Type",
    minWidth: 140,
    flex: 1,
  },
  subCreditHrs: {
    field: "subCreditHrs",
    headerName: "Credits",
    minWidth: 100,
    maxWidth: 120,
    flex: 0,
  } as ColDef<AnyRow>,
  noExams: {
    field: "noExams",
    headerName: "No Exam",
    minWidth: 90,
    maxWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
  regulationName: {
    field: "regulationName",
    headerName: "Regulation",
    minWidth: 130,
    flex: 1,
  },
  stdReg: {
    field: "isIncludeInStdReg",
    headerName: "Std Reg Subject",
    minWidth: 130,
    maxWidth: 150,
    flex: 0,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    maxWidth: 100,
    flex: 0,
  } as ColDef<AnyRow>,
};

function makeDeleteRenderer(onDelete: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50"
      onClick={() => p.data && onDelete(p.data)}
      aria-label="Remove subject"
    >
      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
    </button>
  );
}
function makeNoExamRenderer(onToggle: (row: AnyRow, checked: boolean) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <input
        type="checkbox"
        checked={Boolean(row.noExams)}
        onChange={(e) => onToggle(row, e.target.checked)}
      />
    );
  };
}
function stdRegRenderer(p: ICellRendererParams<AnyRow>) {
  return <span>{p.data?.isIncludeInStdReg ? "Yes" : "No"}</span>;
}

/** Angular addSubjects builds subjectCourseyears with this field set only. */
function buildSubjectCourseyearFromSection(
  sec: AnyRow,
  subject: AnyRow,
  collegeId: number,
): AnyRow {
  return {
    academicYear: sec.academicYear,
    academicYearId: sec.academicYearId,
    collegeCode: sec.collegeCode,
    collegeId,
    collegeName: sec.collegeName,
    courseGroupId: sec.courseGroupId,
    courseYearCode: sec.courseYearCode,
    courseYearId: sec.courseYearId,
    courseYearName: sec.courseYearName,
    creditHours: subject.subCreditHrs,
    groupCode: sec.groupCode,
    groupName: sec.groupName,
    groupSectionId: sec.groupSectionId,
    isActive: true,
    maxWeeklyClasses: subject.subCreditHrs,
    noExams: Boolean(subject.noExams),
    preferConsecutive: null,
    reason: sec.reason ?? null,
    section: sec.section,
    sortOrder: sec.sortOrder,
    subjectId: subject.subjectId,
  };
}

export default function SubjectAllocationSemRegulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => ({
      universityId: num(searchParams.get("universityId")),
      collegeId: num(searchParams.get("collegeId")),
      collegeName: safe(searchParams.get("collegeName")),
      courseId: num(searchParams.get("courseId")),
      courseName: safe(searchParams.get("courseName")),
      courseGroupId: num(searchParams.get("courseGroupId")),
      groupName: safe(searchParams.get("groupName")),
      courseYearId: num(searchParams.get("courseYearId")),
      courseYearName: safe(searchParams.get("courseYearName")),
      academicYearId: num(searchParams.get("academicYearId")),
      academicYear: safe(searchParams.get("academicYear")),
      regulationId: num(searchParams.get("regulationId")),
    }),
    [searchParams],
  );

  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [regulationId, setRegulationId] = useState<number | null>(
    params.regulationId || null,
  );
  const [saving, setSaving] = useState(false);
  const [mapPanelOpen, setMapPanelOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mapRows, setMapRows] = useState<AnyRow[]>([]);

  async function loadSubjectRegulations(regId: number) {
    const list = await listSubjectRegulationsByRegulation({
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: regId,
    }).catch(() => []);
    const normalized = list.map((x) => ({
      ...x,
      subjectTypeName: x.subjectTypeName ?? x.subjecttypeName,
      subCreditHrs:
        x.subjectCourseyears?.[0]?.creditHours ?? x.subCreditHrs ?? "",
      noExams: x.subjectCourseyears?.[0]?.noExams ?? x.noExams ?? false,
    }));
    setRows(normalized);
  }

  useEffect(() => {
    if (!params.courseId) return;
    let cancelled = false;
    void (async () => {
      try {
        const regs = await listRegulationsByCourse(params.courseId);
        if (cancelled) return;
        setRegulations(regs);

        const subj = await listSubjectsByCourse(params.courseId);
        if (cancelled) return;
        setSubjects(subj);

        const sec =
          params.courseYearId && params.academicYearId && params.courseGroupId
            ? await listGroupSections(
                params.courseYearId,
                params.academicYearId,
                params.courseGroupId,
              ).catch(() => [])
            : [];
        if (cancelled) return;
        setSections(sec);
      } catch {
        if (!cancelled) {
          setRegulations([]);
          setSubjects([]);
          setSections([]);
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    params.courseId,
    params.courseYearId,
    params.academicYearId,
    params.courseGroupId,
    params.collegeId,
  ]);

  useEffect(() => {
    if (!regulationId) {
      setRows([]);
      return;
    }
    void loadSubjectRegulations(regulationId);
  }, [
    regulationId,
    params.collegeId,
    params.academicYearId,
    params.courseGroupId,
    params.courseYearId,
  ]);

  const regulationCode = useMemo(() => {
    const r = regulations.find(
      (x) => num(x.regulationId ?? x.pk_regulation_id) === (regulationId ?? 0),
    );
    return safe(r?.regulationCode ?? r?.regulationName);
  }, [regulations, regulationId]);
  const regulationOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.regulationId ?? r.pk_regulation_id)),
        label: safe(r.regulationCode ?? r.regulationName),
      })),
    [regulations],
  );

  /**
   * Angular deleteSubject(item, index):
   * sets isActive=false, removes from table, then immediately
   * PUT subjectregulations with [item] (crudService.update).
   * On success → selectedRegulation() reload.
   */
  async function deleteRow(row: AnyRow) {
    setRows((prev) =>
      prev.filter(
        (x) =>
          !(
            num(x.subjectId) === num(row.subjectId) &&
            num(x.regulationId) === num(row.regulationId)
          ),
      ),
    );
    try {
      await updateSubjectRegulations([{ ...row, isActive: false }]);
      toastSuccess("Subject removed successfully.");
      if (regulationId) await loadSubjectRegulations(regulationId);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to remove subject.");
      if (regulationId) await loadSubjectRegulations(regulationId);
    }
  }
  function toggleNoExam(row: AnyRow, checked: boolean) {
    setRows((prev) =>
      prev.map((x) => (x === row ? { ...x, noExams: checked } : x)),
    );
  }

  /** Angular addSubjects() after Confirm Ok — build payload then POST. */
  async function confirmSave() {
    if (!regulationId) return;
    setSaving(true);
    try {
      // Angular addSubjects: only NEW rows get ids + subjectCourseyears rebuilt;
      // existing rows are posted as loaded from GET.
      const payload: AnyRow[] = rows.map((row) => {
        if (row.subjectRegulationId) {
          const existingCourseYears = Array.isArray(row.subjectCourseyears)
            ? row.subjectCourseyears.map((cy: AnyRow) => ({
                ...cy,
                noExams: Boolean(row.noExams),
              }))
            : [];
          const {
            subjectTypeName: _uiType,
            subCreditHrs: _uiCredits,
            ...rest
          } = row;
          return {
            ...rest,
            subjecttypeName: row.subjecttypeName ?? row.subjectTypeName,
            subjectCourseyears: existingCourseYears,
          };
        }
        return {
          subjectId: row.subjectId,
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          subjecttypeName: row.subjectTypeName ?? row.subjecttypeName,
          subjectCredits: row.subCreditHrs,
          isIncludeInStdReg: Boolean(row.isIncludeInStdReg),
          regulationId,
          regulationName: row.regulationName ?? regulationCode,
          noExams: Boolean(row.noExams),
          isActive: true,
          academicYearId: params.academicYearId,
          courseYearId: params.courseYearId,
          courseGroupId: params.courseGroupId,
          collegeId: params.collegeId,
          subjectCourseyears: sections.map((sec) =>
            buildSubjectCourseyearFromSection(sec, row, params.collegeId),
          ),
        };
      });

      // Soft-deletes are handled immediately on X (Angular deleteSubject → PUT),
      // not deferred to Save.
      await saveSubjectRegulations(payload);
      await loadSubjectRegulations(regulationId);
      setConfirmOpen(false);
      toastSuccess("Record(s) added successfully!");
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function openMapModal() {
    if (!regulationId) return;
    const mapped = await listMapRegulationSubjects({
      universityId: params.universityId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId,
    }).catch(() => []);
    setMapRows(mapped.map((x) => ({ ...x, checked: false })));
    setMapModalOpen(true);
  }

  function addMappedSubjects() {
    const selected = mapRows.filter((x) => Boolean(x.checked));
    if (selected.length === 0) {
      setMapModalOpen(false);
      return;
    }
    setRows((prev) => {
      const next = [...prev];
      for (const item of selected) {
        const sid = num(item.subjectId);
        if (next.some((x) => num(x.subjectId) === sid)) continue;
        const master = subjects.find((s) => num(s.subjectId) === sid);
        next.push({
          subjectId: sid,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          subjectTypeName: item.subjecttypeName ?? item.subjectTypeName,
          subCreditHrs:
            master?.subCreditHrs ?? item.subCreditHrs ?? item.subCredits ?? "",
          isIncludeInStdReg: Boolean(item.checked),
          regulationId,
          regulationName: item.regulationName ?? regulationCode,
          noExams: false,
          isActive: true,
        });
      }
      return next;
    });
    setMapModalOpen(false);
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COLS.siNo,
      COLS.subjectCode,
      COLS.subjectName,
      COLS.subjectTypeName,
      COLS.subCreditHrs,
      { ...COLS.noExams, cellRenderer: makeNoExamRenderer(toggleNoExam) },
      COLS.regulationName,
      { ...COLS.stdReg, cellRenderer: stdRegRenderer },
      { ...COLS.actions, cellRenderer: makeDeleteRenderer(deleteRow) },
    ],
    [rows],
  );

  const associationTitle = `Course Year Subject Association (${params.collegeName} / ${params.academicYear} / ${params.courseName} / ${params.groupName} / ${params.courseYearName})`;

  return (
    <>
      <FilteredListPage
        title="Course Year Subject Association"
        filtersCollapsible={false}
        filters={
          <div className="space-y-3 pb-2">
            {/* Below page heading — association context cards */}
            <div className="rounded border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-[13px] font-semibold text-[hsl(var(--primary))]">
              {associationTitle}
            </div>
            <div className="grid grid-cols-1 gap-2 rounded border border-border px-3 py-2 text-[13px] md:grid-cols-2">
              <p>
                <span className="font-medium">Course :</span>{" "}
                {params.collegeName} / {params.courseName} / {params.groupName}
              </p>
              <p className="md:text-right">
                <span className="font-medium">Academic Year :</span>{" "}
                {params.academicYear}
              </p>
            </div>

            {/* Single collapsible card — header + regulation field + button */}
            <div className="overflow-hidden rounded border border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-sm font-semibold text-[hsl(var(--primary))]"
                onClick={() => setMapPanelOpen((s) => !s)}
                aria-expanded={mapPanelOpen}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>+</span> Map Regulation Subject
                </span>
                {mapPanelOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                )}
              </button>
              {mapPanelOpen ? (
                <div className="grid grid-cols-1 items-end gap-3 border-t border-border bg-card px-3 py-3 md:grid-cols-3">
                  <Select
                    label="Regulation *"
                    value={regulationId ? String(regulationId) : null}
                    onChange={(v) => setRegulationId(v ? Number(v) : null)}
                    options={regulationOptions}
                    placeholder="Select regulation"
                    searchable
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => void openMapModal()}
                      disabled={!regulationId}
                    >
                      + Map Regulation Subjects
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        toolbar={{ search: true, searchPlaceholder: "Search subjects..." }}
        pagination
        paginationPageSize={10}
      />

      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push("/academics/college-curriculum/subject-allocation")
          }
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={saving || !regulationId}
        >
          Save
        </Button>
      </div>

      {/* Angular ConfirmRegulationComponent — API only after Ok */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmation of Regulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 rounded border border-border px-3 py-3 text-[13px]">
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <span className="font-medium">College :</span>
              <span>
                {params.collegeName} / {params.academicYear}
              </span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <span className="font-medium">course Details :</span>
              <span>
                {params.courseName} / {params.groupName} /{" "}
                {params.courseYearName}
              </span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-2 items-center">
              <span className="font-medium">Regulation :</span>
              <span className="inline-block rounded bg-[#e2e6ff] px-2.5 py-0.5 text-[15px] font-medium">
                {regulationCode || "—"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSave()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Ok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Regulations</DialogTitle>
          </DialogHeader>
          <div className="app-card p-0 overflow-hidden">
            <DataTable
              rowData={mapRows}
              columnDefs={[
                {
                  headerName: "SI.No",
                  valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
                  minWidth: 70,
                  maxWidth: 80,
                  flex: 0,
                },
                {
                  field: "subjectCode",
                  headerName: "Subject Code",
                  minWidth: 140,
                  flex: 1,
                },
                {
                  field: "subjectName",
                  headerName: "Subject Name",
                  minWidth: 260,
                  flex: 1.4,
                },
                {
                  headerName: "Add Subject",
                  minWidth: 130,
                  flex: 0,
                  cellRenderer: (p: ICellRendererParams<AnyRow>) => (
                    <input
                      type="checkbox"
                      checked={Boolean(p.data?.checked)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const sid = num(p.data?.subjectId);
                        setMapRows((prev) =>
                          prev.map((r) =>
                            num(r.subjectId) === sid ? { ...r, checked } : r,
                          ),
                        );
                      }}
                    />
                  ),
                },
              ]}
              toolbar={{
                search: true,
                searchPlaceholder: "Search subjects...",
                exportExcel: false,
                exportPdf: false,
              }}
              pagination
              paginationPageSize={10}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapModalOpen(false)}>
              Close
            </Button>
            <Button onClick={addMappedSubjects}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
