# College ERP — Next.js Migration Progress

> Migration from Angular 11 + Spring Boot 2.0 → Next.js 16 + same Spring Boot (frozen).
> Backend is read-only. All changes are frontend only.

---

## Phase 11: Question Bank Module + Rich Text Editor (2026-04-09)

### Overview

Added the `assessments/question-bank` module and a full rich text editor component suite. Question banks are containers for typed exam questions (MC, TF, FB, SUB) with math/chemistry formula support. The editor integrates Tiptap, KaTeX, and MathLive for visual equation editing.

---

### New Component Suite: `src/common/components/rich-text-editor/`

A Tiptap-based rich text editor with math and chemistry formula support. Replaces Angular's TinyMCE integration.

#### `RichTextEditor.tsx`

Full-featured editor component.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | HTML content (controlled) |
| `onChange` | `(html: string) => void` | — | Called on every content change |
| `placeholder` | `string` | `'Type here… Use $…$ for math, \\ce{…} for chemistry'` | Placeholder text |
| `minHeight` | `number` | `200` | Min height in px |
| `compact` | `boolean` | `false` | Hides toolbar when true |
| `disabled` | `boolean` | `false` | Read-only mode |
| `className` | `string` | — | Additional CSS classes |

**Key features:**
- Custom Tiptap extensions: `FontSize` and `LineHeight` (both extend `TextStyle`)
- Formatting: bold, italic, underline, strikethrough, text/background color, alignment, indent, bullet/numbered lists, line-height
- Media: link insertion (via `window.prompt`), image upload (base64 via FileReader), 3×3 table insertion
- Math/chemistry: `@tiptap/extension-mathematics` renders KaTeX inline (`$…$`) and block (`$$…$$`) math; `\ce{…}` renders chemistry via mhchem

#### `RichTextToolbar.tsx`

Toolbar UI that pairs with `RichTextEditor`. Accepts the Tiptap `Editor` instance as its only prop. Uses `onMouseDown` with `preventDefault()` on all buttons to prevent editor blur during interaction.

Controls: Undo/Redo · Font family (5 options) · Font size (8pt–96pt) · Bold/Italic/Underline/Strikethrough · Text color · Highlight color · Alignment (4) · Indent/Outdent · Lists · Line height · Link · Image upload · Table · Math button · Chemistry button.

Math and Chemistry buttons open `MathInsertModal`.

#### `MathContent.tsx`

Renders stored rich-text HTML containing Tiptap-serialized math nodes with live KaTeX rendering. Used wherever question/option HTML needs to be displayed (not edited).

**How it works:** `useMemo` preprocesses the HTML string with regex to find `data-type="inline-math"` and `data-type="block-math"` nodes, injects KaTeX-rendered HTML, then renders via `dangerouslySetInnerHTML`. Runs synchronously (no `useEffect`) — prevents accordion flicker on expand.

Decodes HTML entities (`&amp;`, `&quot;`, `&#39;`, `&lt;`, `&gt;`) in `data-latex` attributes before rendering.

**Props:** `html: string`, `className?: string`

#### `MathInsertModal.tsx`

Visual equation editor modal using MathLive for formula input and KaTeX for live preview.

**Props:** `open`, `onClose`, `onInsert(latex)`, `defaultMode?: 'math' | 'chemistry'`

**Features:**
- Math vs. Chemistry tabs
- MathLive `<math-field>` web component (dynamically imported) — degrades to plain textarea if unavailable
- Live KaTeX preview with error display
- **Math symbol palettes:** Powers & Roots, Greek Letters, Relations, Operators, Calculus, Arrows
- **Chemistry palettes:** Common Molecules, Reaction Arrows, States, Charges
- Insert as Inline (`$…$`) or Block (`$$…$$`) for math; chemistry always inserts as `\ce{…}`
- `onInteractOutside` prevented so MathLive virtual keyboard clicks don't dismiss the dialog

**Virtual keyboard:** Controlled via `window.mathVirtualKeyboard` — shown on open, hidden on close.

#### `index.ts`

Exports: `RichTextEditor`, `RichTextEditorProps`, `MathContent`.

**Import:**
```ts
import { RichTextEditor, MathContent } from '@/common/components/rich-text-editor'
```

---

### New Pages: `assessments/question-bank/`

#### `page.tsx` — Question Bank List

Admin CRUD page for managing question bank containers.

- **DataTable** (AG Grid) with columns: SI.No, Name, Description, Created Date, Status, Question count, Actions
- **Client search** — filters by name or description (case-insensitive)
- **Role-aware fetch** — ADMIN sees all banks; other roles see only their own (filtered by `userId`)
- **Actions per row:**
  - Edit bank → opens `QuestionBankModal`
  - View questions → opens `QuestionsListDrawer`
  - Add Question → navigates to `add-question/` page
  - Import from Excel → hidden file input → `importQuestionsFromExcel()` → loops `addOrUpdateQuestion()` per question
- **Header:** Template download link, "Add Question Bank" button
- **Data source:** `listQuestionBanks(userId?)` from `src/services/admin/question-bank.ts`

#### `QuestionBankModal.tsx` — Create / Edit Question Bank

Form modal for creating or editing a question bank container.

**Fields:** Assessment Name · Assessment No · Description · Is Active + Reason · Is Public · Link to Online Course (toggle) · Course search (debounced 300ms) → Lesson → Topic (cascading)

**Cascading course selection:**
1. "Link to Online Course" toggle shows course search
2. `searchCourses(term)` populates course dropdown (debounced)
3. Course selection → populate lessons from `courseLessonDTOs`
4. Lesson selection → populate topics from `courseLessonTopicDTOs`
5. Unchecking clears all downstream selections

**API calls:** `searchCourses`, `createQuestionBank` or `updateQuestionBank`

#### `QuestionsListDrawer.tsx` — View Questions in a Bank

Modal displaying all questions in a bank as expandable accordion items.

- Question header shows: type badge (MC=blue, TF=green, FB=yellow, SUB=purple), marks, status badge, truncated question text via `MathContent`
- Expanded shows: full options/answer, edit & delete buttons
- Options labeled A/B/C…; correct answer highlighted in green
- Subjective questions show explanation in muted box
- `MathContent` used for rendering HTML question text and option HTML

**Known issue documented in code:** Delete (soft-delete via `isActive=false`) fails with "Duplicate question found" because the backend duplicate-check runs before the save even when updating by `courseQuestionId`. Backend fix required.

#### `add-question/page.tsx` — Add / Edit a Single Question

Full-page editor for creating or editing one question within a bank.

**URL params:** `assessmentId` (required), `assessmentQuestionId` (optional, edit mode), `permission`, `page` (return URL)

**Question types:**

| Type | Code | Answer format |
|---|---|---|
| Multiple Choice | MC | 5 option rows with `RichTextEditor` + correct answer checkboxes |
| True / False | TF | Radio buttons (True / False) |
| Fill in the Blank | FB | Dynamic text inputs for accepted answers |
| Subjective | SUB | Optional plain textarea for explanation/marking guide |

**Key behaviors:**
- Type buttons disabled when editing (type cannot be changed after creation)
- Question body: `RichTextEditor` with math/chemistry support
- Marks: number input (step 0.5)
- On submit: validates question text and marks, calls `addOrUpdateQuestion()`, invalidates cache, redirects to return page

**API calls:** `listQuestionTypes()` (staleTime: Infinity), `listQuestionsByBank(assessmentId)` (for edit-mode pre-fill), `addOrUpdateQuestion(payload)`

---

### New Service: `src/services/admin/question-bank.ts`

| Function | Method | Description |
|---|---|---|
| `listQuestionBanks(userId?)` | `domainList` | List all banks; filter by userId for non-admin |
| `createQuestionBank(data)` | `domainCreate` | Create new bank |
| `updateQuestionBank(id, data)` | `domainUpdate` | Update existing bank |
| `listQuestionsByBank(assessmentId)` | `domainList` | Fetch `assessmentQuestionDTOs` for a bank |
| `addOrUpdateQuestion(payload)` | raw `fetch` POST | Specialized endpoint — not standard domain/create |
| `importQuestionsFromExcel(id, file)` | raw `fetch` POST (multipart) | Bulk-import questions from Excel |
| `searchCourses(term)` | `domainList` | Search `CourseLessonSearch` for modal dropdown |
| `listQuestionTypes()` | `domainList` | Fetch MC/TF/FB/SUB types from GeneralDetail |

**Note on raw fetch calls:** `addOrUpdateQuestion` and `importQuestionsFromExcel` use raw `fetch()` because they target specialized Spring Boot endpoints (`assessment/addQuestion`, `assessment/importQuestionsDetails`) that require custom payloads not handled by the generic `postDetails`/`uploadFile` helpers. A future pass should migrate these to `crud.postDetails` and `crud.uploadFile` respectively.

---

### New Constants

**`src/config/constants/api.ts`** — `ASSESSMENT_API`:
```ts
ASSESSMENT_API.ADD_QUESTION      // 'assessment/addQuestion'
ASSESSMENT_API.BULK_IMPORT       // 'assessment/importQuestionsDetails'
ASSESSMENT_API.COURSE_SEARCH     // 'CourseLessonSearch'
```

**`src/config/constants/entities.ts`** — added:
```ts
ENTITIES.ASSESSMENT       // { name: 'Assessment', pk: 'assessmentId' }
ENTITIES.COURSE_QUESTION  // { name: 'CourseQuestion', pk: 'courseQuestionId' }
```

**`src/lib/query-keys.ts`** — added:
```ts
QK.questionBanks.all
QK.questionBanks.list(userId?)
QK.questionBanks.questions(assessmentId)
QK.questionBanks.questionTypes()
```

**`src/types/question-bank.ts`** — new type file: `Assessment`, `AssessmentQuestion`, `CourseQuestion`, `CourseQuestionOption`, `OnlineCourse`, `CourseLesson`, `CourseLessonTopic`, `QuestionType`, `QuestionBankFormValues`.

---

### Layout and Shell Updates (same commit)

**`src/components/layout/NavItem.tsx`** — Added comprehensive Material Design → Lucide icon mapping (500+ entries). Handles multi-format CSS class names (`fa fa-graduation-cap`, `icon-dashboard`, etc.) by stripping prefixes and resolving to Lucide icons.

**`src/components/layout/Sidebar.tsx`** — Added:
- Auto-scroll to active nav item on pathname change (waits 160ms for Collapsible animation to settle, then scrolls active item into center view)
- Debug visibility filter — recursively removes `hiddenIds` from nav tree (debug mode only)
- Search scroll-reset behavior on open/close

**`src/components/layout/Topbar.tsx`** — Added backend-driven global search:
- On mount, fetches all accessible pages from `AUTH_API.USER_ACCESS`
- Filters results by `displayName` prefix (up to 8 results)
- Full keyboard navigation: ArrowUp/Down cycle results, Enter navigates, Escape clears
- Loading spinner (`Loader2`) during page fetch
- Full ARIA combobox pattern: `aria-expanded`, `aria-haspopup`, `aria-owns`, `aria-activedescendant`, `aria-autocomplete`
- Role-based avatar background colors (ADMIN=red, PRINCIPAL=purple, STAFF=blue, STUDENT=green, PARENT=amber)

