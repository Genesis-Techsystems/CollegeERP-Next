# Marking Page — Complete Flow Documentation

> File: `src/app/(pages)/(protected)/admin-examination-management/evaluation-process/evaluator-subjects/marking/marking-content.tsx`

---

## Entry Point & URL Parameters

The page is accessed via `marking/page.tsx`, which is a thin shell that dynamically imports `marking-content.tsx` with `ssr: false`. This prevents `pdfjs-dist` from evaluating on the server (it calls browser-only `DOMMatrix` at module load time).

The URL must carry these params (set by the answer-sheets page when a row is clicked):

| Param | Purpose |
|---|---|
| `examEvaluationAssignmentId` | The specific assignment record |
| `studentAnswerPaperId` | Which PDF to load |
| `examEvaluatorProfileId` | For navigating back |
| `examEvaluatorProfileDetId` | For navigating back |
| `subjectName` | Display only |
| `subjectCode` | Display only |

---

## Initial Data Load

On mount, a single `useEffect` fires a `Promise.allSettled` of three parallel calls:

### 1. `getExamQpDraftMarks({ examEvaluationAssignmentId, orgId })`

Returns `[questions, details]`.

- **questions** — `QuestionMark[]`, one entry per sub-question with: `questionPaperMarksId`, `qvalue`, `questionMarks`, `answeredMarks`, `isNotAnswered`, `no_action_yet`, and saved stamp coords (`mbtn_x`, `mbtn_y`, `mbtn_pageNum`).
- **details** — single `EvalAssignmentDetail` with status, total marks, OMR serial number, etc.

After loading, the page immediately calls `updateEvalAssignmentStartDate(examEvaluationAssignmentId, now)` fire-and-forget — records when the evaluator opened the paper.

Saved stamps are reconstructed: any question where `mbtn_x/y/pageNum` are non-null gets converted to a `Stamp` object, restoring prior session annotations visually on the PDF.

### 2. `getAnswerPaperBase64(studentAnswerPaperId)`

Returns a base64 string. The page decodes it with `atob()`, converts to a `Uint8Array`, creates a `Blob`, then `URL.createObjectURL(blob)` to get a local `blob://` URL. PDF.js loads this URL — no further network hit for the PDF. The blob URL is stored in `blobUrlRef` and revoked on unmount.

### 3. `getEvalSetting('MarksIntervals')`

Returns a string like `"0.5"` or `"1"`. Parsed as float and stored in `marksInterval` — controls the step between mark buttons (e.g. 0, 0.5, 1, 1.5 … or 0, 1, 2, 3 …).

If questions fail → `loadError` is set, only an error screen renders.  
If the PDF fails → `pdfError` is set, center pane shows a fallback message (evaluation can still proceed via sidebar alone).

---

## Locked State

`isEvalLocked(statusId)` checks `evaluationStatusCatDetId`. If the paper is already Evaluated or Rejected, `locked = true`. When locked:

- No mark buttons render
- No stamp overlays appear
- No action buttons show
- Timer doesn't run
- `popstate` trap is not set
- Keyboard shortcuts do nothing

---

## Timer

A `setInterval` runs every second incrementing `elapsedSeconds` (initialized from `assignmentDetail.evaluationTime` if resuming a session). This tracks how long the evaluator spent on the paper. Sent to the server on Save & Exit, Finish, Reject, and UFM.

---

## Three-Pane Layout

```
┌──────────────┬────────────────────┬──────────────┐
│ Left pane    │ Center pane        │ Right pane   │
│ (Questions + │ (PDF canvas viewer)│ (Score card  │
│  Marks)      │                    │  + Buttons   │
│              │                    │  + Q table)  │
└──────────────┴────────────────────┴──────────────┘
```

---

## Left Pane — Questions Column

Renders `QuestionNavPanel`. Questions grouped by `level1No` (Part A, Part B, etc.) in a 2-column button grid.

| Button state | Condition |
|---|---|
| Blue/primary | Active (currently selected) |
| Green tint | Graded (`no_action_yet === 0` and has marks) |
| Strikethrough + muted | Marked Not Answered |
| Plain | Unvisited |

Clicking any button: `setActiveQId(id)` + clears `selectedMark`.

---

## Left Pane — Marks Column

Renders `MarkSelectorPanel` for the active question. `buildMarkButtons(maxMarks, marksInterval)` generates `[0, 0.5, 1, 1.5, … maxMarks]`. Each value is a button.

**Clicking a mark button** — toggles `selectedMark`. Clicking the same value again deselects it. The PDF canvas cursor changes to `crosshair` when a mark is selected.

**N/A button** — opens `NotAnsweredDialog`.

