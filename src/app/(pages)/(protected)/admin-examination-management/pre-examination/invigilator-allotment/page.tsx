"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { toDateStr } from "@/common/generic-functions";
import {
  autoAssignInvigilators,
  flattenExamRoomAllotmentRow,
  getUnivExamFiltersRegSup,
  listAcademicYearsByUniversity,
  listActiveColleges,
  listCoursesByUniversity,
  listExamInvigilationAllotments,
  listExamMastersByCourseAndAy,
  listExamRoomAllotments,
  listExamTimetablesByExam,
  listInvigilatorDesignations,
} from "@/services";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  InvigilatorAllotmentModal,
  type InvigilatorModalContext,
  type InvigilatorModalRoom,
} from "./InvigilatorAllotmentModal";

type AnyRow = Record<string, any>;
const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
};
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ROOM_ID_KEYS = [
  "roomId",
  "fk_room_id",
  "fkRoomId",
  "pk_room_id",
] as const;

function resolveRoomId(row: AnyRow | null | undefined): number {
  if (!row) return 0;
  const top = pickNum(row, [...ROOM_ID_KEYS]);
  if (top > 0) return top;
  const nested = row.room ?? row.Room;
  return pickNum(nested, [...ROOM_ID_KEYS]);
}

/**
 * Angular `SelectedTimetabelEmployees` — attach invigilations to room tiles,
 * and push invigilation-only rooms (examRoomAllotmentId null) into the list.
 */
function mergeRoomsWithInvigilations(
  roomAllotments: AnyRow[],
  invigilations: AnyRow[],
): AnyRow[] {
  const rooms: AnyRow[] = roomAllotments.map((r) => {
    const flat = flattenExamRoomAllotmentRow(r);
    return {
      ...flat,
      examInvigilationAllotmentsList: [] as AnyRow[],
    };
  });

  for (const inv of invigilations) {
    const roomId = resolveRoomId(inv);
    if (!roomId) continue;
    const existing = rooms.find((r) => resolveRoomId(r) === roomId);
    if (existing) {
      const list = Array.isArray(existing.examInvigilationAllotmentsList)
        ? existing.examInvigilationAllotmentsList
        : [];
      list.push(inv);
      existing.examInvigilationAllotmentsList = list;
    } else {
      rooms.push({
        roomId,
        roomName: pickText(inv, ["roomName", "room_name"]),
        roomCode: pickText(inv, ["roomCode", "room_code"]),
        buildingCode: pickText(inv, ["buildingCode", "building_code"]),
        blockCode: pickText(inv, ["blockCode", "block_code"]),
        floorNo: inv.floorNo ?? inv.floor_no ?? "",
        examRoomAllotmentId: null,
        examInvigilationAllotmentsList: [inv],
      });
    }
  }
  return rooms;
}

/** Angular invigilator-allotment.component — hover “Employee Details” tooltip. */
function EmployeeDetailsTooltip({
  name,
  empNumber,
  dept,
  mobile,
  children,
}: {
  name: string;
  empNumber: string;
  dept: string;
  mobile: string;
  children: ReactNode;
}) {
  return (
    <div className="group/emp relative overflow-hidden hover:z-20 hover:overflow-visible">
      {children}
      <div
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[190px] max-w-[200px] border border-slate-700 bg-white p-3 text-[10px] leading-tight tracking-wide text-black opacity-0 shadow-[0_5px_25px_5px_rgba(205,210,214,0.8)] transition-opacity duration-300 group-hover/emp:opacity-100"
        role="tooltip"
      >
        <h5 className="mb-2.5 mt-0.5 bg-[#00bcd433] py-[7px] text-center text-[11px] font-semibold">
          Employee Details
        </h5>
        <span className="block font-semibold text-black">Name :</span>
        {name || "-"} {empNumber ? <small>({empNumber})</small> : null}
        <p className="mb-0 mt-1">
          <span className="font-semibold text-black">Dept :</span> {dept || "-"}
        </p>
        <p className="mb-0 mt-1">
          <span className="font-semibold text-black">Mobile :</span>{" "}
          {mobile || "-"}
        </p>
      </div>
    </div>
  );
}

