/**
 * State shapes + defaults for the Academic Information tab matrices —
 * mirrors Angular `ssr-profile.component.html` `clg_table3`–`clg_table10` and
 * `cat_table` id/name conventions (≈ lines 700–1520). Field names referenced
 * in the doc comments are the Angular `name="..."` attributes used when
 * posting to `ssr_clg_sav1` (see `saveSsrAcademicInfo`).
 */

export type MFOFields = {
  male: string;
  female: string;
  others: string;
};

const emptyMFO = (): MFOFields => ({ male: "", female: "", others: "" });
const zeroMFO = (): MFOFields => ({ male: "0", female: "0", others: "0" });

export type TeachingDesignation =
  | "professor"
  | "associateProfessor"
  | "assistantProfessor";

export const TEACHING_DESIGNATIONS: {
  key: TeachingDesignation;
  label: string;
}[] = [
  { key: "professor", label: "Professor" },
  { key: "associateProfessor", label: "Associate Professor" },
  { key: "assistantProfessor", label: "Assistant Professor" },
];

/** Angular `clg_table3` — Teaching Faculty position matrix. */
export type TeachingFacultyPositions = {
  sanctionedUgc: Record<TeachingDesignation, string>;
  recruitedUgc: Record<TeachingDesignation, MFOFields>;
  sanctionedManagement: Record<TeachingDesignation, string>;
  recruitedManagement: Record<TeachingDesignation, MFOFields>;
};

export const SSR_TEACHING_FACULTY_POSITIONS_DEFAULT: TeachingFacultyPositions =
  {
    sanctionedUgc: {
      professor: "",
      associateProfessor: "",
      assistantProfessor: "",
    },
    recruitedUgc: {
      professor: emptyMFO(),
      associateProfessor: emptyMFO(),
      assistantProfessor: emptyMFO(),
    },
    sanctionedManagement: {
      professor: "",
      associateProfessor: "",
      assistantProfessor: "",
    },
    recruitedManagement: {
      professor: emptyMFO(),
      associateProfessor: emptyMFO(),
      assistantProfessor: emptyMFO(),
    },
  };

/** Angular `clg_table4` (Non-Teaching Staff) / `clg_table5` (Technical Staff) — shared shape. */
export type OtherStaffPositions = {
  sanctionedUgcTotal: string;
  recruitedUgc: MFOFields;
  sanctionedManagementTotal: string;
  recruitedManagement: MFOFields;
};

export const SSR_OTHER_STAFF_POSITIONS_DEFAULT: OtherStaffPositions = {
  sanctionedUgcTotal: "0",
  recruitedUgc: emptyMFO(),
  sanctionedManagementTotal: "0",
  recruitedManagement: emptyMFO(),
};

/** Angular `clg_table6/7/8` — Qualification Details of Teaching Staff. */
export type QualificationLevel = "dsclitt" | "phd" | "mphil" | "pg";

export const QUALIFICATION_LEVELS: {
  key: QualificationLevel;
  label: string;
}[] = [
  { key: "dsclitt", label: "D.sc/D.Litt/LLD/DM/MCH" },
  { key: "phd", label: "Ph.D." },
  { key: "mphil", label: "M.Phil." },
  { key: "pg", label: "PG" },
];

export type QualificationDesignationCounts = Record<
  TeachingDesignation,
  MFOFields
>;

export type QualificationMatrix = Record<
  QualificationLevel,
  QualificationDesignationCounts
>;

function zeroQualificationMatrix(): QualificationMatrix {
  const row = (): QualificationDesignationCounts => ({
    professor: zeroMFO(),
    associateProfessor: zeroMFO(),
    assistantProfessor: zeroMFO(),
  });
  return { dsclitt: row(), phd: row(), mphil: row(), pg: row() };
}

/** Angular `clg_table6` — Permanent Teachers qualification counts (default "0"). */
export const SSR_PERMANENT_TEACHERS_QUALIFICATIONS_DEFAULT =
  zeroQualificationMatrix();
/** Angular `clg_table7` — Temporary Teachers qualification counts (default "0"). */
export const SSR_TEMPORARY_TEACHERS_QUALIFICATIONS_DEFAULT =
  zeroQualificationMatrix();
