"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { printHtmlInIframe } from "@/lib/print";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getExamStudentRegistrationReportRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  listActiveRooms,
  listStudents,
  type AnyRow,
} from "@/services";

type Row = AnyRow;

const REPORT_TITLE = "Exam Student Registration Report";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

// Print/export columns — matches Angular print template (no Exam Form)
const EXPORT_COLS = [
  { key: "si", header: "S.No" },
  { key: "hallTicketNo", header: "Hall Ticket No." },
  { key: "studentName", header: "Student Name" },
  { key: "courseDetails", header: "Course Details" },
  { key: "exam", header: "Exam" },
  { key: "examType", header: "Exam Type" },
  { key: "registrationDate", header: "Registration Date" },
  { key: "subjects", header: "Subjects" },
  { key: "feePaid", header: "Fee Paid" },
  { key: "hallTicketIssued", header: "HallTicket Issued" },
] as const;

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
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

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = txt(r.from_date ?? r.fromDate).slice(0, 10);
  const to = txt(r.to_date ?? r.toDate).slice(0, 10);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags: string[] = [];
  if (r.is_internal_exam || r.isInternalExam) tags.push("(Internal)");
  if (r.is_regular_exam || r.isRegularExam) tags.push("(Regular)");
  if (r.is_supply_exam || r.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function yesNo(v: unknown): string {
  if (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true")
    return "Yes";
  return "No"; // false, 0, null, undefined → No (matches Angular)
}

/** Format ISO date string → dd/MM/yyyy like Angular */
function formatRegDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  // already dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // ISO yyyy-MM-dd...
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

/** Subjects cell renderer — matches Angular: Name (CODE), Name (CODE) with blue codes */
function subjectsRenderer(p: ICellRendererParams<Row>) {
  const raw = txt(p.data?.subject_name ?? p.data?.subjects);
  if (!raw) return <span className="text-muted-foreground">—</span>;
  const parts = raw.split("^").filter(Boolean);
  return (
    <span className="text-[12px] leading-snug">
      {parts.map((part, i) => {
        const bits = part.split("-");
        const code = bits[0]?.trim() ?? "";
        const name = bits.slice(1).join("-").trim() || part.trim();
        return (
          <span key={`${code}-${i}`}>
            {i > 0 ? ", " : ""}
            {name}
            {code ? <span className="text-blue-700"> ({code})</span> : null}
          </span>
        );
      })}
    </span>
  );
}

/** Exam Form cell — shows – when no file path, matching Angular dash */
function examFormRenderer(p: ICellRendererParams<Row>) {
  const v = txt(
    p.data?.exam_form ?? p.data?.examForm ?? p.data?.application_file_path,
  );
  if (!v) return <span className="text-muted-foreground">—</span>;
  return <span>{v}</span>;
}

function toExportRows(rows: Row[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    hallTicketNo: txt(
      row.hallticket_no ?? row.hallticketNo ?? row.hallticket_number,
    ),
    studentName: txt(row.student_name ?? row.studentName),
    courseDetails: (() => {
      const c = txt(row.college_code ?? row.collegeCode);
      const y = txt(row.course_year ?? row.courseYear);
      if (c && y) return `${c} / ${y}`;
      return c || y;
    })(),
    exam: txt(row.exam_name ?? row.examName),
    examType: txt(row.exam_type ?? row.examType),
    registrationDate: txt(row.registration_date ?? row.registrationDate),
    subjects: txt(row.subject_name ?? row.subjects),
    feePaid: yesNo(row.is_fee_paid ?? row.isFeePaid),
    hallTicketIssued: yesNo(row.is_hallticket_issued ?? row.isHallticketIssued),
  }));
}

function buildDataDetails(parts: {
  collegeCode: string;
  courseCode: string;
  examYear: string;
  examName: string;
  regulationCode: string;
}): string {
  return [
    parts.collegeCode,
    parts.courseCode,
    parts.examYear,
    parts.regulationCode,
    parts.examName,
  ]
    .filter(Boolean)
    .join(" / ");
}

