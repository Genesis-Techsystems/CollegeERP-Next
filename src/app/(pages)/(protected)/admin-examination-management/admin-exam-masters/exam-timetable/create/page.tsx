"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  resolveExamLoginEmpId,
  getClgExamSubjectFiltersBundle,
  listExamFeeTypeGeneralDetails,
  getExamTimetableDetails,
  saveExamTimetable,
} from "@/services/examination";
import { useSessionContext } from "@/context/SessionContext";
import { FilteredPage } from "@/components/layout";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { toastError, toastSuccess, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import ExistingExamTimetableModal, {
  type ExistingExamTimetableRow,
} from "../ExistingExamTimetableModal";

type Slot = {
  date: string;
  startTime: string;
  endTime: string;
  subject?: string;
  venue?: string;
};

export default function CreateExamTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  useBreadcrumbLabel("Create Timetable");

  // Angular ADD: IDs/labels come from list-page query params only — never univ_exam_filters.
  const selectedCourseId = Number(searchParams.get("courseId") ?? 0) || null;
  const selectedAcademicYearId =
    Number(searchParams.get("academicYearId") ?? 0) || null;
  const selectedExamId = Number(searchParams.get("examId") ?? 0) || null;
  const selectedCourseYearId =
    Number(searchParams.get("courseYearId") ?? 0) || null;
  const paramCourseName = String(searchParams.get("courseName") ?? "");
  const paramAcademicYear = String(searchParams.get("academicYear") ?? "");
  const paramExamName = String(searchParams.get("examName") ?? "");
  const paramCourseYearName = String(searchParams.get("courseYearName") ?? "");
  const paramFromDate = String(searchParams.get("fromDate") ?? "");
  const paramToDate = String(searchParams.get("toDate") ?? "");

  function goBack() {
    const qp = new URLSearchParams();
    if (selectedCourseId != null) qp.set("courseId", String(selectedCourseId));
    if (selectedAcademicYearId != null)
      qp.set("academicYearId", String(selectedAcademicYearId));
    if (selectedExamId != null) qp.set("examId", String(selectedExamId));
    if (selectedCourseYearId != null)
      qp.set("courseYearId", String(selectedCourseYearId));
    const q = qp.toString();
    router.push(
      `/admin-examination-management/admin-exam-masters/exam-timetable${q ? `?${q}` : ""}`,
    );
  }

  // Subjects (carry Regular/Supple/Internal flags for save examTypeCatId).
  const [subjects, setSubjects] = useState<
    {
      id: number;
      code: string;
      name?: string;
      isRegular?: boolean;
      isSupple?: boolean;
      isInternal?: boolean;
    }[]
  >([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | null>(
    null,
  );

  const [regulations, setRegulations] = useState<
    { id: number; code: string; name: string }[]
  >([]);
  const [selectedRegulationId, setSelectedRegulationId] = useState<
    number | null
  >(null);
  const [examFeeTypes, setExamFeeTypes] = useState<
    { id: number; code: string; name: string }[]
  >([]);

  const [slotDraft, setSlotDraft] = useState<Slot>({
    date: "",
    startTime: "",
    endTime: "",
  });
  const [courseGroups, setCourseGroups] = useState<
    {
      id: number;
      code: string;
      regulationId?: number;
      regulationName?: string;
    }[]
  >([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const [dataList, setDataList] = useState<any[]>([]);
  const [examSessions, setExamSessions] = useState<
    {
      id: number;
      name: string;
      code: string;
      sessionStartTime?: string;
      sessionEndTime?: string;
    }[]
  >([]);
  const [selectedExamSessionId, setSelectedExamSessionId] = useState<
    number | null
  >(null);

  const examFromDate = useMemo(() => {
    const fromData = String(dataList[0]?.from_date ?? "").slice(0, 10);
    if (fromData) return fromData;
    return paramFromDate ? paramFromDate.slice(0, 10) : "";
  }, [dataList, paramFromDate]);
  const examToDate = useMemo(() => {
    const toData = String(dataList[0]?.to_date ?? "").slice(0, 10);
    if (toData) return toData;
    return paramToDate ? paramToDate.slice(0, 10) : "";
  }, [dataList, paramToDate]);

  // EXMFEETYP only (Angular parallel getData) — not univ_exam_filters.
  useEffect(() => {
    let cancelled = false;
    async function loadFeeTypes() {
      const gd = await listExamFeeTypeGeneralDetails().catch(() => []);
      if (cancelled) return;
      setExamFeeTypes(
        (Array.isArray(gd) ? gd : [])
          .map((d: any) => ({
            id: Number(d.generalDetailId ?? d.id ?? 0),
            code: String(d.generalDetailCode ?? d.code ?? ""),
            name: String(d.generalDetailName ?? d.name ?? ""),
          }))
          .filter((d) => d.code),
      );
    }
    void loadFeeTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  // Angular getFiltersList — clg_exam_subject_filters only.
  useEffect(() => {
    let cancelled = false;
    async function loadSubjectFilterBundle() {
      setDataList([]);
      setExamSessions([]);
      setSelectedExamSessionId(null);
      setRegulations([]);
      setSelectedRegulationId(null);
      setSubjects([]);
      setSelectedSubjectCode(null);
      setCourseGroups([]);
      setSelectedGroups(new Set());
      if (
        !selectedCourseId ||
        !selectedAcademicYearId ||
        !selectedExamId ||
        !selectedCourseYearId
      )
        return;

      const empId = resolveExamLoginEmpId(user?.employeeId);
      // Angular getFiltersList always sends in_university_id=0.
      const { dataList: rows, sessions } = await getClgExamSubjectFiltersBundle(
        {
          courseId: selectedCourseId,
          examId: selectedExamId,
          academicYearId: selectedAcademicYearId,
          courseYearId: selectedCourseYearId,
          employeeId: empId,
        },
      ).catch(() => ({ dataList: [] as any[], sessions: [] as any[] }));
      if (cancelled) return;

      setDataList(rows);

      // Angular: unique by fk_exam_session_id from result[1] — do not drop empty names.
      const seen = new Set<number>();
      const mappedSessions: {
        id: number;
        name: string;
        code: string;
        sessionStartTime?: string;
        sessionEndTime?: string;
      }[] = [];
      for (const r of sessions) {
        const id = Number(r.fk_exam_session_id ?? r.examSessionId ?? 0);
        if (id <= 0 || seen.has(id)) continue;
        seen.add(id);
        const name = String(
          r.exam_display_session_name ??
            r.examSessionName ??
            r.session_name ??
            "",
        ).trim();
        mappedSessions.push({
          id,
          name: name || `Session ${id}`,
          code: String(
            r.examsessioninCatCode ?? r.sessionCode ?? r.session ?? "",
          ).trim(),
          sessionStartTime: r.session_start_time
            ? String(r.session_start_time)
            : r.sessionStartTime
              ? String(r.sessionStartTime)
              : undefined,
          sessionEndTime: r.session_end_time
            ? String(r.session_end_time)
            : r.sessionEndTime
              ? String(r.sessionEndTime)
              : undefined,
        });
      }
      setExamSessions(mappedSessions);

      const from = String(rows[0]?.from_date ?? "").slice(0, 10);
      if (from) {
        setSlotDraft((s) => (s.date ? s : { ...s, date: from }));
      }
    }
    void loadSubjectFilterBundle();
    return () => {
      cancelled = true;
    };
  }, [
    selectedCourseId,
    selectedAcademicYearId,
    selectedExamId,
    selectedCourseYearId,
    user?.employeeId,
  ]);

  /** Angular selectedSession → unique regulations from dataList. */
  function applySession(sessionId: number | null) {
    setSelectedExamSessionId(sessionId);
    setRegulations([]);
    setSelectedRegulationId(null);
    setSubjects([]);
    setSelectedSubjectCode(null);
    setCourseGroups([]);
    setSelectedGroups(new Set());
    if (sessionId == null) {
      setSlotDraft((d) => ({ ...d, startTime: "", endTime: "" }));
      return;
    }
    const s = examSessions.find((e) => e.id === sessionId);
    setSlotDraft((d) => ({
      ...d,
      startTime: s?.sessionStartTime ?? "",
      endTime: s?.sessionEndTime ?? "",
    }));
    const regs: { id: number; code: string; name: string }[] = [];
    const seen = new Set<number>();
    for (const r of dataList) {
      const id = Number(r.fk_regulation_id ?? 0);
      if (id <= 0 || seen.has(id)) continue;
      seen.add(id);
      const code = String(r.regulation_code ?? "").trim();
      regs.push({ id, code, name: code });
    }
    setRegulations(regs);
  }

  /** Angular selectedRegulation → subjects for that regulation from dataList. */
  function applyRegulation(regulationId: number | null) {
    setSelectedRegulationId(regulationId);
    setSubjects([]);
    setSelectedSubjectCode(null);
    setCourseGroups([]);
    setSelectedGroups(new Set());
    if (regulationId == null) return;
    const mapped: {
      id: number;
      code: string;
      name?: string;
      isRegular?: boolean;
      isSupple?: boolean;
      isInternal?: boolean;
    }[] = [];
    const seen = new Set<string>();
    for (const r of dataList) {
      if (Number(r.fk_regulation_id ?? 0) !== regulationId) continue;
      const code = String(r.subject_code ?? "").trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      mapped.push({
        id: Number(r.fk_subject_id ?? 0),
        code,
        name: String(r.subject_name ?? "").trim() || undefined,
        isInternal: Boolean(r.is_internal_exam),
        isRegular: Boolean(r.is_regular_exam),
        isSupple: Boolean(r.is_supply_exam),
      });
    }
    setSubjects(mapped);
  }

  /** Angular selectedSubject → course groups for that subject from dataList. */
  function applySubject(subjectCode: string | null) {
    setSelectedSubjectCode(subjectCode);
    setCourseGroups([]);
    setSelectedGroups(new Set());
    if (!subjectCode) return;
    const groups: {
      id: number;
      code: string;
      regulationId?: number;
      regulationName?: string;
    }[] = [];
    const seen = new Set<number>();
    for (const r of dataList) {
      if (String(r.subject_code ?? "").trim() !== subjectCode) continue;
      const id = Number(r.fk_course_group_id ?? 0);
      const code = String(r.group_code ?? "").trim();
      if (id <= 0 || !code || seen.has(id)) continue;
      seen.add(id);
      groups.push({
        id,
        code,
        regulationId: Number(r.fk_regulation_id ?? 0) || undefined,
        regulationName: String(r.regulation_code ?? "").trim() || undefined,
      });
    }
    setCourseGroups(groups);
  }

  function toggleGroup(code: string) {
    setSelectedGroups((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const allGroupsSelected =
    courseGroups.length > 0 &&
    courseGroups.every((g) => selectedGroups.has(g.code));

  function toggleSelectAllGroups() {
    if (allGroupsSelected) {
      setSelectedGroups(new Set());
      return;
    }
    setSelectedGroups(new Set(courseGroups.map((g) => g.code)));
  }

  type StagedRow = {
    examDate: string;
    session: "M" | "A";
    examSessionId: number;
    groupCode: string;
    subjectCode: string;
  };
  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [existingOpen, setExistingOpen] = useState(false);
  const [existingRows, setExistingRows] = useState<ExistingExamTimetableRow[]>(
    [],
  );

  async function openExistingTimetable() {
    if (!selectedExamId || !selectedCourseYearId || !selectedCourseId) return;
    const data = await getExamTimetableDetails(
      selectedCourseYearId,
      selectedCourseId,
      selectedExamId,
    ).catch(() => []);
    const rows = Array.isArray(data) ? data : [];
    const mapped: ExistingExamTimetableRow[] = rows.map((r: any) => ({
      subjectName: String(
        r.subjectName ?? r.subject_name ?? r.paperTitle ?? "",
      ).trim(),
      subjecttypeName: String(
        r.subjecttypeName ?? r.subject_type_name ?? r.examPaperType ?? "",
      ).trim(),
      groupName: String(
        r.groupCode ??
          r.groupName ??
          r.courseGroupCode ??
          r.course_group_code ??
          "",
      ).trim(),
      courseYearName: String(
        r.courseYearName ?? r.course_year_name ?? r.yearName ?? "",
      ).trim(),
    }));
    setExistingRows(mapped);
    setExistingOpen(true);
  }

  function addSelectedToStage() {
    // Start time is NOT required — it is bundled with the exam session and may
    // legitimately be blank (mirrors Angular addExamCourseGroups, which gates only
    // on session/subject + at least one checked course group).
    if (
      !slotDraft.date ||
      selectedExamSessionId == null ||
      !selectedSubjectCode ||
      selectedGroups.size === 0
    ) {
      toastError(
        "Select exam date, session, subject and at least one course group.",
      );
      return;
    }
    // Angular: only one staged header row at a time ("Save with only one row at a time.")
    if (
      stagedRows.length > 0 &&
      stagedRows.some(
        (r) =>
          r.examSessionId !== selectedExamSessionId ||
          r.examDate !== slotDraft.date,
      )
    ) {
      toastInfo("Save with only one row at a time.");
      return;
    }
    // Morning/Afternoon bucket derives from the session start time when present;
    // default to 'M' when the session carries no start time.
    const session: "M" | "A" =
      slotDraft.startTime && slotDraft.startTime >= "12:00" ? "A" : "M";
    const rows: StagedRow[] = [];
    for (const code of Array.from(selectedGroups)) {
      // Angular: "Subject is already exists in same group."
      if (
        stagedRows.some(
          (r) =>
            r.examSessionId === selectedExamSessionId &&
            r.groupCode === code &&
            r.subjectCode === selectedSubjectCode,
        )
      ) {
        toastInfo("Subject is already exists in same group.");
        continue;
      }
      rows.push({
        examDate: slotDraft.date,
        session,
        examSessionId: selectedExamSessionId,
        groupCode: code,
        subjectCode: selectedSubjectCode,
      });
    }
    if (rows.length === 0) return;
    setStagedRows((s) => [...s, ...rows]);
  }

  function removeStagedRow(idx: number) {
    setStagedRows((s) => s.filter((_, i) => i !== idx));
  }

  async function saveTimetable() {
    if (
      stagedRows.length === 0 ||
      !selectedCourseId ||
      !selectedExamId ||
      !selectedCourseYearId
    )
      return;
    if (selectedRegulationId == null) {
      toastError("Pick a Regulation before saving.");
      return;
    }

    // Resolve EXMFEETYP general-detail ids for the three exam-type flags.
    const internalId = examFeeTypes.find((t) => t.code === "Internal")?.id;
    const regularId = examFeeTypes.find((t) => t.code === "Regular")?.id;
    const suppleId = examFeeTypes.find((t) => t.code === "Supple")?.id;
    function deriveExamTypeCatId(s?: {
      isInternal?: boolean;
      isRegular?: boolean;
      isSupple?: boolean;
    }): number {
      if (!s) return 0;
      if (s.isInternal && internalId) return internalId;
      if (s.isRegular && regularId) return regularId;
      if (s.isSupple && suppleId) return suppleId;
      // Fall back to Regular if subject carries no flag (matches typical default).
      return regularId ?? 0;
    }

    // Group rows by (examSessionId, examDate) to mirror the Angular payload
    // where each entry covers one date + session and carries an array of details.
    const grouped = new Map<string, StagedRow[]>();
    for (const r of stagedRows) {
      const key = `${r.examSessionId}|${r.examDate}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const payload = Array.from(grouped.values()).map((rows) => {
      const first = rows[0];
      const session = examSessions.find((e) => e.id === first.examSessionId);
      return {
        examDate: first.examDate,
        courseId: selectedCourseId,
        examSessionId: first.examSessionId,
        session: session?.code ?? "",
        sessionStartTime: session?.sessionStartTime ?? null,
        sessionEndTime: session?.sessionEndTime ?? null,
        examId: selectedExamId,
        isActive: true,
        examTimetableDetail: rows.map((r) => {
          const grp = courseGroups.find((g) => g.code === r.groupCode);
          const subj = subjects.find((s) => s.code === r.subjectCode);
          return {
            examLabBatchesId: null,
            checked: false,
            examTypeCatId: deriveExamTypeCatId(subj),
            examDate: r.examDate,
            courseYearId: selectedCourseYearId,
            courseGroupId: grp?.id,
            regulationId: selectedRegulationId,
            subjectId: subj?.id,
            isActive: true,
          };
        }),
      };
    });

    setSaving(true);
    try {
      const body = await saveExamTimetable(payload);
      // Contract (mirrors Angular addExamTable, add-exam-timetable.component.ts:549-575):
      // the application status is the BODY's `statusCode`, not the HTTP status.
      //   statusCode===200 && success && non-empty `data`  => conflict (subjects already exist)
      //   statusCode===200 && success && empty/absent data  => clean save
      //   statusCode===200 && !success                      => soft failure (nothing saved)
      if (!body.ok || body.statusCode !== 200) {
        toastError(body?.message ?? "Save failed");
        return;
      }
      if (!body.success) {
        toastInfo(body.message ?? "Nothing was saved.");
        return;
      }
      if (Array.isArray(body.data) && body.data.length > 0) {
        const conflicts: ExistingExamTimetableRow[] = body.data.map(
          (r: any) => ({
            subjectName: String(r.subjectName ?? "").trim(),
            subjecttypeName: String(r.subjecttypeName ?? "").trim(),
            groupName: String(r.groupName ?? "").trim(),
            courseYearName: String(r.courseYearName ?? "").trim(),
          }),
        );
        setExistingRows(conflicts);
        setExistingOpen(true);
        toastInfo("Already same subject exists for same year.");
        return;
      }
      toastSuccess(body.message ?? "Exam timetable saved");
      setStagedRows([]);
    } catch (err) {
      toastError(getErrorMessage(err) ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const canAdd = useMemo(() => {
    const hasDate = !!slotDraft.date;
    const hasSession = selectedExamSessionId != null;
    const hasSubject = !!selectedSubjectCode;
    const hasGroups = selectedGroups.size > 0;
    return hasDate && hasSession && hasSubject && hasGroups;
  }, [
    slotDraft.date,
    selectedExamSessionId,
    selectedSubjectCode,
    selectedGroups,
  ]);

  const summaryLine = useMemo(() => {
    return [
      paramCourseName,
      paramAcademicYear,
      paramCourseYearName,
      paramExamName,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [paramCourseName, paramAcademicYear, paramCourseYearName, paramExamName]);

  return (
    <FilteredPage
      title="Create Exam Timetable"
      filters={
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="rounded-md border bg-muted/40/50 px-3 py-2 text-[13px] font-medium text-[hsl(var(--primary))] flex-1">
              {summaryLine || "—"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-[12px]"
              onClick={openExistingTimetable}
              disabled={
                !selectedExamId || !selectedCourseYearId || !selectedCourseId
              }
            >
              Show Existing Timetable
            </Button>
          </div>
          <GlobalFilterBarRow className="flex-nowrap">
            <GlobalFilterField
              label="Exam Date"
              className="min-w-[9rem] flex-[0.9]"
            >
              <input
                type="date"
                autoFocus
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                value={slotDraft.date}
                min={examFromDate || undefined}
                max={examToDate || undefined}
                onChange={(e) =>
                  setSlotDraft((s) => ({ ...s, date: e.target.value }))
                }
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Session"
              className="min-w-[12rem] flex-[1.2]"
            >
              <Select
                value={
                  selectedExamSessionId != null
                    ? String(selectedExamSessionId)
                    : null
                }
                onChange={(v) => applySession(v ? Number(v) : null)}
                options={examSessions.map((s) => ({
                  value: String(s.id),
                  // Angular mat-option: examSessionName only (display name already includes times).
                  label: s.name,
                }))}
                placeholder={
                  examSessions.length === 0
                    ? dataList.length === 0
                      ? "Select course / year / exam first"
                      : "No sessions"
                    : "Select Session"
                }
                disabled={examSessions.length === 0}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Regulation"
              className="min-w-[10rem] flex-[1]"
            >
              <Select
                value={
                  selectedRegulationId != null
                    ? String(selectedRegulationId)
                    : null
                }
                onChange={(v) => applyRegulation(v ? Number(v) : null)}
                options={regulations.map((r) => ({
                  value: String(r.id),
                  label: String(r.name || r.code),
                }))}
                placeholder={
                  regulations.length === 0
                    ? selectedExamSessionId
                      ? "No regulations"
                      : "Select session first"
                    : "Select Regulation"
                }
                disabled={regulations.length === 0}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Subject"
              className="min-w-[12rem] flex-[1.3]"
            >
              <Select
                value={selectedSubjectCode}
                onChange={(v) => applySubject(v)}
                options={subjects.map((s) => ({
                  value: s.code,
                  label: `${s.code}${s.name ? ` — ${s.name}` : ""}`,
                }))}
                placeholder={
                  subjects.length === 0
                    ? selectedRegulationId
                      ? "No subjects"
                      : "Select regulation first"
                    : "Select Subject"
                }
                disabled={subjects.length === 0}
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
      body={
        <>
          {!!slotDraft.date &&
            selectedExamSessionId != null &&
            selectedRegulationId != null &&
            !!selectedSubjectCode && (
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-3 rounded-md border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                    Select Course Group
                  </div>
                  <div className="p-2 space-y-1 max-h-72 overflow-auto">
                    {courseGroups.length === 0 ? (
                      <div className="text-[12px] text-muted-foreground px-1 py-2">
                        {selectedSubjectCode
                          ? "No course groups for this subject."
                          : "Select a subject to load course groups."}
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-[12px] font-medium border-b border-border pb-1.5 mb-1">
                          <input
                            type="checkbox"
                            checked={allGroupsSelected}
                            onChange={toggleSelectAllGroups}
                          />
                          <span>Select All</span>
                        </label>
                        {courseGroups.map((g) => {
                          const checked = selectedGroups.has(g.code);
                          return (
                            <label
                              key={g.code}
                              className="flex items-center gap-2 text-[12px]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGroup(g.code)}
                              />
                              <span>
                                {g.code}
                                {g.regulationName ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    ({g.regulationName})
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2 rounded-md border overflow-hidden flex flex-col">
                  <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                    Selected Course Groups
                  </div>
                  <div className="p-2 min-h-[12rem] text-[12px] flex-1">
                    {Array.from(selectedGroups).length === 0
                      ? "—"
                      : Array.from(selectedGroups).map((code) => {
                          const grp = courseGroups.find((g) => g.code === code);
                          return (
                            <div key={code}>
                              <span className="font-medium">{code}</span>
                              {grp?.regulationName ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({grp.regulationName})
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                  </div>
                  <div className="p-2 border-t flex flex-col items-end gap-1">
                    {!canAdd && selectedGroups.size === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Tick at least one course group to enable.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 text-[12px]"
                      onClick={addSelectedToStage}
                      disabled={!canAdd}
                    >
                      Add to Table
                    </Button>
                  </div>
                </div>
                <div className="col-span-7 rounded-md border">
                  <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                    {slotDraft.startTime && slotDraft.startTime < "12:00"
                      ? "(9:45 AM - 4:00 PM)"
                      : "(1:00 PM - 4:00 PM)"}
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full min-w-[760px] text-[12px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-2 py-1 w-16 text-left">Sl.No</th>
                          <th className="px-2 py-1 text-left">Exam Date</th>
                          <th className="px-2 py-1 text-left">Group</th>
                          <th className="px-2 py-1 text-left">Subject</th>
                          <th className="px-2 py-1 text-left w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedRows.length === 0 && (
                          <tr>
                            <td
                              className="px-2 py-2 text-muted-foreground"
                              colSpan={5}
                            >
                              No rows added
                            </td>
                          </tr>
                        )}
                        {stagedRows.map((r, i) => (
                          <tr
                            key={`${r.groupCode}-${r.examDate}-${r.session}-${i}`}
                          >
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1">
                              {new Date(r.examDate).toLocaleDateString(
                                undefined,
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </td>
                            <td className="px-2 py-1">{r.groupCode}</td>
                            <td className="px-2 py-1">
                              {
                                subjects.find((s) => s.code === r.subjectCode)
                                  ?.code
                              }{" "}
                              {subjects.find((s) => s.code === r.subjectCode)
                                ?.name
                                ? `— ${subjects.find((s) => s.code === r.subjectCode)?.name}`
                                : ""}
                            </td>
                            <td className="px-2 py-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStagedRow(i)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 text-[12px]"
              onClick={goBack}
              disabled={saving}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
            {stagedRows.length > 0 && (
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={saveTimetable}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </>
      }
    >
      <ExistingExamTimetableModal
        open={existingOpen}
        onClose={() => setExistingOpen(false)}
        rows={existingRows}
      />
    </FilteredPage>
  );
}
