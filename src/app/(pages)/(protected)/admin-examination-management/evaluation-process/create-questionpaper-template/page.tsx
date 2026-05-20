'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSessionContext } from '@/context/SessionContext'
import {
  addExamQpTemplateAndDetails,
  getExamQpTemplateAndDetails,
} from '@/services/evaluation-process-admin'
import { getCollegeFilters } from '@/services/evaluation'
import { num, txt } from '@/common/utils/data-helpers'

const schema = z.object({
  templateTitle: z.string().min(1, 'Template title is required').max(200, 'Max 200 characters'),
  totalmarks: z.number().int('Must be a whole number').positive('Must be greater than 0'),
  templateDescription: z.string().max(500, 'Max 500 characters').optional(),
  universityId: z.string().min(1, 'Please select a university'),
})

type FormValues = z.infer<typeof schema>
type AnyRow = Record<string, unknown>

type Question = {
  blockId: number
  parentBlockId: number
  examQpTemplateDetailId?: number
  marks: number
  displayDownText: string
}

type Group = {
  blockId: number
  parentBlockId: number
  examQpTemplateDetailId?: number
  title: string
  totalMarks: number
  minQuestions: number
  instructions: string
  displayDownText: string
  groups: Group[]
  questions: Question[]
}

type Section = {
  blockId: number
  parentBlockId: null
  examQpTemplateDetailId?: number
  title: string
  totalMarks: number
  minQuestions: number
  instructions: string
  displayDownText: string
  groups: Group[]
  questions: Question[]
}

interface UniversityRow {
  fk_university_id?: number
  university_id?: number
  university_name?: string
  university_code?: string
  org_name?: string
}

function parseUniversityOptions(resultSets: unknown[][]): SelectOption[] {
  const flat = resultSets.flat() as UniversityRow[]
  const seen = new Set<string>()
  const opts: SelectOption[] = []
  for (const row of flat) {
    const id = row.fk_university_id ?? row.university_id
    const label = row.university_name ?? row.university_code ?? row.org_name
    if (id == null || label == null) continue
    const value = String(id)
    if (seen.has(value)) continue
    seen.add(value)
    opts.push({ value, label: String(label) })
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label))
}