function printReport(rows: Row[], dataDetails: string) {
  if (!rows.length) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
.collegeName { text-align: center; font-size: 23px; font-weight: 550; color: #000; margin: 20px 0 -10px; }
.title { text-align: center; font-size: 19px; font-weight: 550; color: #000; margin: 5px 0 8px; }
table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
th, td { border: 1px solid #000; padding: 8px 5px; text-align: left; vertical-align: top; }
th { background: #c3d9ff; font-weight: 550; }
tr { break-inside: avoid; }
</style></head>
<body>
  <p class="collegeName">${escapeHtml(REPORT_TITLE)}</p>
  ${dataDetails.trim() ? `<p class="title">${escapeHtml(dataDetails)}</p>` : ""}
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;
  printHtmlInIframe(html);
}

export default function ExamRegistrationStudentReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [regulationRows, setRegulationRows] = useState<Row[]>([]);
  const [roomRows, setRoomRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([]);
  const [dataDetails, setDataDetails] = useState("");

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [regulationId, setRegulationId] = useState("0");
  const [roomId, setRoomId] = useState("0");
  const [studentId, setStudentId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  // ── Base filters + rooms on mount ─────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const [filters, rooms] = await Promise.all([
          getUnivExamFiltersRegSup(employeeId),
          listActiveRooms().catch(() => []),
        ]);
        const list = Array.isArray(filters) ? filters : [];
        setBaseRows(list);
        setRoomRows(Array.isArray(rooms) ? rooms : []);
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [restRows, collegeId, courseGroupId]);
  const regulations = useMemo(
    () =>
      dedupeBy([...regulationRows, ...restRows], (r) =>
        num(r.fk_regulation_id ?? r.regulationId),
      ),
    [regulationRows, restRows],
  );

  // ── Load rest filters when Course+Year+Exam are selected ──────────────────
  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setRegulationRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const bundle = await getUnivExamRestInRegExamStd({
          courseId: Number(courseId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          employeeId,
        });
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        setRegulationRows(
          Array.isArray(bundle.regulations) ? bundle.regulations : [],
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setRegulationId("0");
        setRoomId("0");
        setStudentId("");
        setStudentOptions([]);
        setRows([]);
        setHasFetched(false);
        setDataDetails("");
      } catch (e) {
        toastError(e, "Failed to load college / group filters");
        setRestRows([]);
        setRegulationRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  // Auto-select first college when colleges load
  useEffect(() => {
    if (!colleges.length) return;
    const ok = colleges.some((r) => num(r.fk_college_id) === Number(collegeId));
    if (!ok) setCollegeId(String(num(colleges[0].fk_college_id)));
  }, [colleges, collegeId]);

  // Auto-select first course group when groups load
  useEffect(() => {
    if (!courseGroups.length) return;
    const ok = courseGroups.some(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    if (!ok) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    }
  }, [courseGroups, courseGroupId]);

  // Auto-select first course year when years load
  useEffect(() => {
    if (!courseYears.length) return;
    const ok = courseYears.some(
      (r) => num(r.fk_course_year_id) === Number(courseYearId),
    );
    if (!ok) setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
  }, [courseYears, courseYearId]);

  function resetFilters() {
    setAcademicYearId("");
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("0");
    setRoomId("0");
    setStudentId("");
    setStudentOptions([]);
    setRestRows([]);
    setRegulationRows([]);
    setRows([]);
    setHasFetched(false);
    setDataDetails("");
    const firstCourse = courses[0];
    if (firstCourse) setCourseId(String(num(firstCourse.fk_course_id)));
  }

  async function onSearchStudent(term: string) {
    const q = term.trim();
    if (q.length < 4) {
      setStudentOptions([]);
      return;
    }
    setSearchingStudent(true);
    try {
      const list = await listStudents(q);
      setStudentOptions(
        (Array.isArray(list) ? list : [])
          .map((r) => {
            const id = num(r.studentId ?? r.student_id);
            const roll = txt(r.rollNumber ?? r.roll_number);
            const name = txt(r.firstName ?? r.first_name ?? r.studentName);
            return {
              value: String(id),
              label: name ? `${roll} (${name})` : roll || String(id),
            };
          })
          .filter((o) => o.value !== "0"),
      );
    } catch {
      setStudentOptions([]);
    } finally {
      setSearchingStudent(false);
    }
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      !courseGroupId ||
      !courseYearId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }

    setLoadingList(true);
    setHasFetched(true);

    try {
      const college = colleges.find(
        (r) => num(r.fk_college_id) === Number(collegeId),
      );
      const course = courses.find(
        (r) => num(r.fk_course_id) === Number(courseId),
      );
      const year = academicYears.find(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      );
      const exam = exams.find((r) => num(r.fk_exam_id) === Number(examId));
      const reg = regulations.find(
        (r) =>
          num(r.fk_regulation_id ?? r.regulationId) === Number(regulationId),
      );

      const details = buildDataDetails({
        collegeCode: txt(college?.college_code ?? college?.collegeCode),
        courseCode: txt(course?.course_code ?? course?.courseCode),
        examYear: txt(year?.academic_year ?? year?.academicYear),
        examName: txt(exam?.exam_name ?? exam?.examName),
        regulationCode:
          regulationId !== "0"
            ? txt(reg?.regulation_code ?? reg?.regulationCode)
            : "",
      });

      const list = await getExamStudentRegistrationReportRows({
        examId: Number(examId),
        courseId: Number(courseId),
        collegeId: Number(collegeId),
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        studentId: Number(studentId) || 0,
        regulationId: Number(regulationId) || 0,
        roomId: Number(roomId) || 0,
      });

      setRows(Array.isArray(list) ? list : []);
      setDataDetails(list?.length ? details : "");

      if (!list?.length) {
        toastSuccess("No Records Found.");
      }
    } catch (e) {
      toastError(e, "Failed to load student registration report");
      setRows([]);
      setDataDetails("");
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      REPORT_TITLE,
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Hall Ticket No.",
        minWidth: 150,
        valueGetter: (p) =>
          txt(
            p.data?.hallticket_no ??
              p.data?.hallticketNo ??
              p.data?.hallticket_number,
          ),
      },
      {
        headerName: "Student Name",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.student_name ?? p.data?.studentName),
      },
      {
        headerName: "Course Details",
        minWidth: 180,
        valueGetter: (p) => {
          const c = txt(p.data?.college_code ?? p.data?.collegeCode);
          const y = txt(p.data?.course_year ?? p.data?.courseYear);
          if (c && y) return `${c} / ${y}`;
          return c || y || "";
        },
      },
      {
        headerName: "Exam",
        minWidth: 250,
        valueGetter: (p) => txt(p.data?.exam_name ?? p.data?.examName),
      },
      {
        headerName: "Exam Type",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.exam_type ?? p.data?.examType),
      },
      {
        headerName: "Registration Date",
        minWidth: 150,
        valueGetter: (p) =>
          formatRegDate(p.data?.registration_date ?? p.data?.registrationDate),
      },
      {
        headerName: "Subjects",
        minWidth: 220,
        cellRenderer: subjectsRenderer,
      },
      {
        headerName: "Exam Form",
        minWidth: 110,
        cellRenderer: examFormRenderer,
      },
      {
        headerName: "Fee Paid",
        minWidth: 100,
        valueGetter: (p) =>
          yesNo(p.data?.is_fee_paid ?? p.data?.feePaid ?? p.data?.fee_paid),
      },
      {
        headerName: "HallTicket Issued",
        minWidth: 150,
        valueGetter: (p) =>
          yesNo(
            p.data?.is_hallticket_issued ??
              p.data?.hallTicketIssued ??
              p.data?.hallticket_issued,
          ),
      },
    ],
    [],
  );

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) => {
      const d = p.data;
      if (!d) return "";
      const id = num(
        d.exam_student_reg_id ??
          d.fk_exam_student_registration_id ??
          d.studentId,
      );
      if (id > 0)
        return `${id}-${txt(d.hallticket_no)}-${p.node?.rowIndex ?? 0}`;
      return `row-${p.node?.rowIndex ?? 0}-${txt(d.hallticket_no)}-${txt(d.student_name)}`;
    },
    [],
  );

  const filters = (
    <>
      {/* Row 1: Course | Exam Year | Exam Master */}
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || null}
            onChange={(v) => {
              setCourseId(v ?? "");
              setAcademicYearId("");
              setExamId("");
              setCollegeId("");
            }}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code ?? c.courseCode),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>

        <GlobalFilterField label="Exam Year *">
          <Select
            value={academicYearId || null}
            onChange={(v) => {
              setAcademicYearId(v ?? "");
              setExamId("");
              setCollegeId("");
            }}
            isLoading={loadingFilters}
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year ?? y.academicYear),
            }))}
            placeholder="Exam Year"
            searchable
            disabled={!courseId}
          />
        </GlobalFilterField>

        <GlobalFilterField
          label="Exam Master *"
          className="min-w-[260px] flex-[2]"
        >
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: examMasterLabel(e),
            }))}
            placeholder="Exam Master"
            searchable
            disabled={!academicYearId}
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      {/* Row 2: College | Course Group | Course Years | Regulation | Room | Student | Get List | Reset */}
      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || null}
            onChange={(v) => {
              setCollegeId(v ?? "");
              setCourseGroupId("");
              setCourseYearId("");
            }}
            isLoading={loadingFilters}
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code ?? c.collegeCode),
            }))}
            placeholder="College"
            disabled={!examId}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Course Group *">
          <Select
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              setCourseYearId("");
            }}
            isLoading={loadingFilters}
            options={courseGroups.map((g) => ({
              value: String(num(g.fk_course_group_id)),
              label: txt(g.group_code ?? g.groupCode),
            }))}
            placeholder="Course Group"
            disabled={!collegeId}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Course Years *">
          <Select
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            isLoading={loadingFilters}
            options={courseYears.map((y) => ({
              value: String(num(y.fk_course_year_id)),
              label: txt(
                y.course_year_code ?? y.courseYearCode ?? y.course_year_name,
              ),
            }))}
            placeholder="Course Years"
            disabled={!courseGroupId}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Regulation">
          <Select
            value={regulationId}
            onChange={(v) => setRegulationId(v ?? "0")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(num(r.fk_regulation_id ?? r.regulationId)),
                label: txt(r.regulation_code ?? r.regulationCode),
              })),
            ]}
            placeholder="All"
            disabled={!collegeId}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Room">
          <Select
            value={roomId}
            onChange={(v) => setRoomId(v ?? "0")}
            options={[
              { value: "0", label: "All" },
              ...roomRows.map((r) => ({
                value: String(num(r.roomId ?? r.room_id)),
                label: txt(
                  r.roomCode ?? r.room_code ?? r.roomName ?? r.room_name,
                ),
              })),
            ]}
            placeholder="All"
            searchable={roomRows.length > 8}
          />
        </GlobalFilterField>

        <GlobalFilterField label="Student">
          <Select
            value={studentId || null}
            onChange={(v) => {
              setStudentId(v ?? "");
              setRows([]);
              setHasFetched(false);
            }}
            options={studentOptions}
            placeholder="Student"
            searchable
            clearable
            onSearch={onSearchStudent}
            isLoading={searchingStudent}
          />
        </GlobalFilterField>

        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={() => void onGetList()}
              disabled={loadingList || loadingFilters}
              className="h-[30px] px-3 text-[12px]"
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[30px] w-[30px] shrink-0"
              title="Reset"
              onClick={resetFilters}
              disabled={loadingList || loadingFilters}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0 ? `${REPORT_TITLE} - ${dataDetails}` : REPORT_TITLE
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={hasFetched}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, dataDetails)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={getRowId}
    />
  );
}
