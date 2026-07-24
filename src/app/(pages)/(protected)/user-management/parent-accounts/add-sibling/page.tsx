"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  FormField,
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { FilteredPage, PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MINIO_URL } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  fetchStudentDetail,
  linkStudentAsSiblingToParent,
  listAcademicYearsForParentAccountCollege,
  listActiveCollegesForParentAccounts,
  listParentSiblingsByUserId,
  listStudentsForParentAccountManage,
} from "@/services";

type AnyRow = Record<string, unknown>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function mergeStudentDetailFragment(row: AnyRow): AnyRow {
  const chunks = [
    row.studentDetail,
    row.StudentDetail,
    row.studentProfile,
    row.StudentProfile,
  ].filter(
    (v): v is AnyRow =>
      Boolean(v) && typeof v === "object" && !Array.isArray(v),
  );
  const nested = chunks.reduce<AnyRow>((acc, cur) => ({ ...acc, ...cur }), {});
  return { ...row, ...nested };
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  const m = mergeStudentDetailFragment(row);
  for (const key of keys) {
    const v = s(m[key]).trim();
    if (v) return v;
  }
  return "";
}

function studentOptionFromRow(
  row: AnyRow,
): { value: string; label: string } | null {
  const sid = n(row.studentId ?? row.fk_student_id ?? row.student_id);
  if (!sid) return null;
  const ht = pickText(row, [
    "rollNumber",
    "hallticketNumber",
    "hallTicketNumber",
    "admissionNumber",
  ]);
  const name = pickText(row, ["firstName", "studentName", "fullName", "name"]);
  const label = ht && name ? `${ht} ${name}` : name || ht || `Student ${sid}`;
  return { value: String(sid), label };
}

function academicYearOption(
  row: AnyRow,
): { value: string; label: string } | null {
  const id = n(row.academicYearId ?? row.fk_academic_year_id);
  if (!id) return null;
  const label = s(row.academicYear ?? row.academic_year);
  return { value: String(id), label: label || `Year ${id}` };
}

/** Angular `[src]='row.studentPhotoPath'` + MINIO when path is relative. */
function studentPhotoUrl(row: AnyRow): string {
  const m = mergeStudentDetailFragment(row);
  const p = pickText(m, [
    "studentPhotoPath",
    "student_photo_path",
    "photoPath",
    "photo_path",
    "studentPhoto",
    "imagePath",
  ]);
  if (!p) return DEFAULT_STUDENT_PHOTO;
  if (/^https?:\/\//i.test(p) || p.startsWith("/assets/")) {
    return p.includes("?") ? p : `${p}?${Date.now()}`;
  }
  const base = MINIO_URL.replace(/\/$/, "");
  const path = p.startsWith("/") ? p : `/${p}`;
  const full = base ? `${base}${path}` : p;
  return full.includes("?") ? full : `${full}?${Date.now()}`;
}

function academicLine(row: AnyRow, collegeCode: string): string {
  const m = mergeStudentDetailFragment(row);
  const section = pickText(m, [
    "section",
    "sectionName",
    "groupSectionName",
    "groupsectionName",
  ]);
  const parts = [
    collegeCode || pickText(m, ["collegeCode", "college_code"]),
    pickText(m, ["courseCode", "course_code", "courseName"]),
    pickText(m, ["groupCode", "group_code", "courseGroupCode"]),
    pickText(m, ["courseYearName", "course_year_name", "courseYear"]),
    section
      ? section.toLowerCase().startsWith("section")
        ? section
        : `Section ${section}`
      : "",
  ].filter(Boolean);
  return parts.join(" / ") || "—";
}

function statusTone(code: string): string {
  switch (code.toUpperCase()) {
    case "INCOLLEGE":
      return "text-[#4CAF50] font-semibold";
    case "DTND":
      return "text-red-600 font-semibold";
    case "PASSEDOUT":
      return "text-blue-600 font-semibold";
    case "DETAINRECOMMENDED":
      return "text-amber-600 font-semibold";
    case "DISCONTINUED":
      return "text-slate-500 font-semibold";
    default:
      return "text-muted-foreground font-medium";
  }
}

const EMPTY_FORM = {
  firstName: "",
  userName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  mobileNumber: "",
};

