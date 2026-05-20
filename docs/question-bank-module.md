# Question Bank Module — Complete Documentation

> Files: `src/app/(pages)/(protected)/assessments/question-bank/`
> Service: `src/services/admin/question-bank.ts`
> Components: `src/common/components/rich-text-editor/`
> Types: `src/types/question-bank.ts`

---

## Overview

The question bank module lets instructors build and manage reusable pools of exam questions. Each **question bank** (`Assessment` with `isForQuestionbank: true`) is a named container. Inside it live individual **questions** (`CourseQuestion`) of four types: Multiple Choice, True/False, Fill in the Blank, and Subjective. Questions support rich HTML content including mathematical formulas (KaTeX) and chemical equations (mhchem/\ce{}).

---

## Data Model

### Assessment (Question Bank Container)

```ts
interface Assessment {
  assessmentId: number
  assessmentName: string
  assessmentNo: number
  assessmentDescription: string
  isActive: boolean
  isForQuestionbank: boolean    // must be true — filters from general assessments
  isPublic: boolean
  isOnlineCourse: boolean
  onlineCourseId: number | null
  courseLessonId: number | null
  courseLessonTopicId: number | null
  userId: number                // owner
  preparedbyUserId: number
  createdDt?: string
  assessmentQuestionDTOs: AssessmentQuestion[]
}
```

### CourseQuestion (Individual Question)

```ts
interface CourseQuestion {
  courseQuestionId: number
  assessmentId: number
  question: string              // HTML content from RichTextEditor
  marks: number
  fbInputTypeCatCode: 'MC' | 'TF' | 'FB' | 'SUB'
  isActive: boolean
  correctAnswerIds: number[]
  courseQuestionOptionDTOs: CourseQuestionOption[]
  onlineCourseId: number | null
  courseLessonId: number | null
  courseLessonTopicId: number | null
}
```

---

## Page Flow

```
question-bank/page.tsx          ← list all banks, manage
       │
       ├─ QuestionBankModal.tsx  ← create/edit a bank
       ├─ QuestionsListDrawer.tsx ← view/delete questions in a bank
       └─ add-question/page.tsx  ← create/edit one question
```

---

## `question-bank/page.tsx` — Bank List

### Layout

- **Header:** Page title + "Add Question Bank" button
- **Search bar:** Client-side filter by name or description
- **DataTable (AG Grid):** SI.No · Name · Description · Created Date · Status · Question Count · Actions

### Role-aware fetch

```ts
// ADMIN: sees all banks
listQuestionBanks()

// Non-admin: sees only own banks
listQuestionBanks(user.userId)
```

### Actions per row

| Action | What happens |
|---|---|
| Edit | Opens `QuestionBankModal` with bank pre-filled |
| View Questions | Opens `QuestionsListDrawer` |
| Add Question | Navigates to `add-question/?assessmentId=N` |
| Import Excel | Opens hidden `<input type="file">`, calls `importQuestionsFromExcel()`, then loops `addOrUpdateQuestion()` per returned question |

### Excel import flow

1. User clicks Import → hidden file input clicks
2. File selected → `importQuestionsFromExcel(assessmentId, file)` POST to Spring Boot
3. Spring Boot parses Excel → returns `Partial<CourseQuestion>[]`
4. Client loops the array, calling `addOrUpdateQuestion()` for each
5. On completion: invalidate `QK.questionBanks.questions(assessmentId)`, show toast

---

## `QuestionBankModal.tsx` — Create / Edit Bank

### Form fields

| Field | Type | Notes |
|---|---|---|
| Assessment Name | text | Required |
| Assessment No | number | Required, ≥ 0 |
| Description | textarea | Optional |
| Is Active | checkbox + reason | Uses `ActiveStatusField` |
| Is Public | checkbox | |
| Link to Online Course | toggle | Reveals course cascade below |
| Course | searchable dropdown | Debounced 300ms, `searchCourses(term)` |
| Lesson | dropdown | Populated from `course.courseLessonDTOs` |
| Topic | dropdown | Populated from `lesson.courseLessonTopicDTOs` |

### Cascade reset rules

- Unchecking "Link to Online Course" → clears `onlineCourseId`, `courseLessonId`, `courseLessonTopicId`
- Changing course → clears `courseLessonId`, `courseLessonTopicId`
- Changing lesson → clears `courseLessonTopicId`

---

## `QuestionsListDrawer.tsx` — View Questions

Accordion list of all questions in a bank. Each question shows:
- **Collapsed:** Type badge · Marks · Status badge · Truncated question text (via `MathContent`)
- **Expanded:** Full question · Options (A/B/C… labeled, correct answer in green) or explanation for SUB

### Type badge colors

| Type | Color |
|---|---|
| MC | Blue |
| TF | Green |
| FB | Yellow/Amber |
| SUB | Purple |

### Known issue: delete is broken

Soft-delete (`isActive: false`) fails with "Duplicate question found" because the Spring Boot service runs a duplicate-check before every save, even when `courseQuestionId` is provided (update case). The backend needs to skip the duplicate-check when updating by primary key. **No workaround available from the frontend.** Track for backend fix.

---

## `add-question/page.tsx` — Question Editor

### URL parameters

