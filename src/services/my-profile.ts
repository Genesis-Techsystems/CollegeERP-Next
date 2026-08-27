/**
 * Angular `main/apps/my-profile` + `std-profile` — self-service profile APIs.
 */
import { format } from "date-fns";
import { EMPLOYEE_API, EXAM_EVAL_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainGetRawQuery,
  domainList,
  domainUpdate,
  fetchDetails,
  postDetails,
  putDetails,
  uploadFile,
} from "@/services/crud";
import { listGeneralDetailsByCode } from "@/services/student-information";

export type ProfileAnyRow = Record<string, unknown>;

export type ProfileLoginUser = ProfileAnyRow & {
  userId: number;
  userTypeCode?: string;
  userRole?: string;
  password?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type EmployeeProfileDetails = ProfileAnyRow & {
  employeeId?: number;
  empNumber?: string;
  photoPath?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  collegeName?: string;
  deptName?: string;
  designationName?: string;
  mobile?: string;
  email?: string;
  orgCode?: string;
  collegeCode?: string;
};

export type StudentProfileDetails = ProfileAnyRow & {
  studentId?: number;
  rollNumber?: string;
  studentPhotoPath?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  collegeName?: string;
  courseName?: string;
  groupCode?: string;
  courseYearName?: string;
  mobile?: string;
  stdEmailId?: string;
};

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asText(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Angular `momentWithDateFormatYMD` for profile save payloads. */
export function profileDateToYmd(
  value: Date | string | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM-dd");
  }
  if (Number.isNaN(value.getTime())) return null;
  return format(value, "yyyy-MM-dd");
}

export function profileParseDate(
  value: unknown,
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Angular `getDetailsById(User, userId)`. */
export async function getProfileLoginUser(
  userId: number,
): Promise<ProfileLoginUser | null> {
  if (!userId) return null;
  try {
    const data = await domainGetRawQuery<ProfileLoginUser>(
      "User",
      `userId==${userId}`,
    );
    return data ?? null;
  } catch {
    const rows = await domainList<ProfileLoginUser>(
      "User",
      buildQuery({ userId }),
    );
    return rows[0] ?? null;
  }
}

/** Angular `employeedetailsbyid?userId=`. */
export async function getEmployeeProfileByUserId(
  userId: number,
): Promise<EmployeeProfileDetails | null> {
  if (!userId) return null;
  try {
    return await fetchDetails<EmployeeProfileDetails>(
      EMPLOYEE_API.DETAILS_BY_USER_ID,
      { userId },
    );
  } catch {
    return null;
  }
}

/** Angular `studentdetail?userId=`. */
export async function getStudentProfileByUserId(
  userId: number,
): Promise<StudentProfileDetails | null> {
  if (!userId) return null;
  try {
    return await fetchDetails<StudentProfileDetails>("studentdetail", {
      userId,
    });
  } catch {
    return null;
  }
}

/** Angular PUT `employeedetails` (employeeapplicationUrl). */
export async function updateEmployeeProfile(
  payload: EmployeeProfileDetails,
): Promise<void> {
  await putDetails(EMPLOYEE_API.EMPLOYEEAPPLICATION, payload);
}

/** Angular POST `employeeapplicationuploads`. */
export async function uploadEmployeeProfilePhoto(
  formData: FormData,
): Promise<unknown> {
  return uploadFile(EMPLOYEE_API.UPLOAD_FILES, formData);
}

/** Angular PUT `domain/update/User?query=userId==…` after change-password dialog. */
export async function updateProfileUserPassword(
  user: ProfileLoginUser,
): Promise<void> {
  await domainUpdate("User", "userId", user.userId, user);
}

export type ProfileGmOption = {
  value: string;
  label: string;
};

function gmOptions(rows: ProfileAnyRow[]): ProfileGmOption[] {
  return rows
    .map((r) => {
      const id = asNum(r.generalDetailId);
      if (!id) return null;
      const label =
        asText(r.generalDetailDisplayName) ||
        asText(r.generalDetailName) ||
        asText(r.generalDetailCode) ||
        String(id);
      return { value: String(id), label };
    })
    .filter((x): x is ProfileGmOption => x != null);
}

export async function listProfileTitles(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.TITLE));
}

