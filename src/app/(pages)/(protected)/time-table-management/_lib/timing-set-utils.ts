/** Compare 24h times `HH:mm:ss` — true when end is after start. */
export function isEndAfterStart(startTime: string, endTime: string): boolean {
  const toMinutes = (t: string) => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})/)
    if (!m) return 0
    return Number(m[1]) * 60 + Number(m[2])
  }
  return toMinutes(endTime) > toMinutes(startTime)
}

export function defaultTimingSlotRow(sortOrder: number): TimingSlotDraft {
  return {
    key: `row-${Date.now()}-${sortOrder}`,
    name: '',
    startTime: '09:00:00',
    endTime: '10:00:00',
    isBreak: false,
    sortOrder,
    isActive: true,
  }
}

export type TimingSlotDraft = {
  key: string
  classTimingsId?: number
  name: string
  startTime: string
  endTime: string
  isBreak: boolean
  sortOrder: number
  isActive: boolean
}

export type WeekdayDraft = {
  weekdayId: number
  name: string
  checked: boolean
  classWeekdayId?: number
  collegeId?: number
  isActive?: boolean
}

export type ClassWeekdayPayload = {
  weekdayId: number
  name: string
  weekdayName?: string
  checked?: boolean
  isActive: boolean
  collegeId: number
  classWeekdayId?: number
  classTimings: Record<string, unknown>[]
}

export function buildClassWeekdaysPayload(
  weekdays: WeekdayDraft[],
  slots: TimingSlotDraft[],
  collegeId: number,
): ClassWeekdayPayload[] {
  const activeSlots = slots
    .filter((s) => s.isActive && s.name.trim())
    .map((s, idx) => ({
      ...(s.classTimingsId ? { classTimingsId: s.classTimingsId } : {}),
      name: s.name.trim(),
      startTime: s.startTime,
      endTime: s.endTime,
      isBreak: s.isBreak,
      sortOrder: s.sortOrder || idx + 1,
      isActive: true,
      collegeId,
    }))

  return weekdays
    .filter((w) => w.checked)
    .map((w) => ({
      weekdayId: w.weekdayId,
      name: w.name,
      weekdayName: w.name,
      isActive: w.isActive ?? true,
      collegeId,
      ...(w.classWeekdayId ? { classWeekdayId: w.classWeekdayId } : {}),
      classTimings: activeSlots,
    }))
}
