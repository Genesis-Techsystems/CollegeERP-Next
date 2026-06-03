import { USER_MANAGEMENT_API } from '@/config/constants/api'
import { AppError, parseApiError } from '@/lib/errors'
import type { ApiResponse } from '@/types/api'
import { buildQuery, domainList, domainUpdate } from '@/services/crud'

const PARENT_USER_TYPE_CODE = 'PARENT'

export interface ParentAccount {
  userId: number
  firstName?: string
  lastName?: string
  userName?: string
  email?: string
  mobileNumber?: string
  collegeCode?: string
  collegeId?: number
  organizationId?: number
  organizationCode?: string
  userTypeId?: number
  password?: string
  passwordConfirm?: string
  isActive?: boolean
  isEditable?: boolean
  isReset?: boolean
  reason?: string
}

export interface ParentAccountsPage {
  rows: ParentAccount[]
  totalCount: number
  page: number
  pageSize: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * Angular `CrudService.listByTypeCodeWithPageNation`:
 * `GET {MAINAPI}api/userdetailsbytype?userTypeCode=PARENT&page={page}&size={size}`
 */
export async function listParentAccountsPage(page: number, pageSize: number): Promise<ParentAccountsPage> {
  const params = new URLSearchParams({
    userTypeCode: PARENT_USER_TYPE_CODE,
    page: String(page),
    size: String(pageSize),
  })
  const path = USER_MANAGEMENT_API.USER_DETAILS_BY_TYPE
  const url = `/api/proxy/${path}?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
  const body = (await res.json()) as ApiResponse<unknown> & Record<string, unknown>
  if (body.success === false) {
    throw new AppError('API_ERROR', body.message ?? 'Failed to load parent accounts')
  }

  let rows: ParentAccount[] = []
  let totalCount = 0
  let pageOut = page
  let pageSizeOut = pageSize

  const topTotal = body.totalCount
  const topPage = body.page
  const topPageSize = body.pageSize

  const d = body.data
  if (Array.isArray(d)) {
    rows = d as ParentAccount[]
    totalCount = Number(topTotal ?? rows.length) || rows.length
    pageOut = Number(topPage ?? page) || page
    pageSizeOut = Number(topPageSize ?? pageSize) || pageSize
  } else {
    const chunk = asRecord(d)
    if (chunk) {
      const list = chunk.resultList
      if (Array.isArray(list)) rows = list as ParentAccount[]
      totalCount = Number(chunk.totalCount ?? chunk.count ?? topTotal ?? rows.length) || rows.length
      pageOut = Number(chunk.page ?? topPage ?? page) || page
      pageSizeOut = Number(chunk.pageSize ?? topPageSize ?? pageSize) || pageSize
    }
  }

  return { rows, totalCount, page: pageOut, pageSize: pageSizeOut }
}

export async function getParentAccountById(userId: number): Promise<ParentAccount | null> {
  const q = buildQuery({ userId, 'Usertype.userTypeCode': PARENT_USER_TYPE_CODE })
  const rows = await domainList<ParentAccount>('User', q)
  return rows[0] ?? null
}

export async function updateParentAccount(userId: number, data: Partial<ParentAccount>): Promise<ParentAccount> {
  return domainUpdate<ParentAccount>('User', 'userId', userId, { ...data, userId })
}
