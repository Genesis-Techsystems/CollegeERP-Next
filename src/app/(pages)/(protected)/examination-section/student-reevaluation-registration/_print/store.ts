const KEY = "collegeerp.reEvalReceiptPrint";

export function saveReEvalReceiptPrintPayload(data: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadReEvalReceiptPrintPayload(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
