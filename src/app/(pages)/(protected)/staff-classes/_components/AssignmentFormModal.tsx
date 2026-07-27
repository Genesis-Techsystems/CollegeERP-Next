"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toastError, toastInfo } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  buildAssignmentMyClasses,
  createStaffAssignment,
  listAssignmentStatuses,
  listAssignmentTypes,
  listSubjectUnitTopicsForAssignment,
  loadStaffSubjectsForAssignmentDate,
  subjectsForGroupSection,
  updateStaffAssignment,
  type AssignmentSavePayload,
} from "@/services";
import type { StaffSubjectClass } from "@/services/staff-dashboard";

type AnyRow = Record<string, unknown>;

const MAX_FILE_BYTES = 24_000_000;

function formatClassDateYmdSlash(d: Date): string {
  return format(d, "yyyy/MM/dd");
}

function parseDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const iso = parseISO(s);
  if (isValid(iso)) return iso;
  const d = new Date(s);
  return isValid(d) ? d : undefined;
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function gmOptions(rows: AnyRow[]): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.generalDetailId ?? ""),
    label: String(r.generalDetailDisplayName ?? r.generalDetailId ?? ""),
  }));
}

export type AssignmentFormModalProps = {
  open: boolean;
  onClose: () => void;
  editing: AnyRow | null;
  employeeId: number;
  onSaved: () => void;
};

