"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown, Plus, Trash2Icon } from "lucide-react";
import { ConfirmDialog } from "@/common/components/feedback";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  addFeeSchStructures,
  getFeeSchStructureById,
  listCourseYearsForFeeStructure,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  listScholarshipTypesByUniversity,
  updateFeeSchStructures,
} from "@/services";
import type { FeeCategory } from "@/types/fee-category";
import type { FeeParticular } from "@/types/fee-particular";
import type { FeeStructureCourseYearTab } from "@/types/fee-structure";
import type {
  FeeSchStructureBulkPayload,
  FeeSchStructureParticularLine,
  ScholarshipType,
} from "@/types/scholarship";

type FormMode = "add" | "edit";

export type ScholarshipValueFormQuery = {
  universityId?: string;
  collegeId?: string;
  courseId?: string;
  batchId?: string;
  academicYearId?: string;
  feeSchStructureId?: string;
  isAcademicScholarship?: string;
};

type YearTab = Omit<FeeStructureCourseYearTab, "particulars"> & {
  particulars: FeeSchStructureParticularLine[];
};

type ParticularDraft = {
  feeCategoryId: number | null;
  feeParticularsId: number | null;
  scholarshipAmount: number | "";
};

function emptyDraft(): ParticularDraft {
  return {
    feeCategoryId: null,
    feeParticularsId: null,
    scholarshipAmount: 0,
  };
}