function SiblingRow({ row }: { row: AnyRow }) {
  const [photoError, setPhotoError] = useState(false);
  const collegeCode = pickText(row, ["collegeCode", "college_code"]);
  const statusCode = pickText(row, ["studentStatusCode"]);
  const rollOrAdmission =
    pickText(row, ["rollNumber"]) || pickText(row, ["admissionNumber"]);

  return (
    <div className="flex items-center gap-4 border-b border-border/70 px-4 py-3 last:border-b-0">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoError ? DEFAULT_STUDENT_PHOTO : studentPhotoUrl(row)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setPhotoError(true)}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
        <p className="font-medium text-foreground">
          {rollOrAdmission ? `${rollOrAdmission}, ` : ""}
          {pickText(row, ["firstName"]) || "—"}
        </p>
        <p className="text-muted-foreground">
          {academicLine(row, collegeCode)}
        </p>
        <p className="text-muted-foreground">
          {pickText(row, ["mobile"]) || "—"}
          {statusCode ? (
            <span className={`ml-2 ${statusTone(statusCode)}`}>
              {statusCode}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function AddSiblingContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("userId") ?? 0);
  const queryClient = useQueryClient();

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentOption, setSelectedStudentOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const siblingsQueryKey = ["AddSibling", "siblings", userId] as const;
  const { data: siblings = [], isLoading: siblingsLoading } = useQuery({
    queryKey: siblingsQueryKey,
    queryFn: () => listParentSiblingsByUserId(userId),
    enabled: !!userId,
  });

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["AddSibling", "colleges"],
    queryFn: listActiveCollegesForParentAccounts,
  });

  const universityId = useMemo(() => {
    const college = colleges.find((c) => c.collegeId === collegeId);
    return Number(college?.universityId ?? 0);
  }, [colleges, collegeId]);

  const { data: academicYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["AddSibling", "academicYears", universityId],
    queryFn: () => listAcademicYearsForParentAccountCollege(universityId),
    enabled: universityId > 0,
  });

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.academicYearId),
        label: y.academicYear || `Year ${y.academicYearId}`,
      })),
    [academicYears],
  );

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode || `College ${c.collegeId}`,
      })),
    [colleges],
  );

  useEffect(() => {
    setAcademicYearId(null);
    setStudentId(null);
    setStudentSearch("");
    setSelectedStudentOption(null);
    setSelectedStudentRow(null);
    setForm(EMPTY_FORM);
    setPhotoError(false);
  }, [collegeId]);

  useEffect(() => {
    setStudentId(null);
    setStudentSearch("");
    setSelectedStudentOption(null);
    setSelectedStudentRow(null);
    setForm(EMPTY_FORM);
    setPhotoError(false);
  }, [academicYearId]);

  const studentSearchEnabled =
    !!collegeId && !!academicYearId && studentSearch.trim().length > 4;

  const { data: studentRows = [], isFetching: studentsLoading } = useQuery({
    queryKey: [
      "AddSibling",
      "students",
      collegeId,
      academicYearId,
      studentSearch.trim(),
    ],
    queryFn: () =>
      listStudentsForParentAccountManage({
        collegeId: collegeId ?? 0,
        academicYearId: academicYearId ?? 0,
        q: studentSearch.trim(),
      }),
    enabled: studentSearchEnabled,
  });

  const studentIdNum = studentId ? Number(studentId) : 0;
  const { data: studentDetail } = useQuery({
    queryKey: ["AddSibling", "studentDetail", studentIdNum],
    queryFn: () => fetchStudentDetail(studentIdNum),
    enabled: studentIdNum > 0,
  });

  const studentOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    if (selectedStudentOption) {
      seen.add(selectedStudentOption.value);
      out.push(selectedStudentOption);
    }
    for (const row of studentRows as AnyRow[]) {
      const opt = studentOptionFromRow(row);
      if (!opt || seen.has(opt.value)) continue;
      seen.add(opt.value);
      out.push(opt);
    }
    return out;
  }, [studentRows, selectedStudentOption]);

  const previewStudent = useMemo((): AnyRow | null => {
    if (!studentIdNum) return null;
    const base = selectedStudentRow ?? {};
    const detail =
      studentDetail && typeof studentDetail === "object"
        ? (studentDetail as AnyRow)
        : null;
    if (!Object.keys(base).length && !detail) return null;
    return mergeStudentDetailFragment({ ...base, ...(detail ?? {}) });
  }, [studentIdNum, selectedStudentRow, studentDetail]);

  const selectedCollegeCode = useMemo(() => {
    const row = colleges.find((c) => n(c.collegeId) === (collegeId ?? 0));
    return s(row?.collegeCode);
  }, [colleges, collegeId]);

  const cardPhotoSrc = useMemo(() => {
    if (!previewStudent || photoError) return DEFAULT_STUDENT_PHOTO;
    return studentPhotoUrl(previewStudent);
  }, [previewStudent, photoError]);

  function handleStudentChange(value: string | null) {
    setStudentId(value);
    setPhotoError(false);
    if (!value) {
      setSelectedStudentOption(null);
      setSelectedStudentRow(null);
      setForm(EMPTY_FORM);
      return;
    }
    const fromSearch = studentOptions.find((o) => o.value === value);
    if (fromSearch) setSelectedStudentOption(fromSearch);
    const row =
      (studentRows as AnyRow[]).find(
        (r) =>
          String(n(r.studentId ?? r.fk_student_id ?? r.student_id)) === value,
      ) ?? null;
    setSelectedStudentRow(row);
  }

  // Angular `selectedStudent`: pName/firstName ← fatherName from the search row.
  useEffect(() => {
    if (!studentIdNum || !previewStudent) {
      if (!studentIdNum) setForm(EMPTY_FORM);
      return;
    }
    const father = pickText(previewStudent, [
      "fatherName",
      "father_name",
      "fathersName",
      "parentName",
      "parent_name",
      "fatherFirstName",
    ]);
    setForm((prev) => ({ ...prev, firstName: father }));
  }, [studentIdNum, previewStudent]);

  function clearForm() {
    setAcademicYearId(null);
    setStudentId(null);
    setSelectedStudentOption(null);
    setSelectedStudentRow(null);
    setStudentSearch("");
    setForm(EMPTY_FORM);
    setPhotoError(false);
  }

  async function handleAdd() {
    if (!userId) return toastError("Missing parent user id.");
    if (!studentIdNum || !studentDetail) {
      return toastError("Please select a student.");
    }
    if (!form.userName.trim()) return toastError("User name is required.");
    if (!form.mobileNumber.trim())
      return toastError("Mobile number is required.");
    if (!form.password || !form.passwordConfirm) {
      return toastError("Password and confirm password are required.");
    }
    if (form.password !== form.passwordConfirm) {
      return toastError("Password and confirm password must match.");
    }
    try {
      setSaving(true);
      // Angular `addParentUser`: POSTs the fetched studentdetail with `parentId` attached.
      await linkStudentAsSiblingToParent({
        parentUserId: userId,
        studentDetail: studentDetail as Record<string, unknown>,
      });
      toastSuccess("Sibling added successfully");
      clearForm();
      queryClient.invalidateQueries({ queryKey: siblingsQueryKey });
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const parentName = pickText((siblings as AnyRow[])[0], ["fatherName"]);
  const parentMobile = pickText((siblings as AnyRow[])[0], ["fatherMobileNo"]);

  return (
    <FilteredPage
      title="Sibling Accounts"
      filters={
        <div className="space-y-3">
          {siblings.length > 0 ? (
            <div className="rounded-md border border-sky-200 bg-sky-50/60 px-4 py-2.5 text-[13px]">
              <p>
                <span className="font-medium text-sky-700">Parent Name : </span>
                {parentName || "—"}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-sky-700">
                  Parent Mobile :{" "}
                </span>
                {parentMobile || "—"}
              </p>
            </div>
          ) : null}
          <GlobalFilterBarRow>
            <GlobalFilterField label="College">
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => setCollegeId(v ? Number(v) : null)}
                options={collegeOptions}
                searchable
                clearable
                isLoading={collegesLoading}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year">
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                options={academicYearOptions}
                searchable
                clearable
                disabled={!collegeId}
                isLoading={yearsLoading}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Student">
              <Select
                value={studentId}
                onChange={handleStudentChange}
                options={studentOptions}
                searchable
                clearable
                disabled={!collegeId || !academicYearId}
                isLoading={studentsLoading}
                onSearch={setStudentSearch}
                placeholder={
                  !collegeId || !academicYearId
                    ? "Select college and year first"
                    : "Search by student name or rollno."
                }
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </div>
      }
    >
      <div className="space-y-4">
        {previewStudent ? (
          <div className="rounded-md border border-sky-300/90 bg-sky-50/40 p-4 shadow-sm space-y-4">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardPhotoSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
                <p className="font-semibold text-slate-900">
                  {pickText(previewStudent, [
                    "firstName",
                    "studentName",
                    "fullName",
                    "name",
                  ]) || "—"}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    "rollNumber",
                    "hallticketNumber",
                    "hallTicketNumber",
                    "admissionNumber",
                  ]) || "—"}
                </p>
                <p className="text-slate-500 leading-snug">
                  {academicLine(previewStudent, selectedCollegeCode)}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    "mobile",
                    "mobileNumber",
                    "mobile_number",
                    "phone",
                  ]) || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="First Name">
                <Input
                  className="h-10 text-[13px]"
                  value={form.firstName}
                  disabled
                />
              </FormField>
              <FormField label="User Name" required>
                <Input
                  className="h-10 text-[13px]"
                  value={form.userName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, userName: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Email">
                <Input
                  className="h-10 text-[13px]"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Enter your password" required>
                <div className="relative">
                  <Input
                    className="h-10 text-[13px] pr-10"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormField>
              <FormField label="Confirm Password" required>
                <Input
                  className="h-10 text-[13px]"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, passwordConfirm: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Mobile Number" required>
                <Input
                  className="h-10 text-[13px]"
                  type="tel"
                  value={form.mobileNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mobileNumber: e.target.value }))
                  }
                />
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="min-w-[100px] bg-[#0a2e67] hover:bg-[#082653]"
                disabled={saving}
                onClick={() => void handleAdd()}
              >
                {saving ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="app-data-table-card overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
            Siblings
          </div>
          {siblingsLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : siblings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No siblings linked yet.
            </p>
          ) : (
            (siblings as AnyRow[]).map((row, idx) => (
              <SiblingRow key={n(row.studentId) || idx} row={row} />
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            className="min-w-[120px] bg-amber-400 text-slate-900 hover:bg-amber-500 border-0 shadow-sm"
            asChild
          >
            <Link href="/user-management/parent-accounts">Back</Link>
          </Button>
        </div>
      </div>
    </FilteredPage>
  );
}

export default function ParentAccountsAddSiblingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageContainer>
      }
    >
      <AddSiblingContent />
    </Suspense>
  );
}