| Button state | Condition |
|---|---|
| Amber/selected | Currently chosen, pending placement on PDF |
| Primary | Assigned AND a stamp exists for it |
| Primary/70 | Assigned but stamp missing (edge case from restore) |
| Teal | Unselected option |

### Annotation Tools (bottom of marks column)

| Button | Action |
|---|---|
| ✓ Check | `handleIconAnnotation('right')` → `iconAnnotations[activeQId] = 'right'`. Client-side only; included in payload on save. |
| ✗ X | Same but `'wrong'`. |
| 👁 Eye | `setShowThumbnails(true)` → opens thumbnail overlay. |
| 🗑 Trash2 | `handleDeleteMark()`. Only enabled if `no_action_yet === 0`. |
| ↩ Undo | Pops `undoStack`, restores previous `questions` state. |
| Size −/+ | Adjusts `stampSize` (range 20–120, default 50). Changes stamp size on canvas. |

---

## Center Pane — PDF Canvas Viewer

### PDF Loading

`pdfjs.getDocument(url).promise` loads the document. On success, `numPages` is set and a `setTimeout(60ms)` fires `renderPage` for all pages.

### `renderPage(pageNum, stampsSnapshot, zoom, sz)`

1. Increments per-page `genRef` counter (stale-check — only the latest render wins).
2. `doc.getPage(pageNum)` (async).
3. Creates a **temporary canvas** (`document.createElement('canvas')`) and renders the PDF page into it via `page.render({ canvasContext: tmpCtx, viewport }).promise`.
4. Sets `canvas.width = newW` and `canvas.height = newH` on the **display canvas** — forces a full reset to blank + identity transform.
5. `ctx.drawImage(tmp, 0, 0)` — copies PDF pixels in.
6. `drawAnnotationsOnCanvas` — loops through stamps for this page, draws the cyan rounded-rect stamps + red question labels on top.

> **Why temp canvas?** PDF.js does not restore the canvas context transform after `page.render()`. When `canvas.width = sameValue` (no size change between renders), browsers treat it as a no-op and skip the context reset. Without the temp canvas, accumulated transforms cause an H+V flip on pages 2+.

### Re-render Triggers

| Trigger | Pages re-rendered |
|---|---|
| `numPages` changes (initial load) | All |
| `stamps` changes | Only dirty pages (gained or lost a stamp) |
| `zoomMultiplier` or `stampSize` changes | All |

### Canvas Click

Only fires when `selectedMark !== null` and not locked. Converts `clientX/Y` to canvas coordinates, divides by `zoomMultiplier` to get base-scale coords, calls `onCanvasClick(pageNum, x, y)` → `handleAddStamp`.

### Stamp Overlay

For each stamp on the page, an absolutely-positioned invisible `div` is rendered as a hit area. On `mouseEnter`, the stamp's actual screen position is computed from the canvas's current `getBoundingClientRect()` + the stamp's stored base-scale coordinates × `zoomMultiplier`. A compact icon-only popup (Move icon + divider + Delete button) appears centered above the stamp.

**Popup positioning formula:**
```
left = canvasRect.left + stamp.x * zoomMultiplier + (stampSize * zoomMultiplier) / 2 - 36
top  = canvasRect.top  + stamp.y * zoomMultiplier - 40
```

On `mouseLeave` the popup starts a 250ms close timer — cancelled if the mouse enters the popup, preventing flicker when crossing from stamp hit-area to popup.

### Toolbar

- Zoom out/in (0.25 steps, range 0.5–3×)
- Preset zoom buttons: 75%, 100%, 150%, 200%
- Previous/next page buttons
- Current page indicator

### IntersectionObserver

Watches all page wrapper divs. As the user scrolls, `currentPage` updates to whichever page is most visible. Used by the page navigator.

### Thumbnail Overlay

Uses `react-pdf`'s `<Document>` + `<Page>` components (not the custom canvas renderer). Clicking a thumbnail calls `goTo(pageNum)` → scrolls the main canvas area to that page and closes the overlay.

---

## Right Pane — MarkingRightPanel

### Score Card

Shows `totalAwarded / totalMax` in a blue gradient box. `totalAwarded` is computed client-side by summing `answeredMarks` for all questions where `isNotAnswered` is false — recalculated on every render.

### Action Buttons (2×2 grid, only when not locked)

| Button | Color | Handler |
|---|---|---|
| Save & Exit | Amber | `handleSaveExit` |
| Finish | Green | `handleSubmit` |
| Reject | Red | `handleReject` |
| UFM | Indigo | `handleUFM` |

### Pending Indicator

If any questions have `no_action_yet === 1` and are not NA, shows "N pending" in amber.

