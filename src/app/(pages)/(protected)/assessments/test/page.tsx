'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListIcon, PlusIcon, SettingsIcon, FilePenLineIcon, UploadCloudIcon, ClipboardList } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listTests, updateTest } from '@/services/admin/question-bank'
import type { Assessment } from '@/types/question-bank'
import QuestionsListDrawer from '../question-bank/QuestionsListDrawer'
import TestModal from './TestModal'
import { toast } from 'sonner'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Assessment>,
  assessment: { field: 'assessmentName', headerName: 'Assessment', minWidth: 300, flex: 1.2 } as ColDef<Assessment>,
  type: { headerName: 'Test Type', minWidth: 120, flex: 0.7 } as ColDef<Assessment>,
  created: { field: 'createdDt', headerName: 'Created On', minWidth: 120, flex: 0.7 } as ColDef<Assessment>,
  status: { field: 'isActive', headerName: 'Status', width: 90, flex: 0 } as ColDef<Assessment>,
  actions: { headerName: 'Actions', minWidth: 360, flex: 1 } as ColDef<Assessment>,
}

function typeRenderer(p: ICellRendererParams<Assessment>) {
  if (p.data?.isCertification) return <span>For Certification</span>
  if (p.data?.isForPractice) return <span>For Practice</span>
  return <span>—</span>
}

function statusRenderer(p: ICellRendererParams<Assessment>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function questionsRenderer(openDrawer: (test: Assessment) => void) {
  return (p: ICellRendererParams<Assessment>) => {
    const count = p.data?.assessmentQuestionDTOs?.length ?? 0
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        onClick={() => p.data && openDrawer(p.data)}
      >
        <ListIcon className="h-3 w-3" />
        {count} question{count !== 1 ? 's' : ''}
      </button>
    )
  }
}

function actionsRenderer(
  onSettings: (test: Assessment) => void,
  onManage: (test: Assessment) => void,
  onPublish: (test: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="outline" className="h-7 px-1.5 text-[11px]" onClick={() => p.data && onSettings(p.data)}>
        <SettingsIcon className="mr-1 h-3 w-3" />
        Settings
      </Button>
      <Button size="sm" variant="outline" className="h-7 px-1.5 text-[11px]" onClick={() => p.data && onManage(p.data)}>
        <FilePenLineIcon className="mr-1 h-3 w-3" />
        Manage
      </Button>
      <Button size="sm" variant="outline" className="h-7 px-1.5 text-[11px]" onClick={() => p.data && onPublish(p.data)}>
        <UploadCloudIcon className="mr-1 h-3 w-3" />
        Publish
      </Button>
    </div>
  )
}

export default function TestPage() {
  const router = useRouter()
  const { user } = useSession()
  const [searchValue, setSearchValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<Assessment | null>(null)
  const [drawerTest, setDrawerTest] = useState<Assessment | null>(null)

  const userId = user?.roleName === 'ADMIN' ? undefined : (user?.userId ?? undefined)
  const { data: tests, isLoading: loading, invalidate } = useCrudList({
    queryKey: [...QK.questionBanks.list(userId), 'tests'],
    queryFn: () => listTests(userId),
    enabled: user !== null,
  })

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return tests
    const q = searchValue.toLowerCase()
    return tests.filter((row) =>
      [row.assessmentName, row.assessmentDescription]
        .some((v) => String(v ?? '').toLowerCase().includes(q)),
    )
  }, [tests, searchValue])

  const handlePublish = async (test: Assessment) => {
    try {
      await updateTest(test.assessmentId, { ...test, isSystemcorrection: true } as Partial<Assessment>)
      toast.success('Test published')
      invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  const columns = useMemo<ColDef<Assessment>[]>(() => [
    COL_DEFS.siNo,
    {
      ...COL_DEFS.assessment,
      cellRenderer: (p: ICellRendererParams<Assessment>) => (
        <div className="flex items-center gap-2 text-xs">
          <span>{p.data?.assessmentName}</span>
          <span className="text-muted-foreground">|</span>
          {questionsRenderer(setDrawerTest)(p)}
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => p.data && (setEditingTest(p.data), setModalOpen(true))}
          >
            Edit
          </button>
        </div>
      ),
    },
    { ...COL_DEFS.type, cellRenderer: typeRenderer },
    { ...COL_DEFS.created, valueFormatter: (p) => formatDate(p.value) },
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    {
      ...COL_DEFS.actions,
      cellRenderer: actionsRenderer(
        (test) => router.push(`/assessments/test/test-settings?assessmentId=${test.assessmentId}&assessmentName=${encodeURIComponent(test.assessmentName)}`),
        (test) => router.push(`/assessments/test/manage-question?assessmentId=${test.assessmentId}&assessmentName=${encodeURIComponent(test.assessmentName)}`),
        handlePublish,
      ),
    },
  ], [router, setDrawerTest])

  return (
    <PageContainer className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-amber-300 px-4 py-2.5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-teal-600">
            <ClipboardList className="h-4 w-4 text-teal-600" />
            Test List
          </h2>
        </div>
        <DataTable
          rowData={filteredData}
          columnDefs={columns}
          loading={loading}
          pagination
          toolbar={{ columnPicker: true, exportPdf: true }}
          toolbarLeading={(
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search tests…"
              value={searchValue}
              onChange={setSearchValue}
            />
          )}
          toolbarTrailing={(
            <Button size="sm" onClick={() => { setEditingTest(null); setModalOpen(true) }}>
              <PlusIcon className="mr-1 h-4 w-4" />
              Create Test
            </Button>
          )}
        />
      </div>

      <TestModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTest(null) }}
        test={editingTest}
        onSaved={invalidate}
        userId={user?.userId ?? 0}
      />

      <QuestionsListDrawer
        bank={drawerTest}
        onClose={() => setDrawerTest(null)}
        onDeleted={invalidate}
        evaluatorProfileId={user?.employeeId ?? null}
        onEditQuestion={(test, aqId) => {
          router.push(`/assessments/question-bank/add-question?assessmentId=${test.assessmentId}&assessmentQuestionId=${aqId}&permission=Edit&page=/assessments/test`)
        }}
      />
    </PageContainer>
  )
}

