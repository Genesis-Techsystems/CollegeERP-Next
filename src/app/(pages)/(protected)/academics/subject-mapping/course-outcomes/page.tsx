"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Plus } from "lucide-react";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createProgramOutcome,
  getDigitalOnlineSyncFilters,
  listProgramOutcomeCategoryDetails,
} from "@/services";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
const pickText = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};

export default function CourseOutcomesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [coCode, setCoCode] = useState("");
  const [coCategory, setCoCategory] = useState<string | null>(null);
  const [coCredits, setCoCredits] = useState("");
  const [coDescription, setCoDescription] = useState("");
  const [coActive, setCoActive] = useState(true);
  const [coReason, setCoReason] = useState("");
  const [formErrors, setFormErrors] = useState<
    Partial<
      Record<"code" | "category" | "credits" | "description" | "reason", string>
    >
  >({});
  const [poCategoryRows, setPoCategoryRows] = useState<AnyRow[]>([]);
  const [saving, setSaving] = useState(false);

  function clearFieldError(field: keyof typeof formErrors) {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, []);

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
        ?.fk_university_id,
    );
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    ).sort((a, b) =>
      String(b.academic_year ?? "").localeCompare(
        String(a.academic_year ?? ""),
      ),
    );
  }, [academicData, filtersData, collegeId]);
  // Program Outcome category options. Value = generalDetailId (sent as
  // `prgoutcomeCatdetId` on save, mirroring the Angular modal), label =
  // generalDetailDisplayName.
  const poCategoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return poCategoryRows
      .map((row) => {
        const value = String(
          n(row.generalDetailId ?? row.general_detail_id ?? row.id),
        );
        const label = pickText(row, [
          "generalDetailDisplayName",
          "general_detail_display_name",
          "generalDetailName",
          "general_detail_name",
          "generalDetail",
          "detailName",
          "name",
          "label",
        ]);
        return value !== "0" && label ? { value, label } : null;
      })
      .filter((x): x is { value: string; label: string } => Boolean(x))
      .filter((opt) => {
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
  }, [poCategoryRows]);
  const tableColumns = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: "code", headerName: "Code", minWidth: 120 },
      {
        field: "category",
        headerName: "Program Outcomes Category",
        minWidth: 220,
        flex: 1,
      },
      {
        field: "description",
        headerName: "Description",
        minWidth: 260,
        flex: 1,
      },
      { field: "credits", headerName: "Credits", width: 100, flex: 0 },
      { field: "actions", headerName: "Actions", width: 120, flex: 0 },
    ],
    [],
  );
  const tableRows = useMemo<AnyRow[]>(() => [], []);

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setAcademicYearId(null);
  }, [collegeId]);
  // Keep Academic Year empty by default; user must choose explicitly.

  useEffect(() => {
    listProgramOutcomeCategoryDetails()
      .then((rows) => setPoCategoryRows(Array.isArray(rows) ? rows : []))
      .catch(() => setPoCategoryRows([]));
  }, []);

  function resetAddForm() {
    setCoCode("");
    setCoCategory(null);
    setCoCredits("");
    setCoDescription("");
    setCoActive(true);
    setCoReason("");
    setFormErrors({});
  }

  function onOpenAddModal() {
    resetAddForm();
    setAddOpen(true);
  }

  async function onSaveAdd(e: { preventDefault: () => void }) {
    e.preventDefault();
    // Mirrors the Angular ProgramOutcomesModal submit + parent addDetails('CmProgramOutcome').
    // Required fields (Angular form validators + UI asterisks): category, code, credits, description.
    const prgoutcomeCatdetId = n(coCategory);
    if (!collegeId || !academicYearId) {
      toastError("Select College and Academic Year first", "Validation");
      return;
    }
    const nextErrors: typeof formErrors = {};
    if (!coCode.trim()) nextErrors.code = "Code is required";
    if (!prgoutcomeCatdetId)
      nextErrors.category = "Program Outcomes Category is required";
    if (!coCredits.trim()) nextErrors.credits = "Credits is required";
    if (!coDescription.trim())
      nextErrors.description = "Description is required";
    if (!coActive && !coReason.trim()) nextErrors.reason = "Reason is required";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      prgoutcomeCatdetId,
      collegeId,
      academicYearId,
      code: coCode.trim(),
      description: coDescription.trim(),
      credits: coCredits.trim(),
      isActive: coActive,
      reason: coActive ? "active" : coReason.trim(),
    };
    try {
      setSaving(true);
      await createProgramOutcome(payload);
      toastSuccess("Program outcome added successfully");
      setAddOpen(false);
      resetAddForm();
    } catch (error) {
      toastError(error, "Failed to add program outcome");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FilteredListPage
        title="Course Outcomes"
        filters={
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
              className="md:col-span-2"
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({
                value: String(n(x.fk_academic_year_id)),
                label: s(x.academic_year),
              }))}
              searchable
              className="md:col-span-2"
            />
          </div>
        }
        rowData={academicYearId ? tableRows : []}
        columnDefs={tableColumns}
        loading={false}
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        toolbarTrailing={
          <Button
            type="button"
            className="h-[30px] rounded-full px-4 text-xs inline-flex items-center gap-1"
            onClick={onOpenAddModal}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Program Outcomes
          </Button>
        }
        pagination
      />
      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Program Outcomes"
        titleClassName="text-left text-primary"
        onSubmit={onSaveAdd}
        isSubmitting={saving}
        submitLabel="Save"
        cancelLabel="Cancel"
        size="xl"
        contentClassName="sm:max-w-4xl max-h-none overflow-visible"
        formClassName="space-y-5 py-1"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-y-1">
              <div className="text-foreground">College :</div>
              <div className="font-semibold text-primary">
                {s(
                  colleges.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
                    ?.college_code,
                )}
                {academicYearId
                  ? ` / ${s(academicYears.find((x) => n(x.fk_academic_year_id) === academicYearId)?.academic_year)}`
                  : ""}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Code"
              required
              htmlFor="co-code"
              error={formErrors.code}
            >
              <Input
                id="co-code"
                value={coCode}
                onChange={(e) => {
                  clearFieldError("code");
                  setCoCode(e.target.value);
                }}
                placeholder="Enter code"
              />
            </FormField>
            <Select
              label="Program Outcomes Category"
              required
              value={coCategory}
              onChange={(v) => {
                clearFieldError("category");
                setCoCategory(v);
              }}
              options={poCategoryOptions}
              placeholder="Select category"
              searchable
              error={formErrors.category}
            />
            <FormField
              label="Credits"
              required
              htmlFor="co-credits"
              error={formErrors.credits}
            >
              <Input
                id="co-credits"
                value={coCredits}
                onChange={(e) => {
                  clearFieldError("credits");
                  setCoCredits(e.target.value);
                }}
                placeholder="Enter credits"
              />
            </FormField>
          </div>
          <FormField
            label="Description"
            required
            htmlFor="co-description"
            error={formErrors.description}
          >
            <Textarea
              id="co-description"
              value={coDescription}
              onChange={(e) => {
                clearFieldError("description");
                setCoDescription(e.target.value);
              }}
              placeholder="Enter description"
              rows={3}
              className="min-h-[80px] resize-none"
            />
          </FormField>
          <ActiveStatusField
            isActive={coActive}
            reason={coReason}
            onActiveChange={(v) => {
              clearFieldError("reason");
              setCoActive(v === true);
            }}
            onReasonChange={(v) => {
              clearFieldError("reason");
              setCoReason(v);
            }}
            reasonRequired={!coActive}
            reasonError={formErrors.reason}
          />
        </div>
      </FormModal>
    </>
  );
}