**`src/app/layout.tsx`** — Added KaTeX CSS import (`katex/dist/katex.min.css`) for math rendering in question bank and anywhere `MathContent` is used.

**`src/app/globals.css`** — Added extensive custom tokens and animations:
- `--sidebar-*` color tokens (sidebar-background: slate-900, sidebar-foreground: slate-400, etc.)
- oklch-format status colors: `--color-status-active/inactive/pending/draft/published`
- Feedback colors: `--color-success/warning/error/info`
- Data display colors: `--color-table-header-bg/row-hover/row-stripe`
- Spacing tokens: `--spacing-page-x/y`, `--spacing-card-x/y`
- Typography scale tokens: `--font-size-page-title/section-title/label/caption`
- Shadow tokens including `--shadow-primary` (cyan glow)
- Keyframes: `shimmer`, `fade-up`, `fade-in`, `slide-in-left`, `scale-in`, `spin-smooth`, `bounce-dots`, `pulse-ring`, `bar-grow`, `progress`, `login-card-in`, `field-in`
- Custom utilities: `.scrollbar-sidebar`, `.scrollbar-thin`, `.skeleton-shimmer`, `.stagger-children`, `.fl-label`/`.fl-input` (floating label pattern), AG Grid theme overrides

---

## Phase 10: Build Fixes — TypeScript Errors, Node Version, Missing Types (2026-03-31)

### Overview

Resolved all TypeScript build errors accumulated during the Phase 7–9 foundation migration. Pinned the Node runtime version and added missing stubs so `tsc --noEmit` passes cleanly.

### Changes

| Fix | File | Detail |
|---|---|---|
| Pin Node 20 | `.nvmrc` | Was running on Node 16 which broke native binary installs (AG Grid, PDF.js). Pin to `20`. |
| Add `sonner` dependency | `package.json` | `lib/toast.ts` imported from `sonner` but it was missing from dependencies. |
| `CollegeWiseFilterRow`, `Regulation` types | `src/types/exam-master.ts` | New type file — required by `useCollegeFilters` and the examination module. |
| `useCollegeFilters` hook stub | `src/hooks/useCollegeFilters.ts` | Cascading University → Course → Regulation filter state. Currently returns empty arrays — wired up once the examination module is restored from `todo/`. |
| `CampusModal` + `OrganizationModal` | `watch('reason') ?? ''` | `watch()` returns `string \| undefined`; form controlled inputs require `string`. Added nullish coalescing. |
| `Sidebar` timeout ref | `useRef<ReturnType<typeof setTimeout> \| undefined>(undefined)` | Explicit type annotation to satisfy strict mode. |
| `crud.ts` return types | `body.data as T` on all return sites | `ApiResponse<T>.data` is `T \| null` — added cast where required. |
| Exclude `todo/` from TS | `tsconfig.json` | The `todo/` directory contains WIP modules with unresolved imports. Excluded from type-checking. |

### `src/hooks/useCollegeFilters.ts`

Stub hook for the examination module's cascading college filter. Returns:
- `isLoading: boolean`
- `universities`, `selectedUniversityId`, `setUniversityId`
- `courses`, `selectedCourseId`, `setCourseId`
- `regulations`, `selectedRegulationId`, `setRegulationId`

Options: `{ withRegulations?: boolean; autoSelectFirst?: boolean }` — accepted but not yet acted on.

**Status:** Data fetching not implemented. Returns empty arrays until the examination module is restored and `src/services/examination/` services are wired in. See `todo/examination-module/RESTORE.md`.

---

## Phase 9: Evaluation Module — Full Implementation + Service Layer Compliance Audit (2026-04-10 → 2026-04-11)

### Overview

Built the complete evaluation module from scratch: three layered pages (Evaluator Subjects → Answer Sheets → Marking), an evaluation dashboard, a new shared `EvalStatusBadge` component, and the full `evaluation.ts` service. After implementation, a service-layer compliance audit caught and fixed four structural violations (raw `fetch()` calls, duplicated utilities) and added a missing `putDetails` helper to the `CrudService`.

---

### New Pages

#### `admin-examination-management/evaluation-process/evaluator-subjects/`

**File:** `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluator-subjects/page.tsx`

Dashboard for an evaluator's assigned subjects. Entry point to the evaluation workflow.

- **Stats strip** — 3 `StatCard`s: Total Subjects / Papers Evaluated / Pending Papers — aggregated across all assigned subjects.
- **Subject cards** — one card per assigned subject, sorted by urgency: `pending → in-progress → completed`. Each card shows:
  - Subject name, subject code, course name
  - Deadline with urgency detection (`overdue` / `soon` / `normal` / `none`) — overdue and soon dates render in red/amber with an `AlertTriangle` icon
  - Stats mini-row: Assigned / Done / Pending counts
  - Progress bar: `Math.round((completed / assigned) * 100)%`, colored emerald at 100%, blue when partial
  - Status-colored left border accent: amber = pending, blue = in-progress, emerald = completed
  - CTA button label adapts: "Start Evaluation" / "Continue" / "View"
- **Navigation** — clicking a card pushes to `answer-sheets/` with `examEvaluatorProfileId`, `examEvaluatorProfileDetId`, `subjectName`, `subjectCode` as query params.
- **Data source** — `getEvaluatorDashboard(userId)` from `src/services/evaluation.ts`.

---

#### `admin-examination-management/evaluation-process/evaluator-subjects/answer-sheets/`

**File:** `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluator-subjects/answer-sheets/page.tsx`

Lists all answer papers for a chosen subject. Second layer of the evaluation workflow.

- **Stats strip** — 4 `StatCard`s: Assigned / Evaluated / Pending / Rejected & UFM.
- **Filter tabs** — All / To Do / In Progress / Done / Rejected, with live per-tab counts. `matchesTab()` maps tab keys to `EVAL_STATUS` codes.
- **Search** — `SearchInput` filters by OMR serial number (client-side, instant).
- **Table** — uses the standard `Table` component from `@/common/components/table` (not a custom hand-rolled list). Column definitions follow the CLAUDE.md pattern:
  - Pure renderer functions outside the component (`serialRenderer`, `statusRenderer`, `marksRenderer`)
  - `makeActionRenderer(navigate)` factory for the one renderer that closes over page state
  - Assembled in `useMemo` inside the component
  - `pageSize={0}` disables pagination (30–60 rows, no pagination needed)
- **Status column** — uses `EvalStatusBadge` from `@/common/components/data-display`.
- **Action column** — "Evaluate" / "Continue" button for actionable rows; `CheckCircle2` / `XCircle` icon for done/rejected.
- **Progress bar footer** — emerald bar showing evaluated/total as a percentage, with in-progress / not-started / rejected sub-counts.
- **Navigation** — clicking a row (or button) pushes to `marking/` with `examEvaluationAssignmentId`, `studentAnswerPaperId`, `examEvaluatorProfileId`, `examEvaluatorProfileDetId`, `subjectName`, `subjectCode`.
- **Data source** — `getStudentAnswerPapers(examEvaluatorProfileId, examEvaluatorProfileDetId)` from `src/services/evaluation.ts`.

---

#### `admin-examination-management/evaluation-process/evaluator-subjects/marking/`

**Files:**
- `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluator-subjects/marking/page.tsx` — thin shell, dynamically imports `marking-content.tsx` with `ssr: false` to prevent PDF.js from running server-side (it calls browser-only `DOMMatrix` at module load time).
- `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluator-subjects/marking/marking-content.tsx` — all logic.

Full PDF annotation and marking tool. See `docs/marking-page-flow.md` for complete user-flow documentation.

**Key capabilities:**
- **PDF rendering** — `react-pdf` (PDF.js) with a temp-canvas isolation pattern to prevent canvas transform bleed between pages.
- **Stamp placement** — click a mark button in the question panel to drop a stamp on the PDF canvas at the last-clicked position. Stamps are rendered as cyan-600 rounded squares with the mark value in bold white.
- **Stamp drag-to-move** — hover a stamp to reveal a Move + Delete popup. Drag the stamp to a new position; drop recalculates coordinates from a fresh `getBoundingClientRect()` on mouseup to account for scroll.
  - Drag ghost: `position: absolute` inside the canvas wrapper (not `fixed`) — avoids coordinate offset caused by CSS `transform` on ancestor sidebar elements.
  - Ghost is live-positioned from `dragState.canvasRect` refreshed on every `mousemove`.
- **Stamp delete** — trash icon in the popup; calls `deleteEvalMark()` and removes from local state.
- **Question panel** — collapsible sidebar showing all questions grouped by PART. Mark buttons auto-generated from `maxMarks` and `marksInterval` via `buildMarkButtons()`. Supports Not Answered toggle.
- **Timer** — elapsed seconds tracked via a `setInterval` ref, displayed as HH:MM:SS, paused when the paper is locked.
- **Lock state** — paper is locked when `evaluationStatusCatDetId` is Evaluated / Finalized / Rejected / UFM. Locked papers are read-only (no stamps, no mark changes).
- **Finalize flow** — validates all questions are answered → saves PDF annotations → calls `addFinalEvalPapers`, `updateEvalAssignment`, `saveFinalEvalPdf`, `finalizeEvalMarks`, `updateEvalsCompletedCount` in sequence → navigates back.
- **Reject / UFM flow** — confirmation dialog collects reason, calls `rejectEvalAssignment()` / `ufmEvalAssignment()`, navigates back.
- **Zoom** — 5 steps from 0.5× to 2.0×; PDF canvases re-render at each zoom level.
- **Data sources** — `getExamQpDraftMarks`, `getAnswerPaperBase64`, `getEvalSetting`, all from `src/services/evaluation.ts`.

---

#### `dashboards/evaluation-dashboard/`

**File:** `src/app/(pages)/(protected)/dashboards/evaluation-dashboard/page.tsx`

Simpler evaluation overview dashboard — grid of subject cards, each showing assigned/evaluated/pending counts and a "Check Paper" button. Predates the evaluator-subjects page; the evaluator-subjects page supersedes it for the full evaluation workflow.

---

### New Service: `src/services/evaluation.ts`

Single file covering all evaluation API calls. All calls route through `/api/proxy/` — never calls Spring Boot directly.

**EVAL_STATUS constants:**

| Constant | Value | Meaning |
|---|---|---|
| `EVAL_STATUS.NEW` | 626 | Not yet opened |
| `EVAL_STATUS.ASSIGNED` | 627 | Assigned to evaluator |
| `EVAL_STATUS.IN_PROGRESS` | 628 | Evaluator has opened |
| `EVAL_STATUS.EVALUATED` | 629 | Marked and submitted |
| `EVAL_STATUS.FINALIZED` | 631 | Final marks confirmed |
| `EVAL_STATUS.REJECTED` | 632 | Rejected by evaluator |
| `EVAL_STATUS.UFM` | 633 | Unfair Means flagged |

