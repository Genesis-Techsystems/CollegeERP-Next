"use client";

/**
 * Semester Wise Timetable Report —
 * Angular `reports/admin-timetable-reports/semester-wise-timetable-report` parity.
 * Results render as a readable HTML matrix (Angular-style), not AG Grid.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import {
  resolveLoginEmployeeId,
  resolveOrganizationId,
} from "@/lib/user-context";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  getAttendanceTimetableFilters,
  getCollegeById,
  getSemesterWiseTimetableReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildMatrixTableHtml,
  buildWeeklyTimetableMatrix,
  type PeriodKey,
} from "../_lib/timetable-matrix";
import {
  distinctAcademicYears,
  distinctColleges,
  distinctCourseGroups,
  distinctCourses,
  distinctCourseYears,
  distinctSections,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";

const REPORT_TITLE = "Semester Wise Timetable Report";

type SemesterMatrixRow = {
  label: string;
  cells: string[];
};

export default function SemesterWiseTimetableReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const orgId =
    resolveOrganizationId(user) ||
    (typeof window !== "undefined"
      ? Number(globalThis.localStorage.getItem("organizationId") || 0)
      : 0);
  const empId = loginEmployeeId || resolveLoginEmployeeId(user);

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [subjectKeys, setSubjectKeys] = useState<PeriodKey[]>([]);
  const [matrixRows, setMatrixRows] = useState<SemesterMatrixRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setSubjectKeys([]);
    setMatrixRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  // Angular parity: `cls_timtable_filters` with empty `in_gm_codes` (not QUOTA).
  const filtersQuery = useQuery({
    queryKey: QK.attendanceReports.timetableFilters(orgId, empId),
    queryFn: () => getAttendanceTimetableFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filterRows = useMemo(
    () =>
      Array.isArray(filtersQuery.data?.filtersData)
        ? filtersQuery.data.filtersData
        : [],
    [filtersQuery.data],
  );

  const colleges = useMemo(() => distinctColleges(filterRows), [filterRows]);
  const academicYears = useMemo(
    () => distinctAcademicYears(filterRows, Number(collegeId || 0)),
    [filterRows, collegeId],
  );
  const courses = useMemo(
    () =>
      distinctCourses(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
      ),
    [filterRows, collegeId, academicYearId],
  );
  const courseGroups = useMemo(
    () =>
      distinctCourseGroups(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId],
  );
  const courseYears = useMemo(
    () =>
      distinctCourseYears(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );
  const sections = useMemo(
    () =>
      distinctSections(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
        Number(courseYearId || 0),
      ),
    [
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
    ],
  );

  const collegeOptions = useMemo(
    () =>
      toSelectOptions(
        colleges,
        ["fk_college_id", "collegeId"],
        ["college_code", "collegeCode"],
      ),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      toSelectOptions(
        academicYears,
        ["fk_academic_year_id", "academicYearId"],
        ["academic_year", "academicYear"],
      ),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      toSelectOptions(
        courses,
        ["fk_course_id", "courseId"],
        ["course_code", "courseCode"],
      ),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      toSelectOptions(
        courseGroups,
        ["fk_course_group_id", "courseGroupId"],
        ["group_code", "groupCode"],
      ),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      toSelectOptions(
        courseYears,
        ["fk_course_year_id", "courseYearId"],
        ["course_year_name", "courseYearName"],
      ),
    [courseYears],
  );
  const sectionOptions = useMemo(
    () =>
      toSelectOptions(
        sections,
        ["fk_group_section_id", "groupSectionId", "sectionId"],
        ["section"],
      ),
    [sections],
  );

  useEffect(() => {
    if (!colleges.length) return;
    if (
      !colleges.some(
        (r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId),
      )
    ) {
      setCollegeId(
        String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    if (
      !academicYears.some(
        (r) =>
          num(r.fk_academic_year_id ?? r.academicYearId) ===
          Number(academicYearId),
      )
    ) {
      setAcademicYearId(
        String(
          num(
            academicYears[0].fk_academic_year_id ??
              academicYears[0].academicYearId,
          ),
        ),
      );
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      return;
    }
    if (
      !courses.some(
        (r) => num(r.fk_course_id ?? r.courseId) === Number(courseId),
      )
    ) {
      setCourseId(String(num(courses[0].fk_course_id ?? courses[0].courseId)));
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId("");
      return;
    }
    if (
      !courseGroups.some(
        (r) =>
          num(r.fk_course_group_id ?? r.courseGroupId) ===
          Number(courseGroupId),
      )
    ) {
      setCourseGroupId(
        String(
          num(
            courseGroups[0].fk_course_group_id ?? courseGroups[0].courseGroupId,
          ),
        ),
      );
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId("");
      return;
    }
    if (
      !courseYears.some(
        (r) =>
          num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId),
      )
    ) {
      setCourseYearId(
        String(
          num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId),
        ),
      );
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    if (!sections.length) {
      setSectionId("");
      return;
    }
    if (
      !sections.some(
        (r) =>
          num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId) ===
          Number(sectionId),
      )
    ) {
      setSectionId(
        String(
          num(
            sections[0].fk_group_section_id ??
              sections[0].groupSectionId ??
              sections[0].sectionId,
          ),
        ),
      );
    }
  }, [sections, sectionId]);

  const tableHtml = useMemo(() => {
    if (!showTable || matrixRows.length === 0) return "";
    return buildMatrixTableHtml({
      firstColHeader: "Days/Hours",
      keys: subjectKeys,
      rows: matrixRows,
    });
  }, [matrixRows, showTable, subjectKeys]);

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const coid = Number(courseId || 0);
    const gid = Number(courseGroupId || 0);
    const yid = Number(courseYearId || 0);
    const sid = Number(sectionId || 0);
    if (!cid || !ay || !coid || !gid || !yid || !sid) {
      toastInfo("All filters are required");
      return;
    }

    const college = colleges.find(
      (r) => num(r.fk_college_id ?? r.collegeId) === cid,
    );
    const ayRow = academicYears.find(
      (r) => num(r.fk_academic_year_id ?? r.academicYearId) === ay,
    );
    const course = courses.find(
      (r) => num(r.fk_course_id ?? r.courseId) === coid,
    );
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id ?? r.courseGroupId) === gid,
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id ?? r.courseYearId) === yid,
    );
    const section = sections.find(
      (r) =>
        num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId) === sid,
    );

    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      txt(ayRow?.academic_year ?? ayRow?.academicYear),
      txt(course?.course_code ?? course?.courseCode),
      txt(group?.group_code ?? group?.groupCode),
      txt(year?.course_year_name ?? year?.courseYearName),
      txt(section?.section),
    ]
      .filter(Boolean)
      .join(" / ");

    const fromDate = format(new Date(), "yyyy-MM-dd");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const [raw, collegeFull] = await Promise.all([
        getSemesterWiseTimetableReport({
          fromDate,
          collegeId: cid,
          courseId: coid,
          courseGroupId: gid,
          courseYearId: yid,
          academicYearId: ay,
          sectionId: sid,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          collegeFull?.collegeName ??
            college?.college_name ??
            college?.collegeName ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      const matrix = buildWeeklyTimetableMatrix(raw);
      setSubjectKeys(matrix.subjectKeys);
      setMatrixRows(
        matrix.studentTimetable.map((r) => ({
          label: r.WeekDay_Name,
          cells: r.subjectTimetable.map((c) => c.subject),
        })),
      );
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (!tableHtml) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:16px;font-weight:550;">${escapeHtml(REPORT_TITLE)}${dataDetails ? `-${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  };

  const printReport = async () => {
    if (!tableHtml) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId || 0);
    const logoSrc = await resolveTimetablePrintLogo(
      null,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      timetablePrintShell({
        title: escapeHtml(REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml,
        textAlign: "center",
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showTable && dataDetails
      ? `${REPORT_TITLE} - (${dataDetails})`
      : REPORT_TITLE;

  return (
    <FilteredPage
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              label="College"
              required
              value={collegeId || null}
              onChange={(v) => {
                setCollegeId(v ?? "");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Course"
              required
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId || null}
              onChange={(v) => {
                setCourseGroupId(v ?? "");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId || null}
              onChange={(v) => {
                setCourseYearId(v ?? "");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
            <Select
              label="Section"
              required
              value={sectionId || null}
              onChange={(v) => {
                setSectionId(v ?? "");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
              disabled={!courseYearId}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Timetable"}
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
                onClick={() => void printReport()}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>

            <div className="rounded border border-[#d0d7de]">
              <table className="w-full table-fixed border-collapse text-[12px] leading-snug">
                <thead>
                  <tr className="bg-[#d9edf7]">
                    <th className="w-[9%] border border-[#c5d6e0] bg-[#d9edf7] px-2 py-3 text-center font-semibold text-[#0b4f8a]">
                      Days/Hours
                    </th>
                    {subjectKeys.map((key) => {
                      const time = String(key.Period_Time ?? "").trim();
                      return (
                        <th
                          key={String(key.Period)}
                          className="border border-[#c5d6e0] px-2 py-3 text-center align-middle font-semibold text-[#0b4f8a]"
                        >
                          <div className="break-words">
                            {String(key.Period)}
                          </div>
                          {time ? (
                            <div className="mt-1 break-words text-[11px] font-medium text-[#e65100]">
                              {time}
                            </div>
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.label} className="bg-white">
                      <th className="border border-[#e0e0e0] bg-white px-2 py-3 text-center font-semibold text-blue-600">
                        {row.label}
                      </th>
                      {row.cells.map((cell, idx) => {
                        const isEmpty = !cell || cell === "-";
                        return (
                          <td
                            key={`${row.label}-${subjectKeys[idx]?.Period ?? idx}`}
                            className={`border border-[#e0e0e0] px-2 py-3 text-center align-middle text-[12px] text-foreground ${
                              isEmpty
                                ? "bg-[#f5f5f5] text-muted-foreground"
                                : "bg-white"
                            }`}
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            }}
                          >
                            {cell || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
