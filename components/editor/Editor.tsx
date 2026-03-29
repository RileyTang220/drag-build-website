// Main Editor - Wix-style layout with dark chrome and top toolbar
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 500
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25
function canvasBounds(schema: PageSchema) {
  if (schema.canvas.width != null && schema.canvas.height != null) {
    return { w: schema.canvas.width, h: schema.canvas.height }
  }
  const { width, height } = getDefaultCanvasSize(window.innerWidth, window.innerHeight)
  return { w: width, h: height }
}

// ─── Default configs (moved outside component to avoid re-creation) ───────────

type StylePartial = Partial<ComponentNode['style']>

const DEFAULT_PROPS: Record<string, Record<string, unknown>> = {
  Text:      { content: 'Text' },
  Image:     { src: 'https://placehold.co/300x200', alt: 'Image' },
  Button:    { label: 'Button', href: '#' },
  Container: {},
}

const DEFAULT_STYLES: Record<string, StylePartial> = {
  Text:      { width: 200, height: 30,  fontSize: 16, color: '#000000' },
  Image:     { width: 300, height: 200 },
  Button:    { width: 120, height: 40,  backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: 4 },
  Container: { width: 300, height: 200, backgroundColor: '#f3f4f6' },
}

function getDefaultProps(type: string): Record<string, unknown> {
  return DEFAULT_PROPS[type] ?? {}
}

function getDefaultStyle(type: string): StylePartial {
  return DEFAULT_STYLES[type] ?? {}
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
 * Resolve the drop position relative to the canvas element, taking zoom into
 * account. Returns { x, y } in canvas-space (un-zoomed) coordinates.
 */
function resolveDropPosition(
  canvasEl: HTMLElement,
  overRect: DOMRect,
  delta: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  const canvasRect = canvasEl.getBoundingClientRect()
  // Convert client-space delta+position into canvas-space coordinates
  const clientX = overRect.left + delta.x
  const clientY = overRect.top  + delta.y
  return {
    x: (clientX - canvasRect.left)  / zoom,
    y: (clientY - canvasRect.top)   / zoom,
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorProps {
  pageId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Editor({ pageId }: EditorProps) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const { schema, setSchema, setSelectedId, addNode, updateNode, setZoom, zoom } =
    useEditorStore()

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
        }
      } catch (e) {
        console.error('[Editor] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [pageId, sessionStatus, setSchema])

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

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: DragStartEvent) => setActiveId(e.active.id as string),
    []
  )

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e
      setActiveId(null)
      if (!over || !schema) return

      const dragType = active.data.current?.type

      // ── Drop palette item onto canvas ──────────────────────────────────────
      if (dragType === 'palette-item') {
        const componentType = active.data.current?.componentType as string
        const defaultStyle = getDefaultStyle(componentType)
        const nodeW = defaultStyle.width  ?? 100
        const nodeH = defaultStyle.height ?? 50

        const canvasEl = document.getElementById('canvas-drop-zone')
        let x = 100
        let y = 100

        if (canvasEl && over.rect) {
          const pos = resolveDropPosition(canvasEl, over.rect as DOMRect, e.delta, zoom)
          x = pos.x
          y = pos.y
        }

        const { w: cw, h: ch } = canvasBounds(schema)
        const { left, top } = clampPosition(x, y, nodeW, nodeH, cw, ch)

        const node: ComponentNode = {
          id:    `node-${Date.now()}`,
          type:  componentType as ComponentType,
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
    [schema, zoom, addNode, setSelectedId, updateNode]
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
      modifiers={[restrictCanvasNodeToArtboard]}
      onDragStart={handleDragStart}
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