**Exported functions:**

| Function | Method | Description |
|---|---|---|
| `getEvaluatorDashboard(userId)` | `getAllRecords` proc | Lists all assigned subjects for an evaluator |
| `getStudentAnswerPapers(profileId, detId)` | `getAllRecords` proc | Lists all answer papers for a subject assignment |
| `getExamQpDraftMarks(params)` | `getAllRecords` proc | Returns `[QuestionMark[], EvalAssignmentDetail]` for the marking page |
| `getAnswerPaperBase64(studentAnswerPaperId)` | raw `fetch` ⚠️ | Fetches PDF as base64 — raw fetch because the backend returns `res.text()` not a standard JSON envelope |
| `getEvalSetting(orgId, code)` | `domainList` | Fetches a general setting value (e.g. PDF page range) |
| `updateEvalAssignmentStartDate(id, date)` | `putDetails` | Records when evaluator first opens a paper |
| `updateEvalAssignment(id, data)` | `putDetails` | Saves evaluation progress or submits final status |
| `saveStudentEvalPages(pages)` | `crud.postDetails` | Saves mark annotations (stamp positions, marks) for all pages |
| `addFinalEvalPapers(data)` | `crud.postDetails` | Marks evaluation complete, links evaluated paper |
| `updateEvalsCompletedCount(detId)` | `putDetails` | Increments evaluator's completed count |
| `saveFinalEvalPdf(data)` | `crud.postDetails` | Saves path of the final annotated PDF |
| `finalizeEvalMarks(assignmentId)` | `crud.getAllRecords` proc | Runs `exam_questionpaper_finalmarks_update` stored procedure |
| `rejectEvalAssignment(id, data)` | `domainUpdate` | Sets assignment status to Rejected |
| `ufmEvalAssignment(id, data)` | `domainUpdate` | Sets assignment status to UFM |
| `deleteEvalMark(assignmentId, marksId)` | `crud.getAllRecords` proc | Runs `delete_question` stored procedure |
| `isEvalLocked(statusId)` | pure function | Returns true when the status is Evaluated / Finalized / Rejected / UFM |
| `evalStatusLabel(statusId)` | pure function | Maps a status code to a human-readable label |

**Key types exported:** `EvaluatorDetail`, `StudentAnswerPaper`, `QuestionMark`, `EvalAssignmentDetail`, `ExamQuestionPaper`, `EvalPagePayload`.

---

### New Shared Component: `EvalStatusBadge`

**File:** `src/common/components/data-display/EvalStatusBadge.tsx`
**Export:** `src/common/components/data-display/index.ts`

A reusable status badge for evaluation-specific status codes. Renders a colored dot + label inside a rounded-full border span.

```tsx
<EvalStatusBadge statusId={row.evaluationStatusCatDetId} />
```

**Status → color mapping:**

| Status | Dot | Badge |
|---|---|---|
| New | `bg-blue-400` | blue-50 / blue-700 |
| Assigned | `bg-blue-500` | blue-50 / blue-700 |
| In Progress | `bg-amber-500` | amber-50 / amber-700 |
| Evaluated | `bg-emerald-500` | emerald-50 / emerald-700 |
| Finalized | `bg-teal-500` | teal-50 / teal-700 |
| Rejected | `bg-red-500` | red-50 / red-700 |
| UFM | `bg-purple-500` | purple-50 / purple-700 |

Falls back to a slate style for unknown status codes.

Used in: `answer-sheets/page.tsx`. Do not inline badge spans for evaluation status anywhere — always use this component.

---

### `crud.ts` — Added `putDetails`

**File:** `src/services/crud.ts`

Added `putDetails<T>(path, data, params?)` to `CrudService` and exported a standalone wrapper.

**Why:** The existing `crud` API covered `GET` (via `fetchDetails`), `POST` (via `postDetails`), file upload (`uploadFile`), and domain `PUT` (`domainUpdate` for `domain/update/{Entity}`). But several evaluation endpoints use custom `PUT` paths that are not the standard domain-update pattern. There was no generic `putDetails` — so callers were falling back to raw `fetch()`, bypassing the service layer.

```ts
// Usage
await putDetails(EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS, data, { examEvaluationAssignmentId })

// Signature
putDetails<T = void>(
  path: string,
  data: unknown,
  params?: Record<string, string | number>,
): Promise<T>
```

`params` are appended as query-string key=value pairs. Handles both empty-body and JSON-body responses gracefully.

---

### Service Layer Compliance Audit

After the evaluation module was built, an audit of all uncommitted files against the project rules identified four violations:

#### 1. Raw `fetch()` PUT calls in `evaluation.ts` → fixed with `putDetails`

Three functions were calling `fetch()` directly with `method: 'PUT'` instead of using the service layer, because `putDetails` didn't exist yet. After adding `putDetails` to `crud.ts`, all three were replaced:

| Function | Before | After |
|---|---|---|
| `updateEvalAssignmentStartDate` | `fetch('/api/proxy/...', { method: 'PUT', ... })` | `putDetails(EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS_START_DATE, data, { examEvaluationAssignmentId })` |
| `updateEvalAssignment` | `fetch('/api/proxy/...', { method: 'PUT', ... })` | `putDetails(EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS, data, { examEvaluationAssignmentId })` |
| `updateEvalsCompletedCount` | `fetch('/api/proxy/...', { method: 'PUT', ... })` | `putDetails(EXAM_EVAL_API.UPDATE_EVALS_COMPLETED_COUNT, { examEvaluatorProfileDetId })` |

`getAnswerPaperBase64` is the **one legitimate exception**: the backend returns `res.text()` (a raw JSON-encoded string), not a standard `ApiResponse<T>` envelope. `crud.fetchDetails` calls `res.json()` which would fail. The raw `fetch()` is kept with a comment explaining this.

#### 2. `formatDate` duplicated across 3 files → moved to `generic-functions.ts`

`formatDate(dateStr)` (DD/MM/YYYY formatter) was copied identically into:
- `evaluator-subjects/page.tsx`
- `answer-sheets/page.tsx`
- `dashboards/evaluation-dashboard/page.tsx`

Moved the canonical implementation to `src/common/generic-functions.ts` and updated all three pages to import from `@/common/generic-functions`.

#### 3. `htmlToPlaintext` defined inline in `marking-content.tsx` → moved to `generic-functions.ts`

A generic HTML-to-plaintext stripper (removes tags, decodes `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`) was defined locally inside the marking page. Moved to `src/common/generic-functions.ts` and updated the import.

#### 4. `answer-sheets/page.tsx` used hand-rolled list rows instead of `Table`

The initial implementation hand-rolled a `<div>`-based column header and per-row layout (`PaperRow` component) instead of using the standard `Table` component from `@/common/components/table`. Refactored to use `Table` with proper column definitions following the CLAUDE.md column pattern (pure renderers outside component, factory for state-dependent renderers, assembled in `useMemo`).

---

### `generic-functions.ts` — New Utilities

**File:** `src/common/generic-functions.ts`

Two new exports added:

```ts
/** Format a date string as DD/MM/YYYY. Returns '—' for null/undefined. */
export function formatDate(dateStr: string | null | undefined): string

/** Strip HTML tags and decode common HTML entities to plain text. */
export function htmlToPlaintext(html: string): string
```

These are the canonical implementations — all code in this project that needs DD/MM/YYYY date formatting or HTML plaintext conversion must import from here.

---

### `api.ts` — New `EXAM_EVAL_API` Constants

**File:** `src/config/constants/api.ts`

Added `EXAM_EVAL_API` constant group covering all evaluation Spring Boot endpoint paths. These are used exclusively through `src/services/evaluation.ts` — never referenced directly in page files.

---

## Phase 8: UI Polish, SearchInput Improvements & Angular Parity Fixes (2026-03-30)

### Breadcrumbs

Added breadcrumb navigation to every protected page.

- **`PageHeader`** — imports `useBreadcrumb` + `Breadcrumb` and renders the trail automatically above the title. All pages using `PageHeader` (Organizations, Campus, and all future pages) get breadcrumbs for free.
- **`dashboard/page.tsx`** — Dashboard uses a custom welcome header instead of `PageHeader`, so breadcrumbs were added directly via `useBreadcrumb`.
- The `useBreadcrumb` hook auto-generates the trail from the URL path (strips route groups, converts kebab-case to Title Case). No per-page configuration needed.

---

### Topbar: Search → Collapsible Icon Button

Replaced the always-visible search input on the left side of the Topbar with a search icon button in the right icon group (alongside bell, apps, help).

- Default state: search icon button only.
- On click: expands to a focused input (`w-56`) with the same live-search dropdown behaviour as before.
- Collapse triggers: clicking outside, pressing `Escape`, or navigating to a result.
- Added `isSearchExpanded` state; `openSearch()` sets it and focuses the input via `setTimeout`.

---

### SearchInput Component — 3 improvements

**File:** `src/common/components/search/SearchInput.tsx`

#### 1. Fixed controlled-mode display lag
`displayValue` was bound to the debounced parent `value` prop, making every keystroke lag by the debounce delay before appearing. Fixed by always using `localValue` for display — the input is instant, debounce only throttles the `onChange` callback to the parent.

#### 2. `collapsible` prop
When `collapsible={true}`, renders as a plain icon button. Click expands to the full input with auto-focus. Blur on empty value or `Escape` collapses back to the icon.

```tsx
<SearchInput collapsible value={q} onChange={setQ} placeholder="Search..." />
```

#### 3. `serverSearch` prop — zero debounce by default
Default debounce changed from 300 ms to **0 ms** (instant). Pass `serverSearch` to opt into 300 ms debounce for API-backed searches.

```tsx
// Client-side filter — instant (default)
<SearchInput value={q} onChange={setQ} />

// Server/API search — 300 ms debounce
<SearchInput serverSearch value={q} onChange={setQ} />
```

---

### Angular Parity Audit: Campus & Organizations

Cross-checked both pages against `college_erp_angular_foundation_work` and `college_erp_angular_old`.

#### Campus — ✅ Full parity confirmed
Columns, form fields, validations, cascading dropdowns, and API calls all match across all three codebases.

#### Organizations — 3 gaps fixed

| Gap | Angular source | Fix applied |
|---|---|---|
| Mobile number validation | `Validators.pattern('[6-9]{1}[0-9]{9}')` | Added Zod `.refine()` with `/^[6-9][0-9]{9}$/` |
| Email validation | `Validators.email` | Added Zod `.refine()` with standard email regex |
| License date range | `calDays()` — resets To date if before From date | Added `useEffect` watching `licenseFdate`; auto-sets `licenseTdate = licenseFdate` when violated |

