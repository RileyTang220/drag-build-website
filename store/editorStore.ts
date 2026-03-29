// Zustand store for editor state management
import { create } from 'zustand'
import { PageSchema, ComponentNode } from '@/types/schema'

interface EditorState {
  schema: PageSchema | null
  selectedId: string | null
  zoom: number
  setSchema: (schema: PageSchema) => void
  setSelectedId: (id: string | null) => void
  setZoom: (zoom: number) => void
  addNode: (node: ComponentNode) => void
  updateNode: (id: string, updates: Partial<ComponentNode>) => void
  deleteNode: (id: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  schema: null,
  selectedId: null,
  zoom: 1,
  setSchema: (schema) => set({ schema }),
  setSelectedId: (id) => set({ selectedId: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
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
            node.id === id ? { ...node, ...updates } : node
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
}))
