# Agent Task: Invigilator Remuneration + Revaluation Fee Setup + exam-master.service Refactor

Date: 2026-03-29

---

## 1. exam-master.service.ts Refactor

### What changed

All inline `fetch()` calls replaced with `crud.service.ts` functions. The `DomainListResponse<T>` interface (private, used only internally) was removed because it is no longer needed.

| Function | Before | After |
|---|---|---|
| `getCollegeFilters` | raw `fetch` + manual `SpringListResponse` parse | `getAllRecords('s_get_collegewisedetails_bycode', {...})` |
| `createExamMaster` | raw `POST fetch` + manual status check | `domainCreate<ExamMaster>('ExamMaster', payload)` |
| `updateExamMaster` | raw `PUT fetch` + manual status check | `domainUpdate<ExamMaster>('ExamMaster', 'examId', examId, payload)` |
| `getGeneralDetails` | raw `GET fetch` + `resultList` parse | `domainList<GeneralDetail>('GeneralDetail', buildQuery({...}))` |
| `getRegulations` | raw `GET fetch` + `resultList` parse | `domainList<Regulation>('Regulation', buildQuery({...}))` |
| `getCourseGroups` | raw `GET fetch` + `resultList` parse | `domainList<CourseGroup>('CourseGroup', buildQuery({...}))` |
| `getCourseYears` | raw `GET fetch` + `resultList` parse | `domainList<CourseYear>('CourseYear', buildQuery({...}))` |
| `getExamMasterDetails` | raw `GET fetch` + `resultList` parse | `domainList<ExamMasterDetails>('ExamMasterDetails', buildQuery({...}))` |

### What was kept as-is

- `fetchExamsByUniversity` and `fetchExamsByCollege` — kept as raw `fetch` because they use `?size=99999` pagination parameter and the `resultList` envelope, which is incompatible with `domainList`'s `ApiResponse<T[]>` expectation.
- `getExamMasterById` — kept as raw `fetch` for the same size/pagination reason.
- `uploadExamFiles` — multipart file upload; not a `crud.service` concern.
- `saveExamMasterDetails` — uses a custom `addExamMasterDetails` endpoint (not standard CRUD); kept as-is.

### All function signatures preserved

No callers were broken. The `ExamMasterModal` and `ExamMasterPage` continue to work unchanged.

---

## 2. Page 1: Invigilator Remuneration

### Entity found

Angular source: `exam-masters/invigilator-remuneration/`
Angular CRUD URL constant: `examInvigilationRemunerationUrl = 'ExamInvigilationRemuneration'`
Angular model: `ExamInvgRemuneration` (app/main/models/invigilatorRemuneration.ts)

**Spring Boot entity name:** `ExamInvigilationRemuneration`
**Primary key:** `examInvgRemunerationId`

### Files created

- `src/types/invigilator-remuneration.ts` — `InvigilatorRemuneration`, `InvigilatorRemunerationFormValues`
- `src/services/invigilator-remuneration.service.ts` — `getInvigilatorRemunerations`, `getInvigilatorRemunerationsByCollege`, `createInvigilatorRemuneration`, `updateInvigilatorRemuneration`, `deleteInvigilatorRemuneration`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/invigilator-remuneration/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/invigilator-remuneration/InvigilatorRemunerationModal.tsx`

### API constants added

In `INVIG_REMUNERATION_API` constant block:
```ts
ENTITY: 'ExamInvigilationRemuneration'
PK: 'examInvgRemunerationId'
INVIG_DESG_GM_CODE: 'INVLATRDISG'   // GeneralMaster code for invigilator designation types
```

### Assumptions

- The invigilator designation dropdown uses `GeneralDetail` filtered by GM code `INVLATRDISG` (from Angular constant `invlatrDisgTypesUrl: 'INVLATRDISG'`).
- College list loaded directly from `domain/list/College?query=isActive==true`. The Angular modal also loaded college list from the DB; no session/filter restriction was applied (unlike the exam-master page).
- The `amount` field represents pay per session (most common interpretation in ERP context). The Angular modal label did not specify a pay type — no "pay type" dropdown was present in the source Angular component.

---

## 3. Page 2: Revaluation Fee Setup

### Entity found

Angular source: `exam-masters/exam-re-valuation-fee-setup/`
Angular CRUD URL constant: `examFeeStructureCrudUrl = 'ExamFeeStructure'`

**Spring Boot entity name:** `ExamFeeStructure`
**Primary key:** `examFeeStructureId`

Note: `ExamFeeStructure` is the general exam fee configuration entity. In the context of the revaluation fee setup page, it stores re-check fee amounts (`regFee` = regular re-check, `supplyFee` = supplementary re-check) per exam, along with the collection window dates.

The Angular `exam-re-valuation-fee-setup-modal.component.ts` confirms the same entity and the `examFeeStructureName`, `collectionStartDate`, `collectionEndDate`, `regFee`, `supplyFee` fields.

### Files created

- `src/types/revaluation-fee.ts` — `RevaluationFee`, `RevaluationFeeFormValues`
- `src/services/revaluation-fee.service.ts` — `getRevaluationFees`, `getRevaluationFeesByExam`, `createRevaluationFee`, `updateRevaluationFee`, `deleteRevaluationFee`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/revaluation-fee-setup/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/revaluation-fee-setup/RevaluationFeeModal.tsx`

### API constants added

In `REVAL_FEE_API` constant block:
```ts
ENTITY: 'ExamFeeStructure'
PK: 'examFeeStructureId'
```

### Assumptions

- The `ExamFeeStructure` entity is shared with the `exam-fee-setup` page. The revaluation fee setup is a subset of the same entity; in a production environment, a query filter (e.g., a `feeType` flag) may be needed to distinguish revaluation fee records from regular fee structures. This was not apparent from the Angular source — the Angular page displayed all `ExamFeeStructure` records for a selected exam. This implementation follows the same pattern.
- Exams for the modal dropdown are fetched from `domain/list/ExamMaster?query=isActive==true.order(examName=ASC)`. The Angular page used cascading university/college/course/AY filters. A simpler flat list was implemented here to keep the modal focused; the full filter cascade can be added later if needed.
- The Angular `exam-re-valuation-fee-setup-modal.component.ts` also contained additional-fee rows (`examFeeAdditionalStructure`) and late-fee fine rows (`examFeeFine`). These sub-entity sections were deferred — the base fee structure CRUD is sufficient for a first iteration.

---

## TypeScript status

Zero new TS errors introduced. Pre-existing errors in `exam-timetable`, `grade-setup`, and `seating-plan-setup` (Zod v4 `required_error` API change) are unrelated and were present before this task.
