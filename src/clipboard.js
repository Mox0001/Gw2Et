import {waypoint} from './timeline-model.js';

/** Injectable browser adapters keep permissions and fallback behavior testable. */
export async function copyWaypointCode(value, {
  clipboard = globalThis.navigator?.clipboard,
  selectField = () => {},
  legacyCopy = () => globalThis.document?.execCommand('copy'),
} = {}) {
  const code = waypoint(value);
  if (!code) return 'invalid';
  try {
    if (typeof clipboard?.writeText === 'function') {
      await clipboard.writeText(code);
      return 'copied';
    }
  } catch { /* Permission denied: select the visible code for the fallback. */ }
  try {
    selectField();
    if (legacyCopy()) return 'copied';
  } catch { /* The visible code remains available for manual copying. */ }
  return 'manual';
}
