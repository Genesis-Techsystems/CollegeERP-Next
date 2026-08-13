"use client";

/**
 * Master Timetable Report —
 * Angular `reports/admin-timetable-reports/master-timetable` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { escapeHtml } from "@/common/export-html-table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useSession } from "@/hooks/useSession";
import {
  fetchTimetableFilterRows,
  getCollegeById,
  getMasterTimetableReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  resolveAttendancePrintLogo as resolveTimetablePrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildMasterTimetablePivot,
  type MasterTimetablePivot,
} from "../_lib/master-timetable-pivot";
import {
  distinctAcademicYears,
  distinctColleges,
  distinctCourseGroups,
  distinctCourses,
  distinctCourseYears,
  num,
  toSelectOptions,
  txt,
} from "../_lib/timetable-report-filters";

const REPORT_TITLE = "Master Timetable Report";

function readEmpDeptId(): number {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return 0;
  }
  return num(globalThis.localStorage.getItem("empDeptId"));
}

function buildMasterPrintHtml(
  pivot: MasterTimetablePivot,
  dataDetails: string,
): string {
  const leftPanels = pivot.totalSems
    .map(
      (sem) => `
      <div style="margin-bottom:12px;">
        <p style="background:#e6e6e6;margin:0;text-align:center;padding:7px;">${escapeHtml(sem.label)}</p>
        <table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
          <tbody>
            ${sem.subjects
              .map(
                (sub) => `
              <tr>
                <td style="text-align:center;">${escapeHtml(sub.name)}</td>
                <td style="text-align:center;">${escapeHtml(sub.facultyList)} (${escapeHtml(sub.section)})</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`,
    )
    .join("");

  const weekdayPanels = pivot.totalWeekdays
    .map((week) => {
      const headerCells = pivot.keys
        .map(
          (k) =>
            `<th style="text-align:center;padding:4px;">${escapeHtml(k.time)}</th>`,
        )
        .join("");
      const bodyRows = week.list
        .map((row) => {
          const cells = pivot.keys
            .map((k) => {
              const match = row.periods.find(
                (p) => String(p.period) === String(k.Period),
              );
              return `<td style="text-align:center;padding:4px;">${escapeHtml(match?.subject ?? "")}</td>`;
            })
            .join("");
          return `<tr>
            <td style="text-align:center;padding:4px;">${escapeHtml(row.year)},${escapeHtml(row.section)}</td>
            ${cells}
          </tr>`;
        })
        .join("");
      return `
        <div style="margin-bottom:16px;break-inside:avoid;">
          <table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
            <thead><tr><th colspan="${pivot.keys.length + 1}" style="text-align:center;">${escapeHtml(week.weekday_name)}</th></tr></thead>
          </table>
          <table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:center;padding:4px;">Year</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="width:25%;min-width:180px;">
        <table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:center;">Subject</th>
              <th style="text-align:center;">Faculty</th>
            </tr>
          </thead>
        </table>
        ${leftPanels}
      </div>
      <div style="flex:1;display:flex;flex-wrap:wrap;gap:12px;">
        ${weekdayPanels}
      </div>
    </div>
    ${dataDetails ? `<p style="margin-top:8px;font-size:13px;">${escapeHtml(dataDetails)}</p>` : ""}
  `;
}

export default function MasterTimetableReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmployeeId } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("0");
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());

  const [pivot, setPivot] = useState<MasterTimetablePivot | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setPivot(null);
    setShowResults(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
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
    () => [
      { value: "0", label: "Select" },
      ...toSelectOptions(
        courseYears,
        ["fk_course_year_id", "courseYearId"],
        ["course_year_name", "courseYearName"],
      ),
    ],
    [courseYears],
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

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    const ay = Number(academicYearId || 0);
    const coid = Number(courseId || 0);
    const gid = Number(courseGroupId || 0);
    const yid = Number(courseYearId || 0);
    if (!cid || !ay || !coid || !gid) {
      toastInfo("College, Academic Year, Course and Course Group are required");
      return;
    }
    if (!fromDate) {
      toastInfo("From Date is required");
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

    const details = [
      txt(college?.college_code ?? college?.collegeCode),
      txt(ayRow?.academic_year ?? ayRow?.academicYear),
      txt(course?.course_code ?? course?.courseCode),
      txt(group?.group_code ?? group?.groupCode),
      yid ? txt(year?.course_year_name ?? year?.courseYearName) : "",
    ]
      .filter(Boolean)
      .join(" / ");

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const [raw, collegeFull] = await Promise.all([
        getMasterTimetableReport({
          fromDate: format(fromDate, "yyyy-MM-dd"),
          collegeId: cid,
          courseId: coid,
          courseGroupId: gid,
          courseYearId: yid,
          academicYearId: ay,
          employeeId: loginEmployeeId,
          departmentId: readEmpDeptId(),
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

      const built = buildMasterTimetablePivot(raw);
      if (built.totalWeekdays.length === 0) {
        toastInfo("No records are found.");
        return;
      }
      setPivot(built);
      setShowResults(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const printReport = async () => {
    if (!pivot) {
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
        tableHtml: buildMasterPrintHtml(pivot, dataDetails),
        textAlign: "center",
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showResults && dataDetails
      ? `${REPORT_TITLE} - (${dataDetails})`
      : REPORT_TITLE;

  return (
    <FilteredPage
      title={pageTitle}
      filtersCollapsible={false}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              value={courseYearId || "0"}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[10rem] sm:w-auto sm:min-w-[12rem]">
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  clearResults();
                }}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                placeholder="From Date"
              />
            </div>
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Master Timetable"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-fit px-4"
              onClick={goBack}
            >
              Back
            </Button>
            {showResults && pivot ? (
              <Button
                type="button"
                size="sm"
                data-table-primary-action
                className="h-9 px-3 text-[12px]"
                onClick={() => void printReport()}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            ) : null}
          </div>
        </div>
      }
      body={
        showResults && pivot ? (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="w-full shrink-0 lg:w-1/4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border bg-muted/40">
                    <th className="border px-2 py-1.5 text-center font-medium">
                      Subject
                    </th>
                    <th className="border px-2 py-1.5 text-center font-medium">
                      Faculty
                    </th>
                  </tr>
                </thead>
              </table>
              {pivot.totalSems.map((sem) => (
                <div key={`${sem.year}-${sem.sem}`} className="mt-2">
                  <p className="bg-muted py-1.5 text-center text-sm font-medium">
                    {sem.label}
                  </p>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {sem.subjects.map((sub, idx) => (
                        <tr key={`${sub.name}-${idx}`} className="border">
                          <td className="border px-2 py-1.5 text-center">
                            {sub.name}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {sub.facultyList} ({sub.section})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              {pivot.totalWeekdays.map((week) => (
                <div key={week.weekday_name} className="overflow-x-auto">
                  <table className="mb-1 w-full border-collapse text-sm">
                    <thead>
                      <tr className="border bg-muted/40">
                        <th
                          colSpan={pivot.keys.length + 1}
                          className="border px-2 py-1.5 text-center font-medium"
                        >
                          {week.weekday_name}
                        </th>
                      </tr>
                    </thead>
                  </table>
                  <table className="w-full min-w-[280px] border-collapse text-sm">
                    <thead>
                      <tr className="border bg-muted/30">
                        <th className="border px-2 py-1.5 text-center font-medium">
                          Year
                        </th>
                        {pivot.keys.map((k) => (
                          <th
                            key={String(k.Period)}
                            className="border px-2 py-1.5 text-center font-medium"
                          >
                            {k.time}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {week.list.map((row, ri) => (
                        <tr key={`${row.year}-${row.section}-${ri}`}>
                          <td className="border px-2 py-1.5 text-center">
                            {row.year},{row.section}
                          </td>
                          {pivot.keys.map((k) => {
                            const match = row.periods.find(
                              (p) => String(p.period) === String(k.Period),
                            );
                            return (
                              <td
                                key={String(k.Period)}
                                className="border px-2 py-1.5 text-center"
                              >
                                {match?.subject ?? ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    />
  );
}
