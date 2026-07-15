"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getExamCenterRoomsReportBlocks,
  getExamCenterRoomsReportBuildings,
  getExamCenterRoomsReportCenters,
  getExamCenterRoomsReportFilters,
  getExamCenterRoomsReportFloors,
  getExamCenterRoomsReportList,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const EXPORT_COLS = [
  { key: "si", header: "SI.No" },
  { key: "examCenter", header: "Exam Center" },
  { key: "building", header: "Building" },
  { key: "roomName", header: "Room Name" },
  { key: "roomCode", header: "Room Code" },
] as const;

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = txt(exam.from_date).slice(0, 10);
  const to = txt(exam.to_date).slice(0, 10);
  const bits: string[] = [];
  if (exam.is_internal_exam) bits.push("Internal");
  if (exam.is_regular_exam) bits.push("Regular");
  if (exam.is_supply_exam) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function centerId(row: AnyRow): number {
  return num(row.univExamcenterId ?? row.univ_examcenter_id);
}

function buildingLabel(row: AnyRow): string {
  const campus = txt(row.campusName ?? row.campus_name);
  const code = txt(row.buildingCode ?? row.building_code);
  if (campus && code) return `${campus} - ${code}`;
  return code || txt(row.buildingName ?? row.building_name);
}

function floorLabel(row: AnyRow): string {
  const name = txt(row.floorName ?? row.floor_name);
  const no = txt(row.floorNo ?? row.floor_no);
  if (name && no) return `${name} - ${no}`;
  return name || no;
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    examCenter: txt(row.examCenterName ?? row.examcenterName ?? row.examcenter_name),
    building: txt(row.buildingId ?? row.buildingCode ?? row.building_code),
    roomName: txt(row.roomName ?? row.room_name),
    roomCode: txt(row.roomCode ?? row.room_code),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Center Rooms Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Exam Center Rooms Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

export default function ExamcenterRoomsReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [centers, setCenters] = useState<AnyRow[]>([]);
  const [buildings, setBuildings] = useState<AnyRow[]>([]);
  const [blocks, setBlocks] = useState<AnyRow[]>([]);
  const [floors, setFloors] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [univExamcenterId, setUnivExamcenterId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [floorId, setFloorId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    return dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId) &&
          !r.is_internal_exam,
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  const selectedCenter = useMemo(
    () => centers.find((c) => centerId(c) === Number(univExamcenterId)),
    [centers, univExamcenterId],
  );
  const selectedBuilding = useMemo(
    () =>
      buildings.find((b) => num(b.buildingId) === Number(buildingId)),
    [buildings, buildingId],
  );
  const selectedBlock = useMemo(
    () => blocks.find((b) => num(b.blockId) === Number(blockId)),
    [blocks, blockId],
  );
  const selectedFloor = useMemo(
    () => floors.find((f) => num(f.floorId) === Number(floorId)),
    [floors, floorId],
  );

  const reportSubtitle = useMemo(() => {
    const parts = [
      txt(
        selectedCenter?.examcenterName ??
          selectedCenter?.examcenter_name ??
          selectedCenter?.ec_name,
      ),
      Number(buildingId) > 0
        ? txt(selectedBuilding?.buildingCode ?? selectedBuilding?.building_code)
        : buildingId === "0"
          ? "All"
          : "",
      Number(blockId) > 0
        ? txt(selectedBlock?.blockCode ?? selectedBlock?.block_code)
        : blockId === "0"
          ? "All"
          : "",
    ].filter(Boolean);
    if (Number(floorId) > 0) {
      const fn = txt(selectedFloor?.floorName ?? selectedFloor?.floor_name);
      const fno = txt(selectedFloor?.floorNo ?? selectedFloor?.floor_no);
      parts.push(fn && fno ? `${fn}-${fno}` : fn || fno);
    } else if (floorId === "0") {
      parts.push("All");
    }
    return parts.join(" / ");
  }, [
    selectedCenter,
    selectedBuilding,
    selectedBlock,
    selectedFloor,
    buildingId,
    blockId,
    floorId,
  ]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getExamCenterRoomsReportFilters({
          organizationId: organizationId || 0,
          employeeId,
        });
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        if (first) setCourseId(String(num(first.fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId, organizationId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setUnivExamcenterId("");
    setBuildingId("");
    setBlockId("");
    setFloorId("");
    setCenters([]);
    setBuildings([]);
    setBlocks([]);
    setFloors([]);
    clearResults();
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setUnivExamcenterId("");
    setBuildingId("");
    setBlockId("");
    setFloorId("");
    setCenters([]);
    setBuildings([]);
    setBlocks([]);
    setFloors([]);
    clearResults();
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadExamDependents() {
      setUnivExamcenterId("");
      setBuildingId("");
      setBlockId("");
      setFloorId("");
      setBlocks([]);
      setFloors([]);
      clearResults();
      if (!examId) {
        setCenters([]);
        setBuildings([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const [centerList, buildingList] = await Promise.all([
          getExamCenterRoomsReportCenters(),
          getExamCenterRoomsReportBuildings(),
        ]);
        setCenters(centerList);
        setBuildings(buildingList as AnyRow[]);
        if (centerList.length) {
          setUnivExamcenterId(String(centerId(centerList[0])));
        }
        if (buildingList.length) {
          setBuildingId(String(num(buildingList[0].buildingId)));
        } else {
          setBuildingId("0");
        }
      } catch (e) {
        toastError(e, "Failed to load exam centers / buildings");
        setCenters([]);
        setBuildings([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadExamDependents();
  }, [examId]);

  useEffect(() => {
    async function loadBlocks() {
      setBlockId("");
      setFloorId("");
      setFloors([]);
      clearResults();
      const bid = Number(buildingId);
      if (!buildingId || bid === 0) {
        setBlocks([]);
        setBlockId("0");
        setFloorId("0");
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getExamCenterRoomsReportBlocks(bid);
        setBlocks(list as AnyRow[]);
        if (list.length) {
          setBlockId(String(num(list[0].blockId)));
        } else {
          setBlockId("0");
        }
      } catch (e) {
        toastError(e, "Failed to load blocks");
        setBlocks([]);
        setBlockId("0");
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBlocks();
  }, [buildingId]);

  useEffect(() => {
    async function loadFloors() {
      setFloorId("");
      clearResults();
      const bid = Number(blockId);
      if (!blockId || bid === 0) {
        setFloors([]);
        setFloorId("0");
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getExamCenterRoomsReportFloors(bid);
        setFloors(list as AnyRow[]);
        if (list.length) {
          setFloorId(String(num(list[0].floorId)));
        } else {
          setFloorId("0");
        }
      } catch (e) {
        toastError(e, "Failed to load floors");
        setFloors([]);
        setFloorId("0");
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadFloors();
  }, [blockId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !univExamcenterId) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamCenterRoomsReportList({
        examId: Number(examId),
        univExamcenterId: Number(univExamcenterId),
        buildingId: Number(buildingId || 0),
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Exam Center Rooms Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Center Rooms Report - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Exam Center",
        minWidth: 160,
        valueGetter: (p) =>
          txt(
            p.data?.examCenterName ??
              p.data?.examcenterName ??
              p.data?.examcenter_name,
          ),
      },
      {
        headerName: "Building",
        minWidth: 120,
        valueGetter: (p) =>
          txt(
            p.data?.buildingId ??
              p.data?.buildingCode ??
              p.data?.building_code,
          ),
      },
      {
        headerName: "Room Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.roomName ?? p.data?.room_name),
      },
      {
        headerName: "Room Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.roomCode ?? p.data?.room_code),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || undefined}
            onChange={(v) => setCourseId(v ?? "")}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Academic Year *">
          <Select
            value={academicYearId || undefined}
            onChange={(v) => setAcademicYearId(v ?? "")}
            isLoading={loadingFilters}
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            placeholder="Academic Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="min-w-[240px] flex-[2]">
          <Select
            value={examId || undefined}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Center *">
          <Select
            value={univExamcenterId || undefined}
            onChange={(v) => {
              setUnivExamcenterId(v ?? "");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={centers.map((c) => ({
              value: String(centerId(c)),
              label: txt(c.examcenterCode ?? c.examcenter_code ?? c.ec_code),
            }))}
            placeholder="Exam Center"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Campus - Building" className="min-w-[220px] flex-[2]">
          <Select
            value={buildingId || undefined}
            onChange={(v) => setBuildingId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...buildings.map((b) => ({
                value: String(num(b.buildingId)),
                label: buildingLabel(b),
              })),
            ]}
            placeholder="Campus - Building"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Block">
          <Select
            value={blockId || undefined}
            onChange={(v) => setBlockId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...blocks.map((b) => ({
                value: String(num(b.blockId)),
                label: txt(b.blockCode ?? b.block_code),
              })),
            ]}
            placeholder="Block"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Floor - No">
          <Select
            value={floorId || undefined}
            onChange={(v) => {
              setFloorId(v ?? "");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...floors.map((f) => ({
                value: String(num(f.floorId)),
                label: floorLabel(f),
              })),
            ]}
            placeholder="Floor - No"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <Button
            type="button"
            onClick={() => void onGetList()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Exam Center Rooms Report - ${reportSubtitle}`
          : "Exam Center Rooms Report"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, reportSubtitle)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
