/**
 * Angular knowledge-store (`digital-library`) API parity.
 *
 * Paths match Angular `CONSTANTS` + `crudService` calls exactly.
 */
import {
  ASSESSMENT_API,
  EMPLOYEE_API,
  LIVE_CLASS_API,
  NEXT_API,
  STUDENT_API,
  SUBJECT_API,
} from "@/config/constants/api";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainList,
  domainUpdate,
  fetchDetails,
  fetchDetailsEnvelope,
} from "./crud";
import {
  getDigitalOnlineSyncFilters,
  type ClgFilterAcademicYearRow,
  type ClgFilterRow,
} from "./admin/digital-online-sync";

export type { ClgFilterAcademicYearRow, ClgFilterRow };

/** `clg_filters` rows also carry course-year fields used by Manage Course Content. */
export type ClgFilterCourseYearRow = ClgFilterRow & {
  fk_course_year_id?: number;
  course_year_name?: string;
  year_order?: number;
};

export type OnlineCourseAcademicMapRow = {
  onlinecourseAcademicmapId?: number | null;
  onlineCourseId?: number | null;
  onlineCourseName?: string | null;
  onlineCourseCode?: string | null;
  onlineCourseDesc?: string | null;
  subjectId?: number | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  collegeId?: number | null;
  collegeCode?: string | null;
  academicYearId?: number | null;
  academicYear?: string | null;
  courseGroupId?: number | null;
  courseGroupCode?: string | null;
  courseYearId?: number | null;
  courseYearName?: string | null;
  regulationCode?: string | null;
  style?: string;
  [key: string]: unknown;
};

export type CourseLessonTopic = {
  courseLessonTopicId?: number;
  subjectUnitTopicId?: number;
  topicName?: string;
  videoUrl?: string | null;
  refDocUrl?: string | null;
  lessonName?: string;
  createdUser?: number | string | null;
  duration?: string | number | null;
  img?: string;
  [key: string]: unknown;
};

export type CourseLessonUnit = {
  courseLessonId?: number;
  lessonCode?: string;
  unitName?: string;
  unitCode?: string;
  unitDescription?: string;
  isActive?: boolean;
  courseLessonTopicDTOs?: CourseLessonTopic[];
  [key: string]: unknown;
};

export type StaffSubjectClassRow = {
  subjectRegulationId?: number;
  collegeId?: number;
  collegeCode?: string;
  courseId?: number;
  courseCode?: string;
  courseGroupId?: number;
  groupCode?: string;
  courseYearId?: number;
  courseYearName?: string;
  academicYearId?: number;
  academicYear?: string;
  section?: string;
  subjectId?: number;
  subjectName?: string;
  subjectCode?: string;
  [key: string]: unknown;
};

export type StudentAcademicBatchRow = {
  studentAcademicbatchId?: number;
  collegeId?: number;
  collegeCode?: string;
  academicYearId?: number;
  academicYear?: string;
  courseId?: number;
  courseName?: string;
  courseGroupId?: number;
  groupCode?: string;
  fromCourseYearId?: number;
  fromCourseYearName?: string;
  regulationName?: string;
  [key: string]: unknown;
};

type UriEnvelope = ApiResponse<unknown> & { uri?: string };

export async function getDigitalLibraryClgFilters(
  organizationId: number,
  employeeId: number,
): Promise<{
  filtersData: ClgFilterCourseYearRow[];
  academicYearData: ClgFilterAcademicYearRow[];
}> {
  const data = await getDigitalOnlineSyncFilters(organizationId, employeeId);
  return {
    filtersData: data.filtersData as ClgFilterCourseYearRow[],
    academicYearData: data.academicYearData,
  };
}

export type OnlineCourseAcademicMapResult = {
  rows: OnlineCourseAcademicMapRow[]
  success: boolean
  message: string
}

/**
 * Angular `getSubjectRegulationDetails(onlineCourseAcademicMapUrl, …)` —
 * `GET onlinecourseacademicmap/?collegeId=&academicYearId=&coursegroupId=&courseyearId=`
 */
export async function getOnlineCourseAcademicMap(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<OnlineCourseAcademicMapResult> {
  const envelope = await fetchDetailsEnvelope<OnlineCourseAcademicMapRow[]>(
    ASSESSMENT_API.ONLINE_COURSE_ACADEMIC_MAP,
    {
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      coursegroupId: params.courseGroupId,
      courseyearId: params.courseYearId,
    },
  );
  const rows =
    envelope.success && Array.isArray(envelope.data) ? envelope.data : [];
  return {
    rows,
    success: Boolean(envelope.success),
    message: envelope.message || (rows.length ? '' : 'No Records(s) found.'),
  };
}

/**
 * Angular `getOnlineSubjectDetails(onlineCourseAcademicMapUrl, …)` —
 * same endpoint + `subjectId`.
 */
export async function getOnlineCourseAcademicMapBySubject(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
  subjectId: number;
}): Promise<OnlineCourseAcademicMapResult> {
  const envelope = await fetchDetailsEnvelope<OnlineCourseAcademicMapRow[]>(
    ASSESSMENT_API.ONLINE_COURSE_ACADEMIC_MAP,
    {
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      coursegroupId: params.courseGroupId,
      courseyearId: params.courseYearId,
      subjectId: params.subjectId,
    },
  );
  const rows =
    envelope.success && Array.isArray(envelope.data) ? envelope.data : [];
  return {
    rows,
    success: Boolean(envelope.success),
    message: envelope.message || (rows.length ? '' : 'No Records(s) found.'),
  };
}

