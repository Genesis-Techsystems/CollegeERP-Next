"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import defaultStudent from "@/assets/images/avatars/default_Student.png";
import { toastError, toastSuccess } from "@/lib/toast";
import { useSessionContext } from "@/context/SessionContext";
import {
  fetchStudentDetail,
  listAcademicYearsForReadmissionWithProcFallback,
  listStudentCourseYearsByCourse,
  listGroupSectionsForReadmission,
  listStudentRegulationsByCourse,
  resolveUniversityIdForReadmission,
  submitStudentReadmission,
} from "@/services";

type AnyRow = Record<string, any>;

const SELECT_CLS =
  "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const v = Number(row[k] ?? 0);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function toIsoDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Angular date pipe: " dd MMM, y" */
function formatAdmissionDate(raw: string): string {
  if (!raw.trim()) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Angular status class map (.dtnd / .incollege / …) */
function statusClass(code: string): string {
  const c = code.toUpperCase().replace(/\s+/g, "");
  if (c === "DTND" || c === "DETAINED") return "font-bold text-[red]";
  if (c === "INCOLLEGE") return "font-bold text-[green]";
  if (c === "PASSEDOUT") return "font-bold text-[#461eb6]";
  if (c === "DETAINRECOMMENDED") return "font-bold text-[orangered]";
  if (c === "DISCONTINUED") return "font-bold text-[red]";
  return "font-bold text-foreground";
}

/** Match `student-promotion` / `studentdetail` field variants */
const COLLEGE_ID_KEYS = [
  "collegeId",
  "fk_college_id",
  "college_id",
  "fk_collegeId",
] as const;

export function ReadmissionApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const studentId = useMemo(
    () => Number(searchParams.get("studentId") ?? 0),
    [searchParams],
  );
  const universityIdParam = useMemo(
    () => Number(searchParams.get("universityId") ?? 0),
    [searchParams],
  );
  const organizationIdParam = useMemo(
    () => Number(searchParams.get("organizationId") ?? 0),
    [searchParams],
  );
  const collegeIdParam = useMemo(
    () => Number(searchParams.get("collegeId") ?? 0),
    [searchParams],
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [student, setStudent] = useState<AnyRow | null>(null);

  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);

  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [reason, setReason] = useState("");

  /** Avoid re-applying student's section when user changes AY/CY and clears selection intentionally */
  const sectionDefaultAppliedRef = useRef(false);

  const loadSections = useCallback(
    async (s: AnyRow, ayId: number | null, cyId: number | null) => {
      const collegeId = num(s, [...COLLEGE_ID_KEYS]);
      const courseGroupId = num(s, ["courseGroupId", "fk_course_group_id"]);
      if (!courseGroupId || !ayId || !cyId) {
        setSections([]);
        return;
      }
      try {
        const rows = await listGroupSectionsForReadmission({
          courseYearId: cyId,
          academicYearId: ayId,
          courseGroupId,
          collegeId: collegeId || undefined,
        });
        setSections(Array.isArray(rows) ? rows : []);
      } catch {
        setSections([]);
      }
    },
    [],
  );

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setFromDate(d);
  }, []);

  useEffect(() => {
    async function run() {
      if (!studentId) {
        setLoading(false);
        toastError(new Error("Missing student id"), "Readmission");
        return;
      }
      sectionDefaultAppliedRef.current = false;
      setLoading(true);
      try {
        const row = await fetchStudentDetail(studentId);
        if (!row) {
          setStudent(null);
          toastError(new Error("Student not found"), "Readmission");
          return;
        }
        const fromDetail = num(row, [...COLLEGE_ID_KEYS]);
        const fromUrl = collegeIdParam > 0 ? collegeIdParam : 0;
        const fromSession =
          Number(user?.collegeId) > 0 && fromDetail <= 0 && fromUrl <= 0
            ? Number(user?.collegeId)
            : 0;
        const merged: AnyRow =
          fromDetail <= 0 && (fromUrl > 0 || fromSession > 0)
            ? { ...row, collegeId: fromUrl || fromSession }
            : row;
        setStudent(merged);

        const collegeId =
          num(merged, [...COLLEGE_ID_KEYS]) ||
          (collegeIdParam > 0 ? collegeIdParam : 0) ||
          fromSession;
        const resolvedUniv = await resolveUniversityIdForReadmission(
          merged,
          universityIdParam,
        );
        const courseId = num(merged, ["courseId", "fk_course_id"]);

        const orgForAy =
          organizationIdParam || Number(user?.organizationId ?? 0);
        const empForAy = Number(user?.employeeId ?? 0);

        const [ays, regs, cyrs] = await Promise.all([
          listAcademicYearsForReadmissionWithProcFallback(
            resolvedUniv,
            collegeId,
            orgForAy,
            empForAy,
          ),
          courseId
            ? listStudentRegulationsByCourse(courseId)
            : Promise.resolve([] as AnyRow[]),
          courseId
            ? listStudentCourseYearsByCourse(courseId)
            : Promise.resolve([] as AnyRow[]),
        ]);
        setAcademicYears(ays);
        setRegulations(regs);
        setCourseYears(cyrs);

        const pickAcademicYearId = (): number | null => {
          const fromStudent = num(merged, [
            "academicYearId",
            "fk_academic_year_id",
            "acdmYearId",
          ]);
          if (
            fromStudent > 0 &&
            ays.some(
              (a) =>
                num(a, ["academicYearId", "fk_academic_year_id"]) ===
                fromStudent,
            )
          ) {
            return fromStudent;
          }
          const ayLabel = txt(merged, ["academicYear", "academic_year"]).trim();
          if (ayLabel) {
            const match = ays.find(
              (a) =>
                txt(a, [
                  "academicYear",
                  "academic_year",
                  "academic_year_name",
                ]).trim() === ayLabel,
            );
            if (match)
              return num(match, ["academicYearId", "fk_academic_year_id"]);
          }
          return ays[0]
            ? num(ays[0], ["academicYearId", "fk_academic_year_id"])
            : null;
        };

        const firstReg = regs[0]
          ? num(regs[0], ["regulationId", "fk_regulation_id"])
          : null;
        const pickCourseYearId = (): number | null => {
          const fromStudent = num(merged, [
            "courseYearId",
            "fk_course_year_id",
          ]);
          if (
            fromStudent > 0 &&
            cyrs.some(
              (c) =>
                num(c, ["courseYearId", "fk_course_year_id"]) === fromStudent,
            )
          ) {
            return fromStudent;
          }
          const cyLabel = txt(merged, [
            "courseYearName",
            "course_year_name",
          ]).trim();
          if (cyLabel) {
            const match = cyrs.find(
              (c) =>
                txt(c, ["courseYearName", "course_year_name"]).trim() ===
                cyLabel,
            );
            if (match) return num(match, ["courseYearId", "fk_course_year_id"]);
          }
          return cyrs[0]
            ? num(cyrs[0], ["courseYearId", "fk_course_year_id"])
            : null;
        };

        const ayId = pickAcademicYearId();
        const cyId = pickCourseYearId();
        setAcademicYearId(ayId);
        setRegulationId(firstReg);
        setCourseYearId(cyId);
      } catch (e) {
        toastError(e, "Failed to load readmission data");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [
    studentId,
    universityIdParam,
    organizationIdParam,
    collegeIdParam,
    user?.employeeId,
    user?.organizationId,
    loadSections,
  ]);

  useEffect(() => {
    if (!student || !academicYearId || !courseYearId) return;
    void loadSections(student, academicYearId, courseYearId);
  }, [student, academicYearId, courseYearId, loadSections]);

  useEffect(() => {
    if (sectionDefaultAppliedRef.current || !student || sections.length === 0)
      return;
    const sid = num(student, [
      "groupSectionId",
      "fk_group_section_id",
      "group_section_id",
    ]);
    if (sid <= 0) return;
    const ok = sections.some(
      (s) => num(s, ["groupSectionId", "fk_group_section_id"]) === sid,
    );
    if (ok) {
      setGroupSectionId(sid);
      sectionDefaultAppliedRef.current = true;
    }
  }, [student, sections]);

  const ayOptions = useMemo(
    () =>
      academicYears
        .map((r) => ({
          value: String(
            num(r, [
              "academicYearId",
              "fk_academic_year_id",
              "academic_year_id",
            ]),
          ),
          label:
            txt(r, ["academicYear", "academic_year", "academic_year_name"]) ||
            "Academic year",
        }))
        .filter((o) => o.value !== "0" && o.value !== ""),
    [academicYears],
  );

  const regOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r, ["regulationId", "fk_regulation_id"])),
        label: txt(r, ["regulationName", "regulationCode"]) || "Regulation",
      })),
    [regulations],
  );

  const cyOptions = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r, ["courseYearId", "fk_course_year_id"])),
        label: txt(r, ["courseYearName", "course_year_name"]) || "Course year",
      })),
    [courseYears],
  );

  const secOptions = useMemo(
    () =>
      sections.map((r) => ({
        value: String(num(r, ["groupSectionId", "fk_group_section_id"])),
        label:
          txt(r, ["section", "groupSectionName", "group_section_name"]) ||
          "Section",
      })),
    [sections],
  );

  function goBackToList() {
    const cid = student ? num(student, [...COLLEGE_ID_KEYS]) : 0;
    const oid = student
      ? num(student, ["organizationId", "fk_organization_id"])
      : 0;
    const q = new URLSearchParams();
    if (cid) q.set("collegeId", String(cid));
    if (oid) q.set("organizationId", String(oid));
    const tail = q.toString();
    router.push(
      `/admin-student-information-system/student-re-admission${tail ? `?${tail}` : ""}`,
    );
  }

  async function onSave() {
    if (!student) return;
    if (!academicYearId || !regulationId || !courseYearId || !groupSectionId) {
      toastError(new Error("Please fill all required fields"), "Readmission");
      return;
    }
    const r = reason.trim();
    if (!r) {
      toastError(new Error("Reason is required"), "Readmission");
      return;
    }
    if (!fromDate) {
      toastError(new Error("From date is required"), "Readmission");
      return;
    }

    const selectedCy = courseYears.find(
      (x) => num(x, ["courseYearId", "fk_course_year_id"]) === courseYearId,
    );
    // Resolve the student's current course year by id first (the reliable field the
    // form already relies on); fall back to name matching only if the id is absent.
    // The old name-only match silently no-op'd when studentdetail omitted courseYearName,
    // letting an invalid downgrade through with no warning.
    const studentCyId = num(student, ["courseYearId", "fk_course_year_id"]);
    const currentCy =
      (studentCyId > 0
        ? courseYears.find(
            (x) =>
              num(x, ["courseYearId", "fk_course_year_id"]) === studentCyId,
          )
        : undefined) ??
      courseYears.find(
        (x) =>
          txt(x, ["courseYearName", "course_year_name"]) ===
          txt(student, ["courseYearName", "course_year_name"]),
      );
    if (selectedCy && currentCy) {
      const selNo = Number(selectedCy.yearNo ?? selectedCy.year_no ?? 0);
      const curNo = Number(currentCy.yearNo ?? currentCy.year_no ?? 0);
      if (selNo < curNo) {
        toastError(
          new Error("You are rejoining to wrong course year — please check"),
          "Readmission",
        );
        return;
      }
    }

    const payload: Record<string, unknown> = {
      academicYearId,
      regulationId,
      courseYearId,
      groupSectionId,
      fromDate: toIsoDate(fromDate),
      toDate: toIsoDate(fromDate),
      reason: r,
      collegeId: num(student, [...COLLEGE_ID_KEYS]),
      courseId: num(student, ["courseId", "fk_course_id"]),
      courseGroupId: num(student, ["courseGroupId", "fk_course_group_id"]),
      quotaId: num(student, ["quotaId", "fk_quota_id"]),
      studentId: num(student, ["studentId", "fk_student_id"]),
    };

    setSubmitting(true);
    try {
      await submitStudentReadmission(payload);
      toastSuccess("Re-admission saved successfully");
      goBackToList();
    } catch (e) {
      toastError(e, "Failed to save re-admission");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageContainer className="space-y-3">
        <p className="px-1 text-sm text-slate-600">Loading…</p>
      </PageContainer>
    );
  }

  if (!student) {
    return (
      <PageContainer className="space-y-3">
        <div className="app-card overflow-hidden">
          <div className="border-b-2 border-[#ffcf46] bg-white px-5 py-[14px]">
            <strong className="inline-flex items-center gap-2 text-[18px] font-medium text-[#0c51a4]">
              <span className="material-icons text-[22px]" aria-hidden>
                computer
              </span>
              Student Re-Admission
            </strong>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-700">No student loaded.</p>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                className={cn("app-control back-btn min-w-[88px]")}
                onClick={goBackToList}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const stCode = String(
    student.studentStatusCode ?? student.student_status_code ?? "",
  ).trim();
  const stLabel =
    txt(student, ["studentStatusDisplayName", "student_status_display_name"]) ||
    stCode;
  const lateral = Boolean(student.isLateral ?? student.is_lateral);
  const admissionRaw = txt(student, [
    "adminssionDate",
    "admissionDate",
    "admission_date",
    "adminssion_date",
  ]);
  const quota = txt(student, [
    "quotaDisplayName",
    "quota_display_name",
    "quotaName",
  ]);

  return (
    <PageContainer className="space-y-3">
      {/* Angular mat-elevation-z8 + page-table-head + student card */}
      <div className="app-card overflow-hidden" data-no-page-name="">
        {/* <div className="border-b-2 border-[#ffcf46] bg-white px-5 py-[14px]">
          <strong className="inline-flex items-center gap-2 text-[18px] font-medium leading-[1.25] text-[#0c51a4]">
            <span
              className="material-icons text-[22px] text-[#0c51a4]"
              aria-hidden
            >
              computer
            </span>
            Student Re-Admission
          </strong>
        </div> */}

        {/* Angular .std-his — light blue border student summary */}
        <div className="rounded-[3px] border-4 bg-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex w-full shrink-0 justify-center p-1.5 sm:w-[15%] sm:max-w-[140px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote student photo URLs */}
              <img
                src={txt(student, ["studentPhotoPath"]) || defaultStudent.src}
                alt=""
                className="h-auto w-[80%] max-w-[120px] object-cover"
                onError={(e) => {
                  e.currentTarget.src = defaultStudent.src;
                }}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5 py-2.5 text-[15px] font-medium sm:w-[60%]">
              <p className="m-0 text-[15px] font-medium text-black">
                {txt(student, ["firstName", "studentName"])}{" "}
                <span className="text-[blue]">
                  ({lateral ? "LATERAL" : "REGULAR"})
                </span>
              </p>
              <p className="m-0 text-[#8c8c8c]">
                {txt(student, ["hallticketNumber", "rollNumber"])}
              </p>
              <p className="m-0 text-[#8c8c8c]">
                {txt(student, ["collegeCode"])} /{" "}
                {txt(student, ["academicYear", "academic_year"])} /{" "}
                {txt(student, ["courseName", "course_name"])} /{" "}
                {txt(student, ["groupCode", "group_code"])} /{" "}
                {txt(student, ["courseYearName", "course_year_name"])} / Section{" "}
                {txt(student, ["section", "sectionName"])}
              </p>
              <p className="m-0 text-[#8c8c8c]">
                {txt(student, ["mobile", "mobileNumber"])}
              </p>
            </div>

            <div className="shrink-0 space-y-1 py-2 text-[15px] text-black sm:min-w-[220px]">
              <div className="py-1">
                <span>Admission Date : </span>
                <span className="text-[blue]">
                  {formatAdmissionDate(admissionRaw)}
                </span>
              </div>
              <div className="py-1">
                <span>Quota : </span>
                {quota ? <span className="text-[blue]">{quota}</span> : null}
              </div>
              <div className="py-1">
                <span>Student Status : </span>
                {stLabel ? (
                  <span className={statusClass(stCode || stLabel)}>
                    {stLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Angular mat-card form + .div-border */}
      <div className="app-card overflow-hidden p-4" data-no-page-name="">
        <div className="rounded-[5px] border-2 border-[#B2EBF2] p-3">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
            <div className="w-full min-w-[140px] basis-[18%] grow">
              <Select
                label="Academic Year"
                required
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setAcademicYearId(v ? Number(v) : null);
                  setGroupSectionId(null);
                }}
                options={ayOptions}
                placeholder="Academic Year"
                className={SELECT_CLS}
              />
            </div>
            <div className="w-full min-w-[140px] basis-[18%] grow">
              <Select
                label="Regulation"
                required
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => setRegulationId(v ? Number(v) : null)}
                options={regOptions}
                placeholder="Regulation"
                className={SELECT_CLS}
              />
            </div>
            <div className="w-full min-w-[140px] basis-[18%] grow">
              <Select
                label="Course Year"
                required
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  setCourseYearId(v ? Number(v) : null);
                  setGroupSectionId(null);
                }}
                options={cyOptions}
                placeholder="Course Year"
                className={SELECT_CLS}
              />
            </div>
            <div className="w-full min-w-[140px] basis-[18%] grow">
              <Select
                label="Section"
                required
                value={groupSectionId ? String(groupSectionId) : null}
                onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
                options={secOptions}
                placeholder="Section"
                searchable
                className={SELECT_CLS}
              />
            </div>
            <div className="w-full min-w-[140px] basis-[18%] grow">
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                placeholder="From Date"
              />
            </div>
          </div>

          <div className="relative mt-4 flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 lg:w-[75%]">
              <label className="text-xs font-medium text-black/54">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                className="mt-1 w-full border-0 border-b border-black/12 bg-transparent px-0 py-1.5 text-[13px] text-[rgba(0,0,0,0.87)] outline-none focus:border-b-2 focus:border-[#0c51a4]"
                placeholder="Reason"
              />
            </div>
            <div className="flex shrink-0 justify-end lg:w-[25%] lg:pt-6">
              <Button
                type="button"
                className="h-[30px] min-w-[88px] rounded-md bg-[#042956] px-4 text-[13px] font-medium text-white hover:bg-[#031f42]"
                disabled={submitting}
                onClick={() => void onSave()}
              >
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Angular .save-btn-align — gold Back on the right */}
        <div className="mt-3 flex w-full justify-end pr-2">
          <Button
            type="button"
            className={cn("app-control back-btn min-w-[88px]")}
            onClick={goBackToList}
          >
            Back
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
