import { EMPLOYEE_API, NEXT_API, STUDENT_API, SUBJECT_API } from '@/config/constants'
import { AppError, parseApiError } from '@/lib/errors'
import type { ApiResponse } from '@/types/api'
import { getAllRecords, postDetails } from '../crud'

export interface UnitTopicBulkUploadSummary {
  totalUnitTopicsUploaded?: number
  totalUnitsUploaded?: number
}

export async function uploadUnitTopicsFile(file: File): Promise<UnitTopicBulkUploadSummary> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const res = await fetch(NEXT_API.PROXY(SUBJECT_API.UPLOAD_SUBJECT_UNIT_TOPICS_COMMA_SEPARATOR), {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<UnitTopicBulkUploadSummary> | null
  if (!body) return {}
  if (!body.success) throw new AppError('API_ERROR', body.message ?? 'Upload failed', body)

  return body.data ?? {}
}

export interface PhotoPreviewRow {
  fileName: string
  status?: string
  message?: string
  studentSignaturePath?: string
}

export interface VerifyPhotoRow {
  fileName: string
  status: string
  message: string
}

async function postFormData<T>(path: string, formData: FormData): Promise<{ message: string; data: T }> {
  const res = await fetch(NEXT_API.PROXY(path), {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!body) return { message: 'Success', data: null as T }
  if (!body.success) throw new AppError('API_ERROR', body.message ?? 'Request failed', body)

  return { message: body.message ?? 'Success', data: body.data as T }
}

export async function verifyPhotosUpload(formData: FormData): Promise<VerifyPhotoRow[]> {
  const { data } = await postFormData<VerifyPhotoRow[]>(STUDENT_API.VALIDATE_PHOTOS, formData)
  return Array.isArray(data) ? data : []
}

export async function uploadPhotosBulk(formData: FormData): Promise<{ message: string; files: PhotoPreviewRow[] }> {
  const { message, data } = await postFormData<PhotoPreviewRow[]>(STUDENT_API.UPLOAD_PHOTOS_GENERIC, formData)
  return { message, files: Array.isArray(data) ? data : [] }
}

export async function uploadTemporaryStagingTable(
  tableName: string,
  file: File,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const path = `tables/upload?tableName=${encodeURIComponent(tableName)}`
  const res = await fetch(NEXT_API.PROXY(path), {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const text = await res.text()
  if (!text.trim()) return 'Upload successful'
  try {
    const body = JSON.parse(text) as ApiResponse<unknown>
    if (body?.success === false) throw new AppError('API_ERROR', body.message ?? 'Upload failed', body)
    return body?.message ?? 'Upload successful'
  } catch {
    return text
  }
}

export interface DostUploadRow {
  nominalRollNumber?: string
  applicantName?: string
  collegeName?: string
  courseCategory?: string
  mobileNumber?: string
  dateOfJoining?: string
}

export async function importDostStudents(file: File): Promise<DostUploadRow[]> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data } = await postFormData<DostUploadRow[]>(STUDENT_API.IMPORT_STD_DOST_DETAILS, formData)
  return Array.isArray(data) ? data : []
}

export interface StudentBulkStagingRow {
  Problems?: string
  first_name?: string
  college?: string
  academic_year?: string
  course?: string
  group?: string
  course_year?: string
  s_section?: string
  batch?: string
  date_of_birth?: string
  student_emailid?: string
  mobile?: string
  father_name?: string
  father_mobile?: string
}

export async function importStudentBulkFile(file: File): Promise<StudentBulkStagingRow[]> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data } = await postFormData<StudentBulkStagingRow[]>(STUDENT_API.IMPORT_DETAILS, formData)
  return Array.isArray(data) ? data : []
}

export async function getStudentBulkStagingRows(): Promise<StudentBulkStagingRow[]> {
  const data = await getAllRecords<{ result: StudentBulkStagingRow[][] }>('s_get_bulk_student_upload', {
    in_flag: 'student_bulk',
  })
  const groups = Array.isArray(data?.result) ? data.result : []
  const first = Array.isArray(groups[0]) ? groups[0] : []
  return first
}

