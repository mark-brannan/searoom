// Lightweight, URL-driven feature flags. Deliberately outside the hash
// state in urlState.ts: these gate in-progress rendering paths rather than
// describing shareable scene configuration, so they live in the query
// string (?render3d=1) instead of the hash and don't round-trip through
// AppState.

export function render3dEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('render3d') === '1';
  } catch {
    return false;
  }
}
