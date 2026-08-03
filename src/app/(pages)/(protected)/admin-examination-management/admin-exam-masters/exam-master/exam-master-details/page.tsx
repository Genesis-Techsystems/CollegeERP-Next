"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Select } from "@/common/components/select";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { toastError, toastSuccess } from "@/lib/toast";
import { scheduleNavigation } from "@/lib/schedule-navigation";
import { cn } from "@/lib/utils";
import { GM_CODES } from "@/config/constants/ui";
import type {
  ExamMaster,
  ExamMasterDetails,
  GeneralDetail,
  Regulation,
  CourseGroup,
  CourseYear,
} from "@/types/exam-master";
import {
  getExamMasterById,
  getGeneralDetails,
  getRegulations,
  getCourseGroups,
  getCourseYears,
  getExamMasterDetails as fetchExamMasterDetails,
  saveExamMasterDetails,
} from "@/services/exam-master";

function PageSkeleton() {
  return (
    <PageContainer className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </PageContainer>
  );
}

function formatExamDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "yyyy-MM-dd");
}

type AnyLoose = Record<string, any>;

function resolveCourseId(exam: ExamMaster | null): number {
  if (!exam) return 0;
  const direct = Number(exam.courseId ?? 0);
  if (direct > 0) return direct;
  const nested = Number(
    (exam as AnyLoose).course?.courseId ??
      (exam as AnyLoose).Course?.courseId ??
      0,
  );
  return nested > 0 ? nested : 0;
}

function ExamMasterDetailsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = Number(searchParams.get("examId"));
  useBreadcrumbLabel("Create Exam Notification");

  const [exam, setExam] = useState<ExamMaster | null>(null);
  const [examFeeTypes, setExamFeeTypes] = useState<GeneralDetail[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [courseYears, setCourseYears] = useState<CourseYear[]>([]);
  const [examMasterDetails, setExamMasterDetails] = useState<
    ExamMasterDetails[]
  >([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    regulationId: null as string | null,
    courseGroupId: null as string | null,
    courseYearId: null as string | null,
    examLabel: "",
    isBridgeCourse: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [labelPanelOpen, setLabelPanelOpen] = useState(true);

  const filteredDetails = useMemo(() => {
    if (selectedTabId == null) return [];
    return examMasterDetails.filter(
      (d) =>
        Number(d.examTypeCatId) === Number(selectedTabId) &&
        d.isActive === true,
    );
  }, [examMasterDetails, selectedTabId]);

  const activeTab = examFeeTypes.find(
    (t) => Number(t.generalDetailId) === Number(selectedTabId),
  );

  useEffect(() => {
    if (!examId || Number.isNaN(examId)) {
      return scheduleNavigation(() => {
        router.replace(
          "/admin-examination-management/admin-exam-masters/exam-master",
        );
      });
    }

    void (async () => {
      let row: ExamMaster | null = null;
      const stored = sessionStorage.getItem("examMasterDetails");
      if (stored) {
        try {
          row = JSON.parse(stored) as ExamMaster;
        } catch {
          row = null;
        }
      }
      if (!row || !resolveCourseId(row)) {
        row = (await getExamMasterById(examId).catch(() => null)) ?? row;
      }
      if (!row) {
        toastError("Exam details not found.");
        scheduleNavigation(() => {
          router.replace(
            "/admin-examination-management/admin-exam-masters/exam-master",
          );
        });
        return;
      }
      setExam(row);
    })();
  }, [examId, router]);

  useEffect(() => {
    if (!exam) return;
    const courseId = resolveCourseId(exam);
    if (!courseId) {
      toastError("Course is missing on this exam. Cannot load labels.");
      setLoadingRefs(false);
      return;
    }

    setLoadingRefs(true);
    void Promise.all([
      getGeneralDetails(GM_CODES.EXAM_FEE_TYPE),
      getRegulations(courseId),
      getCourseGroups(courseId),
      getCourseYears(courseId),
      fetchExamMasterDetails(examId),
    ])
      .then(([allTypes, regs, groups, years, details]) => {
        const allowed: string[] = [];
        if (exam.isRegularExam) allowed.push("Regular");
        if (exam.isSupplyExam) allowed.push("Supple");
        if (exam.isInternalExam) allowed.push("Internal");
        const filtered = (Array.isArray(allTypes) ? allTypes : []).filter((t) =>
          allowed.includes(String(t.generalDetailCode ?? "")),
        );
        setExamFeeTypes(filtered);
        if (filtered.length > 0) {
          setSelectedTabId(Number(filtered[0].generalDetailId));
        }
        setRegulations(Array.isArray(regs) ? regs : []);
        setCourseGroups(Array.isArray(groups) ? groups : []);
        setCourseYears(Array.isArray(years) ? years : []);
        setExamMasterDetails(Array.isArray(details) ? details : []);
      })
      .catch((e) => toastError(e, "Failed to load exam label data"))
      .finally(() => setLoadingRefs(false));
  }, [exam, examId]);

  const clearForm = useCallback(() => {
    setFormState({
      regulationId: null,
      courseGroupId: null,
      courseYearId: null,
      examLabel: "",
      isBridgeCourse: false,
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingIndex(null);
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!formState.regulationId) errors.regulationId = "Required";
    if (!formState.courseGroupId) errors.courseGroupId = "Required";
    if (!formState.courseYearId) errors.courseYearId = "Required";
    if (!formState.examLabel.trim()) errors.examLabel = "Required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleAdd() {
    if (!validate() || selectedTabId == null) return;
    const regulationId = Number(formState.regulationId);
    const courseGroupId = Number(formState.courseGroupId);
    const courseYearId = Number(formState.courseYearId);
    const reg = regulations.find(
      (r) => Number(r.regulationId) === regulationId,
    );
    const grp = courseGroups.find(
      (c) => Number(c.courseGroupId) === courseGroupId,
    );
    const yr = courseYears.find((y) => Number(y.courseYearId) === courseYearId);

    const payload: ExamMasterDetails = {
      examMasterId: examId,
      examTypeCatId: selectedTabId,
      regulationId,
      regulationCode: String(reg?.regulationName ?? reg?.regulationCode ?? ""),
      courseGroupId,
      courseGroupCode: String(grp?.groupCode ?? ""),
      courseYearId,
      courseYearName: String(yr?.courseYearName ?? ""),
      examLabel: formState.examLabel.trim(),
      isBridgeCourse: formState.isBridgeCourse,
      isActive: true,
    };
    setExamMasterDetails((prev) => [...prev, payload]);
    clearForm();
  }

  function handleEdit(row: ExamMasterDetails) {
    const idx = examMasterDetails.indexOf(row);
    if (idx === -1) return;
    setFormState({
      regulationId: row.regulationId != null ? String(row.regulationId) : null,
      courseGroupId:
        row.courseGroupId != null ? String(row.courseGroupId) : null,
      courseYearId: row.courseYearId != null ? String(row.courseYearId) : null,
      examLabel: row.examLabel ?? "",
      isBridgeCourse: !!row.isBridgeCourse,
    });
    setIsEditing(true);
    setEditingIndex(idx);
    setLabelPanelOpen(true);
  }

  function handleUpdate() {
    if (!validate() || editingIndex == null || selectedTabId == null) return;
    const regulationId = Number(formState.regulationId);
    const courseGroupId = Number(formState.courseGroupId);
    const courseYearId = Number(formState.courseYearId);
    const reg = regulations.find(
      (r) => Number(r.regulationId) === regulationId,
    );
    const grp = courseGroups.find(
      (c) => Number(c.courseGroupId) === courseGroupId,
    );
    const yr = courseYears.find((y) => Number(y.courseYearId) === courseYearId);

    setExamMasterDetails((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        examTypeCatId: selectedTabId,
        isActive: true,
        regulationId,
        regulationCode: String(
          reg?.regulationName ?? reg?.regulationCode ?? "",
        ),
        courseGroupId,
        courseGroupCode: String(grp?.groupCode ?? ""),
        courseYearId,
        courseYearName: String(yr?.courseYearName ?? ""),
        examLabel: formState.examLabel.trim(),
        isBridgeCourse: formState.isBridgeCourse,
      };
      return updated;
    });
    clearForm();
  }

  function handleDelete(row: ExamMasterDetails) {
    const idx = examMasterDetails.indexOf(row);
    if (idx === -1) return;
    setExamMasterDetails((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isActive: false };
      return updated;
    });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const result = await saveExamMasterDetails(examMasterDetails);
      toastSuccess(result.message || "Saved successfully");
      scheduleNavigation(() => {
        router.push(
          "/admin-examination-management/admin-exam-masters/exam-master",
        );
      });
    } catch (err) {
      toastError(err, "Failed to save exam labels");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    router.push("/admin-examination-management/admin-exam-masters/exam-master");
  }

  if (!exam || loadingRefs) return <PageSkeleton />;

  const examDateLabel =
    formatExamDate(exam.fromDate) || formatExamDate(exam.examMonthYr) || "";

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h1 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">
            Exam Master Details
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {exam.examName}
            {examDateLabel ? ` — ${examDateLabel}` : ""}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {examFeeTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">
                No exam types configured for this exam (Regular / Supple /
                Internal).
              </p>
            </div>
          ) : (
            <>
              <Collapsible
                open={labelPanelOpen}
                onOpenChange={setLabelPanelOpen}
                className="rounded-md border border-border"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2 font-semibold text-[14px] text-[hsl(var(--card-title))]">
                      <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />
                      {isEditing ? "Edit Exam Label" : "Add Exam Label"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {examFeeTypes.length > 1 ? (
                        <span
                          className="min-w-[140px]"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Select
                            value={
                              selectedTabId != null
                                ? String(selectedTabId)
                                : null
                            }
                            onChange={(v) => {
                              if (!v) return;
                              setSelectedTabId(Number(v));
                              clearForm();
                            }}
                            options={examFeeTypes.map((t) => ({
                              value: String(t.generalDetailId),
                              label: String(t.generalDetailCode ?? ""),
                            }))}
                            placeholder="Exam type"
                            searchable={false}
                            clearable={false}
                          />
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                          {activeTab?.generalDetailCode ?? "—"}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          labelPanelOpen && "rotate-180",
                        )}
                      />
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t border-border px-3 py-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[12px] text-slate-700">
                        Regulation <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formState.regulationId}
                        onChange={(v) =>
                          setFormState((s) => ({ ...s, regulationId: v }))
                        }
                        options={regulations.map((r) => ({
                          value: String(r.regulationId),
                          label: String(
                            r.regulationName ?? r.regulationCode ?? "",
                          ),
                        }))}
                        placeholder="Select Regulation"
                        error={formErrors.regulationId}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[12px] text-slate-700">
                        Course Group <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formState.courseGroupId}
                        onChange={(v) =>
                          setFormState((s) => ({ ...s, courseGroupId: v }))
                        }
                        options={courseGroups.map((c) => ({
                          value: String(c.courseGroupId),
                          label: String(c.groupCode ?? ""),
                        }))}
                        placeholder="Select Course Group"
                        error={formErrors.courseGroupId}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[12px] text-slate-700">
                        Course Year <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formState.courseYearId}
                        onChange={(v) =>
                          setFormState((s) => ({ ...s, courseYearId: v }))
                        }
                        options={courseYears.map((y) => ({
                          value: String(y.courseYearId),
                          label: String(y.courseYearName ?? ""),
                        }))}
                        placeholder="Select Course Year"
                        error={formErrors.courseYearId}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[12px] text-slate-700">
                        Exam Label <span className="text-red-500">*</span>
                      </Label>
                      <input
                        type="text"
                        value={formState.examLabel}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            examLabel: e.target.value,
                          }))
                        }
                        placeholder="Enter exam label"
                        className={`flex h-8 w-full rounded-md border bg-transparent px-3 text-[12px] shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${
                          formErrors.examLabel
                            ? "border-destructive"
                            : "border-input"
                        }`}
                      />
                      {formErrors.examLabel && (
                        <p className="text-[11px] text-red-500">
                          {formErrors.examLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                      <Checkbox
                        checked={formState.isBridgeCourse}
                        onCheckedChange={(v) =>
                          setFormState((s) => ({
                            ...s,
                            isBridgeCourse: v === true,
                          }))
                        }
                      />
                      Is Bridge Course
                    </label>

                    {isEditing ? (
                      <Button
                        type="button"
                        className="h-8 px-4 text-[12px]"
                        onClick={handleUpdate}
                      >
                        Update
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="h-8 px-4 text-[12px]"
                        onClick={handleAdd}
                      >
                        Add
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-4 text-[12px]"
                      onClick={clearForm}
                    >
                      Clear
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          SI.No
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Regulation
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Course Group
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Course Year
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Exam Label
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Bridge Course
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold uppercase text-[11px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetails.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                              <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
                              <p className="text-sm">No records found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDetails.map((row, i) => (
                          <tr
                            key={`${row.examMasterDetailsId ?? "new"}-${row.regulationId}-${row.courseGroupId}-${row.courseYearId}-${i}`}
                            className="border-b border-border/60 hover:bg-muted/30"
                          >
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2">
                              {row.regulationCode || row.regulationId}
                            </td>
                            <td className="px-3 py-2">
                              {row.courseGroupCode || row.courseGroupId}
                            </td>
                            <td className="px-3 py-2">
                              {row.courseYearName || row.courseYearId}
                            </td>
                            <td className="px-3 py-2">{row.examLabel}</td>
                            <td className="px-3 py-2">
                              {row.isBridgeCourse ? "true" : "false"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  aria-label="Edit"
                                  onClick={() => handleEdit(row)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  aria-label="Delete"
                                  onClick={() => handleDelete(row)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 text-[12px]"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          type="button"
          className="h-8 text-[12px]"
          onClick={handleSubmit}
          disabled={saving || examFeeTypes.length === 0}
        >
          {saving ? "Saving..." : "Save All"}
        </Button>
      </div>
    </PageContainer>
  );
}

export default function ExamMasterDetailsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamMasterDetailsInner />
    </Suspense>
  );
}
