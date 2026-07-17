/** Shared pay-fees modes — Angular bus / hostel / library / fee-payment. */

export type FeePayPageMode = 'bus-fee' | 'hostel-fee' | 'library-fee' | 'fee-payment'

export type CategoryFeePayConfig = {
  page: FeePayPageMode
  title: string
  /** Angular feeCategoryCode / particularsCode filter (`Transport` | `HF` | `LF`). */
  categoryCode: string
  /** Load transportallocationforstudent + require route before pay. */
  requireTransport: boolean
  /** Exclude ONLINE from payment mode/type lists (bus parity). */
  filterOnlineLookups: boolean
  backHref: (qs: URLSearchParams) => string
}

const BUS_BACK = '/accounts-and-fees/fees-collection/bus-payment/bus-fee-payment'
const HOSTEL_BACK = '/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment'
const LIBRARY_BACK = '/accounts-and-fees/fees-collection/library-payment/library-fee-payment'

export function resolveFeePayConfig(page: string | null): CategoryFeePayConfig {
  const mode = (page ?? 'fee-payment') as FeePayPageMode

  if (mode === 'bus-fee') {
    return {
      page: 'bus-fee',
      title: 'Bus Fee Payment',
      categoryCode: 'Transport',
      requireTransport: true,
      filterOnlineLookups: true,
      backHref: (qs) => {
        const back = new URLSearchParams()
        for (const key of [
          'studentId',
          'collegeId',
          'rollNumber',
          'hallTicketNo',
          'firstName',
          'collegeCode',
        ] as const) {
          const v = qs.get(key)
          if (v) back.set(key, v)
        }
        const s = back.toString()
        return s ? `${BUS_BACK}?${s}` : BUS_BACK
      },
    }
  }

  if (mode === 'hostel-fee') {
    return {
      page: 'hostel-fee',
      title: 'Hostel Fee Payment',
      categoryCode: 'HF',
      requireTransport: false,
      filterOnlineLookups: false,
      backHref: (qs) => {
        const back = new URLSearchParams()
        for (const key of [
          'studentId',
          'hostelId',
          'hstlRoomId',
          'rollNumber',
          'hallTicketNo',
          'firstName',
          'collegeId',
        ] as const) {
          const v = qs.get(key)
          if (v) back.set(key, v)
        }
        const s = back.toString()
        return s ? `${HOSTEL_BACK}?${s}` : HOSTEL_BACK
      },
    }
  }

  if (mode === 'library-fee') {
    return {
      page: 'library-fee',
      title: 'Library Fee Payment',
      categoryCode: 'LF',
      requireTransport: false,
      filterOnlineLookups: false,
      backHref: (qs) => {
        const back = new URLSearchParams()
        for (const key of [
          'studentId',
          'collegeId',
          'rollNumber',
          'hallTicketNo',
          'firstName',
          'collegeCode',
        ] as const) {
          const v = qs.get(key)
          if (v) back.set(key, v)
        }
        const s = back.toString()
        return s ? `${LIBRARY_BACK}?${s}` : LIBRARY_BACK
      },
    }
  }

  return {
    page: 'fee-payment',
    title: 'Fee Payment',
    categoryCode: '',
    requireTransport: false,
    filterOnlineLookups: true,
    backHref: () => '/accounts-and-fees/fees-collection',
  }
}

/** Angular payment-mode id → reference field (legacy hardcoded IDs). */
export function referenceFieldForPaymentMode(modeId: number | null): {
  key: 'referenceNumber' | 'transactionNo' | 'chequeNo' | 'ddno' | 'otherPaymentNumber'
  label: string
} | null {
  switch (modeId) {
    case 131:
      return { key: 'referenceNumber', label: 'Reference Number' }
    case 132:
      return { key: 'transactionNo', label: 'Transaction Number' }
    case 133:
      return { key: 'chequeNo', label: 'Cheque Number' }
    case 134:
      return { key: 'ddno', label: 'DD Number' }
    case 135:
      return { key: 'otherPaymentNumber', label: 'Other Payment Number' }
    default:
      return null
  }
}

export function formatTransportTime(time?: string): string {
  if (!time) return ''
  const match = String(time).match(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
  if (!match) return String(time)
  const hour = Number(match[1])
  const min = match[2]
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 || 12
  return `${h12}:${min} ${ampm}`
}

export function buildTransportPaymentFor(
  categoryCode: string,
  allocation?: {
    pickupRouteStopName?: string
    pickTime?: string
    dropRoutestopName?: string
    dropTime?: string
    routeCode?: string
  } | null,
): string {
  if (!allocation?.pickupRouteStopName && !allocation?.routeCode) return categoryCode
  return `${categoryCode} (${allocation.pickupRouteStopName ?? ''} ${formatTransportTime(allocation.pickTime)} - ${allocation.dropRoutestopName ?? ''} ${formatTransportTime(allocation.dropTime)} / ${allocation.routeCode ?? ''})`
}
