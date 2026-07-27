"use client";

/**
 * Angular parity: exam-lab-timetable/edit-exam-timetables
 */
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getLabCreateFilters,
  updateExamLabTimetableBatch,
} from "@/services/exam-lab-timetable";

type AnyRow = Record<string, any>;

export interface EditExamLabTimetableModalProps {
  open: boolean;
  onClose: () => void;
  row: AnyRow | null;
  orgId: number;
  empId: number;
  courseId: number;
  collegeId: number;
  courseYearId: number;
  academicYearId: number;
  examId: number;
  onSaved?: () => void;
}

function toYmd(value: unknown): string {
  if (value == null || value === "") return "";
  try {
    const d =
      typeof value === "string" && value.includes("T")
        ? parseISO(value)
        : new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return format(d, "yyyy-MM-dd");
  } catch {
    return String(value).slice(0, 10);
  }
}

function formatDisplayDate(value: unknown): string {
  const ymd = toYmd(value);
  if (!ymd) return "—";
  try {
    return format(parseISO(ymd), "d MMM, yyyy");
  } catch {
    return ymd;
  }
}

export function EditExamLabTimetableModal({
  open,
  onClose,
  row,
  orgId,
  empId,
  courseId,
  collegeId,
  courseYearId,
  academicYearId,
  examId,
  onSaved,
}: EditExamLabTimetableModalProps) {
  const [sessions, setSessions] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [examSessionId, setExamSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("");

  const minDate = toYmd(row?.fromDate ?? row?.from_date);
  const maxDate = toYmd(row?.toDate ?? row?.to_date);

  useEffect(() => {
    if (!open || !row) return;
    setExamDate(toYmd(row.examDate));
    setExamSessionId(
      row.examSessionId != null || row.fk_exam_session_id != null
        ? String(row.examSessionId ?? row.fk_exam_session_id)
        : null,
    );
    setIsActive(row.is_active !== false && row.isActive !== false);
    setReason(String(row.reason ?? ""));
    setLoading(true);
    getLabCreateFilters({
      orgId,
      collegeId,
      courseId,
      courseYearId,
      academicYearId,
      examId,
      empId,
    })
      .then((res) => {
        const sess = (res.sessions ?? []).map((s) => ({
          examSessionId: Number(s.fk_exam_session_id),
          examSessionName: String(s.exam_display_session_name ?? ""),
          sessionStartTime: s.session_start_time,
          sessionEndTime: s.session_end_time,
        }));
        const seen = new Set<number>();
        const unique = sess.filter((s) => {
          if (!s.examSessionId || seen.has(s.examSessionId)) return false;
          seen.add(s.examSessionId);
          return true;
        });
        setSessions(unique);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [
    open,
    row,
    orgId,
    collegeId,
    courseId,
    courseYearId,
    academicYearId,
    examId,
    empId,
  ]);

  const sessionOptions = useMemo(
    () =>
      sessions.map((s) => ({
        value: String(s.examSessionId),
        label: s.sessionStartTime
          ? `${s.examSessionName} (${s.sessionStartTime} - ${s.sessionEndTime})`
          : String(s.examSessionName),
      })),
    [sessions],
  );

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!row) return;
    if (!examSessionId) {
      toastError("Exam Session is required");
      return;
    }
    const labBatchId = Number(
      row.fk_exam_timetable_labbatch_id ?? row.examTimetableLabBatchId ?? 0,
    );
    if (!labBatchId) {
      toastError("Missing exam timetable lab batch id");
      return;
    }
    const payload = {
      eaxmLabBatchId:
        Number(row.examLabBatchesId ?? row.fk_eaxm_labbatch_id ?? 0) || null,
      examSessionId: Number(examSessionId),
      examDate,
      isActive,
      reason: isActive ? null : reason.trim() || null,
      examTimetableDetId:
        Number(row.examTimetableDetId ?? row.fk_exam_timetable_det_id ?? 0) ||
        null,
      examTimetableLabBatchId: labBatchId,
    };
    setSaving(true);
    try {
      await updateExamLabTimetableBatch(labBatchId, payload);
      toastSuccess("Updated successfully");
      onSaved?.();
      onClose();
    } catch (ex) {
      toastError(ex instanceof Error ? ex.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (!row) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Exam College Timetable"
      onSubmit={handleSubmit}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={saving}
      size="lg"
    >
      <div className="space-y-3 text-[13px]">
        <div className="rounded border bg-muted/30 px-3 py-2 space-y-1">
          <p>
            <span className="font-medium text-slate-700">Course Details:</span>{" "}
            <span className="text-[hsl(var(--primary))]">
              {row.collegeName ?? row.college_name ?? ""} /{" "}
              {row.groupCode ?? row.group_code ?? ""} /{" "}
              {row.courseYearName ?? row.course_year_name ?? ""} /{" "}
              {row.regulationCode ?? row.regulation_code ?? ""}
            </span>
          </p>
          <p>
            <span className="font-medium text-slate-700">Exam Details:</span>{" "}
            <span className="text-[hsl(var(--primary))]">
              {row.examName ?? row.exam_name ?? ""} (
              {formatDisplayDate(row.fromDate ?? row.from_date)} -{" "}
              {formatDisplayDate(row.toDate ?? row.to_date)})
            </span>
          </p>
          <p>
            <span className="font-medium text-slate-700">Subject Details:</span>{" "}
            <span className="text-[hsl(var(--primary))]">
              {row.subjectName ?? row.subject_name ?? ""} (
              {row.subjectCode ?? row.subject_code ?? ""})
              {row.examLabBatchName ? ` - ${row.examLabBatchName}` : ""}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Exam Date</Label>
            <Input
              type="date"
              value={examDate}
              min={minDate || undefined}
              max={maxDate || undefined}
              onChange={(e) => setExamDate(e.target.value)}
              disabled={saving}
            />
          </div>
          <Select
            label="Exam Session"
            required
            value={examSessionId}
            onChange={setExamSessionId}
            options={sessionOptions}
            placeholder="Exam Session"
            isLoading={loading}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={isActive}
            onCheckedChange={(v) => setIsActive(v === true)}
            disabled={saving}
            id="lab-tt-active"
          />
          <Label htmlFor="lab-tt-active" className="font-normal">
            Active
          </Label>
        </div>
        {!isActive ? (
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={saving}
            />
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