/**
 * Angular `listDetailsByTwoIds(CourseLesson, onlineCourseId, 'true',
 * 'onlineCourses.onlineCourseId', 'isActive')`.
 */
export async function listCourseLessonsByOnlineCourse(
  onlineCourseId: number | string,
): Promise<CourseLessonUnit[]> {
  if (!onlineCourseId) return [];
  return domainList<CourseLessonUnit>(
    ASSESSMENT_API.COURSE_LESSON,
    buildQuery({
      "onlineCourses.onlineCourseId": onlineCourseId,
      isActive: true,
    }),
  );
}

/**
 * Angular `listByThreeIds(staffSubjects, employeeId, 'true', today,
 * 'employeeId', 'status', 'classDate')`.
 */
export async function listStaffSubjectsForUpload(params: {
  employeeId: number | string;
  classDate: string;
}): Promise<StaffSubjectClassRow[]> {
  const data = await fetchDetails<StaffSubjectClassRow[] | null>(
    EMPLOYEE_API.STAFF_SUBJECTS,
    {
      employeeId: params.employeeId,
      status: "true",
      classDate: params.classDate,
    },
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Angular `listDetailsByTwoIds(StudentAcademicbatch, studentId, 'true',
 * 'studentDetail.studentId', 'isActive')`.
 */
export async function listStudentAcademicBatches(
  studentId: number | string,
): Promise<StudentAcademicBatchRow[]> {
  if (!studentId) return [];
  return domainList<StudentAcademicBatchRow>(
    STUDENT_API.ACADEMIC_BATCH,
    buildQuery({
      "studentDetail.studentId": studentId,
      isActive: true,
    }),
  );
}

/** Angular `listByIds(presignedUriUrl, uri, 'uri')` → top-level `uri`. */
export async function getPresignedUri(uri: string): Promise<string> {
  const res = await fetch(
    `${NEXT_API.PROXY(LIVE_CLASS_API.PRESIGNED_URI)}?uri=${encodeURIComponent(uri)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as UriEnvelope;
  const top = typeof body.uri === "string" ? body.uri : "";
  if (top) return top;
  if (body.data && typeof body.data === "object") {
    const nested = (body.data as { uri?: unknown }).uri;
    if (typeof nested === "string" && nested) return nested;
  }
  throw new AppError("API_ERROR", body.message || "Failed to resolve media URL");
}

/**
 * Angular `upload(uploadUnitTopicUrl, FormData)` —
 * fields: file, subject, unit, topic. Returns storage `uri`.
 */
export async function uploadUnitTopic(formData: FormData): Promise<{
  uri: string;
  message: string;
}> {
  const res = await fetch(NEXT_API.PROXY(SUBJECT_API.UPLOAD_UNIT_TOPIC), {
    method: "POST",
    body: formData,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as UriEnvelope;
  const uri =
    (typeof body.uri === "string" && body.uri) ||
    (body.data &&
    typeof body.data === "object" &&
    typeof (body.data as { uri?: unknown }).uri === "string"
      ? String((body.data as { uri: string }).uri)
      : "");
  if (!uri) {
    throw new AppError("API_ERROR", body.message || "Upload did not return a URI");
  }
  return { uri, message: body.message || "Uploaded successfully." };
}

/**
 * Angular `updateDetails(CourseLessonsTopic, object, id, 'courseLessonTopicId')`.
 */
export async function updateCourseLessonTopic(
  topic: CourseLessonTopic,
): Promise<void> {
  const id = Number(topic.courseLessonTopicId);
  if (!id) throw new AppError("VALIDATION", "Missing courseLessonTopicId");
  await domainUpdate(
    ASSESSMENT_API.COURSE_LESSONS_TOPIC,
    "courseLessonTopicId",
    id,
    topic,
  );
}

/**
 * Angular `deleteVideo('storage', path, topicId)` —
 * `DELETE storage?uri={path}&courseLessonTopicId={id}`.
 */
export async function deleteCourseLessonTopicVideo(params: {
  videoPath: string;
  courseLessonTopicId: number;
}): Promise<string> {
  const qs = new URLSearchParams({
    uri: params.videoPath,
    courseLessonTopicId: String(params.courseLessonTopicId),
  });
  const res = await fetch(`${NEXT_API.PROXY(LIVE_CLASS_API.STORAGE)}?${qs}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError("API_ERROR", body.message || "Failed to delete video");
  }
  return body.message || "Deleted successfully.";
}

/** Angular `upload(uploadSubjectUnitUrl, FormData)` with `file` + `subjectRegulationId`. */
export async function uploadSubjectUnitExcel(formData: FormData): Promise<string> {
  const res = await fetch(NEXT_API.PROXY(SUBJECT_API.UPLOAD_SUBJECT_UNIT), {
    method: "POST",
    body: formData,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError("API_ERROR", body.message || "Unit upload failed");
  }
  return body.message || "Uploaded successfully.";
}
