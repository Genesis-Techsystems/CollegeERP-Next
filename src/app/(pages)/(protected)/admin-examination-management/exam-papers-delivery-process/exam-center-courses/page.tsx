"use client";

/**
 * Angular parity: exam-papers-delivery-process/exam-center-courses
 * Filters: Exam Center → Colleges → Exam Group → Regulation → Get List
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  addUnivEcCollegeDetails,
  getExamCenterByCodeGroups,
  getExamCenterClgFiltersForCourses,
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

/** Like Angular map/filter dedupe — keeps first row per key (including 0 / empty). */
function dedupeByKey<T>(rows: T[], keyFn: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Angular always uses `result[0]` (not the first non-empty group). */
function resultGroup0(groups: AnyRow[][]): AnyRow[] {
  return Array.isArray(groups[0]) ? groups[0] : [];
}

function collegeKey(r: Row): string {
  const id = num(r.fk_college_id ?? r.college_id);
  if (id > 0) return `id:${id}`;
  const code = txt(r.college_code);
  if (code) return `code:${code}`;
  return `row:${txt(r.fk_univ_ec_college_id) || txt(r.examcenter_code)}`;
}

/** Angular college dropdown options — rows with a real college id/code only. */
function collegesFromCenterRows(rows: Row[]): Row[] {
  const withCollege = rows.filter(
    (r) =>
      num(r.fk_college_id ?? r.college_id) > 0 || Boolean(txt(r.college_code)),
  );
  return dedupeByKey(withCollege, collegeKey);
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
        aria-label="Edit subject"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    );
  };
}

