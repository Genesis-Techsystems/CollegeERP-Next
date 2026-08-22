"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadStudentExamResultsForSemester,
  loadStudentExamResultsShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from "@/services";
import { PROFILE_TD, PROFILE_TH, ProfileEmptyRow } from "./profile-table";

type AnyRow = Record<string, unknown>;

const SEM_TAB_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[12px] whitespace-nowrap text-[#333] data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46] data-[state=active]:text-[#333] data-[state=active]:shadow-none";

function examValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

/** Angular `exam-results` */
export function ExamResultsTab({ student }: { readonly student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([]);
  const [activeSem, setActiveSem] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [semLoading, setSemLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const shell = await loadStudentExamResultsShell(student);
        if (cancelled) return;
        setSemesters(shell.semesters);
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
    let cancelled = false;
    void (async () => {
      setSemLoading(true);
      try {
        const data = await loadStudentExamResultsForSemester(student, cyId);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setSemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, activeSem]);

  const resultLabel = useMemo(() => {
    if (!rows.length) return "";
    return pickProfileCell(rows[0], [
      "result",
      "examResult",
      "exam_result",
      "overallResult",
    ]);
  }, [rows]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <div className="space-y-2 rounded-sm border-2 border-[#B2EBF2] p-2">
      <p className="text-base font-medium text-[#0c51a4]">
        Semwise Exam Results
      </p>

      {!semesters.length ? (
        <p className="py-6 text-center text-sm font-medium text-[red]">
          No Results are found.
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
          {semesters.map((sem) => (
            <TabsContent
              key={sem.courseYearId}
              value={String(sem.courseYearId)}
              className="mt-2 max-w-[75%]"
            >
              {activeSem === String(sem.courseYearId) ? (
                <div className="space-y-2">
                  {semLoading ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Loading…
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className={PROFILE_TH}>SI.No</th>
                              <th className={PROFILE_TH}>Subject Code</th>
                              <th className={PROFILE_TH}>Subject</th>
                              <th className={PROFILE_TH}>Grade</th>
                              <th className={PROFILE_TH}>Grade Points</th>
                              <th className={PROFILE_TH}>Internal Marks</th>
                              <th className={PROFILE_TH}>External Marks</th>
                              <th className={PROFILE_TH}>Credits</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <ProfileEmptyRow
                                colSpan={8}
                                message="No Results are found."
                              />
                            ) : (
                              rows.map((row, i) => (
                                <tr
                                  key={i}
                                  className={
                                    i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"
                                  }
                                >
                                  <td className={PROFILE_TD}>{i + 1}</td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, [
                                      "subjectCode",
                                      "subject_code",
                                    ])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, [
                                      "subjectName",
                                      "subject_name",
                                    ])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, ["grade", "letterGrade"])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, [
                                      "gradePoints",
                                      "grade_points",
                                    ])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, [
                                      "internalMarks",
                                      "internal_marks",
                                      "intMarks",
                                    ])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, [
                                      "externalMarks",
                                      "external_marks",
                                      "extMarks",
                                    ])}
                                  </td>
                                  <td className={PROFILE_TD}>
                                    {examValue(row, ["credits", "credit"])}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {rows.length > 0 ? (
                        <p className="px-2 text-right text-xs font-semibold text-[#0c51a4]">
                          RESULT :{" "}
                          {resultLabel && resultLabel !== "—"
                            ? resultLabel
                            : ""}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
