"use client";

/**
 * Subject Wise Attendance Report —
 * Angular `reports/student-attendance-reports/subject-wise-attendance-report` parity.
 * Get Attendance: `getAllRecords/s_rep_tt_std_subwise_attendance`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchAttendanceSubjectFilterRows,
  fetchSubjectWiseAttendanceReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  formatYmd,
  formatDateHeader,
  buildBannerHtml,
  escapeHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Subject Wise Attendance Report";

type DateCell = { present: string; per: unknown };
type StudentPivot = {
  rollNumber: string;
  Academic_details: string;
  firstName: string;
  Father_Mobile_No: string;
  subjectAttendance: DateCell[];
  present: number;
  total: number;
};

function pickText(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pivotSubjectWiseRows(raw: AnyRow[]): {
  dateKeys: string[];
  students: StudentPivot[];
  faculty: string;
} {
  const dateKeys: string[] = [];
  const students: StudentPivot[] = [];
  const byRoll = new Map<string, StudentPivot>();

  for (const row of raw) {
    const classDate = String(row.class_date ?? "");
    if (classDate && !dateKeys.includes(classDate)) {
      dateKeys.push(classDate);
    }

    let pRaw = row.P;
    let cRaw = row.C;
    let tpc: string;
    if (pRaw === "-") pRaw = 0;
    if (cRaw === "-") {
      cRaw = 0;
      tpc = "-";
    } else {
      tpc = `${pRaw}/${cRaw}`;
    }
    const p = Number(pRaw) || 0;
    const c = Number(cRaw) || 0;

    const roll = String(row.roll_number ?? "");
    const cell: DateCell = { present: tpc, per: row.Percentage };
    let student = byRoll.get(roll);
    if (!student) {
      student = {
        rollNumber: roll,
        Academic_details: String(row.Academic_details ?? ""),
        firstName: String(row.Student_name ?? ""),
        Father_Mobile_No: String(row.Father_Mobile_No ?? ""),
        subjectAttendance: [cell],
        present: p,
        total: c,
      };
      byRoll.set(roll, student);
      students.push(student);
    } else {
      student.subjectAttendance.push(cell);
      student.present += p;
      student.total += c;
    }
  }

  const faculty = pickText(raw[0] ?? {}, ["Faculty", "faculty"]);
  return { dateKeys, students, faculty };
}

function buildTableHtml(dateKeys: string[], students: StudentPivot[]): string {
  const dateHeaders = dateKeys
    .map(
      (d) =>
        `<th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: center; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">${escapeHtml(formatDateHeader(d))}</th>`,
    )
    .join("");

  const head = `
    <tr style="background-color: #dbeafe;">
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: left; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">S.No</th>
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: left; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">Academic Details</th>
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: left; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">Roll No.</th>
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: left; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">Student</th>
      ${dateHeaders}
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: center; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">Total</th>
      <th style="padding: 10px 12px; background-color: #dbeafe; color: #1e3a8a; font-weight: 600; text-align: center; border: 1px solid #bfdbfe; font-size: 13px; white-space: nowrap;">Percentage(%)</th>
    </tr>`;

  const body = students
    .map((s, i) => {
      const cells = s.subjectAttendance
        .map(
          (a) =>
            `<td style="padding: 8px 12px; text-align: center; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; mso-number-format:'\\@';">${escapeHtml(a.present)}</td>`,
        )
        .join("");
      const pct =
        s.total > 0 ? ((s.present / s.total) * 100).toFixed(2) : "0.00";
      const mobile = s.Father_Mobile_No
        ? ` (<span style="color:#2563eb; font-weight: 500;">${escapeHtml(s.Father_Mobile_No)}</span>)`
        : "";
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr style="background-color: ${bg}; transition: background-color 0.15s ease;" onmouseover="this.style.backgroundColor='#f1f5f9'" onmouseout="this.style.backgroundColor='${bg}'">
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${i + 1}</td>
        <td style="padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${escapeHtml(s.Academic_details)}</td>
        <td style="padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500;">${escapeHtml(s.rollNumber)}</td>
        <td style="padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 13px; color: #334155;">${escapeHtml(s.firstName)}${mobile}</td>
        ${cells}
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500; mso-number-format:'\\@';">${escapeHtml(`${s.present}/${s.total}`)}</td>
        <td style="padding: 8px 12px; text-align: center; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: 500;">${escapeHtml(pct)}</td>
      </tr>`;
    })
    .join("");

  return `<table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; border: 1px solid #bfdbfe;">
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table>`;
}

export default function SubjectWiseAttendanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [subjectId, setSubjectId] = useState("");
  const [minPer, setMinPer] = useState(0);
  const [maxPer, setMaxPer] = useState(100);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentPivot[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchText, setSearchText] = useState("");

  const clearResults = useCallback(() => {
    setDateKeys([]);
    setStudents([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
    setSearchText("");
  }, []);

  const f = useAttendanceReportFilters({
    defaultSectionZero: true,
    onClearResults: clearResults,
  });

  const collegeNum = Number(f.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  // Load subjects when cascade is ready (Angular selectedSection)
  useEffect(() => {
    setSubjectId("");
    setSubjectOptions([]);
    const cid = Number(f.collegeId || 0);
    const ay = Number(f.academicYearId || 0);
    const cr = Number(f.courseId || 0);
    const g = Number(f.courseGroupId || 0);
    const y = Number(f.courseYearId || 0);
    if (!cid || !ay || !cr || !g || !y) return;

    let cancelled = false;
    setLoadingSubjects(true);
    void fetchAttendanceSubjectFilterRows({
      collegeId: cid,
      courseId: cr,
      courseGroupId: g,
      courseYearId: y,
      groupSectionId: Number(f.sectionId || 0),
      academicYearId: ay,
    })
      .then((rows) => {
        if (cancelled) return;
        const seen = new Set<number>();
        const opts: SelectOption[] = [];
        for (const row of rows) {
          const id = pickNum(row, ["fk_subject_id", "subjectId"]);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const code = pickText(row, ["subject_code", "subjectCode"]);
          const name = pickText(row, ["subject_name", "subjectName"]);
          // Angular: "Subject Name (SUBJECTCODE)"
          const label =
            name && code ? `${name} (${code})` : name || code || String(id);
          opts.push({ value: String(id), label });
        }
        setSubjectOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    f.collegeId,
    f.academicYearId,
    f.courseId,
    f.courseGroupId,
    f.courseYearId,
    f.sectionId,
  ]);

  const onFromChange = (d: Date | null) => {
    setFromDate(d);
    clearResults();
    if (d && toDate && toDate.getTime() < d.getTime()) {
      setToDate(d);
    }
  };

  const onToChange = (d: Date | null) => {
    if (d && fromDate && d.getTime() < fromDate.getTime()) {
      setToDate(fromDate);
    } else {
      setToDate(d);
    }
    clearResults();
  };

  const handleGetAttendance = async () => {
    const cid = Number(f.collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!f.academicYearId) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!f.courseId || !f.courseGroupId || !f.courseYearId) {
      toastInfo("Course, Course Group and Course Year are required");
      return;
    }
    if (!subjectId) {
      toastInfo("Subject is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const min = Number(minPer);
    const max = Number(maxPer);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      toastError("Min % cannot be greater than Max %");
      return;
    }

    setLoadingList(true);
    clearResults();
    const subjectLabel =
      subjectOptions.find((o) => o.value === subjectId)?.label ?? "";
    const from = formatYmd(fromDate);
    const to = formatYmd(toDate);
    try {
      const [raw, college] = await Promise.all([
        fetchSubjectWiseAttendanceReport({
          collegeId: cid,
          courseYearId: Number(f.courseYearId),
          courseGroupId: Number(f.courseGroupId),
          academicYearId: Number(f.academicYearId),
          sectionId: Number(f.sectionId || 0),
          fromDate: from,
          toDate: to,
          subjectId: Number(subjectId),
          fromPercentage: min,
          toPercentage: max,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
          f.collegeOptions.find((o) => o.value === f.collegeId)?.label ??
          "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No attendance records found.");
        return;
      }
      const pivoted = pivotSubjectWiseRows(raw);
      const details = f.buildDataDetails(
        [subjectLabel, from, to, pivoted.faculty, `${min}-${max}`].filter(
          Boolean,
        ),
      );
      setDataDetails(details);
      setDateKeys(pivoted.dateKeys);
      setStudents(pivoted.students);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.rollNumber.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        s.Academic_details.toLowerCase().includes(q) ||
        s.Father_Mobile_No.toLowerCase().includes(q),
    );
  }, [students, searchText]);

  const tableHtml = useMemo(
    () => buildTableHtml(dateKeys, filteredStudents),
    [dateKeys, filteredStudents],
  );

  const handleExcelExport = useCallback(() => {
    if (students.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildTableHtml(dateKeys, students),
      headerHtml,
    );
  }, [dataDetails, dateKeys, students]);

  const handlePrintReport = useCallback(() => {
    if (students.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: REPORT_TITLE,
      orgCode,
    });
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${REPORT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${buildTableHtml(dateKeys, students)}
</body></html>`);
  }, [collegeLogo, collegeName, dataDetails, dateKeys, orgCode, students]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? dataDetails
      ? `${REPORT_TITLE} — ${dataDetails}`
      : REPORT_TITLE
    : REPORT_TITLE;

  return (
    <FilteredPage
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="College"
              required
              value={f.collegeId || null}
              onChange={f.onCollegeChange}
              options={f.collegeOptions}
              placeholder="College"
              isLoading={f.loadingFilters}
            />
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
            <Select
              label="Academic Year"
              required
              value={f.academicYearId || null}
              onChange={f.onAyChange}
              options={f.ayOptions}
              placeholder="Academic Year"
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
            <Select
              label="Course"
              required
              value={f.courseId || null}
              onChange={f.onCourseChange}
              options={f.courseOptions}
              placeholder="Course"
              disabled={!f.collegeId}
            />
          </div>
          <div className="min-w-[8rem] flex-1 basis-[8rem] sm:min-w-[9rem]">
            <Select
              label="Course Group"
              required
              value={f.courseGroupId || null}
              onChange={f.onGroupChange}
              options={f.groupOptions}
              placeholder="Course Group"
              disabled={!f.courseId}
            />
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="Course Year"
              required
              value={f.courseYearId || null}
              onChange={f.onYearChange}
              options={f.yearOptions}
              placeholder="Course Year"
              disabled={!f.courseGroupId}
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
            <Select
              label="Section"
              required
              value={f.sectionId || "0"}
              onChange={f.onSectionChange}
              options={f.sectionOptionsWithAll}
              placeholder="Section"
              disabled={!f.courseYearId}
            />
          </div>
          <div className="min-w-[12rem] flex-1 basis-[12rem] sm:min-w-[14rem]">
            <Select
              label="Subject"
              required
              searchable
              value={subjectId || null}
              onChange={(v) => {
                setSubjectId(v ?? "");
                clearResults();
              }}
              options={subjectOptions}
              placeholder="Subject"
              isLoading={loadingSubjects}
              disabled={!f.courseYearId}
            />
          </div>
          <div className="min-w-[9rem] flex-1 basis-[9rem]">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={onFromChange}
              displayFormat="dd-MM-yyyy"
              clearable={false}
            />
          </div>
          <div className="min-w-[9rem] flex-1 basis-[9rem]">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={onToChange}
              displayFormat="dd-MM-yyyy"
              minDate={fromDate ?? undefined}
              clearable={false}
            />
          </div>
          <div className="w-[5.5rem]">
            <Label className="mb-1.5 block text-[12px] font-medium">
              Min %
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minPer}
              onChange={(e) => {
                setMinPer(Number(e.target.value));
                clearResults();
              }}
              className="h-9"
            />
          </div>
          <div className="w-[5.5rem]">
            <Label className="mb-1.5 block text-[12px] font-medium">
              Max %
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={maxPer}
              onChange={(e) => {
                setMaxPer(Number(e.target.value));
                clearResults();
              }}
              className="h-9"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetAttendance()}
            >
              {loadingList ? "Loading…" : "Get Attendance"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-fit px-4"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      body={
        showTable ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                type="search"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-9 max-w-xs"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-[#1e3a8a] px-3 text-[12px] text-white hover:bg-[#1e40af]"
                  onClick={handleExcelExport}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-[#1e3a8a] px-3 text-[12px] text-white hover:bg-[#1e40af]"
                  onClick={handlePrintReport}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: tableHtml }}
            />
          </div>
        ) : undefined
      }
    />
  );
}