export default function ExamCenterCoursesPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingRegulations, setLoadingRegulations] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showSections, setShowSections] = useState(false);

  /** Angular `examCenterDetails` — result[0] of college_center_exam_group_filters */
  const [examCenterDetails, setExamCenterDetails] = useState<Row[]>([]);
  const [univExamCenters, setUnivExamCenters] = useState<Row[]>([]);
  const [examCentersCollegesList, setExamCentersCollegesList] = useState<Row[]>(
    [],
  );
  const [examGroups, setExamGroups] = useState<Row[]>([]);
  const [regulations, setRegulations] = useState<Row[]>([]);

  const [univExamcenterId, setUnivExamcenterId] = useState<number | null>(null);
  const [univEcCollegeId, setUnivEcCollegeId] = useState<number | null>(null);
  const [examGroupId, setExamGroupId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [courseGroupSubjectsDetails, setCourseGroupSubjectsDetails] = useState<
    Row[]
  >([]);
  const [courseGroups, setCourseGroups] = useState<Row[]>([]);
  const [courseYears, setCourseYears] = useState<Row[]>([]);
  const [subjectListDetails, setSubjectListDetails] = useState<Row[]>([]);
  const [existsSubjectListDetails, setExistsSubjectListDetails] = useState<
    Row[]
  >([]);
  const [selectedSubjects, setSelectedSubjects] = useState<
    Record<string, unknown>[]
  >([]);

  const [searchText, setSearchText] = useState("");
  const [searchText1, setSearchText1] = useState("");
  const [searchText2, setSearchText2] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ isActive: true, reason: "" });

  const centerOptions: SelectOption[] = useMemo(
    () =>
      univExamCenters.map((c) => ({
        value: String(num(c.fk_univ_ec_id)),
        label: txt(c.examcenter_code),
      })),
    [univExamCenters],
  );
  const collegeOptions: SelectOption[] = useMemo(
    () =>
      examCentersCollegesList
        .map((c) => {
          const id = num(c.fk_college_id ?? c.college_id);
          return {
            value: String(id),
            label: txt(c.college_code) || String(id),
          };
        })
        .filter((o) => o.value !== "0" && o.value !== ""),
    [examCentersCollegesList],
  );
  const examGroupOptions: SelectOption[] = useMemo(
    () =>
      examGroups.map((g) => ({
        value: String(num(g.fk_univ_exam_group_id)),
        label: txt(g.exam_group_code),
      })),
    [examGroups],
  );
  const regulationOptions: SelectOption[] = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code),
      })),
    [regulations],
  );

  const headerText = useMemo(() => {
    const examCenterName = txt(
      univExamCenters.find((x) => num(x.fk_univ_ec_id) === univExamcenterId)
        ?.examcenter_code,
    );
    const examCenterCollege = txt(
      examCentersCollegesList.find(
        (x) => num(x.fk_college_id) === univEcCollegeId,
      )?.college_code,
    );
    const examGroup = txt(
      examGroups.find((x) => num(x.fk_univ_exam_group_id) === examGroupId)
        ?.exam_group_code,
    );
    const regulationCode = txt(
      regulations.find((x) => num(x.fk_regulation_id) === regulationId)
        ?.regulation_code,
    );
    return [examCenterName, examCenterCollege, examGroup, regulationCode]
      .filter(Boolean)
      .join(" / ");
  }, [
    univExamCenters,
    examCentersCollegesList,
    examGroups,
    regulations,
    univExamcenterId,
    univEcCollegeId,
    examGroupId,
    regulationId,
  ]);

  const filteredCourseGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return courseGroups;
    return courseGroups.filter((g) =>
      txt(g.group_code).toLowerCase().includes(q),
    );
  }, [courseGroups, searchText]);

  const filteredCourseYears = useMemo(() => {
    const q = searchText1.trim().toLowerCase();
    if (!q) return courseYears;
    return courseYears.filter((y) =>
      txt(y.course_year_code).toLowerCase().includes(q),
    );
  }, [courseYears, searchText1]);

  const filteredSubjects = useMemo(() => {
    const q = searchText2.trim().toLowerCase();
    if (!q) return subjectListDetails;
    return subjectListDetails.filter((s) =>
      `${txt(s.subject_code)} ${txt(s.subject_name)}`.toLowerCase().includes(q),
    );
  }, [subjectListDetails, searchText2]);

  const tableColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
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
        minWidth: 200,
        valueGetter: (p) => {
          const name = txt(p.data?.subject_name);
          const code = txt(p.data?.subject_code);
          return code ? `${name} (${code})` : name;
        },
        cellRenderer: (p: ICellRendererParams<Row>) => {
          const name = txt(p.data?.subject_name);
          const code = txt(p.data?.subject_code);
          return (
            <span>
              {name}{" "}
              {code ? <span className="text-blue-700">({code})</span> : null}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        width: 90,
        flex: 0,
        cellRenderer: makeEditRenderer((row) => {
          setEditRow(row);
          setEditForm({
            isActive: true,
            reason: txt(row?.reason),
          });
          setEditOpen(true);
        }),
      },
    ],
    [],
  );

  const loadExamCenters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      // Angular getExamCenters — college_center_exam_group_filters
      const groups = await getExamCenterByCodeGroups({
        flag: "college_center_exam_group_filters",
        flagType: "REGSUP",
        angularCoursesPayload: true,
      });
      const details = resultGroup0(groups);
      setExamCenterDetails(details);
      const centers = dedupeBy(details, (r) => num(r.fk_univ_ec_id));
      setUnivExamCenters(centers);
      if (centers[0]) {
        const id = num(centers[0].fk_univ_ec_id);
        setUnivExamcenterId(id);
      } else {
        setUnivExamcenterId(null);
        setUnivEcCollegeId(null);
        setExamGroupId(null);
        setRegulationId(null);
        setExamCentersCollegesList([]);
        setExamGroups([]);
        setRegulations([]);
      }
    } catch (e) {
      toastError(e, "Failed to load exam centers");
      setExamCenterDetails([]);
      setUnivExamCenters([]);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    void loadExamCenters();
  }, [loadExamCenters]);

  /**
   * Angular `selectedExamCenter` — reset college, derive colleges + exam groups
   * from `examCenterDetails`, then cascade into `selectedExamCentersColleges`.
   */
  useEffect(() => {
    if (!univExamcenterId) {
      setExamCentersCollegesList([]);
      setUnivEcCollegeId(null);
      setExamGroups([]);
      setExamGroupId(null);
      setRegulations([]);
      setRegulationId(null);
      return;
    }
    const forCenter = examCenterDetails.filter(
      (x) => num(x.fk_univ_ec_id) === univExamcenterId,
    );
    const colleges = collegesFromCenterRows(forCenter);
    setExamCentersCollegesList(colleges);
    const firstCollegeId = colleges[0]
      ? num(colleges[0].fk_college_id ?? colleges[0].college_id)
      : null;
    setUnivEcCollegeId(
      firstCollegeId && firstCollegeId > 0 ? firstCollegeId : null,
    );

    // Angular only continues cascade when ExamCentersCollegesList.length > 0
    if (!firstCollegeId || firstCollegeId <= 0) {
      const groups = dedupeBy(forCenter, (r) => num(r.fk_univ_exam_group_id));
      setExamGroups(groups);
      setExamGroupId(groups[0] ? num(groups[0].fk_univ_exam_group_id) : null);
      return;
    }

    const groupRows = forCenter.filter(
      (x) => num(x.fk_college_id ?? x.college_id) === firstCollegeId,
    );
    const groups = dedupeBy(groupRows, (r) => num(r.fk_univ_exam_group_id));
    setExamGroups(groups);
    setExamGroupId(groups[0] ? num(groups[0].fk_univ_exam_group_id) : null);
  }, [univExamcenterId, examCenterDetails]);

  /** Angular `selectedExamCentersColleges` — refresh exam groups when college changes */
  useEffect(() => {
    if (!univExamcenterId || univEcCollegeId == null || univEcCollegeId <= 0) {
      return;
    }
    const forCenter = examCenterDetails.filter(
      (x) => num(x.fk_univ_ec_id) === univExamcenterId,
    );
    const groupRows = forCenter.filter(
      (x) => num(x.fk_college_id ?? x.college_id) === univEcCollegeId,
    );
    const groups = dedupeBy(groupRows, (r) => num(r.fk_univ_exam_group_id));
    setExamGroups(groups);
    setExamGroupId((prev) => {
      if (prev && groups.some((g) => num(g.fk_univ_exam_group_id) === prev)) {
        return prev;
      }
      return groups[0] ? num(groups[0].fk_univ_exam_group_id) : null;
    });
  }, [univExamcenterId, univEcCollegeId, examCenterDetails]);

  /**
   * Angular `selectedExamGroup` — GET `exam_center_clg_filters` whenever center /
   * college / exam group cascade settles (same proc + param order as Angular).
   */
  useEffect(() => {
    if (!univExamcenterId || !examGroupId) {
      setRegulations([]);
      setRegulationId(null);
      return;
    }
    let cancelled = false;
    async function loadRegulations() {
      setLoadingRegulations(true);
      try {
        // Angular selectedExamGroup — in_college_id from form (undefined when empty)
        const { groups, message, success } =
          await getExamCenterClgFiltersForCourses({
            univExamcenterId: univExamcenterId!,
            collegeId:
              univEcCollegeId && univEcCollegeId > 0 ? univEcCollegeId : null,
            examGroupId: examGroupId!,
          });
        if (cancelled) return;
        const rows = resultGroup0(groups);
        const collegesFromApi = collegesFromCenterRows(rows);
        if (collegesFromApi.length > 0) {
          setExamCentersCollegesList(collegesFromApi);
          if (!univEcCollegeId || univEcCollegeId <= 0) {
            setUnivEcCollegeId(
              num(
                collegesFromApi[0].fk_college_id ??
                  collegesFromApi[0].college_id,
              ),
            );
          }
        }
        const regs = dedupeBy(rows, (r) => num(r.fk_regulation_id));
        setRegulations(regs);
        if (regs.length > 0) {
          setRegulationId(num(regs[0].fk_regulation_id));
        } else {
          setRegulationId(null);
          // Angular: statusCode 200 → snotify success(message); else error(message)
          if (success) {
            if (message) toastInfo(message);
          } else if (message) {
            toastError(message);
          }
        }
      } catch (e) {
        if (!cancelled) {
          toastError(e, "Failed to load regulations");
          setRegulations([]);
          setRegulationId(null);
        }
      } finally {
        if (!cancelled) setLoadingRegulations(false);
      }
    }
    void loadRegulations();
    return () => {
      cancelled = true;
    };
  }, [univExamcenterId, univEcCollegeId, examGroupId]);

  function onCourseGroupSelect(group: Row) {
    const groupId = num(group.fk_course_group_id);
    setCourseGroupId(groupId);
    setSubjectListDetails([]);
    setSelectedSubjects([]);
    const years = dedupeBy(
      courseGroupSubjectsDetails.filter(
        (x) => num(x.fk_course_group_id) === groupId,
      ),
      (r) => num(r.fk_course_year_id),
    );
    setCourseYears(years);
    if (years[0]) {
      onCourseYearSelect(years[0], groupId);
    } else {
      setCourseYearId(null);
      setExistsSubjectListDetails([]);
    }
  }

  function onCourseYearSelect(courseYear: Row, groupIdOverride?: number) {
    const groupId = groupIdOverride ?? courseGroupId;
    const yearId = num(courseYear.fk_course_year_id);
    setCourseYearId(yearId);
    setSelectedSubjects([]);
    const subjects: Row[] = dedupeBy(
      courseGroupSubjectsDetails.filter(
        (x) =>
          num(x.fk_course_group_id) === Number(groupId) &&
          num(x.fk_course_year_id) === yearId,
      ),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }));
    setSubjectListDetails(subjects);
    setExistsSubjectListDetails(
      subjects.filter((x) => num(x.row_exists) !== 0),
    );
  }

  function onSubjectToggle(subject: Row, checked: boolean) {
    if (num(subject.row_exists) !== 0) return;
    const subjectId = num(subject.fk_subject_id);
    setSubjectListDetails((rows) =>
      rows.map((r) =>
        num(r.fk_subject_id) === subjectId ? { ...r, checked } : r,
      ),
    );
    if (checked) {
      const univEcCollegePk = num(
        examCentersCollegesList.find(
          (x) => num(x.fk_college_id) === univEcCollegeId,
        )?.fk_univ_ec_college_id,
      );
      setSelectedSubjects((arr) => [
        ...arr.filter((s) => num(s.subjectId) !== subjectId),
        {
          univEcCollegeId: univEcCollegePk,
          courseGroupId: courseGroupId ?? 0,
          courseYearId: courseYearId ?? 0,
          regulationId: regulationId ?? 0,
          subjectId,
        },
      ]);
    } else {
      setSelectedSubjects((arr) =>
        arr.filter((s) => num(s.subjectId) !== subjectId),
      );
    }
  }

  /** Angular `selectedRegulation` / Get List */
  async function onGetList() {
    if (
      !univExamcenterId ||
      !univEcCollegeId ||
      !examGroupId ||
      !regulationId
    ) {
      toastError(
        "Please select Exam Center, College, Exam Group and Regulation.",
      );
      return;
    }
    setLoadingList(true);
    setShowSections(false);
    setCourseGroupId(null);
    setCourseYearId(null);
    setCourseYears([]);
    setSubjectListDetails([]);
    setSelectedSubjects([]);
    setSearchText("");
    setSearchText1("");
    setSearchText2("");
    try {
      // Angular selectedRegulation — in_college_id=undefined when college empty
      const groups = await getExamCenterByCodeGroups({
        flag: "ec_grp_yr_subjects",
        flagType: "REGSUP",
        univExamcenterId,
        collegeId:
          univEcCollegeId && univEcCollegeId > 0 ? univEcCollegeId : null,
        examGroupId,
        regulationId: regulationId && regulationId > 0 ? regulationId : "",
        angularCoursesPayload: true,
      });
      const details = resultGroup0(groups);
      setCourseGroupSubjectsDetails(details);
      const exists = details.filter((x) => num(x.row_exists) !== 0);
      setExistsSubjectListDetails(exists);
      const groupsList = dedupeBy(details, (r) => num(r.fk_course_group_id));
      setCourseGroups(groupsList);
      setShowSections(true);
      if (!details.length) {
        toastInfo("No records found.");
      } else {
        toastSuccess("List loaded.");
      }
    } catch (e) {
      toastError(e, "Failed to get list");
      setCourseGroupSubjectsDetails([]);
      setCourseGroups([]);
      setExistsSubjectListDetails([]);
      setShowSections(false);
    } finally {
      setLoadingList(false);
    }
  }

  async function onAssign() {
    if (!selectedSubjects.length) {
      toastInfo("Please Select Subjects...!");
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
      // Angular ExamCenterCoursesModalComponent.submit payload
      await updateInActiveUnivEcCollegeDetails({
        isActive: editForm.isActive,
        reason: editForm.reason,
        updatedUser: employeeId,
        courseGroupId: num(editRow.fk_course_group_id),
        courseYearId: num(editRow.fk_course_year_id),
        univEcCollegeDetailId: num(editRow.pk_univ_ec_college_detail_id),
        subjectId: num(editRow.fk_subject_id),
        univEcCollegeId: num(editRow.fk_univ_ec_college_id),
      });
      toastSuccess("Updated.");
      setEditOpen(false);
      await onGetList();
    } catch (err) {
      toastError(err, "Update failed");
    }
  }

  return (
    <FilteredListPage
      title="Exam Center Subjects"
      filters={
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12 md:items-end">
          <div className="space-y-1 md:col-span-3">
            <Select
              label="Exam Center"
              required
              placeholder="Exam Center"
              options={centerOptions}
              value={univExamcenterId ? String(univExamcenterId) : null}
              onChange={(v) => {
                setUnivExamcenterId(v ? Number(v) : null);
                setShowSections(false);
              }}
              disabled={loadingFilters}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Select
              label="Exam Center Colleges"
              required
              placeholder="Exam Center Colleges"
              options={collegeOptions}
              value={
                univEcCollegeId != null && univEcCollegeId > 0
                  ? String(univEcCollegeId)
                  : null
              }
              onChange={(v) => {
                setUnivEcCollegeId(v ? Number(v) : null);
                setShowSections(false);
              }}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Select
              label="Exam Group"
              required
              placeholder="Exam Group"
              options={examGroupOptions}
              value={examGroupId ? String(examGroupId) : null}
              onChange={(v) => {
                setExamGroupId(v ? Number(v) : null);
                setShowSections(false);
              }}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Select
              label="Regulation"
              required
              placeholder="Regulation"
              options={regulationOptions}
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => {
                setRegulationId(v ? Number(v) : null);
                setShowSections(false);
              }}
              disabled={loadingRegulations}
              searchable
            />
          </div>
          <div className="md:col-span-1">
            <Button
              type="button"
              className="h-8 w-full text-[12px]"
              onClick={() => void onGetList()}
              disabled={loadingList || loadingRegulations}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
          </div>
        </div>
      }
      notice={
        showSections ? (
          <>
            <div className="app-card border-b border-border border-t-[3px] border-t-amber-300 px-3 py-2">
              <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
                Exam Center Subjects
                {headerText ? <span>&nbsp;-&nbsp;{headerText}</span> : null}
              </h3>
            </div>
            <div className="app-card p-3">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
                <div className="rounded-md border bg-card p-2 md:col-span-3">
                  <SearchInput
                    value={searchText}
                    onChange={setSearchText}
                    placeholder="Search..."
                    className="mb-2 w-full max-w-sm"
                  />
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b">
                          <th className="w-[56px] py-1 text-left">Select</th>
                          <th className="py-1 text-left">Course Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourseGroups.map((g) => {
                          const id = num(g.fk_course_group_id);
                          return (
                            <tr key={id} className="border-b">
                              <td className="py-1">
                                <input
                                  type="radio"
                                  name="courseGroupId"
                                  checked={courseGroupId === id}
                                  onChange={() => onCourseGroupSelect(g)}
                                  aria-label={txt(g.group_code)}
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

                <div className="rounded-md border bg-card p-2 md:col-span-3">
                  <SearchInput
                    value={searchText1}
                    onChange={setSearchText1}
                    placeholder="Search..."
                    className="mb-2 w-full max-w-sm"
                  />
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b">
                          <th className="w-[56px] py-1 text-left">Select</th>
                          <th className="py-1 text-left">Course Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourseYears.map((y) => {
                          const id = num(y.fk_course_year_id);
                          return (
                            <tr key={id} className="border-b">
                              <td className="py-1">
                                <input
                                  type="radio"
                                  name="courseYearId"
                                  checked={courseYearId === id}
                                  onChange={() => onCourseYearSelect(y)}
                                  aria-label={txt(y.course_year_code)}
                                />
                              </td>
                              <td className="py-1">
                                {txt(y.course_year_code)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border bg-card p-2 md:col-span-5">
                  <SearchInput
                    value={searchText2}
                    onChange={setSearchText2}
                    placeholder="Search..."
                    className="mb-2 w-full max-w-sm"
                  />
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b">
                          <th className="w-[56px] py-1 text-left">Select</th>
                          <th className="py-1 text-left">Subject</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.map((s) => {
                          const exists = num(s.row_exists) !== 0;
                          const id = num(s.fk_subject_id);
                          return (
                            <tr
                              key={id}
                              className={`border-b ${exists ? "bg-amber-50" : ""}`}
                            >
                              <td className="py-1">
                                <Checkbox
                                  checked={Boolean(s.checked)}
                                  disabled={exists}
                                  onCheckedChange={(v) =>
                                    onSubjectToggle(s, v === true)
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

                <div className="flex items-end justify-center pb-1 md:col-span-1">
                  <Button
                    size="sm"
                    className="h-8 px-3 text-[12px]"
                    onClick={() => void onAssign()}
                    disabled={assigning}
                  >
                    {assigning ? "…" : "Assign"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null
      }
      rowData={showSections ? existsSubjectListDetails : []}
      columnDefs={tableColumnDefs}
      loading={loadingList}
      pagination
      toolbar={
        showSections
          ? {
              search: true,
              searchPlaceholder: "Search",
              pdfDocumentTitle: "Exam Center Subjects",
            }
          : false
      }
      toolbarLeading={
        showSections ? (
          <span className="max-w-[min(100%,40rem)] truncate text-[12px] font-medium text-[hsl(var(--primary))]">
            Exam Center Subjects
            {headerText ? <span>&nbsp;-&nbsp;{headerText}</span> : null}
          </span>
        ) : null
      }
      hideEmptyGrid={!showSections}
    >
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Subject"
        onSubmit={onSaveEdit}
        size="lg"
      >
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Subject : </span>
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
    </FilteredListPage>
  );
}
