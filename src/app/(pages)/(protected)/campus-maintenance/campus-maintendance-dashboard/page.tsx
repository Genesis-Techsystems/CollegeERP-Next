'use client'

import { PageContainer } from '@/components/layout'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssues } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { ClipboardList, CheckCircle, Clock, XCircle } from 'lucide-react'

function StatCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string
  count: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="app-card p-5 flex items-center gap-4">
      <div className={`rounded-full p-3 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function CampusMaintenanceDashboard() {
  const { data: issues, isLoading } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  })

  const total = issues.length
  const open = issues.filter((i) => i.aprvrejstatusCatCode === 'INPROGRESS').length
  const resolved = issues.filter((i) => i.aprvrejstatusCatCode === 'DONE').length
  const closed = issues.filter((i) => i.aprvrejstatusCatCode === 'CLOSED').length

  return (
    <PageContainer className="space-y-6">
      <div className="app-card p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-1">
          Campus Maintenance
        </h2>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Log and track campus facility complaints. Assign in-charge staff, set priority levels,
          and monitor resolution progress across all departments and rooms.
        </p>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Complaints" count={total} icon={ClipboardList} color="bg-slate-500" />
          <StatCard label="In Progress" count={open} icon={Clock} color="bg-amber-500" />
          <StatCard label="Resolved" count={resolved} icon={CheckCircle} color="bg-green-500" />
          <StatCard label="Closed" count={closed} icon={XCircle} color="bg-gray-500" />
        </div>
      )}
    </PageContainer>
  )
}