### Questions Table

Scrollable list of all questions grouped by part. Clicking any row → `setActiveQId`. Active row is highlighted. Marks shown per row.

### Footer Stats

Total questions, visited count (`no_action_yet === 0`), not-visited count.

---

## Action Buttons — Network Calls

### Save & Exit (`handleSaveExit`)

1. `window.confirm` prompt.
2. Collects all questions where `no_action_yet === 0`.
3. `saveStudentEvalPages(buildPages(actedQuestions))` — saves marks + stamp positions.
4. `updateEvalAssignment(id, { status: IN_PROGRESS, evaluationTime: elapsed })` — marks paper in-progress, records time.
5. `router.push(ANSWER_SHEETS_PATH)`.

### Finish (`handleSubmit`)

1. Blocks if any `pendingQuestions` remain — alerts with their names.
2. `window.confirm`.
3. `saveStudentEvalPages(buildPages(allQuestions))` — saves every question.
4. `finalizeEvalMarks(examEvaluationAssignmentId)` — marks paper as Evaluated on server.
5. Navigate back.

### Reject (`handleReject`)

1. `window.prompt` for rejection reason.
2. `rejectEvalAssignment(id, payload)` — sends `status=REJECTED`, today's date as end date, reason text.
3. Navigate back.

### UFM (`handleUFM`)

1. `window.prompt` for UFM reason.
2. `ufmEvalAssignment(id, payload)` — same shape as reject but `isUfm: true`, reason in `ufmReason` field.
3. Navigate back.

---

## Stamp Placement Flow

