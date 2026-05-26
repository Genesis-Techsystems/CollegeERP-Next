'use client'

import {
  timetableBreakCellBg,
  type StudentTimetableGrid,
  type TimetableGridCell,
  type TimetableGridRow,
} from '@/services'
import { TIMETABLE_MODAL_BREAK_BG, TIMETABLE_MODAL_HEADER_BG } from './TimingSetStructurePreview'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function periodLabel(rowIndex: number): string {
  const roman = ROMAN[rowIndex + 1] ?? String(rowIndex + 1)
  return `PERIOD ${roman}`
}

function MatrixCell({ cell, rowIndex }: { cell: TimetableGridCell; rowIndex: number }) {
  const isBreak = cell.kind === 'break'
  const bg =
    isBreak ? timetableBreakCellBg(cell.breakLabel ?? '', true) || TIMETABLE_MODAL_BREAK_BG : '#ffffff'

  return (
    <td
      className="min-w-[110px] border border-[#c3d9ff] px-6 py-2 text-center align-middle text-[11px] text-black"
      style={{ backgroundColor: bg }}
    >
      {isBreak ? (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase">{cell.breakLabel ?? 'BREAK'}</span>
          {cell.timeLabel ? <span className="text-[10px] font-medium">{cell.timeLabel}</span> : null}
        </div>
      ) : (
        <div className="flex min-h-[52px] flex-col items-center justify-between gap-1">
          <div className="flex w-full flex-col gap-0.5">
            {cell.entries.length > 0 ? (
              cell.entries.map((entry, i) => (
                <div key={`${entry.title}-${i}`} className="space-y-0.5">
                  {entry.title ? (
                    <p className="text-[10px] font-bold uppercase leading-tight">{entry.title}</p>
                  ) : null}
                  {entry.faculty ? (
                    <p className="text-[9px] font-medium uppercase text-slate-700">{entry.faculty}</p>
                  ) : null}
                  {entry.room ? (
                    <p className="text-[9px] font-medium uppercase text-slate-700">{entry.room}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-[10px] font-bold uppercase">{periodLabel(rowIndex)}</p>
            )}
          </div>
          {cell.timeLabel ? (
            <p className="mt-auto text-[10px] font-bold uppercase">{cell.timeLabel}</p>
          ) : null}
        </div>
      )}
    </td>
  )
}

export function AllocatedTimetableMatrix({
  grid,
  headerBg = TIMETABLE_MODAL_HEADER_BG,
}: {
  grid: StudentTimetableGrid
  headerBg?: string
}) {
  const dayLabels = grid.dayLabels.map((d) => d.charAt(0) + d.slice(1).toLowerCase())

  return (
    <table className="w-full min-w-[720px] border-collapse border border-[#c3d9ff] text-[12px]">
      <thead>
        <tr>
          {dayLabels.map((day) => (
            <th
              key={day}
              className="border border-[#c3d9ff] px-[5px] py-[5px] text-center text-[12px] font-medium capitalize text-black"
              style={{ backgroundColor: headerBg }}
            >

              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row: TimetableGridRow, rowIndex) => (
          <tr key={row.slotKey}>
            {row.cells.map((cell, colIndex) => (
              <MatrixCell
                key={`${row.slotKey}-${colIndex}`}
                cell={cell}
                rowIndex={rowIndex}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
