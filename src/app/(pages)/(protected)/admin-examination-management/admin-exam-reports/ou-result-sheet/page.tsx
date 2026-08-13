"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getOuResultSheet,
} from "@/services";
import { toastError, toastInfo } from "@/lib/toast";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Layers,
  RotateCcw,
  School,
} from "lucide-react";
import { printOuResultSheet } from "../_components/printOuResultSheet";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search…",
  columnPicker: true,
  exportPdf: true,
  exportExcel: true,
} as const;

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function humanizeCol(col: string): string {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OuResultSheetPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filterSummary, setFilterSummary] = useState("");
  const [collegeName, setCollegeName] = useState("");

  const courses = useMemo(
    () => dedupeBy(baseRows, ["fk_course_id", "courseId"]),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_academic_year_id", "academicYearId"],
      ).sort(
        (a, b) =>
          Number(strFrom(b, ["academic_year", "academicYear"])) -
          Number(strFrom(a, ["academic_year", "academicYear"])),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        ["fk_exam_id", "examId"],
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, ["fk_college_id", "collegeId"]).sort(
        (a, b) =>
          Number(a.clg_sort_order ?? a.sort_order ?? 0) -
          Number(b.clg_sort_order ?? b.sort_order ?? 0),
      ),
    [restRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            !collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [restRows, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            (!collegeId ||
              numFrom(r, ["fk_college_id", "collegeId"]) ===
                Number(collegeId)) &&
            (courseGroupId === 0 ||
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                Number(courseGroupId)),
        ),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [restRows, collegeId, courseGroupId],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      ...columns.map(
        (col) =>
          ({
            headerName: humanizeCol(col),
            field: col,
            colId: col,
            minWidth: 120,
            width: 140,
            valueGetter: (p) => String(p.data?.[col] ?? ""),
          }) as ColDef<AnyRow>,
      ),
    ],
    [columns],
  );

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const ht = strFrom(p.data ?? {}, [
      "hallticket_number",
      "hall_ticketno",
      "roll_number",
      "Roll_Number",
    ]);
    if (ht) return ht;
    return `row-${Math.random()}`;
  }, []);

  function clearResults() {
    setRows([]);
    setColumns([]);
    setFilterSummary("");
    setCollegeName("");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        // Angular getFiltersList: univ_exam_filters + REGSUP
        const list = await getGradeMemoIssueFilters(employeeId);
        if (cancelled) return;
        setBaseRows(list);
        const firstCourse = dedupeBy(list, ["fk_course_id", "courseId"])[0];
        setSkipAutoSelect(false);
        setCourseId(
          firstCourse
            ? numFrom(firstCourse, ["fk_course_id", "courseId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      baseRows.filter(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_academic_year_id", "academicYearId"],
    ).sort(
      (a, b) =>
        Number(strFrom(b, ["academic_year", "academicYear"])) -
        Number(strFrom(a, ["academic_year", "academicYear"])),
    );
    setAcademicYearId(
      years[0]
        ? numFrom(years[0], ["fk_academic_year_id", "academicYearId"])
        : null,
    );
  }, [courseId, baseRows, skipAutoSelect]);

  useEffect(() => {
    if (!courseId || !academicYearId) {
      setExamId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
          numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
            Number(academicYearId),
      ),
      ["fk_exam_id", "examId"],
    );
    setExamId(list[0] ? numFrom(list[0], ["fk_exam_id", "examId"]) : null);
  }, [courseId, academicYearId, baseRows, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCollegeId(null);
        setCourseGroupId(0);
        setCourseYearId(0);
        return;
      }
      setLoading(true);
      try {
        // Angular selectedExam: univ_exam_rest_in_regexamstd + ALL
        const rest = await getGradeMemoIssueRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        });
        if (cancelled) return;
        setRestRows(rest);
        if (skipAutoSelect) {
          setCollegeId(null);
          setCourseGroupId(0);
          setCourseYearId(0);
          return;
        }
        const nextColleges = dedupeBy(rest, [
          "fk_college_id",
          "collegeId",
        ]).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        );
        setCollegeId(
          nextColleges[0]
            ? numFrom(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    if (!collegeId) {
      setCourseGroupId(0);
      return;
    }
    const groups = dedupeBy(
      restRows.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    setCourseGroupId(
      groups[0]
        ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
        : 0,
    );
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (!collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId)) &&
          (courseGroupId === 0 ||
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId)),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [collegeId, courseGroupId, restRows, skipAutoSelect]);

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError("Please select Course, Exam Year, Exam Master, and College");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const list = await getOuResultSheet({
        examId,
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        studentId: 0,
      });
      if (list.length === 0) {
        toastInfo("No records found");
        return;
      }
      setRows(list);
      setColumns(Object.keys(list[0] ?? {}));

      const college = colleges.find(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === collegeId,
      );
      const courseCode = strFrom(
        courses.find(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === courseId,
        ) ?? {},
        ["course_code", "courseCode"],
      );
      const examName = strFrom(
        exams.find((r) => numFrom(r, ["fk_exam_id", "examId"]) === examId) ??
          {},
        ["exam_name", "examName"],
      );
      const groupCode = courseGroupId
        ? strFrom(
            courseGroups.find(
              (r) =>
                numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                courseGroupId,
            ) ?? {},
            ["group_code", "groupCode"],
          )
        : "";
      const yearCode = courseYearId
        ? strFrom(
            courseYears.find(
              (r) =>
                numFrom(r, ["fk_course_year_id", "courseYearId"]) ===
                courseYearId,
            ) ?? {},
            ["course_year_code", "courseYearCode"],
          )
        : "";
      const collegeCode = strFrom(college ?? {}, [
        "college_code",
        "collegeCode",
      ]);
      setCollegeName(strFrom(college ?? {}, ["college_name", "collegeName"]));
      setFilterSummary(
        [collegeCode, courseCode, groupCode, yearCode, examName]
          .filter(Boolean)
          .join(" / "),
      );
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to load OU Result Report",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkipAutoSelect(true);
    clearResults();
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    setCollegeId(null);
    setCourseGroupId(0);
    setCourseYearId(0);
    setRestRows([]);
  }

  const handlePrint = useCallback(() => {
    if (rows.length === 0) return;
    printOuResultSheet(rows, {
      title: "OU Result Report",
      collegeName,
      filterSummary,
      columns,
    });
  }, [rows, collegeName, filterSummary, columns]);

  return (
    <FilteredListPage
      title="OU Result Report"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseId(v ? Number(v) : null);
                }}
                options={courses.map((r) => ({
                  value: String(numFrom(r, ["fk_course_id", "courseId"])),
                  label: strFrom(r, [
                    "course_code",
                    "courseCode",
                    "course_name",
                  ]),
                }))}
                placeholder="Course"
                searchable
                isLoading={loading && baseRows.length === 0}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year"
              icon={CalendarDays}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setAcademicYearId(v ? Number(v) : null);
                }}
                options={academicYears.map((r) => ({
                  value: String(
                    numFrom(r, ["fk_academic_year_id", "academicYearId"]),
                  ),
                  label: strFrom(r, ["academic_year", "academicYear"]),
                }))}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Master"
              icon={ClipboardList}
              className="!flex-[1_1_25rem] !max-w-[25rem]"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setExamId(v ? Number(v) : null);
                }}
                options={exams.map((r) => {
                  const tags = [
                    r.is_internal_exam ? "Internal" : "",
                    r.is_regular_exam ? "Regular" : "",
                    r.is_supply_exam ? "Supple" : "",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  const name = strFrom(r, ["exam_name", "examName"]);
                  return {
                    value: String(numFrom(r, ["fk_exam_id", "examId"])),
                    label: tags ? `${name} (${tags})` : name,
                  };
                })}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="College"
              icon={Building2}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
            >
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCollegeId(v ? Number(v) : null);
                }}
                options={colleges.map((r) => ({
                  value: String(numFrom(r, ["fk_college_id", "collegeId"])),
                  label: strFrom(r, [
                    "college_code",
                    "collegeCode",
                    "college_name",
                  ]),
                }))}
                placeholder="College"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Group"
              icon={Layers}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseGroupId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseGroups.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                    ),
                    label: strFrom(r, [
                      "group_code",
                      "groupCode",
                      "group_name",
                    ]),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Years"
              icon={School}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  setSkipAutoSelect(false);
                  clearResults();
                  setCourseYearId(v ? Number(v) : 0);
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseYears.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_course_year_id", "courseYearId"]),
                    ),
                    label: strFrom(r, [
                      "course_year_code",
                      "courseYearCode",
                      "course_year",
                    ]),
                  })),
                ]}
                placeholder="Course Years"
                searchable
              />
            </GlobalFilterField>
            <div className=" flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      showTable={rows.length > 0}
      resultsVisible={rows.length > 0}
      tableHeader={
        <div className="table-context-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <span
              className="material-icons table-context-header__icon"
              aria-hidden
            >
              book
            </span>
            <strong className="table-context-header__title">
              OU Result Report
            </strong>
          </div>
          {filterSummary ? (
            <span className="text-[12px] font-medium text-blue-700">
              {filterSummary}
            </span>
          ) : null}
        </div>
      }
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      fitColumnsToWidth={false}
      onExportPdf={handlePrint}
      toolbar={{
        ...TOOLBAR,
        exportPdf: false,
        excelDocumentTitle: "OU Result Report",
        excelFileName: "Ou Result sheet.xls",
        pdfDocumentTitle: "OU Result Report",
      }}
    />
  );
}
