"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown, Plus, Trash2Icon } from "lucide-react";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GM_CODES } from "@/config/constants/ui";
import { useSession } from "@/hooks/useSession";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { listCourseGroupsByCourse } from "@/services";
import {
  createCollegeFeeStructure,
  getCollegeFeeStructureById,
  getFeeMasterCollegeFilters,
  listCourseYearsForFeeStructure,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  listQuotaOptions,
} from "@/services";
import type { FeeCategory } from "@/types/fee-category";
import type { FeeParticular } from "@/types/fee-particular";
import type {
  CollegeFeeStructureCreatePayload,
  CollegeFeeStructureRow,
  FeeStructureCourseGroupSelection,
  FeeStructureCourseYearTab,
  FeeStructureParticularLine,
} from "@/types/fee-structure";
import {
  academicYearOption,
  batchOption,
  collegeOption,
  courseOption,
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourses,
  pickNum,
  pickText,
  type FilterRow,
} from "../_lib/fee-master-filters";
import { FeeStructurePreviewModal } from "./FeeStructurePreviewModal";

type FormMode = "add" | "edit";

type CourseGroupRow = FeeStructureCourseGroupSelection & {
  groupCode?: string;
  checked?: boolean;
};

type ParticularDraft = {
  feeCategoryId: number | null;
  feeParticularsId: number | null;
  feeAmount: number;
  priority: number;
  lateralFeeAmount: number;
};

