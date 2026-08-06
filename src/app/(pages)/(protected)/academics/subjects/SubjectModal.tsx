"use client";

/**
 * Angular parity: academics/master/subjects/subjects-modal
 * (Subject Master — has Question Paper Code + Syllabus upload; no University/Course in dialog)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  addSubjectAndUploadFile,
  deactivateSubject,
  isDuplicateSubjectCode,
  listSubjectCategories,
  listSubjectTypes,
  updateSubjectAndUploadFile,
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

export interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  row?: AnyRow | null;
  courseId: number;
  universityId?: number;
  universityName?: string;
  courseName?: string;
  courseCode?: string;
  existingRows?: AnyRow[];
  onSaved?: () => void;
}

export function SubjectModal({
  open,
  onClose,
  row,
  courseId,
  courseName = "",
  courseCode = "",
  existingRows = [],
  onSaved,
}: SubjectModalProps) {
  const isEdit = Boolean(row?.subjectId) && row?.type !== "new";
  const fileRef = useRef<HTMLInputElement>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [questionpaperCode, setQuestionpaperCode] = useState("");
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setLoadingLookups(true);
    Promise.all([listSubjectTypes(), listSubjectCategories()])
      .then(([typeList, categoryList]) => {
        setTypes(typeList);
        setCategories(categoryList);
      })
      .catch(() => {
        setTypes([]);
        setCategories([]);
      })
      .finally(() => setLoadingLookups(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (fileRef.current) fileRef.current.value = "";

    if (row && row.type !== "new" && row.subjectId) {
      setSubjectName(pickStr(row, ["subjectName"]));
      setSubjectCode(pickStr(row, ["subjectCode"]));
      setQuestionpaperCode(pickStr(row, ["questionpaperCode"]));
      setSubjectTypeId(
        pickNum(row, ["subjectTypeId", "fk_subject_type_id"])
          ? String(pickNum(row, ["subjectTypeId", "fk_subject_type_id"]))
          : null,
      );
      setSubjectCategoryId(
        pickNum(row, ["subjectCategoryId", "fk_subject_category_id"])
          ? String(
              pickNum(row, ["subjectCategoryId", "fk_subject_category_id"]),
            )
          : null,
      );
      setSubCredits(row.subCredits != null ? String(row.subCredits) : "");
      setSubCreditHrs(row.subCreditHrs != null ? String(row.subCreditHrs) : "");
      setShortName(pickStr(row, ["shortName"]));
      setOrderNo(row.orderNo != null ? String(row.orderNo) : "");
      setIsLanguage(Boolean(row.isLanguage));
      setIsActive(row.isActive !== false);
      setReason(
        row.isActive === false ? pickStr(row, ["reason"]) || "" : "active",
      );
    } else {
      setSubjectName("");
      setSubjectCode("");
      setQuestionpaperCode("");
      setSubjectTypeId(null);
      setSubjectCategoryId(null);
      setSubCredits("");
      setSubCreditHrs("");
      setShortName("");
      setOrderNo("");
      setIsLanguage(false);
      setIsActive(true);
      setReason("active");
    }
  }, [open, row]);

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

  function buildPayload(): AnyRow {
    return {
      courseId,
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim(),
      questionpaperCode: questionpaperCode.trim() || null,
      orderNo: orderNo.trim() ? Number(orderNo) : null,
      subjectTypeId: subjectTypeId ? Number(subjectTypeId) : null,
      subjectCategoryId: subjectCategoryId ? Number(subjectCategoryId) : null,
      subCredits: subCredits.trim() ? Number(subCredits) : null,
      subCreditHrs: subCreditHrs.trim() ? Number(subCreditHrs) : null,
      shortName: shortName.trim(),
      isLanguage,
      isActive,
      reason: isActive ? "active" : reason.trim(),
    };
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!courseId) next.courseId = "Course is required";
    if (!subjectName.trim()) next.subjectName = "Subject Name is required";
    if (!subjectCode.trim()) next.subjectCode = "Subject Code is required";
    if (!subjectTypeId) next.subjectTypeId = "Subject Type is required";
    if (!subjectCategoryId)
      next.subjectCategoryId = "Subject Category is required";
    if (!subCredits.trim()) next.subCredits = "Credits is required";
    if (!subCreditHrs.trim()) next.subCreditHrs = "Credit Hours is required";
    if (!shortName.trim()) next.shortName = "Short Name is required";
    if (!orderNo.trim()) next.orderNo = "Order No is required";
    if (!isActive && !reason.trim())
      next.reason = "Reason is required when inactive";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload();
    const file = fileRef.current?.files?.[0] ?? null;
    const subjectId = pickNum(row, ["subjectId"]);

    setSaving(true);
    try {
      if (!isEdit) {
        if (
          isDuplicateSubjectCode(
            existingRows,
            String(payload.subjectCode),
            Number(payload.collegeId ?? 0) || null,
          )
        ) {
          toastInfo("Already same subject code exists.");
          return;
        }
        const result = await addSubjectAndUploadFile(payload, file);
        if (result.data != null && result.data !== "") {
          toastSuccess(result.message || "Subject created");
          onSaved?.();
          onClose();
        } else if (result.success === false) {
          toastError(result.message || "Failed to create subject");
        } else {
          toastSuccess(result.message || "Subject created");
          onSaved?.();
          onClose();
        }
        return;
      }

      // Edit — Angular: deactivate via DELETE when isActive == false
      if (subjectId && isActive === false) {
        const result = await deactivateSubject(subjectId);
        toastInfo(result.message || "Subject deactivated");
        onSaved?.();
        onClose();
        return;
      }

      const result = await updateSubjectAndUploadFile(
        { ...payload, subjectId },
        file,
      );
      if (result.success) {
        toastSuccess(result.message || "Subject updated");
        onSaved?.();
        onClose();
      } else {
        toastInfo(result.message || "Unable to update subject");
      }
    } catch (ex) {
      toastError(ex instanceof Error ? ex.message : "Failed to save subject");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Subject" : "Add Subject"}
      headerInfo={
        courseName || courseCode
          ? `Course : ${courseCode}${courseCode && courseName ? " - " : ""}${courseName}`
          : undefined
      }
      onSubmit={handleSubmit}
      submitLabel="Save"
      isSubmitting={saving}
      size="xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            Subject Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={subjectName}
            onChange={(e) => {
              setSubjectName(e.target.value);
              clearError("subjectName");
            }}
            placeholder="Subject Name"
            disabled={saving}
          />
          {errors.subjectName ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.subjectName}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>
            Subject Code <span className="text-destructive">*</span>
          </Label>
          <Input
            value={subjectCode}
            onChange={(e) => {
              setSubjectCode(e.target.value);
              clearError("subjectCode");
            }}
            placeholder="Subject Code"
            disabled={saving}
          />
          {errors.subjectCode ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.subjectCode}
            </p>
          ) : null}
        </div>

        <Select
          label="Subject Type"
          required
          value={subjectTypeId}
          onChange={(v) => {
            setSubjectTypeId(v);
            clearError("subjectTypeId");
          }}
          options={typeOptions}
          placeholder="Subject Type"
          error={errors.subjectTypeId}
          isLoading={loadingLookups}
          disabled={saving}
        />
        <Select
          label="Subject Category"
          required
          value={subjectCategoryId}
          onChange={(v) => {
            setSubjectCategoryId(v);
            clearError("subjectCategoryId");
          }}
          options={categoryOptions}
          placeholder="Subject Category"
          error={errors.subjectCategoryId}
          isLoading={loadingLookups}
          disabled={saving}
        />
        <div className="space-y-1.5">
          <Label>Question Paper Code</Label>
          <Input
            value={questionpaperCode}
            onChange={(e) => setQuestionpaperCode(e.target.value)}
            placeholder="Question Paper Code"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Credits <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            step="any"
            value={subCredits}
            onChange={(e) => {
              setSubCredits(e.target.value);
              clearError("subCredits");
            }}
            placeholder="Credits"
            disabled={saving}
          />
          {errors.subCredits ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.subCredits}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>
            Credit Hours <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            step="any"
            value={subCreditHrs}
            onChange={(e) => {
              setSubCreditHrs(e.target.value);
              clearError("subCreditHrs");
            }}
            placeholder="Credit Hours"
            disabled={saving}
          />
          {errors.subCreditHrs ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.subCreditHrs}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>
            Short Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value);
              clearError("shortName");
            }}
            placeholder="Short Name"
            disabled={saving}
          />
          {errors.shortName ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.shortName}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>
            Order No <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            value={orderNo}
            onChange={(e) => {
              setOrderNo(e.target.value);
              clearError("orderNo");
            }}
            placeholder="Order No"
            disabled={saving}
          />
          {errors.orderNo ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.orderNo}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label>Syllabus Document</Label>
          <Input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.doc"
            disabled={saving}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 sm:col-span-1">
          <Checkbox
            checked={isLanguage}
            onCheckedChange={(v) => setIsLanguage(v === true)}
            disabled={saving}
            id="subj-is-language"
          />
          <Label htmlFor="subj-is-language" className="font-normal">
            Is Language
          </Label>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <ActiveStatusField
            isActive={isActive}
            reason={reason}
            onActiveChange={(v) => {
              const next = v === true;
              setIsActive(next);
              if (next) {
                setReason("active");
                clearError("reason");
              }
            }}
            onReasonChange={(v) => {
              setReason(v);
              clearError("reason");
            }}
            reasonRequired={!isActive}
            reasonError={errors.reason}
          />
        </div>
      </div>
    </FormModal>
  );
}

export default SubjectModal;
