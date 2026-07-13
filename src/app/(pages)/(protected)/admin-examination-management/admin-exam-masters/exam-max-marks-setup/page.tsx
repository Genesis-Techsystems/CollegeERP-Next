"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, GraduationCap, ScrollText } from "lucide-react";
import { useSessionContext } from "@/context/SessionContext";
import { NoticeAlert } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { GlobalFilterBarRow, GlobalFilterField } from "@/common/components/forms";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/common/components/search";
import {
  listExamMarksSetup,
  listSubjectCategories,
  saveExamMarksSetup,
  getMarksSetupFilters,
} from "@/services";
import { FilteredPage } from "@/components/layout";
import { cn } from "@/lib/utils";

/** Common control border used across this page (matches reference light outline). */
const FIELD_OUTLINE = "border border-[#e1e6ee]";
const FIELD_INPUT = "h-10 rounded-[8px] bg-card text-[12px]";
const CHECKBOX_STYLE =
  "border-[#cfd6e2] data-[state=checked]:bg-[#17a689] data-[state=checked]:border-[#17a689]";

type AnyRow = Record<string, any>;
type Notice = { type: "success" | "error"; message: string } | null;

function categoryChipClass(label: string): string {
  const value = label.toLowerCase();
  if (value.includes("special")) return "bg-[#e9f2ff] text-[#005ecb]";
  if (value.includes("lab")) return "bg-[#fff3d7] text-[#9a6400]";
  return "bg-[#e8fbf8] text-primary";
}

