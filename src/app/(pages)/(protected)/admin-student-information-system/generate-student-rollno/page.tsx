"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import { printHtmlInIframe } from "@/lib/print";
import { rowIndexGetter } from "@/lib/utils";
import { MINIO_URL } from "@/config/constants/api";
import {
  getStudentInfoCollegeFilters,
  listStudentsForRollNumberAssignment,
  submitStudentRollNumbers,
} from "@/services";

type AnyRow = Record<string, any>;

const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const SEC = ["fk_group_section_id", "groupSectionId", "group_section_id"];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dedupeByKey<T>(rows: T[], keyFn: (r: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSelectNumberOrZero(v: string | null): number {
  if (v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dedupeColleges(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const id = pickNum(r, COL);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out.sort(
    (a, b) => (Number(a.clg_sort_order) || 0) - (Number(b.clg_sort_order) || 0),
  );
}

function rowStudentKey(row: AnyRow): string {
  const id = pickNum(row, ["studentId", "fk_student_id", "student_id"]);
  return id
    ? `id:${id}`
    : `ad:${pickText(row, ["admissionNumber", "admission_no"])}`;
}

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

function makeTextInputRenderer(
  field: "rollNumber" | "hallticketNumber",
  onChange: (
    key: string,
    field: "rollNumber" | "hallticketNumber",
    value: string,
  ) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data ?? {};
    const key = rowStudentKey(row);
    const value = String(
      field === "rollNumber"
        ? (row.rollNumber ?? row.roll_number ?? "")
        : (row.hallticketNumber ?? row.hallticket_number ?? ""),
    );
    return (
      <div className="flex h-full w-full items-center px-1 py-1">
        <Input
          variant="outlined"
          className="h-8 w-full min-w-[150px] rounded-[4px] border border-[#ccc] bg-white px-2 text-[12px] font-normal text-foreground shadow-none focus:border-[#999] focus:ring-1 focus:ring-[#0c51a4]/30"
          value={value}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onChange(key, field, e.target.value)}
        />
      </div>
    );
  };
}

function exportRollExcel(rows: AnyRow[]) {
  const header = [
    "Sl.No",
    "Admission No",
    "Student Name",
    "Roll Number",
    "Hallticket Number",
  ];
  const lines = [header.join(",")];
  rows.forEach((row, i) => {
    const cells = [
      String(i + 1),
      pickText(row, ["admissionNumber", "admission_no"]) || "",
      pickText(row, ["firstName", "first_name", "studentName"]) || "",
      String(row.rollNumber ?? row.roll_number ?? ""),
      String(row.hallticketNumber ?? row.hallticket_number ?? ""),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  });
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Assigned-Student-Roll-Number.xls";
  a.click();
  URL.revokeObjectURL(url);
}

/** Angular Print Report — logo + college title, filter line, boxed roll/hallticket. */
function printAssignRollReport(params: {
  collegeName: string;
  filterLine: string;
  logoUrl: string | null;
  orgCode?: string;
  rows: AnyRow[];
}) {
  const { collegeName, filterLine, logoUrl, orgCode = "", rows } = params;
  const isSuk = orgCode.trim().toUpperCase() === "SUK";
  const resolvedLogo =
    logoUrl && logoUrl.trim() !== ""
      ? logoUrl
      : "/assets/images/avatars/default_logo.png";

  const bodyRows = rows
    .map((row, i) => {
      const admission = pickText(row, [
        "admissionNumber",
        "admission_no",
        "admissionNo",
        "admNumber",
        "admission_number",
      ]);
      const name = pickText(row, ["firstName", "first_name", "studentName"]);
      const roll = String(row.rollNumber ?? row.roll_number ?? "");
      const hallticket = String(
        row.hallticketNumber ?? row.hallticket_number ?? "",
      );
      return `<tr>
  <td class="c">${i + 1}</td>
  <td class="c">${escapeHtml(admission)}</td>
  <td class="l">${escapeHtml(name)}</td>
  <td class="c"><input class="rol" type="text" readonly value="${escapeHtml(roll)}" /></td>
  <td class="c"><input class="rol" type="text" readonly value="${escapeHtml(hallticket)}" /></td>
</tr>`;
    })
    .join("");

  // Angular non-SUK: logo left + titles; SUK: full-width logo then titles
  const headerHtml = isSuk
    ? `<div class="hdr-suk">
  <div class="logo-full">
    <img src="${escapeHtml(resolvedLogo)}" alt="" onerror="this.src='/assets/images/avatars/default_logo.png'" />
  </div>
  <p class="collegeName">${escapeHtml(collegeName)}</p>
  <p class="title">Assign Student Roll Number</p>
  <p class="details">${escapeHtml(filterLine)}</p>
</div>`
    : `<div class="hdr">
  <div class="logo">
    <img src="${escapeHtml(resolvedLogo)}" alt="" onerror="this.src='/assets/images/avatars/default_logo.png'" />
  </div>
  <div class="titles">
    <p class="collegeName">${escapeHtml(collegeName)}</p>
    <p class="title">Assign Student Roll Number</p>
    <p class="details">${escapeHtml(filterLine)}</p>
  </div>
</div>`;

  printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Assign Student Roll Number</title>
<style>
  @page { size: A4 portrait; margin: 8mm 8mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 4px;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
  }
  .hdr {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }
  .hdr .logo {
    flex: 0 0 15%;
    max-width: 120px;
  }
  .hdr .logo img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 90px;
    object-fit: contain;
  }
  .hdr .titles {
    flex: 1;
    text-align: center;
    padding-top: 4px;
  }
  .hdr-suk { text-align: center; margin-bottom: 12px; }
  .hdr-suk .logo-full img {
    display: block;
    width: 100%;
    max-height: 100px;
    object-fit: contain;
    margin: 0 auto 6px;
  }
  .collegeName {
    margin: 8px 0 2px;
    font-size: 23px;
    font-weight: 550;
    color: #000;
    text-align: center;
  }
  .title {
    margin: 0 0 2px;
    font-size: 18px;
    font-weight: 550;
    color: #000;
    text-align: center;
  }
  .details {
    margin: 0;
    font-size: 16px;
    color: #000;
    text-align: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td {
    border: 1px solid rgba(0, 0, 0, 0.22);
    padding: 5px 6px;
    vertical-align: middle;
  }
  th {
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    font-size: 12px;
  }
  td.c { text-align: center; }
  td.l { text-align: left; }
  /* Angular .rol-input — keep input look in print */
  input.rol {
    display: inline-block;
    width: 95%;
    max-width: 220px;
    border: 1px solid #b3b1b1;
    border-radius: 3px;
    padding: 5px;
    margin: 2px;
    text-align: center;
    font-size: 12px;
    background: #fff;
    color: #000;
  }
  col.si { width: 8%; }
  col.adm { width: 14%; }
  col.name { width: 30%; }
  col.roll { width: 24%; }
  col.ht { width: 24%; }
</style>
</head>
<body>
  ${headerHtml}
  <table>
    <colgroup>
      <col class="si" />
      <col class="adm" />
      <col class="name" />
      <col class="roll" />
      <col class="ht" />
    </colgroup>
    <thead>
      <tr>
        <th>Sl.No</th>
        <th>Admission No</th>
        <th>Student Name</th>
        <th>Roll Number</th>
        <th>Hallticket Number</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`);
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Legacy cascade + editable grid
export default function GenerateStudentRollnoPage() {
  const { user } = useSessionContext();

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  /** 0 = all sections (four-id list), > 0 = section-specific (five-id list). */
  const [groupSectionId, setGroupSectionId] = useState(0);

  const [students, setStudents] = useState<AnyRow[]>([]);

  const loadFilters = useCallback(async () => {
    const employeeId = Number(user?.employeeId ?? 0);
    const organizationId = Number(user?.organizationId ?? 0);
    setLoadingFilters(true);
    try {
      const r = await getStudentInfoCollegeFilters(organizationId, employeeId);
      setFiltersData(Array.isArray(r.filtersData) ? r.filtersData : []);
      setAcademicYearData(Array.isArray(r.academicData) ? r.academicData : []);

      const cols = dedupeColleges(
        Array.isArray(r.filtersData) ? r.filtersData : [],
      );
      if (cols.length) {
        setCollegeId(pickNum(cols[0], COL));
        setAcademicYearId(null);
        setCourseId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        setGroupSectionId(0);
      }
    } catch (e) {
      toastError(e, "Failed to load filters");
      setFiltersData([]);
      setAcademicYearData([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [user?.employeeId, user?.organizationId]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  const colleges = useMemo(() => dedupeColleges(filtersData), [filtersData]);

  const universityId = useMemo(() => {
    if (!collegeId || !filtersData.length) return 0;
    const row = filtersData.find((x) => pickNum(x, COL) === collegeId);
    return pickNum(row ?? {}, ["fk_university_id", "universityId"]);
  }, [collegeId, filtersData]);

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const raw = academicYearData.filter(
      (x) => pickNum(x, ["fk_university_id", "universityId"]) === universityId,
    );
    const deduped = dedupeByKey(raw, (r) => pickNum(r, AY));
    return deduped.sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? 0), 10) -
        parseInt(String(a.academic_year ?? 0), 10),
    );
  }, [universityId, academicYearData]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId(null);
      return;
    }
    setAcademicYearId((prev) => {
      if (prev && academicYears.some((y) => pickNum(y, AY) === prev))
        return prev;
      return pickNum(academicYears[0], AY);
    });
  }, [academicYears]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    const raw = filtersData.filter((x) => pickNum(x, COL) === collegeId);
    return dedupeByKey(raw, (r) => pickNum(r, CRS));
  }, [collegeId, filtersData]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId(null);
      return;
    }
    setCourseId((prev) => {
      if (prev && courses.some((c) => pickNum(c, CRS) === prev)) return prev;
      return pickNum(courses[0], CRS);
    });
  }, [courses]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const raw = filtersData.filter(
      (x) => pickNum(x, COL) === collegeId && pickNum(x, CRS) === courseId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, GRP));
  }, [collegeId, courseId, filtersData]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId(null);
      return;
    }
    setCourseGroupId((prev) => {
      if (prev && courseGroups.some((g) => pickNum(g, GRP) === prev))
        return prev;
      return pickNum(courseGroups[0], GRP);
    });
  }, [courseGroups]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    const raw = filtersData.filter(
      (x) =>
        pickNum(x, COL) === collegeId &&
        pickNum(x, CRS) === courseId &&
        pickNum(x, GRP) === courseGroupId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, YR));
  }, [collegeId, courseId, courseGroupId, filtersData]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId(null);
      return;
    }
    setCourseYearId((prev) => {
      if (prev && courseYears.some((y) => pickNum(y, YR) === prev)) return prev;
      return pickNum(courseYears[0], YR);
    });
  }, [courseYears]);

  const sectionRows = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId || !courseYearId) return [];
    const raw = filtersData.filter(
      (x) =>
        pickNum(x, COL) === collegeId &&
        pickNum(x, CRS) === courseId &&
        pickNum(x, GRP) === courseGroupId &&
        pickNum(x, YR) === courseYearId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, SEC));
  }, [collegeId, courseId, courseGroupId, courseYearId, filtersData]);

  useEffect(() => {
    setGroupSectionId(0);
    setStudents([]);
    setListVisible(false);
  }, [collegeId, academicYearId, courseId, courseGroupId, courseYearId]);

  const displayHeader = useMemo(() => {
    const c = colleges.find((x) => pickNum(x, COL) === collegeId);
    const ay = academicYears.find((x) => pickNum(x, AY) === academicYearId);
    const cr = courses.find((x) => pickNum(x, CRS) === courseId);
    const cg = courseGroups.find((x) => pickNum(x, GRP) === courseGroupId);
    const cy = courseYears.find((x) => pickNum(x, YR) === courseYearId);
    const sec =
      groupSectionId > 0
        ? sectionRows.find((x) => pickNum(x, SEC) === groupSectionId)
        : null;
    const collegeName =
      pickText(c, ["college_name", "collegeName"]) ||
      user?.collegeName ||
      pickText(c, ["college_code", "collegeCode"]) ||
      "College";
    const logoPath = pickText(c, [
      "logo_filename",
      "logoFilename",
      "logo",
      "logoPath",
      "logo_path",
    ]);
    const logoUrl = logoPath
      ? /^(https?:\/\/|data:)/i.test(logoPath)
        ? logoPath
        : `${MINIO_URL}${logoPath.replace(/^\/+/, "")}`
      : user?.collegeLogo
        ? /^(https?:\/\/|data:)/i.test(user.collegeLogo)
          ? user.collegeLogo
          : `${MINIO_URL}${user.collegeLogo.replace(/^\/+/, "")}`
        : null;
    return {
      collegeName,
      collegeCode: pickText(c, ["college_code", "collegeCode"]) || "—",
      academicYear: pickText(ay, ["academic_year", "academicYear"]) || "—",
      course: pickText(cr, ["course_code", "courseCode"]) || "—",
      courseGroup: pickText(cg, ["group_code", "groupCode"]) || "—",
      courseYear:
        pickText(cy, [
          "course_year_name",
          "courseYearName",
          "course_year_code",
        ]) || "—",
      // Angular `{{section}}` — empty when Section = Select (0)
      section:
        pickText(sec, [
          "section",
          "section_name",
          "sectionName",
          "group_section_name",
        ]) || "",
      logoUrl,
    };
  }, [
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    sectionRows,
    groupSectionId,
    user?.collegeName,
    user?.collegeLogo,
  ]);

  const tableSummary = useMemo(
    () =>
      `${displayHeader.collegeCode} / ${displayHeader.academicYear} / ${displayHeader.course} / ${displayHeader.courseGroup} / ${displayHeader.courseYear} / (Total Students: ${students.length})`,
    [displayHeader, students.length],
  );

  // Angular print details: college / AY / course / group / year / section
  const printFilterLine = useMemo(
    () =>
      `${displayHeader.collegeCode} / ${displayHeader.academicYear} / ${displayHeader.course} / ${displayHeader.courseGroup} / ${displayHeader.courseYear} / ${displayHeader.section}`,
    [displayHeader],
  );

  function printReport() {
    if (!students.length) {
      toastError(new Error("Empty"), "Load students first.");
      return;
    }
    const orgCode =
      globalThis?.localStorage?.getItem("orgCode") ??
      String(user?.organizationCode ?? "");
    printAssignRollReport({
      collegeName: displayHeader.collegeName,
      filterLine: printFilterLine,
      logoUrl: displayHeader.logoUrl,
      orgCode,
      rows: students,
    });
  }

  const handleGetList = useCallback(async () => {
    if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) {
      toastError(new Error("Filters"), "Select college through course year.");
      return;
    }
    setLoadingList(true);
    try {
      const rows = await listStudentsForRollNumberAssignment({
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
        groupSectionId: groupSectionId > 0 ? groupSectionId : undefined,
      });
      setStudents(rows.map((r) => ({ ...r })));
      setListVisible(true);
      if (!rows.length) toastSuccess("No students found for this selection.");
    } catch (e) {
      toastError(e, "Failed to load students");
      setStudents([]);
      setListVisible(true);
    } finally {
      setLoadingList(false);
    }
  }, [collegeId, academicYearId, courseGroupId, courseYearId, groupSectionId]);

  function updateStudentField(
    key: string,
    field: "rollNumber" | "hallticketNumber",
    value: string,
  ) {
    setStudents((prev) =>
      prev.map((row) =>
        rowStudentKey(row) === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function saveRollNumbers() {
    if (!students.length) {
      toastError(new Error("Empty"), "Load students first.");
      return;
    }
    setSaving(true);
    try {
      await submitStudentRollNumbers(students);
      toastSuccess("Roll numbers saved.");
      await handleGetList();
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const collegeOpts = colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label: pickText(r, ["college_code", "collegeCode"]) || "College",
  }));
  const ayOpts = academicYears.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
  const courseOpts = courses.map((r) => ({
    value: String(pickNum(r, CRS)),
    label: pickText(r, ["course_code", "courseCode"]) || "Course",
  }));
  const groupOpts = courseGroups.map((r) => ({
    value: String(pickNum(r, GRP)),
    label: pickText(r, ["group_code", "groupCode"]) || "Group",
  }));
  const yearOpts = courseYears.map((r) => ({
    value: String(pickNum(r, YR)),
    label:
      pickText(r, ["course_year_name", "courseYearName", "course_year_code"]) ||
      "Year",
  }));
  const sectionOpts = [
    { value: "0", label: "Select" },
    ...sectionRows.map((r) => ({
      value: String(pickNum(r, SEC)),
      label:
        pickText(r, ["section", "group_section_name", "groupSectionName"]) ||
        `Section ${pickNum(r, SEC)}`,
    })),
  ];

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Sl.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        cellClass: "text-center",
      },
      {
        headerName: "Admission No",
        minWidth: 140,
        flex: 1,
        valueGetter: (p) =>
          pickText(p.data, ["admissionNumber", "admission_no"]) || "",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        flex: 1.4,
        valueGetter: (p) =>
          pickText(p.data, ["firstName", "first_name", "studentName"]) || "",
      },
      {
        headerName: "Roll Number",
        minWidth: 180,
        flex: 1.2,
        sortable: false,
        filter: false,
        cellRenderer: makeTextInputRenderer("rollNumber", updateStudentField),
      },
      {
        headerName: "Hallticket Number",
        minWidth: 180,
        flex: 1.2,
        sortable: false,
        filter: false,
        cellRenderer: makeTextInputRenderer(
          "hallticketNumber",
          updateStudentField,
        ),
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Assign Student Roll Number"
      filterTitle="Assign Student Roll Number Filter"
      className="print:space-y-2"
      showTable={listVisible && students.length > 0}
      resultsVisible={listVisible && students.length > 0}
      loading={loadingList}
      pagination
      height="auto"
      rowHeight={44}
      getRowId={(p) => rowStudentKey(p.data ?? {})}
      rowData={students}
      columnDefs={columnDefs}
      tableHeader={
        <TableContextHeader
          title="Assign Student Roll Number"
          info={<span>{tableSummary}</span>}
        />
      }
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        searchFields: [
          "admissionNumber",
          "admission_no",
          "firstName",
          "first_name",
          "studentName",
          "rollNumber",
          "roll_number",
          "hallticketNumber",
          "hallticket_number",
        ],
        columnPicker: false,
        exportExcel: false,
        exportPdf: false,
        columnFilters: false,
      }}
      toolbarTrailing={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => exportRollExcel(students)}
            disabled={!students.length}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={printReport}
            disabled={!students.length}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        </div>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select
            label="College"
            placeholder="Select"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(parseSelectNumber(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={collegeOpts}
            disabled={loadingFilters || !collegeOpts.length}
            searchable
            className={selectClass()}
          />
          <Select
            label="Academic Year"
            placeholder="Select"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              setAcademicYearId(parseSelectNumber(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={ayOpts}
            disabled={loadingFilters || !ayOpts.length}
            searchable
            className={selectClass()}
          />
          <Select
            label="Course"
            placeholder="Select"
            value={courseId ? String(courseId) : null}
            onChange={(v) => {
              setCourseId(parseSelectNumber(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={courseOpts}
            disabled={loadingFilters || !courseOpts.length}
            searchable
            className={selectClass()}
          />
          <Select
            label="Course Group"
            placeholder="Select"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => {
              setCourseGroupId(parseSelectNumber(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={groupOpts}
            disabled={loadingFilters || !groupOpts.length}
            searchable
            className={selectClass()}
          />
          <Select
            label="Course Year"
            placeholder="Select"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => {
              setCourseYearId(parseSelectNumber(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={yearOpts}
            disabled={loadingFilters || !yearOpts.length}
            searchable
            className={selectClass()}
          />
          <Select
            label="Section"
            placeholder="Select"
            value={String(groupSectionId)}
            onChange={(v) => {
              setGroupSectionId(parseSelectNumberOrZero(v));
              setStudents([]);
              setListVisible(false);
            }}
            options={sectionOpts}
            disabled={loadingFilters || !courseYearId}
            searchable
            className={selectClass()}
          />
          <div className="mt-3 flex">
            <Button
              type="button"
              className="h-9 px-4 text-[12px]"
              onClick={() => void handleGetList()}
              disabled={loadingList || loadingFilters}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
          </div>
        </div>
      }
      // filtersFooter={

      // }
    >
      {listVisible && students.length > 0 ? (
        <div className="flex justify-end print:hidden">
          <Button
            type="button"
            className="h-9 px-4 text-[12px]"
            onClick={() => void saveRollNumbers()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
