"use client";

/**
 * Angular parity: college-curriculum/course-group-year-subjects/add-subject
 * Fields only — no Question Paper Code, no Syllabus Document.
 * Save: POST domain/create/Subject
 */
import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  createSubjectDomain,
  listActiveUniversities,
  listCoursesByUniversity,
  listSubjectCategories,
  listSubjectTypes,
} from "@/services";

type AnyRow = Record<string, unknown>;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickStr(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return "";
}

function gdLabel(row: AnyRow): string {
  return (
    pickStr(row, [
      "generalDetailDisplayName",
      "generalDetailName",
      "generalDetailCode",
    ]) || "—"
  );
}

export interface AddCurriculumSubjectModalProps {
  open: boolean;
  onClose: () => void;
  universityId?: number;
  courseId?: number;
  existingRows?: AnyRow[];
  onSaved?: () => void;
}

export function AddCurriculumSubjectModal({
  open,
  onClose,
  universityId,
  courseId,
  existingRows = [],
  onSaved,
}: AddCurriculumSubjectModalProps) {
  const [universities, setUniversities] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [types, setTypes] = useState<AnyRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedUniversityId, setSelectedUniversityId] = useState<
    string | null
  >(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectTypeId, setSubjectTypeId] = useState<string | null>(null);
  const [subjectCategoryId, setSubjectCategoryId] = useState<string | null>(
    null,
  );
  const [subCredits, setSubCredits] = useState("");
  const [subCreditHrs, setSubCreditHrs] = useState("");
  const [shortName, setShortName] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [isLanguage, setIsLanguage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");

  useEffect(() => {
    if (!open) return;
    setLoadingLookups(true);
    Promise.all([
      listActiveUniversities(),
      listSubjectTypes(),
      listSubjectCategories(),
    ])
      .then(([universityList, typeList, categoryList]) => {
        setUniversities(universityList as unknown as AnyRow[]);
        setTypes(typeList);
        setCategories(categoryList);
      })
      .catch(() => {
        setUniversities([]);
        setTypes([]);
        setCategories([]);
      })
      .finally(() => setLoadingLookups(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedUniversityId(
      universityId && universityId > 0 ? String(universityId) : null,
    );
    setSelectedCourseId(courseId && courseId > 0 ? String(courseId) : null);
    setSubjectName("");
    setSubjectCode("");
    setSubjectTypeId(null);
    setSubjectCategoryId(null);
    setSubCredits("");
    setSubCreditHrs("");
    setShortName("");
    setOrderNo("");
    setIsLanguage(false);
    setIsActive(true);
    setReason("active");
  }, [open, universityId, courseId]);

  useEffect(() => {
    if (!open || !selectedUniversityId) {
      setCourses([]);
      return;
    }
    let active = true;
    listCoursesByUniversity(Number(selectedUniversityId))
      .then((courseList) => {
        if (!active) return;
        setCourses(courseList);
        const match =
          courseId &&
          courseList.some(
            (item) => pickNum(item, ["courseId", "pk_course_id"]) === courseId,
          )
            ? String(courseId)
            : null;
        setSelectedCourseId((prev) => match ?? prev);
      })
      .catch(() => {
        if (!active) return;
        setCourses([]);
      });
    return () => {
      active = false;
    };
  }, [open, selectedUniversityId, courseId]);

  const universityOptions = useMemo(
    () =>
      universities.map((x) => ({
        value: String(pickNum(x, ["universityId", "pk_university_id"])),
        label:
          pickStr(x, ["universityCode"]) ||
          pickStr(x, ["universityName"]) ||
          "University",
      })),
    [universities],
  );

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(pickNum(x, ["courseId", "pk_course_id"])),
        label:
          pickStr(x, ["courseName"]) || pickStr(x, ["courseCode"]) || "Course",
      })),
    [courses],
  );

  const typeOptions = useMemo(
    () =>
      types.map((x) => ({
        value: String(pickNum(x, ["generalDetailId"])),
        label: gdLabel(x),
      })),
    [types],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((x) => ({
        value: String(pickNum(x, ["generalDetailId"])),
        label: gdLabel(x),
      })),
    [categories],
  );

  function validate(): string | null {
    // Angular Validators.required: universityId, courseId, subjectName, subjectCode, shortName
    // HTML required also on subjectTypeId / subjectCategoryId
    if (!selectedUniversityId) return "University is required";
    if (!selectedCourseId) return "Course is required";
    if (!subjectName.trim()) return "Subject name is required";
    if (!subjectCode.trim()) return "Subject code is required";
    if (!subjectTypeId) return "Subject type is required";
    if (!subjectCategoryId) return "Subject category is required";
    if (!shortName.trim()) return "Short name is required";
    return null;
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toastInfo(err);
      return;
    }

    const name = subjectName.trim();
    const code = subjectCode.trim();
    const duplicate = existingRows.some((x) => {
      const xName = String(x.subjectName ?? "").toLowerCase();
      const xCode = String(x.subjectCode ?? "");
      return (
        xName === name.toLowerCase() ||
        (xCode === code && Number(x.subjectId ?? 0) !== 0)
      );
    });
    if (duplicate) {
      toastInfo("Already Subject exists with same name.");
      return;
    }

    const payload = {
      universityId: Number(selectedUniversityId),
      courseId: Number(selectedCourseId),
      subjectName: name,
      subjectCode: code,
      orderNo: orderNo.trim() ? Number(orderNo) : null,
      subjectTypeId: subjectTypeId ? Number(subjectTypeId) : null,
      subjectCategoryId: subjectCategoryId ? Number(subjectCategoryId) : null,
      subCredits: subCredits.trim() ? Number(subCredits) : null,
      subCreditHrs: subCreditHrs.trim() ? Number(subCreditHrs) : null,
      shortName: shortName.trim(),
      isLanguage,
      isActive,
      reason: isActive ? "active" : reason.trim() || "active",
    };

    setSaving(true);
    try {
      await createSubjectDomain(payload);
      toastSuccess("Subject created");
      onSaved?.();
      onClose();
    } catch (ex) {
      toastError(ex instanceof Error ? ex.message : "Failed to create subject");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Subject"
      onSubmit={handleSubmit}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={saving}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="University"
          required
          value={selectedUniversityId}
          onChange={(value) => {
            setSelectedUniversityId(value);
            setSelectedCourseId(null);
          }}
          options={universityOptions}
          placeholder="University"
          isLoading={loadingLookups}
          disabled={saving}
        />
        <Select
          label="Course"
          required
          value={selectedCourseId}
          onChange={setSelectedCourseId}
          options={courseOptions}
          placeholder="Course"
          isLoading={loadingLookups}
          disabled={saving || !selectedUniversityId}
        />

        <div className="space-y-1.5 sm:col-span-1">
          <Label>
            Subject Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Subject Code <span className="text-destructive">*</span>
          </Label>
          <Input
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            disabled={saving}
          />
        </div>

        <Select
          label="Subject Type"
          required
          value={subjectTypeId}
          onChange={setSubjectTypeId}
          options={typeOptions}
          placeholder="Subject Type"
          isLoading={loadingLookups}
          disabled={saving}
        />
        <Select
          label="Subject Category"
          required
          value={subjectCategoryId}
          onChange={setSubjectCategoryId}
          options={categoryOptions}
          placeholder="Subject Category"
          isLoading={loadingLookups}
          disabled={saving}
        />

        <div className="space-y-1.5">
          <Label>Credits</Label>
          <Input
            type="number"
            step="any"
            value={subCredits}
            onChange={(e) => setSubCredits(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Credit Hours</Label>
          <Input
            type="number"
            step="any"
            value={subCreditHrs}
            onChange={(e) => setSubCreditHrs(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Short Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Order No</Label>
          <Input
            type="number"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-6 sm:col-span-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isLanguage}
              onCheckedChange={(v) => setIsLanguage(v === true)}
              disabled={saving}
              id="curr-subj-is-language"
            />
            <Label htmlFor="curr-subj-is-language" className="font-normal">
              Is Language
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isActive}
              onCheckedChange={(v) => {
                const next = v === true;
                setIsActive(next);
                if (next) setReason("active");
              }}
              disabled={saving}
              id="curr-subj-is-active"
            />
            <Label htmlFor="curr-subj-is-active" className="font-normal">
              Active
            </Label>
          </div>
        </div>

        {!isActive ? (
          <div className="space-y-1.5 sm:col-span-2">
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
