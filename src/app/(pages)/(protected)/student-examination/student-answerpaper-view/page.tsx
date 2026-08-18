"use client";

/**
 * Angular `student-examination/student-answerpaper-view`.
 * Student login: studentdetail + s_get_exam_student_results (std_evaluations)
 * + generatePresignedUrls for original / evaluated / moderation / re-eval PDFs.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2 } from "lucide-react";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  getStudentAnswerPaperEvaluations,
  getViewAnswerPaperPresignedUrl,
  openStudentAnswerPaperPdf,
} from "@/services";

type AnyRow = Record<string, unknown>;

function isStudentPortalUser(
  userTypeCode?: string,
  userRole?: string,
): boolean {
  const type = (userTypeCode ?? "").toUpperCase();
  const role = (userRole ?? "").toUpperCase();
  return (
    type === "STUDENT" ||
    type === "PARENT" ||
    role === "STUDENT" ||
    role === "MSTUDENT" ||
    role === "PARENT"
  );
}

function readStorageNum(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  const n = Number(globalThis.localStorage.getItem(key) ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function flagOn(row: AnyRow | null | undefined, key: string): boolean {
  return Number(row?.[key]) === 1;
}

function isPresent(value: unknown): boolean {
  return value != null && String(value).trim() !== "";
}

function isEmptyObject(obj: AnyRow | null): boolean {
  return !obj || Object.keys(obj).length === 0;
}

function studentStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, "")) {
    case "INCOLLEGE":
      return "incollege font-bold text-green-600";
    case "DTND":
      return "dtnd font-bold text-red-600";
    case "PASSEDOUT":
      return "passedout font-bold text-[#461eb6]";
    case "DISCONTINUED":
      return "discontinued font-bold text-red-600";
    case "DETAINRECOMMENDED":
      return "detainRecmnd font-bold text-orange-600";
    default:
      return "font-medium";
  }
}

const DEFAULT_PHOTO = "/assets/images/avatars/default_Student.png";

function isLateralStudent(student: AnyRow): boolean {
  const value = student.isLateral;
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
  );
}

function StudentHeader({ student }: { student: AnyRow }) {
  const isLateral = isLateralStudent(student);
  const statusCode = txt(student, ["studentStatusCode"]);
  const pathLine = [
    txt(student, ["collegeCode"]),
    txt(student, ["academicYear"]),
    txt(student, ["courseName"]),
    txt(student, ["groupCode"]),
    txt(student, ["courseYearName"]),
    student.section ? `Section ${String(student.section)}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  const name = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-2 mb-2 rounded-[3px] border-4 border-[#c3d9ff] bg-white">
      <div className="grid grid-cols-1 items-center gap-3 p-2 md:grid-cols-12">
        <div className="flex justify-center md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={txt(student, ["studentPhotoPath"]) || DEFAULT_PHOTO}
            alt=""
            className="h-24 w-24 bg-[#c3d9ff] p-1.5 object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("default_Student.png")) {
                img.src = DEFAULT_PHOTO;
              }
            }}
          />
        </div>
        <div className="min-w-0 text-[13px] font-medium leading-6 md:col-span-7">
          <p className="m-0 font-semibold text-[#042956]">
            {name} (
            <span className="text-blue-700">
              {isLateral ? "LATERAL" : "REGULAR"}
            </span>
            )
          </p>
          <p className="m-0 text-[#8c8c8c]">
            {txt(student, ["hallticketNumber"])}
          </p>
          {pathLine ? <p className="m-0 text-[#8c8c8c]">{pathLine}</p> : null}
          <p className="m-0 text-[#8c8c8c]">{txt(student, ["mobile"])}</p>
        </div>
        <div className="whitespace-nowrap text-[15px] md:col-span-3 md:text-left">
          <span>Student Status : </span>
          {statusCode ? (
            <span className={studentStatusClass(statusCode)}>
              {txt(student, ["studentStatusDisplayName"])}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EyeCell({
  path,
  type,
  busy,
  onView,
}: {
  path: unknown;
  type: "answerPaperPath" | "evaluatedAnswerPaperPath";
  busy: boolean;
  onView: (
    path: string,
    type: "answerPaperPath" | "evaluatedAnswerPaperPath",
  ) => void;
}) {
  if (!isPresent(path)) return <span>-</span>;
  return (
    <button
      type="button"
      title="View"
      disabled={busy}
      onClick={() => onView(String(path), type)}
      className="eye-icon inline-flex cursor-pointer text-[#042956] hover:opacity-80 disabled:opacity-50"
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}

function MarksWithPaper({
  marks,
  path,
  type,
  busy,
  onView,
}: {
  marks: unknown;
  path: unknown;
  type: "evaluatedAnswerPaperPath";
  busy: boolean;
  onView: (
    path: string,
    type: "answerPaperPath" | "evaluatedAnswerPaperPath",
  ) => void;
}) {
  return (
    <>
      <span>{isPresent(marks) ? String(marks) : "-"}</span>
      <span>
        &nbsp;|&nbsp;
        {isPresent(path) ? (
          <EyeCell path={path} type={type} busy={busy} onView={onView} />
        ) : (
          "-"
        )}
      </span>
    </>
  );
}

export default function StudentAnswerPaperViewPage() {
  useBreadcrumbLabel("Student AnswerPaper View");
  const { user, isLoading: sessionLoading } = useSessionContext();
  const isStudentPortal = isStudentPortalUser(
    user?.userTypeCode,
    user?.userRole,
  );
  const [viewing, setViewing] = useState(false);

  const studentId = useMemo(() => {
    const fromStorage = readStorageNum("studentId");
    const fromSession = Number(user?.studentId ?? 0);
    if (fromStorage > 0) return fromStorage;
    return Number.isFinite(fromSession) && fromSession > 0 ? fromSession : 0;
  }, [user?.studentId]);

  const userId = Number(user?.userId ?? 0);

  const studentQuery = useQuery({
    queryKey: QK.studentAnswerPaperView.student(studentId || userId),
    enabled:
      isStudentPortal && !sessionLoading && (studentId > 0 || userId > 0),
    queryFn: async () => {
      if (studentId > 0) {
        const byId = await fetchStudentDetail(studentId);
        if (byId) return byId;
      }
      if (userId > 0) return fetchStudentDetailByUserId(userId);
      return null;
    },
  });

  const resolvedStudentId = Number(studentQuery.data?.studentId ?? studentId);

  const resultsQuery = useQuery({
    queryKey: QK.studentAnswerPaperView.evaluations(resolvedStudentId),
    enabled:
      isStudentPortal &&
      resolvedStudentId > 0 &&
      !isEmptyObject(studentQuery.data),
    queryFn: () => getStudentAnswerPaperEvaluations(resolvedStudentId),
  });

  const student = studentQuery.data ?? null;
  const examResults = resultsQuery.data ?? [];
  const first = examResults[0] ?? null;
  const showExamDate = flagOn(first, "exam_date_flag");
  const showMod = flagOn(first, "mod_flag");
  const showReeval = flagOn(first, "reeval_flag");

  const viewAnswerPaper = async (
    path: string,
    type: "answerPaperPath" | "evaluatedAnswerPaperPath",
  ) => {
    setViewing(true);
    try {
      const url = await getViewAnswerPaperPresignedUrl(path, type);
      if (!url) return;
      openStudentAnswerPaperPdf(url);
    } catch (error) {
      toastError(error, "Failed to open answer paper");
    } finally {
      setViewing(false);
    }
  };

  useEffect(() => {
    if (resultsQuery.isError) {
      toastError(resultsQuery.error, "Failed to load answer papers");
    }
  }, [resultsQuery.isError, resultsQuery.error]);

  const loading = sessionLoading || studentQuery.isLoading;

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading answer papers…
        </div>
      </PageContainer>
    );
  }

  if (!isStudentPortal) {
    return (
      <PageContainer>
        <div className="app-card space-y-4 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Student AnswerPaper View is available only for student login.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-3">
      <div className="app-card overflow-hidden" data-no-page-name>
        <div className="flex items-center gap-2 border-b-2 border-[#ffcf46] px-6 py-3.5">
          <span
            className="material-icons text-[20px] leading-none text-[#0c51a4]"
            aria-hidden
          >
            computer
          </span>
          <strong className="text-[16px] font-medium text-[#0c51a4]">
            Student AnswerPaper View
          </strong>
        </div>

        <div className="px-[23px] py-3">
          {!isEmptyObject(student) ? (
            <StudentHeader student={student!} />
          ) : null}

          {resultsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading answer papers…
            </div>
          ) : examResults.length > 0 ? (
            <div className="overflow-x-auto p-2.5">
              <table className="w-full border-separate border-spacing-[1px] text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[5%] border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      SI.No
                    </th>
                    <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      Course Year
                    </th>
                    <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      Seat No
                    </th>
                    <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      Subject Name
                    </th>
                    {showExamDate ? (
                      <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                        Exam Date
                      </th>
                    ) : null}
                    <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      Original Answer Paper
                    </th>
                    <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                      Evaluation
                    </th>
                    {showMod ? (
                      <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                        Moderation
                      </th>
                    ) : null}
                    {showReeval ? (
                      <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                        Re-Evaluation
                      </th>
                    ) : null}
                    {showReeval ? (
                      <th className="border-b-[5px] border-[#c3d9ff] bg-[#C3D9FF] p-[5px] text-left font-medium">
                        Final Marks
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((row, i) => (
                    <tr
                      key={`${txt(row, ["subject_name", "omr_serial_no"])}-${i}`}
                      className={cn(i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white")}
                    >
                      <td className="p-[5px]">{i + 1}</td>
                      <td className="p-[5px]">
                        {txt(row, ["course_year_code"])}
                      </td>
                      <td className="p-[5px]">{txt(row, ["omr_serial_no"])}</td>
                      <td className="p-[5px]">{txt(row, ["subject_name"])}</td>
                      {showExamDate ? (
                        <td className="p-[5px] text-center">
                          {isPresent(row.exam_date_session)
                            ? String(row.exam_date_session)
                            : "-"}
                        </td>
                      ) : null}
                      <td className="p-[5px] text-center">
                        <EyeCell
                          path={row.original_answerpaper}
                          type="answerPaperPath"
                          busy={viewing}
                          onView={viewAnswerPaper}
                        />
                      </td>
                      <td className="p-[5px] text-center">
                        <MarksWithPaper
                          marks={row.evaluated_totalmarks}
                          path={row.evaluated_answerpaper_path}
                          type="evaluatedAnswerPaperPath"
                          busy={viewing}
                          onView={viewAnswerPaper}
                        />
                      </td>
                      {showMod ? (
                        <td className="p-[5px] text-center">
                          <MarksWithPaper
                            marks={row.moderated_totalmarks}
                            path={row.moderated_answerpath}
                            type="evaluatedAnswerPaperPath"
                            busy={viewing}
                            onView={viewAnswerPaper}
                          />
                        </td>
                      ) : null}
                      {showReeval ? (
                        <td className="p-[5px] text-center">
                          <MarksWithPaper
                            marks={row.reeval_totalmarks}
                            path={row.reeval_answerpath}
                            type="evaluatedAnswerPaperPath"
                            busy={viewing}
                            onView={viewAnswerPaper}
                          />
                        </td>
                      ) : null}
                      {showReeval ? (
                        <td className="p-[5px] text-center">
                          {isPresent(row.final_marks)
                            ? String(row.final_marks)
                            : "-"}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
