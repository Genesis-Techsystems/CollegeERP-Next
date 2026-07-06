import { GM_CODES } from "@/config/constants/ui";

export type AnyRow = Record<string, any>;

export const DEFAULT_STUDENT_PHOTO =
  "/assets/images/avatars/default_Student.png";

export const EDIT_STEPS = [
  { id: "office", label: "Office Use", progress: 20 },
  { id: "personal", label: "Personal Info", progress: 25 },
  { id: "education", label: "Educational Record", progress: 50 },
  { id: "activities", label: "Activities", progress: 75 },
  { id: "certificates", label: "Certificates", progress: 100 },
] as const;

export type EditStepId = (typeof EDIT_STEPS)[number]["id"];

export const GM_EDIT_CODES = {
  quota: GM_CODES.QUOTA,
  gender: GM_CODES.GENDER,
  disability: GM_CODES.DISABILITY,
  studentType: GM_CODES.STUDENT_TYPE,
  nationality: GM_CODES.NATIONALITY,
  religion: GM_CODES.RELIGION,
  bloodGroup: GM_CODES.BLOOD_GROUP,
  title: GM_CODES.TITLE,
  language: GM_CODES.LANGUAGE,
  qualifyExam: GM_CODES.QUALIFY_EXAM_TYPE,
} as const;

export type StudentDocumentRow = {
  fileName: string;
  documentRepositoryId: number;
  isHardCopy: boolean;
  isSoftCopy: boolean;
  isOriginal: boolean;
  isVerified: boolean;
  rackNumber: string;
  filePath?: string | null;
  path?: File | null;
  stdDocCollId?: number;
  createdDt?: string;
  docRepId?: number;
  isActive?: boolean;
};

export function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const v = Number(row[k] ?? 0);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
}

export function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function toIsoDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function photoSrc(path?: string | null, cacheBust = true): string {
  if (!path) return DEFAULT_STUDENT_PHOTO;
  const base = String(path);
  return cacheBust ? `${base}?${Date.now()}` : base;
}

export function gdOptions(rows: AnyRow[]): { value: string; label: string }[] {
  return rows.map((r) => ({
    value: String(num(r, ["generalDetailId", "id"])),
    label: txt(r, ["generalDetailDisplayName", "name", "generalDetailCode"]),
  }));
}

export function entityOptions(
  rows: AnyRow[],
  idKeys: string[],
  labelKeys: string[],
): { value: string; label: string }[] {
  return rows.map((r) => ({
    value: String(num(r, idKeys)),
    label: txt(r, labelKeys),
  }));
}

export function parseLangFlags(status: unknown): {
  speak: boolean;
  read: boolean;
  write: boolean;
} {
  const flags = { speak: false, read: false, write: false };
  if (!status) return flags;
  const s = String(status);
  if (s.includes("S")) flags.speak = true;
  if (s.includes("R")) flags.read = true;
  if (s.includes("W")) flags.write = true;
  return flags;
}

export function buildLangStatus(
  speak: boolean,
  read: boolean,
  write: boolean,
  languageId: number | null,
): string {
  if (!languageId) return "";
  let out = "";
  if (speak) out += "S";
  if (read) out += "R";
  if (write) out += "W";
  return out;
}

export function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function initLanguageFlags(data: AnyRow): AnyRow {
  const next = { ...data };
  const pairs = [
    ["langStatus1", "speak1", "read1", "write1"],
    ["langStatus2", "speak2", "read2", "write2"],
    ["langStatus3", "speak3", "read3", "write3"],
  ] as const;
  for (const [statusKey, speakKey, readKey, writeKey] of pairs) {
    const flags = parseLangFlags(next[statusKey]);
    next[speakKey] = flags.speak;
    next[readKey] = flags.read;
    next[writeKey] = flags.write;
  }
  return next;
}

export function mergeStudentDocuments(
  repositories: AnyRow[],
  existing: AnyRow[] | undefined,
): StudentDocumentRow[] {
  const docs: StudentDocumentRow[] = repositories.map((r) => ({
    fileName: txt(r, ["docName", "documentName", "name"]),
    documentRepositoryId: num(r, ["documentRepositoryId", "id"]),
    isHardCopy: false,
    isSoftCopy: false,
    isOriginal: false,
    isVerified: false,
    rackNumber: "",
  }));
  const collections = ensureArray<AnyRow>(existing);
  for (const coll of collections) {
    const repId = num(coll, ["documentRepositoryId", "docRepId"]);
    const idx = docs.findIndex((d) => d.documentRepositoryId === repId);
    if (idx < 0) continue;
    docs[idx] = {
      ...docs[idx],
      isHardCopy: Boolean(coll.isHardCopy),
      isOriginal: Boolean(coll.isOriginal),
      isVerified: Boolean(coll.isVerified),
      isSoftCopy: Boolean(coll.isSoftCopy),
      rackNumber: txt(coll, ["rackNumber"]),
      filePath: coll.filePath ? photoSrc(String(coll.filePath)) : null,
      stdDocCollId: num(coll, ["stdDocCollId"]) || undefined,
      createdDt: coll.createdDt ? String(coll.createdDt) : undefined,
    };
  }
  return docs;
}

