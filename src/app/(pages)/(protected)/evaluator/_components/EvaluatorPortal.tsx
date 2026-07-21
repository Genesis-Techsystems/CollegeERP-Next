'use client'

// Evaluator portal shell — ported from the standalone ExamDigit dashboard route.
// The demo role picker + nested sidebar are dropped: CollegeERP's protected
// layout already provides the app shell, and access is gated to evaluator
// accounts server-side (see ../page.tsx). This just switches between the three
// evaluator views: subjects dashboard → answer scripts → marking workbench.

import { useState } from 'react'
import { EvaluatorDashboard } from './evaluator-dashboard'
import { AnswerScriptsList, type ScriptRow } from './answer-scripts-list'
import { EvaluationWorkbench } from './evaluation-workbench'
import type { SubjectCard } from './subject-cards'

export function EvaluatorPortal() {
  const [openScript, setOpenScript] = useState<ScriptRow | null>(null)
  const [openSubject, setOpenSubject] = useState<SubjectCard | null>(null)

  // Full-screen marking workbench when a script is opened.
  if (openScript) {
    return (
      <EvaluationWorkbench
        scriptId={openScript.id}
        studentAnswerPaperId={openScript.studentAnswerPaperId}
        examEvaluationAssignmentId={openScript.examEvaluationAssignmentId}
        subjectName={openSubject?.subjectName ?? openSubject?.name}
        onBack={() => setOpenScript(null)}
      />
    )
  }

  // Answer-scripts list for a chosen subject.
  if (openSubject) {
    return (
      <AnswerScriptsList
        subject={openSubject}
        subjectName={openSubject.subjectName ?? openSubject.name}
        profileId={openSubject.examEvaluatorProfileId ?? undefined}
        profileDetId={openSubject.examEvaluatorProfileDetId ?? undefined}
        onOpen={(s) => setOpenScript(s)}
        onBack={() => setOpenSubject(null)}
      />
    )
  }

  // Default: evaluator subjects dashboard.
  return <EvaluatorDashboard onOpenSubject={setOpenSubject} />
}