export async function clearStudentBulkStagingRows(): Promise<void> {
  await getAllRecords('s_get_bulk_student_upload', {
    in_flag: 'student_bulk_clear',
  })
}

export async function processStudentBulkStagingRows(): Promise<string> {
  const res = await postDetails<{ message?: string }>(STUDENT_API.PROCESS_STG_DETAILS, {})
  if (res && typeof res === 'object' && 'message' in res) return String((res as { message?: string }).message ?? 'Saved')
  return 'Saved'
}

export interface EmployeeBulkRow {
  firstName?: string
  college?: string
  department?: string
  designation?: string
  dateOfBirth?: string
  dateOfJoin?: string
  email?: string
  mobileNumber?: string
  qualification?: string
}

export interface EmployeeBulkProcessResult {
  message: string
  notSavedRecords: EmployeeBulkRow[]
}

export async function importEmployeeBulkFile(file: File): Promise<EmployeeBulkRow[]> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data } = await postFormData<EmployeeBulkRow[]>(EMPLOYEE_API.IMPORT_DETAILS, formData)
  return Array.isArray(data) ? data : []
}

export async function processEmployeeBulkStagingRows(): Promise<EmployeeBulkProcessResult> {
  const res = await postDetails<ApiResponse<{ notSavedRecords?: EmployeeBulkRow[] }> | { message?: string }>(
    EMPLOYEE_API.PROCESS_STG_DETAILS,
    {},
  )

  if (res && typeof res === 'object' && 'success' in res) {
    const body = res as ApiResponse<{ notSavedRecords?: EmployeeBulkRow[] }>
    return {
      message: body.message ?? 'Saved',
      notSavedRecords: Array.isArray(body.data?.notSavedRecords) ? body.data.notSavedRecords : [],
    }
  }

  return {
    message: (res as { message?: string } | null)?.message ?? 'Saved',
    notSavedRecords: [],
  }
}

export interface SubjectBulkRow {
  university?: string
  course?: string
  subjectCode?: string
  subjectName?: string
  subjectType?: string
  subjectCategory?: string
  subjectShortName?: string
}

export async function importSubjectBulkFile(file: File): Promise<SubjectBulkRow[]> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data } = await postFormData<SubjectBulkRow[]>(SUBJECT_API.IMPORT_SUBJECT_DETAILS, formData)
  return Array.isArray(data) ? data : []
}

export async function processSubjectBulkStagingRows(): Promise<string> {
  const res = await postDetails<{ message?: string }>(SUBJECT_API.PROCESS_STG_SUBJECT_DETAILS, {})
  if (res && typeof res === 'object' && 'message' in res) return String((res as { message?: string }).message ?? 'Saved')
  return 'Saved'
}

export interface BookBulkRow {
  libraryCode?: string
  accNo?: string
  title?: string
  author?: string
  publisher?: string
  edition?: string
  volume?: string
  year?: string
  cost?: string
  invoiceNo?: string
  supplier?: string
}

export interface BookBulkProcessSummary {
  message: string
  totalBooksUploaded?: number
  totalBooksCopiesUploaded?: number
}

export async function importBookBulkFile(file: File): Promise<BookBulkRow[]> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  const { data } = await postFormData<BookBulkRow[]>('importBookDetails', formData)
  return Array.isArray(data) ? data : []
}

export async function processBookBulkStagingRows(): Promise<BookBulkProcessSummary> {
  const res = await postDetails<ApiResponse<{ totalBooksUploaded?: number; totalBooksCopiesUploaded?: number }>>(
    'processStgBookDetails',
    {},
  )
  if (res && typeof res === 'object' && 'success' in res) {
    const body = res as ApiResponse<{ totalBooksUploaded?: number; totalBooksCopiesUploaded?: number }>
    return {
      message: body.message ?? 'Saved',
      totalBooksUploaded: body.data?.totalBooksUploaded,
      totalBooksCopiesUploaded: body.data?.totalBooksCopiesUploaded,
    }
  }
  return { message: 'Saved' }
}