export default function CreateQuestionPaperTemplatePage() {
  const { user } = useSessionContext()
  const searchParams = useSearchParams()
  const editTemplateId = num(searchParams.get('examQpTemplateId'))
  const isEdit = editTemplateId > 0
  const idCounter = useRef(1)

  const [sections, setSections] = useState<Section[]>([])
  const [previewRows, setPreviewRows] = useState<AnyRow[]>([])
  const [universityOptions, setUniversityOptions] = useState<SelectOption[]>([])
  const [filterLoading, setFilterLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      templateTitle: '',
      totalmarks: undefined,
      templateDescription: '',
      universityId: '',
    },
  })

  const selectedUniversityId = watch('universityId')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setFilterLoading(true)
      try {
        const resultSets = await getCollegeFilters({
          orgId: user?.organizationId,
          employeeId: user?.employeeId,
        })
        if (cancelled) return
        const opts = parseUniversityOptions(resultSets)
        setUniversityOptions(opts)
        if (opts.length === 1) {
          setValue('universityId', opts[0].value, { shouldValidate: false })
        }
      } finally {
        if (!cancelled) setFilterLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.organizationId, user?.employeeId, setValue])

  useEffect(() => {
    async function loadTemplateForEdit() {
      if (!isEdit) return
      const list = await getExamQpTemplateAndDetails(0).catch(() => [])
      const row = list.find((r) => num(r.examQpTemplateId) === editTemplateId)
      if (!row) return

      reset({
        templateTitle: txt(row.templateTitle),
        totalmarks: num(row.totalmarks),
        templateDescription: txt(row.templateDescription),
        universityId: String(num(row.universitiesId) || ''),
      })
      const dto = Array.isArray(row.examQpTemplateDetailsDTO)
        ? (row.examQpTemplateDetailsDTO as AnyRow[])
        : []
      setSections(mapApiToUi(dto))
    }
    void loadTemplateForEdit()
  }, [editTemplateId, isEdit, reset])

  const totalQuestions = useMemo(() => {
    const countQuestions = (groups: Group[]): number =>
      groups.reduce((sum, g) => sum + g.questions.length + countQuestions(g.groups), 0)
    return sections.reduce((sum, s) => sum + s.questions.length + countQuestions(s.groups), 0)
  }, [sections])

  function nextId() {
    idCounter.current += 1
    return idCounter.current
  }

  function addSection() {
    const s: Section = {
      blockId: nextId(),
      parentBlockId: null,
      title: `Section ${sections.length + 1}`,
      totalMarks: 0,
      minQuestions: 0,
      instructions: '',
      displayDownText: '',
      groups: [],
      questions: [],
    }
    setSections((prev) => [...prev, s])
  }

  function addGroup(parentBlockId: number) {
    setSections((prev) => addGroupToSections(prev, parentBlockId, nextId()))
  }

  function addQuestion(parentBlockId: number) {
    setSections((prev) => addQuestionToSections(prev, parentBlockId, nextId()))
  }

  function removeSection(blockId: number) {
    setSections((prev) => prev.filter((s) => s.blockId !== blockId))
  }

  function removeGroup(groupId: number) {
    setSections((prev) => removeGroupFromSections(prev, groupId))
  }

  function removeQuestion(questionId: number) {
    setSections((prev) => removeQuestionFromSections(prev, questionId))
  }

  function updateSection(blockId: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s) => (s.blockId === blockId ? { ...s, ...patch } : s)))
  }

  function updateGroup(groupId: number, patch: Partial<Group>) {
    setSections((prev) => updateGroupInSections(prev, groupId, patch))
  }

  function updateQuestion(questionId: number, patch: Partial<Question>) {
    setSections((prev) => updateQuestionInSections(prev, questionId, patch))
  }

  function saveAsJson() {
    const rows = convertToPayloadRows(sections)
    if (!validateTemplate(rows)) return
    setPreviewRows(rows)
    setSubmitError(null)
  }

  async function onSubmit(data: FormValues) {
    const rows = convertToPayloadRows(sections)
    if (!validateTemplate(rows)) return
    setSuccessMessage(null)
    setSubmitError(null)
    try {
      await addExamQpTemplateAndDetails({
        universitiesId: Number(data.universityId),
        templateTitle: data.templateTitle,
        templateDescription: data.templateDescription ?? '',
        totalmarks: data.totalmarks,
        templateStatusId: 6048,
        isActive: true,
        isLocked: false,
        examQpTemplateId: isEdit ? editTemplateId : null,
        examQpTemplateDetailsDTO: rows,
      })
      setPreviewRows(rows)
      setSuccessMessage(`Template "${data.templateTitle}" saved successfully.`)
      if (!isEdit) {
        reset({
          templateTitle: '',
          totalmarks: undefined,
          templateDescription: '',
          universityId: universityOptions.length === 1 ? universityOptions[0].value : '',
        })
        setSections([])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save template. Please try again.'
      setSubmitError(msg)
    }
  }

  function validateTemplate(rows: AnyRow[]): boolean {
    const templateMarks = num(watch('totalmarks'))
    const sectionRows = rows.filter((r) => num(r.levelno) === 1)
    const sectionMarksTotal = sectionRows.reduce((s, r) => s + num(r.totalMarks), 0)
    if (templateMarks !== sectionMarksTotal) {
      setSubmitError(
        `Template total marks (${templateMarks}) must equal sum of section marks (${sectionMarksTotal}).`,
      )
      return false
    }
    setSubmitError(null)
    return true
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title={isEdit ? 'Edit Template' : 'Create Template'}
        subtitle="Configure section, group, and question marks structure"
      />

      {successMessage && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{successMessage}</div>}
      {submitError && <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm">{submitError}</div>}

      <div className="rounded-xl border bg-card p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="University"
            options={universityOptions}
            value={selectedUniversityId || null}
            onChange={(v) => setValue('universityId', v ?? '', { shouldValidate: true })}
            placeholder="Select University"
            isLoading={filterLoading}
            required
            error={errors.universityId?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="templateTitle">Template Title</Label>
              <Input id="templateTitle" {...register('templateTitle')} />
              {errors.templateTitle && <p className="text-xs text-destructive mt-1">{errors.templateTitle.message}</p>}
            </div>
            <div>
              <Label htmlFor="totalmarks">Total Marks</Label>
              <Input id="totalmarks" type="number" min={1} {...register('totalmarks', { valueAsNumber: true })} />
              {errors.totalmarks && <p className="text-xs text-destructive mt-1">{errors.totalmarks.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="templateDescription">Description</Label>
            <textarea
              id="templateDescription"
              rows={3}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              {...register('templateDescription')}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Template Details</h3>
              <Button type="button" onClick={addSection}>Add Section</Button>
            </div>

            {sections.map((section, sIdx) => (
              <SectionEditor
                key={`section-${section.blockId}`}
                section={section}
                sectionNo={sIdx + 1}
                onUpdate={updateSection}
                onDelete={removeSection}
                onAddGroup={addGroup}
                onAddQuestion={addQuestion}
                onRemoveGroup={removeGroup}
                onRemoveQuestion={removeQuestion}
                onUpdateGroup={updateGroup}
                onUpdateQuestion={updateQuestion}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={saveAsJson}>Save as JSON</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Template'}</Button>
          </div>
        </form>
      </div>

      {previewRows.length > 0 && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-semibold mb-2">
            Preview JSON rows ({previewRows.length}) - Total Questions: {totalQuestions}
          </div>
          <div className="max-h-80 overflow-auto space-y-1">
            {previewRows.map((r, i) => (
              <div key={`preview-${i}-${num(r.blockId)}`} className="grid grid-cols-12 gap-2 border-b py-1">
                <div className="col-span-1">{num(r.levelno)}</div>
                <div className="col-span-1">{num(r.levelOrderNo)}</div>
                <div className="col-span-5">{txt(r.title) || txt(r.questionNoDisplaytext)}</div>
                <div className="col-span-2">{txt(r.questionNoDisplaytext)}</div>
                <div className="col-span-3 text-right">{num(r.totalMarks)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function SectionEditor(props: {
  section: Section
  sectionNo: number
  onUpdate: (id: number, patch: Partial<Section>) => void
  onDelete: (id: number) => void
  onAddGroup: (parentId: number) => void
  onAddQuestion: (parentId: number) => void
  onRemoveGroup: (groupId: number) => void
  onRemoveQuestion: (questionId: number) => void
  onUpdateGroup: (groupId: number, patch: Partial<Group>) => void
  onUpdateQuestion: (questionId: number, patch: Partial<Question>) => void
}) {
  const {
    section,
    sectionNo,
    onUpdate,
    onDelete,
    onAddGroup,
    onAddQuestion,
    onRemoveGroup,
    onRemoveQuestion,
    onUpdateGroup,
    onUpdateQuestion,
  } = props

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">Section {sectionNo}</div>
        <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(section.blockId)}>Delete</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input value={section.title} onChange={(e) => onUpdate(section.blockId, { title: e.target.value })} placeholder="Title" />
        <Input type="number" value={section.totalMarks} onChange={(e) => onUpdate(section.blockId, { totalMarks: num(e.target.value) })} placeholder="Total marks" />
        <Input type="number" value={section.minQuestions} onChange={(e) => onUpdate(section.blockId, { minQuestions: num(e.target.value) })} placeholder="Min questions" />
        <Input value={section.instructions} onChange={(e) => onUpdate(section.blockId, { instructions: e.target.value })} placeholder="Instructions" />
        <Input value={section.displayDownText} onChange={(e) => onUpdate(section.blockId, { displayDownText: e.target.value })} placeholder="Display down text" />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onAddGroup(section.blockId)}>Add Group</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onAddQuestion(section.blockId)}>Add Question</Button>
      </div>

      {section.groups.map((group, idx) => (
        <GroupEditor
          key={`group-${group.blockId}`}
          group={group}
          depth={1}
          label={`${sectionNo}.${idx + 1}`}
          onAddGroup={onAddGroup}
          onAddQuestion={onAddQuestion}
          onRemoveGroup={onRemoveGroup}
          onRemoveQuestion={onRemoveQuestion}
          onUpdateGroup={onUpdateGroup}
          onUpdateQuestion={onUpdateQuestion}
        />
      ))}

      {section.questions.map((q, idx) => (
        <QuestionEditor
          key={`q-${q.blockId}`}
          question={q}
          label={`${sectionNo}.Q${idx + 1}`}
          onRemoveQuestion={onRemoveQuestion}
          onUpdateQuestion={onUpdateQuestion}
        />
      ))}
    </div>
  )
}

function GroupEditor(props: {
  group: Group
  depth: number
  label: string
  onAddGroup: (parentId: number) => void
  onAddQuestion: (parentId: number) => void
  onRemoveGroup: (groupId: number) => void
  onRemoveQuestion: (questionId: number) => void
  onUpdateGroup: (groupId: number, patch: Partial<Group>) => void
  onUpdateQuestion: (questionId: number, patch: Partial<Question>) => void
}) {
  const { group, depth, label, onAddGroup, onAddQuestion, onRemoveGroup, onRemoveQuestion, onUpdateGroup, onUpdateQuestion } = props
  return (
    <div className="rounded border p-2 space-y-2" style={{ marginLeft: `${depth * 10}px` }}>
      <div className="flex items-center justify-between">
        <div className="font-medium">Group {label}</div>
        <Button type="button" size="sm" variant="destructive" onClick={() => onRemoveGroup(group.blockId)}>Delete</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input value={group.title} onChange={(e) => onUpdateGroup(group.blockId, { title: e.target.value })} placeholder="Title" />
        <Input type="number" value={group.totalMarks} onChange={(e) => onUpdateGroup(group.blockId, { totalMarks: num(e.target.value) })} placeholder="Total marks" />
        <Input type="number" value={group.minQuestions} onChange={(e) => onUpdateGroup(group.blockId, { minQuestions: num(e.target.value) })} placeholder="Min questions" />
        <Input value={group.instructions} onChange={(e) => onUpdateGroup(group.blockId, { instructions: e.target.value })} placeholder="Instructions" />
        <Input value={group.displayDownText} onChange={(e) => onUpdateGroup(group.blockId, { displayDownText: e.target.value })} placeholder="Display down text" />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onAddGroup(group.blockId)}>Add Group</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onAddQuestion(group.blockId)}>Add Question</Button>
      </div>

      {group.groups.map((child, idx) => (
        <GroupEditor
          key={`group-${child.blockId}`}
          group={child}
          depth={depth + 1}
          label={`${label}.${idx + 1}`}
          onAddGroup={onAddGroup}
          onAddQuestion={onAddQuestion}
          onRemoveGroup={onRemoveGroup}
          onRemoveQuestion={onRemoveQuestion}
          onUpdateGroup={onUpdateGroup}
          onUpdateQuestion={onUpdateQuestion}
        />
      ))}
      {group.questions.map((q, idx) => (
        <QuestionEditor
          key={`q-${q.blockId}`}
          question={q}
          label={`${label}.Q${idx + 1}`}
          onRemoveQuestion={onRemoveQuestion}
          onUpdateQuestion={onUpdateQuestion}
        />
      ))}
    </div>
  )
}

function QuestionEditor(props: {
  question: Question
  label: string
  onRemoveQuestion: (id: number) => void
  onUpdateQuestion: (id: number, patch: Partial<Question>) => void
}) {
  const { question, label, onRemoveQuestion, onUpdateQuestion } = props
  return (
    <div className="rounded border p-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
      <div className="md:col-span-2 text-sm font-medium">{label}</div>
      <Input
        className="md:col-span-3"
        type="number"
        value={question.marks}
        onChange={(e) => onUpdateQuestion(question.blockId, { marks: num(e.target.value) })}
        placeholder="Marks"
      />
      <Input
        className="md:col-span-5"
        value={question.displayDownText}
        onChange={(e) => onUpdateQuestion(question.blockId, { displayDownText: e.target.value })}
        placeholder="Display down text"
      />
      <Button type="button" size="sm" variant="destructive" className="md:col-span-2" onClick={() => onRemoveQuestion(question.blockId)}>
        Delete
      </Button>
    </div>
  )
}

function mapApiToUi(rows: AnyRow[]): Section[] {
  const sections = rows.filter((r) => num(r.levelno) === 1)
  return sections.map((section) => {
    const sectionId = num(section.blockId)
    const groups = mapGroups(rows, sectionId)
    const questions = rows
      .filter((r) => num(r.parentBlockId) === sectionId && num(r.qpBlockTypeId) === 6047)
      .map((q) => ({
        blockId: num(q.blockId),
        parentBlockId: sectionId,
        examQpTemplateDetailId: num(q.examQpTemplateDetailId) || undefined,
        marks: num(q.totalMarks),
        displayDownText: txt(q.displaydowntext),
      }))
    return {
      blockId: sectionId,
      parentBlockId: null,
      examQpTemplateDetailId: num(section.examQpTemplateDetailId) || undefined,
      title: txt(section.title),
      totalMarks: num(section.totalMarks),
      minQuestions: num(section.questionsToAnswer),
      instructions: txt(section.instruction),
      displayDownText: txt(section.displaydowntext),
      groups,
      questions,
    }
  })
}

function mapGroups(rows: AnyRow[], parentBlockId: number): Group[] {
  return rows
    .filter((r) => num(r.parentBlockId) === parentBlockId && num(r.qpBlockTypeId) === 6046)
    .map((g) => {
      const gid = num(g.blockId)
      return {
        blockId: gid,
        parentBlockId,
        examQpTemplateDetailId: num(g.examQpTemplateDetailId) || undefined,
        title: txt(g.title),
        totalMarks: num(g.totalMarks),
        minQuestions: num(g.questionsToAnswer),
        instructions: txt(g.instruction),
        displayDownText: txt(g.displaydowntext),
        groups: mapGroups(rows, gid),
        questions: rows
          .filter((r) => num(r.parentBlockId) === gid && num(r.qpBlockTypeId) === 6047)
          .map((q) => ({
            blockId: num(q.blockId),
            parentBlockId: gid,
            examQpTemplateDetailId: num(q.examQpTemplateDetailId) || undefined,
            marks: num(q.totalMarks),
            displayDownText: txt(q.displaydowntext),
          })),
      }
    })
}

function convertToPayloadRows(sections: Section[]): AnyRow[] {
  let questionCounter = 1
  const rows: AnyRow[] = []

  const walkGroup = (group: Group, level: number, order: number) => {
    rows.push({
      blockId: group.blockId,
      parentBlockId: group.parentBlockId,
      examQpTemplateDetailId: group.examQpTemplateDetailId,
      qpBlockTypeId: 6046,
      levelno: level,
      levelOrderNo: order,
      title: group.title,
      instruction: group.instructions,
      questionsTotal: 0,
      questionsToAnswer: group.minQuestions,
      totalMarks: group.totalMarks,
      questionNo: null,
      questionNoDisplaytext: null,
      displaydowntext: group.displayDownText,
      isActive: true,
      reason: '',
    })
    group.questions.forEach((q, idx) => {
      rows.push({
        blockId: q.blockId,
        parentBlockId: q.parentBlockId,
        examQpTemplateDetailId: q.examQpTemplateDetailId,
        qpBlockTypeId: 6047,
        levelno: level + 1,
        levelOrderNo: idx + 1,
        title: null,
        instruction: '',
        questionsTotal: null,
        questionsToAnswer: null,
        totalMarks: q.marks,
        questionNo: questionCounter,
        questionNoDisplaytext: `Q${questionCounter++}`,
        displaydowntext: q.displayDownText,
        isActive: true,
        reason: '',
      })
    })
    group.groups.forEach((g, idx) => walkGroup(g, level + 1, idx + 1))
  }

  sections.forEach((section, idx) => {
    rows.push({
      blockId: section.blockId,
      parentBlockId: null,
      examQpTemplateDetailId: section.examQpTemplateDetailId,
      qpBlockTypeId: 6046,
      levelno: 1,
      levelOrderNo: idx + 1,
      title: section.title,
      instruction: section.instructions,
      questionsTotal: 0,
      questionsToAnswer: section.minQuestions,
      totalMarks: section.totalMarks,
      questionNo: null,
      questionNoDisplaytext: null,
      displaydowntext: section.displayDownText,
      isActive: true,
      reason: '',
    })

    section.questions.forEach((q, qIdx) => {
      rows.push({
        blockId: q.blockId,
        parentBlockId: q.parentBlockId,
        examQpTemplateDetailId: q.examQpTemplateDetailId,
        qpBlockTypeId: 6047,
        levelno: 2,
        levelOrderNo: qIdx + 1,
        title: null,
        instruction: '',
        questionsTotal: null,
        questionsToAnswer: null,
        totalMarks: q.marks,
        questionNo: questionCounter,
        questionNoDisplaytext: `Q${questionCounter++}`,
        displaydowntext: q.displayDownText,
        isActive: true,
        reason: '',
      })
    })
    section.groups.forEach((group, gIdx) => walkGroup(group, 2, gIdx + 1))
  })
  return rows
}

function addGroupToSections(sections: Section[], parentBlockId: number, newId: number): Section[] {
  return sections.map((section) => {
    if (section.blockId === parentBlockId) {
      return {
        ...section,
        groups: [
          ...section.groups,
          {
            blockId: newId,
            parentBlockId,
            title: `Group ${section.groups.length + 1}`,
            totalMarks: 0,
            minQuestions: 0,
            instructions: '',
            displayDownText: '',
            groups: [],
            questions: [],
          },
        ],
      }
    }
    return { ...section, groups: addGroupToGroups(section.groups, parentBlockId, newId) }
  })
}

function addGroupToGroups(groups: Group[], parentBlockId: number, newId: number): Group[] {
  return groups.map((group) => {
    if (group.blockId === parentBlockId) {
      return {
        ...group,
        groups: [
          ...group.groups,
          {
            blockId: newId,
            parentBlockId,
            title: `Group ${group.groups.length + 1}`,
            totalMarks: 0,
            minQuestions: 0,
            instructions: '',
            displayDownText: '',
            groups: [],
            questions: [],
          },
        ],
      }
    }
    return { ...group, groups: addGroupToGroups(group.groups, parentBlockId, newId) }
  })
}

function addQuestionToSections(sections: Section[], parentBlockId: number, newId: number): Section[] {
  return sections.map((section) => {
    if (section.blockId === parentBlockId) {
      return {
        ...section,
        questions: [
          ...section.questions,
          { blockId: newId, parentBlockId, marks: 0, displayDownText: '' },
        ],
      }
    }
    return { ...section, groups: addQuestionToGroups(section.groups, parentBlockId, newId) }
  })
}

function addQuestionToGroups(groups: Group[], parentBlockId: number, newId: number): Group[] {
  return groups.map((group) => {
    if (group.blockId === parentBlockId) {
      return {
        ...group,
        questions: [...group.questions, { blockId: newId, parentBlockId, marks: 0, displayDownText: '' }],
      }
    }
    return { ...group, groups: addQuestionToGroups(group.groups, parentBlockId, newId) }
  })
}

function removeGroupFromSections(sections: Section[], groupId: number): Section[] {
  return sections.map((section) => ({ ...section, groups: removeGroupFromGroups(section.groups, groupId) }))
}

function removeGroupFromGroups(groups: Group[], groupId: number): Group[] {
  return groups
    .filter((g) => g.blockId !== groupId)
    .map((g) => ({ ...g, groups: removeGroupFromGroups(g.groups, groupId) }))
}

function removeQuestionFromSections(sections: Section[], questionId: number): Section[] {
  return sections.map((section) => ({
    ...section,
    questions: section.questions.filter((q) => q.blockId !== questionId),
    groups: removeQuestionFromGroups(section.groups, questionId),
  }))
}

function removeQuestionFromGroups(groups: Group[], questionId: number): Group[] {
  return groups.map((g) => ({
    ...g,
    questions: g.questions.filter((q) => q.blockId !== questionId),
    groups: removeQuestionFromGroups(g.groups, questionId),
  }))
}

function updateGroupInSections(sections: Section[], groupId: number, patch: Partial<Group>): Section[] {
  return sections.map((section) => ({
    ...section,
    groups: updateGroupInGroups(section.groups, groupId, patch),
  }))
}

function updateGroupInGroups(groups: Group[], groupId: number, patch: Partial<Group>): Group[] {
  return groups.map((group) => {
    if (group.blockId === groupId) return { ...group, ...patch }
    return { ...group, groups: updateGroupInGroups(group.groups, groupId, patch) }
  })
}

function updateQuestionInSections(
  sections: Section[],
  questionId: number,
  patch: Partial<Question>,
): Section[] {
  return sections.map((section) => ({
    ...section,
    questions: section.questions.map((q) => (q.blockId === questionId ? { ...q, ...patch } : q)),
    groups: updateQuestionInGroups(section.groups, questionId, patch),
  }))
}

function updateQuestionInGroups(groups: Group[], questionId: number, patch: Partial<Question>): Group[] {
  return groups.map((group) => ({
    ...group,
    questions: group.questions.map((q) => (q.blockId === questionId ? { ...q, ...patch } : q)),
    groups: updateQuestionInGroups(group.groups, questionId, patch),
  }))
}