**Banner logo** — The old repo had a banner logo upload field in the Add modal HTML, but it was never wired to any API endpoint, not present in the Organization model, and absent from the Edit modal. Field was **not added** to Next.js.

---

## Phase 7: Angular Foundation Structure Migration (2026-03-29)

Migrated Angular's `src/app/common/` structure into the Next.js project as `src/common/`, providing shared constants, utility functions, and reusable chart/form/table components that mirror the original Angular foundation layer.

### New `src/common/` Directory

Mirrors Angular's `src/app/common/` structure. Contains project-wide constants, utility functions, and reusable presentational components.

#### Constant Files (`src/common/`)

| File | Purpose |
|---|---|
| `constants.ts` | Core application-wide constants (API base paths, pagination defaults, app name) |
| `general-constants.ts` | Domain constants: roles, status codes, academic year formats, exam-related enums |
| `alias-labels.ts` | Human-readable label mappings for entity field names (mirrors Angular alias map) |
| `generic-functions.ts` | Shared utility functions: date formatting, string helpers, data transformations |
| `print-config.ts` | Print layout configuration for PDF/print views |

#### New `src/common/components/`

| Component | Angular equivalent | Notes |
|---|---|---|
| `bar-chart/` | `BarChartComponent` | Recharts `BarChart` (replaces Highcharts) |
| `pie-chart/` | `PieChartComponent` | Recharts `PieChart` (replaces Highcharts) |
| `breadcrumb/` | `BreadcrumbComponent` | Path-based breadcrumb trail |
| `search/` | `SearchComponent` | Controlled search input with debounce |
| `select/` | `SelectComponent` | Labeled dropdown wrapping Shadcn Select |
| `date-picker/` | `DatePickerComponent` | Date input backed by Radix Popover + Calendar |
| `table/` | `TableComponent` | Generic data table (lightweight, non-AG Grid) |
| `theme-setting-modal/` | `ThemeSettingModalComponent` | Theme/appearance preferences modal |

#### New Pages

| Route | Notes |
|---|---|
| `admin/organizations` | Organization management page |
| `admin/campus` | Campus management page |
| `dashboards/evaluation-dashboard` | Evaluation statistics dashboard using chart components |
| `evaluation/*` | Evaluation module pages |
| `pdf-download` | PDF download/export page |
| `sample` | Component showcase / developer reference page |

### Tech Added

- **recharts** — used by `bar-chart` and `pie-chart` components as an OSS replacement for Highcharts (which requires a commercial licence). API differs from Highcharts; see `src/common/components/bar-chart/` and `pie-chart/` for the props interface.

---

## Phase 6 — QueryDSL Field Audit vs Angular Source (2026-03-29)

Cross-checked all service `buildQuery` calls against the Angular `CrudService` and component source code to find field names, relationship paths, and sort fields that diverged from the original. Four bugs fixed.

### Fixes

| Service | Issue | Angular source | Fix applied |
|---|---|---|---|
| `exam-grade.service.ts` | Wrong flat field names in query | `Course.courseId`, `Regulation.regulationId`, `disabled` | Changed `courseId`→`Course.courseId`, `regulationId`→`Regulation.regulationId`, `isForDisabled`→`disabled` |
| `exam-grade.service.ts` | Extra `universityId` filter Angular never sent | Not in Angular call | Removed from service signature + conditions |
| `exam-max-marks.service.ts` | Wrong boolean field name | Angular uses `disabled` (entity field); `isForDisabled` is the form field only | Changed `isForDisabled`→`disabled` in `buildQuery` |
| `invigilator-remuneration.service.ts` | Sort by PK instead of `createdDt` | `order(createdDt=desc)` | Changed `examInvgRemunerationId`→`createdDt` |
| `revaluation-fee.service.ts` | Sort by PK instead of `createdDt` | `order(createdDt=desc)` | Changed `examFeeStructureId`→`createdDt` |

### What was confirmed correct

| Service | Angular | Next.js | Status |
|---|---|---|---|
| `exam-master.service.ts` | `Universities.universityId`, `Course.courseId`, `AcademicYear.academicYearId` | Same relationship paths | ✓ |
| `exam-session.service.ts` | `order(createdDt=desc)`, `size=99999` | `order(createdDt=DESC)`, `size=99999` | ✓ |
| `exam-max-marks.service.ts` | `Course.courseId`, `Regulation.regulationId` | Same | ✓ |
| `exam-timetable.service.ts` | No `size` on custom `/examtimetabledetails` endpoint | No `size` (raw fetch, not `domainList`) | ✓ |
| `seating-plan.service.ts` | All records, no exam filter | Filter by `ExamMaster.examId` + `isActive==true` | Intentional improvement (Angular loaded all records) |
| `exam-fee-setup.service.ts` | Stored proc params (15 fields) | Same 15 fields | ✓ |
| `crud.service.ts` `domainList` | `size=99999` on domain/list calls | `size=99999` always | ✓ |

### Key Angular convention confirmed

The Spring Boot entity `ExamGrade` / `ExamMarkssetup` uses **`disabled`** as the boolean field name (Java entity), while Angular's form binds it to **`isForDisabled`**. QueryDSL filters must use the entity field name (`disabled`), not the form field name. This distinction applies to any entity with a `disabled` / `isForDisabled` field mismatch.

---

## Phase 5 — Refactoring & Code Quality (2026-03-29)

### New Shared Utilities

#### `src/lib/utils.ts` — `distinct<T>()`
Added the `distinct<T>(arr, keyFn)` deduplication helper. Was copy-pasted verbatim into 6 page files; now lives in one place and is imported everywhere.

#### `src/hooks/useCollegeFilters.ts` — cascading filter hook
New custom hook that encapsulates the University → Course → Regulation cascade used by all filter-bearing exam pages.

```typescript
const filters = useCollegeFilters({ withRegulations: true })
// filters.universities, filters.courses, filters.regulations
// filters.selectedUniversityId, filters.setUniversityId, ...
```

- Uses `getCollegeFilters(orgId, empId)` for University/Course data (shared `'college-filters'` TanStack Query cache key)
- Loads regulations lazily via `getRegulations(courseId)` (keyed `['regulations', courseId]`)
- Auto-selects first item in each list on load
- `staleTime: 5 min` on both queries

#### `src/components/forms/CollegeFilterPanel.tsx` — filter panel component
Renders the standard University → Course → Regulation filter grid from `useCollegeFilters` state. Regulation and "For Disabled Students" sections are opt-in (only rendered when the caller passes the corresponding props). Accepts a `children` slot for page-specific extra filters.

### Pages Refactored

| Page | Change | Line delta |
|---|---|---|
| `grade-setup/page.tsx` | Replaced ~140 lines of filter state + cascade logic + panel JSX with `useCollegeFilters` + `CollegeFilterPanel` | 387 → 202 (−48%) |
| `exam-max-marks-setup/page.tsx` | Same; also migrated regulation source from stored-proc bundle to `getRegulations(courseId)` | 394 → 226 (−43%) |
| `exam-timetable/page.tsx` | Removed local `distinct` copy, imported from `lib/utils` | −10 lines |
| `exam-fee-setup/page.tsx` | Same; also unified `'college-filters-fee'` cache key → `'college-filters'` | −10 lines |
| `exam-master/page.tsx` | Removed local `distinct` copy | −10 lines |
| `seating-plan-setup/page.tsx` | Removed local `distinct` copy | −10 lines |
| `invigilator-remuneration/page.tsx` | Replaced raw `<button className="...">` with `<Button size="sm" variant>`; added `PlusIcon` to header button | |

### Bug Fixes

- **`saveMarksSetup` (`&&` → `||`)** in `exam-max-marks.service.ts` — was using logical AND so a response with `success: false` but `statusCode: 200` would silently pass as successful. Fixed to `||`.

### Service Layer Cleanup

- **`exam-fee-setup.service.ts` `getExamFilters()`** — replaced raw `fetch` + manual `URLSearchParams` + manual error handling with `getAllRecords('s_get_exam_filters_bycode', ...)` from `crud.service`. Removed local `SpringProcResponse<T>` interface that duplicated the standard response shape.
- **`exam-timetable.service.ts`** — removed dead `getSubjectsForCourseYear()` (superseded by `getSubjectsForYear()` which accepts an optional `regulationId`).

### Query Cache Unification

`exam-fee-setup/page.tsx` used `'college-filters-fee'` as the TanStack Query key for `getCollegeFilters`. Changed to `'college-filters'` (matching the hook and all other pages) so the cache is shared — the same API call is not made twice when navigating between pages.

### Grade Modal Query Invalidation Fix

`GradeSetupModal.tsx` was calling `queryClient.invalidateQueries({ queryKey: ['exam-grades'] })` inside the mutation's `onSuccess`, then also calling the page's `onSuccess()` callback which already invalidates with the full parameterized key. Removed the redundant invalidation from the modal and the unused `useQueryClient` import.

### Dead Code Removal

| Location | Removed |
|---|---|
| `src/types/api.ts` | `PaginatedResponse<T>`, `SpringListResponse<T>`, `ApiError` — defined but never imported anywhere |
| `src/config/constants/api.ts` `EXAM_API` | 11 `LIST_*` / `CREATE_*` / `UPDATE_*` constants for domain paths that `domainList`/`domainCreate` build internally; never referenced |
| `src/config/constants/api.ts` `EXAM_MASTERS_API` | `EXAM_SESSION_ENTITY`, `EXAM_GRADE_ENTITY` (services hardcode the strings directly), `GET_EXAM_FILTERS_BY_CODE` (service now calls `getAllRecords` with the proc name directly) |

### Service Type Safety

Removed `| Record<string, unknown>` union type from all create/update service functions. The union defeated TypeScript inference at every call site — callers would have to check which branch they're on even though only one type is ever passed.

| Service | Functions fixed |
|---|---|
| `invigilator-remuneration.service.ts` | `createInvigilatorRemuneration`, `updateInvigilatorRemuneration` |
| `revaluation-fee.service.ts` | `createRevaluationFee`, `updateRevaluationFee` |

Fixed type narrowing in `exam-max-marks.service.ts` `getMarksSetupFilters()`:
- Before: `arr[0] as unknown as Record<string, unknown>` (double cast, unsafe)
- After: `arr[0] as { flag?: string; clg_filters_regulation?: string }` (targeted shape, no unsafe double cast)

### BFF Proxy Audit (2026-03-29)

Full audit of `src/app/api/proxy/[...path]/route.ts`, `src/app/api/auth/`, `src/lib/session.ts`, and `src/lib/errors.ts`.

**Verdict: Production-ready. No critical issues.**

What was confirmed correct:
- JWT never exposed to browser (Iron Session HTTP-only cookie)
- Session validated on every proxy request; returns 401 if missing
- Spring Boot 401 destroys session (lifecycle sync)
- Multipart `Content-Type` boundary preserved for file uploads
- Error messages extracted correctly from Spring Boot envelope
- Rate limiting on login (10 req/min per IP)