export function AssignmentFormModal({
  open,
  onClose,
  editing,
  employeeId,
  onSaved,
}: AssignmentFormModalProps) {
  const isEdit = editing != null;
  const doc1Ref = useRef<HTMLInputElement>(null);
  const doc2Ref = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [staffRows, setStaffRows] = useState<StaffSubjectClass[]>([]);
  const [assignmentTypes, setAssignmentTypes] = useState<SelectOption[]>([]);
  const [assignmentStatuses, setAssignmentStatuses] = useState<SelectOption[]>(
    [],
  );
  const [subjectUnits, setSubjectUnits] = useState<SelectOption[]>([]);
  const [doc1TooLarge, setDoc1TooLarge] = useState(false);
  const [doc2TooLarge, setDoc2TooLarge] = useState(false);

  const [assignmentStartDate, setAssignmentStartDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [submissionDueDate, setSubmissionDueDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [allowLateDueDate, setAllowLateDueDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [groupSectionId, setGroupSectionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectUnitTopicId, setSubjectUnitTopicId] = useState<string | null>(
    null,
  );
  const [assignTypeCatId, setAssignTypeCatId] = useState<string | null>(null);
  const [assignmentStatusCatId, setAssignmentStatusCatId] = useState<
    string | null
  >(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");

  const myClasses = useMemo(
    () => buildAssignmentMyClasses(staffRows),
    [staffRows],
  );

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      myClasses.map((c) => ({
        value: String(c.groupSectionId ?? ""),
        label: `${c.courseCode ?? c.groupCode ?? ""} / ${c.courseYearName ?? ""} / ${c.section ?? ""}`,
      })),
    [myClasses],
  );

  const subjectOptions = useMemo<SelectOption[]>(() => {
    const section = positiveId(groupSectionId);
    if (!section) return [];
    return subjectsForGroupSection(staffRows, section).map((s) => ({
      value: String(s.subjectId ?? ""),
      label: String(s.subjectName ?? s.subjectId ?? ""),
    }));
  }, [groupSectionId, staffRows]);

  const loadCoursesForDate = useCallback(
    async (classDate: string) => {
      if (!employeeId) {
        setStaffRows([]);
        setLoadingMeta(false);
        return;
      }
      setLoadingMeta(true);
      try {
        const rows = await loadStaffSubjectsForAssignmentDate({
          employeeId,
          classDate,
        });
        setStaffRows(rows);
      } catch (e) {
        toastError(e, "Failed to load courses");
        setStaffRows([]);
      } finally {
        setLoadingMeta(false);
      }
    },
    [employeeId],
  );

  const loadSubjectUnits = useCallback(
    async (sectionId: number, subjId: number) => {
      const match = staffRows.find(
        (x) =>
          Number(x.groupSectionId) === sectionId &&
          Number(x.subjectId) === subjId,
      );
      if (!match) {
        setSubjectUnits([]);
        return;
      }
      const topics = await listSubjectUnitTopicsForAssignment({
        collegeId: positiveId(match.collegeId),
        academicYearId: positiveId(match.academicYearId),
        subjectId: subjId,
        courseYearId: positiveId(match.courseYearId),
      });
      setSubjectUnits(
        topics.map((t) => ({
          value: String(t.subjectUnitTopicId ?? ""),
          label: String(t.topicName ?? t.subjectUnitTopicId ?? ""),
        })),
      );
    },
    [staffRows],
  );

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [types, statuses] = await Promise.all([
          listAssignmentTypes(),
          listAssignmentStatuses(),
        ]);
        setAssignmentTypes(gmOptions(types));
        setAssignmentStatuses(gmOptions(statuses));
      } catch (e) {
        toastError(e, "Failed to load assignment options");
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const start = parseDate(editing?.assignmentStartDate) ?? new Date();
    const due = parseDate(editing?.submissionDueDate) ?? start;
    const late = parseDate(editing?.allowLateDueDate) ?? due;

    setAssignmentStartDate(start);
    setSubmissionDueDate(due);
    setAllowLateDueDate(late);
    setGroupSectionId(
      editing?.groupSectionId != null ? String(editing.groupSectionId) : null,
    );
    setSubjectId(editing?.subjectId != null ? String(editing.subjectId) : null);
    setSubjectUnitTopicId(
      editing?.subjectUnitTopicId != null
        ? String(editing.subjectUnitTopicId)
        : null,
    );
    setAssignTypeCatId(
      editing?.assignTypeCatId != null ? String(editing.assignTypeCatId) : null,
    );
    setAssignmentStatusCatId(
      editing?.assignmentStatusCatId != null
        ? String(editing.assignmentStatusCatId)
        : null,
    );
    setTitle(String(editing?.title ?? ""));
    setDescription(String(editing?.description ?? ""));
    setAllowLateSubmission(editing?.allowLateSubmission === true);
    setIsActive(editing?.isActive !== false);
    setReason(String(editing?.reason ?? "active"));
    setDoc1TooLarge(false);
    setDoc2TooLarge(false);
    if (doc1Ref.current) doc1Ref.current.value = "";
    if (doc2Ref.current) doc2Ref.current.value = "";
  }, [open, editing]);

  useEffect(() => {
    if (!open || !employeeId) return;
    void loadCoursesForDate(
      formatClassDateYmdSlash(assignmentStartDate ?? new Date()),
    );
  }, [open, employeeId, assignmentStartDate, loadCoursesForDate]);

  useEffect(() => {
    if (!open) return;
    const section = positiveId(groupSectionId);
    const subj = positiveId(subjectId);
    if (!section || !subj || staffRows.length === 0) {
      setSubjectUnits([]);
      return;
    }
    void loadSubjectUnits(section, subj);
  }, [open, groupSectionId, subjectId, staffRows, loadSubjectUnits]);

  const handleStartDateChange = (d: Date | undefined) => {
    if (!d) return;
    setAssignmentStartDate(d);
    if (submissionDueDate && d.getTime() > submissionDueDate.getTime()) {
      setSubmissionDueDate(d);
      setAllowLateDueDate(d);
    }
  };

  const handleDueDateChange = (d: Date | undefined) => {
    if (!d) return;
    if (assignmentStartDate && assignmentStartDate.getTime() > d.getTime()) {
      setSubmissionDueDate(assignmentStartDate);
      setAllowLateDueDate(assignmentStartDate);
      return;
    }
    setSubmissionDueDate(d);
    setAllowLateDueDate(d);
  };

  const handleSectionChange = (v: string | null) => {
    setGroupSectionId(v);
    setSubjectId(null);
    setSubjectUnitTopicId(null);
    setSubjectUnits([]);
  };

  const handleSubjectChange = (v: string | null) => {
    setSubjectId(v);
    setSubjectUnitTopicId(null);
  };

  const validateFile = (file: File | undefined, which: 1 | 2) => {
    if (!file) return true;
    if (file.size > MAX_FILE_BYTES) {
      if (which === 1) setDoc1TooLarge(true);
      else setDoc2TooLarge(true);
      return false;
    }
    if (which === 1) setDoc1TooLarge(false);
    else setDoc2TooLarge(false);
    return true;
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!title.trim()) {
      toastInfo("Assignment title is required.");
      return;
    }
    if (!groupSectionId || !subjectId || !assignmentStatusCatId) {
      toastInfo("Please complete required fields.");
      return;
    }
    if (staffRows.length === 0) {
      toastInfo(
        "Timetable is expired, so assignment cannot be saved. Please contact system admin.",
      );
      return;
    }

    const doc1 = doc1Ref.current?.files?.[0] ?? null;
    const doc2 = doc2Ref.current?.files?.[0] ?? null;
    if (!validateFile(doc1 ?? undefined, 1) || !validateFile(doc2 ?? undefined, 2)) {
      return;
    }

    const form: AssignmentSavePayload = {
      ...(editing ?? {}),
      groupSectionId: positiveId(groupSectionId),
      subjectId: positiveId(subjectId),
      subjectUnitTopicId: positiveId(subjectUnitTopicId) || null,
      assignTypeCatId: positiveId(assignTypeCatId) || null,
      assignmentStatusCatId: positiveId(assignmentStatusCatId),
      assignmentStartDate,
      submissionDueDate,
      allowLateDueDate,
      allowLateSubmission,
      title: title.trim(),
      description,
      isActive,
      reason: isActive ? "active" : reason,
      assignmentDoc1: doc1,
      assignmentDoc2: doc2,
    };

    setSaving(true);
    try {
      if (isEdit && editing) {
        await updateStaffAssignment({
          form,
          staffRows,
          assignmentId: positiveId(editing.assignmentId),
          assignmentDoc1: doc1,
          assignmentDoc2: doc2,
        });
      } else {
        await createStaffAssignment({
          form,
          staffRows,
          assignmentDoc1: doc1,
          assignmentDoc2: doc2,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err), "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const doc1Path = editing?.assgnmentDocPath ?? editing?.assignmentDocPath;
  const doc2Path = editing?.assignmentDocPath1;

  return (
    <FormModal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={isEdit ? "Edit Assignment" : "Add Assignment"}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel="Save"
      cancelLabel="Close"
      size="xl"
      showHeaderDivider
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        {staffRows.length === 0 && !loadingMeta && employeeId > 0 ? (
          <p className="text-sm font-medium text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            Timetable is expired, so assignment cannot be saved. Please contact
            system admin.
          </p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DatePicker
            label="Assignment Start Date *"
            value={assignmentStartDate}
            onChange={handleStartDateChange}
          />
          <Select
            label="Course *"
            value={groupSectionId}
            onChange={handleSectionChange}
            options={courseOptions}
            isLoading={loadingMeta}
            searchable
            placeholder="Select course"
            className="md:col-span-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Assignment Title" required htmlFor="assignment-title">
            <Input
              id="assignment-title"
              placeholder="Enter assignment title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              required
            />
          </FormField>
          <DatePicker
            label="Submission Due Date *"
            value={submissionDueDate}
            onChange={handleDueDateChange}
            minDate={assignmentStartDate}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Subject *"
            value={subjectId}
            onChange={handleSubjectChange}
            options={subjectOptions}
            searchable
            placeholder="Select subject"
            disabled={!groupSectionId || loadingMeta}
          />
          <Select
            label="Subject Unit Topic"
            value={subjectUnitTopicId}
            onChange={setSubjectUnitTopicId}
            options={subjectUnits}
            searchable
            clearable
            placeholder="Select unit topic"
            disabled={!subjectId}
          />
          <Select
            label="Assignment Type"
            value={assignTypeCatId}
            onChange={setAssignTypeCatId}
            options={assignmentTypes}
            searchable
            clearable
            placeholder="Select assignment type"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="allowLateSubmission"
              checked={allowLateSubmission}
              onCheckedChange={(v) => setAllowLateSubmission(v === true)}
            />
            <Label htmlFor="allowLateSubmission" className="cursor-pointer text-sm">
              Allow Late Submission
            </Label>
          </div>
          {allowLateSubmission ? (
            <DatePicker
              label="Allow Late Due Date"
              value={allowLateDueDate}
              onChange={setAllowLateDueDate}
              minDate={submissionDueDate ?? assignmentStartDate}
            />
          ) : (
            <div />
          )}
          <Select
            label="Assignment Status *"
            value={assignmentStatusCatId}
            onChange={setAssignmentStatusCatId}
            options={assignmentStatuses}
            searchable
            placeholder="Select status"
          />
        </div>

        <FormField label="Description">
          <Textarea
            placeholder="Enter assignment description (optional)"
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
            rows={3}
          />
        </FormField>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">Assignment Uploads</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Assignment Document 1">
              <Input
                ref={doc1Ref}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={() => validateFile(doc1Ref.current?.files?.[0], 1)}
              />
              {doc1Path ? (
                <a
                  href={String(doc1Path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  View existing document 1
                </a>
              ) : null}
              {doc1TooLarge ? (
                <p className="text-xs font-medium text-orange-600">
                  File size is greater than 24MB
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Accepted: PNG, JPG, PDF, DOC — max 24MB
                </p>
              )}
            </FormField>
            <FormField label="Assignment Document 2">
              <Input
                ref={doc2Ref}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={() => validateFile(doc2Ref.current?.files?.[0], 2)}
              />
              {doc2Path ? (
                <a
                  href={String(doc2Path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  View existing document 2
                </a>
              ) : null}
              {doc2TooLarge ? (
                <p className="text-xs font-medium text-orange-600">
                  File size is greater than 24MB
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Accepted: PNG, JPG, PDF, DOC — max 24MB
                </p>
              )}
            </FormField>
          </div>
        </div>

        <ActiveStatusField
          isActive={isActive}
          reason={reason}
          onActiveChange={(v) => setIsActive(v === true)}
          onReasonChange={setReason}
        />
      </div>
    </FormModal>
  );
}
