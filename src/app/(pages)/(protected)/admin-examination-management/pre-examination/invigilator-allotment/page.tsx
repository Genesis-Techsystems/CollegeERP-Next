"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { toDateStr } from "@/common/generic-functions";
import {
  autoAssignInvigilators,
  getUnivExamFiltersRegSup,
  listAcademicYearsByUniversity,
  listActiveColleges,
  listCoursesByUniversity,
  listExamInvigilationAllotments,
  listExamMastersByCourseAndAy,
  listExamRoomAllotments,
  listExamTimetablesByExam,
  listInvigilatorDesignations,
} from "@/services/pre-examination";
import { FilteredPage } from "@/components/layout";
import { GlobalFilterBarRow, GlobalFilterField } from "@/common/components/forms";
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
  const [invigilations, setInvigilations] = useState<AnyRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState<InvigilatorModalRoom | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);

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
      setInvigilations([]);
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
      setInvigilations([]);
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
      setInvigilations([]);
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

  useEffect(() => {
    async function onTimetable() {
      setRooms([]);
      setInvigilations([]);
      setModalOpen(false);
      setModalRoom(null);
      if (!examTimetableId || !collegeId || !examId) return;
      const [ra, ia] = await Promise.all([
        listExamRoomAllotments(collegeId, examId, examTimetableId).catch(
          () => [],
        ),
        listExamInvigilationAllotments(examTimetableId, collegeId).catch(
          () => [],
        ),
      ]);
      setRooms(Array.isArray(ra) ? ra : []);
      setInvigilations(Array.isArray(ia) ? ia : []);
    }
    onTimetable();
  }, [examTimetableId, collegeId, examId]);

  const byRoom = useMemo(() => {
    const map = new Map<number, AnyRow[]>();
    for (const i of invigilations) {
      const id = Number(i.roomId ?? i.room?.roomId ?? 0);
      if (!id) continue;
      const arr = map.get(id) ?? [];
      arr.push(i);
      map.set(id, arr);
    }
    return map;
  }, [invigilations]);

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
  const modalInitialRows = useMemo(() => {
    if (!modalRoom?.roomId) return [];
    return byRoom.get(Number(modalRoom.roomId)) ?? [];
  }, [byRoom, modalRoom]);
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
    const all = invigilations.filter(
      (x) =>
        String(x.invgdesignationCatCode ?? "").toUpperCase() === "OBSERVER",
    );
    return all[0] ?? null;
  }, [invigilations]);
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
    const roomId = Number(room.roomId ?? 0);
    if (!roomId) return;
    setModalRoom({
      roomId,
      roomName: pickText(room, ["roomName", "room_name"]),
      roomCode: pickText(room, ["roomCode", "room_code"]),
      buildingCode: pickText(room, ["buildingCode", "building_code"]),
      blockCode: pickText(room, ["blockCode", "block_code"]),
      floorNo: room.floorNo ?? room.floor_no,
    });
    setModalOpen(true);
  }

  async function refreshAllotments() {
    if (!examTimetableId || !collegeId || !examId) return;
    const [ra, ia] = await Promise.all([
      listExamRoomAllotments(collegeId, examId, examTimetableId).catch(
        () => [],
      ),
      listExamInvigilationAllotments(examTimetableId, collegeId).catch(
        () => [],
      ),
    ]);
    setRooms(Array.isArray(ra) ? ra : []);
    setInvigilations(Array.isArray(ia) ? ia : []);
  }

  async function onAutoAssign() {
    if (!examTimetableId) return;
    setAutoAssigning(true);
    try {
      await autoAssignInvigilators(examTimetableId);
      await refreshAllotments();
      alert("Invigilators auto-assigned successfully");
    } catch (e: any) {
      alert(e?.message ?? "Auto assign failed");
    } finally {
      setAutoAssigning(false);
    }
  }

  return (
    <FilteredPage
      title="Invigilation Allotment"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : 0)}
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
              onChange={(v) => setAcademicYearId(v ? Number(v) : 0)}
              options={academicYears.map((a, i) => {
                const id = pickNum(a, [
                  "academicYearId",
                  "fk_academic_year_id",
                  "fk_academicYearId",
                ]);
                return {
                  value: String(id || i),
                  label:
                    pickText(a, ["academicYear", "academic_year"]) || "-",
                };
              })}
              placeholder="Exam Year"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : 0)}
              options={courses.map((c, i) => {
                const id = pickNum(c, [
                  "courseId",
                  "fk_course_id",
                  "fk_courseId",
                ]);
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
              onChange={(v) => setExamId(v ? Number(v) : 0)}
              options={exams.map((e, i) => {
                const id = pickNum(e, ["examId", "fk_exam_id", "fk_examId"]);
                return {
                  value: String(id || i),
                  label: pickText(e, ["examName", "exam_name"]) || "-",
                };
              })}
              placeholder="Exam"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Timetable">
            <Select
              value={examTimetableId ? String(examTimetableId) : null}
              onChange={(v) => setExamTimetableId(v ? Number(v) : 0)}
              options={examTimetables.map((t, i) => {
                const id = pickNum(t, [
                  "examTimetableId",
                  "exam_timetable_id",
                ]);
                return {
                  value: String(id || i),
                  label: `${toDateStr(t.examDate)} (${pickText(t, ["examSessionName", "exam_session_name"]) || "-"})`,
                };
              })}
              placeholder="Exam Timetable"
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      {examTimetableId && (
        <>
          <div className="app-card p-3 flex items-center justify-between">
            <div className="text-[12px]">
              Exam Allocated Rooms List ({selectedCollege?.collegeCode ?? ""} /{" "}
              {selectedCourse?.courseCode ?? ""} /{" "}
              {selectedExam?.examName ?? ""} /{" "}
              {toDateStr(selectedTimetable?.examDate)})
            </div>
            <Button
              className="h-8 text-[12px]"
              onClick={onAutoAssign}
              disabled={autoAssigning}
            >
              {autoAssigning ? "Assigning..." : "Auto Assign Invigilators"}
            </Button>
          </div>

          <div className="app-card p-4">
            <div className="text-[12px] mb-3">
              <span className="text-blue-700 font-medium">
                INVIGILATOR DESIGNATIONS:
              </span>{" "}
              {invigDesgs.map((d) => d.generalDetailCode).join(", ")}
            </div>
            <div className="mb-4 rounded border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-[12px]">
              <span className="font-semibold text-fuchsia-700">OBSERVER:</span>{" "}
              {observer
                ? `${observer.invigilatorEmpName ?? "-"} (${observer.invigilatorEmpNumber ?? "-"})`
                : "currently no observer"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rooms.map((r, i) => {
                const roomId = Number(r.roomId ?? 0);
                const list = byRoom.get(roomId) ?? [];
                return (
                  <div
                    key={`room-${roomId || i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRoomModal(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openRoomModal(r)
                      }
                    }}
                    className="cursor-pointer rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="font-semibold text-[13px]">
                      {r.roomName ?? r.roomCode ?? "-"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.buildingCode ?? ""}{" "}
                      {r.blockCode ? ` / ${r.blockCode}` : ""}{" "}
                      {r.floorNo ? ` / ${r.floorNo}` : ""}
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
                      {list
                        .filter(
                          (x) =>
                            String(x.invgdesignationCatCode).toUpperCase() ===
                            "INVIGILATOR",
                        )
                        .map((x, idx) => (
                          <div
                            key={`inv-${idx}`}
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
                        ))}
                      {list.filter(
                        (x) =>
                          String(x.invgdesignationCatCode).toUpperCase() ===
                          "INVIGILATOR",
                      ).length === 0 && (
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
                <div className="text-[12px] text-muted-foreground">
                  No allocated rooms found
                </div>
              )}
            </div>
          </div>

          <InvigilatorAllotmentModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setModalRoom(null);
            }}
            context={modalContext}
            room={modalRoom}
            initialRows={modalInitialRows}
            invigDesgs={invigDesgs}
            onSaved={refreshAllotments}
          />
        </>
      )}
    </FilteredPage>
  );
}
