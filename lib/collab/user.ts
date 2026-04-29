// Lightweight user identity for collab awareness.
//
// Stays browser-side only. The "id" is a per-tab UUID, not the database
// user id — two tabs from the same logged-in user appear as two
// collaborators (which matches the demo expectation: open the page in two
// windows to see them sync).

export interface CollabUser {
  /** Unique per browser tab. */
  id: string
  /** Display name (defaults to a random color-ish noun). */
  name: string
  /** Hex color for cursor + selection highlight. */
  color: string
}

const NAMES = [
  'Aspen', 'Birch', 'Cedar', 'Dahlia', 'Ember', 'Fern',
  'Glacier', 'Heath', 'Iris', 'Juniper', 'Kestrel', 'Larkspur',
  'Maple', 'Nutmeg', 'Olive', 'Poppy', 'Quill', 'Ribbon',
  'Sage', 'Tide', 'Umber', 'Violet', 'Willow', 'Yarrow',
]

// Color palette is deliberately saturated and high-contrast so cursors
// stand out against any canvas background.
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
]

const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function randomCollabUser(name?: string): CollabUser {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `u-${Math.random().toString(36).slice(2)}`
  return {
    id,
    name: (name?.trim() || pickRandom(NAMES)).slice(0, 32),
    color: pickRandom(COLORS),
  }
}