Known limitations (non-blocking):
- Proxy always parses response as JSON — binary file download endpoints would fail (no such endpoints currently)
- No HTTP `Cache-Control` headers on reference data (TanStack Query `staleTime` handles client-side deduplication adequately)
- Session age check exists on `/api/auth/me` but not on the proxy route (Iron Session TTL is sufficient)

Created `src/docs/architecture/data-fetching.md` — documents when to use `domainList` vs `getAllRecords` vs raw `fetch`, TanStack Query conventions (query key structure, staleTime guidelines, cache invalidation), and the full security model.

---

---

## Phase 4 — Angular Parity Audit & Data-Loading Fixes (2026-03-29)

### Root Cause Fixed — All Grid Data Was Empty
- **`crud.service.ts` `domainList()`** — Spring Boot `domain/list` wraps results in `ApiResponse<PageResponse>` where `data.resultList` is the actual array. The function was reading `body.data` (the PageResponse object) instead of `body.data.resultList`. Also added `size=99999` to URL so all records are returned (Spring Boot defaults to 100). This single fix restores data display across every page that uses `domainList`.
- **`exam-master.service.ts` `fetchExamsByUniversity` / `fetchExamsByCollege` / `getExamMasterById`** — a previous session accidentally changed these from `json.data?.resultList` (correct) to `json.data` (wrong). Refactored all three to delegate to the now-correct `domainList` instead of raw fetch.

### Exam Timetable — Correct List Endpoint
- **`exam-timetable.service.ts` `getExamTimetables()`** — was calling `domain/list/ExamTimetable` (generic CRUD). Spring Boot has a dedicated denormalised endpoint `GET /examtimetabledetails?examId=X&courseYearId=Y&courseId=Z` (controller: `ExamTimetableController`) that returns `ExamTimetableDetailDTO` with all joined fields (groupCode, regulationCode, subjectCode, examSessionName, etc.). Fixed to call the correct endpoint.

### Exam Sessions — Missing Fields and Columns
- **`ExamSessionModal.tsx`** — added `universityId` (required) and `examsessioninCatId` (optional) fields; modal now fetches `s_get_collegewisedetails_bycode` with `in_flag: 'clg_filters,gm_codes'` and `in_gm_codes: 'EXMSESN'` to populate University and Session-In dropdowns; both fields included in create/update payload
- **`exam-session/page.tsx`** — added `universityCode` and `examsessioninCatCode` ("Session In") columns to match Angular `displayedColumns`
- **`exam-session.service.ts`** — fixed sort order: `examSessionName ASC` → `createdDt DESC` to match Angular

### Grade Setup — Filter Panel and Payload
- **`grade-setup/page.tsx`** — added cascading University → Course → Regulation filter panel (same pattern as exam-max-marks-setup); grades query only fires when courseId + regulationId are both selected; passes filter values to `getExamGrades()`
- **`GradeSetupModal.tsx`** — added `context` prop `{ universityId, courseId, regulationId, isForDisabled }`; these FK fields are merged into create/update payload (Angular injects them at save time)
- **`exam-grade.ts` types** — added optional FK fields to `ExamGradeFormValues`
- Column order fixed: Grade Code now before Grade Name (matches Angular)

### Exam Max Marks — Missing Columns and Fields
- **`exam-max-marks-setup/page.tsx`** — removed `isForDisabled` column (filter param, not a display column); added `finalIntPercentage` and `finalExtPercentage` columns after `externalPassPercentage`
- **`ExamMaxMarksModal.tsx`** — added `finalIntPercentage` and `finalExtPercentage` fields to Zod schema, form UI, and save payload; context FK fields (`courseId`, `regulationId`, `universityId`, `isForDisabled`) already present

### Angular Parity Audit — Pages Needing Deeper Redesign
Full audit performed comparing each Angular component against its Next.js counterpart. The following pages have correctly-functioning basic CRUD but are missing complex Angular features that require dedicated per-page work:

| Page | Missing |
|---|---|
| **Exam Timetable** | Calendar grid view (primary Angular UI), multi-step batch-add flow (session→regulation→subjects→courseGroups), conflict-check dialog |
| **Exam Fee Setup** | Course-group/year applicability matrix, additional fees sub-table, late fee fines sub-table; `POST /examfeestructure` batch endpoint needed |
| **Revaluation Fee Setup** | Subject1–Subject7 per-subject fee fields, course-group/year matrix, additional fee and fine sub-tables; no filter panel (shows all records) |
| **Seating Plan** | College + Exam Timetable filter levels, seating grid visualization, student auto-assignment, all print features |

---

## Phase 3 — Examination Module Bug Fixes (2026-03-29)

### Fixed
- `crud.service.ts` `domainList()` — Spring Boot returns a bare object (not array) when exactly one record matches. Added normalisation: `null → []`, `object → [object]`, `array → array`. This was the root cause of all "`.map` is not a function" runtime errors across the entire app.
- `exam-master.service.ts` `fetchExamsByUniversity` / `fetchExamsByCollege` / `getExamMasterById` — same single-object guard applied to functions that bypass `domainList` with raw `fetch`
- `exam-max-marks.service.ts` `fetchMarksSetup` — wrong QueryDSL field name `disabled` → `isForDisabled`
- `exam-max-marks.service.ts` `getMarksSetupFilters` — replaced raw `fetch` block with `getAllRecords` helper (removes duplicate error handling and stale `SpringListResponse` type)
- `ExamFeeSetupModal.tsx` payload — was sending `examMaster: { examId }` (nested) instead of flat `examId` that Spring Boot entity expects
- `seating-plan.service.ts` `buildSeatingPayload` — was sending PascalCase nested FKs (`ExamMaster: { examId }`, `ExamTimetable: { examTimetableId }`, `Room: { roomId }`); fixed to flat fields as Angular source confirms
- `SeatingPlanModal.tsx` — added `timetableSlots = []` default prop guard
- `InvigilatorRemunerationModal.tsx` — added `colleges = []` default prop guard
- `RevaluationFeeModal.tsx` — added `exams = []` default prop guard
- `invigilator-remuneration/page.tsx` — replaced fragile `onCellClicked` + `target.textContent` detection with proper `onClick` handlers inside cell renderer
- `revaluation-fee-setup/page.tsx` — same action button fix
- `ExamMasterModal.tsx` — added Zod `.refine()` validation: at least one of Regular/Supply/Internal exam type must be selected
- `exam-fee-setup/page.tsx` — college dropdown in college-specific mode (mode=2) was empty because `univ_exam_filters` stored proc doesn't include `fk_college_id`; now fetches college data via separate `getCollegeFilters` call using `s_get_collegewisedetails_bycode`
- Navigation sidebar — doubled URL paths fixed via `normalizeHref()` deduplication in `navigation.ts`
- Navigation sidebar — active state highlight now works for parent collapsible items via `hasActiveDescendant()` recursive check in `NavItem.tsx`
- Navigation sidebar — active link now gets `aria-current="page"`; `Sidebar.tsx` uses `scrollIntoView({ block: 'nearest' })` on route change so the active item is always visible without manual scrolling
- `not-found.tsx` — replaced full-page redirect with slide-up toast notification that auto-navigates back after 3s
- `src/app/(protected)/not-found.tsx` — 404 inside protected routes now renders **within** the `(protected)` layout so the sidebar stays intact; root `src/app/not-found.tsx` simplified to a silent redirect to `/dashboard` (no sidebar available at root level anyway)

---

## Phase 2 — Foundation & Component System (2026-03-29)

### Added
- `src/config/constants/` — api.ts, app.ts, ui.ts, proc.ts, index.ts — all endpoint paths and app constants
- `src/services/exam-master.service.ts` — service layer for exam master pages
- `src/lib/errors.ts` — AppError class, parseApiError, isAppError, getErrorMessage
- `src/types/common.ts` — SelectOption, DateRange, FilterState, PaginationState
- `src/components/feedback/` — ConfirmDialog, ErrorBoundary, EmptyState
- `src/components/data-display/` — StatusBadge, StatCard
- `src/components/forms/SearchInput` and `FilterBar`
- `src/components/shared/RoleGuard` and `PageContainer`
- `src/docs/` — architecture/, flows/, components/ documentation
- DataTable enhanced: pagination, CSV export, search input
- Dashboard: StatCard refactor, DEBUG panel removed

