'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import {
  PlusIcon,
  BookOpen,
  PencilIcon,
  ListIcon,
  UploadIcon,
  DownloadIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { useCrudList } from '@/hooks/useCrudList'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listQuestionBanks, importQuestionsFromExcel, addOrUpdateQuestion } from '@/services/admin/question-bank'
import type { Assessment } from '@/types/question-bank'
import QuestionBankModal from './QuestionBankModal'
import QuestionsListDrawer from './QuestionsListDrawer'

// ─── Column shape ─────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const COL_DEFS = {
  siNo:        { headerName: 'SI.No',         valueGetter: rowIndexGetter,                                                         width: 70,  flex: 0 } as ColDef<Assessment>,
  name:        { field: 'assessmentName',      headerName: 'Question Bank',  flex: 1, minWidth: 140                                                     } as ColDef<Assessment>,
  description: { field: 'assessmentDescription', headerName: 'Description',  flex: 1, minWidth: 140                                                     } as ColDef<Assessment>,
  createdDt:   { field: 'createdDt',           headerName: 'Created On',     valueFormatter: (p) => formatDate(p.value), width: 130, flex: 0             } as ColDef<Assessment>,
  isActive:    { field: 'isActive',            headerName: 'Status',                                                               width: 90,  flex: 0 } as ColDef<Assessment>,
  questions:   { headerName: 'Questions',                                                                                          width: 115, flex: 0 } as ColDef<Assessment>,
  actions:     { headerName: 'Actions',                                                                                            width: 200, flex: 0 } as ColDef<Assessment>,
}

// ─── Pure renderers ───────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<Assessment>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeQuestionsRenderer(openDrawer: (bank: Assessment) => void) {
  return (p: ICellRendererParams<Assessment>) => {
    const count = p.data?.assessmentQuestionDTOs?.length ?? 0
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        onClick={() => p.data && openDrawer(p.data)}
      >
        <ListIcon className="h-3.5 w-3.5" />
        {count} question{count !== 1 ? 's' : ''}
      </button>
    )
  }
}

function makeActionsRenderer(
  setEditing: (bank: Assessment | null) => void,
  setModalOpen: (open: boolean) => void,
  onAddQuestion: (bank: Assessment) => void,
  onImport: (bank: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit question bank"
        title="Edit question bank"
        onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => p.data && onAddQuestion(p.data)}
        title="Add question manually"
      >
        <PlusIcon className="h-3.5 w-3.5 mr-1" />
        Add Q
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => p.data && onImport(p.data)}
        title="Import from Excel"
      >
        <UploadIcon className="h-3.5 w-3.5 mr-1" />
        Excel
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const router = useRouter()
  const { user } = useSession()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<Assessment | null>(null)
  const [drawerBank, setDrawerBank] = useState<Assessment | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [importingId, setImportingId] = useState<number | null>(null)

  // Hidden file input for Excel import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImportBank = useRef<Assessment | null>(null)

  // Role-based fetch: ADMIN sees all, others see own banks
  const userId = user?.roleName === 'ADMIN' ? undefined : (user?.userId ?? undefined)

  const { data: banks, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.questionBanks.list(userId),
    queryFn: () => listQuestionBanks(userId),
    enabled: user !== null,
  })

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return banks
    const lower = searchValue.toLowerCase()
    return banks.filter((row) =>
      [row.assessmentName, row.assessmentDescription]
        .some((v) => String(v ?? '').toLowerCase().includes(lower))
    )
  }, [searchValue, banks])

  const handleAddQuestion = (bank: Assessment) => {
    router.push(
      `/assessments/question-bank/add-question?assessmentId=${bank.assessmentId}&permission=Add&page=/assessments/question-bank`,
    )
  }

  const handleImportClick = (bank: Assessment) => {
    pendingImportBank.current = bank
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const bank = pendingImportBank.current
    if (!file || !bank) return

    // Reset so the same file can be re-selected if needed
    e.target.value = ''

    setImportingId(bank.assessmentId)
    try {
      const questions = await importQuestionsFromExcel(bank.assessmentId, file)
      let saved = 0
      for (const q of questions) {
        await addOrUpdateQuestion({
          ...q,
          assessmentId: bank.assessmentId,
          questionOwnerProfileId: user?.employeeId ?? null,
        })
        saved++
      }
      toast.success(`Imported ${saved} question${saved !== 1 ? 's' : ''}`)
      invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportingId(null)
      pendingImportBank.current = null
    }
  }

  const columnDefs = useMemo<ColDef<Assessment>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.description,
      COL_DEFS.createdDt,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.questions, cellRenderer: makeQuestionsRenderer(setDrawerBank) },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          setEditingBank,
          setModalOpen,
          handleAddQuestion,
          handleImportClick,
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setEditingBank, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Question Bank"
        subtitle="Manage question banks and their questions"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href="/assets/docs/QuestionSheet_bulk_upload.xlsx" download>
                <DownloadIcon className="h-4 w-4 mr-1" />
                Template
              </a>
            </Button>
            <Button size="sm" onClick={() => { setEditingBank(null); setModalOpen(true) }}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Question Bank
            </Button>
          </div>
        }
      />

      <SearchInput
        className="w-full max-w-sm"
        placeholder="Search question banks…"
        value={searchValue}
        onChange={setSearchValue}
      />

      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {!loading && banks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <BookOpen className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No question banks found</p>
          </div>
        ) : (
          <DataTable
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading || importingId !== null}
            pagination
          />
        )}
      </div>

      <QuestionBankModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBank(null) }}
        bank={editingBank}
        onSaved={invalidate}
        userId={user?.userId ?? 0}
      />

      <QuestionsListDrawer
        bank={drawerBank}
        onClose={() => setDrawerBank(null)}
        onEditQuestion={(bank, aqId) => {
          router.push(
            `/assessments/question-bank/add-question?assessmentId=${bank.assessmentId}&assessmentQuestionId=${aqId}&permission=Edit&page=/assessments/question-bank`,
          )
        }}
        onDeleted={invalidate}
        evaluatorProfileId={user?.employeeId ?? null}
      />
    </PageContainer>
  )
}
