'use client'

import { Input } from '@/components/ui/input'

export type RoomAllotmentRow = Record<string, unknown> & {
	checked?: boolean
	disabled?: boolean
	priority?: number
	total_rows?: number
	total_columns?: number
	room_strength?: number
}

type RoomAllotmentTableProps = {
	rows: RoomAllotmentRow[]
	selectAll: boolean
	globalRows: number
	globalCols: number
	onCheckAll: (checked: boolean) => void
	onRowCheck: (index: number, checked: boolean) => void
	onRowPriority: (index: number, value: number) => void
	onRowCol: (index: number, field: 'rows' | 'cols', value: number) => void
	onGlobalRowsCols: (rows: number, cols: number) => void
}

export function RoomAllotmentTable({
	rows,
	selectAll,
	globalRows,
	globalCols,
	onCheckAll,
	onRowCheck,
	onRowPriority,
	onRowCol,
	onGlobalRowsCols,
}: RoomAllotmentTableProps) {
	if (rows.length === 0) return null

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<h3 className="text-[14px] font-semibold text-blue-700 mb-2">Room Allotment</h3>
			<div className="overflow-x-auto">
				<table className="w-full max-w-3xl text-[12px] border-collapse">
					<thead>
						<tr className="border-b">
							<th className="px-2 py-1 text-left w-8" />
							<th className="px-2 py-1 text-left">Select All</th>
							<th className="px-2 py-1 text-left">Priority</th>
							<th className="px-2 py-1 text-center">Rows</th>
							<th className="px-2 py-1 text-center">Columns</th>
							<th className="px-2 py-1 text-center">Total</th>
						</tr>
						<tr className="border-b">
							<td className="px-2 py-1">
								<input type="checkbox" checked={selectAll} onChange={(e) => onCheckAll(e.target.checked)} />
							</td>
							<td className="px-2 py-1" colSpan={2} />
							<td className="px-2 py-1 text-center">
								<Input
									type="number"
									min={0}
									className="h-7 w-16 text-[12px] mx-auto"
									value={globalRows || 0}
									onChange={(e) => onGlobalRowsCols(Number(e.target.value) || 0, globalCols)}
								/>
							</td>
							<td className="px-2 py-1 text-center">
								<Input
									type="number"
									min={0}
									className="h-7 w-16 text-[12px] mx-auto"
									value={globalCols || 0}
									onChange={(e) => onGlobalRowsCols(globalRows, Number(e.target.value) || 0)}
								/>
							</td>
							<td className="px-2 py-1 text-center">{globalRows * globalCols}</td>
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<tr key={String(r.pk_room_id ?? i)} className="border-b">
								<td className="px-2 py-1">
									<input
										type="checkbox"
										checked={Boolean(r.checked)}
										disabled={Boolean(r.disabled)}
										onChange={(e) => onRowCheck(i, e.target.checked)}
									/>
								</td>
								<td className="px-2 py-1">{String(r.room ?? r.room_name ?? r.roomCode ?? '—')}</td>
								<td className="px-2 py-1">
									<Input
										type="number"
										min={0}
										className="h-7 w-16 text-[12px]"
										value={r.priority ?? 0}
										disabled={Boolean(r.disabled)}
										onChange={(e) => onRowPriority(i, Number(e.target.value) || 0)}
									/>
								</td>
								<td className="px-2 py-1 text-center">
									<Input
										type="number"
										min={0}
										className="h-7 w-16 text-[12px] mx-auto"
										value={r.total_rows ?? 0}
										disabled={Boolean(r.disabled)}
										onChange={(e) => onRowCol(i, 'rows', Number(e.target.value) || 0)}
									/>
								</td>
								<td className="px-2 py-1 text-center">
									<Input
										type="number"
										min={0}
										className="h-7 w-16 text-[12px] mx-auto"
										value={r.total_columns ?? 0}
										disabled={Boolean(r.disabled)}
										onChange={(e) => onRowCol(i, 'cols', Number(e.target.value) || 0)}
									/>
								</td>
								<td className="px-2 py-1 text-center">{(r.total_rows ?? 0) * (r.total_columns ?? 0)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
