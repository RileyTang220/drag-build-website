// Property panel for editing selected component properties
'use client'

import { useEditorStore } from '@/store/editorStore'
// Property panel imports

export function PropertyPanel() {
  const { schema, selectedId, updateNode, deleteNode } = useEditorStore()

  if (!schema || !selectedId) {
    return (
      <div className="w-80 bg-white border-l p-4">
        <h2 className="text-lg font-semibold mb-4">Properties</h2>
        <p className="text-gray-500 text-sm">Select a component to edit properties</p>
      </div>
    )
  }

  const node = schema.nodes.find((n) => n.id === selectedId)
  if (!node) {
    return (
      <div className="w-80 bg-white border-l p-4">
        <h2 className="text-lg font-semibold mb-4">Properties</h2>
        <p className="text-gray-500 text-sm">Component not found</p>
      </div>
    )
  }

  const handlePropChange = (key: string, value: unknown) => {
    updateNode(selectedId, {
      props: {
        ...node.props,
        [key]: value,
      },
    })
  }

  const handleStyleChange = (key: string, value: unknown) => {
    updateNode(selectedId, {
      style: {
        ...node.style,
        [key]: value,
      },
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this component?')) {
      deleteNode(selectedId)
    }
  }

  return (
    <div className="w-80 bg-white border-l p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Properties</h2>
        <button
          onClick={handleDelete}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      <div className="space-y-4">
        {/* Position & Size */}
        <div>
          <h3 className="text-sm font-medium mb-2">Position & Size</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Left (px)</label>
              <input
                type="number"
                value={node.style.left}
                onChange={(e) => handleStyleChange('left', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Top (px)</label>
              <input
                type="number"
                value={node.style.top}
                onChange={(e) => handleStyleChange('top', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
              <input
                type="number"
                value={node.style.width || ''}
                onChange={(e) =>
                  handleStyleChange('width', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
              <input
                type="number"
                value={node.style.height || ''}
                onChange={(e) =>
                  handleStyleChange('height', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Z-Index</label>
              <input
                type="number"
                value={node.style.zIndex || 1}
                onChange={(e) => handleStyleChange('zIndex', parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Component-specific props */}
        {node.type === 'Text' && (
          <div>
            <h3 className="text-sm font-medium mb-2">Text Properties</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Content</label>
                <textarea
                  value={node.props.content || ''}
                  onChange={(e) => handlePropChange('content', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Font Size (px)</label>
                <input
                  type="number"
                  value={node.style.fontSize || 16}
                  onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 16)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Color</label>
                <input
                  type="color"
                  value={node.style.color || '#000000'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-full h-8 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        {node.type === 'Image' && (
          <div>
            <h3 className="text-sm font-medium mb-2">Image Properties</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Image URL</label>
                <input
                  type="url"
                  value={node.props.src || ''}
                  onChange={(e) => handlePropChange('src', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={node.props.alt || ''}
                  onChange={(e) => handlePropChange('alt', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {node.type === 'Button' && (
          <div>
            <h3 className="text-sm font-medium mb-2">Button Properties</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Label</label>
                <input
                  type="text"
                  value={node.props.label || ''}
                  onChange={(e) => handlePropChange('label', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Link URL</label>
                <input
                  type="url"
                  value={node.props.href || ''}
                  onChange={(e) => handlePropChange('href', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                <input
                  type="color"
                  value={node.style.backgroundColor || '#3b82f6'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-full h-8 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                <input
                  type="color"
                  value={node.style.color || '#ffffff'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-full h-8 border rounded"
                />
              </div>
            </div>
          </div>
        )}

        {node.type === 'Container' && (
          <div>
            <h3 className="text-sm font-medium mb-2">Container Properties</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                <input
                  type="color"
                  value={node.style.backgroundColor || '#ffffff'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-full h-8 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Border Width (px)</label>
                <input
                  type="number"
                  value={node.style.borderWidth || 0}
                  onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Border Color</label>
                <input
                  type="color"
                  value={node.style.borderColor || '#000000'}
                  onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                  className="w-full h-8 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Border Radius (px)</label>
                <input
                  type="number"
                  value={node.style.borderRadius || 0}
                  onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
