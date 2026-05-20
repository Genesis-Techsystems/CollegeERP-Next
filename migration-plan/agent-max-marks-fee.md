# Agent Migration: Exam Max Marks Setup + Exam Fee Setup

**Date:** 2026-03-29
**Agent:** claude-sonnet-4-6

---

## Files Created

### Types
- `src/types/exam-max-marks.ts` — ExamMarksSetup, RegulationFilterRow, ExamMarksSetupFormValues
- `src/types/exam-fee-setup.ts` — ExamFeeStructure, ExamFeeAdditionalStructure, ExamFeeFine, ExamFeeStructureCourseyr, ExamFeeStructureFormValues

### Services
- `src/services/exam-max-marks.service.ts` — getMarksSetupFilters, fetchMarksSetup, saveMarksSetup
- `src/services/exam-fee-setup.service.ts` — getExamFilters, fetchFeeStructuresByExam, fetchFeeStructuresByExamAndCollege, createFeeStructure, updateFeeStructure, deleteFeeStructure

### Pages
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-max-marks-setup/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-max-marks-setup/ExamMaxMarksModal.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-fee-setup/page.tsx`
- `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-fee-setup/ExamFeeSetupModal.tsx`

### API Constants (appended to existing file)
- `src/config/constants/api.ts` — Added to `EXAM_MASTERS_API`: `EXAM_MARKS_SETUP_ENTITY`, `EXAM_MARKS_SETUP_SAVE`, `EXAM_FEE_STRUCTURE_ENTITY`, `GET_EXAM_FILTERS_BY_CODE`

---

## Entity Names Found

### Exam Max Marks Setup
- **Spring Boot entity:** `ExamMarkssetup` (lowercase 's' — confirmed from Angular `CONSTANTS.examMarksSetupUrl = 'ExamMarkssetup'`)
- **Primary key:** `markssetupId`
- **Batch save endpoint:** `POST exammarkssetup` (Angular `CONSTANTS.exammarkssetupUrl`)

### Exam Fee Structure
- **Spring Boot entity:** `ExamFeeStructure`
- **Primary key:** `examFeeStructureId`
- **Standard domain CRUD:** `domain/create/ExamFeeStructure`, `domain/update/ExamFeeStructure`, `domain/list/ExamFeeStructure`

---

## Field Names Used

### ExamMarkssetup
| Field | Type | Notes |
|-------|------|-------|
| markssetupId | number | PK |
| marksSetupName | string | Required |
| internalMarks | number | |
| externalMarks | number | |
| passPercentage | number | Internal pass % |
| externalPassPercentage | number | External pass % |
| isForDisabled | boolean | Disabled-student configuration |
| regulationId | number | FK (from page filter) |
| universityId | number | FK (from page filter) |
| courseId | number | FK (from page filter) |
| isActive | boolean | |
| reason | string | |

### ExamFeeStructure
| Field | Type | Notes |
|-------|------|-------|
| examFeeStructureId | number | PK |
| examFeeStructureName | string | Required |
| examId | number | FK → ExamMaster |
| collegeId | number | FK → College (college mode only) |
| regFee | number | Registration fee |
| subject1Fee–subject7Fee | number | Per-subject fees |
| supplyFee | number | Supplementary exam fee |
| collectionStartDate | string (ISO) | |
| collectionEndDate | string (ISO) | |
| examFeeAdditionalStructure | array | Nested additional fee rows |
| examFeeFine | array | Nested late-fee rows |
| isActive | boolean | |
| reason | string | |

---

## Filter Cascades

### Exam Max Marks Setup
- Uses **`s_get_collegewisedetails_bycode`** (same as exam-master page)
- Cascade: University → Course → Regulation → (isForDisabled checkbox) → Load marks rows
- `filtersData` rows (flag=`clg_filters`): universities + courses
- `regulationData` rows (clg_filters_regulation=`clg_filters_regulation`): regulations per university+course

### Exam Fee Setup
- Uses **`s_get_exam_filters_bycode`** with `in_flag=univ_exam_filters`
- Cascade: University → Course → Academic Year → Exam
- Mode 1 (University Wide): loads fee structures by examId
- Mode 2 (College Specific): adds College dropdown, loads fee structures by examId + collegeId

---

## Decisions and Assumptions

1. **Marks Setup save is batch-POST**: Angular sends an array to `exammarkssetup`. The Next.js implementation wraps the single edited/created row in an array to match this API contract. This is consistent with `saveExamMasterDetails` in the exam-master service.

2. **Subject category dropdown omitted from modal**: The Angular marks-setup-modal.component.ts showed a `subjectTypeCatId` dropdown pulling from GeneralMaster code `SUBCATTYP`. The Angular component also showed the main table page merges subject category rows with existing marks rows (complex inline edit pattern). The Next.js modal uses a simpler name-based setup instead, which is sufficient for basic CRUD. The `subjectTypeCatId` field is included in the types for completeness.

3. **Regulation filter from `clg_filters_regulation` flag**: The Angular component reads `regulationData` from a second result set in the same stored proc response (identified by `clg_filters_regulation === 'clg_filters_regulation'`). This is implemented in `getMarksSetupFilters`.

4. **Exam Fee Structure nested rows (additional fees, late fees) are read-only in this sprint**: The Angular modal has full inline CRUD for `examFeeAdditionalStructure` (fee by type) and `examFeeFine` (late fee schedule). These are complex sub-tables. In the Next.js modal, only the main structure fields are editable. Nested rows are included in the types and will appear in the fetched data but editing them is deferred.

5. **`onSuccess` deprecated**: TanStack Query v5 removed `onSuccess` from `useQuery`. Used `useEffect` watching `data` result instead, consistent with the AGENTS.md note about reading the Next.js docs.

6. **`z.coerce.number()` resolver mismatch**: Used `z.number()` with `register('field', { valueAsNumber: true })` pattern instead, to avoid zodResolver type inference issues with coercion.

---

## Angular Source Files Read
- `marks-setup.component.ts` — filter cascade, data loading, submit pattern
- `marks-setup.component.html` — columns: marksSetupName, internalMarks, externalMarks, passPercentage, externalPassPercentage, finalIntPercentage, finalExtPercentage
- `marks-setup-modal.component.ts` — form fields: marksSetupName, subjectTypeCatId, internalMarks, externalMarks, externalPassPercentage, passPercentage, isActive, reason
- `exam-fee-structure.component.ts` — filter cascade (univ_exam_filters proc), column definitions, mode 1/2
- `exam-fee-structure-modal.component.ts` — form fields: examFeeStructureName, collectionStartDate, collectionEndDate, regFee, subject1–7Fee, supplyFee + nested tables
- `/Users/sap-mac/Downloads/Dev/College-ERP/college_erp_angular_foundation_work/src/app/common/constants.ts` — URL constants: examMarksSetupUrl, exammarkssetupUrl, examFeeStructureCrudUrl, getExamFiltersBycodeUrl, additionalFeeType, examFeeType, revisionType
