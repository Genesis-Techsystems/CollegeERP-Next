"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { toDateStr } from "@/common/generic-functions";
import {
  listExamMastersByCourseAndAy,
  listExamTimetablesByExam,
  listExamTimetablesByExamAndDate,
  getExamRoomDetails,
  copyExamRoomAllotmentSessions,
  getExamMasterById,
} from "@/services";

type AnyRow = Record<string, any>;

/** Angular date pipe `MMM d, y` for Source Exam labels. */
function formatExamDate(value: string | Date | null | undefined): string {
  const iso = toDateStr(value);
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Angular date pipe `dateFormate` for Target Exam display (often `dd MMM, yyyy`). */
function formatTargetExamDate(value: string | Date | null | undefined): string {
  const iso = toDateStr(value);
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clampDate(date: string, min: string, max: string): string {
  if (!date) return min || max || "";
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

function todayIso(): string {
  return toDateStr(new Date()) || "";
}

export default function CopyExistingSeatingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => ({
      collegeId: Number(searchParams?.get("collegeId") ?? 0),
      targetExamId: Number(searchParams?.get("examId") ?? 0),
      courseId: Number(searchParams?.get("courseId") ?? 0),
      academicYearId: Number(searchParams?.get("academicYearId") ?? 0),
      examTimetableId: Number(searchParams?.get("examTimetableId") ?? 0),
      targetExamDate: searchParams?.get("examDate") ?? "",
      courseCode: searchParams?.get("courseCode") ?? "",
      academicYear: searchParams?.get("academicYear") ?? "",
      examName: searchParams?.get("examName") ?? "",
    }),
    [searchParams],
  );

  const [targetExam, setTargetExam] = useState<AnyRow | null>(null);
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [sourceExamId, setSourceExamId] = useState<number>(0);
  const [sourceExam, setSourceExam] = useState<AnyRow | null>(null);
  const [sourceExamDate, setSourceExamDate] = useState<string>("");
  const [sourceTimetables, setSourceTimetables] = useState<AnyRow[]>([]);
  const [sourceTimetableId, setSourceTimetableId] = useState<number>(0);
  const [targetTimetables, setTargetTimetables] = useState<AnyRow[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [existingRooms, setExistingRooms] = useState<AnyRow[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [loadingTt, setLoadingTt] = useState<boolean>(false);

  const minDate = toDateStr(sourceExam?.fromDate);
  const maxDate = toDateStr(sourceExam?.toDate);

  useEffect(() => {
    void (async () => {
      const [exams, target] = await Promise.all([
        params.courseId && params.academicYearId
          ? listExamMastersByCourseAndAy(
              params.courseId,
              params.academicYearId,
            ).catch(() => [])
          : Promise.resolve([]),
        params.targetExamId
          ? getExamMasterById(params.targetExamId).catch(() => null)
          : Promise.resolve(null),
      ]);
      setExamsList(Array.isArray(exams) ? exams : []);
      setTargetExam(target ?? null);
      if (params.targetExamId) {
        const tts = await listExamTimetablesByExam(params.targetExamId).catch(
          () => [],
        );
        const arr = Array.isArray(tts)
          ? tts.map((t: AnyRow) => ({ ...t, checked: false }))
          : [];
        setTargetTimetables(arr);
      }
    })();
  }, [params.courseId, params.academicYearId, params.targetExamId]);

  async function loadSourceTimetables(examId: number, examDateIso: string) {
    setSourceTimetables([]);
    setSourceTimetableId(0);
    setExistingRooms([]);
    if (!examId || !examDateIso) return;
    setLoadingTt(true);
    const tts = await listExamTimetablesByExamAndDate(
      examId,
      examDateIso,
    ).catch(() => []);
    setSourceTimetables(Array.isArray(tts) ? tts : []);
    setLoadingTt(false);
  }

  async function handleSelectSourceExam(examIdStr: string) {
    const examId = Number(examIdStr) || 0;
    setSourceExamId(examId);
    setSourceTimetables([]);
    setSourceTimetableId(0);
    setExistingRooms([]);
    if (!examId) {
      setSourceExam(null);
      setSourceExamDate("");
      return;
    }
    const ex =
      examsList.find((e: AnyRow) => Number(e.examId) === examId) ?? null;
    setSourceExam(ex);
    const min = toDateStr(ex?.fromDate);
    const max = toDateStr(ex?.toDate);
    // Angular defaults examDate to moment() (today), clamped by source exam min/max.
    const nextDate = clampDate(todayIso(), min, max);
    setSourceExamDate(nextDate);
    await loadSourceTimetables(examId, nextDate);
  }

  async function handleSourceDateChange(nextIso: string) {
    const clamped = clampDate(nextIso, minDate, maxDate);
    setSourceExamDate(clamped);
    setSourceTimetableId(0);
    setExistingRooms([]);
    // Angular calDays() → clears TT list and reloads via selectedSourceExam
    if (sourceExamId) await loadSourceTimetables(sourceExamId, clamped);
  }

  async function handleSelectSourceTimetable(idStr: string) {
    const id = Number(idStr) || 0;
    setSourceTimetableId(id);
    if (!id) {
      setExistingRooms([]);
      return;
    }
    const rows = await getExamRoomDetails({ examTimetableId: id }).catch(
      () => [],
    );
    const existing = (Array.isArray(rows) ? rows : []).filter(
      (r: AnyRow) => r.pk_exam_room_allotment_id != null,
    );
    setExistingRooms(existing);
  }

  function handleCheckAll(next: boolean) {
    setSelectAll(next);
    setTargetTimetables((prev) => prev.map((t) => ({ ...t, checked: next })));
  }

  function handleSingleCheck(idx: number, next: boolean) {
    setTargetTimetables((prev) => {
      const arr = prev.map((t, i) => (i === idx ? { ...t, checked: next } : t));
      setSelectAll(arr.every((t) => t.checked));
      return arr;
    });
  }

  function navigateBack() {
    const qp = new URLSearchParams();
    if (params.collegeId) qp.set("collegeId", String(params.collegeId));
    if (params.courseId) qp.set("courseId", String(params.courseId));
    if (params.academicYearId)
      qp.set("academicYearId", String(params.academicYearId));
    if (params.targetExamId) qp.set("examId", String(params.targetExamId));
    if (params.examTimetableId)
      qp.set("examTimetableId", String(params.examTimetableId));
    const q = qp.toString();
    router.push(
      `/admin-examination-management/admin-exam-masters/seating-plan-setup${q ? `?${q}` : ""}`,
    );
  }

  async function handleSave() {
    if (!sourceExamId) {
      toast.error("Please select a source exam.");
      return;
    }
    if (!sourceExamDate) {
      toast.error("Please choose an exam date.");
      return;
    }
    if (!sourceTimetableId) {
      toast.error("Please select an exam timetable.");
      return;
    }
    // Angular allows empty target list (in_target_exam_timetable_id='').
    const targetIds = targetTimetables
      .filter((t) => t.checked)
      .map((t) => Number(t.examTimetableId))
      .filter((id) => id > 0);
    setBusy(true);
    const { ok, message } = await copyExamRoomAllotmentSessions({
      sourceExamTimetableId: sourceTimetableId,
      targetExamTimetableIds: targetIds.join(","),
    }).catch(() => ({ ok: false, rows: [], message: "Network error" }));
    setBusy(false);
    if (ok) {
      toast.success(message || "Existing seating copied successfully.");
      const qp = new URLSearchParams();
      if (params.collegeId) qp.set("collegeId", String(params.collegeId));
      if (params.academicYearId)
        qp.set("academicYearId", String(params.academicYearId));
      if (params.courseId) qp.set("courseId", String(params.courseId));
      if (params.targetExamId) qp.set("examId", String(params.targetExamId));
      const q = qp.toString();
      router.push(
        `/admin-examination-management/admin-exam-masters/seating-plan-setup${q ? `?${q}` : ""}`,
      );
    } else {
      toast.error(message || "Failed to copy existing seating.");
    }
  }

  const examOptions = useMemo(
    () =>
      // Angular: *ngFor="let exam of examsList" — do NOT exclude target exam
      examsList.map((e: AnyRow) => {
        const tag: string[] = [];
        if (e.isInternalExam != false) tag.push("(Internal)");
        if (e.isRegularExam != false) tag.push("(Regular)");
        if (e.isSupplyExam != false) tag.push("(Supple)");
        const from = formatExamDate(e.fromDate);
        const to = formatExamDate(e.toDate);
        return {
          value: String(e.examId),
          label: `${e.examName} (${from} - ${to})${tag.length ? ` ${tag.join(" ")}` : ""}`,
        };
      }),
    [examsList],
  );

  const sourceTimetableOptions = useMemo(
    () =>
      sourceTimetables.map((t: AnyRow) => {
        const subjects = t.subjects ?? t.examTimetableDetail;
        const hasSubjects = Array.isArray(subjects)
          ? subjects.length > 0
          : Boolean(t.examDate);
        const datePart = hasSubjects
          ? String(t.examDate ?? toDateStr(t.examDate) ?? "")
          : "";
        const session = t.examSessionName ?? t.examSession ?? "";
        return {
          value: String(t.examTimetableId),
          label: datePart ? `${datePart} / ${session}` : ` / ${session}`,
        };
      }),
    [sourceTimetables],
  );

  const targetTag: string[] = [];
  if (targetExam && targetExam.isInternalExam != false)
    targetTag.push("(Internal)");
  if (targetExam && targetExam.isRegularExam != false)
    targetTag.push("(Regular)");
  if (targetExam && targetExam.isSupplyExam != false)
    targetTag.push("(Supple)");

  const collegeCode = String(
    targetExam?.collegeCode ?? targetExam?.college_code ?? "",
  );
  const courseLine = [collegeCode, params.academicYear, params.courseCode]
    .filter(Boolean)
    .join(" / ");

  return (
    <FilteredPage
      title="Copy Existing Seating"
      filters={
        <>
          <div className="mb-3 space-y-2 text-[13px]">
            <div>
              <span className="font-semibold">Course :</span>{" "}
              <span className="text-blue-700">{courseLine || "—"}</span>
            </div>
            <div>
              <span className="font-semibold">Target Exam :</span>{" "}
              {targetExam ? (
                <span className="text-blue-700">
                  {targetExam.examName} (
                  {formatTargetExamDate(targetExam.fromDate)} -{" "}
                  {formatTargetExamDate(targetExam.toDate)}){" "}
                  {targetTag.join(" ")}
                </span>
              ) : (
                <span className="text-blue-700">{params.examName || "—"}</span>
              )}
            </div>
          </div>
          <GlobalFilterBarRow columns={2}>
            <GlobalFilterField label="Source Exam *" className="md:col-span-2">
              <Select
                value={String(sourceExamId || "")}
                onChange={(v) => void handleSelectSourceExam(String(v))}
                options={examOptions}
                placeholder="Select Source Exam"
                searchable
              />
            </GlobalFilterField>
            {sourceExamId ? (
              <GlobalFilterField label="Choose a exam date">
                <Input
                  type="date"
                  value={sourceExamDate}
                  min={minDate || undefined}
                  max={maxDate || undefined}
                  onChange={(e) => void handleSourceDateChange(e.target.value)}
                />
              </GlobalFilterField>
            ) : null}
            {sourceExamId ? (
              <GlobalFilterField
                label="Exam Timetable *"
                className="md:col-span-2"
              >
                <Select
                  value={String(sourceTimetableId || "")}
                  onChange={(v) => void handleSelectSourceTimetable(String(v))}
                  options={sourceTimetableOptions}
                  placeholder={loadingTt ? "Loading…" : "Select Exam Timetable"}
                  isLoading={loadingTt}
                />
              </GlobalFilterField>
            ) : null}
          </GlobalFilterBarRow>
        </>
      }
      body={
        existingRooms.length > 0 ? (
          <div>
            <h2 className="text-[14px] font-semibold text-blue-700 mb-2">
              Existing Seating
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1 text-left">Room</th>
                    <th className="px-2 py-1 text-left">Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {existingRooms.map((r, i) => (
                    <tr key={`${r.pk_room_id ?? i}`} className="border-b">
                      <td className="px-2 py-1">
                        {r.room ?? r.room_name ?? "—"}
                      </td>
                      <td className="px-2 py-1">
                        {r.room_strength ?? r.capacity ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleCheckAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-2 py-1 text-left">
                      Current Exam Sessions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {targetTimetables.map((t, i) => (
                    <tr key={`${t.examTimetableId ?? i}`} className="border-b">
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={Boolean(t.checked)}
                          onChange={(e) =>
                            handleSingleCheck(i, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        {String(t.examDate ?? toDateStr(t.examDate) ?? "")} (
                        {t.examSessionName ?? t.examSession ?? ""})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      }
    >
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-6"
          onClick={navigateBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="h-8 px-6"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </FilteredPage>
  );
}
