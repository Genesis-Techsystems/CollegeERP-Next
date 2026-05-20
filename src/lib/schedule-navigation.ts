/**
 * Run a navigation callback after the current task, so the App Router has
 * finished wiring `useRouter()` dispatch (avoids "Router action dispatched
 * before initialization" when calling `router.replace` / `push` from `useEffect`).
 */
export function scheduleNavigation(fn: () => void): () => void {
  if (globalThis.window === undefined) {
    return () => {}
  }
  const w = globalThis.window
  const id = w.setTimeout(fn, 0)
  return () => w.clearTimeout(id)
}
