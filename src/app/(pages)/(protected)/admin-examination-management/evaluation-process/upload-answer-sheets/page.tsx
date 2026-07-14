"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  runEvaluationProc,
  uploadExamOmr,
} from "@/services/evaluation-process-admin";
import { getUnivExamFiltersByType } from "@/services/pre-examination";
import { EXAM_EVAL_API, MINIO_URL } from "@/config/constants/api";
import { dedupeBy, num } from "@/common/utils/data-helpers";
import { toastError } from "@/lib/toast";

type AnyRow = Record<string, any>;

type SummaryRow = {
  total_students: number;
  attendance_marked: number;
  attendance_not_marked: number;
  presented_Students: number;
  no_oof_answerpaper_uploaded: number;
};

type UploadedFile = {
  fileName: string;
  folder: string;
  status: string;
  view: string;
};

// Angular uploadFiles(): per file, folder = path[0], fileName = path[1] (the
// student/OMR folder), falling back to the file name.
function toUploadedFile(file: File): UploadedFile {
  const path = String(
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name,
  );
  const pieces = path.split(/[/\\]/).filter(Boolean);
  if (pieces.length >= 2) {
    return {
      folder: pieces[0] ?? "",
      fileName: pieces[1] ?? file.name,
      status: "Pending",
      view: "",
    };
  }
  return {
    folder: "",
    fileName: file.name,
    status: "Pending",
    view: "",
  };
}

// Best-effort extraction of the stored path from the upload response.
function extractUploadedPath(res: unknown): string {
  if (typeof res === "string") return res;
  if (Array.isArray(res) && typeof res[0] === "string") return res[0];
  const data = (res as { data?: unknown } | null)?.data;
  if (typeof data === "string") return data;
  if (Array.isArray(data) && typeof data[0] === "string") return data[0];
  return "";
}

function toMinioUrl(path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = (MINIO_URL || "").replace(/\/?$/, "/");
  return `${base}${p.replace(/^\/+/, "")}`;
}

/** Angular: getAnswerPaperUploadUrl → getAllRecords/s_get_answerpaperupload_details */
async function fetchAnswerPaperSummary(
  params: Record<string, string | number>,
): Promise<AnyRow[][]> {
  const procs = [
    EXAM_EVAL_API.ANSWER_PAPER_UPLOAD_DETAILS,
    "s_get_collegeexamdetails_bycode",
    "s_get_collegewisedetails_bycode",
  ];
  for (const proc of procs) {
    try {
      const data = await runEvaluationProc<{
        result?: AnyRow[][];
        data?: { result?: AnyRow[][] };
      }>(proc, params);
      const result = data?.result ?? data?.data?.result ?? [];
      if (Array.isArray(result) && result.length > 0) return result;
    } catch {
      // try next
    }
  }
  return [];
}

