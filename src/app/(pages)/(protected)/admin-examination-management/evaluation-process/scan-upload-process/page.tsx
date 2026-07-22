"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/common/components/search";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import {
  extractExamOmrUploadPath,
  getScanUploadAnswerPaperSummary,
  getScanUploadTimetableFilters,
  uploadExamOmr,
} from "@/services/evaluation-process-admin";
import { MINIO_URL } from "@/config/constants/api";
import { num, txt } from "@/common/utils/data-helpers";
import { toDateStr } from "@/common/generic-functions";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

type UploadedFileRow = {
  /** Angular `fileName` — webkitRelativePath segment [1] (often the file name). */
  fileName: string;
  folder: string;
  status: "Pending" | "Progress" | "Success" | "File not found";
  view: string;
  file: File;
};

function parseExamDate(value: unknown): Date | null {
  const raw = txt(value);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthYearLabel(value: unknown): string {
  const d = parseExamDate(value);
  if (!d) return txt(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Angular last-occurrence distinct (keep last row per key). */
function distinctLastBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const keys = rows.map(keyFn);
  return rows.filter((row, index) => {
    const key = keyFn(row);
    if (key === "" || key === null || key === undefined) return false;
    return !keys.includes(key, index + 1);
  });
}

function openStoredFile(path: string) {
  if (!path) return;
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${MINIO_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Angular submit handler: Success when path has segment[5]; else
 * "File not found" using first token + `.pdf`.
 */
function applyUploadResultToRows(
  rows: UploadedFileRow[],
  uploadedPath: string,
): UploadedFileRow[] {
  const path = String(uploadedPath ?? "").trim();
  if (!path) return rows;

  const segments = path.split("/");
  if (segments[5] != null && segments[5] !== "") {
    const name = segments[5];
    return rows.map((row) =>
      row.fileName === name ? { ...row, status: "Success", view: path } : row,
    );
  }

  const fileNamePdf = `${path.split(" ")[0]}.pdf`;
  return rows.map((row) =>
    row.fileName === fileNamePdf
      ? { ...row, status: "File not found", view: "" }
      : row,
  );
}

export default function ScanUploadProcessPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [allRows, setAllRows] = useState<AnyRow[]>([]);
  const [summaryRow, setSummaryRow] = useState<AnyRow | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRow[]>([]);
  const [folderPathDisplay, setFolderPathDisplay] = useState("");

  const [collegeId, setCollegeId] = useState<number>(0);
  const [examMonthYear, setExamMonthYear] = useState<string>("");
  const [examId, setExamId] = useState<number>(0);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [examTimetableId, setExamTimetableId] = useState<number>(0);
  /** Angular `dateConvert` — YYYY-MM-DD for getList. */
  const [dateConvert, setDateConvert] = useState("");

  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const colleges = useMemo(
    () => distinctLastBy(allRows, (r) => num(r.fk_college_id)),
    [allRows],
  );

  const monthYears = useMemo(() => {
    const scoped =
      collegeId === 0
        ? allRows
        : allRows.filter((r) => num(r.fk_college_id) === collegeId);
    const distinct = distinctLastBy(scoped, (r) => txt(r.exam_month_yr));
    return [...distinct].sort(
      (a, b) =>
        new Date(String(b.exam_month_yr)).getTime() -
        new Date(String(a.exam_month_yr)).getTime(),
    );
  }, [allRows, collegeId]);

  const exams = useMemo(() => {
    const scoped = allRows.filter((r) => {
      const collegeOk = collegeId === 0 || num(r.fk_college_id) === collegeId;
      const monthOk = !examMonthYear || txt(r.exam_month_yr) === examMonthYear;
      return collegeOk && monthOk;
    });
    return distinctLastBy(scoped, (r) => num(r.fk_exam_id));
  }, [allRows, collegeId, examMonthYear]);

  const subjects = useMemo(() => {
    // Angular selectedExam: subjects from filtersData where fk_exam_id == examId
    const scoped = allRows.filter((r) => num(r.fk_exam_id) === examId);
    return distinctLastBy(scoped, (r) => num(r.fk_subject_id));
  }, [allRows, examId]);

  const selectedExam = useMemo(
    () => exams.find((e) => num(e.fk_exam_id) === examId) ?? null,
    [exams, examId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => num(s.fk_subject_id) === subjectId) ?? null,
    [subjects, subjectId],
  );

  const collegeOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...colleges.map((c) => ({
        value: String(num(c.fk_college_id)),
        label: txt(c.college_code),
      })),
    ],
    [colleges],
  );
  const monthYearOptions = useMemo(
    () =>
      monthYears.map((m) => ({
        value: txt(m.exam_month_yr),
        label: formatMonthYearLabel(m.exam_month_yr),
      })),
    [monthYears],
  );
  const examOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...exams.map((e) => {
        const d = parseExamDate(e.exam_date);
        const dateLabel = d
          ? d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : txt(e.exam_date);
        return {
          value: String(num(e.fk_exam_id)),
          label: `${txt(e.exam_name)} ${dateLabel}`.trim(),
        };
      }),
    ],
    [exams],
  );
  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => ({
        value: String(num(s.fk_subject_id)),
        label: `${txt(s.subject_name)} (${txt(s.subject_code)})`,
      })),
    [subjects],
  );

  const filteredUploadedFiles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return uploadedFiles;
    return uploadedFiles.filter((row) =>
      `${row.fileName} ${row.status}`.toLowerCase().includes(q),
    );
  }, [uploadedFiles, searchText]);

  useEffect(() => {
    async function loadFilters() {
      setLoading(true);
      try {
        const source = await getScanUploadTimetableFilters(organizationId);
        setAllRows(source);
        // Angular: auto-select first distinct college, then cascade
        const firstCollege = distinctLastBy(source, (r) =>
          num(r.fk_college_id),
        )[0];
        const cid = num(firstCollege?.fk_college_id);
        if (cid > 0) setCollegeId(cid);
      } catch (e) {
        toastError(e, "Failed to load scan-upload filters");
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    }
    void loadFilters();
  }, [organizationId]);

  // Angular selectedCollege → selectedMonthyr cascade
  useEffect(() => {
    setExamMonthYear(txt(monthYears[0]?.exam_month_yr));
  }, [monthYears]);

  // Angular selectedMonthyr → selectedExam cascade
  useEffect(() => {
    const firstExamId = num(exams[0]?.fk_exam_id);
    setExamId(firstExamId);
  }, [exams]);

  // Angular selectedExam → subjects + examDate + timetableId
  useEffect(() => {
    const firstSubjectId = num(subjects[0]?.fk_subject_id);
    setSubjectId(firstSubjectId);
    const fromExam = parseExamDate(selectedExam?.exam_date);
    if (fromExam) {
      setExamDate(fromExam);
      setDateConvert(toDateStr(fromExam));
    }
    setExamTimetableId(num(selectedExam?.fk_exam_timetable_id));
    setShowResult(false);
    setSummaryRow(null);
  }, [subjects, selectedExam]);

  // Angular selectedSubject → examDate from subject row + dateConvert
  useEffect(() => {
    if (!selectedSubject) return;
    const fromSubject = parseExamDate(selectedSubject.exam_date);
    if (fromSubject) {
      setExamDate(fromSubject);
      setDateConvert(toDateStr(fromSubject));
    }
    setShowResult(false);
    setSummaryRow(null);
  }, [selectedSubject]);

  const canGetList =
    examId > 0 && subjectId > 0 && Boolean(examDate) && !loading;

  async function getList() {
    if (!canGetList) return;
    setLoading(true);
    setShowResult(true);
    setSummaryRow(null);
    try {
      const examDateParam = dateConvert || toDateStr(examDate) || "1990-01-01";
      const summaryList = await getScanUploadAnswerPaperSummary({
        organizationId,
        timetableId: examTimetableId,
        examDate: examDateParam,
        subjectId,
      });
      // Angular: summaryDetailsList[0]
      setSummaryRow(summaryList[0] ?? null);
      if (!summaryList[0]) {
        toastSuccess("No answer paper summary found");
      }
    } catch (e) {
      toastError(e, "Failed to load answer paper details");
      setSummaryRow(null);
    } finally {
      setLoading(false);
    }
  }

  /** Angular uploadFiles(files) — webkitdirectory relative path parsing. */
  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setFolderPathDisplay("");
      setUploadedFiles([]);
      return;
    }

    const nextRows: UploadedFileRow[] = [];
    for (const file of Array.from(files)) {
      const path = String(
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
          "",
      );
      const pathPieces = path.split("/");
      const currentFolder = pathPieces[1] || file.name;
      pathPieces.pop();
      nextRows.push({
        fileName: currentFolder,
        folder: pathPieces[0] ?? "",
        status: "Pending",
        view: "",
        file,
      });
    }
    setUploadedFiles(nextRows);
    // Angular binds Folder Path input to `file` (single selected name) — show first file name
    setFolderPathDisplay(files[0]?.name ?? nextRows[0]?.folder ?? "");
  }

  /** Angular submit() — parallel uploads via forkJoin, then getList(). */
  async function submitUpload() {
    if (uploadedFiles.length === 0 || !fileInputRef.current?.files?.length) {
      return;
    }
    const nativeFiles = Array.from(fileInputRef.current.files);
    setUploading(true);

    // Angular: mark Progress when uploadedFiles.fileName === files[i].name
    setUploadedFiles((prev) =>
      prev.map((row) =>
        nativeFiles.some((f) => f.name === row.fileName)
          ? { ...row, status: "Progress" }
          : row,
      ),
    );

    try {
      const responses = await Promise.all(
        nativeFiles.map(async (file) => {
          const form = new FormData();
          form.append("file", file, file.name);
          return uploadExamOmr(form);
        }),
      );

      setUploadedFiles((prev) => {
        let next = prev.map((row) =>
          nativeFiles.some((f) => f.name === row.fileName)
            ? { ...row, status: "Progress" as const }
            : row,
        );
        for (const res of responses) {
          next = applyUploadResultToRows(next, extractExamOmrUploadPath(res));
        }
        return next;
      });
      toastSuccess("Files uploaded");
      await getList();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toastError(e, "Failed to upload files");
    } finally {
      setUploading(false);
    }
  }

  function goBack() {
    // Angular HTML calls goBack() — hide result panels and clear picked files
    setShowResult(false);
    setSummaryRow(null);
    setUploadedFiles([]);
    setFolderPathDisplay("");
    setSearchText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const examLabel = txt(selectedExam?.exam_name);
  const subjectCodeLabel = txt(selectedSubject?.subject_code);
  // Angular selectedDetails: examName + ' / ' + subjectCode
  const detailsLabel =
    examLabel && subjectCodeLabel
      ? `${examLabel} / ${subjectCodeLabel}`
      : examLabel || subjectCodeLabel || "-";

  const totalStudents = num(summaryRow?.total_students);
  const attendanceMarked = num(summaryRow?.attendance_marked);
  const uploadedCount = num(summaryRow?.no_oof_answerpaper_uploaded);
  // Angular: total_students - no_oof_answerpaper_uploaded
  const notUploaded = totalStudents - uploadedCount;

  return (
    <FilteredPage
      title="Upload Scanned Answer Papers"
      filters={
        <>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Faculty">
              <Select
                value={String(collegeId)}
                onChange={(v) => setCollegeId(num(v))}
                options={collegeOptions}
                placeholder="Faculty"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Month Year">
              <Select
                value={examMonthYear || null}
                onChange={(v) => setExamMonthYear(v ?? "")}
                options={monthYearOptions}
                placeholder="Exam Month Year"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam">
              <Select
                value={String(examId)}
                onChange={(v) => setExamId(num(v))}
                options={examOptions}
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Subjects">
              <Select
                value={subjectId > 0 ? String(subjectId) : null}
                onChange={(v) => setSubjectId(num(v))}
                options={subjectOptions}
                placeholder="Subjects"
                searchable
              />
            </GlobalFilterField>
            {subjectId > 0 && (
              <GlobalFilterField label="Exam Date">
                <DatePicker
                  value={examDate}
                  onChange={(d) => {
                    setExamDate(d);
                    setDateConvert(toDateStr(d));
                    setShowResult(false);
                  }}
                  displayFormat="dd/MM/yyyy"
                  clearable={false}
                  placeholder="Exam Date"
                />
              </GlobalFilterField>
            )}
            <GlobalFilterField
              label="Action"
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                className="h-[30px] px-4 text-[12px]"
                disabled={!canGetList}
                onClick={() => void getList()}
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>

          {showResult && (
            <div className="px-5 pb-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <GlobalFilterField label="Folder Path" className="md:col-span-4">
                <Input
                  value={folderPathDisplay}
                  readOnly
                  disabled
                  placeholder="Folder Path"
                  className="h-8 text-[12px]"
                />
              </GlobalFilterField>
              <div className="md:col-span-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => onPickFiles(e.target.files)}
                  {...({ webkitdirectory: "", directory: "" } as Record<
                    string,
                    string
                  >)}
                />
                <Button
                  type="button"
                  className="h-8 px-4 text-[12px] w-full bg-sky-600 hover:bg-sky-700"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </Button>
              </div>
            </div>
          )}
        </>
      }
    >
      {showResult && (
        <div className="app-card p-3 space-y-3">
          <div className="px-1 app-card-title">
            Upload Scanned Answer Papers - ({detailsLabel})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-3 rounded border bg-muted/40 p-2 text-[13px]">
              Total Students :{" "}
              <span className="text-blue-700">{totalStudents}</span>
            </div>
            <div className="md:col-span-6 px-2">
              <div className="h-2 overflow-hidden rounded bg-sky-100">
                <div className="h-full w-full animate-pulse bg-sky-500/80" />
              </div>
            </div>
            <div className="md:col-span-3 rounded border bg-muted/40 p-2 text-[13px]">
              AnswerPapers Uploaded :{" "}
              <span className="text-blue-700">{uploadedCount}</span>
            </div>
            <div className="md:col-span-3 rounded border bg-muted/40 p-2 text-[13px]">
              Attendance Marked :{" "}
              <span className="text-blue-700">{attendanceMarked}</span>
            </div>
            <div className="md:col-span-6 text-center text-[13px] text-slate-600">
              Waiting for files to be scanning.....
            </div>
            <div className="md:col-span-3 rounded border bg-muted/40 p-2 text-[13px]">
              Answer Papers Not uploaded :{" "}
              <span className="text-blue-700">{notUploaded}</span>
            </div>
          </div>
        </div>
      )}

      {showResult && (
        <div className="app-card p-3 space-y-3">
          <div className="px-1 app-card-title">
            Scanned Files - {detailsLabel}
          </div>
          <div className="w-full max-w-sm">
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              placeholder="Search"
              className="w-full max-w-sm"
            />
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">File Name</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-center">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredUploadedFiles.map((row, i) => (
                  <tr
                    key={`${row.folder}-${row.fileName}-${row.file.lastModified}-${row.file.size}`}
                    className="border-t"
                  >
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{row.fileName}</td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center gap-1.5">
                        {row.status === "Progress" && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                        )}
                        <span
                          className={
                            row.status === "Success"
                              ? "text-emerald-600 font-medium"
                              : undefined
                          }
                        >
                          {row.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      {row.view ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-blue-700 hover:underline"
                          title="View"
                          onClick={() => openStoredFile(row.view)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUploadedFiles.length === 0 && (
                  <tr className="border-t">
                    <td
                      className="px-2 py-4 text-center text-muted-foreground"
                      colSpan={4}
                    >
                      No files selected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-4 text-[12px]"
              onClick={goBack}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-8 px-4 text-[12px]"
              disabled={uploadedFiles.length === 0 || uploading}
              onClick={() => void submitUpload()}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </FilteredPage>
  );
}