/** Field placeholders — format: "Ex: …" */
export const EDIT_PLACEHOLDERS = {
  // Office use
  college: "Ex: MVSR Engineering College",
  academicYear: "Ex: 2025-2026",
  course: "Ex: B.E.",
  courseGroup: "Ex: CSE",
  courseYear: "Ex: IV YEAR VIII SEM",
  quota: "Ex: Management",
  regulation: "Ex: R20",
  batch: "Ex: 2022-2026",
  refApplicationNo: "Ex: APP-2024-0542",
  admissionDate: "Ex: 15-08-2024",
  registrationDate: "Ex: 01-07-2024",
  receiptNo: "Ex: RCP-10245",
  studentType: "Ex: Regular",
  // Personal
  title: "Ex: Mr.",
  firstName: "Ex: Rajesh Kumar",
  middleName: "Ex: Venkata",
  lastName: "Ex: Sharma",
  dateOfBirth: "Ex: 15-05-2004",
  sscNo: "Ex: 1234567890",
  identificationMarks: "Ex: Mole on left cheek",
  qualifyExam: "Ex: EAMCET",
  eamcetRank: "Ex: 1250",
  entranceHTNumber: "Ex: 24511234567",
  mobile: "Ex: 9876543210",
  email: "Ex: student@college.edu",
  nationality: "Ex: Indian",
  religion: "Ex: Hindu",
  caste: "Ex: OC",
  subCaste: "Ex: Reddy",
  disability: "Ex: None",
  bloodGroup: "Ex: O+",
  aadharCardNo: "Ex: 1234 5678 9012",
  pancardNo: "Ex: ABCDE1234F",
  passportNo: "Ex: A1234567",
  issueDate: "Ex: 01-01-2020",
  expiryDate: "Ex: 01-01-2030",
  // Parent
  fatherName: "Ex: Ramesh Kumar",
  fatherOccupation: "Ex: Government Employee",
  fatherQualification: "Ex: B.Sc",
  fatherIncome: "Ex: 500000",
  fatherMobile: "Ex: 9876543210",
  fatherEmail: "Ex: father@email.com",
  fatherAddress: "Ex: Hyderabad, Telangana",
  motherName: "Ex: Lakshmi Devi",
  motherOccupation: "Ex: Homemaker",
  motherQualification: "Ex: B.A",
  motherIncome: "Ex: 0",
  motherMobile: "Ex: 9876501234",
  motherEmail: "Ex: mother@email.com",
  motherAddress: "Ex: Hyderabad, Telangana",
  // Address
  addressLine: "Ex: 12-34, Main Road, Secunderabad",
  country: "Ex: India",
  state: "Ex: Telangana",
  district: "Ex: Hyderabad",
  city: "Ex: Secunderabad",
  street: "Ex: MG Road",
  mandal: "Ex: Uppal",
  pincode: "Ex: 500039",
  // Education
  institution: "Ex: ZPHS High School",
  board: "Ex: SSC Board",
  medium: "Ex: English",
  eduAddress: "Ex: Hyderabad",
  subjects: "Ex: Maths, Science",
  grade: "Ex: First Class",
  yearOfCompletion: "Ex: 2020",
  percentage: "Ex: 92.5",
  language: "Ex: Telugu",
  // Activities
  particulars: "Ex: National Science Olympiad",
  level: "Ex: State",
  sponsoredBy: "Ex: College",
  hobbies: "Ex: Reading, Cricket, Music",
  interests: "Ex: Robotics, Programming",
  // Certificates
  rackNumber: "Ex: A-12",
} as const;

export const EDUCATION_FIELD_PLACEHOLDERS: Record<string, string> = {
  nameOfInstitution: EDIT_PLACEHOLDERS.institution,
  board: EDIT_PLACEHOLDERS.board,
  medium: EDIT_PLACEHOLDERS.medium,
  address: EDIT_PLACEHOLDERS.eduAddress,
  majorSubjects: EDIT_PLACEHOLDERS.subjects,
  gradeClassSecured: EDIT_PLACEHOLDERS.grade,
  yearOfCompletion: EDIT_PLACEHOLDERS.yearOfCompletion,
  precentage: EDIT_PLACEHOLDERS.percentage,
};

export const ACTIVITY_FIELD_PLACEHOLDERS: Record<string, string> = {
  particulars: EDIT_PLACEHOLDERS.particulars,
  level: EDIT_PLACEHOLDERS.level,
  sponsoredBy: EDIT_PLACEHOLDERS.sponsoredBy,
};

export function addressesMatch(data: AnyRow): boolean {
  return (
    data.presentCountryId === data.permanentCountryId &&
    data.presentStateId === data.permanentStateId &&
    data.presentDistrictId === data.permanentDistrictId &&
    data.presentCityId === data.permanentCityId &&
    data.presentAddress === data.permanentAddress &&
    data.presentMandal === data.permanentMandal &&
    data.presentPincode === data.permanentPincode &&
    data.presentStreetName === data.permanentStreet
  );
}
