/**
 * Hostel module — mirrors Angular `apps/hostel/`.
 */

import { ENTITIES } from '@/config/constants/entities'
import { HOSTEL_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import type {
  HostelDetail,
  HostelDiscount,
  HostelRegister,
  HostelRoom,
  HostelRoomCharge,
  HostelType,
  HostelVisitor,
} from '@/types/hostel'
import type { GeneralDetail } from '@/types/exam-master'
import { format } from 'date-fns'
import { domainCreate, domainList, domainUpdate, getAllRecords, postDetails } from './crud'
import { buildQuery } from './query'
import { getGeneralDetails } from './exam-master'

// ─── Hostel types ────────────────────────────────────────────────────────────

export async function listHostelTypes(): Promise<HostelType[]> {
  return domainList<HostelType>(ENTITIES.HOSTEL_TYPE.name)
}

export async function createHostelType(
  data: Omit<HostelType, 'hostelTypeId' | 'orgCode' | 'orgName'>,
): Promise<HostelType> {
  return domainCreate<HostelType>(ENTITIES.HOSTEL_TYPE.name, data)
}

export async function updateHostelType(
  hostelTypeId: number,
  data: Partial<HostelType>,
): Promise<HostelType> {
  return domainUpdate<HostelType>(
    ENTITIES.HOSTEL_TYPE.name,
    ENTITIES.HOSTEL_TYPE.pk,
    hostelTypeId,
    { hostelTypeId, ...data },
  )
}

// ─── Hostel details ──────────────────────────────────────────────────────────

export async function listHostelDetails(): Promise<HostelDetail[]> {
  return domainList<HostelDetail>(ENTITIES.HOSTEL_DETAIL.name)
}

export async function listHostelsByOrganization(organizationId: number): Promise<HostelDetail[]> {
  if (!organizationId) return []
  const queries = [
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
    buildQuery({ organizationId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<HostelDetail>(ENTITIES.HOSTEL_DETAIL.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return domainList<HostelDetail>(ENTITIES.HOSTEL_DETAIL.name)
}

export async function createHostelDetail(
  data: Omit<HostelDetail, 'hostelId' | 'hostelTypeCode' | 'hstlForCatdetCode' | 'orgCode'>,
): Promise<HostelDetail> {
  return domainCreate<HostelDetail>(ENTITIES.HOSTEL_DETAIL.name, data)
}

export async function updateHostelDetail(
  hostelId: number,
  data: Partial<HostelDetail>,
): Promise<HostelDetail> {
  return domainUpdate<HostelDetail>(
    ENTITIES.HOSTEL_DETAIL.name,
    ENTITIES.HOSTEL_DETAIL.pk,
    hostelId,
    { hostelId, ...data },
  )
}

// ─── Room charges ────────────────────────────────────────────────────────────

export async function listHostelRoomCharges(): Promise<HostelRoomCharge[]> {
  return domainList<HostelRoomCharge>(ENTITIES.HOSTEL_ROOM_CHARGE.name)
}

export async function createHostelRoomCharge(
  data: Omit<HostelRoomCharge, 'hstlRoomChargesId' | 'hostelCode' | 'roomTypeCatdetCode' | 'paymentFrequencyCatdetCode'>,
): Promise<HostelRoomCharge> {
  return domainCreate<HostelRoomCharge>(ENTITIES.HOSTEL_ROOM_CHARGE.name, data)
}

export async function updateHostelRoomCharge(
  hstlRoomChargesId: number,
  data: Partial<HostelRoomCharge>,
): Promise<HostelRoomCharge> {
  return domainUpdate<HostelRoomCharge>(
    ENTITIES.HOSTEL_ROOM_CHARGE.name,
    ENTITIES.HOSTEL_ROOM_CHARGE.pk,
    hstlRoomChargesId,
    { hstlRoomChargesId, ...data },
  )
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function listHostelRoomsByHostel(hostelId: number): Promise<HostelRoom[]> {
  if (!hostelId) return []
  const queries = [
    buildQuery({ 'HostelDetail.hostelId': hostelId }),
    buildQuery({ hostelId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<HostelRoom>(ENTITIES.HOSTEL_ROOM.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function createHostelRoom(
  data: Omit<HostelRoom, 'hstlRoomId' | 'allotedBeds' | 'availableBeds' | 'roomTypeCode'> & { hostelId: number },
): Promise<HostelRoom> {
  return domainCreate<HostelRoom>(ENTITIES.HOSTEL_ROOM.name, data)
}

export async function updateHostelRoom(
  hstlRoomId: number,
  data: Partial<HostelRoom>,
): Promise<HostelRoom> {
  return domainUpdate<HostelRoom>(
    ENTITIES.HOSTEL_ROOM.name,
    ENTITIES.HOSTEL_ROOM.pk,
    hstlRoomId,
    { hstlRoomId, ...data },
  )
}

// ─── Discounts ───────────────────────────────────────────────────────────────

export async function listHostelDiscounts(): Promise<HostelDiscount[]> {
  return domainList<HostelDiscount>(ENTITIES.HOSTEL_DISCOUNT.name)
}

export async function createHostelDiscount(
  data: Omit<HostelDiscount, 'hstlDiscountId' | 'hostelCode'>,
): Promise<HostelDiscount> {
  return domainCreate<HostelDiscount>(ENTITIES.HOSTEL_DISCOUNT.name, data)
}

export async function updateHostelDiscount(
  hstlDiscountId: number,
  data: Partial<HostelDiscount>,
): Promise<HostelDiscount> {
  return domainUpdate<HostelDiscount>(
    ENTITIES.HOSTEL_DISCOUNT.name,
    ENTITIES.HOSTEL_DISCOUNT.pk,
    hstlDiscountId,
    { hstlDiscountId, ...data },
  )
}

// ─── Register & visitors ─────────────────────────────────────────────────────

export async function listHostelRegistersByHostel(hostelId: number): Promise<HostelRegister[]> {
  if (!hostelId) return []
  const queries = [
    buildQuery({ 'HostelDetail.hostelId': hostelId }),
    buildQuery({ hostelId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<HostelRegister>(ENTITIES.HOSTEL_REGISTER.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function listHostelVisitorsByHostel(hostelId: number): Promise<HostelVisitor[]> {
  if (!hostelId) return []
  const queries = [
    buildQuery({ 'HostelDetail.hostelId': hostelId }),
    buildQuery({ hostelId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<HostelVisitor>(ENTITIES.HOSTEL_VISITOR.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function createHostelRegister(data: Partial<HostelRegister>): Promise<HostelRegister> {
  return domainCreate<HostelRegister>(ENTITIES.HOSTEL_REGISTER.name, data)
}

export async function updateHostelRegister(
  hstlRegisterId: number,
  data: Partial<HostelRegister>,
): Promise<HostelRegister> {
  return domainUpdate<HostelRegister>(
    ENTITIES.HOSTEL_REGISTER.name,
    ENTITIES.HOSTEL_REGISTER.pk,
    hstlRegisterId,
    { hstlRegisterId, ...data },
  )
}

export async function createHostelVisitor(data: Partial<HostelVisitor>): Promise<HostelVisitor> {
  return domainCreate<HostelVisitor>(ENTITIES.HOSTEL_VISITOR.name, data)
}

export async function updateHostelVisitor(
  hstlVisitorId: number,
  data: Partial<HostelVisitor>,
): Promise<HostelVisitor> {
  return domainUpdate<HostelVisitor>(
    ENTITIES.HOSTEL_VISITOR.name,
    ENTITIES.HOSTEL_VISITOR.pk,
    hstlVisitorId,
    { hstlVisitorId, ...data },
  )
}

// ─── General master lookups ──────────────────────────────────────────────────

export async function listHostelForOptions(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.HOSTEL_FOR)
}

export async function listHostelRoomTypeOptions(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.HOSTEL_ROOM_TYPE)
}

export async function listPaymentFrequencyOptions(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.PAYMENT_TYPE_FREQ)
}

// ─── Transactions & reports ────────────────────────────────────────────────────

export async function postHostelRoomAllocation(payload: unknown): Promise<void> {
  await postDetails(HOSTEL_API.ROOM_ALLOCATION, payload)
}

export async function postHostelAllocationForStudent(payload: unknown): Promise<void> {
  await postDetails(HOSTEL_API.HOSTEL_ALLOCATION, payload)
}

export async function getVisitorsSummaryReport(params: {
  hostelId: number
  fromDate: string
  toDate: string
}): Promise<Record<string, unknown>[]> {
  const { hostelId, fromDate, toDate } = params
  if (!hostelId) return []
  try {
    const data = await getAllRecords<{ result?: Record<string, unknown>[][] }>(
      HOSTEL_API.GET_VISITORS_REPORT,
      { in_hostel_id: hostelId, in_from_date: fromDate, in_to_date: toDate },
    )
    const rows = data?.result?.[0]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export function toHostelApiDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  return format(d, 'yyyy-MM-dd')
}