const PARTICULAR_COLS = {
  siNo: {
    headerName: "SNo",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeSchStructureParticularLine>,
  categoryName: {
    field: "categoryName",
    headerName: "Category",
    minWidth: 140,
  } as ColDef<FeeSchStructureParticularLine>,
  particularName: {
    field: "particularName",
    headerName: "Particular",
    minWidth: 160,
  } as ColDef<FeeSchStructureParticularLine>,
  scholarshipAmount: {
    field: "scholarshipAmount",
    headerName: "Scholarship Amount",
    minWidth: 140,
  } as ColDef<FeeSchStructureParticularLine>,
  actions: {
    headerName: "Actions",
    minWidth: 80,
    width: 80,
    flex: 0,
  } as ColDef<FeeSchStructureParticularLine>,
};

function makeDeleteRenderer(onDelete: (index: number) => void) {
  return (p: ICellRendererParams<FeeSchStructureParticularLine>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-destructive"
      aria-label="Remove particular"
      onClick={() => onDelete(p.node?.rowIndex ?? -1)}
    >
      <Trash2Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

type Props = {
  mode: FormMode;
  title: string;
  initialQuery: ScholarshipValueFormQuery;
};

export function ScholarshipValueForm({ mode, title, initialQuery }: Props) {
  const router = useRouter();

  const universityId = Number(initialQuery.universityId ?? 0) || 0;
  const collegeId = Number(initialQuery.collegeId ?? 0) || 0;
  const courseId = Number(initialQuery.courseId ?? 0) || 0;
  const batchId = Number(initialQuery.batchId ?? 0) || 0;
  const academicYearId = Number(initialQuery.academicYearId ?? 0) || 0;
  const feeSchStructureId = Number(initialQuery.feeSchStructureId ?? 0) || 0;
  const isAcademicScholarship = initialQuery.isAcademicScholarship === "true";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scholarshipTypes, setScholarshipTypes] = useState<ScholarshipType[]>(
    [],
  );
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [feeParticulars, setFeeParticulars] = useState<FeeParticular[]>([]);
  const [courseYearsDataList, setCourseYearsDataList] = useState<YearTab[]>([]);

  const [scholarshipTypeId, setScholarshipTypeId] = useState<number | null>(
    null,
  );
  const [scholarshipAmount, setScholarshipAmount] = useState<number | "">("");
  const [scholarshipTypeDesc, setScholarshipTypeDesc] = useState("");
  const [isLateral, setIsLateral] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("");
  const [draftByYear, setDraftByYear] = useState<
    Record<number, ParticularDraft>
  >({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{
    yearId: number;
    index: number;
  } | null>(null);

  const scholarshipTypeOptions = useMemo(
    () =>
      scholarshipTypes.map((t) => ({
        value: String(t.scholarshipTypeId),
        label: t.scholarshipTypeCode || String(t.scholarshipTypeId),
      })),
    [scholarshipTypes],
  );

  const categoryOptions = useMemo(
    () =>
      [...feeCategories]
        .sort((a, b) =>
          String(a.categoryName ?? "").localeCompare(
            String(b.categoryName ?? ""),
          ),
        )
        .map((c) => ({
          value: String(c.feeCategoryId),
          label: c.categoryName || String(c.feeCategoryId),
        })),
    [feeCategories],
  );

  const particularOptions = useMemo(
    () =>
      feeParticulars.map((p) => ({
        value: String(p.feeParticularsId),
        label: p.particularsName || String(p.feeParticularsId),
      })),
    [feeParticulars],
  );

  async function loadCourseYears(
    lateral: boolean,
    existing: FeeSchStructureParticularLine[] = [],
  ) {
    if (!courseId) {
      setCourseYearsDataList([]);
      return;
    }
    const tabs = await listCourseYearsForFeeStructure(courseId, lateral);
    const yearTabs: YearTab[] = tabs.map((tab) => {
      const particulars = existing.filter(
        (p) =>
          Number(p.courseYearId ?? 0) === tab.courseYearId &&
          p.isActive !== false,
      );
      return { ...tab, particulars };
    });
    setCourseYearsDataList(yearTabs);
    setActiveTab(yearTabs[0] ? String(yearTabs[0].courseYearId) : "");
    setDraftByYear((prev) => {
      const next = { ...prev };
      for (const tab of yearTabs) {
        if (!next[tab.courseYearId]) next[tab.courseYearId] = emptyDraft();
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!universityId || !collegeId || !courseId) {
        toastInfo("Missing college / course context");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [types, categories, particulars] = await Promise.all([
          listScholarshipTypesByUniversity(universityId),
          listFeeCategoriesByCollege(collegeId),
          listFeeParticularsByCollege(collegeId),
        ]);
        if (cancelled) return;
        setScholarshipTypes(types);
        setFeeCategories(categories);
        setFeeParticulars(particulars);

        if (mode === "edit" && feeSchStructureId) {
          const structure = await getFeeSchStructureById(feeSchStructureId);
          if (cancelled) return;
          if (!structure) {
            toastInfo("Scholarship structure not found");
            setLoading(false);
            return;
          }
          setScholarshipTypeId(structure.scholarshipTypeId ?? null);
          setScholarshipAmount(
            structure.scholarshipAmount != null
              ? Number(structure.scholarshipAmount)
              : "",
          );
          setScholarshipTypeDesc(
            structure.scholarshipTypeDesc || structure.scholarshipType || "",
          );
          const lateral = Boolean(
            structure.isLateral ?? structure.isForLateral,
          );
          setIsLateral(lateral);
          await loadCourseYears(
            lateral,
            structure.feeSchStructureParticularsDTOS ?? [],
          );
        }
        // Add mode: Angular loads course years only after scholarship type is selected.
      } catch (err) {
        toastError(err, "Failed to load form data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot from query once
  }, [mode, universityId, collegeId, courseId, feeSchStructureId]);

  async function onLateralChange(checked: boolean) {
    setIsLateral(checked);
    setLoading(true);
    try {
      const existing = courseYearsDataList.flatMap((t) => t.particulars);
      await loadCourseYears(checked, existing);
    } catch (err) {
      toastError(err, "Failed to reload course years");
    } finally {
      setLoading(false);
    }
  }

  async function onScholarshipTypeChange(value: string | null) {
    const next = value ? Number(value) : null;
    setScholarshipTypeId(next);
    if (mode === "add") {
      setLoading(true);
      try {
        await loadCourseYears(isLateral, []);
      } catch (err) {
        toastError(err, "Failed to load course years");
      } finally {
        setLoading(false);
      }
    }
  }

  function updateDraft(yearId: number, patch: Partial<ParticularDraft>) {
    setDraftByYear((prev) => ({
      ...prev,
      [yearId]: { ...(prev[yearId] ?? emptyDraft()), ...patch },
    }));
  }

  function clearDraft(yearId: number) {
    updateDraft(yearId, emptyDraft());
  }

  function addParticular(yearId: number) {
    const draft = draftByYear[yearId] ?? emptyDraft();
    if (!draft.feeCategoryId || !draft.feeParticularsId) {
      toastInfo("Select fee category and particular");
      return;
    }
    const amount =
      draft.scholarshipAmount === "" ? 0 : Number(draft.scholarshipAmount);
    if (!Number.isFinite(amount)) {
      toastInfo("Enter a valid scholarship amount");
      return;
    }
    const categoryName =
      feeCategories.find((c) => c.feeCategoryId === draft.feeCategoryId)
        ?.categoryName ?? "";
    const particularName =
      feeParticulars.find((p) => p.feeParticularsId === draft.feeParticularsId)
        ?.particularsName ?? "";

    setCourseYearsDataList((prev) =>
      prev.map((tab) => {
        if (tab.courseYearId !== yearId) return tab;
        return {
          ...tab,
          particulars: [
            ...tab.particulars,
            {
              feeCategoryId: draft.feeCategoryId!,
              feeParticularsId: draft.feeParticularsId!,
              scholarshipAmount: amount,
              isActive: true,
              categoryName,
              particularName,
              courseYearId: yearId,
            },
          ],
        };
      }),
    );
    clearDraft(yearId);
  }

  function deleteParticular(yearId: number, index: number) {
    if (index < 0) return;
    setCourseYearsDataList((prev) =>
      prev.map((tab) => {
        if (tab.courseYearId !== yearId) return tab;
        const active = tab.particulars.filter((p) => p.isActive !== false);
        const target = active[index];
        if (!target) return tab;
        if (mode === "edit") {
          return {
            ...tab,
            particulars: tab.particulars.map((line) =>
              line === target ? { ...line, isActive: false } : line,
            ),
          };
        }
        return {
          ...tab,
          particulars: tab.particulars.filter((line) => line !== target),
        };
      }),
    );
    setConfirmDelete(null);
  }

  function goBack() {
    const qs = new URLSearchParams({
      collegeId: String(collegeId),
      courseId: String(courseId),
      isAcademicScholarship: String(isAcademicScholarship),
    });
    if (isAcademicScholarship) {
      qs.set("academicYearId", String(academicYearId));
    } else {
      qs.set("batchId", String(batchId));
    }
    router.push(`/scholarship-management/scholarship-value?${qs.toString()}`);
  }

  async function onSave() {
    if (!scholarshipTypeId) {
      toastInfo("Select scholarship type");
      return;
    }
    if (
      scholarshipAmount === "" ||
      !Number.isFinite(Number(scholarshipAmount))
    ) {
      toastInfo("Enter scholarship amount");
      return;
    }
    if (!isAcademicScholarship && !batchId) {
      toastInfo("Missing batch context");
      return;
    }
    if (isAcademicScholarship && !academicYearId) {
      toastInfo("Missing academic year context");
      return;
    }

    // Angular builds particulars from every course-year tab, then posts
    // firstFormGroup.value + feeSchStructureParticularsDTOS + isAcademicScholarship.
    const particulars: FeeSchStructureParticularLine[] = [];
    courseYearsDataList.forEach((tab) => {
      tab.particulars.forEach((line) => {
        particulars.push({
          ...line,
          collegeId,
          courseYearId: tab.courseYearId,
          courseYearName: tab.courseYearName,
          feeLabel: tab.feeLabel,
          isActive: line.isActive !== false,
        });
      });
    });

    const activeCount = particulars.filter((p) => p.isActive !== false).length;
    if (activeCount === 0) {
      toastInfo("Add atleast one course year and particular.");
      return;
    }

    const payload: FeeSchStructureBulkPayload = {
      ...(mode === "edit" && feeSchStructureId ? { feeSchStructureId } : {}),
      collegeId,
      courseId,
      batchId: isAcademicScholarship ? null : batchId,
      academicYearId: isAcademicScholarship ? academicYearId : null,
      scholarshipTypeId,
      scholarshipAmount: Number(scholarshipAmount),
      scholarshipType: scholarshipTypeDesc.trim() || undefined,
      isLateral,
      isActive: true,
      isAcademicScholarship,
      feeSchStructureParticularsDTOS: particulars,
    };

    setSaving(true);
    try {
      const result =
        mode === "edit"
          ? await updateFeeSchStructures(payload)
          : await addFeeSchStructures([payload]);

      if (result.success) {
        toastSuccess(result.message || "Saved successfully");
        goBack();
        return;
      }
      // Angular: 422 → error toast, other failures → info toast.
      if (result.statusCode === 422) {
        toastError(new Error(result.message || "Save failed"), result.message);
      } else {
        toastInfo(result.message || "Save did not complete");
      }
    } catch (err) {
      toastError(err, getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredListPage
      title={title}
      filtersCollapsible={false}
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Scholarship Type *">
            <Select
              value={scholarshipTypeId ? String(scholarshipTypeId) : null}
              onChange={(v) => void onScholarshipTypeChange(v)}
              options={scholarshipTypeOptions}
              placeholder="Select type"
              searchable
              isLoading={loading}
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Scholarship Amount *">
            <Input
              type="number"
              value={scholarshipAmount}
              onChange={(e) =>
                setScholarshipAmount(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Scholarship Type Description">
            <Input
              value={scholarshipTypeDesc}
              onChange={(e) => setScholarshipTypeDesc(e.target.value)}
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--shrink global-filter-field--action"
          >
            <label className="inline-flex h-9 items-center gap-2 text-sm">
              <Checkbox
                id="is-lateral"
                checked={isLateral}
                onCheckedChange={(checked) =>
                  void onLateralChange(checked === true)
                }
                disabled={loading}
              />
              <span>Is For Lateral</span>
            </label>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        courseYearsDataList.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              Select Scholarship Structure course years
            </h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex h-auto flex-wrap justify-start gap-1">
                {courseYearsDataList.map((tab) => (
                  <TabsTrigger
                    key={tab.courseYearId}
                    value={String(tab.courseYearId)}
                  >
                    {tab.feeLabel || tab.courseYearName || `Year ${tab.yearNo}`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {courseYearsDataList.map((tab) => {
                const draft = draftByYear[tab.courseYearId] ?? emptyDraft();
                const activeParticulars = tab.particulars.filter(
                  (p) => p.isActive !== false,
                );
                const columns: ColDef<FeeSchStructureParticularLine>[] = [
                  PARTICULAR_COLS.siNo,
                  PARTICULAR_COLS.categoryName,
                  PARTICULAR_COLS.particularName,
                  PARTICULAR_COLS.scholarshipAmount,
                  {
                    ...PARTICULAR_COLS.actions,
                    cellRenderer: makeDeleteRenderer((index) =>
                      setConfirmDelete({
                        yearId: tab.courseYearId,
                        index,
                      }),
                    ),
                  },
                ];

                return (
                  <TabsContent
                    key={tab.courseYearId}
                    value={String(tab.courseYearId)}
                    className="space-y-4"
                  >
                    <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Category &amp; Particulars
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2">
                          <GlobalFilterBarRow>
                            <GlobalFilterField label="Fee Category">
                              <Select
                                value={
                                  draft.feeCategoryId
                                    ? String(draft.feeCategoryId)
                                    : null
                                }
                                onChange={(v) =>
                                  updateDraft(tab.courseYearId, {
                                    feeCategoryId: v ? Number(v) : null,
                                  })
                                }
                                options={categoryOptions}
                                placeholder="Select category"
                                searchable
                              />
                            </GlobalFilterField>
                            <GlobalFilterField label="Fee Particular">
                              <Select
                                value={
                                  draft.feeParticularsId
                                    ? String(draft.feeParticularsId)
                                    : null
                                }
                                onChange={(v) =>
                                  updateDraft(tab.courseYearId, {
                                    feeParticularsId: v ? Number(v) : null,
                                  })
                                }
                                options={particularOptions}
                                placeholder="Select particular"
                                searchable
                              />
                            </GlobalFilterField>
                            <GlobalFilterField label="ScholarShip Amount">
                              <Input
                                type="number"
                                value={draft.scholarshipAmount}
                                onChange={(e) =>
                                  updateDraft(tab.courseYearId, {
                                    scholarshipAmount:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  })
                                }
                              />
                            </GlobalFilterField>
                            <GlobalFilterField
                              label=" "
                              className="global-filter-field--shrink global-filter-field--action"
                            >
                              <div className="flex h-9 items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => clearDraft(tab.courseYearId)}
                                >
                                  Clear
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    addParticular(tab.courseYearId)
                                  }
                                >
                                  Add
                                </Button>
                              </div>
                            </GlobalFilterField>
                          </GlobalFilterBarRow>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <DataTable
                      title={`${tab.feeLabel || tab.courseYearName} Particulars`}
                      rowData={activeParticulars}
                      columnDefs={columns}
                      pagination={false}
                      height="280px"
                      bordered={false}
                      toolbar={false}
                      columnFilters={false}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        ) : null
      }
    >
      {/* Angular form-btn: outside card, yellow Back + navy Save, right-aligned.
          Plain <button> for Back — shared Button+[data-app-back] CSS forces white. */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="app-control inline-flex min-w-[80px] cursor-pointer items-center justify-center rounded-[5px] border-0 bg-[#f0ad4e] px-3 py-1 text-[length:var(--app-control-font-size)] font-medium text-black hover:bg-[#ec9c2c] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          onClick={goBack}
          disabled={saving}
        >
          Back
        </button>
        <Button
          type="button"
          size="sm"
          className="!bg-[#0a2e67] !text-white hover:!bg-[#082653]"
          onClick={() => void onSave()}
          disabled={loading || saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete != null}
        title="Remove particular?"
        description="This particular will be removed from the scholarship structure."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete) {
            deleteParticular(confirmDelete.yearId, confirmDelete.index);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </FilteredListPage>
  );
}
