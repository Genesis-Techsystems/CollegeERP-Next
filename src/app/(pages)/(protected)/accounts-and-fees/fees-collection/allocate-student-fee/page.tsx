"use client";

import { useCallback, useMemo, useState } from "react";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsByUniversity,
  listBatchesByCourse,
  listCoursesByUniversity,
  listFeeCollectionQuotaOptions,
  listFeeStructuresForAllocation,
  loadStudentFeeStructureAllocation,
} from "@/services";
import type { College } from "@/types/college";
import { useQuery } from "@tanstack/react-query";

type Mode = "batch" | "academic";

type StructureRow = {
  feeStructureId: number;
  classGroupName: string;
  checked: boolean;
};

function toOptions(
  rows: Array<Record<string, unknown>>,
  valueKey: string,
  labelKeys: string[],
) {
  return rows
    .map((r) => {
      const value = Number(r[valueKey] ?? 0);
      if (!value) return null;
      let label = "";
      for (const k of labelKeys) {
        if (r[k] != null && String(r[k]).trim() !== "") {
          label = String(r[k]);
          break;
        }
      }
      return { value: String(value), label: label || String(value) };
    })
    .filter((o): o is { value: string; label: string } => o != null);
}

export default function AllocateStudentFeePage() {
  const [mode, setMode] = useState<Mode>("batch");
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [quotaId, setQuotaId] = useState<string | null>(null);
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["AllocateFee", "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const selectedCollege = useMemo(
    () => colleges.find((c) => String(c.collegeId) === collegeId) ?? null,
    [colleges, collegeId],
  );
  const universityId = Number(selectedCollege?.universityId ?? 0);

  const { data: quotas = [], isLoading: loadingQuotas } = useQuery({
    queryKey: ["AllocateFee", "quotas"],
    queryFn: listFeeCollectionQuotaOptions,
  });

  const { data: academicYears = [], isLoading: loadingAy } = useQuery({
    queryKey: ["AllocateFee", "academicYears", universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: mode === "academic" && universityId > 0,
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["AllocateFee", "courses", universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  });

  const courseNum = Number(courseId ?? 0);
  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ["AllocateFee", "batches", courseNum],
    queryFn: () => listBatchesByCourse(courseNum),
    enabled: mode === "batch" && courseNum > 0,
  });

  const collegeOptions = useMemo(
    () =>
      colleges.map((c: College) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName || String(c.collegeId),
      })),
    [colleges],
  );

  const ayOptions = useMemo(
    () =>
      toOptions(
        academicYears as Array<Record<string, unknown>>,
        "academicYearId",
        ["academicYear"],
      ),
    [academicYears],
  );

  const courseOptions = useMemo(
    () =>
      toOptions(courses as Array<Record<string, unknown>>, "courseId", [
        "courseCode",
        "courseName",
      ]),
    [courses],
  );

  const batchOptions = useMemo(
    () =>
      toOptions(
        batches as unknown as Array<Record<string, unknown>>,
        "batchId",
        ["batchName", "batchCode"],
      ),
    [batches],
  );

  const quotaOptions = useMemo(() => {
    const rows = quotas.map((q) => ({
      value: String(q.generalDetailId),
      label: String(
        (q as { generalDetailDisplayName?: string }).generalDetailDisplayName ??
          q.generalDetailName ??
          q.generalDetailCode ??
          q.generalDetailId,
      ),
    }));
    return [{ value: "0", label: "All" }, ...rows];
  }, [quotas]);

  const clearDownstream = useCallback(
    (level: "college" | "ay" | "course" | "batch" | "mode") => {
      if (level === "mode" || level === "college") {
        setAcademicYearId(null);
        setCourseId(null);
        setBatchId(null);
        setQuotaId(null);
      } else if (level === "ay") {
        setCourseId(null);
        setBatchId(null);
        setQuotaId(null);
      } else if (level === "course") {
        setBatchId(null);
        setQuotaId(null);
      } else if (level === "batch") {
        setQuotaId(null);
      }
      setStructures([]);
    },
    [],
  );

  const loadStructures = useCallback(
    async (nextQuotaId: string | null) => {
      const cid = Number(collegeId ?? 0);
      const crid = Number(courseId ?? 0);
      const qid = Number(nextQuotaId ?? -1);
      if (
        !cid ||
        !crid ||
        nextQuotaId == null ||
        Number.isNaN(qid) ||
        qid < 0
      ) {
        setStructures([]);
        return;
      }

      setLoadingStructures(true);
      try {
        const rows = await listFeeStructuresForAllocation({
          collegeId: cid,
          courseId: crid,
          quotaId: qid,
          batchId: mode === "batch" && batchId ? Number(batchId) : undefined,
          academicYearId:
            mode === "academic" && academicYearId
              ? Number(academicYearId)
              : undefined,
          isAcademicFee: mode === "academic",
        });
        setStructures(
          rows
            .map((r) => ({
              feeStructureId: Number(r.feeStructureId ?? 0),
              classGroupName: String(
                r.classGroupName ?? r.structureName ?? r.feeStructureId ?? "",
              ),
              checked: false,
            }))
            .filter((r) => r.feeStructureId > 0),
        );
      } catch (e) {
        toastError(e, "Failed to load fee structures");
        setStructures([]);
      } finally {
        setLoadingStructures(false);
      }
    },
    [collegeId, courseId, batchId, academicYearId, mode],
  );

  async function onSave() {
    const ids = structures
      .filter((s) => s.checked)
      .map((s) => s.feeStructureId);
    if (ids.length === 0) {
      toastInfo("Select at least one fee structure.");
      return;
    }
    setSaving(true);
    try {
      await loadStudentFeeStructureAllocation({ mode, feeStructureIds: ids });
      toastSuccess("Fee structure allocated to students successfully.");
    } catch (e) {
      toastError(e, "Failed to allocate fee structure");
    } finally {
      setSaving(false);
    }
  }

  const checkedCount = structures.filter((s) => s.checked).length;

  return (
    <FilteredPage
      title="Allocate Student Fee Structure"
      filters={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allocate-mode"
                checked={mode === "batch"}
                onChange={() => {
                  setMode("batch");
                  setCollegeId(null);
                  clearDownstream("mode");
                }}
              />
              Batch-Wise Fee Structure
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="allocate-mode"
                checked={mode === "academic"}
                onChange={() => {
                  setMode("academic");
                  setCollegeId(null);
                  clearDownstream("mode");
                }}
              />
              Academic-Wise Fee Structure
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                clearDownstream("college");
              }}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingColleges}
            />
            {mode === "academic" ? (
              <Select
                label="Academic Year"
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v);
                  clearDownstream("ay");
                }}
                options={ayOptions}
                placeholder="Select academic year"
                searchable
                disabled={!collegeId}
                isLoading={loadingAy}
              />
            ) : null}
            <Select
              label="Course"
              required
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                clearDownstream("course");
              }}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!collegeId}
              isLoading={loadingCourses}
            />
            {mode === "batch" ? (
              <Select
                label="Batch"
                value={batchId}
                onChange={(v) => {
                  setBatchId(v);
                  clearDownstream("batch");
                }}
                options={batchOptions}
                placeholder="Select batch"
                searchable
                disabled={!courseId}
                isLoading={loadingBatches}
              />
            ) : null}
            <Select
              label="Quota"
              required
              value={quotaId}
              onChange={(v) => {
                setQuotaId(v);
                void loadStructures(v);
              }}
              options={quotaOptions}
              placeholder="Select quota"
              searchable
              disabled={!collegeId || !courseId}
              isLoading={loadingQuotas}
            />
          </div>
        </div>
      }
      body={
        structures.length > 0 || loadingStructures ? (
          <div className="space-y-4 px-1 pb-2">
            <p className="text-sm font-medium text-blue-700">
              Select Fee Structure :
            </p>
            {loadingStructures ? (
              <p className="text-sm text-muted-foreground">
                Loading fee structures…
              </p>
            ) : (
              <div className="grid max-w-3xl grid-cols-1 gap-2 md:grid-cols-2">
                {structures.map((s) => (
                  <label
                    key={s.feeStructureId}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={s.checked}
                      onCheckedChange={(checked) => {
                        setStructures((prev) =>
                          prev.map((row) =>
                            row.feeStructureId === s.feeStructureId
                              ? { ...row, checked: checked === true }
                              : row,
                          ),
                        );
                      }}
                    />
                    <span>{s.classGroupName}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
                disabled={saving || checkedCount === 0 || loadingStructures}
                onClick={() => void onSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
