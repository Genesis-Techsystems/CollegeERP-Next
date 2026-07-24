/**
 * Subject Master — Angular `academics/master/subjects` parity.
 */
import { SUBJECT_API, NEXT_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import { ENTITIES } from "@/config/constants/entities";
import { parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import { buildQuery, domainList } from "../crud";

type AnyRow = Record<string, unknown>;

function asRows<T>(data: unknown): T[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object" && data !== null && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as T[];
    return [list as T];
  }
  return [];
}

/**
 * Angular `listDetailsByIdsWithSort(Subject, courseId, 'Course.courseId')`
 * → domain/list/Subject?size=99999&query=Course.courseId=={id}
 * Client sorts by subjectId DESC.
 */
export async function listSubjectsByCourse(
  courseId: number,
): Promise<AnyRow[]> {
  if (!courseId) return [];
  const queries = [
    `Course.courseId==${courseId}`,
    buildQuery({ "Course.courseId": courseId }),
    buildQuery({ "course.courseId": courseId }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.SUBJECT.name, query);
      if (rows.length > 0) {
        return [...rows].sort(
          (a, b) => Number(b.subjectId ?? 0) - Number(a.subjectId ?? 0),
        );
      }
    } catch {
      // try next query shape
    }
  }
  return [];
}

export async function listSubjectTypes(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.SUBJECT_TYPE,
      isActive: true,
    }),
    buildQuery({
      generalMasterCode: GM_CODES.SUBJECT_TYPE,
      isActive: true,
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, q);
      if (rows.length > 0) return rows;
    } catch {
      // fallback
    }
  }
  return [];
}

export async function listSubjectCategories(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.SUBJECT_CATEGORY,
      isActive: true,
    }),
    buildQuery({
      generalMasterCode: GM_CODES.SUBJECT_CATEGORY,
      isActive: true,
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, q);
      if (rows.length > 0) return rows;
    } catch {
      // fallback
    }
  }
  return [];
}

/**
 * Angular create duplicate check:
 * `subjects.filter(x => x.subjectCode === details.data.subjectCode && x.collegeId === details.data.collegeId)`
 */
export function isDuplicateSubjectCode(
  existingRows: AnyRow[],
  subjectCode: string,
  collegeId?: number | null,
): boolean {
  const code = subjectCode.trim();
  if (!code) return false;
  return existingRows.some((x) => {
    const xCode = String(x.subjectCode ?? "").trim();
    if (xCode !== code) return false;
    if (collegeId == null || collegeId === 0) return true;
    return Number(x.collegeId ?? 0) === Number(collegeId);
  });
}

/** @deprecated Prefer isDuplicateSubjectCode — kept for older callers */
export function isDuplicateSubject(
  existingRows: AnyRow[],
  details: { subjectName: string; subjectCode: string; subjectId?: number },
): boolean {
  return isDuplicateSubjectCode(existingRows, details.subjectCode);
}

async function multipartEnvelope(
  path: string,
  formData: FormData,
  /** Angular: `upload` → POST, `updateUpload` → PUT */
  method: "POST" | "PUT",
): Promise<ApiResponse<unknown>> {
  const res = await fetch(NEXT_API.PROXY(path), {
    method,
    body: formData,
    credentials: "include",
    cache: "no-store",
  });
  // Soft-failure bodies (HTTP 200 + success:false) must be returned to the caller
  // so Angular-parity toasts can show `message` as Info.
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  return (await res.json()) as ApiResponse<unknown>;
}

/**
 * Angular `crudService.upload(addSubjectAndUploadFileUrl, formData)` → POST multipart
 * (`data` JSON blob + optional `file`).
 */
export async function addSubjectAndUploadFile(
  payload: AnyRow,
  file?: File | null,
): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  if (file) formData.append("file", file, file.name);
  return multipartEnvelope(
    SUBJECT_API.ADD_SUBJECT_AND_UPLOAD_FILE,
    formData,
    "POST",
  );
}

/**
 * Angular `crudService.updateUpload(updateSubjectAndUploadFileUrl, formData)` → PUT multipart
 * (`updatedData` JSON blob + optional `updatedFile`).
 */
export async function updateSubjectAndUploadFile(
  payload: AnyRow,
  file?: File | null,
): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  formData.append(
    "updatedData",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  if (file) formData.append("updatedFile", file, file.name);
  return multipartEnvelope(
    SUBJECT_API.UPDATE_SUBJECT_AND_UPLOAD_FILE,
    formData,
    "PUT",
  );
}

/**
 * Angular soft-deactivate when editing with isActive == false:
 * `DELETE subject/{subjectId}`
 */
export async function deactivateSubject(
  subjectId: number,
): Promise<ApiResponse<unknown>> {
  const res = await fetch(NEXT_API.PROXY(`subject/${subjectId}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  return (await res.json().catch(() => ({
    success: true,
    message: "Deactivated",
  }))) as ApiResponse<unknown>;
}

/** Legacy wrappers used by older callers — prefer multipart helpers above. */
export async function createSubject(payload: AnyRow): Promise<AnyRow> {
  const result = await addSubjectAndUploadFile(payload, null);
  if (!result.success) throw new Error(result.message ?? "Create failed");
  return (result.data ?? {}) as AnyRow;
}

export async function updateSubject(
  subjectId: number,
  payload: AnyRow,
): Promise<AnyRow> {
  const result = await updateSubjectAndUploadFile(
    { subjectId, ...payload },
    null,
  );
  if (!result.success) throw new Error(result.message ?? "Update failed");
  return (result.data ?? {}) as AnyRow;
}

export async function createSubjectWithOptionalFile(
  payload: AnyRow,
  file?: File | null,
): Promise<AnyRow> {
  const result = await addSubjectAndUploadFile(payload, file);
  if (!result.success) throw new Error(result.message ?? "Create failed");
  return (result.data ?? {}) as AnyRow;
}

export async function updateSubjectWithOptionalFile(
  subjectId: number,
  payload: AnyRow,
  file?: File | null,
): Promise<AnyRow> {
  const result = await updateSubjectAndUploadFile(
    { subjectId, ...payload },
    file,
  );
  if (!result.success) throw new Error(result.message ?? "Update failed");
  return (result.data ?? {}) as AnyRow;
}

void asRows;