1. User clicks a mark button → `selectedMark = 5`. Amber banner appears: "5 selected — click PDF to place stamp".
2. User clicks on PDF canvas → `handleAddStamp(pageNum, x, y)`.
3. Creates `Stamp`: `{ id: Date.now(), pageNum, x, y, questionId: activeQId, label: 'Q1a', marks: 5 }`.
4. `setStamps` — replaces any existing stamp for this question (one stamp per question max).
5. `handleMarksChange(activeQId, 5)` — sets `answeredMarks = 5`, `no_action_yet = 0`.
6. `setSelectedMark(null)` — clears selection.
7. **Immediate network call**: `saveStudentEvalPages([payload])` — persists stamp immediately (mirrors Angular's per-stamp save).
8. `stamps` state change triggers re-render of only the affected page.

---

## Stamp Move (Drag) Flow

After a stamp is placed it can be repositioned without deleting and re-placing it.

### Entry point

Hovering a stamp shows the stamp popup. The Move icon (`<Move />`) is a visual cue — it is not clickable itself. Drag begins when the user presses the mouse button (`mousedown`) anywhere on the stamp's hit-area `div`.

### `handleStampMouseDown(stamp, e)`

1. `e.preventDefault()` — prevents text selection and browser drag-image.
2. Captures `canvas.getBoundingClientRect()` at the moment of press (stored in `dragState.canvasRect`).
3. Sets `dragState`:
   ```ts
   {
     stamp,
     offsetX: e.clientX - canvasRect.left - stamp.x * zoomMultiplier,
     offsetY: e.clientY - canvasRect.top  - stamp.y * zoomMultiplier,
     screenX: e.clientX,
     screenY: e.clientY,
     canvasRect,
   }
   ```
4. Closes the popup (`setStampPopup(null)`).

### During drag

A `useEffect` watching `dragState` attaches `mousemove` and `mouseup` listeners to `window`.

**`onMove`** — refreshes `canvasRect` on every event (so the ghost stays accurate if the user scrolls during drag) and updates `dragState.screenX/Y`.

**Ghost preview** — an absolutely-positioned `<div>` rendered inside the per-page canvas wrapper (NOT `position: fixed`):

> **Why `absolute` not `fixed`?** `position: fixed` is relative to the nearest ancestor with a CSS `transform`, `filter`, or `will-change`. The app shell sidebar applies CSS transitions that use `transform`, making `fixed` coordinates unreliable. `absolute` inside the canvas wrapper shares the same coordinate space as the stamps and is unaffected by ancestor transforms.

Ghost position formula:
```
left = dragState.screenX - dragState.canvasRect.left - SW / 2
top  = dragState.screenY - dragState.canvasRect.top  - SH / 2
```
The ghost is centered on the cursor (`SW/2`, `SH/2` subtracted), regardless of where on the stamp the user grabbed it.

Ghost appearance: `bg-cyan-600/60` (slightly transparent), no border — distinguishable from the placed stamp but clearly the same shape.

### `onUp` — drop

1. Gets a fresh `canvasRect` from the canvas element.
2. Converts cursor screen position to base-scale canvas coordinates:
   ```ts
   const rawX = (e.clientX - freshRect.left) / zoomMultiplier - stampSize / 2
   const rawY = (e.clientY - freshRect.top)  / zoomMultiplier - stampSize / 2
   ```
3. Clamps to canvas bounds.
4. Calls `onStampMove(stamp, newX, newY)` → `handleStampMove`.
5. Clears `dragState`.

### `handleStampMove(stamp, newX, newY)`

1. Optimistically updates local `stamps` state (immediate visual feedback).
2. Fires `saveStudentEvalPages([payload])` with the new `x_Axis` / `y_Axis` — same API as stamp placement, server overwrites the existing record.

---

## Stamp Delete Flow

### Via canvas popup (`handleStampDelete(stamp)`)

1. Mouse hovers stamp hit-area div.
2. Fixed-position popup appears.
3. User clicks "Delete".
4. `deleteEvalMark(examEvaluationAssignmentId, stamp.questionId)`.
5. On success: question reverts to `answeredMarks: null, no_action_yet: 1`. Stamp removed. Icon annotation cleared.

### Via toolbar trash button (`handleDeleteMark()`)

Same as above but uses `activeQId` instead of stamp's questionId.

---

## Not Answered Flow

1. Click N/A button → opens `NotAnsweredDialog`.
2. User selects questions via checkboxes.
3. If any selected question already has marks → confirmation step before proceeding.
4. On confirm: `handleMarkNotAnswered(ids)`.
   - Updates selected questions: `isNotAnswered: true, answeredMarks: 0, no_action_yet: 0`.
   - Removes their stamps from canvas.
   - `saveStudentEvalPages(payloads)` — one payload per question, `isNotAnswered: true, marks: 0, x: 0, y: 0`.

---

## Undo System

Every mutation through `handleMarksChange` calls `pushUndo(prev)` first, storing a snapshot of the entire `questions` array (capped at 50 entries). `handleUndo` pops the last snapshot and restores it.

> **Note**: Undo only restores `questions` state (marks, NA status). It does **not** undo server calls or remove stamps from the canvas.

Ctrl+Z / Cmd+Z also triggers undo via a `keydown` listener.

---

## Keyboard Shortcuts

All active only when not locked and not typing in an input field.

| Key | Action |
|---|---|
| `Escape` | Clear `selectedMark` |
| `0–9` | Toggle that digit as `selectedMark` (if ≤ active question's max marks) |
| `←` / `↑` | Previous question |
| `→` / `↓` | Next question |
| `Ctrl/Cmd+Z` | Undo |

---

## `buildPages` — Payload Assembly

Called before every server save. For each question:

| Field | Value |
|---|---|
| `pageNumber` | Stamp's page, or `1` if no stamp |
| `marks` | `answeredMarks ?? 0` |
| `iconType` | `'iconBtn'` if ✓/✗ annotation, `'stamp'` if stamp placed, `null` otherwise |
| `iconId` | `3` for correct, `7` for wrong |
| `x_Axis` / `y_Axis` | Stamp coordinates in base-scale pixels, rounded to integer |

---

## Navigation Lock

When the paper is not locked and not loading, the page pushes a dummy history entry and sets `window.onpopstate = () => window.history.go(1)`. This prevents accidental back-navigation mid-evaluation. The trap is removed on unmount.

---

## Service Call Summary

All network calls from this page go through `src/services/evaluation.ts`. No `fetch()` is called directly from the page.

| Call | Trigger | Service function | HTTP method |
|---|---|---|---|
| Load questions + assignment | Mount | `getExamQpDraftMarks` | `getAllRecords` proc |
| Load PDF | Mount | `getAnswerPaperBase64` | `GET` (raw fetch — text response) |
| Load mark interval | Mount | `getEvalSetting` | `domainList` |
| Record open time | After load | `updateEvalAssignmentStartDate` | `putDetails` |
| Place/move stamp | Each stamp action | `saveStudentEvalPages` | `postDetails` |
| Delete stamp | Trash icon | `deleteEvalMark` | `getAllRecords` proc |
| Save & Exit | Button | `saveStudentEvalPages` + `updateEvalAssignment` | `postDetails` + `putDetails` |
| Finish (finalize) | Button | `saveStudentEvalPages` + `finalizeEvalMarks` + `addFinalEvalPapers` + `updateEvalAssignment` + `saveFinalEvalPdf` + `updateEvalsCompletedCount` | mixed |
| Reject | Button | `rejectEvalAssignment` | `domainUpdate` |
| UFM | Button | `ufmEvalAssignment` | `domainUpdate` |
| Mark not answered | N/A button | `saveStudentEvalPages` | `postDetails` |
