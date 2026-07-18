'use client'

import { FileCheck2, Monitor } from 'lucide-react'
import { Select } from '@/common/components/select'
import { FormSectionHeader } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/FormSectionHeader'
import { entityOptions, type AnyRow } from './application-form-utils'

export interface TermsStepProps {
  workflowStageId: number | null
  workflowStages: AnyRow[]
  onChange: (workflowStageId: number | null) => void
  error?: string
}

function TermsHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="inline-block rounded border border-sky-300 bg-sky-100 px-2.5 py-1 text-sm font-semibold text-sky-900">
      {children}
    </h3>
  )
}

function Signature({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-right text-sm font-medium">{children}</p>
}

/** Angular add/edit-application-form Terms & Conditions content (verbatim). */
export function TermsStep({
  workflowStageId,
  workflowStages,
  onChange,
  error,
}: TermsStepProps) {
  return (
    <div className="space-y-4">
      <FormSectionHeader icon={FileCheck2} title="Terms & Conditions" />

      <div className="space-y-5 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
        <div className="space-y-2">
          <TermsHeading>Declaration by the Candidate</TermsHeading>
          <p>
            I promise to abide by the rules and regulations of the college and the University. I
            declare that I will not enroll for study in any other college at the same time. I also
            declare that the particulars mentioned in the application form are correct and
            complete. I have not suppressed any information to the best of my knowledge.
          </p>
          <p>
            I promise that I shall attend the college regularly and punctually. If I make myself
            continuously absent for a fortnight my name may be striked of from the rolls. I have no
            objection if any scholarship amount is withheld any my application form to appear for
            University examination is not forwarded due to shortage of attendance. If I act against
            the discipline of the College, disciplinary action may be initiated against me. I shall
            appear for all internal examinations and slip tests conducted by the college. I promise
            that I shall not damage College property and I shall keep the College neat and clean.
            If, I discontinue in the middle of the year, I shall pay Fee for the remaining course of
            study and I don&rsquo;t claim for any refund of the same.
          </p>
          <Signature>Signature of the Candidate</Signature>
        </div>

        <div className="space-y-2">
          <TermsHeading>Agreement by the Parent / Guardian</TermsHeading>
          <p>
            We agree to the above declaration by the candidate. We shall also be responsible for
            the payment of all his/her fee and other charges. We shall be responsible for his / her
            conduct and good behaviour during the period of study. We shall enquire his / her
            progress by contacting / visiting the college from time to time.
          </p>
          <Signature>Signature of the Parent / Guardian</Signature>
        </div>

        <div className="space-y-2">
          <TermsHeading>Abide by and fulfil the following conditions</TermsHeading>
          <div className="space-y-1.5">
            <p>
              1.We will pay the Tuition Fee prescribed by the Government of Telangana, from time to
              time, within one week from the date of commencement of class work of every academic
              year.
            </p>
            <p>
              2.We will not seek any facility or concession for payment of tuition fee in
              instalment and will remit the entire tuition fee in the beginning of the academic
              year.
            </p>
            <p>
              3.We shall see that our Ward conduct himself / herself in a disciplined manner during
              his / her stay in the college.
            </p>
            <p>
              4.Our Ward will attend the classes regularly during the period of his / her study at
              the college, he/she will not miss or boycott the classes under any circumstances.
            </p>
            <p>
              5.Our Ward will not associate himself / herself in any group activities that are
              against the general interest and prestige of the College.
            </p>
            <p>
              6.Our Ward will not indulge in any activity that will cause damage or loss to the
              college property.
            </p>
            <p>7.Our Ward will not involve himself / herself in ragging directly and/or indirectly.</p>
            <p>8.We shall prohibit our Ward to carry and use cell phones in College premises.</p>
          </div>
          <Signature>Signature of the Parent / Guardian</Signature>
        </div>
      </div>

      <FormSectionHeader icon={Monitor} title="Workflow Stages" />
      <div className="max-w-sm">
        <Select
          label="Workflow Stage"
          required
          value={workflowStageId ? String(workflowStageId) : null}
          onChange={(v) => onChange(v ? Number(v) : null)}
          options={entityOptions(workflowStages, ['workflowStageId'], ['wfName', 'name'])}
          placeholder="Select workflow stage"
          searchable
          error={error}
        />
      </div>
    </div>
  )
}
