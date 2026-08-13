"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import {
  RoomAllotmentTable,
  type RoomAllotmentRow,
} from "../../../_components/RoomAllotmentTable";
import {
  listActiveBuildings,
  listBlocksByBuilding,
  listFloorsByBlock,
  listExamTimetablesByExamAndDate,
  listGeneralDetailsByMaster,
  getExamRoomDetails,
  createExamRoomAllotments,
  getExamMasterById,
} from "@/services";

type AnyRow = Record<string, any>;

interface ExamRoomRow extends RoomAllotmentRow {}

function toDateStr(value: unknown): string {
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Angular date pipe `d MMM, y` (CONSTANTS.dateFormate). */
function formatExamHeaderDate(value: unknown): string {
  const iso = toDateStr(value);
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function numOrZero(row: AnyRow, ...keys: string[]): number {
  for (const key of keys) {
    if (row[key] == null || row[key] === "") continue;
    const n = Number(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function mapVacancyRoom(r: AnyRow): ExamRoomRow {
  const total_rows = numOrZero(r, "total_rows", "totalRows");
  const total_columns = numOrZero(r, "total_columns", "totalColumns");
  const room_strength =
    numOrZero(r, "room_strength", "roomStrength") || total_rows * total_columns;
  return {
    ...r,
    room: r.room ?? r.room_name ?? r.roomName ?? "",
    checked: false,
    disabled: r.pk_exam_room_allotment_id != null,
    priority: numOrZero(r, "priority"),
    total_rows,
    total_columns,
    room_strength,
  };
}

export default function AddRoomSeatingPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => ({
      collegeId: Number(searchParams?.get("collegeId") ?? 0),
      examId: Number(searchParams?.get("examId") ?? 0),
      courseId: Number(searchParams?.get("courseId") ?? 0),
      academicYearId: Number(searchParams?.get("academicYearId") ?? 0),
      examTimetableId: Number(searchParams?.get("examTimetableId") ?? 0),
      examDate: searchParams?.get("examDate") ?? "",
      courseCode: searchParams?.get("courseCode") ?? "",
      academicYear: searchParams?.get("academicYear") ?? "",
      examName: searchParams?.get("examName") ?? "",
      /** Parent filter: `0` External / `1` Internal */
      examType: searchParams?.get("examType") ?? "",
    }),
    [searchParams],
  );

  const [exam, setExam] = useState<AnyRow | null>(null);

  const examTypeLabel = useMemo(() => {
    // Angular: *ngIf="examsList.isInternalExam != false" (same for Regular/Supple)
    if (!exam) {
      if (params.examType === "1") return "(Internal)";
      if (params.examType === "0") return "";
      return "—";
    }
    const parts: string[] = [];
    if (exam.isInternalExam != false) parts.push("(Internal)");
    if (exam.isRegularExam != false) parts.push("(Regular)");
    if (exam.isSupplyExam != false) parts.push("(Supple)");
    return parts.join(" ");
  }, [exam, params.examType]);
  const [buildings, setBuildings] = useState<AnyRow[]>([]);
  const [blocks, setBlocks] = useState<AnyRow[]>([]);
  const [floors, setFloors] = useState<AnyRow[]>([]);
  const [examTimetables, setExamTimetables] = useState<AnyRow[]>([]);
  const [vacancyRooms, setVacancyRooms] = useState<ExamRoomRow[]>([]);
  const [seatStatusId, setSeatStatusId] = useState<number>(0);

  const [buildingId, setBuildingId] = useState<number>(0);
  const [blockId, setBlockId] = useState<number>(0);
  const [floorId, setFloorId] = useState<number>(0);
  const [examDate, setExamDate] = useState<string>(toDateStr(params.examDate));
  const [examTimetableId, setExamTimetableId] = useState<number>(
    params.examTimetableId || 0,
  );
  const [globalRows, setGlobalRows] = useState<number>(0);
  const [globalCols, setGlobalCols] = useState<number>(0);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(false);

  const minDate = toDateStr(exam?.fromDate);
  const maxDate = toDateStr(exam?.toDate);

  useEffect(() => {
    void (async () => {
      const [bldgs, status, examRow] = await Promise.all([
        listActiveBuildings().catch(() => []),
        listGeneralDetailsByMaster("EXMSEATS").catch(() => []),
        params.examId
          ? getExamMasterById(params.examId).catch(() => null)
          : Promise.resolve(null),
      ]);
      setBuildings(Array.isArray(bldgs) ? bldgs : []);
      const availId = Number(
        (Array.isArray(status) ? status : []).find(
          (s: AnyRow) =>
            String(s.generalDetailCode ?? "").toLowerCase() === "available",
        )?.generalDetailId ?? 0,
      );
      setSeatStatusId(availId);
      setExam(examRow ?? null);
    })();
  }, [params.examId]);

  // Angular selectedExam / calDays: ExamTimetable by examId + isActive + examDate
  useEffect(() => {
    void (async () => {
      if (!params.examId || !examDate) {
        setExamTimetables([]);
        return;
      }
      const rows = await listExamTimetablesByExamAndDate(
        params.examId,
        examDate,
      ).catch(() => []);
      const list = Array.isArray(rows) ? rows : [];
      setExamTimetables(list);
      const ids = list.map((t: AnyRow) => Number(t.examTimetableId));
      setExamTimetableId((prev) => {
        if (prev && ids.includes(prev)) return prev;
        const fromUrl = params.examTimetableId;
        if (fromUrl && ids.includes(fromUrl)) return fromUrl;
        return Number(list[0]?.examTimetableId) || 0;
      });
    })();
  }, [params.examId, examDate, params.examTimetableId]);

  useEffect(() => {
    void (async () => {
      if (!buildingId) {
        setBlocks([]);
        return;
      }
      const rows = await listBlocksByBuilding(buildingId).catch(() => []);
      setBlocks(Array.isArray(rows) ? rows : []);
    })();
  }, [buildingId]);

  useEffect(() => {
    void (async () => {
      if (!blockId) {
        setFloors([]);
        return;
      }
      const rows = await listFloorsByBlock(blockId).catch(() => []);
      setFloors(Array.isArray(rows) ? rows : []);
    })();
  }, [blockId]);

  // Angular getRooms() — runs when timetable or building/block/floor changes.
  useEffect(() => {
    if (!examTimetableId) {
      setVacancyRooms([]);
      return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    void (async () => {
      try {
        const rows = await getExamRoomDetails({
          buildingId,
          blockId,
          floorId,
          examTimetableId,
        });
        if (cancelled) return;
        const arr: ExamRoomRow[] = (Array.isArray(rows) ? rows : []).map(
          mapVacancyRoom,
        );
        setVacancyRooms(arr);
        setSelectAll(false);
      } catch {
        if (!cancelled) {
          setVacancyRooms([]);
          toast.error("Failed to load rooms for the selected filters.");
        }
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildingId, blockId, floorId, examTimetableId]);

  function handleRowPriority(idx: number, value: number) {
    setVacancyRooms((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, priority: value } : r)),
    );
  }

  function handleCheckAll(next: boolean) {
    setSelectAll(next);
    setVacancyRooms((prev) =>
      prev.map((r) =>
        r.disabled
          ? r
          : {
              ...r,
              checked: next,
              total_rows: next ? globalRows : 0,
              total_columns: next ? globalCols : 0,
              room_strength: next ? globalRows * globalCols : 0,
            },
      ),
    );
  }

  function handleRowCheck(idx: number, next: boolean) {
    setVacancyRooms((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        return {
          ...r,
          checked: next,
          total_rows: next ? globalRows : 0,
          total_columns: next ? globalCols : 0,
          room_strength: next ? globalRows * globalCols : 0,
        };
      }),
    );
    setSelectAll(false);
  }

  function handleGlobalRowsCols(rows: number, cols: number) {
    setGlobalRows(rows);
    setGlobalCols(cols);
    setVacancyRooms((prev) =>
      prev.map((r) =>
        r.checked && !r.disabled
          ? {
              ...r,
              total_rows: rows,
              total_columns: cols,
              room_strength: rows * cols,
            }
          : r,
      ),
    );
  }

  function handleRowCol(idx: number, field: "rows" | "cols", value: number) {
    setVacancyRooms((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const total_rows = field === "rows" ? value : (r.total_rows ?? 0);
        const total_columns = field === "cols" ? value : (r.total_columns ?? 0);
        return {
          ...r,
          total_rows,
          total_columns,
          room_strength: total_rows * total_columns,
        };
      }),
    );
  }

  function buildSeatingMatrix(
    room: ExamRoomRow,
    subjectId: number | null,
  ): AnyRow[] {
    const seats: AnyRow[] = [];
    for (let i = 1; i <= (room.total_rows ?? 0); i++) {
      for (let j = 1; j <= (room.total_columns ?? 0); j++) {
        seats.push({
          value: i + 1,
          collegeId: params.collegeId,
          examId: params.examId,
          examTimetableId,
          roomId: room.pk_room_id,
          rowNo: i,
          columnNo: j,
          examseatstatusCatId: seatStatusId,
          studentId: null,
          subjectId,
          isActive: true,
        });
      }
    }
    return seats;
  }

  async function handleSave() {
    if (!examTimetableId) {
      toast.error("Please select an exam timetable.");
      return;
    }
    const checked = vacancyRooms.filter((r) => r.checked && !r.disabled);
    if (checked.length === 0) {
      toast.error("Select at least one room to allot.");
      return;
    }
    const emptyRoom = checked.find(
      (r) => (r.total_rows ?? 0) <= 0 || (r.total_columns ?? 0) <= 0,
    );
    if (emptyRoom) {
      toast.error(
        "Each selected room must have rows and columns greater than 0.",
      );
      return;
    }
    const session = examTimetables.find(
      (t: AnyRow) => Number(t.examTimetableId) === Number(examTimetableId),
    );
    // Spring sometimes returns the relation as either name; cover both.
    const details: AnyRow[] =
      session?.examTimetableDetail ?? session?.examTimetableDetails ?? [];
    const subjectId =
      Number(details?.[0]?.subjectId ?? details?.[0]?.subject_id ?? 0) || null;
    const payload = checked.map((r) => ({
      collegeId: params.collegeId,
      examId: params.examId,
      createdDt: null,
      examTimetableId,
      roomId: r.pk_room_id,
      examDate: toDateStr(examDate),
      priority: r.priority ?? 0,
      totalRows: r.total_rows,
      totalColumns: r.total_columns,
      roomStrength: (r.total_rows ?? 0) * (r.total_columns ?? 0),
      availableSeats: (r.total_rows ?? 0) * (r.total_columns ?? 0),
      blockedSeats: 0,
      bookedSeats: 0,
      isActive: true,
      examRoomStudentAllotmentDTO: buildSeatingMatrix(r, subjectId),
    }));
    setBusy(true);
    const { ok, message } = await createExamRoomAllotments(payload).catch(
      () => ({
        ok: false,
        message: "Network error",
        raw: null,
      }),
    );
    setBusy(false);
    if (ok) {
      toast.success(message || "Room seating plan saved.");
      navigateBack();
    } else {
      toast.error(message || "Failed to save room seating plan.");
    }
  }

  function navigateBack() {
    const qp = new URLSearchParams();
    if (params.collegeId) qp.set("collegeId", String(params.collegeId));
    if (params.courseId) qp.set("courseId", String(params.courseId));
    if (params.academicYearId)
      qp.set("academicYearId", String(params.academicYearId));
    if (params.examId) qp.set("examId", String(params.examId));
    if (params.examTimetableId)
      qp.set("examTimetableId", String(params.examTimetableId));
    const q = qp.toString();
    router.push(
      `/admin-examination-management/admin-exam-masters/seating-plan-setup${q ? `?${q}` : ""}`,
    );
  }

  const examTimetableOptions = useMemo(
    () =>
      examTimetables.map((t: AnyRow) => {
        const subjects = t.subjects ?? t.examTimetableDetail;
        const hasSubjects = Array.isArray(subjects)
          ? subjects.length > 0
          : Boolean(t.examDate);
        const datePart = hasSubjects
          ? String(t.examDate ?? toDateStr(t.examDate) ?? "")
          : "";
        const session = t.examSessionName ?? t.examSession ?? "";
        return {
          value: String(t.examTimetableId),
          label: datePart ? `${datePart} / ${session}` : ` / ${session}`,
        };
      }),
    [examTimetables],
  );

  return (
    <FilteredPage
      title="Add Room Seating Plan"
      filters={
        <>
          <div className="mb-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-[13px]">
            <span className="font-medium text-foreground">Course</span>
            <span className="min-w-0 text-[hsl(var(--primary))]">
              :{" "}
              {[exam?.collegeCode, params.academicYear, params.courseCode]
                .filter(Boolean)
                .join(" / ") || "—"}
            </span>
            <span className="font-medium text-foreground">Exam</span>
            <span className="min-w-0 text-[hsl(var(--primary))]">
              :{" "}
              {exam
                ? `${exam.examName} (${formatExamHeaderDate(exam.fromDate)} - ${formatExamHeaderDate(exam.toDate)})`
                : params.examName || "—"}
            </span>
            <span className="font-medium text-foreground">Exam Type</span>
            <span className="min-w-0 text-[hsl(var(--primary))]">
              : {examTypeLabel}
            </span>
          </div>
          <GlobalFilterBarRow columns={2}>
            <GlobalFilterField label="Choose a exam date">
              <Input
                type="date"
                value={examDate}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Timetable">
              <Select
                value={String(examTimetableId || "")}
                onChange={(v) => setExamTimetableId(Number(v) || 0)}
                options={examTimetableOptions}
                placeholder="Select Exam Timetable"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Campus - Building">
              <Select
                value={String(buildingId || "")}
                onChange={(v) => {
                  setBuildingId(Number(v) || 0);
                  setBlockId(0);
                  setFloorId(0);
                }}
                options={buildings.map((b: AnyRow) => ({
                  value: String(b.buildingId ?? b.id),
                  label: String(
                    b.campusName && b.buildingCode
                      ? `${b.campusName} - ${b.buildingCode}`
                      : (b.buildingName ?? b.name ?? b.buildingCode ?? ""),
                  ),
                }))}
                placeholder="Select Building"
                clearable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Block">
              <Select
                value={String(blockId || "")}
                onChange={(v) => {
                  setBlockId(Number(v) || 0);
                  setFloorId(0);
                }}
                options={blocks.map((b: AnyRow) => ({
                  value: String(b.blockId ?? b.id),
                  label: String(b.blockCode ?? b.blockName ?? b.name ?? ""),
                }))}
                placeholder="Select Block"
                clearable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Floor - No">
              <Select
                value={String(floorId || "")}
                onChange={(v) => setFloorId(Number(v) || 0)}
                options={floors.map((f: AnyRow) => ({
                  value: String(f.floorId ?? f.id),
                  label: String(
                    f.floorName && f.floorNo != null
                      ? `${f.floorName} - ${f.floorNo}`
                      : (f.floorName ?? f.name ?? f.floorCode ?? ""),
                  ),
                }))}
                placeholder="Select Floor"
                clearable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          {roomsLoading && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              Loading rooms…
            </p>
          )}
          {!roomsLoading &&
            examTimetableId > 0 &&
            vacancyRooms.length === 0 && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                No rooms found for the selected building, block, and floor.
              </p>
            )}
        </>
      }
    >
      <RoomAllotmentTable
        rows={vacancyRooms}
        selectAll={selectAll}
        globalRows={globalRows}
        globalCols={globalCols}
        onCheckAll={handleCheckAll}
        onRowCheck={handleRowCheck}
        onRowPriority={handleRowPriority}
        onRowCol={handleRowCol}
        onGlobalRowsCols={handleGlobalRowsCols}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-6"
          onClick={navigateBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="h-8 px-6"
          disabled={busy}
          onClick={handleSave}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </FilteredPage>
  );
}