export default function ExamMaxMarksSetupPage() {
  const { user } = useSessionContext();
  const orgId = useMemo(() => {
    const fromStorage = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const fromSession = Number(user?.organizationId ?? 0);
    return fromStorage || fromSession || 1;
  }, [user?.organizationId]);
  const empId = useMemo(() => {
    const fromStorage = Number(
      globalThis.localStorage?.getItem("employeeId") ?? 0,
    );
    const fromSession = Number(user?.employeeId ?? 0);
    return fromStorage || fromSession || 31754;
  }, [user?.employeeId]);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [regFilterData, setRegFilterData] = useState<AnyRow[]>([]);
  const [subjectCats, setSubjectCats] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [isForDisabled, setIsForDisabled] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    async function loadBase() {
      const [filtersResult, cats] = await Promise.all([
        getMarksSetupFilters(orgId, empId).catch(() => ({
          filtersData: [],
          regulationData: [],
        })),
        listSubjectCategories().catch(() => []),
      ]);
      setFiltersData(
        Array.isArray(filtersResult.filtersData)
          ? filtersResult.filtersData
          : [],
      );
      setRegFilterData(
        Array.isArray(filtersResult.regulationData)
          ? filtersResult.regulationData
          : [],
      );
      setSubjectCats(Array.isArray(cats) ? cats : []);
    }
    loadBase();
  }, [orgId, empId]);

  const universities = useMemo(
    () => dedupe(filtersData, "fk_university_id"),
    [filtersData],
  );
  const courses = useMemo(
    () =>
      dedupe(
        filtersData.filter(
          (x) => Number(x.fk_university_id) === Number(universityId),
        ),
        "fk_course_id",
      ),
    [filtersData, universityId],
  );

  useEffect(() => {
    if (universities[0]?.fk_university_id)
      setUniversityId(Number(universities[0].fk_university_id));
  }, [universities]);

  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id));
    else setCourseId(null);
    setRegulationId(null);
    setRegulations([]);
    setRows([]);
  }, [courses]);

  useEffect(() => {
    setRegulations([]);
    setRegulationId(null);
    setRows([]);
    if (!courseId || !universityId) return;

    const raw = regFilterData.filter(
      (r) =>
        Number(r.fk_university_id) === Number(universityId) &&
        Number(r.fk_course_id) === Number(courseId),
    );

    const seen = new Set<number>();
    const regs: AnyRow[] = [];
    for (const r of raw) {
      const id = Number(r.fk_regulation_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      regs.push({
        regulationId: id,
        regulationCode: r.regulation_code ?? r.regulationCode ?? "",
      });
    }

    setRegulations(regs);
    if (regs[0]?.regulationId) setRegulationId(Number(regs[0].regulationId));
  }, [courseId, universityId, regFilterData]);

  async function getDetails() {
    setRows([]);
    if (!courseId || !regulationId) return;
    setLoading(true);
    const data = await listExamMarksSetup(
      courseId,
      regulationId,
      isForDisabled,
    ).catch(() => []);
    const existing = Array.isArray(data) ? data : [];

    const byCat = new Map<number, AnyRow>();
    for (const r of existing as AnyRow[]) {
      const key = Number(
        r.subjectCategoryCatDetId ?? r.subjectCategory?.generalDetailId ?? 0,
      );
      if (key) byCat.set(key, r);
    }

    const merged = subjectCats.map((cat) => {
      const key = Number(cat.generalDetailId);
      const r = byCat.get(key);
      return {
        marksSetupId: r?.marksSetupId ?? null,
        subjectCategoryCatDetId: key,
        subjectCategoryCode:
          r?.subjectCategoryCode ?? cat.generalDetailCode ?? "",
        marksSetupName:
          r?.marksSetupName ??
          cat.generalDetailDisplayName ??
          cat.generalDetailCode ??
          "",
        internalMarks: Number(r?.internalMarks ?? 0),
        externalMarks: Number(r?.externalMarks ?? 0),
        passPercentage: Number(r?.passPercentage ?? 0),
        externalPassPercentage: Number(r?.externalPassPercentage ?? 0),
        finalIntPercentage: Number(r?.finalIntPercentage ?? 0),
        finalExtPercentage: Number(r?.finalExtPercentage ?? 0),
        isActive: r?.isActive ?? true,
      };
    });
    setRows(merged);
    setLoading(false);
  }

  function updateRow(idx: number, field: string, value: number) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, [field]: Number.isFinite(value) ? value : 0 } : r,
      ),
    );
  }

  function updateRowText(idx: number, field: string, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  function updateRowBool(idx: number, field: string, value: boolean) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.subjectCategoryCode ?? ""} ${r.marksSetupName ?? ""}`
        .toLowerCase()
        .includes(s),
    );
  }, [rows, q]);

  async function save() {
    if (!universityId || !courseId || !regulationId || rows.length === 0)
      return;
    setNotice(null);
    const payload = rows.map((r) => ({
      marksSetupId: r.marksSetupId ?? undefined,
      subjectCategoryCatDetId: r.subjectCategoryCatDetId,
      marksSetupName: r.marksSetupName,
      internalMarks: Number(r.internalMarks ?? 0),
      externalMarks: Number(r.externalMarks ?? 0),
      passPercentage: Number(r.passPercentage ?? 0),
      externalPassPercentage: Number(r.externalPassPercentage ?? 0),
      finalIntPercentage: Number(r.finalIntPercentage ?? 0),
      finalExtPercentage: Number(r.finalExtPercentage ?? 0),
      disabled: isForDisabled,
      isActive: r.isActive ?? true,
      courseId,
      regulationId,
    }));
    const res = await saveExamMarksSetup(payload).catch(() => ({
      success: false,
      message: "Save failed",
    }));
    if ((res as any)?.success === false) {
      setNotice({
        type: "error",
        message: (res as any)?.message ?? "Save failed",
      });
      return;
    }
    setNotice({ type: "success", message: (res as any)?.message ?? "Saved" });
    await getDetails();
  }

  return (
    <FilteredPage
      title="Exam Marks Setup"
      notice={
        notice ? (
          <NoticeAlert
            type={notice.type}
            title={notice.message}
            showIcon
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[12px]"
                onClick={() => setNotice(null)}
              >
                Close
              </Button>
            }
          />
        ) : null
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="University" icon={Building2}>
            <Select
              className="[&_button[role='combobox']]:h-9 [&_button[role='combobox']]:text-[13px]"
              value={universityId ? String(universityId) : null}
              onChange={(v) => setUniversityId(v ? Number(v) : null)}
              options={universities.map((u, i) => ({
                value: String(u.fk_university_id ?? i),
                label: String(u.university_code ?? u.university_name ?? ""),
              }))}
              placeholder="Select university"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course" icon={GraduationCap}>
            <Select
              className="[&_button[role='combobox']]:h-9 [&_button[role='combobox']]:text-[13px]"
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((c, i) => ({
                value: String(c.fk_course_id ?? i),
                label: String(c.course_code ?? c.course_name ?? ""),
              }))}
              placeholder="Select course"
              searchable
              disabled={courses.length === 0}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation" icon={ScrollText}>
            <Select
              className="[&_button[role='combobox']]:h-9 [&_button[role='combobox']]:text-[13px]"
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulations.map((r, i) => ({
                value: String(r.regulationId ?? i),
                label: String(r.regulationCode ?? r.regulation_code ?? ""),
              }))}
              placeholder="Select regulation"
              searchable
              disabled={regulations.length === 0}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Disability">
            <div className="flex h-9 items-center gap-2">
              <Checkbox
                id="disabled"
                className={CHECKBOX_STYLE}
                checked={isForDisabled}
                onCheckedChange={(v) => setIsForDisabled(Boolean(v))}
              />
              <Label
                htmlFor="disabled"
                className="cursor-pointer whitespace-nowrap text-[13px] font-medium"
              >
                Is For Disability
              </Label>
            </div>
          </GlobalFilterField>
          <div className="global-filter-field flex items-end">
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              onClick={getDetails}
              disabled={!courseId || !regulationId || loading}
            >
              {loading ? "Loading…" : "Get List"}
            </Button>
          </div>
        </GlobalFilterBarRow>
      }
      body={
        rows.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
              Marks Setup
            </h3>
            <SearchInput
              className="w-full max-w-md"
              placeholder="Search by category code or marks setup name…"
              value={q}
              onChange={setQ}
            />
            <div className="space-y-2">
              {filteredRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-[13px] text-muted-foreground">
                  No data found matching the selected filters.
                </div>
              ) : null}
              {filteredRows.map((r, i) => (
                <div
                  key={`m-${r.subjectCategoryCatDetId}-${i}`}
                  className="rounded-xl border border-[#dde3ec] overflow-hidden bg-card"
                >
                  <div className="px-4 py-2 border-b border-[#e8ecf2] bg-[#f8f8f4]">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold",
                        categoryChipClass(
                          String(r.subjectCategoryCode || r.marksSetupName || ""),
                        ),
                      )}
                    >
                      {r.subjectCategoryCode || r.marksSetupName}
                    </span>
                  </div>
                  <div className="px-4 py-3 overflow-x-auto">
                    <div className="min-w-[920px]">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-[hsl(var(--foreground))]">
                        <span>Marks Setup Name</span>
                        <span>Internal</span>
                        <span>External</span>
                        <span>Ext. Pass %</span>
                        <span>Pass %</span>
                        <span>Final Int. %</span>
                        <span>Final Ext. %</span>
                        <span>Active</span>
                      </div>
                      <div className="mt-2 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 items-center">
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          value={r.marksSetupName}
                          onChange={(e) =>
                            updateRowText(i, "marksSetupName", e.target.value)
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.internalMarks}
                          onChange={(e) =>
                            updateRow(i, "internalMarks", Number(e.target.value))
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.externalMarks}
                          onChange={(e) =>
                            updateRow(i, "externalMarks", Number(e.target.value))
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.externalPassPercentage}
                          onChange={(e) =>
                            updateRow(
                              i,
                              "externalPassPercentage",
                              Number(e.target.value),
                            )
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.passPercentage}
                          onChange={(e) =>
                            updateRow(i, "passPercentage", Number(e.target.value))
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.finalIntPercentage}
                          onChange={(e) =>
                            updateRow(
                              i,
                              "finalIntPercentage",
                              Number(e.target.value),
                            )
                          }
                        />
                        <Input
                          className={cn(FIELD_INPUT, FIELD_OUTLINE)}
                          type="number"
                          value={r.finalExtPercentage}
                          onChange={(e) =>
                            updateRow(
                              i,
                              "finalExtPercentage",
                              Number(e.target.value),
                            )
                          }
                        />
                        <div className="h-10 flex items-center justify-center">
                          <Checkbox
                            id={`active-${i}`}
                            className={CHECKBOX_STYLE}
                            checked={!!r.isActive}
                            onCheckedChange={(v) =>
                              updateRowBool(i, "isActive", Boolean(v))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                className={cn("h-8 text-[12px]", FIELD_OUTLINE)}
                onClick={save}
                disabled={rows.length === 0}
              >
                Save
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}

function dedupe<T extends Record<string, any>>(arr: T[], key: string): T[] {
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