function getExamTimetableParts(row: AnyRow): {
  examDate: string;
  session: string;
} {
  const rawDate = String(
    row?.examDate ??
      row?.exam_date ??
      row?.examdate ??
      row?.exam_timetable_date ??
      row?.timetableDate ??
      row?.date ??
      "",
  ).trim();
  const examDateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
  const examDate = examDateMatch
    ? examDateMatch[0]
    : rawDate
      ? toDateStr(rawDate)
      : "";
  const session = String(
    row?.examSessionName ??
      row?.examsessioninCatCode ??
      row?.exam_session_name ??
      row?.examSession ??
      row?.sessionName ??
      row?.session_name ??
      row?.session ??
      "SESSION",
  )
    .trim()
    .toUpperCase();
  return { examDate, session };
}

export default function InvigilatorAllotmentPage() {
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examTimetables, setExamTimetables] = useState<AnyRow[]>([]);
  const [invigDesgs, setInvigDesgs] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examTimetableId, setExamTimetableId] = useState<number | null>(null);

  const [rooms, setRooms] = useState<AnyRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState<InvigilatorModalRoom | null>(null);
  const [modalInitialRows, setModalInitialRows] = useState<AnyRow[]>([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    async function loadBase() {
      const empId = Number(
        globalThis?.localStorage?.getItem("employeeId") ?? 0,
      );
      setEmployeeId(Number.isFinite(empId) ? empId : 0);
      const [clg, desg] = await Promise.all([
        listActiveColleges().catch(() => []),
        listInvigilatorDesignations().catch(() => []),
      ]);
      const fRows = await getUnivExamFiltersRegSup(
        Number.isFinite(empId) ? empId : 0,
      ).catch(() => []);
      const c = Array.isArray(clg) ? clg : [];
      setColleges(c);
      setInvigDesgs(Array.isArray(desg) ? desg : []);
      setFilterRows(Array.isArray(fRows) ? fRows : []);
      const firstCollegeId = pickNum(c[0], [
        "collegeId",
        "fk_college_id",
        "fk_collegeId",
      ]);
      if (firstCollegeId > 0) setCollegeId(firstCollegeId);
    }
    loadBase();
  }, []);

  useEffect(() => {
    async function onCollege() {
      setAcademicYears([]);
      setCourses([]);
      setExams([]);
      setExamTimetables([]);
      setRooms([]);
      setAcademicYearId(null);
      setCourseId(null);
      setExamId(null);
      setExamTimetableId(null);
      setModalOpen(false);
      setModalRoom(null);
      if (!collegeId) return;
      const selected = colleges.find(
        (c) =>
          pickNum(c, ["collegeId", "fk_college_id", "fk_collegeId"]) ===
          Number(collegeId),
      );
      const uniId = pickNum(selected, [
        "universityId",
        "fk_university_id",
        "fkUniversityId",
        "fk_universityId",
      ]);
      const [ays, crs] = uniId
        ? await Promise.all([
            listAcademicYearsByUniversity(uniId).catch(() => []),
            listCoursesByUniversity(uniId).catch(() => []),
          ])
        : [[], []];
      let ay = Array.isArray(ays) ? ays : [];
      let co = Array.isArray(crs) ? crs : [];
      if ((ay.length === 0 || co.length === 0) && filterRows.length > 0) {
        const scoped = filterRows.filter((r) => {
          const cid = pickNum(r, [
            "fk_college_id",
            "collegeId",
            "fk_collegeId",
          ]);
          return cid === 0 || cid === Number(collegeId);
        });
        if (ay.length === 0) {
          ay = dedupeBy(
            scoped.filter(
              (r) =>
                pickNum(r, [
                  "fk_academic_year_id",
                  "academicYearId",
                  "fk_academicYearId",
                ]) > 0,
            ),
            (r) =>
              pickNum(r, [
                "fk_academic_year_id",
                "academicYearId",
                "fk_academicYearId",
              ]),
          );
        }
        if (co.length === 0) {
          co = dedupeBy(
            scoped.filter(
              (r) =>
                pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) > 0,
            ),
            (r) => pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]),
          );
        }
      }
      setAcademicYears(ay);
      setCourses(co);
      const firstAy = pickNum(ay[0], [
        "academicYearId",
        "fk_academic_year_id",
        "fk_academicYearId",
      ]);
      const firstCourse = pickNum(co[0], [
        "courseId",
        "fk_course_id",
        "fk_courseId",
      ]);
      if (firstAy > 0) setAcademicYearId(firstAy);
      if (firstCourse > 0) setCourseId(firstCourse);
    }
    onCollege();
  }, [collegeId, colleges]);

  useEffect(() => {
    async function onCourseAy() {
      setExams([]);
      setExamTimetables([]);
      setRooms([]);
      setExamId(null);
      setExamTimetableId(null);
      if (!courseId || !academicYearId) return;
      const list = await listExamMastersByCourseAndAy(
        courseId,
        academicYearId,
      ).catch(() => []);
      let rows = Array.isArray(list) ? list : [];
      if (rows.length === 0 && filterRows.length > 0) {
        rows = dedupeBy(
          filterRows.filter(
            (r) =>
              pickNum(r, ["fk_course_id", "courseId", "fk_courseId"]) ===
                Number(courseId) &&
              pickNum(r, [
                "fk_academic_year_id",
                "academicYearId",
                "fk_academicYearId",
              ]) === Number(academicYearId) &&
              pickNum(r, ["fk_exam_id", "examId", "fk_examId"]) > 0,
          ),
          (r) => pickNum(r, ["fk_exam_id", "examId", "fk_examId"]),
        );
      }
      setExams(rows);
    }
    onCourseAy();
  }, [courseId, academicYearId, filterRows]);

  useEffect(() => {
    async function onExam() {
      setExamTimetables([]);
      setRooms([]);
      setExamTimetableId(null);
      setModalOpen(false);
      setModalRoom(null);
      if (!examId) return;
      const list = await listExamTimetablesByExam(examId).catch(() => []);
      let rows = (Array.isArray(list) ? list : []).sort(
        (a, b) =>
          new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
      );
      if (rows.length === 0 && filterRows.length > 0) {
        const fallbackRows = dedupeBy(
          filterRows
            .filter(
              (r) =>
                pickNum(r, ["fk_exam_id", "examId", "fk_examId"]) ===
                Number(examId),
            )
            .map((r) => {
              const ttId = pickNum(r, [
                "examTimetableId",
                "exam_timetable_id",
                "fk_exam_timetable_id",
              ]);
              const parts = getExamTimetableParts(r);
              return {
                examTimetableId: ttId,
                examDate: parts.examDate,
                examSessionName: parts.session,
              };
            })
            .filter((r) => r.examTimetableId > 0 && r.examDate),
          (r) => Number(r.examTimetableId),
        );
        rows = fallbackRows;
      }
      setExamTimetables(rows);
      if (rows.length > 0) {
        const firstId = pickNum(rows[0], [
          "examTimetableId",
          "exam_timetable_id",
          "fk_exam_timetable_id",
        ]);
        if (firstId > 0) setExamTimetableId(firstId);
      }
    }
    onExam();
  }, [examId, filterRows]);

  async function refreshAllotments() {
    if (!examTimetableId || !collegeId || !examId) return;
    setLoadingRooms(true);
    try {
      const [ra, ia] = await Promise.all([
        listExamRoomAllotments(collegeId, examId, examTimetableId).catch(
          () => [],
        ),
        listExamInvigilationAllotments(examTimetableId, collegeId).catch(
          () => [],
        ),
      ]);
      setRooms(
        mergeRoomsWithInvigilations(
          Array.isArray(ra) ? ra : [],
          Array.isArray(ia) ? ia : [],
        ),
      );
    } finally {
      setLoadingRooms(false);
    }
  }

  useEffect(() => {
    setModalOpen(false);
    setModalRoom(null);
    setModalInitialRows([]);
    if (!examTimetableId || !collegeId || !examId) {
      setRooms([]);
      return;
    }
    void refreshAllotments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on filter triad only
  }, [examTimetableId, collegeId, examId]);

  const selectedCollege = colleges.find(
    (c) =>
      pickNum(c, ["collegeId", "fk_college_id", "fk_collegeId"]) ===
      Number(collegeId),
  );
  const selectedCourse = courses.find(
    (c) =>
      pickNum(c, ["courseId", "fk_course_id", "fk_courseId"]) ===
      Number(courseId),
  );
  const selectedExam = exams.find(
    (e) => pickNum(e, ["examId", "fk_exam_id", "fk_examId"]) === Number(examId),
  );
  const selectedTimetable = examTimetables.find(
    (t) =>
      pickNum(t, ["examTimetableId", "exam_timetable_id"]) ===
      Number(examTimetableId),
  );
  const selectedAcademicYear = academicYears.find(
    (a) =>
      pickNum(a, [
        "academicYearId",
        "fk_academic_year_id",
        "fk_academicYearId",
      ]) === Number(academicYearId),
  );
  const modalContext = useMemo<InvigilatorModalContext | null>(() => {
    if (!collegeId || !examTimetableId) return null;
    return {
      collegeId: Number(collegeId),
      examTimetableId: Number(examTimetableId),
      collegeCode: pickText(selectedCollege, ["collegeCode", "college_code"]),
      courseCode: pickText(selectedCourse, ["courseCode", "course_code"]),
      academicYear: pickText(selectedAcademicYear, [
        "academicYear",
        "academic_year",
      ]),
      examName: pickText(selectedExam, ["examName", "exam_name"]),
      examDate: toDateStr(selectedTimetable?.examDate),
    };
  }, [
    collegeId,
    examTimetableId,
    selectedCollege,
    selectedCourse,
    selectedAcademicYear,
    selectedExam,
    selectedTimetable,
  ]);
  const observer = useMemo(() => {
    for (const room of rooms) {
      const list = Array.isArray(room.examInvigilationAllotmentsList)
        ? room.examInvigilationAllotmentsList
        : [];
      const found = list.find(
        (x: AnyRow) =>
          String(x.invgdesignationCatCode ?? "").toUpperCase() === "OBSERVER",
      );
      if (found) return found;
    }
    return null;
  }, [rooms]);
  const colorByDesignationId = useMemo(() => {
    const colors = [
      "#03A9F4",
      "#E91E63",
      "#1EE939",
      "#E9D51E",
      "#B47D15",
      "#E97C23",
    ];
    const map = new Map<number, string>();
    invigDesgs.forEach((d, idx) => {
      const id = Number(d.generalDetailId ?? 0);
      if (id > 0) map.set(id, colors[idx % colors.length]);
    });
    return map;
  }, [invigDesgs]);

  function openRoomModal(room: AnyRow) {
    const flat = flattenExamRoomAllotmentRow(room);
    const roomId = resolveRoomId(flat);
    if (!roomId) {
      toastError(
        "Room id is missing for this allotment. Cannot open invigilator form.",
      );
      return;
    }
    const list = Array.isArray(room.examInvigilationAllotmentsList)
      ? room.examInvigilationAllotmentsList
      : [];
    setModalRoom({
      roomId,
      roomName: pickText(flat, ["roomName", "room_name"]),
      roomCode: pickText(flat, ["roomCode", "room_code"]),
      buildingCode: pickText(flat, ["buildingCode", "building_code"]),
      blockCode: pickText(flat, ["blockCode", "block_code"]),
      floorNo: flat.floorNo ?? flat.floor_no,
    });
    setModalInitialRows(
      list.map((r: AnyRow) => ({
        ...r,
        dataDetails: "oldRoom",
        examTimeTableId: Number(examTimetableId),
        examTimetableId: Number(examTimetableId),
        collegeId: Number(collegeId),
        roomId,
      })),
    );
    setModalOpen(true);
  }

  async function onAutoAssign() {
    if (!examTimetableId || !examId) return;
    setAutoAssigning(true);
    try {
      // Angular autoAssign(): snotify success with result.message for both
      // success:true and success:false (e.g. "No Records(s) found.").
      const result = await autoAssignInvigilators({
        examTimetableId,
        examId,
        userId: employeeId,
      });
      await refreshAllotments();
      const msg = String(result?.message ?? "").trim();
      toastSuccess(msg || "Invigilators auto-assigned successfully");
    } catch (e: unknown) {
      toastError(e, "Auto assign failed");
    } finally {
      setAutoAssigning(false);
    }
  }

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="College">
        <Select
          value={collegeId ? String(collegeId) : null}
          onChange={(v) => setCollegeId(v ? Number(v) : null)}
          options={colleges.map((c, i) => {
            const id = pickNum(c, [
              "collegeId",
              "fk_college_id",
              "fk_collegeId",
            ]);
            return {
              value: String(id || i),
              label:
                pickText(c, [
                  "collegeCode",
                  "college_code",
                  "collegeName",
                  "college_name",
                ]) || "-",
            };
          })}
          placeholder="College"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Year">
        <Select
          value={academicYearId ? String(academicYearId) : null}
          onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
          options={academicYears.map((a, i) => {
            const id = pickNum(a, [
              "academicYearId",
              "fk_academic_year_id",
              "fk_academicYearId",
            ]);
            return {
              value: String(id || i),
              label: pickText(a, ["academicYear", "academic_year"]) || "-",
            };
          })}
          placeholder="Exam Year"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Course">
        <Select
          value={courseId ? String(courseId) : null}
          onChange={(v) => setCourseId(v ? Number(v) : null)}
          options={courses.map((c, i) => {
            const id = pickNum(c, ["courseId", "fk_course_id", "fk_courseId"]);
            return {
              value: String(id || i),
              label:
                pickText(c, [
                  "courseCode",
                  "course_code",
                  "courseName",
                  "course_name",
                ]) || "-",
            };
          })}
          placeholder="Course"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam">
        <Select
          value={examId ? String(examId) : null}
          onChange={(v) => setExamId(v ? Number(v) : null)}
          options={exams.map((e, i) => {
            const id = pickNum(e, ["examId", "fk_exam_id", "fk_examId"]);
            return {
              value: String(id || i),
              label: pickText(e, ["examName", "exam_name"]) || "-",
            };
          })}
          placeholder="Exam"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Timetable">
        <Select
          value={examTimetableId ? String(examTimetableId) : null}
          onChange={(v) => setExamTimetableId(v ? Number(v) : null)}
          options={examTimetables.map((t, i) => {
            const id = pickNum(t, ["examTimetableId", "exam_timetable_id"]);
            return {
              value: String(id || i),
              label: `${toDateStr(t.examDate)} (${pickText(t, ["examSessionName", "exam_session_name"]) || "-"})`,
            };
          })}
          placeholder="Exam Timetable"
        />
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  const body = examTimetableId ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-semibold tracking-tight">
          Exam Allocated Rooms List (
          {pickText(selectedCollege, ["collegeCode", "college_code"]) || "-"} /{" "}
          {pickText(selectedCourse, ["courseCode", "course_code"]) || "-"} /{" "}
          {pickText(selectedExam, ["examName", "exam_name"]) || "-"} /{" "}
          {toDateStr(selectedTimetable?.examDate) || "-"})
        </div>
        <Button
          className="h-8 text-[12px]"
          onClick={onAutoAssign}
          disabled={autoAssigning || loadingRooms}
        >
          {autoAssigning ? "Assigning..." : "Auto Assign Invigilators"}
        </Button>
      </div>

      <div className="text-[12px]">
        <span className="font-medium text-blue-700">
          INVIGILATOR DESIGNATIONS:
        </span>{" "}
        {invigDesgs.map((d) => d.generalDetailCode).join(", ") || "-"}
      </div>

      <div className="rounded border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-[12px]">
        <span className="font-semibold text-fuchsia-700">OBSERVER:</span>{" "}
        {observer
          ? `${observer.invigilatorEmpName ?? "-"} (${observer.invigilatorEmpNumber ?? "-"})`
          : "currently no observer"}
      </div>

      {loadingRooms ? (
        <div className="py-8 text-center text-[12px] text-muted-foreground">
          Loading rooms…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-visible md:grid-cols-3">
          {rooms.map((r, i) => {
            const roomId = resolveRoomId(r);
            const list: AnyRow[] = Array.isArray(
              r.examInvigilationAllotmentsList,
            )
              ? r.examInvigilationAllotmentsList
              : [];
            const invigilators = list.filter(
              (x) =>
                String(x.invgdesignationCatCode ?? "").toUpperCase() ===
                "INVIGILATOR",
            );
            const roomTitle =
              pickText(r, ["roomName", "room_name", "roomCode", "room_code"]) ||
              "-";
            return (
              <div
                key={`room-${roomId || i}`}
                role="button"
                tabIndex={0}
                onClick={() => openRoomModal(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRoomModal(r);
                  }
                }}
                className="cursor-pointer overflow-visible rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="font-semibold text-[13px]">{roomTitle}</div>
                <div className="text-[11px] text-muted-foreground">
                  {[r.buildingCode, r.blockCode, r.floorNo]
                    .filter((x) => x != null && String(x).trim() !== "")
                    .join(" / ")}
                </div>
                <div className="mt-2 space-y-1 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-600">
                      INVIGILATOR
                    </span>
                    <button
                      type="button"
                      className="text-[11px] text-blue-700 underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRoomModal(r);
                      }}
                    >
                      + Add
                    </button>
                  </div>
                  {invigilators.map((x, idx) => (
                    <EmployeeDetailsTooltip
                      key={`inv-${roomId}-${idx}`}
                      name={pickText(x, [
                        "invigilatorEmpName",
                        "employeeName",
                        "firstName",
                      ])}
                      empNumber={pickText(x, [
                        "invigilatorEmpNumber",
                        "empNumber",
                        "employeeCode",
                      ])}
                      dept={pickText(x, [
                        "empDeptName",
                        "departmentName",
                        "deptName",
                      ])}
                      mobile={pickText(x, [
                        "mobile",
                        "mobileNumber",
                        "mobileNo",
                      ])}
                    >
                      <div
                        className="rounded border px-2 py-1"
                        style={{
                          backgroundColor: `${colorByDesignationId.get(Number(x.invgdesignationCatId ?? 0)) ?? "#E2E8F0"}22`,
                          borderColor:
                            colorByDesignationId.get(
                              Number(x.invgdesignationCatId ?? 0),
                            ) ?? "#CBD5E1",
                        }}
                      >
                        {x.invigilatorEmpName}{" "}
                        <span className="text-muted-foreground">
                          ({x.invigilatorEmpNumber})
                        </span>
                      </div>
                    </EmployeeDetailsTooltip>
                  ))}
                  {invigilators.length === 0 && (
                    <div className="text-muted-foreground">
                      No invigilator allocated
                    </div>
                  )}
                </div>
                {r.examRoomAllotmentId == null && (
                  <div className="mt-2 text-[11px] text-amber-700">
                    This room not allocated to timetable
                  </div>
                )}
              </div>
            );
          })}
          {rooms.length === 0 && (
            <div className="col-span-full text-[12px] text-muted-foreground">
              No allocated rooms found
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="py-6 text-center text-[13px] text-muted-foreground">
      Select College, Exam Year, Course, Exam and Exam Timetable to view rooms.
    </div>
  );

  return (
    <FilteredPage
      title="Exam Invigilator Allotment"
      filters={filters}
      body={body}
    >
      <InvigilatorAllotmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalRoom(null);
          setModalInitialRows([]);
        }}
        context={modalContext}
        room={modalRoom}
        initialRows={modalInitialRows}
        invigDesgs={invigDesgs}
        onSaved={refreshAllotments}
      />
    </FilteredPage>
  );
}
