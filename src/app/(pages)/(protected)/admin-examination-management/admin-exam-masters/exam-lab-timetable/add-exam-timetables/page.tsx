"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { ConfirmDialog } from "@/common/components/feedback";
import {
  getExamLabTimetableGrid,
  getExamLabTimetableRestFilters,
  getLabCreateFilters,
  saveExamLabTimetableBatches,
} from "@/services/exam-lab-timetable";
import { FilteredPage } from "@/components/layout";
import { toDateStr, toDateOnlyISO } from "@/common/generic-functions";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { ExistingExamTimetableModal } from "../_components/ExistingExamTimetableModal";

type AnyRow = Record<string, any>;

function typeBadge(code: unknown): string {
  const c = String(code ?? "").toLowerCase();
  if (c === "regular") return "R";
  if (c === "supple") return "S";
  if (c === "internal") return "I";
  return String(code ?? "").slice(0, 1);
}

function cellClass(row: AnyRow): string {
  const flg = String(row.flg ?? row.flag ?? "");
  const session = String(row.examsessioninCatCode ?? "").toUpperCase();
  if (flg && flg !== "clgwise") return "bg-emerald-100";
  if (flg === "clgwise" && session === "AFTERNOON") return "bg-yellow-100";
  return "bg-sky-100";
}

/** Angular `tConvert` — 24h time string to 12h display. */
function tConvert(time: unknown): string {
  if (time == null || time === "") return "";
  const raw = String(time);
  const match = raw.match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/);
  if (!match) return raw;
  const hour = Number(match[1]);
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  return `${h12}${match[2]}${match[3]} ${suffix}`;
}

function formatExamDate(value: unknown): string {
  if (!value) return "—";
  try {
    return format(parseISO(String(value)), "dd MMM, yyyy");
  } catch {
    return String(value);
  }
}

