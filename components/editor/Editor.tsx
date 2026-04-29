// Main Editor - Wix-style layout with dark chrome and top toolbar
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from 'zustand'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type Modifier,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Canvas } from './Canvas'
import { ComponentPalette } from './ComponentPalette'
import { PropertyPanel } from './PropertyPanel'
import { useEditorStore } from '@/store/editorStore'
import { PageSchema, ComponentNode, ComponentType } from '@/types/schema'
import { getDefaultCanvasSize } from '@/lib/editorLayout'
import { getDefaultProps, getDefaultStyle } from '@/components/registry'
import { computeSnap } from '@/lib/editor/snapping'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 500
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25
/** Snap activation distance in *screen* pixels. Translated to canvas-space
 *  by dividing by zoom so it stays the same on-screen at any zoom level. */
const SNAP_THRESHOLD_PX = 6
function canvasBounds(schema: PageSchema) {
  if (schema.canvas.width != null && schema.canvas.height != null) {
    return { w: schema.canvas.width, h: schema.canvas.height }
  }
  const { width, height } = getDefaultCanvasSize(window.innerWidth, window.innerHeight)
  return { w: width, h: height }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp a node's position so it stays fully within the canvas bounds. */
function clampPosition(
  x: number,
  y: number,
  nodeW: number,
  nodeH: number,
  canvasW: number,
  canvasH: number
) {
  const maxLeft = Math.max(0, canvasW - nodeW)
  const maxTop = Math.max(0, canvasH - nodeH)
  return {
    left: Math.max(0, Math.min(maxLeft, x)),
    top: Math.max(0, Math.min(maxTop, y)),
  }
}

/** 仅限制画布上已有节点，使其拖拽不超出白色画板（父元素）；左侧组件栏不受影响 */
const restrictCanvasNodeToArtboard: Modifier = (args) => {
  if (args.active?.data.current?.type !== 'canvas-node') {
    return args.transform
  }
  return restrictToParentElement(args)
}

/**
 * Convert a viewport-space pointer position into canvas-space coordinates.
 *
 * Why we use a raw pointer position instead of dnd-kit's `delta`:
 * dnd-kit applies *scroll compensation* to `delta` when the drag passes
 * through a scrollable ancestor — `delta` reflects the dragged element's
 * displacement relative to the scrolled content, not the pointer's raw
 * movement. With our scrollable canvas-drop-zone that meant
 * `activatorEvent.clientY + delta.y` could be hundreds of pixels off,
 * pushing every drop down to the bottom edge of the canvas.
 *
 * The artboard rect is post-scale (it carries `transform: scale(zoom)`
 * with `transformOrigin: 'center center'`), so dividing by `zoom` once
 * lands us in canvas-space.
 */
function pointerToCanvasSpace(
  artboardEl: HTMLElement,
  pointer: { x: number; y: number } | null,
  zoom: number,
): { x: number; y: number } | null {
  if (!pointer) return null
  const rect = artboardEl.getBoundingClientRect()
  return {
    x: (pointer.x - rect.left) / zoom,
    y: (pointer.y - rect.top) / zoom,
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorProps {
  pageId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Editor({ pageId }: EditorProps) {
  const { status: sessionStatus } = useSession()
  const router = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Track the live pointer position. `pointermove` fires for both mouse and
  // touch (Pointer Events API), so a single listener covers everything.
  // Updating a ref (not state) keeps this off the React render path; the
  // value is only read inside event handlers where freshness is fine.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])

  const { schema, setSchema, setSelectedId, addNode, updateNode, setZoom, zoom, setDragGuides } =
    useEditorStore()

  // Subscribe to zundo's temporal store. We watch only the lengths so the
  // editor re-renders just enough to flip the toolbar buttons enabled/
  // disabled — not on every history mutation.
  const pastCount = useStore(useEditorStore.temporal, (s) => s.pastStates.length)
  const futureCount = useStore(useEditorStore.temporal, (s) => s.futureStates.length)
  const undo = useCallback(() => useEditorStore.temporal.getState().undo(), [])
  const redo = useCallback(() => useEditorStore.temporal.getState().redo(), [])
  const clearHistory = useCallback(
    () => useEditorStore.temporal.getState().clear(),
    [],
  )

  // Keyboard shortcuts: ⌘Z / Ctrl+Z to undo, ⌘⇧Z / Ctrl+Y to redo.
  // Skip when the user is typing in an input/textarea so undo doesn't
  // hijack normal text editing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ── DnD sensors ─────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small movement before activating drag to avoid accidental drags
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Auth redirect ────────────────────────────────────────────────────────────
  // Wait until session is resolved before deciding whether to redirect.

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [sessionStatus, router])

  // ── Load page schema ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return

    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`)
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`)
        const data = await res.json()
        if (!cancelled && data.page) {
          setSchema(data.page.draftSchema as PageSchema)
          // The initial load is not a user edit. Drop any history that
          // accumulated during boot so ⌘Z can't rewind into nothingness.
          clearHistory()
        }
      } catch (e) {
        console.error('[Editor] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [pageId, sessionStatus, setSchema, clearHistory])

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveDraft = useCallback(
    (s: PageSchema) => {
      if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
      saveDraftTimer.current = setTimeout(async () => {
        setSaving(true)
        setSaveError(false)
        try {
          const res = await fetch(`/api/pages/${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftSchema: s }),
          })
          if (!res.ok) throw new Error(`Save failed: ${res.status}`)
        } catch (e) {
          console.error('[Editor] save error:', e)
          setSaveError(true)
        } finally {
          setSaving(false)
        }
      }, AUTOSAVE_DELAY_MS)
    },
    [pageId]
  )

  // Trigger auto-save whenever schema changes (but not during initial load)
  useEffect(() => {
    if (schema && !loading) saveDraft(schema)
  }, [schema, loading, saveDraft])

  // Clean up pending timer on unmount
  useEffect(() => () => {
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
  }, [])

  // ── Snap modifier ────────────────────────────────────────────────────────────
  // Adjusts the dragged element's transform so it locks onto edges/centers
  // of nearby nodes (and the canvas itself). Same algorithm runs in
  // `handleDragMove` to publish guide lines for the visual overlay.

  const snapModifier = useCallback<Modifier>(
    (args) => {
      if (!schema) return args.transform
      if (args.active?.data.current?.type !== 'canvas-node') return args.transform
      const result = computeSnap({
        schema,
        activeNodeId: args.active.id as string,
        delta: { x: args.transform.x / zoom, y: args.transform.y / zoom },
        threshold: SNAP_THRESHOLD_PX / zoom,
      })
      return {
        ...args.transform,
        x: result.snappedDelta.x * zoom,
        y: result.snappedDelta.y * zoom,
      }
    },
    [schema, zoom],
  )

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: DragStartEvent) => setActiveId(e.active.id as string),
    []
  )

  const handleDragMove = useCallback(
    (e: DragMoveEvent) => {
      if (!schema) return
      if (e.active.data.current?.type !== 'canvas-node') {
        setDragGuides({ vertical: [], horizontal: [] })
        return
      }
      const result = computeSnap({
        schema,
        activeNodeId: e.active.id as string,
        delta: { x: e.delta.x / zoom, y: e.delta.y / zoom },
        threshold: SNAP_THRESHOLD_PX / zoom,
      })
      setDragGuides(result.guides)
    },
    [schema, zoom, setDragGuides],
  )

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      // Always clear guide lines when a drag finishes — even if the user
      // dropped outside any droppable, otherwise they'd linger forever.
      setDragGuides({ vertical: [], horizontal: [] })
      const { active, over } = e
      setActiveId(null)
      if (!over || !schema) return

      const dragType = active.data.current?.type

      // ── Drop palette item onto canvas ──────────────────────────────────────
      if (dragType === 'palette-item') {
        const componentType = active.data.current?.componentType as ComponentType
        const defaultStyle = getDefaultStyle(componentType)
        const nodeW = defaultStyle.width  ?? 100
        const nodeH = defaultStyle.height ?? 50

        // Resolve drop coords against the *artboard* (`canvas-artboard`),
        // not the outer scrollable drop-zone. The artboard is what carries
        // `transform: scale(zoom)`, so its bounding rect is already in
        // post-zoom client space — exactly what we need to invert.
        const artboardEl = document.getElementById('canvas-artboard')
        let x = 100
        let y = 100

        if (artboardEl) {
          const pos = pointerToCanvasSpace(artboardEl, pointerRef.current, zoom)
          if (pos) {
            // Center the new element on the pointer rather than placing its
            // top-left at the pointer — feels more like the element was
            // dropped *at* the cursor, especially for big components.
            x = pos.x - nodeW / 2
            y = pos.y - nodeH / 2
          }
        }

        const { w: cw, h: ch } = canvasBounds(schema)
        const { left, top } = clampPosition(x, y, nodeW, nodeH, cw, ch)

        const node: ComponentNode = {
          id:    `node-${Date.now()}`,
          type:  componentType,
          props: getDefaultProps(componentType),
          style: { position: 'absolute', left, top, ...defaultStyle },
        }

        addNode(node)
        setSelectedId(node.id)
        return
      }

      // ── Move existing canvas node ──────────────────────────────────────────
      if (dragType === 'canvas-node') {
        const nodeId = active.id as string
        const node   = schema.nodes.find((n) => n.id === nodeId)
        if (!node) return

        const nodeW = node.style.width  ?? 100
        const nodeH = node.style.height ?? 50

        const { w: cw, h: ch } = canvasBounds(schema)
        const { left, top } = clampPosition(
          node.style.left + e.delta.x / zoom,
          node.style.top  + e.delta.y / zoom,
          nodeW, nodeH,
          cw,
          ch,
        )

        updateNode(nodeId, { style: { ...node.style, left, top } })
      }
    },
    [schema, zoom, addNode, setSelectedId, updateNode, setDragGuides]
  )

  // ── Publish ──────────────────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/publish`, { method: 'POST' })
      if (res.ok) {
        window.open(`/p/${pageId}`, '_blank')
      } else {
        console.error('[Editor] publish failed:', res.status)
      }
    } catch (e) {
      console.error('[Editor] publish error:', e)
    }
  }, [pageId])

  // ── Zoom helpers ─────────────────────────────────────────────────────────────

  const zoomOut = useCallback(
    () => setZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP)),
    [zoom, setZoom]
  )
  const zoomIn = useCallback(
    () => setZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP)),
    [zoom, setZoom]
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      // Order matters: restrict first (clamp to artboard), then snap so
      // alignment kicks in inside the constrained range.
      modifiers={[restrictCanvasNodeToArtboard, snapModifier]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-[#1e1e1e]">

        {/* ── Top toolbar ── */}
        <header className="h-12 flex-shrink-0 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="h-8 px-3 text-[#cccccc] hover:bg-[#2d2d2d] rounded text-sm"
            >
              ← Back
            </button>
            <span className="w-px h-5 bg-[#3c3c3c] mx-2" />
            <UndoRedoControls
              canUndo={pastCount > 0}
              canRedo={futureCount > 0}
              onUndo={undo}
              onRedo={redo}
            />
            <span className="w-px h-5 bg-[#3c3c3c] mx-2" />
            <span className="text-sm text-[#cccccc]">Editor</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Save status indicator */}
            <SaveIndicator saving={saving} error={saveError} />

            {/* Zoom controls */}
            <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} />

            <a
              href={`/p/${pageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 flex items-center text-[#cccccc] hover:bg-[#2d2d2d] rounded text-sm"
            >
              Preview
            </a>
            <button
              onClick={handlePublish}
              className="h-8 px-4 bg-[#0e639c] text-white rounded text-sm font-medium hover:bg-[#1177bb]"
            >
              Publish
            </button>
          </div>
        </header>

        {/* ── Main area ── */}
        <div className="flex flex-1 overflow-hidden">
          <ComponentPalette />
          <div className="flex-1 overflow-auto bg-[#f5f5f5] p-6" id="canvas-drop-zone">
            <Canvas zoom={zoom} />
          </div>
          <PropertyPanel />
        </div>
      </div>

      {/* Drag ghost */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-white/90 rounded shadow-lg px-4 py-2 text-sm text-gray-700 select-none">
            Dragging…
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SaveIndicatorProps {
  saving: boolean
  error:  boolean
}

function SaveIndicator({ saving, error }: SaveIndicatorProps) {
  if (error)  return <span className="text-xs text-red-400">Save failed</span>
  if (saving) return <span className="text-xs text-[#8c8c8c]">Saving…</span>
  return null
}

interface ZoomControlsProps {
  zoom:      number
  onZoomIn:  () => void
  onZoomOut: () => void
}

function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-[#2d2d2d] rounded px-1 py-0.5">
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="w-6 h-6 text-[#cccccc] hover:bg-[#3c3c3c] rounded text-sm"
      >
        −
      </button>
      <span className="text-xs text-[#cccccc] w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="w-6 h-6 text-[#cccccc] hover:bg-[#3c3c3c] rounded text-sm"
      >
        +
      </button>
    </div>
  )
}

interface UndoRedoControlsProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  // Shortcut hint adapts to platform — Mac shows ⌘, others show Ctrl.
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const mod = isMac ? '⌘' : 'Ctrl+'
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title={`Undo (${mod}Z)`}
        className="h-8 px-2 text-[#cccccc] hover:bg-[#2d2d2d] disabled:text-[#5a5a5a] disabled:hover:bg-transparent rounded text-base leading-none"
      >
        ↶
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title={`Redo (${mod}${isMac ? '⇧Z' : 'Y'})`}
        className="h-8 px-2 text-[#cccccc] hover:bg-[#2d2d2d] disabled:text-[#5a5a5a] disabled:hover:bg-transparent rounded text-base leading-none"
      >
        ↷
      </button>
    </div>
  )
}
