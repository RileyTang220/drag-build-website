// Main Editor component with drag-and-drop functionality
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
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Canvas } from './Canvas'
import { ComponentPalette } from './ComponentPalette'
import { PropertyPanel } from './PropertyPanel'
import { useEditorStore } from '@/store/editorStore'
import { PageSchema, ComponentNode, ComponentType } from '@/types/schema'
import { debounce } from '@/lib/utils'

interface EditorProps {
  pageId: string
}

export function Editor({ pageId }: EditorProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const {
    schema,
    setSchema,
    setSelectedId,
    addNode,
    updateNode,
  } = useEditorStore()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load page data
  useEffect(() => {
    if (!session) {
      router.push('/dashboard')
      return
    }

    const loadPageData = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`)
        const data = await res.json()
        if (data.page) {
          setSchema(data.page.draftSchema as PageSchema)
        }
      } catch (error) {
        console.error('Error loading page:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [pageId, session, router, setSchema])

  // Debounced save function
  const saveDraftRef = useRef<NodeJS.Timeout | null>(null)
  
  const saveDraft = useCallback((schemaToSave: PageSchema) => {
    if (saveDraftRef.current) {
      clearTimeout(saveDraftRef.current)
    }
    
    saveDraftRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch(`/api/pages/${pageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            draftSchema: schemaToSave,
          }),
        })
      } catch (error) {
        console.error('Error saving draft:', error)
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [pageId])

  // Save when schema changes
  useEffect(() => {
    if (schema && !loading) {
      saveDraft(schema)
    }
  }, [schema, loading, saveDraft])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    // Handle dropping a new component from palette
    if (active.data.current?.type === 'palette-item') {
      const componentType = active.data.current.componentType as string
      
      // Get drop coordinates - use the over rect if available
      // Otherwise calculate from delta
      let relativeX = 0
      let relativeY = 0
      
      if (over.rect) {
        // Calculate position relative to canvas center
        const canvasElement = document.getElementById('canvas-drop-zone')
        if (canvasElement) {
          const canvasRect = canvasElement.getBoundingClientRect()
          const canvasInner = canvasElement.querySelector('[ref]') || canvasElement
          const innerRect = canvasInner.getBoundingClientRect()
          
          // Use mouse position relative to canvas
          relativeX = Math.max(0, event.delta.x + (innerRect.left - canvasRect.left))
          relativeY = Math.max(0, event.delta.y + (innerRect.top - canvasRect.top))
        } else {
          // Fallback: use delta directly
          relativeX = Math.max(0, event.delta.x)
          relativeY = Math.max(0, event.delta.y)
        }
      } else {
        // Fallback: use delta directly
        relativeX = Math.max(0, event.delta.x)
        relativeY = Math.max(0, event.delta.y)
      }
      
      const newNode: ComponentNode = {
        id: `node-${Date.now()}`,
        type: componentType as ComponentType,
        props: getDefaultProps(componentType),
        style: {
          position: 'absolute',
          left: relativeX,
          top: relativeY,
          ...getDefaultStyle(componentType),
        },
      }

      addNode(newNode)
      setSelectedId(newNode.id)
      return
    }

    // Handle moving existing component
    if (active.data.current?.type === 'canvas-node') {
      const nodeId = active.id as string
      const node = schema?.nodes.find((n) => n.id === nodeId)
      if (!node || !schema) return

      updateNode(nodeId, {
        style: {
          ...node.style,
          left: Math.max(0, node.style.left + event.delta.x),
          top: Math.max(0, node.style.top + event.delta.y),
        },
      })
    }
  }

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/publish`, {
        method: 'POST',
      })
      if (res.ok) {
        alert('Page published successfully!')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error publishing page:', error)
      alert('Failed to publish page')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading editor...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Editor</h1>
          <div className="flex items-center gap-2">
            {saving && <span className="text-sm text-gray-500">Saving...</span>}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Back
            </button>
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Component Palette */}
          <ComponentPalette />

          {/* Canvas */}
          <div className="flex-1 overflow-auto">
            <Canvas />
          </div>

          {/* Property Panel */}
          <PropertyPanel />
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-50">Dragging...</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function getDefaultProps(type: string): Record<string, unknown> {
  switch (type) {
    case 'Text':
      return { content: 'Text' }
    case 'Image':
      return { src: 'https://via.placeholder.com/300', alt: 'Image' }
    case 'Button':
      return { label: 'Button', href: '#' }
    case 'Container':
      return {}
    default:
      return {}
  }
}

function getDefaultStyle(type: string): Partial<ComponentNode['style']> {
  switch (type) {
    case 'Text':
      return { width: 200, fontSize: 16, color: '#000000' }
    case 'Image':
      return { width: 300, height: 200 }
    case 'Button':
      return {
        width: 120,
        height: 40,
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        borderRadius: 4,
      }
    case 'Container':
      return { width: 300, height: 200, backgroundColor: '#f3f4f6' }
    default:
      return {}
  }
}
