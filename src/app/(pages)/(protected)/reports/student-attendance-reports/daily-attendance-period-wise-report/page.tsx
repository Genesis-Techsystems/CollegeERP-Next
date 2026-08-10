"use client";

/**
 * Daily Attendance Period Wise Report —
 * Angular `reports/student-attendance-reports/daily-attendance-period-wise-report` parity.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchDailyAttendancePeriodWiseReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  formatYmd,
  buildBannerHtml,
  escapeHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

type PeriodBatch = {
  batch_name: string | null;
  subject: string;
  sub_short_name: unknown;
  Subject_name: unknown;
};

type GroupedPeriod = {
  Period_no: string;
  timeset: unknown;
  subject_type: string;
  subject: unknown;
  sub_short_name: unknown;
  Subject_name: unknown;
  batches: PeriodBatch[];
};

type StudentAtt = {
  rollNumber: string;
  firstName: string;
  Father_Mobile_No: unknown;
  classes_attended: unknown;
  total_clasess: unknown;
};

type UniqueKey = {
  subject: string;
  sub_short_name: unknown;
  Faculty: unknown;
  Period_no: unknown;
  batch_name: unknown;
  Subject_name: unknown;
  subject_type: unknown;
  sub_credits: unknown;
};

const REPORT_TITLE = "Daily Attendance Period Wise Report";
const PRINT_TITLE = "Day Wise Attendance Report";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function getAttendance(
  resultList: AnyRow[],
  student: StudentAtt,
  periodNo: string,
  key: string | null,
): string {
  const record = resultList.find((r) => {
    if (str(r.RollNo) !== student.rollNumber) return false;
    if (str(r.Period_no) !== periodNo) return false;
    const type = str(r.subject_type);
    if (type === "LAB") return str(r.batch_name) === (key ?? "");
    if (type === "ELECTIVE") return str(r.subject_short_name) === (key ?? "");
    return true;
  });
  return record ? str(record.Present_Classes) || "-" : "-";
}

function getSummary(
  periodSummary: AnyRow[],
  period: GroupedPeriod,
  key: string | null,
  field: string,
): string | number {
  const record = periodSummary.find((p) => {
    if (str(p.Period_no) !== str(period.Period_no)) return false;
    if (period.subject_type === "LAB") return str(p.batch_name) === (key ?? "");
    if (period.subject_type === "ELECTIVE") {
      return str(p.subject_short_name) === (key ?? "");
    }
    return str(p.subject_short_name) === str(period.subject);
  });
  return record ? (record[field] as string | number) ?? 0 : 0;
}

function transformDailyRows(rows: AnyRow[], summary: AnyRow[]) {
  const groupedPeriods: GroupedPeriod[] = [];
  const studentAttendance: StudentAtt[] = [];

  for (const item of rows) {
    const periodName = str(item.Period_no);
    let periodGroup = groupedPeriods.find((x) => x.Period_no === periodName);
    if (!periodGroup) {
      periodGroup = {
        Period_no: periodName,
        timeset: item.timeset,
        subject_type: str(item.subject_type),
        subject: item.subject_short_name,
        sub_short_name: item.sub_short_name,
        Subject_name: item.Subject_name,
        batches: [],
      };
      groupedPeriods.push(periodGroup);
    }
    if (str(item.subject_type) === "LAB") {
      const exists = periodGroup.batches.some(
        (b) => b.batch_name === str(item.batch_name),
      );
      if (!exists) {
        periodGroup.batches.push({
          batch_name: str(item.batch_name),
          subject: str(item.subject_short_name),
          sub_short_name: item.sub_short_name,
          Subject_name: item.Subject_name,
        });
      }
    } else if (str(item.subject_type) === "ELECTIVE") {
      const exists = periodGroup.batches.some(
        (b) => b.subject === str(item.subject_short_name),
      );
      if (!exists) {
        periodGroup.batches.push({
          batch_name: null,
          subject: str(item.subject_short_name),
          Subject_name: item.Subject_name,
          sub_short_name: item.sub_short_name,
        });
      }
    }
  }

  for (const item of rows) {
    const roll = str(item.RollNo);
    if (!studentAttendance.some((s) => s.rollNumber === roll)) {
      studentAttendance.push({
        rollNumber: roll,
        firstName: str(item.Student_name),
        Father_Mobile_No: item.Father_Mobile_No,
        classes_attended: item.classes_attended,
        total_clasess: item.total_clasess,
      });
    }
  }

  groupedPeriods.sort((a, b) => a.Period_no.localeCompare(b.Period_no));

  const uniqueKeys: UniqueKey[] = Array.from(
    rows
      .reduce((map, item) => {
        const key = str(item.subject_short_name);
        if (!map.has(key)) {
          map.set(key, {
            subject: key,
            sub_short_name: item.sub_short_name,
            Faculty: item.Faculty,
            Period_no: item.Period_no,
            batch_name: item.batch_name,
            Subject_name: item.Subject_name,
            subject_type: item.subject_type,
            sub_credits: item.sub_credits,
          });
        }
        return map;
      }, new Map<string, UniqueKey>())
      .values(),
  );

  return {
    groupedPeriods,
    studentAttendance,
    uniqueKeys,
    resultList: rows,
    periodSummary: summary,
  };
}

function buildPeriodHeaderCells(groupedPeriods: GroupedPeriod[]): {
  row1: string;
  row2: string;
} {
  let row1 = "";
  let row2 = "";
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      row1 += `<th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;vertical-align:middle;">
        <div>${escapeHtml(str(period.timeset))}</div>
        <div>${escapeHtml(period.Period_no)}</div>
        <div title="${escapeHtml(str(period.Subject_name))}">${escapeHtml(str(period.subject))}</div>
        <div>(${escapeHtml(period.subject_type)})</div>
      </th>`;
    } else {
      const colspan = Math.max(period.batches.length, 1);
      row1 += `<th colspan="${colspan}" style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;">
        <div>${escapeHtml(str(period.timeset))}</div>
        <div>${escapeHtml(period.Period_no)}</div>
      </th>`;
      for (const batch of period.batches) {
        const label =
          period.subject_type === "LAB"
            ? `${escapeHtml(str(batch.batch_name))} (${escapeHtml(batch.subject)})`
            : escapeHtml(batch.subject);
        row2 += `<th style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;" title="${escapeHtml(str(batch.Subject_name))}">
          ${label}
          <div>(${escapeHtml(period.subject_type)})</div>
        </th>`;
      }
    }
  }
  return { row1, row2 };
}

function buildPeriodBodyCells(
  resultList: AnyRow[],
  student: StudentAtt,
  groupedPeriods: GroupedPeriod[],
): string {
  let cells = "";
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      const val = getAttendance(resultList, student, period.Period_no, null);
      const cls = val === "A" ? "color:#c00;font-weight:600;" : "";
      cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;${cls}">${escapeHtml(val)}</td>`;
    } else {
      for (const batch of period.batches) {
        const key =
          period.subject_type === "LAB" ? batch.batch_name : batch.subject;
        const val = getAttendance(
          resultList,
          student,
          period.Period_no,
          key,
        );
        const cls = val === "A" ? "color:#c00;font-weight:600;" : "";
        cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;${cls}">${escapeHtml(val)}</td>`;
      }
    }
  }
  return cells;
}

function buildSummaryRow(
  label: string,
  field: string,
  groupedPeriods: GroupedPeriod[],
  periodSummary: AnyRow[],
): string {
  let cells = "";
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;">${escapeHtml(str(getSummary(periodSummary, period, null, field)))}</td>`;
    } else {
      for (const batch of period.batches) {
        const key =
          period.subject_type === "LAB" ? batch.batch_name : batch.subject;
        cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;">${escapeHtml(str(getSummary(periodSummary, period, key, field)))}</td>`;
      }
    }
  }
  return `<tr>
    <td colspan="3" style="border:1px solid #333;padding:3px 5px;text-align:right;"><b>${escapeHtml(label)}</b></td>
    ${cells}
    <td style="border:1px solid #333;padding:3px 5px;"></td>
  </tr>`;
}

function buildReportTableHtml(opts: {
  groupedPeriods: GroupedPeriod[];
  studentAttendance: StudentAtt[];
  uniqueKeys: UniqueKey[];
  resultList: AnyRow[];
  periodSummary: AnyRow[];
}): string {
  const {
    groupedPeriods,
    studentAttendance,
    uniqueKeys,
    resultList,
    periodSummary,
  } = opts;
  const { row1, row2 } = buildPeriodHeaderCells(groupedPeriods);

  const body = studentAttendance
    .map((student, i) => {
      const total =
        student.classes_attended != null || student.total_clasess != null
          ? `${str(student.classes_attended) || "0"}/${str(student.total_clasess) || "0"}`
          : "";
      return `<tr>
        <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(student.rollNumber)}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(student.firstName)} (${escapeHtml(str(student.Father_Mobile_No))})</td>
        ${buildPeriodBodyCells(resultList, student, groupedPeriods)}
        <td style="border:1px solid #333;padding:3px 5px;mso-number-format:'\\@';">${escapeHtml(total)}</td>
      </tr>`;
    })
    .join("");

  const foot =
    buildSummaryRow(
      "Total Present",
      "TOTAL_PRESENT",
      groupedPeriods,
      periodSummary,
    ) +
    buildSummaryRow(
      "Total Absent",
      "TOTAL_ABSENT",
      groupedPeriods,
      periodSummary,
    ) +
    buildSummaryRow(
      "Total Strength",
      "TOTAL_STRENGTH",
      groupedPeriods,
      periodSummary,
    );

  const noteBody = uniqueKeys
    .map(
      (key, i) => `<tr>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(key.subject)}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Subject_name))} (<span style="color:blue;">${escapeHtml(str(key.subject_type))}</span>)</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Faculty))}</td>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${escapeHtml(str(key.sub_credits))}</td>
    </tr>`,
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;font-size:10px;">
  <thead>
    <tr>
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">S.No</th>
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Roll No.</th>
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Student</th>
      ${row1}
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Total Periods</th>
    </tr>
    <tr>${row2}</tr>
  </thead>
  <tbody>${body}</tbody>
  <tfoot>${foot}</tfoot>
</table>
<div style="padding:8px 0;margin-top:8px;">
  <p style="margin:7px 0;"><span style="font-weight:500;color:red;">Note :</span></p>
  <table style="width:100%;border-collapse:collapse;font-size:10px;">
    <thead>
      <tr>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">S.No</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Subject Code</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Subject</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Faculty</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Credit Points</th>
      </tr>
    </thead>
    <tbody>${noteBody}</tbody>
  </table>
</div>`;
}

export default function DailyAttendancePeriodWiseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [clsDate, setClsDate] = useState<Date | null>(() => new Date());
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [groupedPeriods, setGroupedPeriods] = useState<GroupedPeriod[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAtt[]>([]);
  const [uniqueKeys, setUniqueKeys] = useState<UniqueKey[]>([]);
  const [resultList, setResultList] = useState<AnyRow[]>([]);
  const [periodSummary, setPeriodSummary] = useState<AnyRow[]>([]);

  const clearResults = useCallback(() => {
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
    setGroupedPeriods([]);
    setStudentAttendance([]);
    setUniqueKeys([]);
    setResultList([]);
    setPeriodSummary([]);
  }, []);

  const filters = useAttendanceReportFilters({
    autoSelectFirstSection: false,
    onClearResults: clearResults,
  });

  const collegeNum = Number(filters.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const tableHtml = useMemo(() => {
    if (!showTable || studentAttendance.length === 0) return "";
    return buildReportTableHtml({
      groupedPeriods,
      studentAttendance,
      uniqueKeys,
      resultList,
      periodSummary,
    });
  }, [
    showTable,
    groupedPeriods,
    studentAttendance,
    uniqueKeys,
    resultList,
    periodSummary,
  ]);

  const handleGetList = async () => {
    const cid = Number(filters.collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!filters.academicYearId) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!filters.courseId) {
      toastInfo("Course is required");
      return;
    }
    if (!filters.courseGroupId) {
      toastInfo("Course Group is required");
      return;
    }
    if (!filters.courseYearId) {
      toastInfo("Course Year is required");
      return;
    }
    if (!filters.sectionId) {
      toastInfo("Section is required");
      return;
    }
    if (!clsDate) {
      toastInfo("Date is required");
      return;
    }

    setLoadingList(true);
    clearResults();
    const dateStr = formatYmd(clsDate);
    const details = filters.buildDataDetails([dateStr]);
    setDataDetails(details);

    try {
      const [raw, college] = await Promise.all([
        fetchDailyAttendancePeriodWiseReport({
          collegeId: cid,
          academicYearId: Number(filters.academicYearId || 0),
          courseYearId: Number(filters.courseYearId || 0),
          courseGroupId: Number(filters.courseGroupId || 0),
          sectionId: Number(filters.sectionId || 0),
          clsDate: dateStr,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            filters.collegeOptions.find((o) => o.value === filters.collegeId)
              ?.label ??
            "",
        ),
      );
      const transformed = transformDailyRows(raw.rows ?? [], raw.summary ?? []);
      if (transformed.studentAttendance.length === 0) {
        toastInfo("No attendance records found.");
        return;
      }
      setGroupedPeriods(transformed.groupedPeriods);
      setStudentAttendance(transformed.studentAttendance);
      setUniqueKeys(transformed.uniqueKeys);
      setResultList(transformed.resultList);
      setPeriodSummary(transformed.periodSummary);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = useCallback(() => {
    if (!tableHtml) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(PRINT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, tableHtml]);

  const handlePrintReport = useCallback(() => {
    if (!tableHtml) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: PRINT_TITLE,
      orgCode,
    });
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${PRINT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`);
  }, [collegeLogo, collegeName, dataDetails, orgCode, tableHtml]);

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
              value={filters.collegeId || null}
              onChange={filters.onCollegeChange}
              options={filters.collegeOptions}
              placeholder="College"
              isLoading={filters.loadingFilters}
            />
          </div>
          <div className="min-w-[8.5rem] flex-1 basis-[8.5rem] sm:min-w-[9.5rem]">
            <Select
              label="Academic Year"
              required
              value={filters.academicYearId || null}
              onChange={filters.onAyChange}
              options={filters.ayOptions}
              placeholder="Academic Year"
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
            <Select
              label="Course"
              required
              value={filters.courseId || null}
              onChange={filters.onCourseChange}
              options={filters.courseOptions}
              placeholder="Course"
              disabled={!filters.collegeId}
            />
          </div>
          <div className="min-w-[8rem] flex-1 basis-[8rem] sm:min-w-[9rem]">
            <Select
              label="Course Group"
              required
              value={filters.courseGroupId || null}
              onChange={filters.onGroupChange}
              options={filters.groupOptions}
              placeholder="Course Group"
              disabled={!filters.courseId}
            />
          </div>
          <div className="min-w-[7.5rem] flex-1 basis-[7.5rem] sm:min-w-[8.5rem]">
            <Select
              label="Course Year"
              required
              value={filters.courseYearId || null}
              onChange={filters.onYearChange}
              options={filters.yearOptions}
              placeholder="Course Year"
              disabled={!filters.courseGroupId}
            />
          </div>
          <div className="min-w-[7rem] flex-1 basis-[7rem] sm:min-w-[8rem]">
            <Select
              label="Section"
              required
              value={filters.sectionId || null}
              onChange={filters.onSectionChange}
              options={filters.sectionOptions}
              placeholder="Section"
              disabled={!filters.courseYearId}
            />
          </div>
          <div className="min-w-[9rem] flex-1 basis-[9rem] sm:min-w-[10rem]">
            <DatePicker
              label="Date"
              required
              value={clsDate}
              maxDate={today}
              clearable={false}
              displayFormat="dd-MMM-yyyy"
              onChange={(d) => {
                setClsDate(d);
                clearResults();
              }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Daily Attendance"}
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={handleExcelExport}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={handlePrintReport}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: tableHtml }}
            />
          </div>
        ) : null
      }
    />
  );
}
