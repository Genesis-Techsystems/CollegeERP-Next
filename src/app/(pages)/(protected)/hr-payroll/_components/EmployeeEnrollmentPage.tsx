"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { Table } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  required,
  error,
  children,
}: {
  label: string;
  /** Shows required asterisk. Red label/underline only when `error` is set. */
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const showRequired = Boolean(required) || /\*\s*$/.test(label);
  const displayLabel = label.replace(/\s*\*\s*$/, "").trim();
  const invalid = Boolean(error);
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        invalid &&
          "[&_.app-control]:border-b-[#f44336] [&_button.app-control]:border-b-[#f44336]",
      )}
    >
      <label
        className={cn(
          "text-[14px] font-medium leading-none",
          invalid ? "text-[#f44336]" : "text-[hsl(var(--foreground))]",
        )}
      >
        {displayLabel}
        {showRequired ? <span className="ml-0.5 text-[#f44336]">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

/* Angular `.sub-header` — icon + title + gold rule */
function SubHeader({
  children,
  icon = "person",
}: {
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 pb-2">
        <span
          className="material-icons text-[22px] leading-none text-[hsl(var(--card-title))]"
          aria-hidden
        >
          {icon}
        </span>
        <span className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          {children}
        </span>
      </div>
      <div className="h-0.5 w-full bg-[#ffcf46]" aria-hidden />
    </div>
  );
}

function RowAddRemove({
  canRemove,
  onAdd,
  onRemove,
}: {
  canRemove: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="whitespace-nowrap text-center">
      <button
        type="button"
        onClick={onAdd}
        className="mr-2 text-lg text-green-600 hover:text-green-800"
        title="Add"
      >
        +
      </button>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-lg text-red-500 hover:text-red-700"
          title="Remove"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

/** Angular `mat-horizontal-stepper` chrome. */
function EnrollmentStepper({ stepIdx }: { stepIdx: number }) {
  return (
    <div className="border-b border-slate-200 bg-[#eaf4fb]">
      <ol className="flex items-stretch overflow-x-auto px-1">
        {STEPS.map((s, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <li
              key={s.id}
              className={cn(
                "relative flex min-w-[6.25rem] flex-1 flex-col items-center gap-1.5 px-1 pb-3 pt-3",
                active &&
                  "before:absolute before:inset-x-1 before:top-0 before:h-[3px] before:rounded-b before:bg-primary",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                  active || done
                    ? "bg-primary text-white"
                    : "bg-[#c9e3f5] text-primary",
                )}
                aria-current={active ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight",
                  active
                    ? "font-semibold text-primary"
                    : done
                      ? "font-medium text-foreground"
                      : "font-medium text-foreground/70",
                )}
              >
                {s.label}
              </span>
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
  const photoInputRef = useRef<HTMLInputElement>(null);
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
            {mode === "edit" ? "Employee Information" : "Employee Admission"}
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
                  <SubHeader icon="person">Employee Information</SubHeader>

                  {/* Angular: fields wrap + circular photo in same row */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Employee Number">
                          <Input
                            type="number"
                            variant="standard"
                            placeholder="e.g. 10023"
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
                          label="Organization"
                          required
                          error={errors.organizationId}
                        >
                          <Select
                            variant="standard"
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
                            placeholder="Select Organization"
                          />
                        </Field>
                        <Field
                          label="College"
                          required
                          error={errors.collegeId}
                        >
                          <Select
                            variant="standard"
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
                            placeholder="Select College"
                          />
                        </Field>
                        <Field label="Joining Date" error={errors.joiningDate}>
                          <DatePicker
                            variant="standard"
                            value={employee.joiningDate}
                            onChange={(v) => {
                              clearError("joiningDate");
                              setEmployee((p) => ({ ...p, joiningDate: v }));
                            }}
                            placeholder="DD/MM/YYYY"
                            error={errors.joiningDate}
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Field label="Title">
                          <Select
                            variant="standard"
                            value={
                              employee.titleId ? String(employee.titleId) : null
                            }
                            onChange={(v) =>
                              setEmployee((p) => ({ ...p, titleId: asNum(v) }))
                            }
                            options={titleOptions}
                            placeholder="Select Title"
                          />
                        </Field>
                        <Field
                          label="First Name (as per SSC)"
                          required
                          error={errors.firstName}
                        >
                          <Input
                            variant="standard"
                            placeholder="e.g. Ravi"
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
                            variant="standard"
                            placeholder="e.g. Kumar"
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
                          label="Last Name (as per SSC)"
                          required
                          error={errors.lastName}
                        >
                          <Input
                            variant="standard"
                            placeholder="e.g. Sharma"
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

                    {/* Angular circular `.pro_pic` — click opens file picker */}
                    <div className="flex shrink-0 justify-center self-start lg:w-[8.5rem] lg:pt-1">
                      <button
                        type="button"
                        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => photoInputRef.current?.click()}
                        aria-label="Upload employee photo"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            photoPreview ||
                            "/assets/images/avatars/default_Student.png"
                          }
                          alt=""
                          className="h-[100px] w-[100px] rounded-full border border-slate-200 object-cover bg-[#e8eef5]"
                        />
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="hidden"
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
                    <Field label="Gender" required error={errors.genderId}>
                      <div
                        className={cn(
                          "flex h-9 items-center gap-4 border-b",
                          errors.genderId
                            ? "border-b-[#f44336]"
                            : "border-b-[rgba(0,0,0,0.42)]",
                        )}
                      >
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
                        variant="standard"
                        placeholder="e.g. Suresh Sharma"
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
                        variant="standard"
                        placeholder="e.g. Lakshmi Sharma"
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
                        variant="standard"
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
                        placeholder="Select Nationality"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Religion">
                      <Select
                        variant="standard"
                        value={
                          employee.religionId
                            ? String(employee.religionId)
                            : null
                        }
                        onChange={(v) =>
                          setEmployee((p) => ({ ...p, religionId: asNum(v) }))
                        }
                        options={religionOptions}
                        placeholder="Select Religion"
                      />
                    </Field>
                    <Field label="Caste">
                      <Select
                        variant="standard"
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
                        placeholder="Select Caste"
                      />
                    </Field>
                    {subCastes.length > 0 ? (
                      <Field label="Sub Caste">
                        <Select
                          variant="standard"
                          value={
                            employee.subCasteId
                              ? String(employee.subCasteId)
                              : null
                          }
                          onChange={(v) =>
                            setEmployee((p) => ({ ...p, subCasteId: asNum(v) }))
                          }
                          options={subCasteOptions}
                          placeholder="Select Sub Caste"
                        />
                      </Field>
                    ) : null}
                    <Field
                      label="Date of Birth"
                      required
                      error={errors.dateOfBirth}
                    >
                      <DatePicker
                        variant="standard"
                        value={employee.dateOfBirth}
                        onChange={(v) => {
                          clearError("dateOfBirth");
                          setEmployee((p) => ({ ...p, dateOfBirth: v }));
                        }}
                        placeholder="DD/MM/YYYY"
                      />
                    </Field>
                    <Field label="Marital Status">
                      <Select
                        variant="standard"
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
                        placeholder="Select Marital Status"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Wedding Date">
                      <DatePicker
                        variant="standard"
                        value={employee.weddingDate}
                        onChange={(v) =>
                          setEmployee((p) => ({ ...p, weddingDate: v }))
                        }
                        placeholder="DD/MM/YYYY"
                      />
                    </Field>
                    <Field label="Mobile Number" required error={errors.mobile}>
                      <Input
                        variant="standard"
                        placeholder="e.g. 9876543210"
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
                    <Field label="Email" required error={errors.email}>
                      <Input
                        variant="standard"
                        type="email"
                        placeholder="e.g. ravi.sharma@college.edu"
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
                        variant="standard"
                        placeholder="e.g. H.No. 12-3/4, Road No. 5, Hyderabad"
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
                  <SubHeader icon="school">Office Information</SubHeader>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="JNTU Regulation Number">
                      <Input
                        placeholder="e.g. JNTUH/2020/1234"
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
                        placeholder="e.g. AICTE/1-1234567890"
                        value={office.aicteRegNo}
                        onChange={(e) =>
                          setOffice((p) => ({
                            ...p,
                            aicteRegNo: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="JNTU Date Of Joining">
                      <DatePicker
                        value={office.jntuDateOfJoining}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, jntuDateOfJoining: v }))
                        }
                        placeholder="DD/MM/YYYY"
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
                        placeholder="Select Status"
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
                        placeholder="Select State"
                      />
                    </Field>
                    <Field label="Date Of Relieving">
                      <DatePicker
                        value={office.dateOfRelieving}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, dateOfRelieving: v }))
                        }
                        placeholder="DD/MM/YYYY"
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
                        placeholder="Select Type"
                      />
                    </Field>
                    <Field label="Tenure Days">
                      <Input
                        type="number"
                        placeholder="e.g. 365"
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
                        placeholder="Select Department"
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
                        placeholder="Select Working Department"
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
                        placeholder="Select Qualification"
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
                        placeholder="Select Designation"
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
                        placeholder="Select Working Designation"
                      />
                    </Field>
                    <Field label="Employee Grade">
                      <Select
                        value={office.empgrade ? String(office.empgrade) : null}
                        onChange={(v) =>
                          setOffice((p) => ({ ...p, empgrade: asNum(v) }))
                        }
                        options={empGradeOptions}
                        placeholder="Select Grade"
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
                        placeholder="Select Category"
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
                        placeholder="Select Working Category"
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
                        placeholder="Select UG/PG"
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
                        placeholder="Select FT/PT"
                      />
                    </Field>
                    <Field label="Service Break (Yrs)">
                      <Input
                        type="number"
                        placeholder="e.g. 0"
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
                  <SubHeader icon="location_on">Contact Information</SubHeader>

                  <div>
                    <h2 className="text-sm font-semibold mb-3">
                      Present Address
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Present Address">
                        <Input
                          placeholder="e.g. Flat 201, Green Residency, Hyderabad"
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
                          placeholder="Select Country"
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
                          placeholder="Select State"
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
                          placeholder="Select District"
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
                          placeholder="Select City"
                        />
                      </Field>
                      <Field label="Street">
                        <Input
                          placeholder="e.g. Road No. 12"
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
                          placeholder="e.g. Serilingampally"
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
                          placeholder="e.g. 500032"
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
                          placeholder="e.g. H.No. 10-2/3, Warangal"
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
                          placeholder="Select Country"
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
                          placeholder="Select State"
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
                          placeholder="Select District"
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
                          placeholder="Select City"
                        />
                      </Field>
                      <Field label="Street">
                        <Input
                          placeholder="e.g. Road No. 12"
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
                          placeholder="e.g. Serilingampally"
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
                          placeholder="e.g. 500032"
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
                          placeholder="e.g. 9876543210"
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
                          placeholder="e.g. 04012345678"
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
                          placeholder="e.g. 9123456780"
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
                  <SubHeader icon="school">Education Information</SubHeader>
                  <Table
                    rows={education}
                    pageSize={0}
                    density="compact"
                    emptyText="No education records."
                    columns={[
                      {
                        id: "nameOfInstitution",
                        label: "Institution Name",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Osmania University"
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
                        ),
                      },
                      {
                        id: "board",
                        label: "Board",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Board of Intermediate"
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
                        ),
                      },
                      {
                        id: "medium",
                        label: "Medium",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. English"
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
                        ),
                      },
                      {
                        id: "modeofstudy",
                        label: "Mode",
                        render: (row, i) => (
                          <Select
                            value={
                              row.modeofstudy ? String(row.modeofstudy) : null
                            }
                            onChange={(v) =>
                              setEducation((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, modeofstudy: asNum(v) || null }
                                    : x,
                                ),
                              )
                            }
                            options={modeOfStudyOptions}
                            placeholder="Select Mode"
                          />
                        ),
                      },
                      {
                        id: "address",
                        label: "Address",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Hyderabad"
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
                        ),
                      },
                      {
                        id: "majorSubjects",
                        label: "Major Subjects",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Mathematics"
                            value={row.majorSubjects}
                            onChange={(e) =>
                              setEducation((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, majorSubjects: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[100px]"
                          />
                        ),
                      },
                      {
                        id: "gradeClassSecured",
                        label: "Grade",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. First Class"
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
                        ),
                      },
                      {
                        id: "yearOfCompletion",
                        label: "Year Of Completion",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. 2018"
                            value={row.yearOfCompletion}
                            onChange={(e) =>
                              setEducation((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, yearOfCompletion: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[80px]"
                          />
                        ),
                      },
                      {
                        id: "precentage",
                        label: "Percentage",
                        render: (row, i) => (
                          <Input
                            type="number"
                            placeholder="e.g. 78.5"
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
                        ),
                      },
                      {
                        id: "actions",
                        label: "Actions",
                        type: "action",
                        render: (_row, i) => (
                          <RowAddRemove
                            canRemove={i > 0}
                            onAdd={() =>
                              setEducation((prev) => [
                                ...prev,
                                ...buildInitialEducation([]),
                              ])
                            }
                            onRemove={() =>
                              setEducation((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              )}

              {/* ────────────── STEP 5: Experience Info ────────────── */}
              {stepId === "experience" && (
                <div className="space-y-4">
                  <SubHeader icon="school">Experience Information</SubHeader>
                  <Table
                    rows={experience}
                    pageSize={0}
                    density="compact"
                    emptyText="No experience records."
                    columns={[
                      {
                        id: "prevoiusInstitutions",
                        label: "Previous Institution",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. ABC Engineering College"
                            value={row.prevoiusInstitutions}
                            onChange={(e) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? {
                                        ...x,
                                        prevoiusInstitutions: e.target.value,
                                      }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[120px]"
                          />
                        ),
                      },
                      {
                        id: "designation",
                        label: "Designation",
                        render: (row, i) => (
                          <Select
                            value={
                              row.designation ? String(row.designation) : null
                            }
                            onChange={(v) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, designation: asNum(v) || null }
                                    : x,
                                ),
                              )
                            }
                            options={designationOptions}
                            placeholder="Select Designation"
                          />
                        ),
                      },
                      {
                        id: "subjects",
                        label: "Subjects",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Mathematics"
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
                        ),
                      },
                      {
                        id: "experienceDetail",
                        label: "Experience",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. Teaching"
                            value={row.experienceDetail}
                            onChange={(e) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, experienceDetail: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[90px]"
                          />
                        ),
                      },
                      {
                        id: "fromYrMonth",
                        label: "Exp. From",
                        render: (row, i) => (
                          <DatePicker
                            value={row.fromYrMonth}
                            onChange={(v) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, fromYrMonth: v } : x,
                                ),
                              )
                            }
                            placeholder="DD/MM/YYYY"
                          />
                        ),
                      },
                      {
                        id: "toYrMonth",
                        label: "Exp. To",
                        render: (row, i) => (
                          <DatePicker
                            value={row.toYrMonth}
                            onChange={(v) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, toYrMonth: v } : x,
                                ),
                              )
                            }
                            placeholder="DD/MM/YYYY"
                          />
                        ),
                      },
                      {
                        id: "experienceYear",
                        label: "Total Years",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. 5"
                            value={row.experienceYear}
                            onChange={(e) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, experienceYear: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[70px]"
                          />
                        ),
                      },
                      {
                        id: "experienceMonth",
                        label: "Total Months",
                        render: (row, i) => (
                          <Input
                            placeholder="e.g. 6"
                            value={row.experienceMonth}
                            onChange={(e) =>
                              setExperience((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, experienceMonth: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            className="min-w-[70px]"
                          />
                        ),
                      },
                      {
                        id: "actions",
                        label: "Actions",
                        type: "action",
                        render: (_row, i) => (
                          <RowAddRemove
                            canRemove={i > 0}
                            onAdd={() =>
                              setExperience((prev) => [
                                ...prev,
                                ...buildInitialExperience([]),
                              ])
                            }
                            onRemove={() =>
                              setExperience((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              )}

              {/* ────────────── STEP 6: Certificates ────────────── */}
              {stepId === "certificates" && (
                <div className="space-y-4">
                  <SubHeader icon="computer">Certificates</SubHeader>
                  <Table
                    rows={documents}
                    pageSize={0}
                    density="compact"
                    emptyText="No certificates found."
                    columns={[
                      {
                        id: "fileName",
                        label: "Document Name",
                        render: (d) => (
                          <span className="font-medium">
                            {d.fileName || `Document ${d.documentRepositoryId}`}
                          </span>
                        ),
                      },
                      {
                        id: "isHardCopy",
                        label: "Hardcopy",
                        render: (d) => (
                          <div className="text-center">
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
                          </div>
                        ),
                      },
                      {
                        id: "isSoftCopy",
                        label: "Softcopy",
                        render: (d) => (
                          <div className="text-center">
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
                          </div>
                        ),
                      },
                      {
                        id: "isOriginal",
                        label: "Original",
                        render: (d) => (
                          <div className="text-center">
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
                          </div>
                        ),
                      },
                      {
                        id: "isVerified",
                        label: "Verified",
                        render: (d) => (
                          <div className="text-center">
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
                          </div>
                        ),
                      },
                      {
                        id: "rackNumber",
                        label: "Rack Number",
                        render: (d) => (
                          <Input
                            placeholder="e.g. R-12"
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
                        ),
                      },
                      {
                        id: "upload",
                        label: "upload",
                        render: (d) =>
                          d.isSoftCopy ? (
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
                            <span className="text-xs text-blue-500">
                              To upload Doc check Softcopy
                            </span>
                          ),
                      },
                    ]}
                  />
                </div>
              )}

              {/* ────────────── STEP 7: Other Info ────────────── */}
              {stepId === "other" && (
                <div className="space-y-6">
                  <SubHeader icon="school">Other Information</SubHeader>
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
                        placeholder="Select Blood Group"
                      />
                    </Field>
                    <Field label="Aadhar Card No. *" error={errors.aadharNo}>
                      <Input
                        type="number"
                        placeholder="e.g. 123456789012"
                        value={other.aadharNo}
                        onChange={(e) => {
                          clearError("aadharNo");
                          setOther((p) => ({ ...p, aadharNo: e.target.value }));
                        }}
                      />
                    </Field>
                    <Field label="Pan Card No.">
                      <Input
                        placeholder="e.g. ABCDE1234F"
                        value={other.pancard}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, pancard: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Voter Id">
                      <Input
                        placeholder="e.g. ABC1234567"
                        value={other.voterId}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, voterId: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Passport No.">
                      <Input
                        placeholder="e.g. Z1234567"
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
                        placeholder="e.g. AP/HYD/1234567"
                        value={other.epfNo}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, epfNo: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="ESI Reg No.">
                      <Input
                        placeholder="e.g. 1234567890"
                        value={other.esiRegNo}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, esiRegNo: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="LIC No.">
                      <Input
                        placeholder="e.g. 123456789"
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
                        placeholder="Select Pay Mode"
                      />
                    </Field>
                    <Field label="Promoted Date">
                      <DatePicker
                        value={other.promotedDate}
                        onChange={(v) =>
                          setOther((p) => ({ ...p, promotedDate: v }))
                        }
                        placeholder="DD/MM/YYYY"
                      />
                    </Field>
                    <Field label="Date Of Resignation">
                      <DatePicker
                        value={other.resignationDate}
                        onChange={(v) =>
                          setOther((p) => ({ ...p, resignationDate: v }))
                        }
                        placeholder="DD/MM/YYYY"
                      />
                    </Field>
                    <Field label="Monthly Salary">
                      <Input
                        type="number"
                        placeholder="e.g. 45000"
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
                        placeholder="Select Resident"
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
                        placeholder="Select Accommodation"
                      />
                    </Field>
                    <Field label="Bio Code">
                      <Input
                        placeholder="e.g. BIO001"
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

                  <SubHeader icon="account_balance">Bank Details</SubHeader>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Bank Name">
                      <Input
                        placeholder="e.g. State Bank of India"
                        value={other.bankName}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, bankName: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Account No.">
                      <Input
                        placeholder="e.g. 123456789012"
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
                        placeholder="e.g. Madhapur"
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
                        placeholder="e.g. SBIN0001234"
                        value={other.ifscCode}
                        onChange={(e) =>
                          setOther((p) => ({ ...p, ifscCode: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Bank Address">
                      <Input
                        placeholder="e.g. Madhapur, Hyderabad"
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
                        placeholder="e.g. Hyderabad"
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
                        placeholder="e.g. 04012345678"
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
                  <Button
                    variant="outline"
                    className="back-btn"
                    onClick={handleBack}
                  >
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