| Param | Required | Description |
|---|---|---|
| `assessmentId` | Yes | Which bank to add to |
| `assessmentQuestionId` | No | Present in edit mode |
| `permission` | No | Display label ("Add" / "Edit") |
| `page` | No | Return URL after save (defaults to question bank page) |

### Question type selector

Buttons for MC / TF / FB / SUB. **Disabled when editing** — type cannot be changed after creation.

### Per-type answer sections

#### MC — Multiple Choice

5 option rows (fixed). Each row:
- `RichTextEditor` for option HTML (math/chemistry supported)
- "Correct" checkbox — selecting one deselects others
- Collapsed by default; click to expand

Payload includes `courseQuestionOptionDTOs` with `isCorrectAnswer` flags.

#### TF — True / False

Two radio buttons: True (answer index 0) and False (answer index 1). Backend stores as two `CourseQuestionOption` entries; `correctAnswerIds` determines which is correct.

#### FB — Fill in the Blank

Dynamic list of accepted answer strings. "Add Answer" appends an input; trash icon removes. All values sent as option text with `isCorrectAnswer: true`.

#### SUB — Subjective

Optional plain textarea for explanation/marking guide. No options needed.

### Validation

- Question body must not be empty (after stripping HTML tags)
- Marks required, must be ≥ 0

### Submit payload

```ts
{
  assessmentId,
  assessmentQuestionId?,        // for update
  questionOwnerProfileId: null,
  question,                     // HTML string
  marks,
  fbInputTypeCatId,             // question type category ID
  isActive: true,
  courseQuestionOptionDTOs,     // type-specific answer options
}
```

---

## Service: `src/services/admin/question-bank.ts`

| Function | HTTP | Endpoint |
|---|---|---|
| `listQuestionBanks(userId?)` | GET | `domain/list/Assessment` |
| `createQuestionBank(data)` | POST | `domain/create/Assessment` |
| `updateQuestionBank(id, data)` | PUT | `domain/update/Assessment` |
| `listQuestionsByBank(assessmentId)` | GET | `domain/list/Assessment` (returns DTOs) |
| `addOrUpdateQuestion(payload)` | POST | `assessment/addQuestion` |
| `importQuestionsFromExcel(id, file)` | POST multipart | `assessment/importQuestionsDetails` |
| `searchCourses(term)` | GET | `domain/list/CourseLessonSearch` |
| `listQuestionTypes()` | GET | `domain/list/GeneralDetail` (GM_CODES.QUESTION_TYPE) |

> **Note:** `addOrUpdateQuestion` and `importQuestionsFromExcel` use raw `fetch()` because they are specialized Spring Boot endpoints that do not match the standard `domain/create` or `domain/update` patterns. A future pass should migrate these to `crud.postDetails` and `crud.uploadFile`.

---

## Rich Text Editor Suite

### `RichTextEditor`

```tsx
import { RichTextEditor } from '@/common/components/rich-text-editor'

<RichTextEditor
  value={html}
  onChange={setHtml}
  placeholder="Enter question..."
  minHeight={200}
/>
```

**Tiptap extensions used:**
- `StarterKit` (paragraph, heading, bold, italic, code, etc.)
- `Underline`, `TextStyle`, `Color`, `Highlight`
- `TextAlign`, `ListItem`, `BulletList`, `OrderedList`
- `Link`, `Image`
- `Table`, `TableRow`, `TableHeader`, `TableCell`
- `Mathematics` (`@tiptap/extension-mathematics`) — renders KaTeX inline + block
- Custom `FontSize`, `LineHeight` (extend `TextStyle`)

**Math syntax inside editor:**
```
$x^2 + y^2 = z^2$        inline math
$$\int_0^\infty f(x)dx$$  block math
\ce{H2O + CO2 -> H2CO3}   chemistry (via \ce{})
```

### `MathContent`

Use this to **display** (not edit) HTML that came from `RichTextEditor`:

```tsx
import { MathContent } from '@/common/components/rich-text-editor'

<MathContent html={question.question} className="text-sm" />
```

Do not use `dangerouslySetInnerHTML` directly on editor HTML — math nodes will not render without the KaTeX preprocessing step that `MathContent` performs.

### `MathInsertModal`

Opened by the toolbar's Math / Chemistry buttons. Not used directly in application code.

---

## Query Keys

```ts
QK.questionBanks.all                    // ['questionBanks']
QK.questionBanks.list(userId?)          // ['questionBanks', 'list', userId?]
QK.questionBanks.questions(assessmentId) // ['questionBanks', 'questions', assessmentId]
QK.questionBanks.questionTypes()        // ['questionBanks', 'questionTypes']
```

Invalidate after any mutation:
```ts
queryClient.invalidateQueries({ queryKey: QK.questionBanks.list(userId) })
queryClient.invalidateQueries({ queryKey: QK.questionBanks.questions(assessmentId) })
```

---

## Constants

```ts
// src/config/constants/api.ts
ASSESSMENT_API.ADD_QUESTION   // 'assessment/addQuestion'
ASSESSMENT_API.BULK_IMPORT    // 'assessment/importQuestionsDetails'
ASSESSMENT_API.COURSE_SEARCH  // 'CourseLessonSearch'

// src/config/constants/entities.ts
ENTITIES.ASSESSMENT           // { name: 'Assessment', pk: 'assessmentId' }
ENTITIES.COURSE_QUESTION      // { name: 'CourseQuestion', pk: 'courseQuestionId' }
```
