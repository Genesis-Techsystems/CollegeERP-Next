"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { listSubjectUnits, updateSubjectUnitTopics } from "@/services";

type AnyRow = Record<string, any>;
type TopicRow = AnyRow & {
  subjectUnitTopicId?: number;
  unitCode?: string;
  topicName?: string;
  fromPeriod?: number | null;
  toPeriod?: number | null;
  _modified?: boolean;
};
type UnitRow = AnyRow & {
  subjectUnitTopicsDTOs?: TopicRow[];
  subjectCreditHours?: number;
};

type LessonTopicGridRow = TopicRow & {
  __rowKey: string;
  unitKey: number;
  topicIndex: number;
};

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

const COL_DEFS = {
  unit: {
    field: "unitCode",
    headerName: "Unit",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<LessonTopicGridRow>,
  topicName: {
    field: "topicName",
    headerName: "Topic Name",
    minWidth: 240,
    flex: 2,
  } as ColDef<LessonTopicGridRow>,
  startPeriod: {
    headerName: "Start Period",
    minWidth: 120,
    flex: 0.6,
  } as ColDef<LessonTopicGridRow>,
  endPeriod: {
    headerName: "End Period",
    minWidth: 120,
    flex: 0.6,
  } as ColDef<LessonTopicGridRow>,
};

function makePeriodInputRenderer(
  field: "fromPeriod" | "toPeriod",
  onChange: (unitKey: number, topicIndex: number, value: number | null) => void,
) {
  return (p: ICellRendererParams<LessonTopicGridRow>) => {
    const row = p.data;
    if (!row) return null;
    const value = row[field];
    return (
      <div className="flex h-full w-full items-center px-1 py-1">
        <Input
          type="number"
          min={1}
          className="h-8 w-full min-w-[72px] rounded-[4px] border border-[#ccc] bg-white px-2 text-[12px] shadow-none focus:border-[#999] focus:ring-1 focus:ring-[#0c51a4]/30"
          value={value ?? ""}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            onChange(row.unitKey, row.topicIndex, v === "" ? null : Number(v));
          }}
        />
      </div>
    );
  };
}

