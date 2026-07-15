"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, type SelectOption } from "@/common/components/select";
import { Eye } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";
import { toDateStr, toDateOnlyISO } from "@/common/generic-functions";
import { useSessionContext } from "@/context/SessionContext";
import {
  downloadAndOpenQuestionPaperPdf,
  getFinalizeQuestionPaperFilters,
  getQuestionPaperPublishDetails,
  listViewFinalQuestionPapers,
  publishQuestionPaperColleges,
} from "@/services/evaluation-process";

type AnyRow = Record<string, any>;
const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
};
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const isPublishedValue = (row: AnyRow | null | undefined) => {
  const raw = row?.is_published ?? row?.isPublished ?? row?.ispublished;
  if (raw === true || raw === 1) return true;
  const text = String(raw ?? "")
    .trim()
    .toLowerCase();
  return text === "true" || text === "1" || text === "yes";
};

function subjectNameRenderer(p: { data?: AnyRow }) {
  return (
    <span>
      {pickText(p.data, ["subject_name", "subjectName"])}{" "}
      <span className="text-blue-700">
        ({pickText(p.data, ["subjectcode", "subject_code", "subjectCode"])})
      </span>
    </span>
  );
}

function makeQuestionPaperPathRenderer(onView: (row: AnyRow) => void) {
  return (p: { data?: AnyRow }) => {
    const path = pickText(p.data, ["questionpaper_path", "questionPaperPath"]);
    if (!path) {
      return (
        <span className="text-[11px] text-muted-foreground">
          No Documents Upload
        </span>
      );
    }
    return (
      <button
        type="button"
        aria-label="View question paper"
        title="View"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900"
        onClick={() => onView(p.data ?? {})}
      >
        <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    );
  };
}

function makeActionsRenderer(
  loading: boolean,
  onSecurePublish: (row: AnyRow) => Promise<void>,
  openPublishModal: (row: AnyRow) => void,
) {
  return (p: { data?: AnyRow }) =>
    isPublishedValue(p.data) ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-5 min-h-5 rounded-md px-1.5 py-0 text-[9px] leading-none font-medium"
        disabled={loading}
        onClick={() => void onSecurePublish(p.data ?? {})}
      >
        Secure Publish
      </Button>
    ) : (
      <Button
        type="button"
        size="sm"
        className="h-5 min-h-5 rounded-md px-1.5 py-0 text-[9px] leading-none font-medium"
        disabled={loading}
        onClick={() => openPublishModal(p.data ?? {})}
      >
        Publish
      </Button>
    );
}

