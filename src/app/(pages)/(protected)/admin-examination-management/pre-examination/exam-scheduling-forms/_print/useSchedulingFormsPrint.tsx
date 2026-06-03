'use client'

/**
 * Exam Scheduling Forms — print system.
 *
 * Mirrors the Exam Seating Plan Setup page's prints exactly: same `usePrintMode`
 * conditional-render approach, same SP data sources (roomwise_allotment_summary,
 * roomwise_subject_summary, groupwise_allotment_summary, roomwise_OMR_students,
 * ExamInvigilationAllotment), and the same print layouts.
 *
 * Returns the pieces the page renders:
 *  - printMode      : non-null while a print layout is active (page returns printView then)
 *  - loadingOverlay : "Preparing print…" overlay shown while SP data is fetched
 *  - printButtons   : the "Print & exports" button bar
 *  - printView      : the full-page print layout (or null)
 */

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { usePrintMode } from '@/lib/print'
import {
  getGroupwiseAllotmentSummary,
  getRoomwiseAllotmentSummary,
  getRoomwiseSubjectSummary,
  listExamInvigilationAllotmentsByTimetable,
  listRoomwiseOmrStudents,
} from '@/services/seating-plan'

export type PrintAllocationRow = {
  examDate: string
  session: string
  roomCode: string
  bookedSeats: number
  blockedSeats: number
  availableSeats: number
}

type PrintMode =
  | 'room-wise-seating'
  | 'room-subject-counts'
  | 'group-wise-seating'
  | 'attendance'
  | 'student'
  | 'groupwise-stickers'
  | 'invigilator'
  | 'cover-slip'
  | 'packing-slip'

export interface SchedulingPrintContext {
  courseId: number | null
  examId: number | null
  examTimetableId: number | null
  /** SP date param (YYYY-MM-DD) for the summary procs. */
  examDate: string
  /** SP session id param for the summary procs. */
  sessionId: number
  examName: string
  headerSubtitle: string
  allocationRows: PrintAllocationRow[]
}

const TD = { border: '1px solid #000', padding: '4px 6px' } as const
const TH = { border: '1px solid #000', padding: '4px 6px', textAlign: 'left' as const }