export default function AssignLessonPlanningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const collegeId = n(searchParams.get("collegeId"));
  const courseId = n(searchParams.get("courseId"));
  const courseGroupId = n(searchParams.get("courseGroupId"));
  const courseYearId = n(searchParams.get("courseYearId"));
  const regulationId = n(searchParams.get("regulationId"));
  const subjectId = n(searchParams.get("subjectId"));

  const collegeName = s(searchParams.get("collegeName"));
  const courseCode = s(searchParams.get("courseCode"));
  const courseGroupName = s(
    searchParams.get("courseGroupName") || searchParams.get("groupName"),
  );
  const courseYearName = s(searchParams.get("courseYearName"));
  const subjectName = s(searchParams.get("subjectName"));
  const regulationCode = s(searchParams.get("regulationCode"));

  const contextTitle = useMemo(() => {
    const parts = [
      collegeName,
      courseCode,
      courseGroupName,
      courseYearName,
      subjectName,
      regulationCode,
    ].filter(Boolean);
    return parts.join(" / ");
  }, [
    collegeName,
    courseCode,
    courseGroupName,
    courseYearName,
    subjectName,
    regulationCode,
  ]);

  const backHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (collegeId) qs.set("collegeId", String(collegeId));
    if (courseId) qs.set("courseId", String(courseId));
    if (courseGroupId) qs.set("courseGroupId", String(courseGroupId));
    if (courseYearId) qs.set("courseYearId", String(courseYearId));
    if (regulationId) qs.set("regulationId", String(regulationId));
    const q = qs.toString();
    return q
      ? `/academics/subject-unit-topics?${q}`
      : "/academics/subject-unit-topics";
  }, [collegeId, courseId, courseGroupId, courseYearId, regulationId]);

  const canLoad = !!(courseYearId && regulationId && subjectId);

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjectCreditHours, setSubjectCreditHours] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const loadUnits = useCallback(async () => {
    if (!canLoad) {
      setUnits([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listSubjectUnits({
        courseYearId,
        regulationId,
        subjectId,
      });
      const normalized: UnitRow[] = list.map((u) => ({
        ...u,
        subjectUnitTopicsDTOs: (Array.isArray(u.subjectUnitTopicsDTOs)
          ? u.subjectUnitTopicsDTOs
          : Array.isArray(u.subjectUnitTopics)
            ? u.subjectUnitTopics
            : []
        ).map((t: TopicRow) => ({
          ...t,
          unitCode: s(t.unitCode ?? u.unitCode),
          fromPeriod: t.fromPeriod ?? null,
          toPeriod: t.toPeriod ?? null,
          _modified: false,
        })),
      }));
      setUnits(normalized);
      setSubjectCreditHours(n(normalized[0]?.subjectCreditHours));
    } catch {
      setUnits([]);
      toastError("Failed to load units for lesson planning");
    } finally {
      setLoading(false);
    }
  }, [canLoad, courseYearId, regulationId, subjectId]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const rowData = useMemo<LessonTopicGridRow[]>(() => {
    const rows: LessonTopicGridRow[] = [];
    units.forEach((unit, unitKey) => {
      (unit.subjectUnitTopicsDTOs ?? []).forEach((topic, topicIndex) => {
        rows.push({
          ...topic,
          __rowKey: `${unitKey}-${topic.subjectUnitTopicId ?? topicIndex}-${topic.topicName ?? ""}`,
          unitKey,
          topicIndex,
        });
      });
    });
    return rows;
  }, [units]);

  const updateTopic = useCallback(
    (unitKey: number, topicIndex: number, patch: Partial<TopicRow>) => {
      setUnits((prev) =>
        prev.map((u, ui) => {
          if (ui !== unitKey) return u;
          const topics = [...(u.subjectUnitTopicsDTOs ?? [])];
          const current = topics[topicIndex];
          if (!current) return u;
          topics[topicIndex] = { ...current, ...patch, _modified: true };
          return { ...u, subjectUnitTopicsDTOs: topics };
        }),
      );
    },
    [],
  );

  const onFromPeriodChange = useCallback(
    (unitKey: number, topicIndex: number, value: number | null) => {
      updateTopic(unitKey, topicIndex, { fromPeriod: value });
    },
    [updateTopic],
  );

  const onToPeriodChange = useCallback(
    (unitKey: number, topicIndex: number, value: number | null) => {
      updateTopic(unitKey, topicIndex, { toPeriod: value });
    },
    [updateTopic],
  );

  const columnDefs = useMemo<ColDef<LessonTopicGridRow>[]>(
    () => [
      COL_DEFS.unit,
      COL_DEFS.topicName,
      {
        ...COL_DEFS.startPeriod,
        cellRenderer: makePeriodInputRenderer("fromPeriod", onFromPeriodChange),
      },
      {
        ...COL_DEFS.endPeriod,
        cellRenderer: makePeriodInputRenderer("toPeriod", onToPeriodChange),
      },
    ],
    [onFromPeriodChange, onToPeriodChange],
  );

  async function addLessonPlanning() {
    const payload: Array<{
      subjectUnitTopicId: number;
      fromPeriod: number;
      toPeriod: number;
    }> = [];
    for (const unit of units) {
      for (const topic of unit.subjectUnitTopicsDTOs ?? []) {
        if (
          topic._modified &&
          topic.fromPeriod != null &&
          topic.toPeriod != null &&
          n(topic.subjectUnitTopicId)
        ) {
          payload.push({
            subjectUnitTopicId: n(topic.subjectUnitTopicId),
            fromPeriod: Number(topic.fromPeriod),
            toPeriod: Number(topic.toPeriod),
          });
        }
      }
    }
    if (payload.length === 0) {
      toastInfo("No session numbers entered.");
      return;
    }
    setSaving(true);
    try {
      await updateSubjectUnitTopics(payload);
      toastSuccess("Lesson planning saved successfully");
      router.push(backHref);
    } catch (err) {
      toastError(err, "Failed to save lesson planning");
    } finally {
      setSaving(false);
    }
  }

  const panelTitle = (
    <>
      {contextTitle || "Assign Lesson Planning"}
      {"\u00A0"}-{"\u00A0"}
      Subject Hours :{subjectCreditHours > 0 ? ` ${subjectCreditHours}` : ""}
    </>
  );

  if (!canLoad) {
    return (
      <PageContainer className="space-y-4">
        <div className="app-card p-6 text-sm text-muted-foreground">
          <p className="mb-4">
            Open this page from <strong>Subject Unit Topics</strong> via{" "}
            <strong>Assign Lesson Planning</strong>.
          </p>
          <Button variant="secondary" asChild>
            <Link href="/academics/subject-unit-topics">
              Back to Subject Unit Topics
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <div className="min-h-0 overflow-hidden">
        <div className="pb-2">
          <DataTable
            title={`${contextTitle || "Assign Lesson Planning"} - Subject Hours :${
              subjectCreditHours > 0 ? ` ${subjectCreditHours}` : ""
            }`}
            titleIcon=""
            bordered={false}
            rowData={rowData}
            columnDefs={columnDefs}
            loading={loading}
            toolbar={false}
            pagination={false}
            autoHeight
            getRowId={(p) => p.data?.__rowKey ?? ""}
          />
        </div>
      </div>
      {/* </div> */}
      {/* </div> */}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          className={cn("app-control back-btn min-w-[88px]")}
          onClick={() => router.push(backHref)}
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={saving || rowData.length === 0}
          onClick={() => {
            void addLessonPlanning();
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </PageContainer>
  );
}
