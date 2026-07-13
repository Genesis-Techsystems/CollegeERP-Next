"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  getExamRegistrationForm,
  getStudentAcademicBatches,
  getStudentSubjectsForRegularExam,
  getStudentSubjectsForSupplyExam,
  listExamFeeTypes,
  listExamMastersByCourse,
  listStudents,
  saveRegisteredExamSubjects,
  uploadExamRegForms,
} from "@/services/pre-examination";
import { MINIO_URL } from "@/config/constants/api";
import { FilteredPage } from "@/components/layout";
import { GlobalFilterBarRow } from "@/common/components/forms";

type AnyRow = Record<string, any>;

function useStateRef<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const ref = useRef<T>(state);
  ref.current = state;
  return [state, setState, ref] as const;
}

const isEmptyObject = (o: AnyRow | null | undefined) =>
  !o || Object.keys(o).length === 0;
const subId = (s: AnyRow) =>
  Number(s?.subjectId ?? s?.fk_subject_id ?? s?.subject_id ?? 0);
const g = (r: AnyRow | null | undefined, keys: string[]): string => {
  if (!r) return "";
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};
const n = (r: AnyRow | null | undefined, keys: string[]): number => {
  if (!r) return 0;
  for (const k of keys) {
    const v = Number(r[k]);
    if (v > 0) return v;
  }
  return 0;
};
function fmtDate(v: unknown): string {
  const s = v ? String(v).slice(0, 10) : "";
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(v ?? "");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_CLASS: Record<string, string> = {
  DTND: "text-red-600 font-bold",
  INCOLLEGE: "text-green-700 font-bold",
  PASSEDOUT: "text-[#461eb6] font-bold",
  DETAINRECOMMENDED: "text-orange-600 font-bold",
  DISCONTINUED: "text-red-600 font-bold",
};

export default function ExamRegistrationManualFeelessPage() {
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const studentsRef = useRef<AnyRow[]>([]);
  studentsRef.current = students;
  const [studentId, setStudentId] = useState<number | null>(null);
  const [student, setStudent, studentRef] = useStateRef<AnyRow>({});
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [examId, setExamId, examIdRef] = useStateRef<number | null>(null);
  const [flag, setFlag] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const [, setExamFeeTypes, examFeeTypesRef] = useStateRef<AnyRow[]>([]);
  const [, setCourseYearsList, courseYearsListRef] = useStateRef<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [courseYearId, setCourseYearId, courseYearIdRef] = useStateRef<
    number | null
  >(null);
  const [checkExam, setCheckExam, checkExamRef] = useStateRef<1 | 2>(1);
  const studentCurrentCourseYearIdRef = useRef<number | null>(null);

  const [studentSubjects, setStudentSubjects, studentSubjectsRef] = useStateRef<
    AnyRow[]
  >([]);
  const [checksubject, setChecksubject] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [regSubjects, setRegSubjects] = useState<AnyRow[]>([]);

  const [courseYearFee, setCourseYearFee, courseYearFeeRef] = useStateRef<
    AnyRow[]
  >([]);
  const [saving, setSaving] = useState(false);

  // pay-confirm dialog
  const [payOpen, setPayOpen] = useState(false);
  const payReceiptsRef = useRef<AnyRow[]>([]);
  const [payFile, setPayFile] = useState<File | null>(null);

  // upload-papers dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile2, setUploadFile2] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // view-subjects dialog
  const [viewSubjOpen, setViewSubjOpen] = useState(false);
  const [viewSubjRows, setViewSubjRows] = useState<AnyRow[]>([]);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const structureExamCode = checkExam === 1 ? "Regular" : "Supple";

  const selectedSubjects = useMemo(
    () => studentSubjects.filter((s) => s.isSelected),
    [studentSubjects],
  );
  const selectedCount = selectedSubjects.length;

  const filteredSubjects = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return studentSubjects;
    return studentSubjects.filter((s) =>
      `${s.shortName ?? ""} ${s.subjectName ?? ""} ${s.subjectCode ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [studentSubjects, searchText]);

  const studentRegSubject = useMemo(
    () =>
      regSubjects
        .map(
          (s) =>
            `${g(s, ["shortName", "subjectCode"])} - ${g(s, ["subjectCode"])}`,
        )
        .join(", "),
    [regSubjects],
  );

  // ===== INIT =====
  useEffect(() => {
    void (async () => {
      const types = await listExamFeeTypes().catch(() => []);
      setExamFeeTypes(Array.isArray(types) ? types : []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== STUDENT SEARCH =====
  async function enteredStudent(term: string) {
    const q = (term ?? "").trim();
    if (!q) {
      setStudents([]);
      return;
    }
    if (q.length < 5) return;
    setStudentSearchLoading(true);
    try {
      const list = await listStudents(q).catch(() => []);
      setStudents(Array.isArray(list) ? list : []);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  async function selectedStudent(sid: number | null, row: AnyRow | null) {
    setPhotoError(false);
    setExamsList([]);
    setExamId(null);
    setFlag(false);
    setCourseYears([]);
    setCourseYearId(null);
    setStudentSubjects([]);
    setRegSubjects([]);
    setCourseYearFee([]);
    setCheckExam(1);
    checkExamRef.current = 1;
    setStudentId(sid);

    if (!sid || !row) {
      studentRef.current = {} as AnyRow;
      setStudent({} as AnyRow);
      return;
    }

    setStudents((prev) =>
      prev.some((x) => Number(x.studentId) === sid) ? prev : [...prev, row],
    );
    const found = row;
    studentRef.current = found;
    setStudent(found);
    studentCurrentCourseYearIdRef.current = Number(found.courseYearId);

    const batches = await getStudentAcademicBatches(sid).catch(() => []);
    const byFrom = new Map<number, AnyRow>();
    for (const b of Array.isArray(batches) ? batches : [])
      byFrom.set(Number(b.fromCourseYearId), b);
    const cyList = [...byFrom.values()];
    courseYearsListRef.current = cyList;
    setCourseYearsList(cyList);

    const exams = await listExamMastersByCourse(Number(found.courseId)).catch(
      () => [],
    );
    setExamsList(
      (Array.isArray(exams) ? exams : []).filter((e) => !e.isInternalExam),
    );
  }

  // ===== SELECT EXAM =====
  function selectedExternalExam(eid: number) {
    setFlag(true);
    setStudentSubjects([]);
    setRegSubjects([]);
    setCourseYearFee([]);
    supplyCourseYears(checkExamRef.current, eid);
  }

  function supplyCourseYears(type: 1 | 2, eid: number) {
    const stu = studentRef.current;
    const cyList = courseYearsListRef.current;
    if (type === 1) {
      const cys = cyList.filter(
        (x) => Number(x.fromCourseYearId) === Number(stu.courseYearId),
      );
      setCourseYears(cys);
      if (cys.length > 0) {
        const cyId = Number(stu.courseYearId);
        setCourseYearId(cyId);
        courseYearIdRef.current = cyId;
        void getStudentSubjects(cyId, eid, false);
      } else {
        toast.info("No Course Years for Regular.");
      }
    } else {
      const cys = cyList.filter(
        (x) => Number(x.fromCourseYearId) !== Number(stu.courseYearId),
      );
      setCourseYears(cys);
      setCourseYearId(null);
      courseYearIdRef.current = null;
      setStudentSubjects([]);
    }
  }

  function onChangeCheckExam(value: 1 | 2) {
    checkExamRef.current = value;
    setCheckExam(value);
    setCourseYearFee([]);
    setStudentSubjects([]);
    setCourseYearId(null);
    if (examIdRef.current) supplyCourseYears(value, Number(examIdRef.current));
  }

  // ===== SUBJECTS =====
  function normalize(
    rows: AnyRow[],
    cyId: number,
    examType: "Regular" | "Supple",
  ): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: subId(r),
      courseYearId: cyId,
      examType,
      isSelected: !r.subjAlreadyRegistered,
      checked: !r.subjAlreadyRegistered,
      shortName:
        r.shortName && String(r.shortName).trim() !== ""
          ? r.shortName
          : r.subjectCode,
      Subject_name: r.subjectName,
      Subject_code: r.subjectCode,
      credits: examType === "Regular" ? r.subCredits : r.subjectCredits,
      ...(examType === "Supple" ? { subjectTypeCode: r.subjecttypeName } : {}),
    }));
  }

  async function getStudentSubjects(
    cyId: number,
    eid: number,
    failAbsentOnly: boolean,
  ) {
    const stu = studentRef.current;
    let rows: AnyRow[] = [];
    let examType: "Regular" | "Supple";
    if (Number(stu.courseYearId) === Number(cyId)) {
      examType = "Regular";
      const stdAcademicYearId = stu.academicYearId;
      rows = await getStudentSubjectsForRegularExam({
        collegeId: Number(stu.collegeId),
        academicYearId: Number(stdAcademicYearId),
        studentId: Number(stu.studentId),
        courseYearId: cyId,
        examId: eid,
      });
    } else {
      examType = "Supple";
      const cyRow = courseYearsListRef.current.find(
        (x) => Number(x.fromCourseYearId) === Number(cyId),
      );
      rows = await getStudentSubjectsForSupplyExam({
        collegeId: Number(stu.collegeId),
        courseYearId: cyId,
        studentId: Number(stu.studentId),
        examId: eid,
      });
      if (failAbsentOnly)
        rows = rows.filter(
          (r) =>
            r.examresultCatCode === "FAIL" || r.examresultCatCode === "ABSENT",
        );
      void cyRow;
    }
    const normalized = normalize(rows, cyId, examType);
    const sorted = [...normalized].sort((a, b) =>
      a.subjAlreadyRegistered === b.subjAlreadyRegistered
        ? 0
        : a.subjAlreadyRegistered
          ? 1
          : -1,
    );
    setStudentSubjects(sorted);
    setRegSubjects(sorted.filter((s) => s.subjAlreadyRegistered));
    setChecksubject(true);
  }

  function getRelevantExamSubjects(cyId: number) {
    if (cyId == null) return;
    void getStudentSubjects(
      cyId,
      Number(examIdRef.current),
      Number(studentRef.current.courseYearId) !== Number(cyId),
    );
  }

  function markAll(all: boolean) {
    setChecksubject(all);
    setStudentSubjects((prev) =>
      prev.map((s) => {
        if (!all) return { ...s, checked: false, isSelected: false };
        if (!s.subjAlreadyRegistered)
          return { ...s, checked: true, isSelected: true };
        return { ...s, checked: false, isSelected: false };
      }),
    );
  }

  function checkedSubjects(check: boolean, item: AnyRow) {
    setStudentSubjects((prev) =>
      prev.map((s) =>
        subId(s) === subId(item) && s.courseYearId === item.courseYearId
          ? { ...s, checked: check, isSelected: check }
          : s,
      ),
    );
  }

  // ===== ADD SUBJECTS → courseYearFee grouping =====
  function addExamSubjects() {
    const checked = studentSubjectsRef.current.filter((s) => s.checked);
    if (checked.length === 0) {
      toastError("Select at least one subject.");
      return;
    }
    const result: AnyRow[] = [];
    const stu = studentRef.current;
    for (const sub of checked) {
      const cyId = Number(sub.courseYearId);
      let existing = result.find((x) => x.courseYearId === cyId);
      if (!existing) {
        result.push({
          collegeCode: sub.collegeCode ?? stu.collegeCode,
          courseYearId: cyId,
          courseName: sub.courseName ?? stu.courseName ?? stu.courseCode,
          courseYearName: sub.courseYearName ?? stu.courseYearName,
          examType: sub.examType,
          academicYear: sub.academicYear ?? stu.academicYear,
          examFeeStructureId: sub.examFeeStructureId ?? null,
          subjects: [sub],
        });
      } else if (
        !existing.subjects.some((x: AnyRow) => subId(x) === subId(sub))
      ) {
        existing.subjects.push(sub);
      }
    }
    setCourseYearFee(result);
  }

  // ===== REGISTER (feeless → examstudent) =====
  function buildReceipts(): AnyRow[] {
    const stu = studentRef.current;
    const examRow = examsList.find(
      (e) => Number(e.examId) === Number(examIdRef.current),
    );
    const examName = g(examRow, ["examName", "exam_name"]);
    const examFromDate = examRow?.fromDate ?? examRow?.from_date;
    const examToDate = examRow?.toDate ?? examRow?.to_date;
    return courseYearFeeRef.current.map((cy) => {
      const ft = examFeeTypesRef.current.find(
        (x) => String(x.generalDetailCode) === String(cy.examType),
      );
      const examtypeCatId = ft ? Number(ft.generalDetailId) : null;
      return {
        registrationDate: new Date().toISOString(),
        isInternalExam: false,
        collegeCode: cy.collegeCode,
        examName,
        courseName: cy.courseName,
        courseYearName: cy.courseYearName,
        examType: cy.examType,
        examFromDate,
        examToDate,
        courseGroupName: stu.groupCode,
        academicYear: cy.academicYear,
        studentName: stu.firstName,
        rollno: stu.hallticketNumber,
        feeComments: "",
        employeeId,
        collegeId: Number(stu.collegeId),
        courseGroupId: Number(stu.courseGroupId),
        courseYearId: cy.courseYearId,
        examFeeFineId: null,
        examFeeStructureId: cy.examFeeStructureId ?? null,
        examId: Number(examIdRef.current),
        examtypeCatId,
        studentId: Number(stu.studentId),
        isActive: true,
        regulationId: Number(stu.regulationId) || null,
        examStudentDetailDTOs: cy.subjects,
      };
    });
  }

  function onRegister() {
    if (courseYearFeeRef.current.length === 0) {
      toastError("Add subjects before registering.");
      return;
    }
    payReceiptsRef.current = buildReceipts();
    setPayFile(null);
    setPayOpen(true);
  }

  async function confirmPay() {
    setSaving(true);
    try {
      const stu = studentRef.current;
      if (payFile) {
        const fd = new FormData();
        fd.append("file", payFile, payFile.name);
        fd.append("collegeCode", String(stu.collegeCode ?? ""));
        fd.append("examId", String(examIdRef.current ?? ""));
        fd.append("collegeId", String(stu.collegeId ?? ""));
        fd.append("courseId", String(stu.courseId ?? ""));
        await uploadExamRegForms(fd).catch(() => null);
      }
      await saveRegisteredExamSubjects(payReceiptsRef.current);
      toastSuccess("Subjects registered successfully.");
      setPayOpen(false);
      clearAfterSave();
      // reload subjects so newly-registered move to the registered list
      if (courseYearIdRef.current)
        await getStudentSubjects(
          Number(courseYearIdRef.current),
          Number(examIdRef.current),
          false,
        );
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to register subjects.",
      );
    } finally {
      setSaving(false);
    }
  }

  function clearAfterSave() {
    setCourseYearFee([]);
  }

  // ===== UPLOAD EXAM FORM (Registered table) =====
  function openUpload() {
    setUploadFile2(null);
    setUploadOpen(true);
  }
  async function submitUpload() {
    if (!uploadFile2) {
      toastError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const stu = studentRef.current;
      const fd = new FormData();
      fd.append("file", uploadFile2, uploadFile2.name);
      fd.append("collegeCode", String(stu.collegeCode ?? ""));
      fd.append("examId", String(examIdRef.current ?? ""));
      fd.append("collegeId", String(stu.collegeId ?? ""));
      fd.append("courseId", String(stu.courseId ?? ""));
      await uploadExamRegForms(fd);
      toastSuccess("Exam form uploaded successfully.");
      setUploadOpen(false);
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to upload exam form.",
      );
    } finally {
      setUploading(false);
    }
  }

  // ===== VIEW EXAM FORM =====
  async function viewExamForm() {
    const stu = studentRef.current;
    if (!stu.collegeId || !examIdRef.current || !stu.studentId) return;
    const row = await getExamRegistrationForm({
      collegeId: Number(stu.collegeId),
      examId: Number(examIdRef.current),
      studentId: Number(stu.studentId),
    }).catch(() => null);
    const path = g(row, [
      "applicationFilePath",
      "application_file_path",
      "filePath",
      "file_path",
    ]);
    if (!path) {
      toast.info("Exam Form Not Uploaded.");
      return;
    }
    const url = /^https?:\/\//i.test(path) ? path : `${MINIO_URL}${path}`;
    window.open(url, "_blank", "width=700,height=600");
  }

  function viewCourseYearSubjects(cy: AnyRow) {
    setViewSubjRows(Array.isArray(cy.subjects) ? cy.subjects : []);
    setViewSubjOpen(true);
  }

  return (
    <FilteredPage
      title="Exam Registration Manual Feeless"
      filters={(
        <GlobalFilterBarRow>
          <div className="md:col-span-5 space-y-1">
            <StudentSearchSelect
              label="Student"
              value={studentId}
              students={students}
              selectedStudent={!isEmptyObject(student) ? student : null}
              isLoading={studentSearchLoading}
              onSearch={(term) => void enteredStudent(term)}
              onChange={(id, row) => void selectedStudent(id, row)}
            />
          </div>
          <div className="md:col-span-7 space-y-1">
            <Select
              label="Exam"
              value={examId ? String(examId) : null}
              onChange={(v) => {
                const eid = v ? Number(v) : 0;
                examIdRef.current = eid;
                setExamId(eid);
                if (eid) selectedExternalExam(eid);
              }}
              options={examsList.map((e) => ({
                value: String(n(e, ["examId", "fk_exam_id"])),
                label: `${g(e, ["examName", "exam_name"])} (${fmtDate(e.fromDate ?? e.from_date)} - ${fmtDate(e.toDate ?? e.to_date)})${e.isRegularExam ? " (Regular)" : ""}${e.isSupplyExam ? " (Supple)" : ""}`,
              }))}
              placeholder="Select Exam"
              searchable
            />
          </div>
        </GlobalFilterBarRow>
      )}
    >
      <div className="space-y-3">
          {/* Student banner */}
          {!isEmptyObject(student) && flag && (
            <div className="rounded border-4 border-[#c3d9ff] p-3">
              <div className="flex gap-4">
                <div className="w-[120px] shrink-0">
                  {student.studentPhotoPath && !photoError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.studentPhotoPath}
                      alt="student"
                      className="w-full bg-[#c3d9ff] p-1.5"
                      style={{ maxHeight: 110 }}
                      onError={() => setPhotoError(true)}
                    />
                  ) : (
                    <div
                      className="flex w-full items-center justify-center bg-[#c3d9ff] p-1.5 text-[28px] font-semibold text-white"
                      style={{ height: 110 }}
                    >
                      {String(student.firstName ?? "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-[13px] leading-5">
                  <p className="font-medium">
                    {student.firstName} (
                    <span className="text-blue-600">
                      {student.isLateral ? "LATERAL" : "REGULAR"}
                    </span>
                    )
                  </p>
                  <p className="text-[#8c8c8c]">{student.hallticketNumber}</p>
                  <p className="text-[#8c8c8c]">
                    {student.collegeCode} / {student.academicYear} /{" "}
                    {student.courseCode} / {student.groupCode} /{" "}
                    {student.courseYearName} / Section {student.section}
                  </p>
                  <p className="text-[#8c8c8c]">{student.mobile}</p>
                </div>
                <div className="text-[14px]">
                  <div className="py-1">
                    Quota :{" "}
                    <span className="text-blue-600">
                      {student.quotaDisplayName}
                    </span>
                  </div>
                  <div className="py-1">
                    Student Status :{" "}
                    <span
                      className={
                        STATUS_CLASS[String(student.studentStatusCode)] ??
                        "text-green-700 font-medium"
                      }
                    >
                      {student.studentStatusDisplayName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Exam Fee Subjects */}
          {studentId && flag && (
            <div className="rounded border-2 border-[#89c5ff] p-2.5">
              <h2 className="mb-2 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
                Select Exam Fee Subjects
              </h2>

              <div className="bg-white px-2 py-2">
                <div className="flex items-center gap-8 text-[13px]">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="checkExam"
                      checked={checkExam === 1}
                      onChange={() => onChangeCheckExam(1)}
                    />{" "}
                    Regular
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="checkExam"
                      checked={checkExam === 2}
                      onChange={() => onChangeCheckExam(2)}
                    />{" "}
                    Supplementary
                  </label>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-2">
                {courseYears.length > 0 && (
                  <div className="md:col-span-2 bg-white p-2">
                    <Select
                      label="Course Year"
                      value={courseYearId ? String(courseYearId) : null}
                      onChange={(v) => {
                        const id = v ? Number(v) : null;
                        setCourseYearId(id);
                        courseYearIdRef.current = id;
                        if (id) getRelevantExamSubjects(id);
                      }}
                      options={courseYears.map((o) => ({
                        value: String(o.fromCourseYearId),
                        label:
                          o.fromCourseYearName ?? `Sem ${o.fromCourseYearId}`,
                      }))}
                      placeholder="Course Year"
                    />
                    {courseYearId && checkExam === 2 && (
                      <div className="mt-2 flex gap-4">
                        <span
                          className="cursor-pointer text-[13px] text-blue-600 underline"
                          onClick={() =>
                            void getStudentSubjects(
                              Number(courseYearId),
                              Number(examIdRef.current),
                              false,
                            )
                          }
                        >
                          All
                        </span>
                        <span
                          className="cursor-pointer text-[13px] text-blue-600 underline"
                          onClick={() =>
                            getRelevantExamSubjects(Number(courseYearId))
                          }
                        >
                          Supple
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Subjects table */}
                {studentSubjects.length > 0 && (
                  <div className="md:col-span-6 border border-[#dedede] bg-white">
                    <div className="flex items-center justify-between gap-2 p-1.5">
                      <Input
                        className="h-7 w-full max-w-sm text-[12px]"
                        placeholder="Search subject…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                      <span className="text-[13px] font-medium text-blue-600">
                        Subjects: {selectedCount}
                      </span>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0">
                          <tr className="bg-[#C3D9FF]">
                            <th className="w-[44px] px-2 py-1 text-left">
                              <input
                                type="checkbox"
                                checked={checksubject}
                                onChange={(e) => markAll(e.target.checked)}
                              />
                              <span className="ml-1">All</span>
                            </th>
                            <th className="px-2 py-1 text-left">Subjects</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubjects.map((obj, i) => (
                            <tr
                              key={`sub-${subId(obj) || i}`}
                              className={`border-t ${obj.subjAlreadyRegistered ? "bg-[#f2f0f0]" : ""}`}
                            >
                              <td className="w-[44px] px-2 py-1 text-center align-middle">
                                <input
                                  type="checkbox"
                                  disabled={obj.subjAlreadyRegistered}
                                  checked={!!obj.checked}
                                  onChange={() =>
                                    !obj.subjAlreadyRegistered &&
                                    checkedSubjects(!obj.checked, obj)
                                  }
                                />
                              </td>
                              <td className="px-2 py-1 align-middle">
                                {obj.shortName}
                                {obj.subjectCode != null && (
                                  <>
                                    {" "}
                                    -{" "}
                                    <span className="text-blue-600">
                                      {obj.subjectCode}
                                    </span>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Selected subjects */}
                {selectedSubjects.length > 0 && (
                  <div className="md:col-span-4 border border-[#dedede] bg-white">
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0">
                          <tr className="bg-[#C3D9FF]">
                            <th className="px-2 py-1 text-left text-blue-700">
                              Selected Subjects : {selectedCount}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSubjects.map((sub, i) => (
                            <tr key={`sel-${i}`} className="border-t">
                              <td className="px-2 py-1">
                                {sub.shortName}
                                {sub.subjectCode != null && (
                                  <>
                                    {" "}
                                    -{" "}
                                    <span className="text-blue-600">
                                      {sub.subjectCode}
                                    </span>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {selectedSubjects.length > 0 && (
                <div className="mt-2 flex justify-end">
                  <Button className="h-8 text-[12px]" onClick={addExamSubjects}>
                    Add Subjects
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Exam Registration grouping table */}
          {courseYearFee.length > 0 && (
            <div className="mx-1">
              <h2 className="mb-1 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
                Exam Registration
              </h2>
              <div className="rounded bg-[#C3D9FF] p-1">
                <table className="w-full bg-white text-[13px]">
                  <thead>
                    <tr className="bg-white">
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">
                        SI No
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">
                        Course Year
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">
                        Exam Type
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-right">
                        No of Subjects
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">
                        View Subjects
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">
                        Exam Form
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseYearFee.map((cy, i) => (
                      <tr
                        key={`cy-${i}`}
                        className={i % 2 ? "bg-[#f1f6ff]" : "bg-white"}
                      >
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{cy.courseYearName}</td>
                        <td className="px-2 py-1 text-right">{cy.examType}</td>
                        <td className="px-2 py-1 text-right">
                          {cy.subjects.length}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            className="text-[#9E9E9E]"
                            title="View Subjects"
                            onClick={() => viewCourseYearSubjects(cy)}
                          >
                            👁
                          </button>
                        </td>
                        <td className="px-2 py-1 text-center">
                          <Button
                            variant="outline"
                            className="h-7 text-[12px]"
                            onClick={() => void viewExamForm()}
                          >
                            View
                          </Button>
                        </td>
                        <td className="px-2 py-1 text-center">
                          <Button
                            className="h-7 text-[12px]"
                            onClick={onRegister}
                            disabled={saving}
                          >
                            Register
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Registrated Subjects */}
          {regSubjects.length > 0 && (
            <div className="mx-1">
              <h2 className="mb-1 rounded bg-[#c3d9ff] px-3 py-1.5 text-[15px] font-medium">
                Registrated Subjects
              </h2>
              <div className="rounded bg-[#C3D9FF] p-1">
                <table className="w-full bg-white text-[13px]">
                  <thead>
                    <tr className="bg-white">
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">
                        SI No
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">
                        Course Year
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-left">
                        Subject
                      </th>
                      <th className="border-b-4 border-[#c3d9ff] px-2 py-1 text-center">
                        Exam Form
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-2 py-1">1</td>
                      <td className="px-2 py-1">
                        {g(regSubjects[0], [
                          "courseYearCode",
                          "course_year_code",
                          "courseYearName",
                        ])}
                      </td>
                      <td className="px-2 py-1">{studentRegSubject}</td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            className="h-7 text-[12px]"
                            onClick={() => void viewExamForm()}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            className="h-7 text-[12px]"
                            onClick={openUpload}
                          >
                            Upload
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      {/* Pay / confirm dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exam Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-[13px]">
            <div>
              <span className="text-muted-foreground">Student: </span>
              {student.firstName} ({student.hallticketNumber})
            </div>
            <div>
              <span className="text-muted-foreground">Exam: </span>
              {g(
                examsList.find((e) => Number(e.examId) === Number(examId)),
                ["examName", "exam_name"],
              )}
            </div>
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">SI.No</th>
                    <th className="px-2 py-1 text-left">Course Year</th>
                    <th className="px-2 py-1 text-right">No of Subjects</th>
                    <th className="px-2 py-1 text-left">Exam Type</th>
                  </tr>
                </thead>
                <tbody>
                  {payReceiptsRef.current.map((r, i) => (
                    <tr key={`pr-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{r.courseYearName}</td>
                      <td className="px-2 py-1 text-right">
                        {(r.examStudentDetailDTOs ?? []).length}
                      </td>
                      <td className="px-2 py-1">{r.examType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] text-muted-foreground">
                Upload Exam Form (optional)
              </label>
              <Input
                type="file"
                className="text-[12px]"
                onChange={(e) => setPayFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={confirmPay} disabled={saving}>
              {saving ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload exam form dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Student Exam Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="file"
              className="text-[12px]"
              onChange={(e) => setUploadFile2(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              Close
            </Button>
            <Button onClick={submitUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View subjects dialog */}
      <Dialog open={viewSubjOpen} onOpenChange={setViewSubjOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subjects</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject Code</th>
                  <th className="px-2 py-1 text-left">Subject Name</th>
                </tr>
              </thead>
              <tbody>
                {viewSubjRows.map((s, i) => (
                  <tr key={`vs-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {g(s, ["subjectCode", "subject_code"]) || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {g(s, ["subjectName", "subject_name", "shortName"]) ||
                        "-"}
                    </td>
                  </tr>
                ))}
                {viewSubjRows.length === 0 && (
                  <tr className="border-t">
                    <td
                      colSpan={3}
                      className="px-2 py-6 text-center text-muted-foreground"
                    >
                      No subjects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
