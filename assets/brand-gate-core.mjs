// Preview-specific entry-state helpers. They are NOT user authentication.
export const INTRO_DURATION_MS = 6000;
export const PREVIEW_SESSION_KEY = "360business-suite.preview.session.v1";
export function entryRoute({ hasVerifiedServerSession = false, hasSavedPreviewSession = false } = {}) {
  return hasVerifiedServerSession || hasSavedPreviewSession ? "workspace" : "intro";
}
export function isSavedPreviewSession(storage) {
  try { return storage?.getItem(PREVIEW_SESSION_KEY) === "active"; } catch { return false; }
}
export function savePreviewSession(storage) {
  try { storage?.setItem(PREVIEW_SESSION_KEY, "active"); return true; } catch { return false; }
}
export function clearPreviewSession(storage) {
  try { storage?.removeItem(PREVIEW_SESSION_KEY); } catch {}
}