### Changed
- All exam master pages: inline fetches replaced with service calls
- SessionUser type: added organizationId field
- Dashboard: removed [DEBUG] amber panel
- API proxy: improved error response shaping

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Complete Login → Exam Master Flow](#complete-login--exam-master-flow)
3. [All Files Created / Modified](#all-files-created--modified)
4. [What Is Done](#what-is-done)
5. [What Is NOT Done](#what-is-not-done)
6. [Known Deferred Bugs (Spring Boot)](#known-deferred-bugs-spring-boot)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| UI components | Shadcn/UI pattern (Radix primitives + `cn()`) |
| Auth / session | iron-session v8 — HttpOnly encrypted cookie (JWT never reaches browser) |
| Server → Spring Boot | Next.js API route proxy (`/api/proxy/[...path]`) |
| Data fetching | TanStack Query v5 |
| Global state | Zustand v5 |
| Forms | react-hook-form v7 + zod v4 |
| Tables | AG Grid Community v35 |
| Date pickers | react-day-picker v9 + date-fns |
| Icons | lucide-react |
| Node requirement | **Node ≥ 20.9.0** (Next.js 16 hard requirement — current machine is Node 16, run `nvm use 20` before `npm run dev`) |

---

## Complete Login → Exam Master Flow

### 1. User hits any protected URL (e.g. `/dashboard`)

```
Browser → GET /dashboard
  → Next.js middleware (src/middleware.ts)
    → reads cookie "college_erp_session"
    → cookie absent? → redirect to /login
    → cookie present? → pass through
```

The middleware only checks for cookie **existence**, not validity (iron-session decryption happens inside route handlers).

---

### 2. Login page (`/login`)

```
User fills LoginForm → submit
  → POST /api/auth/login   (Next.js BFF route)
    → Rate limit check (10 req/min per IP, in-memory Map)
    → Zod validates body { usernameOrEmail, password }
    → springLogin()
        → POST {SPRING_API_URL}/api/auth/login
           body: { usernameOrEmail, password, isMobile: false }
           returns: { data: "<JWT_STRING>" }
    → springGetUserDetails(jwt)
        → GET {SPRING_API_URL}/api/authorization?isMobile=false
           header: Authorization: Bearer <JWT>
           returns: UserDTO (userId, userName, firstName, lastName, userRole,
                             userTypeCode, roleName, collegeId, collegeCode,
                             collegeName, academicYearId, academicYear,
                             employeeId, studentId, modules[], pages[], ...)
    → Build SessionUser (safe subset — NO jwt, NO email, NO mobile)
        derived flags computed server-side:
          isAdmin       = userRole === 'ADMIN' || 'SUPERADMIN'
          isPrincipal   = roleName includes 'PRINCIPAL'
          isManagement  = userTypeCode includes 'MGNT' || roleName includes 'MANAGEMENT'
        modules/pages excluded from cookie (cookie size limit ~4 KB)
    → Save to Iron Session cookie:
        { jwt, user: SessionUser (no modules/pages), issuedAt }
        HttpOnly, SameSite=Strict, Secure in production
        TTL: 360 minutes (21600 s)
    → Return to browser: { user: SessionUser + modules + pages }
        (jwt is NEVER in this response)
  ← Browser stores nothing — session is cookie-only
  → LoginForm calls router.push(user.defaultDashboardPath) → /dashboard
```

---

### 3. Protected layout server component (`src/app/(protected)/layout.tsx`)

Every page under `(protected)/` goes through this layout on every server render:

```
Server render
  → getSession() → reads + decrypts iron-session cookie
  → no session.user || no session.jwt? → redirect('/login')
  → springGetUserDetails(session.jwt)
      → GET {SPRING_API_URL}/api/authorization?isMobile=false
         (fetches fresh modules[] and pages[] — not stored in cookie)
  → Build initialUser = { ...session.user, modules, pages }
  → Render: <SessionProvider initialUser={initialUser}><AppShell>{page}</AppShell></SessionProvider>
```

`initialUser` is passed as a prop to the client-side `SessionProvider` to avoid a loading flash.

---

### 4. Client session hydration (`SessionContext` + `useSession`)

```
SessionProvider (client) receives initialUser from server
  → useSession() → TanStack Query
      queryKey: ['session']
      queryFn: GET /api/auth/me
        → Server reads cookie → validates issuedAt (max 360 min)
        → springGetUserDetails(jwt) → fresh modules/pages
        → returns { user: SessionUser + modules + pages }
      staleTime: 5 minutes (won't refetch for 5 min)
  → user = session.user ?? initialUser
     (initialUser prevents flash; TanStack Query takes over after)
  → SessionContext.Provider value: { user, isLoading, refetch }
```

Any component calls `useSessionContext()` to get the current user.

---

### 5. AppShell layout (`src/components/layout/AppShell.tsx`)

```
AppShell (client)
  ├── Sidebar (slate-900 dark panel, left)
  │     ├── Brand: user.collegeName
  │     ├── Nav: built from user.modules[] + user.pages[]
  │     │     via buildNavTree() → useNavigation() hook
  │     │     dynamic per role — admin sees all modules, student sees fewer
  │     ├── Help Center (static placeholder)
  │     └── Logout → POST /api/auth/logout → destroys cookie → /login
  └── Main area
        ├── Topbar (sticky, h-14)
        │     ├── Hamburger (mobile)
        │     ├── Search bar (static placeholder)
        │     ├── Bell notification (static placeholder)
        │     ├── Apps grid (static placeholder)
        │     ├── Help icon (static placeholder)
        │     └── User dropdown: name, role, Sign out
        └── <main> → page content rendered here
```

---

### 6. Dashboard page (`/dashboard`)

```
DashboardPage (client)
  → useSessionContext() → user
  → Shows: "Welcome back, {user.firstName}"
           role badge, collegeName, academicYear
  → Role-based stat cards (hardcoded zeros — not yet wired to real APIs):
       ADMIN/PRINCIPAL: Total Students, Active Staff, Pending Fees, Today's Attendance
       STAFF:           My Classes Today, Pending Assignments, Upcoming Exams, Student Count
       STUDENT:         Attendance %, Upcoming Exams, Fee Due, Course Progress
       PARENT:          Child Attendance, Fee Due, Upcoming Exams, Recent Grades
  → [DEBUG] SessionUser panel (amber collapsible) — shows all session fields
```

---

### 7. Navigating to Exam Master (`/admin-examination-management/admin-exam-masters/exam-master`)

No route guard beyond the middleware (cookie check). The page itself is a client component that calls APIs through the proxy.

---

### 8. Exam Master List page

```
ExamMasterPage (client)
  │
  ├── On mount: fetchFilterDetails()
  │     → GET /api/proxy/getAllRecords/s_get_collegewisedetails_bycode
  │           ?in_flag=clg_filters&in_org_id={user.organizationId??0}
  │            &in_loginuser_empid={user.employeeId??0}&...
  │     → Proxy: reads iron-session cookie → gets JWT → forwards to Spring Boot
  │     → Response: { data: { result: [[filtersdata], [academicData]] } }
  │           filtersdata: rows with flag='clg_filters'
  │                         each row: fk_university_id, university_name,
  │                                   fk_college_id, college_name,
  │                                   fk_course_id, course_name
  │           academicData: rows with clg_filters_ay='clg_filters_ay'
  │                          each row: fk_university_id, fk_academic_year_id,
  │                                    academic_year, is_curr_ay
  │     → Extract distinct universities → auto-select first
  │     → Cascade: university → courses → academic years (auto-select current AY)
  │     → If mode=1 (University): fetch exams immediately
  │     → If mode=2 (College): show college dropdown, fetch on college select
  │
  ├── Filter panel
  │     RadioGroup: [● Is For University]  [○ Is For College]
  │     Dropdowns:  University | Course | Academic Year | College (mode=2 only)
  │
  ├── AG Grid table (shown after first fetch)
  │     Columns: SI.No | Exam Name | Short Name | Exam Type | Month/Year |
  │              From Date | To Date | Fee Notification | Notification |
  │              Exam Labels | Status | Actions
  │     Cell renderers (JSX): Download links, Status badge, Edit button, Create Label link
  │     onCellClicked:
  │       "Exam Labels" → sessionStorage.setItem('examMasterDetails', JSON)
  │                     → router.push(...exam-master-details?examId=X)
  │       "Actions"     → open ExamMasterModal in edit mode
  │
  └── Add Exam button → open ExamMasterModal in add mode
```

---

### 9. Exam Master Modal (add / edit)

```
ExamMasterModal (Dialog)
  │
  ├── react-hook-form + zod validation
  ├── Fields:
  │     Exam Name (required) | Exam Short Name (required)
  │     Month/Year picker (MonthYearPicker) → auto-sets fromDate + toDate
  │     From Date (DatePicker) | To Date (DatePicker, validated ≥ fromDate)
  │     Exam Type: [□ Regular] [□ Supple] [□ Internal]
  │     [□ Is Published]  [□ Is Result Process Started]
  │     Notification Published On | Notification File (FileInput)
  │     Fee Notification Published On | Fee Notification File (FileInput)
  │     [□ Is Active]  Reason (shown only when inactive)
  │
  ├── Add mode → POST /api/proxy/domain/create/ExamMaster
  ├── Edit mode → PUT /api/proxy/domain/update/ExamMaster?query=examId=={id}
  └── Files selected → POST /api/proxy/examnotificationupload (multipart)
        FormData key "examId " (trailing space — matches Angular backend)
        file keys: notificationFilePath, feeNotificationFilePath
```

---

### 10. Exam Master Details page (`…/exam-master-details?examId=X`)

```
ExamMasterDetailsPage (client, wrapped in Suspense for useSearchParams)
  │
  ├── Read examId from URL search params
  ├── Read exam object from sessionStorage (written by list page on navigation)
  │     fallback: GET /api/proxy/domain/list/ExamMaster?query=examId==X
  │
  ├── Parallel data fetch (when exam ready):
  │     GET /api/proxy/domain/list/GeneralDetail
  │           ?query=GeneralMaster.generalMasterCode==EXMFEETYP.and.isActive==true
  │           → filter result: keep 'Regular' if exam.isRegularExam,
  │                            'Supple' if exam.isSupplyExam,
  │                            'Internal' if exam.isInternalExam
  │     GET /api/proxy/domain/list/Regulation
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true
  │     GET /api/proxy/domain/list/CourseGroup
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true
  │     GET /api/proxy/domain/list/CourseYear
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true.order(sortOrder=ASC)
  │     GET /api/proxy/domain/list/ExamMasterDetails
  │           ?query=examMaster.examId=={examId}.and.isActive==true
  │
  ├── Tabs: one tab per enabled exam type (Regular / Supple / Internal)
  │     Each tab:
  │       Form: Regulation | Course Group | Course Year | Exam Label | □ Is Bridge Course
  │       Table: all labels for this exam type (examTypeCatId match)
  │       Row actions: Edit (loads form) | Delete (soft: isActive=false)
  │
  └── Save All → POST /api/proxy/addExamMasterDetails  (full array)
        on 200: toast success → navigate back to exam-master list
```

---

### 11. API Proxy (`/api/proxy/[...path]`)

Every client-side `fetch('/api/proxy/...')` goes through this:

```
Proxy route handler
  → Read iron-session cookie → get JWT (server-side only)
  → No jwt? → 401 Unauthorized
  → Build target URL: {SPRING_API_URL}/{path}{queryString}
  → Detect Content-Type:
       multipart/form-data → forward Content-Type as-is (with boundary)
                             body: request.arrayBuffer()
       everything else     → set Content-Type: application/json
                             body: request.text()
  → fetch(targetUrl, { method, headers: { Authorization: Bearer JWT, ... }, body })
  → Spring Boot returns 401? → destroy session → return 401
  → Otherwise → return Spring Boot response body as-is
  JWT is NEVER included in any response body
```

---

## All Files Created / Modified

### Modified (pre-existing files changed)

| File | What changed |
|---|---|
| `src/app/api/proxy/[...path]/route.ts` | Fixed multipart support: detects `Content-Type: multipart/form-data`, forwards it as-is with boundary; uses `arrayBuffer()` for body instead of `text()` |
| `src/app/(protected)/dashboard/page.tsx` | Added `[DEBUG] SessionUser` collapsible amber panel; removed "New Session" button import; added `useState`, `ChevronDown`, `ChevronRight` imports |
| `src/components/layout/Sidebar.tsx` | Removed "New Session" CTA button and its `Plus` lucide import |

### Created (new files)

#### Types
| File | Purpose |
|---|---|
| `src/types/exam-master.ts` | `ExamMaster`, `ExamMasterFormValues`, `ExamMasterDetails`, `CollegeWiseFilterRow`, `GeneralDetail`, `Regulation`, `CourseGroup`, `CourseYear` |

#### Shadcn UI components
| File | Purpose |
|---|---|
| `src/components/ui/dialog.tsx` | Radix Dialog wrapper — used by ExamMasterModal |
| `src/components/ui/popover.tsx` | Radix Popover wrapper — used by DatePicker, MonthYearPicker |
| `src/components/ui/select.tsx` | Radix Select wrapper — used by filter dropdowns |
| `src/components/ui/checkbox.tsx` | Radix Checkbox wrapper — used by modal form |
| `src/components/ui/tabs.tsx` | Radix Tabs wrapper — used by exam-master-details |
| `src/components/ui/calendar.tsx` | react-day-picker Calendar — used by DatePicker |
| `src/components/ui/radio-group.tsx` | Radix RadioGroup wrapper — used by mode toggle |

#### Reusable components
| File | Purpose |
|---|---|
| `src/components/data-table/DataTable.tsx` | Generic AG Grid wrapper: `rowData`, `columnDefs`, `loading`, `quickFilterText`, `onCellClicked` |
| `src/components/layout/PageHeader.tsx` | `title` + `subtitle` + `action` slot page header |
| `src/components/forms/DatePicker.tsx` | Popover + Calendar date picker (dd/MM/yyyy display) |
| `src/components/forms/MonthYearPicker.tsx` | Custom month/year grid picker (MM/yyyy display) |

#### Exam Master feature
| File | Purpose |
|---|---|
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/page.tsx` | List page — filters, AG Grid table, cell renderers |
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/ExamMasterModal.tsx` | Add/Edit dialog — full form with file upload |
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/exam-master-details/page.tsx` | Details/labels page — tabs, add/edit/delete labels, save all |

---

## What Is Done

### Infrastructure
- [x] `src/services/crud.service.ts` — generic domain CRUD: `buildQuery`, `domainList`, `domainGet`, `domainCreate`, `domainUpdate`, `domainSoftDelete`, `domainDelete`, `getAllRecords`
- [x] `exam-master.service.ts` refactored to use crud.service.ts internally (all inline `fetch()` calls replaced)
- [x] Iron Session BFF auth — JWT stored server-side only, never exposed to browser
- [x] `/api/proxy/[...path]` — catch-all proxy to Spring Boot with JWT injection
- [x] Proxy multipart fix — file uploads forwarded correctly
- [x] Middleware route guard — redirects unauthenticated requests to `/login`
- [x] Session expiry check — server-side 360-minute check on `/api/auth/me`
- [x] Rate limiting on login — 10 req/min per IP (in-memory)
- [x] Session cookie — HttpOnly, SameSite=Strict, Secure in prod
- [x] `SessionUser` type — safe client-facing shape (no jwt, no email, no mobile)
- [x] Derived privilege flags computed server-side (`isAdmin`, `isPrincipal`, `isManagement`)

### Auth pages
- [x] Login page — form with validation, error handling, redirect on success
- [x] Logout — `POST /api/auth/logout` destroys session, redirects to `/login`

### App shell
- [x] Sidebar — dark theme, dynamic nav from `user.modules[]` + `user.pages[]`
- [x] Topbar — user avatar, name, role, Sign out dropdown
- [x] Mobile hamburger + sidebar overlay
- [x] Sticky topbar + scrollable main area
- [x] Page transition animation (`animate-fade-up`)

### Dashboard
- [x] Welcome header with name, role badge, college name, academic year
- [x] Role-based stat cards (4 cards per role, values hardcoded to 0 — not wired to API yet)
- [x] `[DEBUG]` session data panel (temporary, to be removed)

### Exam Master — List page
- [x] University / College mode toggle (radio group)
- [x] Cascading filter dropdowns: University → Course → Academic Year → College
- [x] Auto-selection: first university, first course, current academic year
- [x] AG Grid table with 11 columns and JSX cell renderers
- [x] Download links for notification files
- [x] Status badge (Active / Inactive)
- [x] Edit button opens modal
- [x] Create Label navigates to details page (writes exam to `sessionStorage`)

### Exam Master — Add/Edit Modal
- [x] react-hook-form + zod validation
- [x] MonthYearPicker — custom month/year grid
- [x] DatePicker — Popover + Calendar
- [x] Auto-sync fromDate/toDate when month/year is selected
- [x] toDate ≥ fromDate guard (resets and shows warning)
- [x] Exam Type checkboxes (Regular / Supple / Internal)
- [x] Is Published, Is Result Process Started checkboxes
- [x] Notification + Fee Notification file upload (styled `FileInput` component)
- [x] Existing file path displayed in edit mode
- [x] Is Active + conditional Reason field
- [x] POST create → PUT update → POST file upload chain
- [x] Trailing-space key `"examId "` on FormData (matches Angular/Spring Boot expectation)

### Exam Master — Details page
- [x] Reads `examId` from URL params, exam data from `sessionStorage`
- [x] API fallback if `sessionStorage` is empty
- [x] Loads exam types, regulations, course groups, course years in parallel
- [x] Tabs per enabled exam type (only shows tabs for types the exam has)
- [x] Add / Edit / Delete (soft delete — sets `isActive: false`) exam labels
- [x] In-memory state management — Save All posts entire array at once
- [x] Toast notification on success/error
- [x] Navigate back to list on successful save
- [x] Redirect to list if `examId` is invalid

### Reusable components built
- [x] `DataTable` — AG Grid wrapper
- [x] `PageHeader` — title / subtitle / action
- [x] `DatePicker` — Popover + Calendar
- [x] `MonthYearPicker` — custom month/year grid
- [x] `FileInput` — styled file picker with filename display and clear button

### Navigation UX
- [x] Sidebar active link gets `aria-current="page"` — used for scroll targeting and accessibility
- [x] Sidebar auto-scrolls active nav item into view on every route change (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`)
- [x] 404 inside `(protected)` routes renders toast with sidebar intact — `src/app/(protected)/not-found.tsx`
- [x] Root 404 (`src/app/not-found.tsx`) silently redirects to `/dashboard`

### Admin Exam Masters — Sub-pages
- [x] `/exam-session` — ExamSession entity, time slot management (start/end time, HH:mm:ss stored, 12-hr display)
- [x] `/grade-setup` — ExamGrade entity, grade/GPA thresholds with score and points range
- [x] `/exam-max-marks-setup` — ExamMarkssetup entity (lowercase 's'), marks config with University → Course → Regulation → isForDisabled filter cascade
- [x] `/exam-fee-setup` — ExamFeeStructure entity, exam fee configuration with University/College mode and exam filter cascade
- [x] `/seating-plan-setup` — ExamRoomAllotment entity, room allocation per timetable slot
- [x] `/exam-timetable` — ExamTimetable entity, subject scheduling per date/session
- [x] `/invigilator-remuneration` — ExamInvigilationRemuneration entity, invigilator pay rates by designation
- [x] `/revaluation-fee-setup` — ExamFeeStructure entity (revaluation context), re-check fee collection windows

---

## What Is NOT Done

### Dashboard stat cards
- [ ] Stat card values are all hardcoded to `0` / `'₹0'` / `'0%'`
- [ ] Not wired to any real API endpoints

### Navigation
- [ ] Sidebar nav items are built from `modules[]`/`pages[]` returned by Spring Boot but the actual URLs may not match Next.js routes yet — routing works only for pages that have been built
- [x] Active nav item highlighted and scrolled into view automatically
- [x] Doubled URL paths fixed (`normalizeHref()` in `navigation.ts`)
- [x] 404 toast shows with sidebar intact; auto-navigates back after 3s
- [ ] Help Center button (static placeholder, no page behind it)
- [ ] Notification bell (static placeholder — no API, no page)
- [ ] Apps grid icon (static placeholder)
- [ ] Search bar (static placeholder, no functionality)
- [ ] User "Profile" menu item in topbar dropdown is disabled/placeholder

### Session security
- [ ] The `[DEBUG] SessionUser` panel on the dashboard should be removed before production
- [ ] `organizationId` is used as `(user as any)?.organizationId ?? 0` in exam master / exam max marks pages. If it is available from Spring Boot's UserDTO, add it to `SessionUser` in `src/types/user.ts` and the session-building logic in `/api/auth/login/route.ts`.

### Exam Master — Missing features
- [ ] Quick search / filter text box above the AG Grid (DataTable accepts `quickFilterText` prop but no UI input is wired to it on the exam master page)
- [ ] Pagination controls (AG Grid community has built-in pagination — not yet enabled in `DataTable`)
- [ ] Print / export to CSV / Excel (AG Grid community supports this but not configured)
- [ ] "Is For College" mode does not auto-select the first college and fetch exams automatically — user must manually select a college first

### Exam Master Details — Missing features
- [ ] No confirmation dialog before deleting a label row (just deletes immediately)
- [ ] `batchId` field exists in the Angular form but is commented out — not included here either (matches Angular's current state)

### Other examination pages (not started)
All other routes under `admin-examination-management/admin-exam-masters/` that remain:
_(All 8 admin-exam-master sub-pages have been built — see below)_

All other module areas from the Angular app are not started:
- [ ] Student management
- [ ] Staff management
- [ ] Fee management
- [ ] Attendance
- [ ] Timetable
- [ ] Admissions
- [ ] Reports
- [ ] (and all other modules)

---

## Known Deferred Bugs (Spring Boot)

These are backend issues documented in `migration-plan/04-spring-boot-backlog.md`. **Do not fix during migration** — Spring Boot is frozen.

| Issue | Risk |
|---|---|
| `NoOpPasswordEncoder` — plaintext passwords in DB | Critical — passwords readable if DB is compromised |
| JWT secret `"genesis"` — hardcoded weak secret | High — tokens can be forged |
| CORS wildcard `*` | Medium — any origin can call the API |
| Credentials in `application.yml` plain text | Medium |
| JWT expiry 360 min — no refresh mechanism | Low-medium |

---

## Environment Variables Required

```env
# .env.local
SPRING_API_URL=http://localhost:8080        # Spring Boot base URL (server-only)
SESSION_SECRET=<32+ char random string>     # iron-session encryption key
SESSION_COOKIE_NAME=college_erp_session     # optional, this is the default
NODE_ENV=development                        # 'production' enables Secure cookie flag
```

---

## Phase 8 — Component Audit (`COMPONENT_AUDIT.md`) (2026-03-30)

A 19-section comparison report was produced by comparing every component in `src/common/components/` (Angular port) against the Angular source in `college_erp_angular_old/`. The report identified:

- **Missing features**: server-side pagination, async/searchable Select, MultiSelect, DatePicker clear button + bounds, live Topbar search, sidebar position wiring
- **Unnecessary additions**: features in the Next.js port that Angular never had
- **Library capability gaps**: AG Grid, recharts, react-day-picker features available but unused

Full report: `COMPONENT_AUDIT.md`

---

## Phase 9 — `src/kit/` Canonical Component Library (2026-03-30)

Created `src/kit/` as the canonical component directory. All pages must import from `@/kit/` — not from `src/common/components/` or direct shadcn primitives. `src/common/` is retained as the Angular-parity foundation layer but is **not** the primary import path for pages.

### Rule: use `@/kit/`, not `@/common/`

`src/common/` is frozen. `src/kit/` is the evolving, production-quality layer. Whenever a component is needed on a page, import it from `@/kit/`.

### Components Built or Fixed

#### `src/kit/table/DataTable.tsx` — AG Grid Community v35

Over `src/common/components/table/`:
- `serverSide` + `totalCount` / `currentPage` / `onPageChange` for server-side pagination
- Custom pagination bar with 10 / 20 / 50 / 100 page-size selector
- `getRowId` for stable row identity
- `onRowClick` convenience prop
- `showSearch` prop enables AG Grid quick-filter input
- Named export (not default — avoids import ambiguity)

#### `src/kit/date-picker/DatePicker.tsx` — react-day-picker v9

- `Date | null` consistency throughout
- `startMonth` / `endMonth` navigation bounds
- `autoFocus` (replaces deprecated `initialFocus`)
- Clear button
- `label` / `required` / `error` props with `useId()` for `htmlFor`

#### `src/kit/date-picker/MonthYearPicker.tsx` — 3×4 month grid

- Bounded year navigation
- Per-month disabled state via `isMonthDisabled()`
- `role="grid"` + `aria-selected` / `aria-disabled` accessibility
- Keyboard ArrowKey navigation
- Clear button

#### `src/kit/search/SearchInput.tsx`

Consolidated two conflicting search inputs (`common/search/` with `onSearch` prop, `forms/SearchInput` with `onChange` prop) into one component using `onChange`.

#### `src/kit/select/Select.tsx` — Radix Popover (not Radix Select)

Using Radix Popover instead of Radix Select enables loading async options after mount (Radix Select cannot). Added:
- `searchable` boolean prop (explicit, not magic >6 threshold)
- `onSearch` server-side callback
- `isLoading` spinner
- `required` / `error` / `label` with `htmlFor` / `id` via `useId()`

#### `src/kit/select/MultiSelect.tsx` — Radix Popover + Checkbox

Mirrors Angular `mat-select multiple` + `ngx-mat-select-search`:
- `showSelectAll` with indeterminate tri-state
- `maxDisplay` pill trigger (shows "N selected" after threshold)
- `onSearch` async callback
- Never closes on selection

#### `src/kit/charts/BarChart.tsx` — recharts

- `stacked` prop → `stackId="stack"` on all bars
- `onClick` handler
- K / M / B number abbreviation on Y axis
- Configurable `legendPosition`
- `domain={[0,'auto']}` on Y axis
- Horizontal layout when `type='column'`

#### `src/kit/charts/PieChart.tsx` — recharts

- Active shape expands on hover (+8px outerRadius)
- `onClick`
- `paddingAngle`
- `showLabels` toggle
- Custom `renderTooltip` prop

#### `src/kit/charts/DrilldownChart.tsx`

Stub with full `// TODO` implementation notes: 3-level District → College → Fee Category drilldown with manual drill state using recharts `onClick`.

#### `src/kit/breadcrumb/Breadcrumb.tsx` + `useBreadcrumb.ts`

- `maxItems` collapse with ellipsis
- `useBreadcrumb` hook auto-builds items from `usePathname()`

#### `src/kit/layout/Topbar.tsx` — live page search (Angular parity)

- Fetches `GET /api/proxy/useraccess?userId=X&status=true` on mount
- Flattens `modules → subModules → pages` tree to `{ displayName, url }[]` using same `slugify` logic as Angular
- Client-side prefix filter, max 8 results
- Keyboard ArrowUp / Down / Enter / Escape navigation
- `role="listbox"` / `"option"` + `aria-activedescendant` accessibility
- `onPointerDown preventDefault` prevents focus loss on item click

#### `src/kit/layout/ThemeSettingModal.tsx`

- `aria-checked` wired to actual boolean value (was broken)
- `<DialogDescription className="sr-only">` added for accessibility
- Sidebar position toggle now calls both `updateSettings` AND `setSidebarPosition` from Zustand store

#### `src/store/navigation-store.ts`

Added `sidebarPosition: 'left' | 'right'` state + `setSidebarPosition` action, persisted in localStorage.

#### `src/components/layout/Sidebar.tsx`

Reads `sidebarPosition` from store. Renders `order-last` CSS class when `'right'`. Switches to `PanelRightClose` / `PanelRightOpen` icons when right-positioned.

#### New discovered components (extracted from page repetition)

| Component | Location | How discovered |
|---|---|---|
| `FormModal` | `kit/feedback/FormModal.tsx` | Same Dialog + form + Cancel/Submit/Loader footer in every modal |
| `FormField` | `kit/forms/FormField.tsx` | `label + children + error` repeated 5–12× per modal |

#### Copied + cleaned from `src/components/`

`StatusBadge`, `StatCard`, `ConfirmDialog`, `EmptyState`, `ErrorBoundary`, `CollegeFilterPanel`, `PageHeader` (converted to named export), `PageContainer`

#### `src/kit/index.ts`

Barrel export: `export * from './table'`, `'./date-picker'`, `'./search'`, `'./select'`, `'./charts'`, `'./breadcrumb'`, `'./layout'`, `'./data-display'`, `'./feedback'`, `'./forms'`

---

## Phase 10 — Page Migration to `@/kit/` (2026-03-30)

All 22+ page files and 2 modal files under `src/app/(protected)/` were updated to import from `@/kit/` instead of old component paths.

### Bug fixed: default vs named export on DataTable

Six pages were generated with `import DataTable from '@/kit/table'` (default import). `DataTable` is a named export. Build failed with "Export default doesn't exist in target module". Fixed with targeted replacement across all 6 affected files:

- `admin/organizations/page.tsx`
- `admin/campus/page.tsx`
- `evaluation-process/create-questionpaper-template/page.tsx`
- `evaluation-process/evaluation-templates/page.tsx`
- `evaluation-process/exam-question-paper-marks/page.tsx`
- `evaluation/evaluator-assigned-answer-sheet/page.tsx`

**Root cause / lesson:** All exports in `src/kit/` are named exports. Never use default imports from kit paths.

---

## Phase 11 — Architecture Analysis (2026-03-30)

Three parallel audit agents scanned the entire codebase. Full findings in `ARCHITECTURE_PLAN.md`.

### Summary of gaps found

| Priority | Issue |
|---|---|
| High | `reason: 'active'` hard-coded in 8+ modal `getDefaults()` functions |
| High | Entity names (`'ExamSession'`, `'ExamGrade'`, etc.) as bare strings in all service files |
| High | Query keys as inline string arrays — no factory, invalidation is fragile |
| High | 3 pages use raw `useState + useCallback + useEffect` instead of React Query |
| High | No toast/notification system — errors only visible inside modal forms |
| Medium | `InvigilatorRemunerationFormValues` typed `number | ''` but form produces `string` |
| Medium | `SeatingPlanFormValues` typed `number | null` but Zod schema disallows null |
| Medium | `ApiResponse<T>.data` typed `T` but runtime guards against null |
| Medium | No `PageResponse<T>` interface — duck-typed in `domainList` |
| Medium | `staleTime: 5 * 60 * 1000` magic number repeated 4+ times — `APP_CONFIG.SESSION_STALE_TIME` exists but unused |
| Medium | `src/config/constants.ts` (root) duplicates `src/config/constants/app.ts` |
| Low | `queryKey: unknown[]` prop on two modals — workaround for missing key factory |
| Low | `GeneralDetailRow` locally declared in `ExamSessionModal` instead of using shared `GeneralDetail` type |

### Planned infrastructure (not yet implemented — see `ARCHITECTURE_PLAN.md`)

- `src/config/constants/entities.ts` — ENTITIES map (entity name + pk per domain type)
- `src/config/constants/defaults.ts` — `DEFAULT_ACTIVE_REASON`, `DEFAULT_IS_ACTIVE`, `DEFAULT_PAGE_SIZE`
- `src/lib/query-keys.ts` — typed `QK` React Query key registry
- `src/lib/schemas.ts` — `baseEntitySchema` Zod fragment
- `src/lib/toast.ts` — `toastError` / `toastSuccess`
- `src/types/domain.ts` — `DomainEntity` base interface
- `src/hooks/useEntityForm.ts` — form setup boilerplate hook
- `src/hooks/useCrudList.ts` — React Query list + invalidate hook
- `src/hooks/useCrudMutation.ts` — React Query mutation + auto-invalidate hook
- `src/kit/forms/ActiveStatusField.tsx` — `isActive` checkbox + conditional reason field

---

## Phase 12 — API Constants Cleanup (2026-03-30)

### Problem

`AUTH_API` in `src/config/constants/api.ts` stores Spring Boot paths (`'api/auth/login'`) for **server-side** use in `src/integrations/spring-api.ts`. These are not the same as the Next.js internal routes that the browser calls (`'/api/auth/login'`). No constant existed for the client-side Next.js routes. Eight hardcoded `fetch()` strings were found across 6 files — one even had a `//TODO replace with Constants` comment.

### New constants added to `src/config/constants/api.ts`

```ts
/** Next.js internal API routes — called from client components, NOT Spring Boot paths */
export const NEXT_API = {
  AUTH: {
    LOGIN:  '/api/auth/login',   // POST — sets iron-session cookie
    LOGOUT: '/api/auth/logout',  // POST — clears iron-session cookie
    ME:     '/api/auth/me',      // GET  — returns current SessionUser
  },
  /** Build a /api/proxy/{path} URL for any Spring Boot endpoint */
  PROXY: (path: string) => `/api/proxy/${path}`,
}

export const ORG_API = {
  LOGO_UPLOAD: 'organizationlogoupload',  // POST multipart
}

// Added to EXAM_API:
EXAM_TIMETABLE_DETAILS: 'examtimetabledetails',  // GET — denormalised DTO endpoint
```

### Files updated

| File | Hardcoded string removed | Constant used |
|---|---|---|
| `app/(public)/login/LoginCard.tsx` | `'/api/auth/login'` | `NEXT_API.AUTH.LOGIN` |
| `hooks/useSession.ts` | `'/api/auth/me'` | `NEXT_API.AUTH.ME` |
| `components/layout/Sidebar.tsx` | `'/api/auth/logout'` | `NEXT_API.AUTH.LOGOUT` |
| `components/layout/Topbar.tsx` | `'/api/auth/logout'` | `NEXT_API.AUTH.LOGOUT` |
| `kit/layout/Topbar.tsx` | `'/api/auth/logout'` + `` `/api/proxy/useraccess?...` `` | `NEXT_API.AUTH.LOGOUT` + `NEXT_API.PROXY(AUTH_API.USER_ACCESS)` |
| `services/organization.service.ts` | `'/api/proxy/organizationlogoupload'` | `NEXT_API.PROXY(ORG_API.LOGO_UPLOAD)` |
| `services/exam-timetable.service.ts` | `` `/api/proxy/examtimetabledetails?...` `` | `NEXT_API.PROXY(EXAM_API.EXAM_TIMETABLE_DETAILS)` |

### Convention going forward

- **Spring Boot paths** (no leading `/`) → `AUTH_API`, `EXAM_API`, etc. → used with `NEXT_API.PROXY(...)` on the client, or directly in `src/integrations/spring-api.ts` on the server.
- **Next.js internal routes** (leading `/`) → `NEXT_API.AUTH.*` → used directly in `fetch()` calls from client components.
- **Never** write a raw `fetch('/api/...')` string in application code. Always go through a constant.
