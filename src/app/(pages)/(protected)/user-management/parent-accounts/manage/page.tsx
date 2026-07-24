"use client";

/**
 * Angular parity: parent-accounts-modal (route: parent/manage)
 *
 * Colleges: domain/list/College?query=isActive==true
 * Academic years: domain/list/AcademicYear?query=College.collegeId==X.and.isActive==true.order(fromDate=DESC)
 * Student search: studentsearch?collegeId=&academicYearId=&q= (q length > 4)
 * Create: POST api/createuser
 * No print.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  FormField,
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MINIO_URL } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createParentAccount,
  listAcademicYearsForParentAccountCollege,
  listActiveCollegesForParentAccounts,
  listStudentsForParentAccountManage,
} from "@/services";

type AnyRow = Record<string, unknown>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
};

const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = s(row[key]);
    if (v) return v;
  }
  return "";
}

function studentPhotoUrl(row: AnyRow): string {
  const p = pickText(row, [
    "studentPhotoPath",
    "student_photo_path",
    "photoPath",
    "photo_path",
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

function academicLine(row: AnyRow): string {
  const section = pickText(row, ["section", "sectionName"]);
  const parts = [
    pickText(row, ["collegeCode"]),
    pickText(row, ["courseCode", "courseName"]),
    pickText(row, ["groupCode"]),
    pickText(row, ["courseYearName"]),
    section
      ? section.toLowerCase().startsWith("section")
        ? section
        : `Section ${section}`
      : "",
  ].filter(Boolean);
  return parts.join(" / ") || "—";
}

const EMPTY_FORM = {
  firstName: "",
  userName: "",
  email: "",
  password: "",
  passwordConfirm: "",
  mobileNumber: "",
};

export default function ParentAccountsManagePage() {
  const router = useRouter();
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["ParentAccountManage", "colleges"],
    queryFn: listActiveCollegesForParentAccounts,
  });

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  );

  const universityId = Number(selectedCollege?.universityId ?? 0);

  const { data: academicYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["ParentAccountManage", "academicYears", universityId],
    queryFn: () => listAcademicYearsForParentAccountCollege(universityId),
    enabled: universityId > 0,
  });

  const studentSearchEnabled =
    !!collegeId && !!academicYearId && studentSearch.trim().length > 4;

  const { data: studentRows = [], isFetching: studentsLoading } = useQuery({
    queryKey: [
      "ParentAccountManage",
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

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode || `College ${c.collegeId}`,
      })),
    [colleges],
  );

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.academicYearId),
        label: y.academicYear || `Year ${y.academicYearId}`,
      })),
    [academicYears],
  );

  const studentOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    if (selectedStudentRow) {
      const sid = String(
        n(
          selectedStudentRow.studentId ??
            selectedStudentRow.fk_student_id ??
            selectedStudentRow.student_id,
        ),
      );
      if (sid !== "0") {
        const ht = pickText(selectedStudentRow, [
          "rollNumber",
          "hallticketNumber",
          "admissionNumber",
        ]);
        const name = pickText(selectedStudentRow, ["firstName", "studentName"]);
        seen.add(sid);
        out.push({
          value: sid,
          label: ht && name ? `${ht} ${name}` : name || ht || `Student ${sid}`,
        });
      }
    }
    for (const row of studentRows as AnyRow[]) {
      const sid = String(
        n(row.studentId ?? row.fk_student_id ?? row.student_id),
      );
      if (!sid || sid === "0" || seen.has(sid)) continue;
      seen.add(sid);
      const ht = pickText(row, [
        "rollNumber",
        "hallticketNumber",
        "admissionNumber",
      ]);
      const name = pickText(row, ["firstName", "studentName"]);
      out.push({
        value: sid,
        label: ht && name ? `${ht} ${name}` : name || ht || `Student ${sid}`,
      });
    }
    return out;
  }, [studentRows, selectedStudentRow]);

  const organizationId = useMemo(() => {
    // Prefer selected college org (Angular intent); fall back to first academic year with orgId
    const fromCollege = Number(selectedCollege?.organizationId ?? 0);
    if (fromCollege) return fromCollege;
    const fromYear = academicYears.find(
      (y) => Number(y.organizationId ?? 0) > 0,
    );
    return Number(fromYear?.organizationId ?? 0);
  }, [selectedCollege, academicYears]);

  useEffect(() => {
    setAcademicYearId(null);
    setStudentId(null);
    setStudentSearch("");
    setSelectedStudentRow(null);
    setForm(EMPTY_FORM);
    setPhotoError(false);
  }, [collegeId]);

  useEffect(() => {
    setStudentId(null);
    setStudentSearch("");
    setSelectedStudentRow(null);
    setForm(EMPTY_FORM);
    setPhotoError(false);
  }, [academicYearId]);

  function handleStudentChange(value: string | null) {
    setStudentId(value);
    setPhotoError(false);
    if (!value) {
      setSelectedStudentRow(null);
      setForm(EMPTY_FORM);
      return;
    }
    const row =
      (studentRows as AnyRow[]).find(
        (r) =>
          String(n(r.studentId ?? r.fk_student_id ?? r.student_id)) === value,
      ) ??
      (selectedStudentRow &&
      String(
        n(
          selectedStudentRow.studentId ??
            selectedStudentRow.fk_student_id ??
            selectedStudentRow.student_id,
        ),
      ) === value
        ? selectedStudentRow
        : null);
    setSelectedStudentRow(row);
    // Angular selectedStudent: pName/firstName ← fatherName from search row
    const father = pickText(row, [
      "fatherName",
      "father_name",
      "fathersName",
      "parentName",
    ]);
    setForm((prev) => ({
      ...prev,
      firstName: father,
      // leave userName/email/password for the user to enter
    }));
  }

  const previewStudent = selectedStudentRow;
  const cardPhotoSrc =
    !previewStudent || photoError
      ? DEFAULT_STUDENT_PHOTO
      : studentPhotoUrl(previewStudent);

  async function handleAdd() {
    if (!collegeId) return toastError("College is required");
    if (!academicYearId) return toastError("Academic Year is required");
    if (!studentId) return toastError("Please select a student");
    if (!form.firstName.trim()) return toastError("First name is required");
    if (!form.userName.trim()) return toastError("User name is required");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      return toastError("Enter a valid email");
    }
    if (!form.password) return toastError("Password is required");
    if (!form.passwordConfirm)
      return toastError("Confirm password is required");
    if (form.password !== form.passwordConfirm) {
      return toastError("Password and confirm password must match");
    }
    if (!form.mobileNumber.trim() || !PHONE_RE.test(form.mobileNumber.trim())) {
      return toastError("Enter 10 digit number");
    }
    if (!organizationId) {
      return toastError("Organization is required to create a parent account");
    }
    try {
      setSaving(true);
      await createParentAccount({
        collegeId,
        academicYearId,
        studentId: Number(studentId),
        organizationId,
        firstName: form.firstName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
      });
      toastSuccess("Parent account created successfully");
      // Angular clear(): reset year/college/student; re-fetch colleges
      setCollegeId(null);
      setAcademicYearId(null);
      setStudentId(null);
      setStudentSearch("");
      setSelectedStudentRow(null);
      setForm(EMPTY_FORM);
      setShowPassword(false);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredPage
      title="Parent Account"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              searchable
              clearable
              isLoading={collegesLoading}
              placeholder="College"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year *">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYearOptions}
              searchable
              clearable
              disabled={!collegeId}
              isLoading={yearsLoading}
              placeholder="Academic Year"
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
                  : studentSearch.trim().length > 4
                    ? "Select student"
                    : "Search by student name or rollno."
              }
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
    >
      <div className="space-y-4">
        {previewStudent ? (
          <div className="space-y-4 rounded-md border border-sky-300/90 bg-sky-50/40 p-4 shadow-sm">
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
                  {pickText(previewStudent, ["firstName", "studentName"]) ||
                    "—"}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    "rollNumber",
                    "hallticketNumber",
                    "admissionNumber",
                  ]) || "—"}
                </p>
                <p className="leading-snug text-slate-500">
                  {academicLine(previewStudent)}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    "mobile",
                    "mobileNumber",
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
                  readOnly
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
                    className="h-10 pr-10 text-[13px]"
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

        <div className="flex justify-end">
          <Button
            type="button"
            className="min-w-[120px] border-0 bg-amber-400 text-slate-900 shadow-sm hover:bg-amber-500"
            onClick={() => router.back()}
          >
            Back
          </Button>
          {/* Fallback if history is empty */}
          <span className="sr-only">
            <Link href="/user-management/parent-accounts">Parent Accounts</Link>
          </span>
        </div>
      </div>
    </FilteredPage>
  );
}