type InitialQuery = {
  cId?: string;
  aId?: string;
  courseId?: string;
  batchId?: string;
  isAcademicFee?: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Particular line dates — Angular sends `YYYY-MM-DD` (no time). */
function toFeeDateYmd(value: Date | string | null | undefined): string {
  const d =
    value instanceof Date
      ? value
      : value
        ? new Date(String(value))
        : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  const y = safe.getFullYear();
  const m = String(safe.getMonth() + 1).padStart(2, "0");
  const day = String(safe.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Structure-level active dates — Angular keeps ISO midnight. */
function toFeeDateIsoMidnight(value: Date | string | null | undefined): string {
  return `${toFeeDateYmd(value)}T00:00:00.000Z`;
}

function particularDisplayName(row: FeeStructureParticularLine): string {
  return String(row.particularsName ?? row.particularName ?? "").trim();
}

function normalizeParticularLine(
  p: FeeStructureParticularLine,
): FeeStructureParticularLine {
  const name = particularDisplayName(p);
  return {
    ...p,
    particularName: name || undefined,
    particularsName: name || String(p.particularsName ?? ""),
  };
}

function emptyDraft(): ParticularDraft {
  return {
    feeCategoryId: null,
    feeParticularsId: null,
    feeAmount: 0,
    priority: 0,
    lateralFeeAmount: 0,
  };
}

type ParticularTableRow = FeeStructureParticularLine & { __index: number };

const PARTICULAR_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ParticularTableRow>,
  category: {
    headerName: "Fee Category",
    minWidth: 140,
    valueGetter: (p) => String(p.data?.categoryName ?? "—"),
  } as ColDef<ParticularTableRow>,
  particular: {
    headerName: "Fee Particular",
    minWidth: 160,
    valueGetter: (p) => (p.data ? particularDisplayName(p.data) || "—" : "—"),
  } as ColDef<ParticularTableRow>,
  feeAmount: {
    field: "feeAmount",
    headerName: "Fee Amount",
    minWidth: 110,
    flex: 0,
  } as ColDef<ParticularTableRow>,
  lateralFeeAmount: {
    field: "lateralFeeAmount",
    headerName: "Lateral Fee Amount",
    minWidth: 140,
    flex: 0,
  } as ColDef<ParticularTableRow>,
  priority: {
    field: "priority",
    headerName: "Priority",
    minWidth: 90,
    flex: 0,
  } as ColDef<ParticularTableRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
  } as ColDef<ParticularTableRow>,
};

function makeParticularActionsRenderer(onDelete: (index: number) => void) {
  return (p: ICellRendererParams<ParticularTableRow>) => {
    const index = p.data?.__index;
    if (index == null) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-destructive"
        aria-label="Delete particular"
        onClick={() => onDelete(index)}
      >
        <Trash2Icon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

type YearParticularsPanelProps = {
  yearId: number;
  particulars: FeeStructureParticularLine[];
  particularDraft: ParticularDraft;
  setParticularDraft: Dispatch<SetStateAction<ParticularDraft>>;
  feeCategoryOptions: { value: string; label: string }[];
  feeParticularOptions: { value: string; label: string }[];
  showLateralAmount: boolean;
  onParticularChange: (value: string | null) => void;
  onClearDraft: () => void;
  onAdd: (yearId: number) => void;
  onRequestDelete: (yearId: number, index: number) => void;
};

/** Particulars tab panel — collapsible add form + reusable DataTable. */
function YearParticularsPanel({
  yearId,
  particulars,
  particularDraft,
  setParticularDraft,
  feeCategoryOptions,
  feeParticularOptions,
  showLateralAmount,
  onParticularChange,
  onClearDraft,
  onAdd,
  onRequestDelete,
}: YearParticularsPanelProps) {
  const [gridReady, setGridReady] = useState(false);

  useEffect(() => {
    setGridReady(true);
  }, []);

  const particularRows = useMemo<ParticularTableRow[]>(
    () =>
      particulars.map((row, index) => ({
        ...row,
        __index: index,
      })),
    [particulars],
  );

  const columnDefs = useMemo<ColDef<ParticularTableRow>[]>(
    () => [
      PARTICULAR_COL_DEFS.siNo,
      PARTICULAR_COL_DEFS.category,
      PARTICULAR_COL_DEFS.particular,
      PARTICULAR_COL_DEFS.feeAmount,
      PARTICULAR_COL_DEFS.lateralFeeAmount,
      PARTICULAR_COL_DEFS.priority,
      {
        ...PARTICULAR_COL_DEFS.actions,
        cellRenderer: makeParticularActionsRenderer((index) =>
          onRequestDelete(yearId, index),
        ),
      },
    ],
    [onRequestDelete, yearId],
  );

  return (
    <div className="space-y-3 px-6 pb-4 pt-2">
      <Collapsible defaultOpen className="group">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-sm font-semibold"
            aria-label="Toggle Add Category & Particulars"
          >
            <Plus
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-data-[state=open]:rotate-45"
              aria-hidden
            />
            Add Category &amp; Particulars
            <ChevronDown
              className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label>Fee Category *</Label>
              <Select
                value={
                  particularDraft.feeCategoryId
                    ? String(particularDraft.feeCategoryId)
                    : null
                }
                onChange={(v) =>
                  setParticularDraft((prev) => ({
                    ...prev,
                    feeCategoryId: v ? Number(v) : null,
                  }))
                }
                options={feeCategoryOptions}
                placeholder="Select category"
                searchable
              />
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label>Fee Particular *</Label>
              <Select
                value={
                  particularDraft.feeParticularsId
                    ? String(particularDraft.feeParticularsId)
                    : null
                }
                onChange={onParticularChange}
                options={feeParticularOptions}
                placeholder="Select particular"
                searchable
              />
            </div>
            <div className="w-32 space-y-1.5">
              <Label>Fee Amount *</Label>
              <Input
                type="number"
                value={particularDraft.feeAmount}
                onChange={(e) =>
                  setParticularDraft((prev) => ({
                    ...prev,
                    feeAmount: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Priority</Label>
              <Input
                type="number"
                value={particularDraft.priority}
                onChange={(e) =>
                  setParticularDraft((prev) => ({
                    ...prev,
                    priority: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            {showLateralAmount ? (
              <div className="w-32 space-y-1.5">
                <Label>Lateral Fee Amount</Label>
                <Input
                  type="number"
                  value={particularDraft.lateralFeeAmount}
                  onChange={(e) =>
                    setParticularDraft((prev) => ({
                      ...prev,
                      lateralFeeAmount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            ) : null}
            <Button type="button" variant="outline" onClick={onClearDraft}>
              Clear
            </Button>
            <Button type="button" onClick={() => onAdd(yearId)}>
              Add
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {gridReady ? (
        <DataTable
          rowData={particularRows}
          columnDefs={columnDefs}
          bordered={false}
          height="auto"
          pagination={false}
          toolbar={false}
          toolbarLeading={<span className="sr-only">Fee particulars</span>}
        />
      ) : null}
    </div>
  );
}

function buildListBackUrl(params: {
  collegeId: number | null;
  courseId: number | null;
  batchId: number | null;
  academicYearId: number | null;
  isAcademicFee: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.collegeId) qs.set("cId", String(params.collegeId));
  if (params.isAcademicFee) {
    qs.set("isAcademicFee", "true");
    if (params.academicYearId) qs.set("aId", String(params.academicYearId));
  } else {
    qs.set("isAcademicFee", "false");
    if (params.courseId) qs.set("courseId", String(params.courseId));
    if (params.batchId) qs.set("batchId", String(params.batchId));
  }
  const query = qs.toString();
  return query
    ? `/accounts-and-fees/fee-masters/fee-structure?${query}`
    : "/accounts-and-fees/fee-masters/fee-structure";
}

/** Angular `AddFeeStructureComponent` / `EditFeeStructureComponent`. */
export function CollegeFeeStructureForm({
  mode,
  feeStructureId,
  initialQuery,
  title,
}: Readonly<{
  mode: FormMode;
  feeStructureId?: number;
  initialQuery?: InitialQuery;
  title: string;
}>) {
  const router = useRouter();
  const { user } = useSession();
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [batchesData, setBatchesData] = useState<FilterRow[]>([]);
  const [quotas, setQuotas] = useState<
    { generalDetailId: number; generalDetailDisplayName?: string }[]
  >([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [feeParticulars, setFeeParticulars] = useState<FeeParticular[]>([]);
  const [loadedStructure, setLoadedStructure] =
    useState<CollegeFeeStructureRow | null>(null);

  const [isAcademicFee, setIsAcademicFee] = useState(
    initialQuery?.isAcademicFee === "true",
  );
  const [classGroupName, setClassGroupName] = useState("");
  const [quotaId, setQuotaId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [isLateral, setIsLateral] = useState(false);
  const [activeFromDate, setActiveFromDate] = useState<Date | null>(new Date());
  const [activeToDate, setActiveToDate] = useState<Date | null>(new Date());

  const [courseGroups, setCourseGroups] = useState<CourseGroupRow[]>([]);
  const [courseYearsDataList, setCourseYearsDataList] = useState<
    FeeStructureCourseYearTab[]
  >([]);
  const [activeYearTab, setActiveYearTab] = useState("");
  const [particularDraft, setParticularDraft] =
    useState<ParticularDraft>(emptyDraft);
  const [showLateralAmount, setShowLateralAmount] = useState(false);
  const [deletedParticulars, setDeletedParticulars] = useState<
    FeeStructureParticularLine[]
  >([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] =
    useState<CollegeFeeStructureCreatePayload | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    yearId: number;
    index: number;
  } | null>(null);

  const requestDeleteParticular = useCallback(
    (yearId: number, index: number) => {
      setDeleteTarget({ yearId, index });
    },
    [],
  );

  const clearParticularDraft = useCallback(() => {
    setParticularDraft(emptyDraft());
    setShowLateralAmount(false);
  }, []);

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );
  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );
  const batchOptions = useMemo(
    () => filterBatches(batchesData, courseId).map(batchOption),
    [batchesData, courseId],
  );
  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  );
  const quotaOptions = useMemo(
    () =>
      quotas.map((q) => ({
        value: String(q.generalDetailId),
        label: q.generalDetailDisplayName ?? String(q.generalDetailId),
      })),
    [quotas],
  );
  const feeCategoryOptions = useMemo(
    () =>
      [...feeCategories]
        .sort((a, b) =>
          (a.categoryName ?? "").localeCompare(b.categoryName ?? ""),
        )
        .map((c) => ({
          value: String(c.feeCategoryId),
          label: c.categoryName ?? String(c.feeCategoryId),
        })),
    [feeCategories],
  );
  const feeParticularOptions = useMemo(
    () =>
      feeParticulars.map((p) => ({
        value: String(p.feeParticularsId),
        label: p.particularsName ?? String(p.feeParticularsId),
      })),
    [feeParticulars],
  );

  const loadCourseYears = useCallback(
    async (
      nextCourseId: number,
      lateral: boolean,
      existing?: CollegeFeeStructureRow | null,
    ) => {
      const tabs = await listCourseYearsForFeeStructure(nextCourseId, lateral);
      const existingParticulars = asArray<FeeStructureParticularLine>(
        existing?.feeStructureParticularDTOs,
      );
      const merged = tabs.map((tab) => ({
        ...tab,
        particulars: existingParticulars
          .filter(
            (p) =>
              Number(p.courseYearId) === tab.courseYearId &&
              p.isActive !== false,
          )
          .map(normalizeParticularLine),
      }));
      if (!aliveRef.current) return;
      setCourseYearsDataList(merged);
      if (merged[0]) setActiveYearTab(String(merged[0].courseYearId));
    },
    [],
  );

  const loadCourseGroups = useCallback(
    async (
      nextCourseId: number,
      nextCollegeId: number,
      nextQuotaId: number | null,
      existing?: CollegeFeeStructureRow | null,
    ) => {
      const rows = await listCourseGroupsByCourse(nextCourseId);
      const selected = asArray<FeeStructureCourseGroupSelection>(
        existing?.feeStructureCourseyrDTOs,
      );
      if (!aliveRef.current) return;
      setCourseGroups(
        rows.map((row) => {
          const courseGroupId = pickNum(row, [
            "courseGroupId",
            "fk_course_group_id",
          ]);
          const match = selected.find(
            (s) => Number(s.courseGroupId) === courseGroupId,
          );
          // Angular mutates full CourseGroup domain rows then POSTs them as-is.
          return {
            ...row,
            courseGroupId,
            groupCode: pickText(row, ["groupCode", "group_code"]),
            collegeId: nextCollegeId || Number(row.collegeId ?? 0) || undefined,
            quotaId: nextQuotaId ?? undefined,
            checked: Boolean(match),
            feeStructureCoursyrId: match?.feeStructureCoursyrId,
            feeStructureId: match?.feeStructureId,
            createdDt: match?.createdDt,
            groupSectionId: match?.groupSectionId ?? null,
          } as CourseGroupRow;
        }),
      );
    },
    [],
  );

  const refreshCollegeLookups = useCallback(async (nextCollegeId: number) => {
    const [categories, particulars] = await Promise.all([
      listFeeCategoriesByCollege(nextCollegeId),
      listFeeParticularsByCollege(nextCollegeId),
    ]);
    if (!aliveRef.current) return;
    setFeeCategories(categories);
    setFeeParticulars(particulars);
  }, []);

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const employeeId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);

    let cancelled = false;
    void Promise.all([
      getFeeMasterCollegeFilters(orgId, employeeId),
      listQuotaOptions(),
    ])
      .then(async ([filters, quotaRows]) => {
        if (cancelled) return;
        setFiltersData(filters.filtersData);
        setAcademicData(filters.academicData);
        setBatchesData(filters.batchesData);
        setQuotas(quotaRows as typeof quotas);

        if (mode === "add" && initialQuery?.cId) {
          const cId = Number(initialQuery.cId);
          setCollegeId(cId || null);
          if (initialQuery.isAcademicFee === "true") {
            setIsAcademicFee(true);
            setAcademicYearId(Number(initialQuery.aId) || null);
          } else {
            setIsAcademicFee(false);
            setCourseId(Number(initialQuery.courseId) || null);
            setBatchId(Number(initialQuery.batchId) || null);
          }
          if (cId) await refreshCollegeLookups(cId);
        }
      })
      .catch((err) => {
        if (!cancelled) toastError(err, "Failed to load form data");
      });

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    initialQuery?.aId,
    initialQuery?.batchId,
    initialQuery?.cId,
    initialQuery?.courseId,
    initialQuery?.isAcademicFee,
    refreshCollegeLookups,
    user?.employeeId,
    user?.organizationId,
  ]);

  useEffect(() => {
    if (mode !== "edit" || !feeStructureId) return;
    let cancelled = false;
    setLoading(true);
    void getCollegeFeeStructureById(feeStructureId)
      .then(async (structure) => {
        if (cancelled || !structure) return;
        setLoadedStructure(structure);
        setIsAcademicFee(Boolean(structure.isAcademicFee));
        setClassGroupName(String(structure.classGroupName ?? ""));
        setQuotaId(Number(structure.quotaId ?? 0) || null);
        setCollegeId(Number(structure.collegeId ?? 0) || null);
        setAcademicYearId(Number(structure.academicYearId ?? 0) || null);
        setCourseId(Number(structure.courseId ?? 0) || null);
        setBatchId(Number(structure.batchId ?? 0) || null);
        setIsLateral(Boolean(structure.isLateral));
        setActiveFromDate(parseDate(structure.activefromdate) ?? new Date());
        setActiveToDate(parseDate(structure.activetodate) ?? new Date());

        const cId = Number(structure.collegeId ?? 0);
        const crsId = Number(structure.courseId ?? 0);
        if (cId) await refreshCollegeLookups(cId);
        if (cancelled) return;
        if (crsId) {
          await loadCourseGroups(
            crsId,
            cId,
            Number(structure.quotaId ?? 0) || null,
            structure,
          );
          if (cancelled) return;
          await loadCourseYears(crsId, Boolean(structure.isLateral), structure);
        }
      })
      .catch((err) => {
        if (!cancelled) toastError(err, "Failed to load fee structure");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    feeStructureId,
    loadCourseGroups,
    loadCourseYears,
    mode,
    refreshCollegeLookups,
  ]);

  useEffect(() => {
    if (mode !== "add" || !collegeId || !courseId) return;
    void loadCourseGroups(courseId, collegeId, quotaId, null);
    void loadCourseYears(courseId, isLateral, null);
  }, [
    collegeId,
    courseId,
    isLateral,
    loadCourseGroups,
    loadCourseYears,
    mode,
    quotaId,
  ]);

  async function onCollegeChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCollegeId(next);
    setCourseId(null);
    setBatchId(null);
    setAcademicYearId(null);
    setCourseGroups([]);
    setCourseYearsDataList([]);
    if (!next) return;
    try {
      await refreshCollegeLookups(next);
      if (isAcademicFee) {
        const years = filterAcademicYears(academicData, next, filtersData);
        const first =
          pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) || null;
        setAcademicYearId(first);
      } else {
        const courses = filterCourses(filtersData, next);
        const first = pickNum(courses[0], ["fk_course_id", "courseId"]) || null;
        setCourseId(first);
      }
    } catch (err) {
      toastError(err, "Failed to load college details");
    }
  }

  async function onCourseChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCourseId(next);
    setBatchId(null);
    setCourseGroups([]);
    setCourseYearsDataList([]);
    if (!next || !collegeId) return;
    try {
      if (!isAcademicFee) {
        const batches = filterBatches(batchesData, next);
        const first = pickNum(batches[0], ["fk_batch_id", "batchId"]) || null;
        setBatchId(first);
      }
      await loadCourseGroups(next, collegeId, quotaId, loadedStructure);
      await loadCourseYears(next, isLateral, loadedStructure);
    } catch (err) {
      toastError(err, "Failed to load course details");
    }
  }

  async function onLateralChange(checked: boolean) {
    setIsLateral(checked);
    if (!courseId) return;
    try {
      await loadCourseYears(courseId, checked, loadedStructure);
    } catch (err) {
      toastError(err, "Failed to reload course years");
    }
  }

  function onParticularChange(value: string | null) {
    const id = value ? Number(value) : null;
    setParticularDraft((prev) => ({ ...prev, feeParticularsId: id }));
    if (!id) {
      setShowLateralAmount(false);
      return;
    }
    const row = feeParticulars.find((p) => p.feeParticularsId === id);
    setShowLateralAmount(row?.particularsCode === GM_CODES.SPECIAL_FEE);
  }

  function addParticularToYear(yearId: number) {
    const {
      feeCategoryId,
      feeParticularsId,
      feeAmount,
      priority,
      lateralFeeAmount,
    } = particularDraft;
    if (!feeCategoryId || !feeParticularsId) {
      toastInfo("Select fee category and particular");
      return;
    }
    const category = feeCategories.find(
      (c) => c.feeCategoryId === feeCategoryId,
    );
    const particular = feeParticulars.find(
      (p) => p.feeParticularsId === feeParticularsId,
    );
    setCourseYearsDataList((prev) =>
      prev.map((tab) => {
        if (tab.courseYearId !== yearId) return tab;
        return {
          ...tab,
          particulars: [
            ...tab.particulars,
            {
              feeCategoryId,
              feeParticularsId,
              feeAmount: Number(feeAmount) || 0,
              priority: Number(priority) || 0,
              lateralFeeAmount: Number(lateralFeeAmount) || 0,
              isActive: true,
              categoryName: category?.categoryName,
              particularName: particular?.particularsName,
              particularsName: particular?.particularsName,
            },
          ],
        };
      }),
    );
    setParticularDraft(emptyDraft());
    setShowLateralAmount(false);
  }

  function removeParticular(yearId: number, index: number) {
    const tab = courseYearsDataList.find((t) => t.courseYearId === yearId);
    const target = tab?.particulars[index];
    if (mode === "edit" && target) {
      setDeletedParticulars((deleted) => [
        ...deleted,
        { ...target, isActive: false },
      ]);
    }
    setCourseYearsDataList((prev) =>
      prev.map((yearTab) => {
        if (yearTab.courseYearId !== yearId) return yearTab;
        return {
          ...yearTab,
          particulars: yearTab.particulars.filter((_, i) => i !== index),
        };
      }),
    );
  }

  function buildPayload(): CollegeFeeStructureCreatePayload & {
    feeStructureId?: number;
  } {
    const fromYmd = toFeeDateYmd(activeFromDate);
    const toYmd = toFeeDateYmd(activeToDate);
    const particulars: FeeStructureParticularLine[] = [];
    courseYearsDataList.forEach((yearTab) => {
      yearTab.particulars.forEach((line) => {
        const normalized = normalizeParticularLine(line);
        particulars.push({
          ...normalized,
          // Angular particular dates are date-only (`YYYY-MM-DD`).
          fromDate: fromYmd,
          toDate: toYmd,
          collegeId: collegeId ?? undefined,
          bankAccountTypeId: null,
          cashAccountTypeId: null,
          mappingAccountTypeId: null,
          courseYearId: yearTab.courseYearId,
          courseYearName: yearTab.courseYearName,
          feeLabel: yearTab.feeLabel,
          isActive: line.isActive !== false,
        });
      });
    });

    if (mode === "edit") {
      deletedParticulars.forEach((line) =>
        particulars.push(normalizeParticularLine(line)),
      );
    }

    const collegeCode =
      collegeOptions.find((o) => o.value === String(collegeId))?.label ?? "";
    const courseCode =
      courseOptions.find((o) => o.value === String(courseId))?.label ?? "";
    const batchName =
      batchOptions.find((o) => o.value === String(batchId))?.label ?? "";
    const academicYear =
      academicYearOptions.find((o) => o.value === String(academicYearId))
        ?.label ?? "";

    const payload: CollegeFeeStructureCreatePayload & {
      feeStructureId?: number;
    } = {
      collegeId: collegeId ?? 0,
      courseId: courseId ?? 0,
      batchId: isAcademicFee ? null : batchId,
      academicYearId: isAcademicFee ? academicYearId : null,
      quotaId: quotaId ?? 0,
      classGroupName: classGroupName.trim(),
      isLateral,
      isActive: true,
      isAcademicFee,
      description: null,
      isMapped: null,
      activefromdate: toFeeDateIsoMidnight(activeFromDate),
      activetodate: toFeeDateIsoMidnight(activeToDate),
      feeStructureParticularDTOs: particulars,
      // Full CourseGroup domain rows (Angular parity) — not a slim DTO.
      feeStructureCourseyrDTOs: courseGroups.filter((g) => g.checked),
      // Preview-only labels (stripped before POST to match Angular edit).
      college: collegeCode,
      course: courseCode.split(" (")[0] ?? courseCode,
      batch: batchName,
      academicYear,
    };

    if (mode === "edit" && feeStructureId) {
      payload.feeStructureId = feeStructureId;
    }

    return payload;
  }

  function handleSaveClick() {
    if (!classGroupName.trim()) {
      toastInfo("Fee structure name is required");
      return;
    }
    if (!collegeId || !courseId || !quotaId) {
      toastInfo("College, course, and quota are required");
      return;
    }
    if (isAcademicFee && !academicYearId) {
      toastInfo("Academic year is required");
      return;
    }
    if (!isAcademicFee && !batchId) {
      toastInfo("Batch is required");
      return;
    }

    setPreviewPayload(buildPayload());
    setPreviewOpen(true);
  }

  async function handleConfirmSave() {
    if (!previewPayload) return;
    setSaving(true);
    try {
      // Angular edit POST does not send preview display labels.
      const {
        college: _college,
        course: _course,
        batch: _batch,
        academicYear: _academicYear,
        ...body
      } = previewPayload;
      await createCollegeFeeStructure(body);
      toastSuccess(
        mode === "edit"
          ? "Fee structure updated successfully"
          : "Fee structure created successfully",
      );
      router.push(
        buildListBackUrl({
          collegeId,
          courseId,
          batchId,
          academicYearId,
          isAcademicFee,
        }),
      );
    } catch (err) {
      toastError(err, "Failed to save fee structure");
    } finally {
      setSaving(false);
      setPreviewOpen(false);
    }
  }

  function goBack() {
    router.push(
      buildListBackUrl({
        collegeId,
        courseId,
        batchId,
        academicYearId,
        isAcademicFee,
      }),
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="app-card p-8 text-center text-muted-foreground">
          Loading fee structure…
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-no-page-name>
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h1 className="text-base font-semibold">{title}</h1>
        </div>

        {/* Row 1 — Fee Structure Name */}
        <div className="border-b border-border px-4 py-3">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Fee Structure Name *</Label>
              <Input
                value={classGroupName}
                onChange={(e) => setClassGroupName(e.target.value)}
                placeholder="Fee structure name"
              />
            </div>
          </div>
        </div>

        {/* Row 2 — Quota / College / Course / Batch / Lateral */}
        <div className="border-b border-border px-4 py-3">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Quota *</Label>
              <Select
                value={quotaId ? String(quotaId) : null}
                onChange={(v) => setQuotaId(v ? Number(v) : null)}
                options={quotaOptions}
                placeholder="Select quota"
                searchable
              />
            </div>
            <div className="space-y-1.5">
              <Label>College *</Label>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="Select college"
                searchable
              />
            </div>
            {isAcademicFee ? (
              <div className="space-y-1.5">
                <Label>Academic Year *</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYearOptions}
                  placeholder="Select academic year"
                  searchable
                  disabled={!collegeId}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Course *</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={onCourseChange}
                options={courseOptions}
                placeholder="Select course"
                searchable
                disabled={!collegeId}
              />
            </div>
            {!isAcademicFee ? (
              <div className="space-y-1.5">
                <Label>Batch *</Label>
                <Select
                  value={batchId ? String(batchId) : null}
                  onChange={(v) => setBatchId(v ? Number(v) : null)}
                  options={batchOptions}
                  placeholder="Select batch"
                  searchable
                  disabled={!courseId}
                />
              </div>
            ) : null}
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isLateral}
                  onCheckedChange={(v) => void onLateralChange(Boolean(v))}
                />
                Is For Lateral
              </label>
            </div>
          </div>
        </div>

        {/* Row 3 — Course group checkboxes */}
        {courseGroups.length > 0 ? (
          <div className="border-b border-border px-4 py-3">
            <h2 className="mb-3 text-sm font-semibold">
              Select Fee Structure course years
            </h2>
            <div className="flex flex-wrap gap-4">
              {courseGroups.map((group) => (
                <label
                  key={group.courseGroupId}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={Boolean(group.checked)}
                    onCheckedChange={(checked) =>
                      setCourseGroups((prev) =>
                        prev.map((g) =>
                          g.courseGroupId === group.courseGroupId
                            ? { ...g, checked: Boolean(checked) }
                            : g,
                        ),
                      )
                    }
                  />
                  {group.groupCode ?? group.courseGroupId}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* Row 4 — Year tabs + particulars */}
        {courseYearsDataList.length > 0 ? (
          <div className="border-b border-border px-4 py-3">
            <Tabs value={activeYearTab} onValueChange={setActiveYearTab}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start rounded-none bg-muted p-0">
                {courseYearsDataList.map((tab) => (
                  <TabsTrigger
                    key={tab.courseYearId}
                    value={String(tab.courseYearId)}
                    className="rounded-none px-4 py-2.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    {tab.feeLabel}
                  </TabsTrigger>
                ))}
              </TabsList>

              {courseYearsDataList.map((tab) => (
                <TabsContent
                  key={tab.courseYearId}
                  value={String(tab.courseYearId)}
                  className="mt-0 rounded-md border border-t-0 p-0"
                >
                  <YearParticularsPanel
                    yearId={tab.courseYearId}
                    particulars={tab.particulars}
                    particularDraft={particularDraft}
                    setParticularDraft={setParticularDraft}
                    feeCategoryOptions={feeCategoryOptions}
                    feeParticularOptions={feeParticularOptions}
                    showLateralAmount={showLateralAmount}
                    onParticularChange={onParticularChange}
                    onClearDraft={clearParticularDraft}
                    onAdd={addParticularToYear}
                    onRequestDelete={requestDeleteParticular}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ) : null}

        {/* Footer — Back / Save */}
        <div className="flex justify-end gap-2 px-4 py-3">
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
          <Button type="button" onClick={handleSaveClick}>
            Save
          </Button>
        </div>
      </div>

      <FeeStructurePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={() => void handleConfirmSave()}
        payload={previewPayload}
        saving={saving}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete particular"
        description="Are you sure you want to remove this fee particular?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            removeParticular(deleteTarget.yearId, deleteTarget.index);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