export function useSchedulingFormsPrint(ctx: SchedulingPrintContext): {
  printMode: PrintMode | null
  loadingOverlay: ReactNode
  printButtons: ReactNode
  printView: ReactNode
} {
  const { mode: printMode, triggerPrint } = usePrintMode<PrintMode>()
  const [roomWiseAllocations, setRoomWiseAllocations] = useState<any[]>([])
  const [roomSubjectAllocations, setRoomSubjectAllocations] = useState<any[]>([])
  const [groupwiseAllocations, setGroupwiseAllocations] = useState<any[]>([])
  const [invigilatorRows, setInvigilatorRows] = useState<any[]>([])
  const [studentAllotmentDetails, setStudentAllotmentDetails] = useState<any[]>([])
  const [loadingPrintData, setLoadingPrintData] = useState(false)

  const { examName, headerSubtitle, allocationRows: filteredRows } = ctx
  const firstRow = filteredRows[0]
  const firstDate = firstRow?.examDate ?? ''
  const firstSession = firstRow?.session ?? ''
  const totalStudents = filteredRows.reduce((sum, r) => sum + (r.bookedSeats || 0), 0)

  const loadingOverlay = loadingPrintData ? (
    <div data-print-hide className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="rounded-lg bg-white px-6 py-4 shadow-lg flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-slate-900">Preparing print…</span>
          <span className="text-[11px] text-slate-500">Fetching data from server (can take 10-15s)</span>
        </div>
      </div>
    </div>
  ) : null

  const printButtons = (
    <div className="rounded-lg border border-border/90 bg-muted/40 p-3 print-hide">
      <p className="mb-2 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Print & exports</p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['Room Wise Seating Print', 'room-wise-seating'],
            ['Room Subject Counts Print', 'room-subject-counts'],
            ['Group Wise Seating Print', 'group-wise-seating'],
            ['Print Attendance Sheet', 'attendance'],
            ['Print Stickers', 'student'],
            ['Group-Wise Stickers', 'groupwise-stickers'],
            ['Print Invigilator', 'invigilator'],
            ['Cover Slip', 'cover-slip'],
            ['Packing Slip', 'packing-slip'],
          ] as const
        ).map(([label, mode]) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md border-border bg-card px-2.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-input hover:bg-card hover:text-slate-900"
            onClick={async () => {
              if (ctx.courseId && ctx.examId) {
                const params = { courseId: ctx.courseId, examId: ctx.examId, examDate: ctx.examDate, sessionId: ctx.sessionId }
                if (mode === 'room-wise-seating') {
                  setLoadingPrintData(true)
                  setRoomWiseAllocations(await getRoomwiseAllotmentSummary(params).catch(() => [] as any[]))
                  setLoadingPrintData(false)
                } else if (mode === 'room-subject-counts') {
                  setLoadingPrintData(true)
                  setRoomSubjectAllocations(await getRoomwiseSubjectSummary(params).catch(() => [] as any[]))
                  setLoadingPrintData(false)
                } else if (mode === 'group-wise-seating') {
                  setLoadingPrintData(true)
                  setGroupwiseAllocations(await getGroupwiseAllotmentSummary(params).catch(() => [] as any[]))
                  setLoadingPrintData(false)
                } else if (mode === 'invigilator' && ctx.examTimetableId) {
                  setLoadingPrintData(true)
                  setInvigilatorRows(await listExamInvigilationAllotmentsByTimetable(ctx.examTimetableId).catch(() => [] as any[]))
                  setLoadingPrintData(false)
                } else if (mode === 'student' || mode === 'groupwise-stickers' || mode === 'attendance') {
                  setLoadingPrintData(true)
                  setStudentAllotmentDetails(
                    await listRoomwiseOmrStudents({
                      examId: ctx.examId,
                      courseId: ctx.courseId,
                      examDate: ctx.examDate,
                      sessionId: ctx.sessionId,
                    }).catch(() => [] as any[]),
                  )
                  setLoadingPrintData(false)
                }
              }
              triggerPrint(mode)
            }}
          >
            <Printer className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )

  function PrintShell({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
        <div className="text-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/college-banner.png"
            alt=""
            style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <p style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px', margin: 0, textTransform: 'uppercase' }}>{title}</p>
          <p style={{ fontSize: '14px', margin: '6px 0 0 0' }}>{examName}</p>
          {headerSubtitle && <p style={{ fontSize: '12px', margin: '2px 0 0 0' }}>{headerSubtitle}</p>}
        </div>
        <div className="flex justify-between text-[12px] mb-3 px-1">
          <span>
            Date : <b>{firstDate || '—'}</b>
          </span>
          <span>
            Session : <b>{firstSession || '—'}</b>
          </span>
        </div>
        {children}
        <div className="flex justify-between mt-10 text-[12px] px-1">
          <div>
            Total No. of Students : <b>{totalStudents}</b>
          </div>
          <div>Controller of Examinations</div>
        </div>
      </div>
    )
  }

  let printView: ReactNode = null

  if (printMode === 'room-wise-seating') {
    const grouped = roomWiseAllocations.reduce<Record<string, any[]>>((acc, curr) => {
      const key = String(curr?.room_name ?? '—')
      ;(acc[key] ||= []).push(curr)
      return acc
    }, {})
    const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
    printView = (
      <PrintShell title="Seating Arrangement">
        {groups.length === 0 ? (
          <p className="text-[11px] text-center py-6">No room-wise allotment data for this exam date / session.</p>
        ) : (
          groups.map(({ room_name, records }, gi) => (
            <table key={`rws-${room_name}-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
              <thead>
                <tr>
                  <th style={TH}>S.No.</th>
                  <th style={TH}>Room Number</th>
                  <th style={TH}>H.T. Numbers</th>
                  <th style={TH}>Branch</th>
                  <th style={TH}>No. of Students</th>
                </tr>
              </thead>
              <tbody>
                {records.map((alloc: any, i: number) => (
                  <tr key={`rws-row-${room_name}-${i}`}>
                    <td style={TD}>{i + 1}</td>
                    <td style={TD}>{alloc.room_name ?? '—'}</td>
                    <td style={TD}>
                      {alloc['min(tssd.hallticket_number)'] ?? '—'} to {alloc['max(tssd.hallticket_number)'] ?? '—'}
                    </td>
                    <td style={TD}>{alloc.group_code ?? '—'}</td>
                    <td style={TD}>{alloc.cnt ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
      </PrintShell>
    )
  } else if (printMode === 'room-subject-counts') {
    const grouped = roomSubjectAllocations.reduce<Record<string, any[]>>((acc, curr) => {
      const key = String(curr?.room_name ?? '—')
      ;(acc[key] ||= []).push(curr)
      return acc
    }, {})
    const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
    printView = (
      <PrintShell title="Seating Arrangement — Subject Counts">
        {groups.length === 0 ? (
          <p className="text-[11px] text-center py-6">No room-subject allotment data for this exam date / session.</p>
        ) : (
          groups.map(({ room_name, records }, gi) => (
            <table key={`rsc-${room_name}-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
              <thead>
                <tr>
                  <th style={TH}>S.No.</th>
                  <th style={TH}>Room Number</th>
                  <th style={TH}>Subject</th>
                  <th style={TH}>No. of Question Papers</th>
                </tr>
              </thead>
              <tbody>
                {records.map((alloc: any, i: number) => (
                  <tr key={`rsc-row-${room_name}-${i}`}>
                    <td style={TD}>{i + 1}</td>
                    <td style={TD}>{alloc.room_name ?? '—'}</td>
                    <td style={TD}>
                      {alloc.subject_name ?? '—'}({alloc.subject_code ?? '—'})
                    </td>
                    <td style={TD}>{alloc.cnt ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
        )}
      </PrintShell>
    )
  } else if (printMode === 'group-wise-seating') {
    const bySubject = new Map<string, any[]>()
    for (const r of groupwiseAllocations) {
      const key = String(r?.subject_name ?? '—')
      if (!bySubject.has(key)) bySubject.set(key, [])
      bySubject.get(key)!.push(r)
    }
    let sno = 1
    const groupedSubjects = Array.from(bySubject.entries()).map(([subject_name, rows]) => {
      const byBranch = new Map<string, any[]>()
      for (const r of rows) {
        const key = String(r?.group_code ?? '—')
        if (!byBranch.has(key)) byBranch.set(key, [])
        byBranch.get(key)!.push(r)
      }
      const branches = Array.from(byBranch.entries()).map(([branch, allocations]) => ({ sno: sno++, branch, allocations }))
      return { subject_name, branches }
    })
    printView = (
      <PrintShell title="Seating Arrangement — Group Wise">
        {groupedSubjects.length === 0 ? (
          <p className="text-[11px] text-center py-6">No group-wise allotment data for this exam date / session.</p>
        ) : (
          groupedSubjects.map((subject) => (
            <div key={`gws-${subject.subject_name}`} style={{ marginBottom: '24px' }}>
              <h3 style={{ marginTop: '24px', fontSize: '14px' }}>Subject: {subject.subject_name}</h3>
              <table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
                <thead>
                  <tr>
                    <th style={TH}>S.No.</th>
                    <th style={TH}>Branch</th>
                    <th style={TH}>H.T. Numbers</th>
                    <th style={TH}>Room Number</th>
                    <th style={TH}>No. of Students</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.branches.flatMap((group) =>
                    group.allocations.map((alloc: any, i: number) => (
                      <tr key={`gws-${subject.subject_name}-${group.branch}-${i}`}>
                        {i === 0 && (
                          <td style={TD} rowSpan={group.allocations.length}>
                            {group.sno}
                          </td>
                        )}
                        {i === 0 && (
                          <td style={TD} rowSpan={group.allocations.length}>
                            {group.branch}
                          </td>
                        )}
                        <td style={TD}>
                          <strong>
                            {alloc['min(tssd.hallticket_number)'] ?? '—'} to {alloc['max(tssd.hallticket_number)'] ?? '—'}
                          </strong>
                        </td>
                        <td style={TD}>{alloc.room_name ?? '—'}</td>
                        <td style={TD}>{alloc.cnt ?? 0}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          ))
        )}
      </PrintShell>
    )
  } else if (printMode === 'attendance') {
    const byKey = new Map<string, any[]>()
    for (const s of studentAllotmentDetails) {
      const key = [s.fk_course_group_id, s.fk_subject_id, s.room_id, s.fk_examtype_catdet_id].join('|')
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key)!.push(s)
    }
    const attGroups = Array.from(byKey.values()).map((students) =>
      students.slice().sort((a: any, b: any) =>
        String(a.hallticket_number).localeCompare(String(b.hallticket_number), undefined, { numeric: true }),
      ),
    )
    printView =
      attGroups.length === 0 ? (
        <PrintShell title="Attendance Sheet">
          <p className="text-[11px] text-center py-6">No allotted students for this exam date / session.</p>
        </PrintShell>
      ) : (
        <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
          {attGroups.map((students, gi) => {
            const s = students[0] as any
            return (
              <div key={`att-${gi}`} className={gi > 0 ? 'page-break' : ''}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/college-banner.png"
                  alt=""
                  style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
                <h4 style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Attendance Sheet</h4>
                <h4 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '14px' }}>
                  {s?.exam_label_name ?? examName} {s?.exam_type_name ? `(${s.exam_type_name})` : ''}
                </h4>
                <div className="flex justify-between text-[12px] mb-1 px-1">
                  <div>
                    <b>Branch :</b> {s?.group_code ?? '—'}
                  </div>
                  <div>
                    <b>Date :</b> {s?.exam_date ?? '—'}
                  </div>
                  <div>
                    <b>Room :</b> {s?.room_name ?? '—'}
                  </div>
                </div>
                <div className="flex justify-between text-[12px] mb-3 px-1">
                  <div style={{ flex: 2 }}>
                    <b>Subject:</b> {s?.subject_name ?? '—'}
                  </div>
                  <div>
                    <b>Session:</b> {s?.sessin_time ?? s?.session_name ?? '—'}
                  </div>
                </div>
                <table className="w-full border-collapse text-[11px] mb-3" style={{ border: '1px solid #000' }}>
                  <thead>
                    <tr>
                      <th style={TH}>S.NO</th>
                      <th style={TH}>H.T. NO.</th>
                      <th style={TH}>Student Name</th>
                      <th style={TH}>Signature of the Student</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((stu: any, i: number) => (
                      <tr key={`att-${gi}-${i}`}>
                        <td style={TD}>{i + 1}</td>
                        <td style={TD}>{stu.hallticket_number ?? '—'}</td>
                        <td style={TD}>{stu.student_name ?? '—'}</td>
                        <td style={TD}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className="w-full border-collapse text-[11px] mb-3" style={{ border: '1px solid #000' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Total No.of Students Registered</th>
                      <th style={TH}>Total No.of Students Absent</th>
                      <th style={TH}>Total No.of Students Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={TD}>{students.length}</td>
                      <td style={TD}>&nbsp;</td>
                      <td style={TD}>&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-between text-[12px] mt-8 px-1">
                  <div>Signature of the Invigilator - I</div>
                  <div>Signature of the Invigilator - II</div>
                  <div>Controller of Examinations</div>
                </div>
              </div>
            )
          })}
        </div>
      )
  } else if (printMode === 'student' || printMode === 'groupwise-stickers') {
    const isGroupwise = printMode === 'groupwise-stickers'
    const byRoom = new Map<string, any[]>()
    for (const s of studentAllotmentDetails) {
      const key = String(s.room_id ?? s.room_name ?? '—')
      if (!byRoom.has(key)) byRoom.set(key, [])
      byRoom.get(key)!.push(s)
    }
    const rooms = Array.from(byRoom.values())

    function StickerCell({ data }: { data: any }) {
      return (
        <div style={{ width: '25%', boxSizing: 'border-box', padding: '27px 0 9px 0', textAlign: 'center', float: 'left', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-3px', fontSize: '12px' }}>
            <span>{data.hallticket_number ?? ''}</span>
            {data.omr_serial_no ? (
              <>
                &nbsp;&nbsp;<span>{data.omr_serial_no}</span>
              </>
            ) : null}
          </div>
          {data.omr_barcode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpg;base64,${data.omr_barcode}`} style={{ height: '30px', width: '180px' }} alt="" />
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'center', fontSize: '7px', marginTop: '1px' }}>
            {data.exam_date ?? ''} &nbsp;&nbsp; {data.subject_code ?? ''}
          </div>
        </div>
      )
    }
    function StickerHeader({ row, extraGroup }: { row: any; extraGroup?: string | null }) {
      return (
        <div style={{ border: '1px solid #000', padding: '25px 0 9px 0', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{row?.exam_name ?? examName}</div>
          <div>|{row?.university_code ?? '—'}|</div>
          <div>
            <span>{row?.exam_date ?? ''}</span> &nbsp;
            <span>{row?.exam_session_name ?? row?.session_name ?? ''}</span>
          </div>
          <div>
            <span>Room: {row?.room_name ?? '—'}</span>
            {extraGroup ? (
              <>
                {' '}
                | <span>Group: {extraGroup}</span>
              </>
            ) : null}
          </div>
        </div>
      )
    }
    printView =
      rooms.length === 0 ? (
        <PrintShell title={isGroupwise ? 'Group-Wise Seating Stickers' : 'Seating Stickers'}>
          <p className="text-[11px] text-center py-6">No allotted students for this exam date / session.</p>
        </PrintShell>
      ) : (
        <div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
          {rooms.map((roomStudents, ri) => {
            if (isGroupwise) {
              const byGroup = new Map<string, any[]>()
              for (const s of roomStudents) {
                const key = String(s.fk_course_group_id ?? s.group_code ?? '—')
                if (!byGroup.has(key)) byGroup.set(key, [])
                byGroup.get(key)!.push(s)
              }
              return Array.from(byGroup.entries()).map(([groupKey, students], gi) => {
                const head = students[0]
                return (
                  <div key={`gst-${ri}-${gi}`} className={ri + gi > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
                    <StickerHeader row={head} extraGroup={head?.group_code ?? groupKey} />
                    <div style={{ overflow: 'auto', margin: '0 4px' }}>
                      {students.map((stu: any, ci: number) => (
                        <StickerCell key={`gst-${ri}-${gi}-${ci}`} data={stu} />
                      ))}
                    </div>
                  </div>
                )
              })
            }
            const head = roomStudents[0]
            return (
              <div key={`stk-${ri}`} className={ri > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
                <StickerHeader row={head} />
                <div style={{ overflow: 'auto', margin: '0 4px' }}>
                  {roomStudents.map((stu: any, ci: number) => (
                    <StickerCell key={`stk-${ri}-${ci}`} data={stu} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )
  } else if (printMode === 'invigilator') {
    printView = (
      <PrintShell title="Invigilators">
        {invigilatorRows.length === 0 ? (
          <p className="text-[11px] text-center py-6">No invigilator allotments for this exam timetable.</p>
        ) : (
          <table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
            <thead>
              <tr>
                <th style={TH}>S.NO</th>
                <th style={TH}>Room</th>
                <th style={TH}>Invigilator</th>
                <th style={TH}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {invigilatorRows.map((row: any, i: number) => (
                <tr key={`inv-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{row.roomName ?? row.room_name ?? row.examRoomCode ?? '—'}</td>
                  <td style={TD}>{row.invigilatorEmpName ?? row.invigilator_emp_name ?? row.employeeName ?? '—'}</td>
                  <td style={TD}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintShell>
    )
  } else if (printMode === 'cover-slip' || printMode === 'packing-slip') {
    const title = printMode === 'cover-slip' ? 'Cover Slip' : 'Packing Slip'
    printView = (
      <PrintShell title={title}>
        {filteredRows.map((r, ri) => (
          <div key={`cs-${ri}`} className={ri > 0 ? 'page-break pt-3' : 'pt-1'}>
            <div className="border-2 border-slate-700 p-4">
              <div className="text-center text-[14px] font-bold mb-1">{title}</div>
              <div className="text-center text-[11px] mb-3">{headerSubtitle || examName}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <b>Room:</b> {r.roomCode}
                </div>
                <div>
                  <b>Exam Date:</b> {r.examDate}
                </div>
                <div>
                  <b>Session:</b> {r.session}
                </div>
                <div>
                  <b>Total Students:</b> {r.bookedSeats}
                </div>
                <div>
                  <b>Blocked Seats:</b> {r.blockedSeats}
                </div>
                <div>
                  <b>Available:</b> {r.availableSeats}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-[10px]">
                <div>Invigilator Signature: ____________________</div>
                <div>Chief Superintendent: ____________________</div>
              </div>
            </div>
          </div>
        ))}
      </PrintShell>
    )
  }

  return { printMode, loadingOverlay, printButtons, printView }
}