function parseExamDateValue(value: unknown): Date | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : parseISO(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function pickExamBounds(row?: AnyRow): { from?: Date; to?: Date } {
  if (!row) return {};
  const from = parseExamDateValue(row.from_date ?? row.fromDate);
  const to = parseExamDateValue(row.to_date ?? row.toDate);
  return { from: from ?? undefined, to: to ?? undefined };
}

function filterDataList(details: AnyRow[], params: PageParams): AnyRow[] {
  const hasScope = details.some(
    (x) =>
      Number(x.fk_college_id) === params.collegeId &&
      Number(x.fk_course_id) === params.courseId &&
      Number(x.fk_course_year_id) === params.courseYearId &&
      Number(x.fk_exam_id) === params.examId,
  );
  if (!hasScope) return [];
  return details.filter(
    (x) =>
      Number(x.fk_course_id) === params.courseId &&
      Number(x.fk_course_year_id) === params.courseYearId &&
      Number(x.fk_exam_id) === params.examId,
  );
}

type PageParams = {
  collegeId: number;
  courseId: number;
  courseYearId: number;
  academicYearId: number;
  examId: number;
  courseYearName: string;
};

export default function AddExamLabTimetablesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  const empId = Number(user?.employeeId ?? 31754);
  const orgId = useMemo(() => {
    const fromStorage = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const fromSession = Number(user?.organizationId ?? 0);
    return fromStorage || fromSession || 1;
  }, [user?.organizationId]);

  const pageParams = {
    collegeId: Number(searchParams.get("collegeId") ?? 0),
    courseId: Number(searchParams.get("courseId") ?? 0),
    courseYearId: Number(searchParams.get("courseYearId") ?? 0),
    academicYearId: Number(searchParams.get("academicYearId") ?? 0),
    examId: Number(searchParams.get("examId") ?? 0),
    courseYearName: String(searchParams.get("courseYearName") ?? ""),
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dataList, setDataList] = useState<AnyRow[]>([]);
  const [sessions, setSessions] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [existingRows, setExistingRows] = useState<AnyRow[]>([]);

  const [examDate, setExamDate] = useState<Date | null>(() => new Date());
  const [examBounds, setExamBounds] = useState<{ from?: Date; to?: Date }>({});
  const [examSessionId, setExamSessionId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);

  const [courseGroupYears, setCourseGroupYears] = useState<AnyRow[]>([]);
  const [selectedCourseYears, setSelectedCourseYears] = useState<AnyRow[]>([]);
  const [staged, setStaged] = useState<AnyRow[]>([]);
  const [existingDupOpen, setExistingDupOpen] = useState(false);
  const [existingDupRows, setExistingDupRows] = useState<AnyRow[]>([]);
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);

  const examMeta = dataList[0];
  const minExamDate =
    examBounds.from ?? (examMeta ? pickExamBounds(examMeta).from : undefined);
  const maxExamDate =
    examBounds.to ?? (examMeta ? pickExamBounds(examMeta).to : undefined);

  const reloadGrid = useCallback(async () => {
    const grid = await getExamLabTimetableGrid({
      orgId,
      collegeId: pageParams.collegeId,
      courseId: pageParams.courseId,
      courseYearId: pageParams.courseYearId,
      examId: pageParams.examId,
      empId,
    }).catch(() => []);
    const rows = Array.isArray(grid) ? grid : [];
    setExistingRows(
      rows.map((r) => ({
        ...r,
        shortName: r.shortName || r.subjectCode || "",
      })),
    );
  }, [
    orgId,
    empId,
    pageParams.collegeId,
    pageParams.courseId,
    pageParams.courseYearId,
    pageParams.examId,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [res, rest] = await Promise.all([
          getLabCreateFilters({
            orgId,
            collegeId: pageParams.collegeId,
            courseId: pageParams.courseId,
            courseYearId: pageParams.courseYearId,
            academicYearId: pageParams.academicYearId,
            examId: pageParams.examId,
            empId,
          }).catch(() => ({ details: [], sessions: [] })),
          getExamLabTimetableRestFilters({
            courseId: pageParams.courseId,
            examId: pageParams.examId,
            academicYearId: pageParams.academicYearId,
            empId,
          }).catch(() => []),
        ]);
        if (cancelled) return;

        const allDetails = res.details ?? [];
        const filtered = filterDataList(allDetails, pageParams);
        setDataList(filtered);

        const metaRow =
          filtered[0] ??
          allDetails.find((x: AnyRow) => x.from_date || x.fromDate) ??
          allDetails[0];
        const bounds = pickExamBounds(metaRow);
        setExamBounds(bounds);
        if (bounds.from) {
          setExamDate(bounds.from);
        }

        const sess = dedupeBy(
          (res.sessions ?? []).map((s: AnyRow) => ({
            examSessionId: s.fk_exam_session_id,
            examSessionName: s.exam_display_session_name,
            examsessioninCatCode:
              s.examsessioninCatCode ?? s.examsessionin_cat_code,
            sessionStartTime: s.session_start_time,
            sessionEndTime: s.session_end_time,
          })),
          "examSessionId",
        );
        setSessions(sess);

        const groups = dedupeBy(
          (rest ?? []).filter(
            (x: AnyRow) => Number(x.fk_course_id) === pageParams.courseId,
          ),
          "fk_course_group_id",
        );
        setCourseGroups(groups);

        const grid = await getExamLabTimetableGrid({
          orgId,
          collegeId: pageParams.collegeId,
          courseId: pageParams.courseId,
          courseYearId: pageParams.courseYearId,
          examId: pageParams.examId,
          empId,
        }).catch(() => []);
        if (cancelled) return;
        const rows = Array.isArray(grid) ? grid : [];
        setExistingRows(
          rows.map((r) => ({
            ...r,
            shortName: r.shortName || r.subjectCode || "",
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    orgId,
    empId,
    pageParams.collegeId,
    pageParams.courseId,
    pageParams.courseYearId,
    pageParams.academicYearId,
    pageParams.examId,
  ]);

  function handleSessionChange(value: string | null) {
    const nextId = value ? Number(value) : null;
    setExamSessionId(nextId);
    setRegulationId(null);
    setSubjectId(null);
    setSubjects([]);
    setCourseGroupYears([]);
    setSelectedCourseYears([]);

    if (!nextId) {
      setRegulations([]);
      return;
    }

    const nextRegs: AnyRow[] = [];
    for (const row of dataList) {
      const rid = row.fk_regulation_id;
      if (!rid) continue;
      if (nextRegs.some((r) => Number(r.regulationId) === Number(rid)))
        continue;
      nextRegs.push({
        regulationId: rid,
        regulationName: row.regulation_code,
      });
    }
    setRegulations(nextRegs);
  }

  function handleRegulationChange(value: string | null) {
    const nextId = value ? Number(value) : null;
    setRegulationId(nextId);
    setSubjectId(null);
    setCourseGroupYears([]);
    setSelectedCourseYears([]);

    if (!nextId) {
      setSubjects([]);
      return;
    }

    const nextSubjects: AnyRow[] = [];
    for (const row of dataList) {
      if (Number(row.fk_regulation_id) !== nextId) continue;
      if (String(row.subject_type).toUpperCase() !== "LAB") continue;
      if (nextSubjects.some((s) => s.subjectCode === row.subject_code))
        continue;
      nextSubjects.push({
        subjectId: row.fk_subject_id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        subjectType: row.subject_type,
        collegeId: row.fk_college_id,
      });
    }
    setSubjects(nextSubjects);
  }

  function handleSubjectChange(value: string | null) {
    const nextId = value ? Number(value) : null;
    setSubjectId(nextId);
    setSelectedCourseYears([]);

    if (!nextId) {
      setCourseGroupYears([]);
      return;
    }

    const selectedSub = subjects.find((s) => Number(s.subjectId) === nextId);
    const subjectCode = selectedSub?.subjectCode;
    const subjectObj = dataList.find((d) => Number(d.fk_subject_id) === nextId);
    const batches = dataList.filter(
      (d) => d.subject_code === subjectCode && d.fk_eaxm_labbatch_id != null,
    );

    if (
      batches.length === 0 ||
      String(subjectObj?.subject_type).toUpperCase() !== "LAB"
    ) {
      setCourseGroupYears([]);
      return;
    }

    const out = batches
      .map((d) => ({
        key: `${d.fk_course_group_id}-${d.fk_eaxm_labbatch_id}-${d.fk_examtype_catdet_id}`,
        courseGroupId: d.fk_course_group_id,
        groupName: d.group_code,
        subjectName: d.subject_name,
        subjecttypeName: d.subject_type,
        regulationName: d.regulation_code,
        reg: d.examTypeCatCode,
        batch: d.labbatch_name,
        examLabBatchesId: d.fk_eaxm_labbatch_id,
        examTimetableDetId: d.fk_exam_timetable_det_id,
        examTypeCatId: d.fk_examtype_catdet_id,
        checked: false,
      }))
      .sort((a, b) => String(a.groupName).localeCompare(String(b.groupName)));
    setCourseGroupYears(out);
  }

  function toggleGroup(key: string, checked: boolean) {
    const next = courseGroupYears.map((g) =>
      g.key === key ? { ...g, checked } : g,
    );
    setCourseGroupYears(next);
    setSelectedCourseYears(next.filter((g) => g.checked));
  }

  function addGroups() {
    if (!examDate) {
      toastInfo("Exam Date is required");
      return;
    }
    if (!examSessionId) {
      toastInfo("Exam Session is required");
      return;
    }
    if (!regulationId) {
      toastInfo("Regulation is required");
      return;
    }
    if (!subjectId) {
      toastInfo("Subject is required");
      return;
    }
    if (selectedCourseYears.length === 0) return;
    if (staged.length > 0) {
      toastInfo("Save with only one row at a time.");
      return;
    }

    const session = sessions.find(
      (s) => Number(s.examSessionId) === Number(examSessionId),
    );
    const ymd = toDateOnlyISO(examDate);
    const toAdd = selectedCourseYears.map((g) => ({
      eaxmLabBatchId: g.examLabBatchesId,
      examDate: ymd,
      examSessionId,
      session: session?.examsessioninCatCode ?? session?.examSessionName ?? "",
      sessionStartTime: session?.sessionStartTime ?? null,
      sessionEndTime: session?.sessionEndTime ?? null,
      isActive: true,
      reason: null,
      groupName: g.groupName,
      subjectName: g.subjectName,
      subjecttypeName: g.subjecttypeName,
      batch: g.batch,
      reg: g.reg,
      examTimetableDetId: g.examTimetableDetId,
    }));
    setStaged(toAdd);
    setCourseGroupYears((prev) => prev.map((g) => ({ ...g, checked: false })));
    setSelectedCourseYears([]);
  }

  function resetFormAfterSave() {
    setSubjectId(null);
    setRegulationId(null);
    setSubjects([]);
    setRegulations([]);
    setCourseGroupYears([]);
    setSelectedCourseYears([]);
    setStaged([]);
  }

  async function save() {
    if (staged.length === 0) return;
    setSaving(true);
    try {
      const res = await saveExamLabTimetableBatches(staged).catch((err) => {
        toastError(err instanceof Error ? err.message : "Save failed");
        return null;
      });
      if (!res) return;

      if (res?.success === false) {
        toastInfo(res.message ?? "Save failed");
        return;
      }

      const dupData = Array.isArray(res?.data) ? res.data : [];
      if (dupData.length > 0) {
        toastInfo("Already same subject is exist for same year.");
        setExistingDupRows(dupData);
        setExistingDupOpen(true);
      } else {
        toastSuccess(res?.message ?? "Saved successfully");
      }

      resetFormAfterSave();
      await reloadGrid();
    } finally {
      setSaving(false);
    }
  }

  const dateColumns = useMemo(() => {
    const from = examBounds.from ?? pickExamBounds(dataList[0]).from;
    const to = examBounds.to ?? pickExamBounds(dataList[0]).to;
    if (!from || !to) return [];
    const out: Date[] = [];
    const cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [dataList, examBounds]);

  const matrix = useMemo(() => {
    const byGroupId: Record<string, AnyRow[]> = {};
    const byGroupCode: Record<string, AnyRow[]> = {};
    for (const row of existingRows) {
      const gid = String(row.courseGroupId ?? row.fk_course_group_id ?? "");
      const gcode = String(row.group_code ?? row.groupCode ?? "");
      if (gid) {
        if (!byGroupId[gid]) byGroupId[gid] = [];
        byGroupId[gid].push(row);
      }
      if (gcode) {
        if (!byGroupCode[gcode]) byGroupCode[gcode] = [];
        byGroupCode[gcode].push(row);
      }
    }
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return courseGroups.map((g) => {
      const code = String(g.group_code ?? "");
      const gid = String(g.fk_course_group_id ?? "");
      const groupRows = byGroupId[gid]?.length
        ? byGroupId[gid]
        : (byGroupCode[code] ?? []);
      const cells = dateColumns.map((d) => {
        const ymd = format(d, "yyyy-MM-dd");
        const rows = groupRows.filter((r) => {
          try {
            return format(parseISO(String(r.examDate)), "yyyy-MM-dd") === ymd;
          } catch {
            return toDateStr(r.examDate) === ymd;
          }
        });
        return { date: d, day: days[d.getDay()], rows };
      });
      return { code, cells };
    });
  }, [existingRows, courseGroups, dateColumns]);

  const stagedSessionLabel = useMemo(() => {
    if (!staged[0]) return "";
    const start = tConvert(staged[0].sessionStartTime);
    const end = tConvert(staged[0].sessionEndTime);
    const time = start && end ? `(${start} - ${end})` : "";
    return `${staged[0].session ?? ""} ${time}`.trim();
  }, [staged]);

  function goBack() {
    router.push(
      `/admin-examination-management/admin-exam-masters/exam-lab-timetable?collegeId=${pageParams.collegeId}&courseId=${pageParams.courseId}&courseYearId=${pageParams.courseYearId}&academicYearId=${pageParams.academicYearId}&examId=${pageParams.examId}`,
    );
  }

  return (
    <FilteredPage
      title="Create College Timetable"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Exam Date">
            <DatePicker
              value={examDate}
              onChange={setExamDate}
              placeholder="Exam Date"
              displayFormat="dd/MM/yyyy"
              minDate={minExamDate}
              maxDate={maxExamDate}
              clearable={false}
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Session">
            <Select
              value={examSessionId ? String(examSessionId) : null}
              onChange={handleSessionChange}
              options={sessions.map((s, i) => ({
                value: String(s.examSessionId ?? i),
                label: String(s.examSessionName ?? ""),
              }))}
              placeholder="Exam Session"
              searchable
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation">
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={handleRegulationChange}
              options={regulations.map((r, i) => ({
                value: String(r.regulationId ?? i),
                label: String(r.regulationName ?? ""),
              }))}
              placeholder="Regulation"
              searchable
              disabled={loading || !examSessionId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Subject">
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={handleSubjectChange}
              options={subjects.map((s, i) => ({
                value: String(s.subjectId ?? i),
                label: `${s.subjectCode ?? ""} — ${s.subjectName ?? ""}`,
              }))}
              placeholder="Subject"
              searchable
              disabled={loading || !regulationId}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        <>
          {(courseGroupYears.length > 0 || staged.length > 0) && (
            <div className="grid grid-cols-12 gap-2 items-start">
              {courseGroupYears.length > 0 && (
                <div className="col-span-3 rounded-md border">
                  <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                    Select Course Group
                  </div>
                  <div className="p-2 space-y-1 max-h-72 overflow-auto text-[12px]">
                    {courseGroupYears.map((g) => (
                      <label key={g.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!g.checked}
                          onChange={(e) => toggleGroup(g.key, e.target.checked)}
                        />
                        <span>
                          {g.groupName}{" "}
                          <span className="text-blue-700">({g.reg})</span>
                          {g.batch ? (
                            <span className="text-blue-700"> ({g.batch})</span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {courseGroupYears.length > 0 && (
                <div className="col-span-2 rounded-md border">
                  <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                    Selected Course Groups
                  </div>
                  <div className="p-2 space-y-1 min-h-32 text-[12px]">
                    {selectedCourseYears.map((g) => (
                      <div key={`sel-${g.key}`}>
                        {g.groupName}{" "}
                        <span className="text-blue-700">({g.reg})</span>
                        {g.batch ? (
                          <span className="text-blue-700"> ({g.batch})</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="p-2">
                    <Button
                      className="h-8 text-[12px]"
                      onClick={addGroups}
                      disabled={selectedCourseYears.length === 0}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {staged.length > 0 && (
                <div
                  className={`rounded-md border w-full ${
                    courseGroupYears.length > 0 ? "col-span-7" : "col-span-12"
                  }`}
                >
                  <div className="px-3 py-2 bg-[#c3d9ff] border-b text-center text-[12px] font-medium text-blue-800">
                    {stagedSessionLabel}
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full min-w-[780px] text-[12px]">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-2 py-1 text-left">SI.No</th>
                          <th className="px-2 py-1 text-left">Exam Date</th>
                          <th className="px-2 py-1 text-left">Group</th>
                          <th className="px-2 py-1 text-left">Subject</th>
                          <th className="px-2 py-1 text-left">Exam Type</th>
                          <th className="px-2 py-1 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staged.map((r, i) => (
                          <tr key={`st-${i}`} className="border-t">
                            <td className="px-2 py-1">{i + 1}</td>
                            <td className="px-2 py-1">
                              {formatExamDate(r.examDate)}
                            </td>
                            <td className="px-2 py-1">{r.groupName}</td>
                            <td className="px-2 py-1">
                              {r.subjectName}{" "}
                              <span className="text-muted-foreground">
                                ({r.subjecttypeName})
                              </span>
                              {r.batch ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({r.batch})
                                </span>
                              ) : null}
                            </td>
                            <td className="px-2 py-1">{r.reg}</td>
                            <td className="px-2 py-1">
                              <button
                                type="button"
                                className="text-destructive hover:opacity-80"
                                aria-label="Remove row"
                                onClick={() => setRemoveIdx(i)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end p-2">
                    <Button
                      className="h-8 text-[12px]"
                      onClick={() => void save()}
                      disabled={saving || staged.length === 0}
                    >
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      }
    >
      {dataList.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <h3 className="app-card-title text-[14px]">
              View Exam Lab Timetable{" "}
              <span className="ml-2 font-normal text-[13px] text-foreground">
                {dataList[0]?.college_code ?? ""} /{" "}
                {dataList[0]?.course_code ?? ""} / {pageParams.courseYearName} -
                ({dataList[0]?.exam_name ?? ""}{" "}
                {dataList[0]?.from_date
                  ? `(${toDateStr(dataList[0]?.from_date)} - ${toDateStr(dataList[0]?.to_date)})`
                  : ""}
                <span className="text-blue-700 ml-1">
                  {dataList[0]?.is_internal_exam ? "[Internal] " : ""}
                  {dataList[0]?.is_regular_exam ? "[Regular] " : ""}
                  {dataList[0]?.is_supply_exam ? "[Supple]" : ""}
                </span>
                )
              </span>
            </h3>
          </div>
          <div className="p-3">
            <div className="overflow-auto">
              <table className="w-full text-[12px] border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="border px-2 py-1 text-center uppercase">
                      Branch
                    </th>
                    {dateColumns.map((d) => (
                      <th
                        className="border px-2 py-1 text-center"
                        key={d.toISOString()}
                      >
                        {format(d, "dd MMM, yyyy")}
                        <div className="text-blue-600">
                          (
                          {
                            ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
                              d.getDay()
                            ]
                          }
                          )
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((g) => (
                    <tr key={g.code}>
                      <td className="border px-2 py-1 text-center text-blue-700">
                        {g.code}
                      </td>
                      {g.cells.map((c) => (
                        <td
                          className="border px-2 py-1 align-top"
                          key={`${g.code}-${c.date.toISOString()}`}
                        >
                          {c.rows.map((r: AnyRow, i: number) => (
                            <p
                              key={`x-${i}`}
                              className={`mb-1 rounded p-1 text-left ${cellClass(r)}`}
                            >
                              {r.subjectCode ?? r.shortName}
                              {r.examLabBatchName
                                ? ` (${r.examLabBatchName})`
                                : ""}
                              <span className="ml-1 text-[10px]">
                                {typeBadge(r.examTypeCatCode)}
                              </span>
                            </p>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-8 text-[12px]"
          onClick={goBack}
        >
          Back
        </Button>
      </div>

      <ConfirmDialog
        open={removeIdx != null}
        title="Remove row?"
        description="Remove this staged timetable row?"
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={() => {
          if (removeIdx != null) {
            setStaged((s) => s.filter((_, i) => i !== removeIdx));
          }
          setRemoveIdx(null);
        }}
        onCancel={() => setRemoveIdx(null)}
      />

      <ExistingExamTimetableModal
        open={existingDupOpen}
        onClose={() => {
          setExistingDupOpen(false);
          setExistingDupRows([]);
        }}
        rows={existingDupRows}
      />
    </FilteredPage>
  );
}

function dedupeBy<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const v = String(item?.[key] ?? "");
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(item);
  }
  return out;
}
