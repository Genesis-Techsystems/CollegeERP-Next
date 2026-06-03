'use client'

import { formatClockAmPm } from '../_lib/timetable-filters'

export const TIMETABLE_MODAL_HEADER_BG = '#C3D9FF'
export const TIMETABLE_MODAL_BREAK_BG = '#dedede'

type TimingRow = {
  name?: string
  isBreak?: boolean
  startTime?: string
  endTime?: string
}

export type WeekdayColumn = {
  weekdayName?: string
  classTimings?: TimingRow[]
}

type TimingSetStructurePreviewProps = {
  classWeekdays: WeekdayColumn[]
  /** Angular `ViewStructureModalComponent` — inline-table columns at 16.6% width. */
  variant?: 'default' | 'modal'
}

export function TimingSetStructurePreview({
  classWeekdays,
  variant = 'default',
}: TimingSetStructurePreviewProps) {
  if (!classWeekdays.length) return null

  const isModal = variant === 'modal'

  return (
    <div className={isModal ? 'overflow-x-auto bg-white' : 'overflow-x-auto'}>
      <div className="overflow-x-auto">
        <div
          className={
            isModal
              ? 'flex w-full min-w-[640px] justify-center py-1'
              : 'mar flex min-w-[640px] justify-center gap-0'
          }
        >
          {classWeekdays.map((weekday, wi) => (
            <div
              key={`${weekday.weekdayName}-${wi}`}
              className={
                isModal
                  ? 'table-span inline-table w-[16.666%] min-w-[108px] border border-[#c3d9ff]'
                  : 'table-span flex min-w-[100px] flex-1 flex-col border border-[#c3d9ff]'
              }
            >
              <div
                className="table-th border-b border-[#c3d9ff] px-[5px] py-[5px] text-center text-[12px] font-medium text-black"
                style={{ backgroundColor: TIMETABLE_MODAL_HEADER_BG }}
              >
                {weekday.weekdayName}
              </div>
              {(weekday.classTimings ?? []).map((timing, ti) => (
                <div
                  key={`${timing.name}-${ti}`}
                  className="table-td border-b border-[#c3d9ff] px-6 py-2 text-center text-[11px] leading-snug text-black"
                  style={{ backgroundColor: timing.isBreak ? TIMETABLE_MODAL_BREAK_BG : '#ffffff' }}
                >
                  {timing.name ? (
                    <span className="breakName mb-[-10px] flex justify-center text-center font-medium">
                      {timing.name}
                    </span>
                  ) : null}
                  <br />
                  {formatClockAmPm(String(timing.startTime ?? ''))}
                  {timing.startTime && timing.endTime ? ' - ' : ''}
                  {formatClockAmPm(String(timing.endTime ?? ''))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
