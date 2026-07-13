"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { BookMarked, ChevronDown, Filter, Pencil } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { FilterCard, FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  addUnivEcCollegeDetails,
  getExamCenterByCodeRows,
  updateInActiveUnivEcCollegeDetails,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function makeEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    if (!p.data) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-blue-700"
        onClick={() => onEdit(p.data!)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    );
  };
}

export default function ExamCenterCoursesPage() {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingRegulations, setLoadingRegulations] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [centerExamGroupRows, setCenterExamGroupRows] = useState<Row[]>([]);
  const [regulationRows, setRegulationRows] = useState<Row[]>([]);
  const [groupSubjectRows, setGroupSubjectRows] = useState<Row[]>([]);
  const [existsRows, setExistsRows] = useState<Row[]>([]);
  const [subjectRows, setSubjectRows] = useState<Row[]>([]);

  const [groupSearch, setGroupSearch] = useState("");
  const [yearSearch, setYearSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showSections, setShowSections] = useState(false);

  const [form, setForm] = useState({
    univExamcenterId: "",
    univEcCollegeId: "",
    examGroupId: "",
    regulationId: "",
    courseGroupId: "",
    courseYearId: "",
  });

  const [selectedSubjects, setSelectedSubjects] = useState<Row[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ isActive: true, reason: "" });

  const centers = useMemo(() => {
    const byId = dedupeBy(centerExamGroupRows, (r) => num(r.fk_univ_ec_id));
    return byId.filter((r) => num(r.fk_univ_ec_id) > 0);
  }, [centerExamGroupRows]);
  const centerColleges = useMemo(
    () =>
      dedupeBy(
        centerExamGroupRows.filter(
          (r) => num(r.fk_univ_ec_id) === Number(form.univExamcenterId),
        ),
        (r) => num(r.fk_college_id),
      ),
    [centerExamGroupRows, form.univExamcenterId],
  );
  const examGroups = useMemo(
    () =>
      dedupeBy(
        centerExamGroupRows.filter(
          (r) =>
            num(r.fk_univ_ec_id) === Number(form.univExamcenterId) &&
            num(r.fk_college_id) === Number(form.univEcCollegeId),
        ),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [centerExamGroupRows, form.univExamcenterId, form.univEcCollegeId],
  );
  const regulations = useMemo(
    () => dedupeBy(regulationRows, (r) => num(r.fk_regulation_id)),
    [regulationRows],
  );

  const courseGroups = useMemo(
    () => dedupeBy(groupSubjectRows, (r) => num(r.fk_course_group_id)),
    [groupSubjectRows],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        groupSubjectRows.filter(
          (r) => num(r.fk_course_group_id) === Number(form.courseGroupId),
        ),
        (r) => num(r.fk_course_year_id),
      ),
    [groupSubjectRows, form.courseGroupId],
  );

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.fk_univ_ec_id)),
        label: txt(c.examcenter_code),
      })),
    [centers],
  );
  const collegeOptions: SelectOption[] = useMemo(
    () =>
      centerColleges.map((c) => ({
        value: String(num(c.fk_college_id)),
        label: txt(c.college_code),
      })),
    [centerColleges],
  );
  const regulationOptions: SelectOption[] = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code),
      })),
    [regulations],
  );
  const examGroupOptions: SelectOption[] = useMemo(
    () =>
      examGroups.map((g) => ({
        value: String(num(g.fk_univ_exam_group_id)),
        label: txt(g.exam_group_code),
      })),
    [examGroups],
  );

  const filteredSubjectRows = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjectRows;
    return subjectRows.filter((r) =>
      `${txt(r.subject_code)} ${txt(r.subject_name)}`.toLowerCase().includes(q),
    );
  }, [subjectRows, subjectSearch]);
  const filteredCourseYears = useMemo(() => {
    const q = yearSearch.trim().toLowerCase();
    if (!q) return courseYears;
    return courseYears.filter((y) =>
      txt(y.course_year_code).toLowerCase().includes(q),
    );
  }, [courseYears, yearSearch]);
  const filteredCourseGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return courseGroups;
    return courseGroups.filter((g) =>
      txt(g.group_code).toLowerCase().includes(q),
    );
  }, [courseGroups, groupSearch]);
  const headerText = useMemo(() => {
    const ec = centers.find(
      (x) => num(x.fk_univ_ec_id) === Number(form.univExamcenterId),
    );
    const clg = centerColleges.find(
      (x) => num(x.fk_college_id) === Number(form.univEcCollegeId),
    );
    const eg = examGroups.find(
      (x) => num(x.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    const reg = regulations.find(
      (x) => num(x.fk_regulation_id) === Number(form.regulationId),
    );
    return `${txt(ec?.examcenter_code)} / ${txt(clg?.college_code)} / ${txt(eg?.exam_group_code)} / ${txt(reg?.regulation_code)}`;
  }, [centers, centerColleges, examGroups, regulations, form]);

  const tableColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Course Group",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.group_code),
      },
      {
        headerName: "Course Year",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Subject",
        minWidth: 260,
        valueGetter: (p) =>
          `${txt(p.data?.subject_name)} (${txt(p.data?.subject_code)})`,
      },
      {
        headerName: "Actions",
        width: 80,
        flex: 0,
        cellRenderer: makeEditRenderer((row) => {
          setEditRow(row);
          setEditForm({
            isActive: row?.isActive === true,
            reason: txt(row?.reason),
          });
          setEditOpen(true);
        }),
      },
    ],
    [],
  );

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const rows = await getExamCenterByCodeRows({
        flag: "college_center_exam_group_filters",
      });
      setCenterExamGroupRows(rows);
    } catch (e) {
      toastError(e, "Failed to load filters");
      setCenterExamGroupRows([]);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    const v = centerOptions[0]?.value ?? "";
    if (!form.univExamcenterId && v) {
      setForm((f) => ({ ...f, univExamcenterId: v }));
    }
  }, [centerOptions, form.univExamcenterId]);

  useEffect(() => {
    const college = collegeOptions[0]?.value ?? "";
    setForm((f) => {
      if (!f.univExamcenterId) return f;
      if (
        f.univEcCollegeId &&
        collegeOptions.some((o) => o.value === f.univEcCollegeId)
      ) {
        return f;
      }
      return {
        ...f,
        univEcCollegeId: college,
        examGroupId: "",
        regulationId: "",
        courseGroupId: "",
        courseYearId: "",
      };
    });
  }, [collegeOptions]);

  useEffect(() => {
    const examGroup = examGroupOptions[0]?.value ?? "";
    setForm((f) => {
      if (!f.univEcCollegeId) return f;
      if (
        f.examGroupId &&
        examGroupOptions.some((o) => o.value === f.examGroupId)
      ) {
        return f;
      }
      return {
        ...f,
        examGroupId: examGroup,
        regulationId: "",
      };
    });
  }, [form.univEcCollegeId, examGroupOptions]);

  const loadRegulations = useCallback(async () => {
    if (!form.univExamcenterId || !form.univEcCollegeId || !form.examGroupId) {
      setRegulationRows([]);
      return;
    }
    setLoadingRegulations(true);
    try {
      const rows = await getExamCenterByCodeRows({
        flag: "exam_center_clg_filters",
        univExamcenterId: Number(form.univExamcenterId),
        collegeId: Number(form.univEcCollegeId),
        examGroupId: Number(form.examGroupId),
      });
      setRegulationRows(rows.filter((r) => num(r.fk_regulation_id) > 0));
    } catch (e) {
      toastError(e, "Failed to load regulations");
      setRegulationRows([]);
    } finally {
      setLoadingRegulations(false);
    }
  }, [form.univExamcenterId, form.univEcCollegeId, form.examGroupId]);

  useEffect(() => {
    void loadRegulations();
  }, [loadRegulations]);

  useEffect(() => {
    const reg = regulationOptions[0]?.value ?? "";
    setForm((f) => {
      if (!f.examGroupId) return f;
      if (
        f.regulationId &&
        regulationOptions.some((o) => o.value === f.regulationId)
      ) {
        return f;
      }
      return { ...f, regulationId: reg };
    });
  }, [form.examGroupId, regulationOptions]);

  useEffect(() => {
    setShowSections(false);
    setGroupSubjectRows([]);
    setExistsRows([]);
    setSubjectRows([]);
    setSelectedSubjects([]);
  }, [
    form.univExamcenterId,
    form.univEcCollegeId,
    form.examGroupId,
    form.regulationId,
  ]);

  async function onGetList() {
    if (
      !form.univExamcenterId ||
      !form.univEcCollegeId ||
      !form.examGroupId ||
      !form.regulationId
    ) {
      toastError("Select all filters.");
      return;
    }
    setLoadingList(true);
    try {
      const rows = await getExamCenterByCodeRows({
        flag: "ec_grp_yr_subjects",
        univExamcenterId: Number(form.univExamcenterId),
        collegeId: Number(form.univEcCollegeId),
        examGroupId: Number(form.examGroupId),
        courseGroupId: 0,
        courseYearId: 0,
        regulationId: Number(form.regulationId),
      });
      setGroupSubjectRows(rows);
      const exists = rows.filter((r) => num(r.row_exists) !== 0);
      setExistsRows(exists);
      setCourseGroupDefault(rows);
      setShowSections(true);
    } catch (e) {
      toastError(e, "Failed to get list");
      setShowSections(false);
      setGroupSubjectRows([]);
      setExistsRows([]);
      setSubjectRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function setCourseGroupDefault(rows: Row[]) {
    const groups = dedupeBy(rows, (r) => num(r.fk_course_group_id));
    const firstGroup = groups[0];
    const groupId = num(firstGroup?.fk_course_group_id);
    if (!groupId) {
      setForm((f) => ({ ...f, courseGroupId: "", courseYearId: "" }));
      setSubjectRows([]);
      return;
    }
    const years = dedupeBy(
      rows.filter((r) => num(r.fk_course_group_id) === groupId),
      (r) => num(r.fk_course_year_id),
    );
    const firstYear = num(years[0]?.fk_course_year_id);
    setForm((f) => ({
      ...f,
      courseGroupId: String(groupId),
      courseYearId: firstYear ? String(firstYear) : "",
    }));
    const subjects = dedupeBy(
      rows.filter(
        (r) =>
          num(r.fk_course_group_id) === groupId &&
          num(r.fk_course_year_id) === firstYear,
      ),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }));
    setSubjectRows(subjects);
    setSelectedSubjects([]);
    setGroupSearch("");
    setYearSearch("");
    setSubjectSearch("");
  }

  function onSelectCourseGroup(valueArg: string | null) {
    const value = valueArg ?? "";
    const groupId = Number(value);
    const years = dedupeBy(
      groupSubjectRows.filter((r) => num(r.fk_course_group_id) === groupId),
      (r) => num(r.fk_course_year_id),
    );
    const firstYear = num(years[0]?.fk_course_year_id);
    setForm((f) => ({
      ...f,
      courseGroupId: value,
      courseYearId: firstYear ? String(firstYear) : "",
    }));
    const subjects = dedupeBy(
      groupSubjectRows.filter(
        (r) =>
          num(r.fk_course_group_id) === groupId &&
          num(r.fk_course_year_id) === firstYear,
      ),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }));
    setSubjectRows(subjects);
    setSelectedSubjects([]);
  }

  function onSelectCourseYear(valueArg: string | null) {
    const value = valueArg ?? "";
    const groupId = Number(form.courseGroupId);
    const yearId = Number(value);
    setForm((f) => ({ ...f, courseYearId: value }));
    const subjects = dedupeBy(
      groupSubjectRows.filter(
        (r) =>
          num(r.fk_course_group_id) === groupId &&
          num(r.fk_course_year_id) === yearId,
      ),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }));
    setSubjectRows(subjects);
    setSelectedSubjects([]);
  }

  function toggleSubject(subjectId: number, checked: boolean) {
    setSubjectRows((rows) =>
      rows.map((r) =>
        num(r.fk_subject_id) === subjectId ? { ...r, checked } : r,
      ),
    );
    const subject = subjectRows.find((r) => num(r.fk_subject_id) === subjectId);
    if (!subject || num(subject.row_exists) !== 0) return;
    if (checked) {
      setSelectedSubjects((arr) => {
        if (arr.some((s) => num(s.subjectId) === subjectId)) return arr;
        return [
          ...arr,
          {
            univEcCollegeId:
              centerColleges.find(
                (x) => num(x.fk_college_id) === Number(form.univEcCollegeId),
              )?.fk_univ_ec_college_id ?? 0,
            courseGroupId: Number(form.courseGroupId),
            courseYearId: Number(form.courseYearId),
            regulationId: Number(form.regulationId),
            subjectId,
          },
        ];
      });
    } else {
      setSelectedSubjects((arr) =>
        arr.filter((s) => num(s.subjectId) !== subjectId),
      );
    }
  }

  async function onAssign() {
    if (!selectedSubjects.length) {
      toastError("Please select subjects.");
      return;
    }
    setAssigning(true);
    try {
      await addUnivEcCollegeDetails(selectedSubjects);
      toastSuccess("Subjects assigned.");
      setSelectedSubjects([]);
      await onGetList();
    } catch (e) {
      toastError(e, "Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  async function onSaveEdit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!editRow) return;
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError("Reason is required when inactive.");
      return;
    }
    try {
      await updateInActiveUnivEcCollegeDetails({
        ...editRow,
        isActive: editForm.isActive,
        reason: editForm.isActive ? "" : editForm.reason.trim(),
      });
      toastSuccess("Updated.");
      setEditOpen(false);
      await onGetList();
    } catch (err) {
      toastError(err, "Update failed");
    }
  }

  return (
    <PageContainer className="space-y-4">
      <FilterCard title="Exam Center Courses/Groups/Years/Subjects">
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Center</Label>
            <Select
              options={centerOptions}
              value={form.univExamcenterId}
              onChange={(v) =>
                setForm((f) => ({ ...f, univExamcenterId: v ?? "" }))
              }
              disabled={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Center Colleges</Label>
            <Select
              options={collegeOptions}
              value={form.univEcCollegeId}
              onChange={(v) =>
                setForm((f) => ({ ...f, univEcCollegeId: v ?? "" }))
              }
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Group</Label>
            <Select
              options={examGroupOptions}
              value={form.examGroupId}
              onChange={(v) => setForm((f) => ({ ...f, examGroupId: v ?? "" }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Regulation</Label>
            <Select
              options={regulationOptions}
              value={form.regulationId}
              onChange={(v) =>
                setForm((f) => ({ ...f, regulationId: v ?? "" }))
              }
              disabled={loadingRegulations}
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Button
              type="button"
              onClick={() => void onGetList()}
              disabled={loadingList}
            >
              Get List
            </Button>
          </div>
        </div>
      </FilterCard>

      {showSections && (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
              Exam Center Subjects - {headerText}
            </h3>
          </div>
          <div className="app-card p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-3 border rounded-md p-2">
                <Input
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search..."
                  className="mb-2 h-8"
                />
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[56px]">Select</th>
                        <th className="text-left py-1">Course Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourseGroups.map((g) => {
                        const id = String(num(g.fk_course_group_id));
                        return (
                          <tr key={id} className="border-b">
                            <td className="py-1">
                              <input
                                type="radio"
                                name="course-group"
                                checked={form.courseGroupId === id}
                                onChange={() => onSelectCourseGroup(id)}
                              />
                            </td>
                            <td className="py-1">{txt(g.group_code)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:col-span-3 border rounded-md p-2">
                <Input
                  value={yearSearch}
                  onChange={(e) => setYearSearch(e.target.value)}
                  placeholder="Search..."
                  className="mb-2 h-8"
                />
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[56px]">Select</th>
                        <th className="text-left py-1">Course Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourseYears.map((y) => {
                        const id = String(num(y.fk_course_year_id));
                        return (
                          <tr key={id} className="border-b">
                            <td className="py-1">
                              <input
                                type="radio"
                                name="course-year"
                                checked={form.courseYearId === id}
                                onChange={() => onSelectCourseYear(id)}
                              />
                            </td>
                            <td className="py-1">{txt(y.course_year_code)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:col-span-5 border rounded-md p-2">
                <Input
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Search..."
                  className="mb-2 h-8"
                />
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[56px]">Select</th>
                        <th className="text-left py-1">Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjectRows.map((s) => {
                        const subjectId = num(s.fk_subject_id);
                        const exists = num(s.row_exists) !== 0;
                        return (
                          <tr
                            key={subjectId}
                            className={`border-b ${exists ? "bg-amber-50" : ""}`}
                          >
                            <td className="py-1">
                              <Checkbox
                                checked={Boolean((s as AnyRow).checked)}
                                disabled={exists}
                                onCheckedChange={(v) =>
                                  toggleSubject(subjectId, v === true)
                                }
                              />
                            </td>
                            <td className="py-1">
                              {txt(s.subject_code)} - {txt(s.subject_name)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:col-span-1 flex items-end justify-center pb-1">
                <Button
                  size="sm"
                  onClick={() => void onAssign()}
                  disabled={assigning}
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>

          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
              Exam Center Subjects - {headerText}
            </h3>
          </div>
          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={existsRows}
                columnDefs={tableColumnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search…",
                  pdfDocumentTitle: "Exam Center Courses",
                }}
              />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Subject"
        onSubmit={onSaveEdit}
        size="lg"
      >
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Subject:</span>{" "}
            <span className="text-blue-700">
              {txt(editRow?.subject_code)} - {txt(editRow?.subject_name)}
            </span>
          </div>
          <ActiveStatusField
            isActive={editForm.isActive}
            reason={editForm.reason}
            onActiveChange={(v) =>
              setEditForm((f) => ({ ...f, isActive: v === true }))
            }
            onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
          />
        </div>
      </FormModal>
    </PageContainer>
  );
}