export async function listProfileGenders(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.GENDER));
}

export async function listProfileNationalities(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.NATIONALITY));
}

export async function listProfileReligions(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.RELIGION));
}

export async function listProfileMaritalStatuses(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.MARITAL_STATUS));
}

export async function listProfileBloodGroups(): Promise<ProfileGmOption[]> {
  return gmOptions(await listGeneralDetailsByCode(GM_CODES.BLOOD_GROUP));
}

export async function listProfileCastes(): Promise<ProfileGmOption[]> {
  const rows = await domainList<ProfileAnyRow>(
    "Caste",
    buildQuery({ isActive: true }),
  );
  return rows
    .map((r) => {
      const id = asNum(r.casteId);
      if (!id) return null;
      return {
        value: String(id),
        label: asText(r.caste) || String(id),
      };
    })
    .filter((x): x is ProfileGmOption => x != null);
}

export async function listProfileSubCastesByCaste(
  casteId: number,
): Promise<ProfileGmOption[]> {
  if (!casteId) return [];
  const queries = [
    buildQuery({ "Caste.casteId": casteId, isActive: true }),
    buildQuery({ casteId, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<ProfileAnyRow>("SubCaste", q);
      if (rows.length > 0) {
        return rows
          .map((r) => {
            const id = asNum(r.subCasteId);
            if (!id) return null;
            return {
              value: String(id),
              label: asText(r.subCaste) || String(id),
            };
          })
          .filter((x): x is ProfileGmOption => x != null);
      }
    } catch {
      // next query shape
    }
  }
  return [];
}

export type EvaluatorProfileBundle = {
  isEvaluator: boolean;
  profileId: number;
  profile: ProfileAnyRow | null;
  bank: ProfileAnyRow | null;
};

/**
 * Angular `getevaluatordetails?userId=` + `ExamEvaluatorBankDetails` list.
 */
export async function loadEvaluatorProfileBundle(
  userId: number,
): Promise<EvaluatorProfileBundle> {
  const empty: EvaluatorProfileBundle = {
    isEvaluator: false,
    profileId: 0,
    profile: null,
    bank: null,
  };
  if (!userId) return empty;
  try {
    const raw = await fetchDetails<ProfileAnyRow>(
      EXAM_EVAL_API.GET_EVALUATOR_DETAILS,
      { userId },
    );
    const profileRaw = raw?.exam_evaluatorProfiles_details;
    const profile: ProfileAnyRow | null = profileRaw
      ? Array.isArray(profileRaw)
        ? ((profileRaw[0] as ProfileAnyRow | undefined) ?? null)
        : (profileRaw as ProfileAnyRow)
      : null;
    const profileId = asNum(
      profile?.examEvaluatorProfileId ?? profile?.examEvaluatorProfilesId,
    );
    if (!profile || !profileId) return empty;

    const bankRows = await domainList<ProfileAnyRow>(
      EXAM_EVAL_API.EVALUATOR_BANK_DETAILS,
      buildQuery({
        "examEvaluatorProfiles.examEvaluatorProfileId": profileId,
        isActive: true,
      }),
    ).catch(() => [] as ProfileAnyRow[]);

    return {
      isEvaluator: true,
      profileId,
      profile,
      bank: bankRows[0] ?? null,
    };
  } catch {
    return empty;
  }
}

/** Angular POST `addExamEvaluatorProfileBankDetails` (array payload). */
export async function saveEvaluatorProfileBankDetails(
  payload: ProfileAnyRow[],
): Promise<void> {
  await postDetails(EXAM_EVAL_API.ADD_EXAM_EVALUATOR_PROFILE_BANK_DETAILS, payload);
}

/** Angular PUT `updateExamEvaluatorProfiles`. */
export async function saveEvaluatorProfileDetails(
  payload: ProfileAnyRow,
): Promise<void> {
  await putDetails(EXAM_EVAL_API.UPDATE_EVALUATOR_PROFILES, payload);
}
