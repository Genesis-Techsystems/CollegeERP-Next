# Examination Module — Restore Guide

All files in this folder are examination-module files that were parked here temporarily.
When restoring, move each file back to its original path **exactly as listed below**,
then uncomment the exam exports in `src/services/index.ts`.

---

## 1. Types → `src/types/`

| File in todo | Restore to |
|---|---|
| `types/exam-master.ts` | `src/types/exam-master.ts` |
| `types/exam-session.ts` | `src/types/exam-session.ts` |
| `types/exam-grade.ts` | `src/types/exam-grade.ts` |
| `types/exam-timetable.ts` | `src/types/exam-timetable.ts` |
| `types/exam-max-marks.ts` | `src/types/exam-max-marks.ts` |
| `types/exam-fee-setup.ts` | `src/types/exam-fee-setup.ts` |
| `types/invigilator-remuneration.ts` | `src/types/invigilator-remuneration.ts` |
| `types/revaluation-fee.ts` | `src/types/revaluation-fee.ts` |
| `types/seating-plan.ts` | `src/types/seating-plan.ts` |

---

## 2. Services → `src/services/`

| File in todo | Restore to |
|---|---|
| `services/exam-master.ts` | `src/services/examination/exam-master.ts` |
| `services/exam-session.ts` | `src/services/examination/exam-session.ts` |
| `services/exam-grade.ts` | `src/services/examination/exam-grade.ts` |
| `services/exam-timetable.ts` | `src/services/examination/exam-timetable.ts` |
| `services/exam-max-marks.ts` | `src/services/examination/exam-max-marks.ts` |
| `services/exam-fee-setup.ts` | `src/services/examination/exam-fee-setup.ts` |
| `services/invigilator-remuneration.ts` | `src/services/examination/invigilator-remuneration.ts` |
| `services/revaluation-fee.ts` | `src/services/examination/revaluation-fee.ts` |
| `services/seating-plan.ts` | `src/services/examination/seating-plan.ts` |

---

## 3. Hooks → `src/hooks/`

| File in todo | Restore to |
|---|---|
| `hooks/useCollegeFilters.ts` | `src/hooks/useCollegeFilters.ts` |

---

## 4. Pages → `src/app/(pages)/(protected)/admin-examination-management/`

All files under `pages/` map to `src/app/(pages)/(protected)/admin-examination-management/`.
The subdirectory structure is identical — just change the root prefix.

### admin-exam-masters

| File in todo | Restore to |
|---|---|
| `pages/admin-exam-masters/exam-master/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-master/page.tsx` |
| `pages/admin-exam-masters/exam-master/ExamMasterModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-master/ExamMasterModal.tsx` |
| `pages/admin-exam-masters/exam-master/exam-master-details/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-master/exam-master-details/page.tsx` |
| `pages/admin-exam-masters/exam-session/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-session/page.tsx` |
| `pages/admin-exam-masters/exam-session/ExamSessionModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-session/ExamSessionModal.tsx` |
| `pages/admin-exam-masters/grade-setup/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/grade-setup/page.tsx` |
| `pages/admin-exam-masters/grade-setup/GradeSetupModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/grade-setup/GradeSetupModal.tsx` |
| `pages/admin-exam-masters/exam-max-marks-setup/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-max-marks-setup/page.tsx` |
| `pages/admin-exam-masters/exam-max-marks-setup/ExamMaxMarksModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-max-marks-setup/ExamMaxMarksModal.tsx` |
| `pages/admin-exam-masters/exam-fee-setup/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-fee-setup/page.tsx` |
| `pages/admin-exam-masters/exam-fee-setup/ExamFeeSetupModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-fee-setup/ExamFeeSetupModal.tsx` |
| `pages/admin-exam-masters/exam-timetable/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-timetable/page.tsx` |
| `pages/admin-exam-masters/exam-timetable/ExamTimetableModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-timetable/ExamTimetableModal.tsx` |
| `pages/admin-exam-masters/seating-plan-setup/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/seating-plan-setup/page.tsx` |
| `pages/admin-exam-masters/seating-plan-setup/SeatingPlanModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/seating-plan-setup/SeatingPlanModal.tsx` |
| `pages/admin-exam-masters/invigilator-remuneration/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/invigilator-remuneration/page.tsx` |
| `pages/admin-exam-masters/invigilator-remuneration/InvigilatorRemunerationModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/invigilator-remuneration/InvigilatorRemunerationModal.tsx` |
| `pages/admin-exam-masters/revaluation-fee-setup/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/revaluation-fee-setup/page.tsx` |
| `pages/admin-exam-masters/revaluation-fee-setup/RevaluationFeeModal.tsx` | `src/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/revaluation-fee-setup/RevaluationFeeModal.tsx` |

### evaluation-process

| File in todo | Restore to |
|---|---|
| `pages/evaluation-process/create-questionpaper-template/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/create-questionpaper-template/page.tsx` |
| `pages/evaluation-process/evaluation-templates/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluation-templates/page.tsx` |
| `pages/evaluation-process/exam-question-paper-marks/page.tsx` | `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/exam-question-paper-marks/page.tsx` |

---

## 5. Docs → `src/docs/flows/`

| File in todo | Restore to |
|---|---|
| `docs/exam-master-flow.md` | `src/docs/flows/exam-master-flow.md` |

---

## 6. After restoring all files — update `src/services/index.ts`

Open `src/services/index.ts` and uncomment the exam service exports (lines 4–12):

```ts
export * from './examination/exam-master'
export * from './examination/exam-session'
export * from './examination/exam-grade'
export * from './examination/exam-max-marks'
export * from './examination/exam-fee-setup'
export * from './examination/seating-plan'
export * from './examination/exam-timetable'
export * from './examination/invigilator-remuneration'
export * from './examination/revaluation-fee'
```

---

## Files NOT moved (shared — used by other modules too)

| File | Why kept |
|---|---|
| `src/common/components/forms/CollegeFilterPanel.tsx` | Shared reusable UI component |
| `src/lib/query-keys.ts` | Central TanStack Query key registry for all modules |
| `src/services/crud.ts` | Universal CRUD layer used by all modules |

These files still reference examination types/services. Their imports will resolve again automatically once the exam files are restored.