export default function ViewFinalExamQuestionPaperPage() {
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const { user } = useSessionContext();
  // Login user's employee id (Angular reads localStorage 'employeeId'); prefer
  // the session, fall back to localStorage. Used for published/downloaded by.
  const employeeId = Number(
    user?.employeeId ?? globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishRow, setPublishRow] = useState<AnyRow | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");
  // Secure Publish "Published Details" modal (Angular ViewPublishedListComponent)
  const [secureOpen, setSecureOpen] = useState(false);
  const [securePublished, setSecurePublished] = useState<AnyRow[]>([]);
  const [secureEmployees, setSecureEmployees] = useState<AnyRow[]>([]);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId"]),
      ),
    [baseRows, courseId, academicYearId],
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getFinalizeQuestionPaperFilters(employeeId).catch(
          () => [],
        );
        const r = Array.isArray(list) ? list : [];
        setBaseRows(r);
        if (r[0]) setCourseId(pickNum(r[0], ["fk_course_id", "courseId"]));
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    if (academicYears[0])
      setAcademicYearId(
        pickNum(academicYears[0], ["fk_academic_year_id", "academicYearId"]),
      );
  }, [academicYears]);
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ["fk_exam_id", "examId"]));
  }, [exams]);
  useEffect(() => {
    setRows([]);
    setHasFetched(false);
  }, [courseId, academicYearId, examId]);

  async function getList() {
    if (!courseId || !examId) {
      toastError("Please select Course and Exam.");
      return;
    }
    setLoading(true);
    try {
      const list = await listViewFinalQuestionPapers({
        employeeId,
        courseId,
        examId,
        academicYearId: academicYearId ?? undefined,
      }).catch(() => []);
      setRows(Array.isArray(list) ? list : []);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }

  async function publishNow(row: AnyRow) {
    const qId = pickNum(row, [
      "pk_exam_questionpaper_id",
      "questionPaperId",
      "examQuestionPaperId",
    ]);
    const subjectId = pickNum(row, ["fk_subject_id", "subjectId"]);
    const ids = String(
      row?.fk_exam_timetable_ids ??
        row?.fk_exam_timetable_id ??
        row?.exam_timetable_id ??
        "",
    )
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);

    if (qId <= 0 || ids.length === 0) {
      toastError("Unable to publish: missing timetable linkage.");
      return;
    }
    setLoading(true);
    try {
      const publishedDateTime =
        publishDate && publishTime
          ? new Date(`${publishDate}T${publishTime}`)
          : new Date();
      const payload = ids.map((id) => ({
        examQuestionPaperId: qId,
        subjectId,
        isPublished: true,
        publishedDate: publishedDateTime.toISOString(),
        questionPaperPath: pickText(row, [
          "questionpaper_path",
          "questionPaperPath",
        ]),
        isActive: row?.is_active ?? true,
        examTimeTableId: id,
        // Pass the login employeeId when present; null (NOT 0) otherwise — 0 is
        // an invalid FK and the backend rejects it. This admin has no emp record.
        publishedByEmpId: employeeId || null,
        downloadedByEmpId: employeeId || null,
      }));
      await publishQuestionPaperColleges(payload);
      toastSuccess("Question paper published successfully.");
      setPublishModalOpen(false);
      setPublishRow(null);
      await getList();
    } catch (error: any) {
      toastError(error?.message ?? "Failed to publish question paper.");
    } finally {
      setLoading(false);
    }
  }

  function openPublishModal(row: AnyRow) {
    console.log(row);
    const dateVal = toDateStr(row?.published_date ?? row?.publishedDate);
    const timeVal = String(
      row?.published_time ?? row?.publishedTime ?? "",
    ).slice(0, 8);
    const now = new Date();
    const fallbackDate = toDateOnlyISO(now);
    const fallbackTime = now.toTimeString().slice(0, 8);
    setPublishRow(row);
    setPublishDate(dateVal || fallbackDate);
    setPublishTime(timeVal || fallbackTime);
    setPublishModalOpen(true);
  }

  async function onViewQuestionPaper(row: AnyRow) {
    const qId = pickNum(row, [
      "pk_exam_questionpaper_id",
      "questionPaperId",
      "examQuestionPaperId",
    ]);
    if (qId <= 0) {
      toastError("Unable to open question paper.");
      return;
    }
    setLoading(true);
    try {
      await downloadAndOpenQuestionPaperPdf(qId);
    } catch (error: any) {
      toastError(error?.message ?? "Failed to open question paper.");
    } finally {
      setLoading(false);
    }
  }

  async function onSecurePublish(row: AnyRow) {
    const qId = pickNum(row, [
      "pk_exam_questionpaper_id",
      "questionPaperId",
      "examQuestionPaperId",
    ]);
    if (qId <= 0) return;
    setLoading(true);
    try {
      const details = await getQuestionPaperPublishDetails(qId);
      setSecurePublished(
        Array.isArray(details.publishedList) ? details.publishedList : [],
      );
      setSecureEmployees(
        Array.isArray(details.employees) ? details.employees : [],
      );
      setSecureOpen(true);
    } catch (error: any) {
      toastError(error?.message ?? "Unable to fetch published details.");
    } finally {
      setLoading(false);
    }
  }

  const employeeName = (id: unknown) => {
    const e = secureEmployees.find(
      (x) => Number(x.Pk_emp_id ?? x.pk_emp_id ?? x.empId) === Number(id),
    );
    return e ? String(e.emp_name ?? e.empName ?? "") : "";
  };

  const cols = useMemo<ColDef[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        headerName: "Subject Name",
        minWidth: 240,
        flex: 2,
        cellRenderer: subjectNameRenderer,
      },
      {
        field: "questionPaper",
        headerName: "Question Paper",
        minWidth: 200,
        flex: 2,
        valueGetter: (p) =>
          p.data?.questionpaper_title ?? p.data?.questionPaper ?? "-",
      },
      {
        field: "publishedDate",
        headerName: "Published Date",
        minWidth: 120,
        maxWidth: 130,
        flex: 1,
        valueGetter: (p) =>
          pickText(p.data, ["published_date", "publishedDate"]) || "-",
      },
      {
        field: "publishedTime",
        headerName: "Published Time",
        minWidth: 110,
        maxWidth: 120,
        flex: 1,
        valueGetter: (p) =>
          pickText(p.data, ["published_time", "publishedTime"]) || "-",
      },
      {
        field: "questionPaperPath",
        headerName: "QuestionPaper Path",
        minWidth: 130,
        maxWidth: 150,
        flex: 1,
        cellRenderer: makeQuestionPaperPathRenderer(onViewQuestionPaper),
      },
      {
        headerName: "Actions",
        minWidth: 120,
        maxWidth: 140,
        flex: 1,
        cellRenderer: makeActionsRenderer(
          loading,
          onSecurePublish,
          openPublishModal,
        ),
      },
    ],
    [loading],
  );

  return (
    <FilteredListPage
      title="Publish Exam Question Paper"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end text-[13px]">
          <div className="md:col-span-3">
            <Label className="text-[12px] text-muted-foreground">Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map(
                (c) =>
                  ({
                    value: String(pickNum(c, ["fk_course_id", "courseId"])),
                    label: pickText(c, ["course_code", "courseCode"]),
                  }) as SelectOption,
              )}
              placeholder="Course"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-[12px] text-muted-foreground">
              Academic Year
            </Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map(
                (a) =>
                  ({
                    value: String(
                      pickNum(a, ["fk_academic_year_id", "academicYearId"]),
                    ),
                    label: pickText(a, ["academic_year", "academicYear"]),
                  }) as SelectOption,
              )}
              placeholder="Academic Year"
            />
          </div>
          <div className="md:col-span-5">
            <Label className="text-[12px] text-muted-foreground">Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={exams.map(
                (e) =>
                  ({
                    value: String(pickNum(e, ["fk_exam_id", "examId"])),
                    label: pickText(e, ["exam_name", "examName"]),
                  }) as SelectOption,
              )}
              placeholder="Exam"
            />
          </div>
          <div className="md:col-span-1">
            <Button
              className="h-8 px-3 text-[12px] w-full"
              onClick={getList}
              disabled={loading}
            >
              Get List
            </Button>
          </div>
        </div>
      }
      toolbarLeading={<span />}
      rowData={hasFetched ? rows : []}
      columnDefs={cols}
      pagination
      loading={loading}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Publish exam question paper",
      }}
    >
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              Publish Question Paper On
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <Input
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="h-9 text-[12px]"
            />
            <Input
              value={publishTime}
              onChange={(e) => setPublishTime(e.target.value)}
              className="h-9 text-[12px]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => publishRow && void publishNow(publishRow)}
              disabled={loading}
            >
              Ok
            </Button>
            <Button
              variant="outline"
              onClick={() => setPublishModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secure Publish — Published Details (read-only view of published colleges) */}
      <Dialog open={secureOpen} onOpenChange={setSecureOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              Published Details
            </DialogTitle>
          </DialogHeader>
          {securePublished.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No published details found.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[13px] mb-3">
                <div>
                  <span className="text-muted-foreground">
                    QuestionPaper Title:{" "}
                  </span>
                  <span className="text-blue-700 font-medium">
                    {pickText(securePublished[0], ["questionpaper_title"])}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Course Code: </span>
                  <span className="text-blue-700 font-medium">
                    {pickText(securePublished[0], ["course_code"])}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Exam Date: </span>
                  <span className="text-blue-700 font-medium">
                    {pickText(securePublished[0], ["exam_date"])}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="text-blue-700 font-medium">
                    {pickText(securePublished[0], [
                      "subjectcode",
                      "subject_code",
                    ])}{" "}
                    ({pickText(securePublished[0], ["subject_name"])})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Session Time: </span>
                  <span className="text-blue-700 font-medium">
                    {pickText(securePublished[0], ["session_start_time"])} To{" "}
                    {pickText(securePublished[0], ["session_end_time"])}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th className="px-2 py-2 w-12">SI.No</th>
                      <th className="px-2 py-2">College</th>
                      <th className="px-2 py-2">Group</th>
                      <th className="px-2 py-2">Course Year</th>
                      <th className="px-2 py-2">Publish Status</th>
                      <th className="px-2 py-2">Publish Date</th>
                      <th className="px-2 py-2">Expiry Date</th>
                      <th className="px-2 py-2">Profile Name</th>
                      <th className="px-2 py-2">Secret Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securePublished.map((r, i) => (
                      <tr key={`pub-${i}`} className="border-b border-border">
                        <td className="px-2 py-2">{i + 1}</td>
                        <td className="px-2 py-2">
                          {pickText(r, ["college_code"]) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {pickText(r, ["group_code"]) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {pickText(r, ["course_year_code"]) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {r.is_published === true || r.is_published === 1
                            ? "Yes"
                            : "No"}
                        </td>
                        <td className="px-2 py-2">
                          {pickText(r, ["published_date"]) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {pickText(r, ["cp1_secretcode_expirydate"]) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {employeeName(r.fk_publishedby_emp_id) || "-"}
                        </td>
                        <td className="px-2 py-2">
                          {pickText(r, ["collectorprofile1_secretcode"]) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecureOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
