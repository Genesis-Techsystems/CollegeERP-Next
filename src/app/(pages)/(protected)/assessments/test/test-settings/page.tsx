'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { getAssessmentById, updateTest } from '@/services/admin/question-bank'
import { toast } from 'sonner'
import type { Assessment } from '@/types/question-bank'

export default function TestSettingsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const assessmentName = params.get('assessmentName') ?? 'Test'
  const assessmentId = Number(params.get('assessmentId') ?? 0)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState<Assessment | null>(null)

  const [durationHour, setDurationHour] = useState('0')
  const [durationMinute, setDurationMinute] = useState('0')
  const [noOfMaxAttempts, setNoOfMaxAttempts] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [minMarksToPass, setMinMarksToPass] = useState(0)
  const [minMarksPercentage, setMinMarksPercentage] = useState(0)

  const [allowReattempts, setAllowReattempts] = useState<'yes' | 'no'>('no')
  const [unlimitedAttempts, setUnlimitedAttempts] = useState(false)
  const [gapDay, setGapDay] = useState('0')
  const [gapHour, setGapHour] = useState('0')
  const [gapMinute, setGapMinute] = useState('0')
  const [allowResume, setAllowResume] = useState<'yes' | 'no'>('yes')
  const [questionSequence, setQuestionSequence] = useState<'random' | 'sequence'>('random')
  const [displayQuestion, setDisplayQuestion] = useState<'one' | 'all'>('one')
  const [backButton, setBackButton] = useState<'allowed' | 'not_allowed'>('allowed')
  const [sectionNavigation, setSectionNavigation] = useState<'one' | 'choice'>('choice')
  const [privacyType, setPrivacyType] = useState<'public' | 'private'>('public')

  const tinyNumberOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') })),
    [],
  )

  useEffect(() => {
    async function load() {
      if (!assessmentId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const row = await getAssessmentById(assessmentId)
        setTest(row)
        if (row?.duration) {
          const [h, m] = String(row.duration).split(':')
          setDurationHour(String(Number(h ?? 0)))
          setDurationMinute(String(Number(m ?? 0)))
        }
        setNoOfMaxAttempts(Number(row?.noOfMaxAttempts ?? 0))
        setTotalQuestions(Number(row?.totalQuestions ?? 0))
        setMinMarksToPass(Number(row?.minMarksToPass ?? 0))
        setMinMarksPercentage(Number(row?.minMarksPercentage ?? 0))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load test settings')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [assessmentId])

  const save = async () => {
    if (!assessmentId || !test) return
    setSaving(true)
    try {
      const duration = `${String(Number(durationHour)).padStart(2, '0')}:${String(Number(durationMinute)).padStart(2, '0')}:00`
      await updateTest(assessmentId, {
        ...test,
        duration,
        noOfMaxAttempts: unlimitedAttempts ? 0 : Number(noOfMaxAttempts),
        totalQuestions: Number(totalQuestions),
        minMarksToPass: Number(minMarksToPass),
        minMarksPercentage: Number(minMarksPercentage),
      })
      toast.success('Test settings updated')
      router.push('/assessments/test')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update test settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={`Test Settings (${assessmentName})`} />
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        ) : (
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Time Settings</h3>
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700">Time Duration :</div>
                <Select label="Hour" value={durationHour} onChange={(v) => setDurationHour(v ?? '0')} options={tinyNumberOptions} />
                <Select label="Minute" value={durationMinute} onChange={(v) => setDurationMinute(v ?? '0')} options={tinyNumberOptions.slice(0, 60)} />
                <p className="text-xs text-muted-foreground">( Duration of Test )</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Attempt Settings</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Allow Reattempts :</div>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={allowReattempts === 'yes'} onChange={() => setAllowReattempts('yes')} /> Yes</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={allowReattempts === 'no'} onChange={() => setAllowReattempts('no')} /> No</label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">How Many :</div>
                <div className="md:col-span-3 flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={unlimitedAttempts} onChange={(e) => setUnlimitedAttempts(e.target.checked)} /> Unlimited</label>
                  <Input type="number" className="h-10 w-28" value={noOfMaxAttempts} onChange={(e) => setNoOfMaxAttempts(Number(e.target.value))} disabled={unlimitedAttempts} />
                  <span className="text-xs text-muted-foreground">( Max attempts to attend a Test )</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Gap Between Reattempts :</div>
                <div className="md:col-span-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Select label="Day" value={gapDay} onChange={(v) => setGapDay(v ?? '0')} options={tinyNumberOptions} />
                  <Select label="Hour" value={gapHour} onChange={(v) => setGapHour(v ?? '0')} options={tinyNumberOptions} />
                  <Select label="Minutes" value={gapMinute} onChange={(v) => setGapMinute(v ?? '0')} options={tinyNumberOptions.slice(0, 60)} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Resume</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Allow Test Resume :</div>
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-6 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="radio" checked={allowResume === 'yes'} onChange={() => setAllowResume('yes')} /> Yes</label>
                    <label className="inline-flex items-center gap-2"><input type="radio" checked={allowResume === 'no'} onChange={() => setAllowResume('no')} /> No</label>
                  </div>
                  <p className="text-xs text-muted-foreground">( Users can restart the test from where they stopped in unexpected circumstances )</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Appearance</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Question Sequence :</div>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={questionSequence === 'random'} onChange={() => setQuestionSequence('random')} /> Random</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={questionSequence === 'sequence'} onChange={() => setQuestionSequence('sequence')} /> In Sequence</label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Display Question :</div>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={displayQuestion === 'one'} onChange={() => setDisplayQuestion('one')} /> One By One</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={displayQuestion === 'all'} onChange={() => setDisplayQuestion('all')} /> All At Once</label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Back Button / Previous Question :</div>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={backButton === 'not_allowed'} onChange={() => setBackButton('not_allowed')} /> Not Allowed</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={backButton === 'allowed'} onChange={() => setBackButton('allowed')} /> Allowed</label>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="text-sm font-medium text-slate-700 md:pt-2">Section Navigation :</div>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={sectionNavigation === 'one'} onChange={() => setSectionNavigation('one')} /> One By One</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={sectionNavigation === 'choice'} onChange={() => setSectionNavigation('choice')} /> Users Choice</label>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Test Evaluation</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Label className="md:pt-2">Questions :</Label>
                <Input type="number" className="h-10 md:col-span-1" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Label className="md:pt-2">Min. Pass Marks :</Label>
                <Input type="number" className="h-10 md:col-span-1" value={minMarksToPass} onChange={(e) => setMinMarksToPass(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Label className="md:pt-2">Pass Percentage :</Label>
                <Input type="number" className="h-10 md:col-span-1" value={minMarksPercentage} onChange={(e) => setMinMarksPercentage(Number(e.target.value))} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="rounded-md bg-primary px-3 py-1 text-sm font-semibold uppercase text-white">Privacy Settings</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Label className="md:pt-2">Test Type :</Label>
                <div className="md:col-span-3 flex items-center gap-6 text-sm">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={privacyType === 'public'} onChange={() => setPrivacyType('public')} /> Public</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={privacyType === 'private'} onChange={() => setPrivacyType('private')} /> Private</label>
                </div>
              </div>
            </section>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/assessments/test')}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

