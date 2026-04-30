// Zustand store for editor state management.
//
// Wrapped with `zundo`'s `temporal` middleware to give the editor full
// Undo/Redo. Two design decisions worth noting:
//
//   1. `partialize` strips ephemeral UI state (selectedId, zoom) so undo
//      doesn't bounce the user's selection or viewport — only the schema
//      gets time-traveled.
//
//   2. `handleSet` is debounced by 300ms so a flurry of property-panel
//      keystrokes or per-pixel drag updates collapses into ONE history
//      entry instead of dozens. The live state still updates immediately;
//      we only delay *recording* it.
import { create, type StateCreator } from 'zustand'
import { temporal } from 'zundo'
import { PageSchema, ComponentNode } from '@/types/schema'
import type { Breakpoint } from '@/lib/editor/breakpoints'

export interface DragGuides {
  vertical: number[]
  horizontal: number[]
}

const NO_GUIDES: DragGuides = { vertical: [], horizontal: [] }

interface EditorState {
  schema: PageSchema | null
  selectedId: string | null
  zoom: number
  /** Active breakpoint the editor is *previewing/editing for*. UI-only;
   *  excluded from undo and from collab sync. */
  currentBreakpoint: Breakpoint
  /**
   * Live alignment guides published by the dnd-kit drag handlers. Always
   * `NO_GUIDES` when no drag is in progress. Excluded from undo history
   * via `partialize`.
   */
  dragGuides: DragGuides
  setSchema: (schema: PageSchema) => void
  setSelectedId: (id: string | null) => void
  setZoom: (zoom: number) => void
  setCurrentBreakpoint: (bp: Breakpoint) => void
  setDragGuides: (guides: DragGuides) => void
  addNode: (node: ComponentNode) => void
  updateNode: (id: string, updates: Partial<ComponentNode>) => void
  deleteNode: (id: string) => void
}

// Tiny trailing-edge debounce. zundo's docs suggest lodash, but pulling a
// 70KB dependency for one tiny utility is silly.
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// Define the state creator with an explicit type so we keep proper inference
// inside the inner reducers regardless of how `temporal` re-types its argument.
const editorStateCreator: StateCreator<EditorState> = (set) => ({
  schema: null,
  selectedId: null,
  zoom: 1,
  currentBreakpoint: 'desktop',
  dragGuides: NO_GUIDES,
  setSchema: (schema) => set({ schema }),
  setSelectedId: (id) => set({ selectedId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
  setCurrentBreakpoint: (bp) => set({ currentBreakpoint: bp }),
  setDragGuides: (guides) => set({ dragGuides: guides }),
  addNode: (node) =>
    set((state) => {
      if (!state.schema) return state
      return {
        schema: {
          ...state.schema,
          nodes: [...state.schema.nodes, node],
        },
      }
    }),
  updateNode: (id, updates) =>
    set((state) => {
      if (!state.schema) return state
      return {
        schema: {
          ...state.schema,
          nodes: state.schema.nodes.map((node) =>
            node.id === id ? { ...node, ...updates } : node,
          ),
        },
      }
    }),
  deleteNode: (id) =>
    set((state) => {
      if (!state.schema) return state
      return {
        schema: {
          ...state.schema,
          nodes: state.schema.nodes.filter((node) => node.id !== id),
        },
        selectedId: state.selectedId === id ? null : state.selectedId,
      }
    }),
})

export const useEditorStore = create<EditorState>()(
  temporal(editorStateCreator, {
    // Only track the schema. Selection / zoom are UI ephemera.
    partialize: (state) => ({ schema: state.schema }),
    // Reasonable cap. 100 distinct edits is more than the user will
    // realistically need to walk back through.
    limit: 100,
    // Coalesce rapid sequences (typing, dragging) into one history entry.
    handleSet: (handleSet) => debounce(handleSet, 300),
    // Skip history pushes when nothing meaningful changed (initial load,
    // identical reset). zundo defaults to deep-equals; here we shortcut
    // with a JSON compare which is fast enough for our schema sizes.
    equality: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
  }),
)