export default function UploadAnswerSheetsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examDate, setExamDate] = useState<string>("");
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ).sort((a, b) =>
        String(b.academic_year ?? "").localeCompare(
          String(a.academic_year ?? ""),
        ),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId) &&
            !(r.is_internal_exam === true || r.is_internal_exam === 1),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const examDates = useMemo(
    () =>
      dedupeBy(subjectRows, (r) => String(r.exam_date ?? ""))
        .map((r) => String(r.exam_date ?? ""))
        .filter(Boolean),
    [subjectRows],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter((r) => String(r.exam_date ?? "") === examDate),
        (r) => num(r.fk_regulation_id),
      ),
    [subjectRows, examDate],
  );
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (r) =>
            String(r.exam_date ?? "") === examDate &&
            num(r.fk_regulation_id) === num(regulationId),
        ),
        (r) => num(r.fk_subject_id),
      ),
    [subjectRows, examDate, regulationId],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: String(r.course_code ?? ""),
      })),
    [courses],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: String(r.academic_year ?? ""),
      })),
    [academicYears],
  );
  const examOptions = useMemo(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: String(r.exam_name ?? ""),
      })),
    [exams],
  );
  const examDateOptions = useMemo(
    () => examDates.map((d) => ({ value: d, label: d })),
    [examDates],
  );
  const regulationOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: String(r.regulation_code ?? ""),
      })),
    [regulations],
  );
  const subjectOptions = useMemo(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `(${r.subject_code}) ${r.subject_name}`,
      })),
    [subjects],
  );

  useEffect(() => {
    async function loadFilters() {
      setLoading(true);
      try {
        const rows = await getUnivExamFiltersByType(employeeId, "ALL").catch(
          () => [],
        );
        const list = Array.isArray(rows) ? rows : [];
        setBaseRows(list);
        const firstCourseId = num(list[0]?.fk_course_id);
        if (firstCourseId > 0) setCourseId(firstCourseId);
      } finally {
        setLoading(false);
      }
    }
    void loadFilters();
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) return;
    const firstAy = academicYears[0];
    setAcademicYearId(num(firstAy?.fk_academic_year_id) || null);
  }, [courseId, academicYears]);

  useEffect(() => {
    if (!academicYearId) return;
    const firstExam = exams[0];
    setExamId(num(firstExam?.fk_exam_id) || null);
  }, [academicYearId, exams]);

  useEffect(() => {
    async function loadExamSubjectFilters() {
      if (!courseId || !academicYearId || !examId) {
        setSubjectRows([]);
        return;
      }
      setLoading(true);
      try {
        const data = await runEvaluationProc<{ result: AnyRow[][] }>(
          "s_get_exam_filters_bycode",
          {
            in_flag: "univ_exam_subject_intt",
            in_flag_type: "REGSUP",
            in_university_id: 0,
            in_univ_examcenter_id: 0,
            in_college_id: 0,
            in_course_id: courseId,
            in_course_group_id: 0,
            in_course_year_id: 0,
            in_exam_id: examId,
            in_academic_year_id: academicYearId,
            in_regulation_id: 0,
            in_subject_id: 0,
            in_sub_flag_type: "",
            in_param1: 0,
            in_param2: 0,
            in_loginuser_roleid: 0,
            in_loginuser_empid: employeeId,
          },
        ).catch(() => ({ result: [] }));
        const groups = data?.result ?? [];
        const match =
          groups.find((g) => (g?.[0]?.flag ?? "") === "univ_exam_sub_intt") ??
          [];
        setSubjectRows(match);
      } finally {
        setLoading(false);
      }
    }
    void loadExamSubjectFilters();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setExamDate(examDates[0] ?? "");
  }, [examDates]);

  useEffect(() => {
    setRegulationId(num(regulations[0]?.fk_regulation_id) || null);
  }, [regulations]);

  useEffect(() => {
    // Auto-populate the first subject (filters cascade fully on load).
    setSubjectId(num(subjects[0]?.fk_subject_id) || null);
  }, [subjects]);

  async function checkUploadStatus() {
    if (!academicYearId || !examId || !examDate || !subjectId) return;
    setLoading(true);
    try {
      const groups = await fetchAnswerPaperSummary({
        in_flag: "exam_timetable_answerpaper_details",
        in_org_id: organizationId || 0,
        in_college_id: 0,
        in_academic_year_id: academicYearId,
        in_isadmin: 0,
        in_exam_id: examId,
        in_timetable_id: 0,
        in_exam_date: examDate,
        in_subject_id: subjectId,
        in_loginuser_empid: 0,
        in_loginuser_roleid: 0,
      });
      if (groups.length === 0) {
        setSummary(null);
        toastError(
          "Unable to load upload status (answer paper details). Please try again.",
        );
        return;
      }
      const first = (groups[0] ?? [])[0] ?? null;
      setSummary(first as SummaryRow | null);
    } finally {
      setLoading(false);
    }
  }

  function onFilesSelected(fileList: FileList | null) {
    const arr = Array.from(fileList ?? []);
    setSelectedFilesCount(arr.length);
    setUploadedFiles(arr.map(toUploadedFile));
  }

  async function handleUpload() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const arr = Array.from(files);
      for (const file of arr) {
        const { fileName } = toUploadedFile(file);
        setUploadedFiles((prev) =>
          prev.map((u) =>
            u.fileName === fileName ? { ...u, status: "Progress" } : u,
          ),
        );
        const form = new FormData();
        form.append("file", file, file.name);
        try {
          const res = await uploadExamOmr(form);
          const view = extractUploadedPath(res);
          setUploadedFiles((prev) =>
            prev.map((u) =>
              u.fileName === fileName
                ? { ...u, status: view ? "Success" : "File not found", view }
                : u,
            ),
          );
        } catch {
          setUploadedFiles((prev) =>
            prev.map((u) =>
              u.fileName === fileName ? { ...u, status: "File not found" } : u,
            ),
          );
        }
      }
      // Angular submit() -> AssignmentRun(): populate student assignment for the
      // exam after the answer sheets are uploaded (flag 'popstudentassignment').
      if (examId) {
        await runEvaluationProc("s_pop_exam_evaluatorassignment", {
          in_flag: "popstudentassignment",
          in_profileids: "",
          in_exam_evaluationassignment_ids: "",
          in_omr_serial_nos: "",
          in_timetable_det_ids: "",
          in_exam_id: examId,
          in_subject_id: 0,
          in_course_year_id: 0,
        }).catch(() => null);
      }
      await checkUploadStatus();
      setSelectedFilesCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  const absent = Math.max(
    num(summary?.attendance_marked) - num(summary?.presented_Students),
    0,
  );
  const notUploaded = Math.max(
    num(summary?.presented_Students) -
      num(summary?.no_oof_answerpaper_uploaded),
    0,
  );
  const selectedSubject = subjects.find(
    (s) => num(s.fk_subject_id) === num(subjectId),
  );
  const subjectLabel = selectedSubject
    ? `${selectedSubject.subject_name ?? ""} (${selectedSubject.subject_code ?? ""})`
    : "";

  return (
    <FilteredPage
      title="Upload Answer Sheets"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(num(v) || null)}
              options={courseOptions}
              placeholder="Course"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(num(v) || null)}
              options={academicYearOptions}
              placeholder="Academic Year"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam">
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(num(v) || null)}
              options={examOptions}
              placeholder="Exam"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Date">
            <Select
              value={examDate || null}
              onChange={(v) => setExamDate(v ?? "")}
              options={examDateOptions}
              placeholder="Exam Date"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation">
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(num(v) || null)}
              options={regulationOptions}
              placeholder="Regulation"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Subject">
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(num(v) || null)}
              options={subjectOptions}
              placeholder="Subject"
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        num(subjectId) > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  webkitdirectory=""
                  multiple
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-md bg-sky-500 hover:bg-sky-600 transition-colors text-white py-6 px-4 flex flex-col items-center justify-center gap-2"
                >
                  <div className="h-14 w-14 rounded-full bg-card text-sky-500 flex items-center justify-center text-lg font-bold">
                    UP
                  </div>
                  <div className="font-semibold text-[13px]">
                    Upload Answer Papers
                  </div>
                  {selectedFilesCount > 0 && (
                    <div className="text-[11px] opacity-90">
                      {selectedFilesCount} files selected
                    </div>
                  )}
                </button>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    className="h-8 text-[12px] w-full"
                    disabled={uploading || selectedFilesCount === 0}
                    onClick={handleUpload}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
              <div className="md:col-span-9 border-2 border-cyan-400 rounded-sm p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    type="button"
                    className="h-8 px-3 text-[12px]"
                    onClick={checkUploadStatus}
                    disabled={
                      loading ||
                      !academicYearId ||
                      !examId ||
                      !subjectId ||
                      !examDate
                    }
                  >
                    Check Upload Status
                  </Button>
                  {subjectLabel && (
                    <span className="text-[12px] font-medium">
                      ({subjectLabel} / {examDate})
                    </span>
                  )}
                </div>
                <div className="text-[14px] font-semibold leading-7">
                  <div>
                    Total Number of Students :{" "}
                    <span className="text-red-600">
                      {num(summary?.total_students)}
                    </span>{" "}
                    | Student Attendance Marked :{" "}
                    <span className="text-red-600">
                      {num(summary?.attendance_marked)}
                    </span>{" "}
                    | Not Marked :{" "}
                    <span className="text-red-600">
                      {num(summary?.attendance_not_marked)}
                    </span>
                  </div>
                  <div>
                    Student Attendance - Present :{" "}
                    <span className="text-red-600">
                      {num(summary?.presented_Students)}
                    </span>{" "}
                    | Absent : <span className="text-red-600">{absent}</span> |
                    Number of Answer Sheets - Uploaded :{" "}
                    <span className="text-red-600">
                      {num(summary?.no_oof_answerpaper_uploaded)}
                    </span>{" "}
                    | Not Uploaded :{" "}
                    <span className="text-red-600">{notUploaded}</span>
                  </div>
                </div>
              </div>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="max-h-[320px] overflow-auto rounded border border-border">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="border-b border-border text-left">
                      <th className="px-2 py-2 w-12">SI.No</th>
                      <th className="px-2 py-2">Filename</th>
                      <th className="px-2 py-2">Folder</th>
                      <th className="px-2 py-2 w-32">Status</th>
                      <th className="px-2 py-2 w-16 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedFiles.map((u, i) => (
                      <tr
                        key={`uf-${i}-${u.fileName}`}
                        className="border-b border-slate-100"
                      >
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">{u.fileName}</td>
                        <td className="px-2 py-1.5">{u.folder}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className={
                              u.status === "Success"
                                ? "text-emerald-700 font-medium"
                                : u.status === "File not found"
                                  ? "text-red-600"
                                  : u.status === "Progress"
                                    ? "text-amber-600"
                                    : "text-slate-600"
                            }
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {u.view ? (
                            <button
                              type="button"
                              className="text-blue-700 hover:underline"
                              onClick={() =>
                                globalThis?.open?.(
                                  toMinioUrl(u.view),
                                  "_blank",
                                  "width=700,height=600",
                                )
                              }
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null
      }
    />
  );
}
