'use client'

/**
 * Angular `survey-form` — New / Edit Survey Form.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GM_CODES } from '@/config/constants/ui'
import { toDateOnlyISO } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn, rowIndexGetter } from '@/lib/utils'
import {
  getSurveyFormDetails,
  listActiveCollegesForGeneralSettings,
  listFbQuestionsByCollege,
  listGeneralDetailsByMaster,
  saveSurveyForm,
} from '@/services'
import type { FbQuestion } from '@/types/feedback-question'
import type { SurveyFormDetailDto, SurveyFormRow } from '@/types/survey-form'

const LIST_PATH = '/feedback/survey-form-list'
const ALPHANUMERIC = /^[a-zA-Z0-9 ]*$/

type QuestionRow = FbQuestion & {
  checked?: boolean
  isPresent?: boolean
  questionSortOrder?: number | string
  surveyDetailsId?: number
}

function SelectAllHeader(
  props: IHeaderParams<QuestionRow> & {
    allSelected: boolean
    onToggleAll: () => void
  },
) {
  return (
    <label className="flex h-full w-full cursor-pointer items-center gap-1.5 px-1 text-[12px] font-medium leading-none">
      <Checkbox
        checked={props.allSelected}
        onCheckedChange={() => props.onToggleAll()}
      />
      <span>All</span>
    </label>
  )
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default function SurveyFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const surveyFormIdParam = searchParams.get('surveyFormId')
  const surveyFormId = surveyFormIdParam ? Number(surveyFormIdParam) : 0
  const isEdit = surveyFormId > 0

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [surveyName, setSurveyName] = useState('')
  const [headerinfo, setHeaderinfo] = useState('')
  const [headerinfo1, setHeaderinfo1] = useState('')
  const [footerinfo, setFooterinfo] = useState('')
  const [footerinfo1, setFooterinfo1] = useState('')
  const [instructions, setInstructions] = useState('')
  const [fbfromId, setFbfromId] = useState<string | null>(null)
  const [fbforId, setFbforId] = useState<string | null>(null)
  const [surveyStartDate, setSurveyStartDate] = useState<Date | undefined>(
    new Date(),
  )
  const [surveyEndDate, setSurveyEndDate] = useState<Date | undefined>(
    new Date(),
  )
  const [isActive, setIsActive] = useState(true)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [existing, setExisting] = useState<SurveyFormRow | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [hydrated, setHydrated] = useState(false)

  const { data: colleges = [] } = useQuery({
    queryKey: [...QK.surveyForms.all, 'colleges'],
    queryFn: listActiveCollegesForGeneralSettings,
  })

  const { data: fbUsers = [] } = useQuery({
    queryKey: [...QK.surveyForms.all, 'fbUsers'],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.FB_USERS),
  })

  const { data: editData } = useQuery({
    queryKey: QK.surveyForms.detail(surveyFormId),
    queryFn: () => getSurveyFormDetails(surveyFormId),
    enabled: isEdit,
  })

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  )

  const fbUserOptions = useMemo(
    () =>
      fbUsers.map((u) => ({
        value: String(u.generalDetailId),
        label: String(
          u.generalDetailDisplayName ?? u.generalDetailCode ?? u.generalDetailId,
        ),
      })),
    [fbUsers],
  )

  const selectedQuestions = useMemo(
    () => questions.filter((q) => q.isPresent || q.checked),
    [questions],
  )

  const loadQuestionsForCollege = useCallback(
    async (clgId: number, formDetails?: SurveyFormRow | null) => {
      const list = await listFbQuestionsByCollege(clgId)
      const details = formDetails?.surveyDetailDTOs ?? []
      const mapped: QuestionRow[] = list.map((q) => {
        const match = details.find(
          (d) =>
            Number(d.feedbackQuestionDTO?.fbQuestionId ?? d.fbQuestionId) ===
            Number(q.fbQuestionId),
        )
        if (match) {
          return {
            ...q,
            checked: true,
            isPresent: true,
            questionSortOrder: match.questionSortOrder ?? '',
            surveyDetailsId: match.surveyDetailsId,
          }
        }
        return { ...q, checked: false, isPresent: false, questionSortOrder: '' }
      })
      setQuestions(mapped)
      setSelectAll(mapped.length > 0 && mapped.every((q) => q.checked))
    },
    [],
  )

  useEffect(() => {
    if (!isEdit) {
      setHydrated(true)
      return
    }
    if (!editData || hydrated) return
    const row = editData as SurveyFormRow
    setExisting(row)
    setCollegeId(row.collegeId ? String(row.collegeId) : null)
    setSurveyName(String(row.surveyName ?? ''))
    setHeaderinfo(String(row.headerinfo ?? ''))
    setHeaderinfo1(String(row.headerinfo1 ?? ''))
    setFooterinfo(String(row.footerinfo ?? ''))
    setFooterinfo1(String(row.footerinfo1 ?? ''))
    setInstructions(String(row.instructions ?? ''))
    setFbfromId(row.fbfromId ? String(row.fbfromId) : null)
    setFbforId(row.fbforId ? String(row.fbforId) : null)
    setSurveyStartDate(parseDate(row.surveyStartDate) ?? new Date())
    setSurveyEndDate(parseDate(row.surveyEndDate) ?? new Date())
    setIsActive(row.isActive ?? true)
    if (row.collegeId) {
      void loadQuestionsForCollege(Number(row.collegeId), row)
    }
    setHydrated(true)
  }, [editData, hydrated, isEdit, loadQuestionsForCollege])

  const onSelectCollege = useCallback(
    (v: string | null) => {
      setCollegeId(v)
      setFieldErrors((e) => {
        const next = { ...e }
        delete next.collegeId
        return next
      })
      setQuestions([])
      setSelectAll(false)
      if (v) {
        void loadQuestionsForCollege(
          Number(v),
          isEdit && existing?.collegeId === Number(v) ? existing : null,
        )
      }
    },
    [existing, isEdit, loadQuestionsForCollege],
  )

  const toggleAll = useCallback(() => {
    setSelectAll((prev) => {
      const next = !prev
      setQuestions((rows) =>
        rows.map((q) => ({
          ...q,
          checked: next,
          isPresent: next,
        })),
      )
      return next
    })
  }, [])

  const toggleOne = useCallback((fbQuestionId: number, checked: boolean) => {
    setQuestions((prev) => {
      const next = prev.map((q) =>
        Number(q.fbQuestionId) === fbQuestionId
          ? { ...q, checked, isPresent: checked, isActive: true }
          : q,
      )
      setSelectAll(next.length > 0 && next.every((q) => q.checked))
      return next
    })
  }, [])

  const setSortOrder = useCallback((fbQuestionId: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        Number(q.fbQuestionId) === fbQuestionId
          ? { ...q, questionSortOrder: value }
          : q,
      ),
    )
  }, [])

  const questionColumnDefs = useMemo<ColDef<QuestionRow>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        field: 'fbQuestion',
        headerName: 'Question',
        minWidth: 280,
        flex: 1.6,
      },
      {
        field: 'optiongroupCode',
        headerName: 'Option Group',
        minWidth: 130,
        flex: 0.8,
      },
      {
        headerName: 'All',
        colId: 'select',
        width: 100,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: SelectAllHeader,
        headerComponentParams: {
          allSelected: selectAll,
          onToggleAll: toggleAll,
        },
        cellRenderer: (p: ICellRendererParams<QuestionRow>) => {
          const row = p.data
          if (!row) return null
          return (
            <div className="flex h-full items-center px-1">
              <Checkbox
                checked={Boolean(row.checked)}
                onCheckedChange={(v) =>
                  toggleOne(row.fbQuestionId, v === true)
                }
              />
            </div>
          )
        },
      },
    ],
    [selectAll, toggleAll, toggleOne],
  )

  const validateDates = (start?: Date, end?: Date) => {
    if (start && end && start.getTime() > end.getTime()) {
      toastError('From date should be less then To date.')
      setSurveyEndDate(start)
      return false
    }
    return true
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!collegeId) next.collegeId = 'College is required'
    if (!surveyName.trim()) next.surveyName = 'Survey Name is required'
    else if (!ALPHANUMERIC.test(surveyName)) {
      next.surveyName = 'Enter alphanumeric characters only'
    }
    if (!headerinfo.trim()) next.headerinfo = 'Header Info is required'
    if (!footerinfo.trim()) next.footerinfo = 'Footer Info is required'
    if (!fbfromId) next.fbfromId = 'Feedback From is required'
    if (!fbforId) next.fbforId = 'Feedback For is required'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error('VALIDATION')
      if (!validateDates(surveyStartDate, surveyEndDate)) {
        throw new Error('VALIDATION')
      }

      const selected = questions.filter((q) => q.isPresent || q.checked)
      const surveyDetailDTOs: SurveyFormDetailDto[] = selected.map((q) => {
        const row: SurveyFormDetailDto = {
          ...q,
          fbQuestionId: q.fbQuestionId,
          isActive: true,
          isPresent: true,
          questionSortOrder: q.questionSortOrder,
        }
        if (existing?.surveyDetailDTOs?.length) {
          for (const d of existing.surveyDetailDTOs) {
            const qid = Number(
              d.feedbackQuestionDTO?.fbQuestionId ?? d.fbQuestionId,
            )
            if (qid === Number(q.fbQuestionId) && d.surveyDetailsId) {
              row.surveyDetailsId = d.surveyDetailsId
            }
          }
        }
        return row
      })

      const payload: Record<string, unknown> = {
        collegeId: Number(collegeId),
        surveyName: surveyName.trim(),
        headerinfo: headerinfo.trim(),
        headerinfo1: headerinfo1.trim(),
        footerinfo: footerinfo.trim(),
        footerinfo1: footerinfo1.trim(),
        instructions,
        fbfromId: Number(fbfromId),
        fbforId: Number(fbforId),
        surveyStartDate: surveyStartDate
          ? toDateOnlyISO(surveyStartDate)
          : undefined,
        surveyEndDate: surveyEndDate
          ? toDateOnlyISO(surveyEndDate)
          : undefined,
        isActive,
        isHtml: false,
        surveyDetailDTOs,
      }
      if (isEdit && existing?.surveyFormId) {
        payload.surveyFormId = existing.surveyFormId
      }
      return saveSurveyForm(payload)
    },
    onSuccess: async () => {
      toastSuccess(
        isEdit ? 'Survey form updated.' : 'Survey form created.',
      )
      await queryClient.invalidateQueries({ queryKey: QK.surveyForms.all })
      router.push(LIST_PATH)
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'VALIDATION') return
      toastError(getErrorMessage(err))
    },
  })

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <h1 className="text-base font-semibold text-[hsl(var(--primary))]">
              {isEdit ? 'Edit Survey Form' : 'New Survey Form'}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onSelectCollege}
              options={collegeOptions}
              placeholder="Enter College"
              error={fieldErrors.collegeId}
            />
            <div className="space-y-1.5">
              <Label>
                Survey Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={surveyName}
                onChange={(e) => {
                  setSurveyName(e.target.value)
                  setFieldErrors((err) => {
                    const n = { ...err }
                    delete n.surveyName
                    return n
                  })
                }}
                placeholder="Enter Survey Name"
              />
              {fieldErrors.surveyName ? (
                <p className="text-xs text-destructive">{fieldErrors.surveyName}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>
                Header Info <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headerinfo}
                onChange={(e) => {
                  setHeaderinfo(e.target.value)
                  setFieldErrors((err) => {
                    const n = { ...err }
                    delete n.headerinfo
                    return n
                  })
                }}
                placeholder="Enter Header Info"
              />
              {fieldErrors.headerinfo ? (
                <p className="text-xs text-destructive">{fieldErrors.headerinfo}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Sub Header Info</Label>
              <Input
                value={headerinfo1}
                onChange={(e) => setHeaderinfo1(e.target.value)}
                placeholder="Enter Sub Header Info"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Footer Info <span className="text-destructive">*</span>
              </Label>
              <Input
                value={footerinfo}
                onChange={(e) => {
                  setFooterinfo(e.target.value)
                  setFieldErrors((err) => {
                    const n = { ...err }
                    delete n.footerinfo
                    return n
                  })
                }}
                placeholder="Enter Footer Info"
              />
              {fieldErrors.footerinfo ? (
                <p className="text-xs text-destructive">{fieldErrors.footerinfo}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Sub Footer Info</Label>
              <Input
                value={footerinfo1}
                onChange={(e) => setFooterinfo1(e.target.value)}
                placeholder="Enter Sub Footer Info"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter Instructions"
              rows={4}
              className="min-h-[96px] resize-y"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Feedback From"
              required
              value={fbfromId}
              onChange={(v) => {
                setFbfromId(v)
                setFieldErrors((err) => {
                  const n = { ...err }
                  delete n.fbfromId
                  return n
                })
              }}
              options={fbUserOptions}
              placeholder="Enter Feedback From"
              error={fieldErrors.fbfromId}
            />
            <Select
              label="Feedback For"
              required
              value={fbforId}
              onChange={(v) => {
                setFbforId(v)
                setFieldErrors((err) => {
                  const n = { ...err }
                  delete n.fbforId
                  return n
                })
              }}
              options={fbUserOptions}
              placeholder="Enter Feedback For"
              error={fieldErrors.fbforId}
            />
            <DatePicker
              label="Start Date"
              value={surveyStartDate ?? null}
              onChange={(d) => {
                const next = d ?? undefined
                setSurveyStartDate(next)
                validateDates(next, surveyEndDate)
              }}
              placeholder="Enter Start Date"
              displayFormat="dd/MM/yyyy"
            />
            <DatePicker
              label="End Date"
              value={surveyEndDate ?? null}
              onChange={(d) => {
                const next = d ?? undefined
                setSurveyEndDate(next)
                validateDates(surveyStartDate, next)
              }}
              placeholder="Enter End Date"
              displayFormat="dd/MM/yyyy"
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(v) => setIsActive(v === true)}
                />
                Active
              </label>
            </div>
          </div>

          {questions.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[hsl(var(--primary))]">
                Questions List
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
                <div className="min-w-0 lg:col-span-8">
                  <DataTable
                    title={undefined}
                    subtitle=""
                    bordered
                    toolbarLeading={
                      <span className="sr-only">Questions</span>
                    }
                    rowData={questions}
                    columnDefs={questionColumnDefs}
                    getRowId={(p) => String(p.data.fbQuestionId)}
                    height="420px"
                    pagination={false}
                    columnFilters={false}
                    toolbar={false}
                  />
                </div>
                <div className="min-w-0 lg:col-span-4">
                  <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
                    <h3 className="m-0 flex items-center justify-between border-b border-[#c3d9ff] bg-[#ecf3ff] px-3 py-2.5 text-[14px] font-semibold uppercase text-slate-700">
                      <span>Questions</span>
                      <span>{selectedQuestions.length}</span>
                    </h3>
                    <div className="max-h-[360px] overflow-y-auto text-xs">
                      {selectedQuestions.length === 0 ? (
                        <p className="p-3 text-muted-foreground">
                          No Questions found.
                        </p>
                      ) : (
                        selectedQuestions.map((q) => (
                          <div
                            key={q.fbQuestionId}
                            className="flex items-start justify-between gap-2 border-b border-[#dedede] px-3 py-2.5"
                          >
                            <p className="flex-1 leading-snug">{q.fbQuestion}</p>
                            <Input
                              type="number"
                              className="h-9 w-20 shrink-0 text-center"
                              placeholder="Order"
                              value={q.questionSortOrder ?? ''}
                              onChange={(e) =>
                                setSortOrder(q.fbQuestionId, e.target.value)
                              }
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(LIST_PATH)}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className={cn(saveMutation.isPending && 'opacity-70')}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
