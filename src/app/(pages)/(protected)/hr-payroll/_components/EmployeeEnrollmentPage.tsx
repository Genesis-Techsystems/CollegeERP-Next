"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GM_CODES } from "@/config/constants/ui";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  createEmployeeEnrollment,
  getEmployeeEnrollmentById,
  listActiveCastesForEmployeeEnrollment,
  listActiveCollegesByOrganizationForEmployeeEnrollment,
  listActiveDesignationsForHr,
  listActiveOrganizationsForEmployeeEnrollment,
  listCitiesByDistrictForEmployeeEnrollment,
  listCountriesForEmployeeEnrollment,
  listDepartmentsByCollegeForEmployeeEnrollment,
  listDistrictsByStateForEmployeeEnrollment,
  listEmployeeDocumentsByCollegeForEnrollment,
  listEmployeeEnrollmentGeneralDetails,
  listQualificationsByOrganizationForEmployeeEnrollment,
  listStatesByCountryForEmployeeEnrollment,
  listSubCastesByCasteForEmployeeEnrollment,
  updateEmployeeEnrollment,
  uploadEmployeeEnrollmentFiles,
} from "@/services";

type AnyRow = Record<string, unknown>;
type Mode = "create" | "edit";
type StepId =
  | "employee"
  | "office"
  | "contact"
  | "education"
  | "experience"
  | "certificates"
  | "other";

type EducationRow = {
  nameOfInstitution: string;
  board: string;
  medium: string;
  modeofstudy: number | null;
  address: string;
  majorSubjects: string;
  gradeClassSecured: string;
  yearOfCompletion: string;
  precentage: string;
  isActive: boolean;
};

type ExperienceRow = {
  prevoiusInstitutions: string;
  designation: number | null;
  subjects: string;
  experienceDetail: string;
  fromYrMonth: Date | null;
  toYrMonth: Date | null;
  experienceYear: string;
  experienceMonth: string;
  isActive: boolean;
};

type EmployeeDocRow = {
  fileName: string;
  documentRepositoryId: number;
  doctypeCatdetId?: number | null;
  isHardCopy: boolean;
  isSoftCopy: boolean;
  isOriginal: boolean;
  isVerified: boolean;
  rackNumber: string;
  employeeDocCollId?: number | null;
  createdDt?: unknown;
  filePath?: string | null;
};

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "employee", label: "Employee Info" },
  { id: "office", label: "Office Info" },
  { id: "contact", label: "Contact Info" },
  { id: "education", label: "Education Info" },
  { id: "experience", label: "Experience Info" },
  { id: "certificates", label: "Certificates" },
  { id: "other", label: "Other Info" },
];

function asNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function asText(v: unknown): string {
  return v == null ? "" : String(v);
}
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toYmd(v: Date | null): string | null {
  if (!v) return null;
  const y = v.getFullYear();
  const m = `${v.getMonth() + 1}`.padStart(2, "0");
  const d = `${v.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
/** Angular moment dates on experience serialize as `YYYY-MM-DDT00:00:00Z`. */
function toIsoZ(v: Date | null): string {
  return `${toYmd(v ?? new Date())}T00:00:00Z`;
}
/** Angular optional selects often send `""` instead of `0` / `null`. */
function idEmpty(n: number): number | "" {
  return n > 0 ? n : "";
}
function idNull(n: number): number | null {
  return n > 0 ? n : null;
}
function textOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}
function toSelectOptions(
  rows: AnyRow[],
  valueKeys: string[],
  labelKeys: string[],
): SelectOption[] {
  return rows
    .map((row) => {
      const value = valueKeys.map((k) => asNum(row[k])).find((n) => n > 0) ?? 0;
      const label =
        labelKeys.map((k) => asText(row[k]).trim()).find((s) => s.length > 0) ??
        `${value}`;
      return value > 0 ? { value: String(value), label } : null;
    })
    .filter((x): x is SelectOption => x != null);
}
function extractResponseData(raw: unknown): AnyRow {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object") return obj.data as AnyRow;
  return obj as AnyRow;
}
function buildInitialEducation(rows?: AnyRow[]): EducationRow[] {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((r) => ({
      nameOfInstitution: asText(r.nameOfInstitution),
      board: asText(r.board),
      medium: asText(r.medium),
      modeofstudy: asNum(r.modeofstudy) || null,
      address: asText(r.address),
      majorSubjects: asText(r.majorSubjects),
      gradeClassSecured: asText(r.gradeClassSecured),
      yearOfCompletion: asText(r.yearOfCompletion),
      precentage: asText(r.precentage),
      isActive: r.isActive !== false,
    }));
  }
  return [
    {
      nameOfInstitution: "",
      board: "",
      medium: "",
      modeofstudy: null,
      address: "",
      majorSubjects: "",
      gradeClassSecured: "",
      yearOfCompletion: "",
      precentage: "",
      isActive: true,
    },
  ];
}
function buildInitialExperience(rows?: AnyRow[]): ExperienceRow[] {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((r) => ({
      prevoiusInstitutions: asText(r.prevoiusInstitutions),
      designation: asNum(r.designation) || null,
      subjects: asText(r.subjects),
      experienceDetail: asText(r.experienceDetail),
      fromYrMonth: toDate(r.fromYrMonth) ?? new Date(),
      toYrMonth: toDate(r.toYrMonth) ?? new Date(),
      experienceYear: asText(r.experienceYear),
      experienceMonth: asText(r.experienceMonth),
      isActive: r.isActive !== false,
    }));
  }
  return [
    {
      prevoiusInstitutions: "",
      designation: null,
      subjects: "",
      experienceDetail: "",
      fromYrMonth: new Date(),
      toYrMonth: new Date(),
      experienceYear: "",
      experienceMonth: "",
      isActive: true,
    },
  ];
}

const MSG = {
  required: "This field is required",
  email: "Enter a valid email",
  alphanumeric: "Enter alphanumeric letters no special characters",
  phNo: "Enter 10 digit number",
  aadharNo: "Enter valid 12 digit of aadhar number",
} as const;

const RE_EMAIL = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const RE_ALPHA = /^[a-zA-Z0-9\-\s]+$/;
const RE_PHONE = /^[6-9][0-9]{9}$/;
const RE_AADHAR = /^[0-9]{12}$/;

/* ── Field wrapper ────────────────────────────────────────────── */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/* ── Section sub-heading ─────────────────────────────────────── */
function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2 mb-4">
      <span className="text-sm font-semibold text-foreground">{children}</span>
    </div>
  );
}

/** Angular-style mat-horizontal-stepper (display-only; navigate via Back/Next). */
function EnrollmentStepper({ stepIdx }: { stepIdx: number }) {
  const progressPct =
    STEPS.length <= 1 ? 0 : Math.round((stepIdx / (STEPS.length - 1)) * 100);

  return (
    <div className="relative border-b border-slate-200 bg-sky-50/60">
      {/* Top progress line — advances with the active step */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-slate-200/80">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ol className="flex items-stretch gap-0 overflow-x-auto px-2 pb-3 pt-4">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          const upcoming = i > stepIdx;
          return (
            <li key={s.id} className="flex min-w-[6.5rem] flex-1 items-start">
              <div
                className={`flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-2 ${
                  active ? "bg-sky-100/90" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    done || active
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-300 text-white"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-center text-[11px] leading-tight ${
                    upcoming
                      ? "text-muted-foreground"
                      : active
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={`mt-[1.35rem] h-px w-3 shrink-0 self-start sm:w-5 ${
                    i < stepIdx ? "bg-primary" : "bg-slate-300"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function EmployeeEnrollmentPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = asNum(searchParams.get("employeeId"));
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<Record<number, File>>({});
  const [baseEmployee, setBaseEmployee] = useState<AnyRow>({});
  const [orgCode, setOrgCode] = useState("");
  const [collegeCode, setCollegeCode] = useState("");

  /* ── Master data ──────────────────────────────────────────── */
  const [organizations, setOrganizations] = useState<AnyRow[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [titles, setTitles] = useState<AnyRow[]>([]);
  const [genders, setGenders] = useState<AnyRow[]>([]);
  const [nationalities, setNationalities] = useState<AnyRow[]>([]);
  const [religions, setReligions] = useState<AnyRow[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<AnyRow[]>([]);
  const [castes, setCastes] = useState<AnyRow[]>([]);
  const [subCastes, setSubCastes] = useState<AnyRow[]>([]);
  const [empStatuses, setEmpStatuses] = useState<AnyRow[]>([]);
  const [empStates, setEmpStates] = useState<AnyRow[]>([]);
  const [empTypes, setEmpTypes] = useState<AnyRow[]>([]);
  const [empGrades, setEmpGrades] = useState<AnyRow[]>([]);
  const [empCategories, setEmpCategories] = useState<AnyRow[]>([]);
  const [empWorkCategories, setEmpWorkCategories] = useState<AnyRow[]>([]);
  const [teacherFor, setTeacherFor] = useState<AnyRow[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AnyRow[]>([]);
  const [payModes, setPayModes] = useState<AnyRow[]>([]);
  const [residents, setResidents] = useState<AnyRow[]>([]);
  const [accommodations, setAccommodations] = useState<AnyRow[]>([]);
  const [bloodGroups, setBloodGroups] = useState<AnyRow[]>([]);
  const [modeOfStudy, setModeOfStudy] = useState<AnyRow[]>([]);
  const [countries, setCountries] = useState<AnyRow[]>([]);
  const [presentStates, setPresentStates] = useState<AnyRow[]>([]);
  const [presentDistricts, setPresentDistricts] = useState<AnyRow[]>([]);
  const [presentCities, setPresentCities] = useState<AnyRow[]>([]);
  const [permStates, setPermStates] = useState<AnyRow[]>([]);
  const [permDistricts, setPermDistricts] = useState<AnyRow[]>([]);
  const [permCities, setPermCities] = useState<AnyRow[]>([]);
  const [departments, setDepartments] = useState<AnyRow[]>([]);
  const [designations, setDesignations] = useState<AnyRow[]>([]);
  const [qualifications, setQualifications] = useState<AnyRow[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocRow[]>([]);

  /* ── Step form states ─────────────────────────────────────── */
  const [employee, setEmployee] = useState({
    organizationId: 0,
    collegeId: 0,
    empNumber: "",
    joiningDate: new Date() as Date | null,
    titleId: 0,
    firstName: "",
    middleName: "",
    lastName: "",
    genderId: 0,
    fatherName: "",
    motherName: "",
    nationalityId: 0,
    religionId: 0,
    casteId: 0,
    subCasteId: 0,
    dateOfBirth: null as Date | null,
    maritalStatusId: 0,
    weddingDate: null as Date | null,
    mobile: "",
    email: "",
    address: "",
  });

  const [office, setOffice] = useState({
    jntuRegNo: "",
    aicteRegNo: "",
    joiningDate: new Date() as Date | null,
    jntuDateOfJoining: new Date() as Date | null,
    empStatusId: 0,
    empStateId: 0,
    dateOfRelieving: null as Date | null,
    empTypeId: 0,
    tenureDays: "",
    empDeptId: 0,
    empWorkingDeptId: 0,
    qualificationId: 0,
    designationId: 0,
    workingDesignationId: 0,
    empgrade: 0,
    currentPayId: 0,
    payrollPayId: 0,
    payscaleId: 0,
    empCategoryId: 0,
    empWrkCategoryId: 0,
    teachingforId: 0,
    appointmentId: 0,
    serviceBreakYrs: "",
  });

  const [contact, setContact] = useState({
    presentAddress: "",
    countryPresentId: 0,
    statePresentId: 0,
    districtPresentId: 0,
    cityPresentId: 0,
    presentStreet: "",
    presentMandal: "",
    presentPincode: "",
    permanentAddress: "",
    countryPermanentId: 0,
    statePermanentId: 0,
    districtPermanentId: 0,
    cityPermanentId: 0,
    permanentStreet: "",
    permanentMandal: "",
    permanentPincode: "",
    officialMobile: "",
    residencePhone: "",
    emergencyMobile: "",
  });

  const [other, setOther] = useState({
    bloodgroupId: 0,
    aadharNo: "",
    pancard: "",
    voterId: "",
    passportNo: "",
    epfNo: "",
    esiRegNo: "",
    licNo: "",
    paymodeId: 0,
    promotedDate: new Date() as Date | null,
    resignationDate: new Date() as Date | null,
    monthlySalary: "",
    residentId: 0,
    accommodationId: 0,
    biometricCode: "",
    isRatified: false,
    isManager: false,
    isUsingCampAccommodation: false,
    isUsingTransport: false,
    isTds: false,
    isPtax: false,
    bankName: "",
    accountNumber: "",
    branchName: "",
    ifscCode: "",
    bankAddress: "",
    ddPayableAddress: "",
    phone: "",
  });

  const [education, setEducation] = useState<EducationRow[]>(
    buildInitialEducation(),
  );
  const [experience, setExperience] = useState<ExperienceRow[]>(
    buildInitialExperience(),
  );

  /* ── Memoised options ─────────────────────────────────────── */
  const organizationOptions = useMemo(
    () =>
      toSelectOptions(
        organizations,
        ["organizationId"],
        ["orgCode", "orgName"],
      ),
    [organizations],
  );
  const collegeOptions = useMemo(
    () =>
      toSelectOptions(colleges, ["collegeId"], ["collegeCode", "collegeName"]),
    [colleges],
  );
  const designationOptions = useMemo(
    () => toSelectOptions(designations, ["designationId"], ["designationName"]),
    [designations],
  );
  const departmentOptions = useMemo(
    () => toSelectOptions(departments, ["departmentId"], ["deptName"]),
    [departments],
  );
  const qualificationOptions = useMemo(
    () =>
      toSelectOptions(
        qualifications,
        ["qualificationId"],
        ["qualificationName"],
      ),
    [qualifications],
  );
  const countryOptions = useMemo(
    () => toSelectOptions(countries, ["countryId"], ["countryName"]),
    [countries],
  );
  const casteOptions = useMemo(
    () => toSelectOptions(castes, ["casteId"], ["caste"]),
    [castes],
  );
  const subCasteOptions = useMemo(
    () => toSelectOptions(subCastes, ["subCasteId"], ["subCaste"]),
    [subCastes],
  );
  const titleOptions = useMemo(
    () =>
      toSelectOptions(
        titles,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [titles],
  );
  const genderOptions = useMemo(
    () =>
      toSelectOptions(
        genders,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [genders],
  );
  const nationalityOptions = useMemo(
    () =>
      toSelectOptions(
        nationalities,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [nationalities],
  );
  const religionOptions = useMemo(
    () =>
      toSelectOptions(
        religions,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [religions],
  );
  const maritalStatusOptions = useMemo(
    () =>
      toSelectOptions(
        maritalStatuses,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [maritalStatuses],
  );
  const empStatusOptions = useMemo(
    () =>
      toSelectOptions(
        empStatuses,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empStatuses],
  );
  const empStateOptions = useMemo(
    () =>
      toSelectOptions(
        empStates,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empStates],
  );
  const empTypeOptions = useMemo(
    () =>
      toSelectOptions(
        empTypes,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empTypes],
  );
  const empGradeOptions = useMemo(
    () =>
      toSelectOptions(
        empGrades,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empGrades],
  );
  const empCategoryOptions = useMemo(
    () =>
      toSelectOptions(
        empCategories,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empCategories],
  );
  const empWorkCategoryOptions = useMemo(
    () =>
      toSelectOptions(
        empWorkCategories,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [empWorkCategories],
  );
  const teacherForOptions = useMemo(
    () =>
      toSelectOptions(
        teacherFor,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [teacherFor],
  );
  const appointmentTypeOptions = useMemo(
    () =>
      toSelectOptions(
        appointmentTypes,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [appointmentTypes],
  );
  const payModeOptions = useMemo(
    () =>
      toSelectOptions(
        payModes,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [payModes],
  );
  const residentOptions = useMemo(
    () =>
      toSelectOptions(
        residents,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [residents],
  );
  const accommodationOptions = useMemo(
    () =>
      toSelectOptions(
        accommodations,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [accommodations],
  );
  const bloodGroupOptions = useMemo(
    () =>
      toSelectOptions(
        bloodGroups,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [bloodGroups],
  );
  const modeOfStudyOptions = useMemo(
    () =>
      toSelectOptions(
        modeOfStudy,
        ["generalDetailId"],
        ["generalDetailDisplayName"],
      ),
    [modeOfStudy],
  );
  const presentStateOptions = useMemo(
    () => toSelectOptions(presentStates, ["stateId"], ["stateName"]),
    [presentStates],
  );
  const presentDistrictOptions = useMemo(
    () => toSelectOptions(presentDistricts, ["districtId"], ["districtName"]),
    [presentDistricts],
  );
  const presentCityOptions = useMemo(
    () => toSelectOptions(presentCities, ["cityId"], ["cityName"]),
    [presentCities],
  );
  const permStateOptions = useMemo(
    () => toSelectOptions(permStates, ["stateId"], ["stateName"]),
    [permStates],
  );
  const permDistrictOptions = useMemo(
    () => toSelectOptions(permDistricts, ["districtId"], ["districtName"]),
    [permDistricts],
  );
  const permCityOptions = useMemo(
    () => toSelectOptions(permCities, ["cityId"], ["cityName"]),
    [permCities],
  );

  /* ── Load masters ─────────────────────────────────────────── */
  async function loadMasters() {
    const results = await Promise.all([
      listActiveOrganizationsForEmployeeEnrollment(),
      listActiveCastesForEmployeeEnrollment(),
      listCountriesForEmployeeEnrollment(),
      listActiveDesignationsForHr(),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.TITLE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.GENDER),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.NATIONALITY),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.RELIGION),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.MARITAL_STATUS),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_STATUS),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_STATE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_TYPE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_GRADE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_CATEGORY),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.EMPLOYEE_WORK_CATEGORY),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.TEACHER_FOR),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.APPOINTMENT_TYPE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.PAY_MODE),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.RESIDENT),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.ACCOMMODATION),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.BLOOD_GROUP),
      listEmployeeEnrollmentGeneralDetails(GM_CODES.MODE_OF_STUDY),
    ]);
    setOrganizations(results[0]);
    setCastes(results[1]);
    setCountries(results[2]);
    setDesignations(results[3]);
    setTitles(results[4]);
    setGenders(results[5]);
    setNationalities(results[6]);
    setReligions(results[7]);
    setMaritalStatuses(results[8]);
    setEmpStatuses(results[9]);
    setEmpStates(results[10]);
    setEmpTypes(results[11]);
    setEmpGrades(results[12]);
    setEmpCategories(results[13]);
    setEmpWorkCategories(results[14]);
    setTeacherFor(results[15]);
    setAppointmentTypes(results[16]);
    setPayModes(results[17]);
    setResidents(results[18]);
    setAccommodations(results[19]);
    setBloodGroups(results[20]);
    setModeOfStudy(results[21]);
    // Angular sets empStatusId to ACTV when statuses load / on submit
    const actv = results[9].find(
      (x) =>
        asText(x.generalDetailCode) === GM_CODES.EMP_ACTIVE_STATUS ||
        asText(x.generalDetailCode) === "ACTV",
    );
    if (actv) {
      setOffice((p) =>
        p.empStatusId ? p : { ...p, empStatusId: asNum(actv.generalDetailId) },
      );
    }
  }

  useEffect(() => {
    setOrgCode(localStorage.getItem("orgCode") ?? "");
    setCollegeCode(localStorage.getItem("collegeCode") ?? "");
    void loadMasters().catch((e) => toastError(e, "Failed to load masters"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!employee.organizationId) return;
    void Promise.all([
      listActiveCollegesByOrganizationForEmployeeEnrollment(
        employee.organizationId,
      ),
      listQualificationsByOrganizationForEmployeeEnrollment(
        employee.organizationId,
      ),
    ])
      .then(([cols, quals]) => {
        setColleges(cols);
        setQualifications(quals);
      })
      .catch((e) => toastError(e, "Failed to load colleges/qualifications"));
  }, [employee.organizationId]);

  useEffect(() => {
    if (!employee.collegeId) return;
    void Promise.all([
      listDepartmentsByCollegeForEmployeeEnrollment(employee.collegeId),
      listEmployeeDocumentsByCollegeForEnrollment(employee.collegeId),
    ])
      .then(([depts, docs]) => {
        setDepartments(depts);
        setDocuments(
          docs.map((d) => ({
            fileName: asText(d.docName || d.fileName),
            documentRepositoryId: asNum(d.documentRepositoryId),
            doctypeCatdetId: asNum(d.docTypeId) || null,
            isHardCopy: false,
            isSoftCopy: false,
            isOriginal: false,
            isVerified: false,
            rackNumber: "",
            filePath: null,
          })),
        );
      })
      .catch((e) => toastError(e, "Failed to load departments/documents"));
  }, [employee.collegeId]);

  useEffect(() => {
    if (!employee.casteId) {
      setSubCastes([]);
      return;
    }
    void listSubCastesByCasteForEmployeeEnrollment(employee.casteId)
      .then(setSubCastes)
      .catch((e) => toastError(e, "Failed to load sub castes"));
  }, [employee.casteId]);

  useEffect(() => {
    if (!contact.countryPresentId) {
      setPresentStates([]);
      return;
    }
    void listStatesByCountryForEmployeeEnrollment(contact.countryPresentId)
      .then(setPresentStates)
      .catch((e) => toastError(e, "Failed to load states"));
  }, [contact.countryPresentId]);
  useEffect(() => {
    if (!contact.statePresentId) {
      setPresentDistricts([]);
      return;
    }
    void listDistrictsByStateForEmployeeEnrollment(contact.statePresentId)
      .then(setPresentDistricts)
      .catch((e) => toastError(e, "Failed to load districts"));
  }, [contact.statePresentId]);
  useEffect(() => {
    if (!contact.districtPresentId) {
      setPresentCities([]);
      return;
    }
    void listCitiesByDistrictForEmployeeEnrollment(contact.districtPresentId)
      .then(setPresentCities)
      .catch((e) => toastError(e, "Failed to load cities"));
  }, [contact.districtPresentId]);
  useEffect(() => {
    if (!contact.countryPermanentId) {
      setPermStates([]);
      return;
    }
    void listStatesByCountryForEmployeeEnrollment(contact.countryPermanentId)
      .then(setPermStates)
      .catch((e) => toastError(e, "Failed to load states"));
  }, [contact.countryPermanentId]);
  useEffect(() => {
    if (!contact.statePermanentId) {
      setPermDistricts([]);
      return;
    }
    void listDistrictsByStateForEmployeeEnrollment(contact.statePermanentId)
      .then(setPermDistricts)
      .catch((e) => toastError(e, "Failed to load districts"));
  }, [contact.statePermanentId]);
  useEffect(() => {
    if (!contact.districtPermanentId) {
      setPermCities([]);
      return;
    }
    void listCitiesByDistrictForEmployeeEnrollment(contact.districtPermanentId)
      .then(setPermCities)
      .catch((e) => toastError(e, "Failed to load cities"));
  }, [contact.districtPermanentId]);

  /* ── Edit mode – load employee ────────────────────────────── */
  useEffect(() => {
    if (mode !== "edit") return;
    if (!employeeId) {
      toastInfo("Missing employeeId in URL.");
      return;
    }
    void (async () => {
      setIsLoading(true);
      try {
        const row = await getEmployeeEnrollmentById(employeeId);
        if (!row) throw new Error("Employee not found");
        setBaseEmployee(row);
        setEmployee({
          organizationId: asNum(row.organizationId),
          collegeId: asNum(row.collegeId),
          empNumber: asText(row.empNumber),
          joiningDate: toDate(row.joiningDate) ?? new Date(),
          titleId: asNum(row.titleId),
          firstName: asText(row.firstName),
          middleName: asText(row.middleName),
          lastName: asText(row.lastName),
          genderId: asNum(row.genderId),
          fatherName: asText(row.fatherName),
          motherName: asText(row.motherName),
          nationalityId: asNum(row.nationalityId),
          religionId: asNum(row.religionId),
          casteId: asNum(row.casteId),
          subCasteId: asNum(row.subCasteId),
          dateOfBirth: toDate(row.dateOfBirth),
          maritalStatusId: asNum(row.maritalStatusId),
          weddingDate: toDate(row.weddingDate),
          mobile: asText(row.mobile),
          email: asText(row.email),
          address: asText(row.address),
        });
        setOffice((p) => ({
          ...p,
          jntuRegNo: asText(row.jntuRegNo),
          aicteRegNo: asText(row.aicteRegNo),
          joiningDate: toDate(row.joiningDate),
          jntuDateOfJoining: toDate(row.jntuDateOfJoining),
          empStatusId: asNum(row.empStatusId),
          empStateId: asNum(row.empStateId),
          dateOfRelieving: toDate(row.dateOfRelieving),
          empTypeId: asNum(row.empTypeId),
          tenureDays: asText(row.tenureDays),
          empDeptId: asNum(row.empDeptId),
          empWorkingDeptId: asNum(row.empWorkingDeptId),
          qualificationId: asNum(row.qualificationId),
          designationId: asNum(row.designationId),
          workingDesignationId: asNum(row.workingDesignationId),
          empgrade: asNum(row.empgrade),
          currentPayId: asNum(row.currentPayId),
          payrollPayId: asNum(row.payrollPayId),
          payscaleId: asNum(row.payscaleId),
          empCategoryId: asNum(row.empCategoryId),
          empWrkCategoryId: asNum(row.empWrkCategoryId),
          teachingforId: asNum(row.teachingforId),
          appointmentId: asNum(row.appointmentId),
          serviceBreakYrs: asText(row.serviceBreakYrs),
        }));
        setContact({
          presentAddress: asText(row.presentAddress),
          countryPresentId: asNum(row.presentCountryId || row.countryPresentId),
          statePresentId: asNum(row.presentStateId || row.statePresentId),
          districtPresentId: asNum(row.districtPresentId),
          cityPresentId: asNum(row.cityPresentId),
          presentStreet: asText(row.presentStreet),
          presentMandal: asText(row.presentMandal),
          presentPincode: asText(row.presentPincode),
          permanentAddress: asText(row.permanentAddress),
          countryPermanentId: asNum(
            row.permanentCountryId || row.countryPermanentId,
          ),
          statePermanentId: asNum(row.permanentStateId || row.statePermanentId),
          districtPermanentId: asNum(row.districtPermanentId),
          cityPermanentId: asNum(row.cityPermanentId),
          permanentStreet: asText(row.permanentStreet),
          permanentMandal: asText(row.permanentMandal),
          permanentPincode: asText(row.permanentPincode),
          officialMobile: asText(row.officialMobile),
          residencePhone: asText(row.residencePhone),
          emergencyMobile: asText(row.emergencyMobile),
        });
        setOther((p) => ({
          ...p,
          bloodgroupId: asNum(row.bloodgroupId),
          aadharNo: asText(row.aadharNo),
          pancard: asText(row.pancard),
          voterId: asText(row.voterId),
          passportNo: asText(row.passportNo),
          epfNo: asText(row.epfNo),
          esiRegNo: asText(row.esiRegNo),
          licNo: asText(row.licNo),
          paymodeId: asNum(row.paymodeId),
          promotedDate: toDate(row.promotedDate),
          resignationDate: toDate(row.resignationDate),
          monthlySalary: asText(row.monthlySalary),
          residentId: asNum(row.residentId),
          accommodationId: asNum(row.accommodationId),
          biometricCode: asText(row.biometricCode),
          isRatified: row.isRatified === true,
          isManager: row.isManager === true,
          isUsingCampAccommodation: row.isUsingCampAccommodation === true,
          isUsingTransport: row.isUsingTransport === true,
          isTds: row.isTds === true,
          isPtax: row.isPtax === true,
          bankName: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).bankName
              : "",
          ),
          accountNumber: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).accountNumber
              : "",
          ),
          branchName: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).branchName
              : "",
          ),
          ifscCode: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).ifscCode
              : "",
          ),
          bankAddress: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).bankAddress
              : "",
          ),
          ddPayableAddress: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).ddPayableAddress
              : "",
          ),
          phone: asText(
            Array.isArray(row.employeeBankDetails) && row.employeeBankDetails[0]
              ? (row.employeeBankDetails[0] as AnyRow).phone
              : "",
          ),
        }));
        setEducation(
          buildInitialEducation(
            Array.isArray(row.employeeEducations)
              ? (row.employeeEducations as AnyRow[])
              : [],
          ),
        );
        setExperience(
          buildInitialExperience(
            Array.isArray(row.empExperienceDetails)
              ? (row.empExperienceDetails as AnyRow[])
              : [],
          ),
        );
        if (asText(row.photoPath)) setPhotoPreview(asText(row.photoPath));
      } catch (e) {
        toastError(e, "Failed to load employee details");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [mode, employeeId]);

  /* ── Validation ───────────────────────────────────────────── */
  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateEmployeeStep(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!employee.organizationId) e.organizationId = MSG.required;
    if (!employee.collegeId) e.collegeId = MSG.required;
    if (!employee.joiningDate) e.joiningDate = MSG.required;
    if (!employee.firstName.trim()) e.firstName = MSG.required;
    else if (!RE_ALPHA.test(employee.firstName.trim()))
      e.firstName = MSG.alphanumeric;
    if (!employee.lastName.trim()) e.lastName = MSG.required;
    else if (!RE_ALPHA.test(employee.lastName.trim()))
      e.lastName = MSG.alphanumeric;
    if (
      employee.fatherName.trim() &&
      !RE_ALPHA.test(employee.fatherName.trim())
    )
      e.fatherName = MSG.alphanumeric;
    if (
      employee.motherName.trim() &&
      !RE_ALPHA.test(employee.motherName.trim())
    )
      e.motherName = MSG.alphanumeric;
    if (!employee.genderId) e.genderId = MSG.required;
    if (!employee.dateOfBirth) e.dateOfBirth = MSG.required;
    if (!employee.mobile.trim()) e.mobile = MSG.required;
    else if (!RE_PHONE.test(employee.mobile.trim())) e.mobile = MSG.phNo;
    if (!employee.email.trim()) e.email = MSG.required;
    else if (!RE_EMAIL.test(employee.email.trim())) e.email = MSG.email;
    return e;
  }

  function validateOfficeStep(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!office.empDeptId) e.empDeptId = MSG.required;
    if (!office.empWorkingDeptId) e.empWorkingDeptId = MSG.required;
    if (!office.qualificationId) e.qualificationId = MSG.required;
    if (!office.designationId) e.designationId = MSG.required;
    if (!office.workingDesignationId) e.workingDesignationId = MSG.required;
    if (!office.empCategoryId) e.empCategoryId = MSG.required;
    return e;
  }

  function validateContactStep(): Record<string, string> {
    const e: Record<string, string> = {};
    if (
      contact.officialMobile.trim() &&
      !RE_PHONE.test(contact.officialMobile.trim())
    )
      e.officialMobile = MSG.phNo;
    if (
      contact.emergencyMobile.trim() &&
      !RE_PHONE.test(contact.emergencyMobile.trim())
    )
      e.emergencyMobile = MSG.phNo;
    return e;
  }

  function validateOtherStep(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!other.aadharNo.trim()) e.aadharNo = MSG.required;
    else if (!RE_AADHAR.test(other.aadharNo.trim())) e.aadharNo = MSG.aadharNo;
    return e;
  }

  function validateCurrentStep(): boolean {
    let nextErrors: Record<string, string> = {};
    if (stepIdx === 0) nextErrors = validateEmployeeStep();
    else if (stepIdx === 1) nextErrors = validateOfficeStep();
    else if (stepIdx === 2) nextErrors = validateContactStep();
    else if (stepIdx === 6) nextErrors = validateOtherStep();
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    setErrors({});
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors({});
    if (stepIdx === 0) {
      router.push("/hr-payroll/employee/employee-list");
      return;
    }
    setStepIdx((i) => i - 1);
  }

  /* ── Submit ───────────────────────────────────────────────── */
  async function handleSubmit() {
    // Re-validate all gated steps before save
    const empErr = validateEmployeeStep();
    if (Object.keys(empErr).length) {
      setErrors(empErr);
      setStepIdx(0);
      return;
    }
    const offErr = validateOfficeStep();
    if (Object.keys(offErr).length) {
      setErrors(offErr);
      setStepIdx(1);
      return;
    }
    const contactErr = validateContactStep();
    if (Object.keys(contactErr).length) {
      setErrors(contactErr);
      setStepIdx(2);
      return;
    }
    const otherErr = validateOtherStep();
    if (Object.keys(otherErr).length) {
      setErrors(otherErr);
      setStepIdx(6);
      return;
    }

    const selectedDocs = documents
      .filter(
        (d) =>
          d.isHardCopy ||
          d.isSoftCopy ||
          d.isOriginal ||
          d.isVerified ||
          (mode === "edit" && d.employeeDocCollId),
      )
      .map((d) => ({
        fileName: d.fileName,
        documentRepositoryId: d.documentRepositoryId,
        doctypeCatdetId: d.doctypeCatdetId ?? undefined,
        isHardCopy: d.isHardCopy,
        isSoftCopy: d.isSoftCopy,
        isOriginal: d.isOriginal,
        isVerified: d.isVerified,
        rackNumber: d.rackNumber || "",
        isActive: true,
        ...(d.employeeDocCollId
          ? { employeeDocCollId: d.employeeDocCollId }
          : {}),
      }));

    // Match Angular submit: set ACTV status; empty optional FKs as "" / null (never 0)
    const actvId =
      asNum(
        empStatuses.find((x) => asText(x.generalDetailCode) === "ACTV")
          ?.generalDetailId,
      ) || office.empStatusId;

    const payload: AnyRow = {
      jntuRegNo: office.jntuRegNo,
      aicteRegNo: office.aicteRegNo,
      joiningDate: toYmd(employee.joiningDate),
      jntuDateOfJoining: toYmd(office.jntuDateOfJoining ?? new Date()),
      empStatusId: actvId || "",
      empStateId: idEmpty(office.empStateId),
      dateOfRelieving: toYmd(office.dateOfRelieving),
      empTypeId: idEmpty(office.empTypeId),
      tenureDays: office.tenureDays,
      empDeptId: office.empDeptId,
      empWorkingDeptId: office.empWorkingDeptId,
      qualificationId: office.qualificationId,
      designationId: office.designationId,
      workingDesignationId: office.workingDesignationId,
      empgrade: idEmpty(office.empgrade),
      currentPayId: idEmpty(office.currentPayId),
      payrollPayId: idEmpty(office.payrollPayId),
      payscaleId: idEmpty(office.payscaleId),
      empCategoryId: office.empCategoryId,
      empWrkCategoryId: idEmpty(office.empWrkCategoryId),
      teachingforId: idNull(office.teachingforId),
      appointmentId: idNull(office.appointmentId),
      serviceBreakYrs: office.serviceBreakYrs.trim()
        ? office.serviceBreakYrs
        : null,
      organizationId: employee.organizationId,
      collegeId: employee.collegeId,
      email: employee.email,
      titleId: idNull(employee.titleId),
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      genderId: employee.genderId,
      fatherName: employee.fatherName,
      motherName: employee.motherName,
      nationalityId: idEmpty(employee.nationalityId),
      religionId: idEmpty(employee.religionId),
      casteId: idEmpty(employee.casteId),
      subCasteId: idEmpty(employee.subCasteId),
      dateOfBirth: toYmd(employee.dateOfBirth),
      maritalStatusId: idEmpty(employee.maritalStatusId),
      mobile: Number(employee.mobile),
      address: employee.address,
      presentAddress: contact.presentAddress,
      countryPresentId: idNull(contact.countryPresentId),
      statePresentId: idNull(contact.statePresentId),
      districtPresentId: idEmpty(contact.districtPresentId),
      cityPresentId: idEmpty(contact.cityPresentId),
      presentStreet: textOrNull(contact.presentStreet),
      presentMandal: contact.presentMandal,
      presentPincode: textOrNull(contact.presentPincode),
      permanentAddress: contact.permanentAddress,
      countryPermanentId: idNull(contact.countryPermanentId),
      statePermanentId: idNull(contact.statePermanentId),
      districtPermanentId: idEmpty(contact.districtPermanentId),
      cityPermanentId: idEmpty(contact.cityPermanentId),
      permanentStreet: contact.permanentStreet,
      permanentMandal: contact.permanentMandal,
      permanentPincode: textOrNull(contact.permanentPincode),
      officialMobile: contact.officialMobile,
      residencePhone: contact.residencePhone,
      emergencyMobile: contact.emergencyMobile,
      pancard: other.pancard,
      passportNo: other.passportNo,
      aadharNo: Number(other.aadharNo),
      voterId: other.voterId,
      bloodgroupId: idEmpty(other.bloodgroupId),
      epfNo: other.epfNo,
      esiRegNo: other.esiRegNo,
      licNo: other.licNo,
      paymodeId: idEmpty(other.paymodeId),
      promotedDate: toYmd(other.promotedDate ?? new Date()),
      resignationDate: toYmd(other.resignationDate ?? new Date()),
      monthlySalary: other.monthlySalary ? Number(other.monthlySalary) : null,
      residentId: idEmpty(other.residentId),
      accommodationId: idEmpty(other.accommodationId),
      biometricCode: other.biometricCode,
      isRatified: other.isRatified,
      isManager: other.isManager,
      isUsingCampAccommodation: other.isUsingCampAccommodation,
      isUsingTransport: other.isUsingTransport,
      isTds: other.isTds,
      isPtax: other.isPtax,
      isActive: true,
      districtId: 1,
      employeeDocumentCollection: selectedDocs,
      employeeBankDetails: [
        {
          bankName: textOrNull(other.bankName),
          accountNumber: textOrNull(other.accountNumber),
          branchName: textOrNull(other.branchName),
          ifscCode: textOrNull(other.ifscCode),
          bankAddress: textOrNull(other.bankAddress),
          ddPayableAddress: textOrNull(other.ddPayableAddress),
          phone: textOrNull(other.phone),
        },
      ],
      empExperienceDetails: experience.map((x) => ({
        designation: x.designation ? x.designation : "",
        experienceDetail: x.experienceDetail,
        experienceMonth: x.experienceMonth,
        experienceYear: x.experienceYear,
        fromYrMonth: toIsoZ(x.fromYrMonth),
        prevoiusInstitutions: x.prevoiusInstitutions,
        subjects: x.subjects,
        toYrMonth: toIsoZ(x.toYrMonth),
        isActive: true,
      })),
      employeeEducations: education.map((x) => ({
        nameOfInstitution: x.nameOfInstitution,
        board: x.board,
        address: x.address,
        majorSubjects: x.majorSubjects,
        medium: x.medium,
        gradeClassSecured: x.gradeClassSecured,
        yearOfCompletion: x.yearOfCompletion,
        precentage: x.precentage,
        modeofstudy: x.modeofstudy ? x.modeofstudy : "",
        isActive: true,
      })),
    };

    if (employee.weddingDate) {
      payload.weddingDate = toYmd(employee.weddingDate);
    }

    if (mode === "edit") {
      payload.employeeId = asNum(baseEmployee.employeeId) || employeeId;
      payload.empNumber = employee.empNumber;
      payload.currentPayId = office.currentPayId || 1;
      payload.payrollPayId = office.payrollPayId || 1;
      payload.payscaleId = office.payscaleId || 1;
      if (
        Array.isArray(baseEmployee.employeeBankDetails) &&
        baseEmployee.employeeBankDetails[0]
      ) {
        payload.employeeBankDetails = [
          {
            ...(baseEmployee.employeeBankDetails[0] as AnyRow),
            bankName: textOrNull(other.bankName),
            accountNumber: textOrNull(other.accountNumber),
            branchName: textOrNull(other.branchName),
            ifscCode: textOrNull(other.ifscCode),
            bankAddress: textOrNull(other.bankAddress),
            ddPayableAddress: textOrNull(other.ddPayableAddress),
            phone: textOrNull(other.phone),
          },
        ];
      }
    }

    setIsSaving(true);
    try {
      const raw =
        mode === "edit"
          ? await updateEmployeeEnrollment(payload)
          : await createEmployeeEnrollment(payload);
      const data = extractResponseData(raw);
      const savedEmployeeId =
        asNum(data.employeeId) || asNum(baseEmployee.employeeId) || employeeId;
      const savedEmpNumber =
        asText(data.empNumber) || asText(baseEmployee.empNumber);
      const hasDocs = Object.keys(docFiles).length > 0;
      if (savedEmployeeId > 0 && (photoFile || hasDocs)) {
        const formData = new FormData();
        formData.append("orgCode", orgCode);
        formData.append("collegeCode", collegeCode);
        formData.append("employeeId", String(savedEmployeeId));
        formData.append("empNumber", savedEmpNumber);
        if (photoFile) formData.append("photoFile", photoFile, photoFile.name);
        const docColl = Array.isArray(data.employeeDocumentCollection)
          ? (data.employeeDocumentCollection as AnyRow[])
          : [];
        for (const doc of docColl) {
          const repoId = asNum(doc.documentRepositoryId);
          const collId = asText(doc.employeeDocCollId);
          const file = docFiles[repoId];
          if (file && collId) formData.append(collId, file, file.name);
        }
        await uploadEmployeeEnrollmentFiles(formData);
      }
      toastSuccess(
        mode === "edit"
          ? "Employee updated successfully."
          : "Employee created successfully.",
      );
      router.push("/hr-payroll/employee/employee-list");
    } catch (e) {
      toastError(e, `Save failed: ${getErrorMessage(e)}`);
    } finally {
      setIsSaving(false);
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  const stepId = STEPS[stepIdx]?.id;

  return (
    <PageContainer className="space-y-5">
      {/* Single rounded card: heading + stepper + form */}
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "none" }}>
          <h1 className="text-[15px] font-semibold leading-tight text-foreground">
            {mode === "edit" ? "Edit Enrolment" : "Employee Admission"}
          </h1>
        </div>

        <EnrollmentStepper stepIdx={stepIdx} />

        <div className="p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading employee details…
            </p>
          ) : (
            <>
              {/* ────────────── STEP 1: Employee Info ────────────── */}
              {stepId === "employee" && (
                <div className="space-y-4">
                  <SubHeader>Employee Information</SubHeader>

                  {/* Top: fields left + photo right (Angular layout) */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Employee Number">
                          <Input
                            type="number"
                            placeholder="Employee Number"
                            value={employee.empNumber}
                            onChange={(e) =>
                              setEmployee((p) => ({
                                ...p,
                                empNumber: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field
                          label="Organization *"
                          error={errors.organizationId}
                        >
                          <Select
                            value={
                              employee.organizationId
                                ? String(employee.organizationId)
                                : null
                            }
                            onChange={(v) => {
                              clearError("organizationId");
                              setEmployee((p) => ({
                                ...p,
                                organizationId: asNum(v),
                                collegeId: 0,
                              }));
                            }}
                            options={organizationOptions}
                            placeholder="Organization"
                          />
                        </Field>
                        <Field label="College *" error={errors.collegeId}>
                          <Select
                            value={
                              employee.collegeId
                                ? String(employee.collegeId)
                                : null
                            }
                            onChange={(v) => {
                              clearError("collegeId");
                              setEmployee((p) => ({
                                ...p,
                                collegeId: asNum(v),
                              }));
                            }}
                            options={collegeOptions}
                            placeholder="College"
                          />
                        </Field>
                        <Field
                          label="Joining Date *"
                          error={errors.joiningDate}
                        >
                          <DatePicker
                            value={employee.joiningDate}
                            onChange={(v) => {
                              clearError("joiningDate");
                              setEmployee((p) => ({ ...p, joiningDate: v }));
                            }}
                            placeholder="Joining Date"
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Title">
                          <Select
                            value={
                              employee.titleId ? String(employee.titleId) : null
                            }
                            onChange={(v) =>
                              setEmployee((p) => ({ ...p, titleId: asNum(v) }))
                            }
                            options={titleOptions}
                            placeholder="Title"
                          />
                        </Field>
                        <Field
                          label="First Name (as per SSC) *"
                          error={errors.firstName}
                        >
                          <Input
                            placeholder="First Name"
                            value={employee.firstName}
                            onChange={(e) => {
                              clearError("firstName");
                              setEmployee((p) => ({
                                ...p,
                                firstName: e.target.value,
                              }));
                            }}
                          />
                        </Field>
                        <Field label="Middle Name (as per SSC)">
                          <Input
                            placeholder="Middle Name"
                            value={employee.middleName}
                            onChange={(e) =>
                              setEmployee((p) => ({
                                ...p,
                                middleName: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field
                          label="Last Name (as per SSC) *"
                          error={errors.lastName}
                        >
                          <Input
                            placeholder="Last Name"
                            value={employee.lastName}
                            onChange={(e) => {
                              clearError("lastName");
                              setEmployee((p) => ({
                                ...p,
                                lastName: e.target.value,
                              }));
                            }}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-2 self-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 lg:self-start lg:w-[9.5rem]">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Employee"
                          className="h-24 w-24 rounded-full border object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-muted-foreground">
                          Photo
                        </div>
                      )}
                      <Input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="h-8 max-w-[9rem] cursor-pointer text-[11px] file:mr-1 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setPhotoFile(file);
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () =>
                            setPhotoPreview(String(reader.result ?? ""));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Gender *" error={errors.genderId}>
                      <div className="flex h-10 items-center gap-4">
                        {genderOptions.map((g) => (
                          <label
                            key={g.value}
                            className="flex cursor-pointer items-center gap-1.5 text-sm"
                          >
                            <input
                              type="radio"
                              name="gender"
                              checked={String(employee.genderId) === g.value}
                              onChange={() => {
                                clearError("genderId");
                                setEmployee((p) => ({
                                  ...p,
                                  genderId: asNum(g.value),
                                }));
                              }}
                            />
                            {g.label}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Father Name" error={errors.fatherName}>
                      <Input
                        placeholder="Father Name"
                        value={employee.fatherName}
                        onChange={(e) => {
                          clearError("fatherName");
                          setEmployee((p) => ({
                            ...p,
                            fatherName: e.target.value,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Mother Name" error={errors.motherName}>
                      <Input
                        placeholder="Mother Name"
                        value={employee.motherName}
                        onChange={(e) => {
                          clearError("motherName");
                          setEmployee((p) => ({
                            ...p,
                            motherName: e.target.value,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Nationality">
                      <Select
                        value={
                          employee.nationalityId
                            ? String(employee.nationalityId)
                            : null
                        }
                        onChange={(v) =>
                          setEmployee((p) => ({
                            ...p,
                            nationalityId: asNum(v),
                          }))
                        }
                        options={nationalityOptions}
                        placeholder="Nationality"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Religion">
                      <Select
                        value={
                          employee.religionId
                            ? String(employee.religionId)
                            : null
                        }
                        onChange={(v) =>
                          setEmployee((p) => ({ ...p, religionId: asNum(v) }))
                        }
                        options={religionOptions}
                        placeholder="Religion"
                      />
                    </Field>
                    <Field label="Caste">
                      <Select
                        value={
                          employee.casteId ? String(employee.casteId) : null
                        }
                        onChange={(v) =>
                          setEmployee((p) => ({
                            ...p,
                            casteId: asNum(v),
                            subCasteId: 0,
                          }))
                        }
                        options={casteOptions}
                        placeholder="Caste"
                      />
                    </Field>
                    {subCastes.length > 0 ? (
                      <Field label="Sub Caste">
                        <Select
                          value={
                            employee.subCasteId
                              ? String(employee.subCasteId)
                              : null
                          }
                          onChange={(v) =>
                            setEmployee((p) => ({ ...p, subCasteId: asNum(v) }))
                          }
                          options={subCasteOptions}
                          placeholder="Sub Caste"
                        />
                      </Field>
                    ) : null}
                    <Field label="Date of Birth *" error={errors.dateOfBirth}>
                      <DatePicker
                        value={employee.dateOfBirth}
                        onChange={(v) => {
                          clearError("dateOfBirth");
                          setEmployee((p) => ({ ...p, dateOfBirth: v }));
                        }}
                        placeholder="Date of Birth"
                      />
                    </Field>
                    <Field label="Marital Status">
                      <Select
                        value={
                          employee.maritalStatusId
                            ? String(employee.maritalStatusId)
                            : null
                        }
                        onChange={(v) =>
                          setEmployee((p) => ({
                            ...p,
                            maritalStatusId: asNum(v),
                          }))
                        }
                        options={maritalStatusOptions}
                        placeholder="Marital Status"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Wedding Date">
                      <DatePicker
                        value={employee.weddingDate}
                        onChange={(v) =>
                          setEmployee((p) => ({ ...p, weddingDate: v }))
                        }
                        placeholder="Wedding Date"
                      />
                    </Field>
                    <Field label="Mobile Number *" error={errors.mobile}>
                      <Input
                        placeholder="Mobile Number"
                        value={employee.mobile}
                        onChange={(e) => {
                          clearError("mobile");
                          setEmployee((p) => ({
                            ...p,
                            mobile: e.target.value,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Email *" error={errors.email}>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={employee.email}
                        onChange={(e) => {
                          clearError("email");
                          setEmployee((p) => ({ ...p, email: e.target.value }));
                        }}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <Field label="Address">
                      <Input
                        placeholder="Address"
                        value={employee.address}
                        onChange={(e) =>
                          setEmployee((p) => ({
                            ...p,
                            address: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 2: Office Info ────────────── */}
              {stepId === "office" && (
                <div className="space-y-4">
                  <SubHeader>Office Information</SubHeader>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="JNTU Regulation Number">
                      <Input
                        placeholder="JNTU Regulation Number"
                        value={office.jntuRegNo}
                        onChange={(e) =>
                          setOffice((p) => ({
                            ...p,
                            jntuRegNo: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="AICTE Regulation Number">
                      <Input
                        placeholder="AICTE Regulation Number"
                        value={office.aicteRegNo}
                        onChange={(e) =>
                          setOffice((p) => ({
                            ...p,
                            aicteRegNo: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Date Of Joining">
                      <DatePicker
                        value={office.joiningDate}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, joiningDate: v }))
                        }
                        placeholder="Date Of Joining"
                      />
                    </Field>
                    <Field label="JNTU Date Of Joining">
                      <DatePicker
                        value={office.jntuDateOfJoining}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, jntuDateOfJoining: v }))
                        }
                        placeholder="JNTU Date Of Joining"
                      />
                    </Field>
                    <Field label="Employee Status">
                      <Select
                        value={
                          office.empStatusId ? String(office.empStatusId) : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, empStatusId: asNum(v) }))
                        }
                        options={empStatusOptions}
                        placeholder="Employee Status"
                        disabled
                      />
                    </Field>
                    <Field label="Employee State">
                      <Select
                        value={
                          office.empStateId ? String(office.empStateId) : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, empStateId: asNum(v) }))
                        }
                        options={empStateOptions}
                        placeholder="Employee State"
                      />
                    </Field>
                    <Field label="Date Of Relieving">
                      <DatePicker
                        value={office.dateOfRelieving}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, dateOfRelieving: v }))
                        }
                        placeholder="Date Of Relieving"
                      />
                    </Field>
                    <Field label="Employee Type">
                      <Select
                        value={
                          office.empTypeId ? String(office.empTypeId) : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, empTypeId: asNum(v) }))
                        }
                        options={empTypeOptions}
                        placeholder="Employee Type"
                      />
                    </Field>
                    <Field label="Tenure Days">
                      <Input
                        type="number"
                        placeholder="Tenure Days"
                        value={office.tenureDays}
                        onChange={(e) =>
                          setOffice((p) => ({
                            ...p,
                            tenureDays: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Department *" error={errors.empDeptId}>
                      <Select
                        value={
                          office.empDeptId ? String(office.empDeptId) : null
                        }
                        onChange={(v) => {
                          clearError("empDeptId");
                          setOffice((p) => ({ ...p, empDeptId: asNum(v) }));
                        }}
                        options={departmentOptions}
                        placeholder="Department"
                      />
                    </Field>
                    <Field
                      label="Working Department *"
                      error={errors.empWorkingDeptId}
                    >
                      <Select
                        value={
                          office.empWorkingDeptId
                            ? String(office.empWorkingDeptId)
                            : null
                        }
                        onChange={(v) => {
                          clearError("empWorkingDeptId");
                          setOffice((p) => ({
                            ...p,
                            empWorkingDeptId: asNum(v),
                          }));
                        }}
                        options={departmentOptions}
                        placeholder="Working Department"
                      />
                    </Field>
                    <Field
                      label="Qualification *"
                      error={errors.qualificationId}
                    >
                      <Select
                        value={
                          office.qualificationId
                            ? String(office.qualificationId)
                            : null
                        }
                        onChange={(v) => {
                          clearError("qualificationId");
                          setOffice((p) => ({
                            ...p,
                            qualificationId: asNum(v),
                          }));
                        }}
                        options={qualificationOptions}
                        placeholder="Qualification"
                      />
                    </Field>
                    <Field label="Designation *" error={errors.designationId}>
                      <Select
                        value={
                          office.designationId
                            ? String(office.designationId)
                            : null
                        }
                        onChange={(v) => {
                          clearError("designationId");
                          setOffice((p) => ({ ...p, designationId: asNum(v) }));
                        }}
                        options={designationOptions}
                        placeholder="Designation"
                      />
                    </Field>
                    <Field
                      label="Working Designation *"
                      error={errors.workingDesignationId}
                    >
                      <Select
                        value={
                          office.workingDesignationId
                            ? String(office.workingDesignationId)
                            : null
                        }
                        onChange={(v) => {
                          clearError("workingDesignationId");
                          setOffice((p) => ({
                            ...p,
                            workingDesignationId: asNum(v),
                          }));
                        }}
                        options={designationOptions}
                        placeholder="Working Designation"
                      />
                    </Field>
                    <Field label="Employee Grade">
                      <Select
                        value={office.empgrade ? String(office.empgrade) : null}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, empgrade: asNum(v) }))
                        }
                        options={empGradeOptions}
                        placeholder="Employee Grade"
                      />
                    </Field>
                    <Field
                      label="Employee Category *"
                      error={errors.empCategoryId}
                    >
                      <Select
                        value={
                          office.empCategoryId
                            ? String(office.empCategoryId)
                            : null
                        }
                        onChange={(v) => {
                          clearError("empCategoryId");
                          setOffice((p) => ({ ...p, empCategoryId: asNum(v) }));
                        }}
                        options={empCategoryOptions}
                        placeholder="Employee Category"
                      />
                    </Field>
                    <Field label="Working Category">
                      <Select
                        value={
                          office.empWrkCategoryId
                            ? String(office.empWrkCategoryId)
                            : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({
                            ...p,
                            empWrkCategoryId: asNum(v),
                          }))
                        }
                        options={empWorkCategoryOptions}
                        placeholder="Working Category"
                      />
                    </Field>
                    <Field label="Teaching For (UG/PG)">
                      <Select
                        value={
                          office.teachingforId
                            ? String(office.teachingforId)
                            : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, teachingforId: asNum(v) }))
                        }
                        options={teacherForOptions}
                        placeholder="Teaching For (UG/PG)"
                      />
                    </Field>
                    <Field label="Appointment Type (FT/PT)">
                      <Select
                        value={
                          office.appointmentId
                            ? String(office.appointmentId)
                            : null
                        }
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, appointmentId: asNum(v) }))
                        }
                        options={appointmentTypeOptions}
                        placeholder="Appointment Type (FT/PT)"
                      />
                    </Field>
                    <Field label="Service Break (Yrs)">
                      <Input
                        type="number"
                        placeholder="Service Break (Yrs)"
                        value={office.serviceBreakYrs}
                        onChange={(e) =>
                          setOffice((p) => ({
                            ...p,
                            serviceBreakYrs: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 3: Contact Info ────────────── */}
              {stepId === "contact" && (
                <div className="space-y-6">
                  <SubHeader>Contact Information</SubHeader>

                  <div>
                    <h2 className="text-sm font-semibold mb-3">
                      Present Address
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Present Address">
                        <Input
                          placeholder="Present Address"
                          value={contact.presentAddress}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              presentAddress: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mt-3">
                      <Field label="Country">
                        <Select
                          value={
                            contact.countryPresentId
                              ? String(contact.countryPresentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              countryPresentId: asNum(v),
                              statePresentId: 0,
                              districtPresentId: 0,
                              cityPresentId: 0,
                            }))
                          }
                          options={countryOptions}
                          placeholder="Country"
                        />
                      </Field>
                      <Field label="State">
                        <Select
                          value={
                            contact.statePresentId
                              ? String(contact.statePresentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              statePresentId: asNum(v),
                              districtPresentId: 0,
                              cityPresentId: 0,
                            }))
                          }
                          options={presentStateOptions}
                          placeholder="State"
                        />
                      </Field>
                      <Field label="District">
                        <Select
                          value={
                            contact.districtPresentId
                              ? String(contact.districtPresentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              districtPresentId: asNum(v),
                              cityPresentId: 0,
                            }))
                          }
                          options={presentDistrictOptions}
                          placeholder="District"
                        />
                      </Field>
                      <Field label="City">
                        <Select
                          value={
                            contact.cityPresentId
                              ? String(contact.cityPresentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              cityPresentId: asNum(v),
                            }))
                          }
                          options={presentCityOptions}
                          placeholder="City"
                        />
                      </Field>
                      <Field label="Street">
                        <Input
                          placeholder="Street"
                          value={contact.presentStreet}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              presentStreet: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Mandal">
                        <Input
                          placeholder="Mandal"
                          value={contact.presentMandal}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              presentMandal: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Pin Code">
                        <Input
                          type="number"
                          placeholder="Pin Code"
                          value={contact.presentPincode}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              presentPincode: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold mb-3">
                      Permanent Address
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Permanent Address">
                        <Input
                          placeholder="Permanent Address"
                          value={contact.permanentAddress}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              permanentAddress: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mt-3">
                      <Field label="Country">
                        <Select
                          value={
                            contact.countryPermanentId
                              ? String(contact.countryPermanentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              countryPermanentId: asNum(v),
                              statePermanentId: 0,
                              districtPermanentId: 0,
                              cityPermanentId: 0,
                            }))
                          }
                          options={countryOptions}
                          placeholder="Country"
                        />
                      </Field>
                      <Field label="State">
                        <Select
                          value={
                            contact.statePermanentId
                              ? String(contact.statePermanentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              statePermanentId: asNum(v),
                              districtPermanentId: 0,
                              cityPermanentId: 0,
                            }))
                          }
                          options={permStateOptions}
                          placeholder="State"
                        />
                      </Field>
                      <Field label="District">
                        <Select
                          value={
                            contact.districtPermanentId
                              ? String(contact.districtPermanentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              districtPermanentId: asNum(v),
                              cityPermanentId: 0,
                            }))
                          }
                          options={permDistrictOptions}
                          placeholder="District"
                        />
                      </Field>
                      <Field label="City">
                        <Select
                          value={
                            contact.cityPermanentId
                              ? String(contact.cityPermanentId)
                              : null
                          }
                          onChange={(v) =>
                            setContact((p) => ({
                              ...p,
                              cityPermanentId: asNum(v),
                            }))
                          }
                          options={permCityOptions}
                          placeholder="City"
                        />
                      </Field>
                      <Field label="Street">
                        <Input
                          placeholder="Street"
                          value={contact.permanentStreet}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              permanentStreet: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Mandal">
                        <Input
                          placeholder="Mandal"
                          value={contact.permanentMandal}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              permanentMandal: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Pin Code">
                        <Input
                          type="number"
                          placeholder="Pin Code"
                          value={contact.permanentPincode}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              permanentPincode: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold mb-3">
                      Contact Details
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <Field
                        label="Office Mobile"
                        error={errors.officialMobile}
                      >
                        <Input
                          type="number"
                          placeholder="Office Mobile"
                          value={contact.officialMobile}
                          onChange={(e) => {
                            clearError("officialMobile");
                            setContact((p) => ({
                              ...p,
                              officialMobile: e.target.value,
                            }));
                          }}
                        />
                      </Field>
                      <Field label="Residence Phone">
                        <Input
                          type="number"
                          placeholder="Residence Phone"
                          value={contact.residencePhone}
                          onChange={(e) =>
                            setContact((p) => ({
                              ...p,
                              residencePhone: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field
                        label="Emergency Mobile"
                        error={errors.emergencyMobile}
                      >
                        <Input
                          type="number"
                          placeholder="Emergency Mobile"
                          value={contact.emergencyMobile}
                          onChange={(e) => {
                            clearError("emergencyMobile");
                            setContact((p) => ({
                              ...p,
                              emergencyMobile: e.target.value,
                            }));
                          }}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 4: Education Info ────────────── */}
              {stepId === "education" && (
                <div className="space-y-4">
                  <SubHeader>Education Information</SubHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {[
                            "Institution Name",
                            "Board",
                            "Medium",
                            "Mode",
                            "Address",
                            "Major Subjects",
                            "Grade",
                            "Year Of Completion",
                            "Percentage",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              className="border px-2 py-2 text-left font-medium text-xs whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {education.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Name"
                                value={row.nameOfInstitution}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            nameOfInstitution: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[120px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Board"
                                value={row.board}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, board: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[100px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Medium"
                                value={row.medium}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, medium: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[90px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Select
                                value={
                                  row.modeofstudy
                                    ? String(row.modeofstudy)
                                    : null
                                }
                                onChange={(v) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            modeofstudy: asNum(v) || null,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                options={modeOfStudyOptions}
                                placeholder="Mode"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Address"
                                value={row.address}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, address: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[100px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Subjects"
                                value={row.majorSubjects}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            majorSubjects: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[100px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Grade"
                                value={row.gradeClassSecured}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            gradeClassSecured: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[80px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Year"
                                value={row.yearOfCompletion}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            yearOfCompletion: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[80px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                type="number"
                                placeholder="%"
                                value={row.precentage}
                                onChange={(e) =>
                                  setEducation((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, precentage: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[70px]"
                              />
                            </td>
                            <td className="border px-1 py-1 text-center whitespace-nowrap">
                              <button
                                onClick={() =>
                                  setEducation((prev) => [
                                    ...prev,
                                    ...buildInitialEducation([]),
                                  ])
                                }
                                className="text-green-600 hover:text-green-800 mr-2 text-lg"
                                title="Add"
                              >
                                +
                              </button>
                              {i > 0 && (
                                <button
                                  onClick={() =>
                                    setEducation((prev) =>
                                      prev.filter((_, idx) => idx !== i),
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700 text-lg"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 5: Experience Info ────────────── */}
              {stepId === "experience" && (
                <div className="space-y-4">
                  <SubHeader>Experience Information</SubHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {[
                            "Previous Institution",
                            "Designation",
                            "Subjects",
                            "Experience",
                            "Exp. From",
                            "Exp. To",
                            "Total Years",
                            "Total Months",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              className="border px-2 py-2 text-left font-medium text-xs whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {experience.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Name"
                                value={row.prevoiusInstitutions}
                                onChange={(e) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            prevoiusInstitutions:
                                              e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[120px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Select
                                value={
                                  row.designation
                                    ? String(row.designation)
                                    : null
                                }
                                onChange={(v) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            designation: asNum(v) || null,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                options={designationOptions}
                                placeholder="Designation"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Subjects"
                                value={row.subjects}
                                onChange={(e) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, subjects: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[90px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Experience"
                                value={row.experienceDetail}
                                onChange={(e) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            experienceDetail: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[90px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <DatePicker
                                value={row.fromYrMonth}
                                onChange={(v) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i ? { ...x, fromYrMonth: v } : x,
                                    ),
                                  )
                                }
                                placeholder="From"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <DatePicker
                                value={row.toYrMonth}
                                onChange={(v) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i ? { ...x, toYrMonth: v } : x,
                                    ),
                                  )
                                }
                                placeholder="To"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Total Years"
                                value={row.experienceYear}
                                onChange={(e) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            experienceYear: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[70px]"
                              />
                            </td>
                            <td className="border px-1 py-1">
                              <Input
                                placeholder="Total Months"
                                value={row.experienceMonth}
                                onChange={(e) =>
                                  setExperience((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            experienceMonth: e.target.value,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                className="min-w-[70px]"
                              />
                            </td>
                            <td className="border px-1 py-1 text-center whitespace-nowrap">
                              <button
                                onClick={() =>
                                  setExperience((prev) => [
                                    ...prev,
                                    ...buildInitialExperience([]),
                                  ])
                                }
                                className="text-green-600 hover:text-green-800 mr-2 text-lg"
                                title="Add"
                              >
                                +
                              </button>
                              {i > 0 && (
                                <button
                                  onClick={() =>
                                    setExperience((prev) =>
                                      prev.filter((_, idx) => idx !== i),
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700 text-lg"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 6: Certificates ────────────── */}
              {stepId === "certificates" && (
                <div className="space-y-4">
                  <SubHeader>Certificates</SubHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {[
                            "Document Name",
                            "Hardcopy",
                            "Softcopy",
                            "Original",
                            "Verified",
                            "Rack Number",
                            "upload",
                          ].map((h) => (
                            <th
                              key={h}
                              className="border px-2 py-2 text-left font-medium text-xs whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {documents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="border px-2 py-6 text-center text-muted-foreground text-sm"
                            >
                              &nbsp;
                            </td>
                          </tr>
                        ) : (
                          documents.map((d, i) => (
                            <tr key={i} className="border-b">
                              <td className="border px-2 py-2 font-medium">
                                {d.fileName ||
                                  `Document ${d.documentRepositoryId}`}
                              </td>
                              <td className="border px-2 py-2 text-center">
                                <Checkbox
                                  checked={d.isHardCopy}
                                  onCheckedChange={(v) =>
                                    setDocuments((prev) =>
                                      prev.map((x) =>
                                        x.documentRepositoryId ===
                                        d.documentRepositoryId
                                          ? { ...x, isHardCopy: v === true }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td className="border px-2 py-2 text-center">
                                <Checkbox
                                  checked={d.isSoftCopy}
                                  onCheckedChange={(v) =>
                                    setDocuments((prev) =>
                                      prev.map((x) =>
                                        x.documentRepositoryId ===
                                        d.documentRepositoryId
                                          ? { ...x, isSoftCopy: v === true }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td className="border px-2 py-2 text-center">
                                <Checkbox
                                  checked={d.isOriginal}
                                  onCheckedChange={(v) =>
                                    setDocuments((prev) =>
                                      prev.map((x) =>
                                        x.documentRepositoryId ===
                                        d.documentRepositoryId
                                          ? { ...x, isOriginal: v === true }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td className="border px-2 py-2 text-center">
                                <Checkbox
                                  checked={d.isVerified}
                                  onCheckedChange={(v) =>
                                    setDocuments((prev) =>
                                      prev.map((x) =>
                                        x.documentRepositoryId ===
                                        d.documentRepositoryId
                                          ? { ...x, isVerified: v === true }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td className="border px-1 py-1">
                                <Input
                                  placeholder="Rack Number"
                                  value={d.rackNumber}
                                  onChange={(e) =>
                                    setDocuments((prev) =>
                                      prev.map((x) =>
                                        x.documentRepositoryId ===
                                        d.documentRepositoryId
                                          ? { ...x, rackNumber: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td className="border px-2 py-2">
                                {d.isSoftCopy ? (
                                  <Input
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.pdf"
                                    className="text-xs"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        setDocFiles((prev) => ({
                                          ...prev,
                                          [d.documentRepositoryId]: file,
                                        }));
                                    }}
                                  />
                                ) : (
                                  <span className="text-blue-500 text-xs">
                                    To upload Doc check Softcopy
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ────────────── STEP 7: Other Info ────────────── */}
              {stepId === "other" && (
                <div className="space-y-6">
                  <SubHeader>Other Information</SubHeader>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Blood Group">
                      <Select
                        value={
                          other.bloodgroupId ? String(other.bloodgroupId) : null
                        }
                        onChange={(v) =>
                          setOther((p) => ({ ...p, bloodgroupId: asNum(v) }))
                        }
                        options={bloodGroupOptions}
                        placeholder="Blood Group"
                      />
                    </Field>
                    <Field label="Aadhar Card No. *" error={errors.aadharNo}>
                      <Input
                        type="number"
                        placeholder="Aadhar Card No."
                        value={other.aadharNo}
                        onChange={(e) => {
                          clearError("aadharNo");
                          setOther((p) => ({ ...p, aadharNo: e.target.value }));
                        }}
                      />
                    </Field>
                    <Field label="Pan Card No.">
                      <Input
                        placeholder="Pan Card No."
                        value={other.pancard}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, pancard: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Voter Id">
                      <Input
                        placeholder="Voter Id"
                        value={other.voterId}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, voterId: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Passport No.">
                      <Input
                        placeholder="Passport No."
                        value={other.passportNo}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            passportNo: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="EPF No.">
                      <Input
                        placeholder="EPF No."
                        value={other.epfNo}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, epfNo: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="ESI Reg No.">
                      <Input
                        placeholder="ESI Reg No."
                        value={other.esiRegNo}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, esiRegNo: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="LIC No.">
                      <Input
                        placeholder="LIC No."
                        value={other.licNo}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, licNo: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Pay Mode">
                      <Select
                        value={other.paymodeId ? String(other.paymodeId) : null}
                        onChange={(v) =>
                          setOther((p) => ({ ...p, paymodeId: asNum(v) }))
                        }
                        options={payModeOptions}
                        placeholder="Pay Mode"
                      />
                    </Field>
                    <Field label="Promoted Date">
                      <DatePicker
                        value={other.promotedDate}
                        onChange={(v) =>
                          setOther((p) => ({ ...p, promotedDate: v }))
                        }
                        placeholder="Promoted Date"
                      />
                    </Field>
                    <Field label="Date Of Resignation">
                      <DatePicker
                        value={other.resignationDate}
                        onChange={(v) =>
                          setOther((p) => ({ ...p, resignationDate: v }))
                        }
                        placeholder="Date Of Resignation"
                      />
                    </Field>
                    <Field label="Monthly Salary">
                      <Input
                        type="number"
                        placeholder="Monthly Salary"
                        value={other.monthlySalary}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            monthlySalary: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Resident">
                      <Select
                        value={
                          other.residentId ? String(other.residentId) : null
                        }
                        onChange={(v) =>
                          setOther((p) => ({ ...p, residentId: asNum(v) }))
                        }
                        options={residentOptions}
                        placeholder="Resident"
                      />
                    </Field>
                    <Field label="Accommodation">
                      <Select
                        value={
                          other.accommodationId
                            ? String(other.accommodationId)
                            : null
                        }
                        onChange={(v) =>
                          setOther((p) => ({ ...p, accommodationId: asNum(v) }))
                        }
                        options={accommodationOptions}
                        placeholder="Accommodation"
                      />
                    </Field>
                    <Field label="Bio Code">
                      <Input
                        placeholder="Bio Code"
                        value={other.biometricCode}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            biometricCode: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    {(
                      [
                        { key: "isRatified", label: "Whether Ratified" },
                        { key: "isManager", label: "Is Manager" },
                        {
                          key: "isUsingCampAccommodation",
                          label: "Campus Accommodation",
                        },
                        {
                          key: "isUsingTransport",
                          label: "Transport Facility",
                        },
                        { key: "isTds", label: "TDS" },
                        { key: "isPtax", label: "P-Tax" },
                      ] as const
                    ).map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={other[key]}
                          onCheckedChange={(v) =>
                            setOther((p) => ({ ...p, [key]: v === true }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <SubHeader>Bank Details</SubHeader>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Bank Name">
                      <Input
                        placeholder="Bank Name"
                        value={other.bankName}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, bankName: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Account No.">
                      <Input
                        placeholder="Account No."
                        value={other.accountNumber}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            accountNumber: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Branch Name">
                      <Input
                        placeholder="Branch Name"
                        value={other.branchName}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            branchName: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="IFSC Code">
                      <Input
                        placeholder="IFSC Code"
                        value={other.ifscCode}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, ifscCode: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Bank Address">
                      <Input
                        placeholder="Bank Address"
                        value={other.bankAddress}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            bankAddress: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="DD Payable Address">
                      <Input
                        placeholder="DD Payable Address"
                        value={other.ddPayableAddress}
                        onChange={(e) =>
                          setOther((p) => ({
                            ...p,
                            ddPayableAddress: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        placeholder="Phone"
                        value={other.phone}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, phone: e.target.value }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Navigation buttons ─────────────────────────── */}
              <div className="flex items-center justify-between pt-5 border-t mt-5">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                </div>
                <div className="flex gap-2">
                  {stepIdx < STEPS.length - 1 ? (
                    <Button onClick={handleNext}>Next</Button>
                  ) : (
                    <Button
                      disabled={isSaving}
                      onClick={() => void handleSubmit()}
                    >
                      {isSaving
                        ? "Saving…"
                        : mode === "edit"
                          ? "Update Employee"
                          : "Submit"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
