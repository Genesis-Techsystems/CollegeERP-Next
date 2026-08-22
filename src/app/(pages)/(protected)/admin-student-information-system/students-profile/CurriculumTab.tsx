"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadStudentCurriculumSemester,
  loadStudentCurriculumShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from "@/services";
import { formatProfileDate } from "./profile-utils";
import {
  PROFILE_TD,
  PROFILE_TH,
  ProfileEmptyRow,
  profileStatusClass,
} from "./profile-table";

type AnyRow = Record<string, any>;

const SEM_TAB_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[12px] whitespace-nowrap text-[#333] data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46] data-[state=active]:text-[#333] data-[state=active]:shadow-none";

function cell(row: AnyRow, keys: string[], empty = "—"): string {
  const v = pickProfileCell(row, keys);
  return v && v !== "—" ? v : empty;
}

function dashOr(value: string): string {
  return value && value !== "—" ? value : "-";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-1 text-base font-medium text-[#0c51a4]">{children}</p>
  );
}

export function CurriculumTab({ student }: { student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([]);
  const [academicDetails, setAcademicDetails] = useState<AnyRow[]>([]);
  const [activeSem, setActiveSem] = useState<string>("");
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [electives, setElectives] = useState<AnyRow[]>([]);
  const [labBatches, setLabBatches] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [semLoading, setSemLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const shell = await loadStudentCurriculumShell(student);
        if (cancelled) return;
        setSemesters(shell.semesters);
        setAcademicDetails(shell.academicDetails);
        if (shell.semesters[0])
          setActiveSem(String(shell.semesters[0].courseYearId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    const cyId = Number(activeSem);
    if (!cyId) return;
    const sem = semesters.find((s) => s.courseYearId === cyId);
    let cancelled = false;
    void (async () => {
      setSemLoading(true);
      try {
        const payload = await loadStudentCurriculumSemester(
          student,
          cyId,
          academicDetails,
          sem?.label,
        );
        if (cancelled) return;
        setSubjects(payload.subjects);
        setElectives(payload.electives);
        setLabBatches(payload.labBatches);
      } finally {
        if (!cancelled) setSemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, activeSem, academicDetails, semesters]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading curriculum…
      </p>
    );
  }

  return (
    <div className="rounded-sm border-2 border-[#B2EBF2] p-2.5">
      <SectionTitle>Student Semester Wise Subjects</SectionTitle>

      {semesters.length === 0 ? (
        <p className="py-4 text-sm font-medium text-[red]">
          No subjects are found.
        </p>
      ) : (
        <Tabs value={activeSem} onValueChange={setActiveSem}>
          <div className="overflow-x-auto border border-[#ffcf46]">
            <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
              {semesters.map((sem) => (
                <TabsTrigger
                  key={sem.courseYearId}
                  value={String(sem.courseYearId)}
                  className={SEM_TAB_CLASS}
                >
                  {sem.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      {semLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Loading…
        </p>
      ) : semesters.length > 0 ? (
        <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Left — subjects */}
          <div className="overflow-x-auto p-2">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${PROFILE_TH} w-[5%]`}>SI.No</th>
                  <th className={PROFILE_TH}>Academic Year</th>
                  <th className={PROFILE_TH}>Subject Code</th>
                  <th className={PROFILE_TH}>Subject Name</th>
                  <th className={PROFILE_TH}>Subject Type</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <ProfileEmptyRow
                    colSpan={5}
                    message="No subjects are found."
                  />
                ) : (
                  subjects.map((row, i) => (
                    <tr
                      key={`${cell(row, ["subjectCode"])}-${i}`}
                      className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                    >
                      <td className={PROFILE_TD}>{i + 1}</td>
                      <td className={PROFILE_TD}>
                        {cell(row, [
                          "academicYear",
                          "academic_year",
                          "academicYearName",
                        ])}
                      </td>
                      <td className={PROFILE_TD}>
                        {cell(row, ["subjectCode", "subject_code"])}
                      </td>
                      <td className={PROFILE_TD}>
                        {cell(row, ["subjectName", "subject_name"])}
                      </td>
                      <td className={PROFILE_TD}>
                        {cell(row, [
                          "subjecttypeName",
                          "subjectTypeName",
                          "subject_type_name",
                        ])}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Right — electives + labs */}
          <div className="space-y-3 p-2">
            <SectionTitle>Elective Group</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={`${PROFILE_TH} w-[5%]`}>SI.No</th>
                    <th className={PROFILE_TH}>Elective Group</th>
                    <th className={PROFILE_TH}>Subject</th>
                    <th className={PROFILE_TH}>From Date</th>
                    <th className={PROFILE_TH}>To Date</th>
                  </tr>
                </thead>
                <tbody>
                  {electives.length === 0 ? (
                    <ProfileEmptyRow
                      colSpan={5}
                      message="No Elective subjects are found."
                    />
                  ) : (
                    electives.map((row, i) => (
                      <tr
                        key={`el-${i}`}
                        className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                      >
                        <td className={PROFILE_TD}>{i + 1}</td>
                        <td className={PROFILE_TD}>
                          {cell(row, [
                            "electiveGroupName",
                            "elective_group_name",
                          ])}
                        </td>
                        <td className={PROFILE_TD}>
                          {cell(row, [
                            "electiveName",
                            "elective_name",
                            "subjectName",
                          ])}
                        </td>
                        <td className={PROFILE_TD}>
                          {formatProfileDate(row.fromDate ?? row.from_date)}
                        </td>
                        <td className={PROFILE_TD}>
                          {formatProfileDate(row.toDate ?? row.to_date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <SectionTitle>Lab Batches</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={`${PROFILE_TH} w-[5%]`}>SI.No</th>
                    <th className={PROFILE_TH}>Course</th>
                    <th className={PROFILE_TH}>Batch</th>
                    <th className={PROFILE_TH}>From Date</th>
                    <th className={PROFILE_TH}>To Date</th>
                  </tr>
                </thead>
                <tbody>
                  {labBatches.length === 0 ? (
                    <ProfileEmptyRow
                      colSpan={5}
                      message="No Lab subjects are found."
                    />
                  ) : (
                    labBatches.map((row, i) => (
                      <tr
                        key={`lab-${i}`}
                        className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                      >
                        <td className={PROFILE_TD}>{i + 1}</td>
                        <td className={PROFILE_TD}>
                          {cell(row, [
                            "displayName",
                            "display_name",
                            "courseName",
                            "subjectName",
                          ])}
                        </td>
                        <td className={PROFILE_TD}>
                          {cell(row, [
                            "batchName",
                            "batch_name",
                            "studentBatchName",
                            "labBatchName",
                          ])}
                        </td>
                        <td className={PROFILE_TD}>
                          {formatProfileDate(row.fromDate ?? row.from_date)}
                        </td>
                        <td className={PROFILE_TD}>
                          {formatProfileDate(row.toDate ?? row.to_date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <SectionTitle>Student Academic Details</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={PROFILE_TH}>SI.No</th>
              <th className={PROFILE_TH}>Academic Year</th>
              <th className={PROFILE_TH}>From Course Year</th>
              <th className={PROFILE_TH}>From Section</th>
              <th className={PROFILE_TH}>To Course Year</th>
              <th className={PROFILE_TH}>To Section</th>
              <th className={PROFILE_TH}>From Date</th>
              <th className={PROFILE_TH}>To Date</th>
              <th className={PROFILE_TH}>Student Status</th>
            </tr>
          </thead>
          <tbody>
            {academicDetails.length === 0 ? (
              <tr>
                <td colSpan={9} className={PROFILE_TD}>
                  —
                </td>
              </tr>
            ) : (
              academicDetails.map((row, i) => {
                const code = cell(
                  row,
                  ["studentStatusCode", "student_status_code", "statusCode"],
                  "",
                );
                const label = cell(
                  row,
                  [
                    "studentStatusName",
                    "studentStatusDisplayName",
                    "student_status",
                    "statusName",
                  ],
                  "",
                );
                return (
                  <tr
                    key={`ac-${i}`}
                    className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                  >
                    <td className={PROFILE_TD}>{i + 1}</td>
                    <td className={PROFILE_TD}>
                      {cell(row, ["academicYear", "academic_year"])}
                    </td>
                    <td className={PROFILE_TD}>
                      {cell(row, [
                        "fromCourseYearName",
                        "from_course_year_name",
                      ])}
                    </td>
                    <td className={PROFILE_TD}>
                      {dashOr(
                        cell(
                          row,
                          [
                            "fromGroupSectionName",
                            "fromSection",
                            "from_group_section",
                          ],
                          "",
                        ),
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {dashOr(
                        cell(
                          row,
                          ["toCourseYearName", "to_course_year_name"],
                          "",
                        ),
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {dashOr(
                        cell(
                          row,
                          [
                            "toGroupSectionName",
                            "toSection",
                            "to_group_section",
                          ],
                          "",
                        ),
                      )}
                    </td>
                    <td className={PROFILE_TD}>
                      {formatProfileDate(row.fromDate ?? row.from_date)}
                    </td>
                    <td className={PROFILE_TD}>
                      {row.toDate || row.to_date
                        ? formatProfileDate(row.toDate ?? row.to_date)
                        : "-"}
                    </td>
                    <td className={PROFILE_TD}>
                      {code ? (
                        <span className={profileStatusClass(code)}>
                          {label || code}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