/** Angular `clg_table8` — Part Time Teachers qualification counts (default "0"). */
export const SSR_PART_TIME_TEACHERS_QUALIFICATIONS_DEFAULT =
  zeroQualificationMatrix();

/** Angular `clg_table10` — Students Enrolled Current Academic Year. */
export type EnrollmentProgram = "ug" | "pg" | "diploma";

export const ENROLLMENT_PROGRAMS: {
  key: EnrollmentProgram;
  label: string;
}[] = [
  { key: "ug", label: "UG" },
  { key: "pg", label: "PG" },
  { key: "diploma", label: "Diploma" },
];

export type EnrollmentSourceCounts = {
  state: string;
  otherState: string;
  nri: string;
  foreign: string;
};

const emptyEnrollmentSource = (): EnrollmentSourceCounts => ({
  state: "",
  otherState: "",
  nri: "",
  foreign: "",
});

export type EnrollmentGenderRows = {
  male: EnrollmentSourceCounts;
  female: EnrollmentSourceCounts;
  others: EnrollmentSourceCounts;
};

export type EnrollmentMatrix = Record<EnrollmentProgram, EnrollmentGenderRows>;

function emptyEnrollmentGenderRows(): EnrollmentGenderRows {
  return {
    male: emptyEnrollmentSource(),
    female: emptyEnrollmentSource(),
    others: emptyEnrollmentSource(),
  };
}

export const SSR_STUDENT_ENROLLMENT_MATRIX_DEFAULT: EnrollmentMatrix = {
  ug: emptyEnrollmentGenderRows(),
  pg: emptyEnrollmentGenderRows(),
  diploma: emptyEnrollmentGenderRows(),
};

/** Angular `cat_table` — Students admitted during the last four academic years. */
export type AdmittedCategory = "sc" | "st" | "obc" | "general" | "others";

export const ADMITTED_CATEGORIES: {
  key: AdmittedCategory;
  label: string;
}[] = [
  { key: "sc", label: "SC" },
  { key: "st", label: "ST" },
  { key: "obc", label: "OBC" },
  { key: "general", label: "General" },
  { key: "others", label: "Others" },
];

export type AdmittedYearCounts = {
  year1: string;
  year2: string;
  year3: string;
  year4: string;
};

const zeroAdmittedYears = (): AdmittedYearCounts => ({
  year1: "0",
  year2: "0",
  year3: "0",
  year4: "0",
});

export type AdmittedGenderRows = {
  male: AdmittedYearCounts;
  female: AdmittedYearCounts;
  others: AdmittedYearCounts;
};

export type AdmittedMatrix = Record<AdmittedCategory, AdmittedGenderRows>;

function zeroAdmittedMatrix(): AdmittedMatrix {
  const genders = (): AdmittedGenderRows => ({
    male: zeroAdmittedYears(),
    female: zeroAdmittedYears(),
    others: zeroAdmittedYears(),
  });
  return {
    sc: genders(),
    st: genders(),
    obc: genders(),
    general: genders(),
    others: genders(),
  };
}

export const SSR_STUDENTS_ADMITTED_MATRIX_DEFAULT: AdmittedMatrix =
  zeroAdmittedMatrix();

/** Angular `guest_male` / `guest_female` / `guest_oth` — Visiting/Guest Faculty. */
export type VisitingFacultyForm = MFOFields;
export const SSR_VISITING_FACULTY_DEFAULT: VisitingFacultyForm = emptyMFO();

/** Angular `program_table3_col1/2/3` + `program_table_col4/5`. */
export type ProvideDetailsForm = {
  selfFinancedPrograms: string;
  newProgramsLastFiveYears: string;
  unitCost: string;
  unitCostIncludingSalary: string;
  unitCostExcludingSalary: string;
};

export const SSR_PROVIDE_DETAILS_DEFAULT: ProvideDetailsForm = {
  selfFinancedPrograms: "",
  newProgramsLastFiveYears: "",
  unitCost: "",
  unitCostIncludingSalary: "",
  unitCostExcludingSalary: "",
};

/** Numeric helpers shared by every auto-summed / auto-derived matrix cell below. */
export function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function sum(...vals: string[]): string {
  return String(vals.reduce((a, v) => a + num(v), 0));
}

export function yetToRecruit(
  sanctioned: string,
  recruitedTotal: string,
): string {
  return String(Math.max(0, num(sanctioned) - num(recruitedTotal)));
}
