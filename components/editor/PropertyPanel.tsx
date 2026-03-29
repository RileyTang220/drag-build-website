// Property panel - Wix-style design settings for selected element
'use client'

import { useEditorStore } from '@/store/editorStore'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function PropertyPanel() {
  const { schema, selectedId, updateNode, deleteNode } = useEditorStore()

  if (!schema || !selectedId) {
    return (
      <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-400 text-sm">Select an element to edit its design</p>
      </div>
    )
  }

  const node = schema.nodes.find((n) => n.id === selectedId)
  if (!node) return null

  const handlePropChange = (key: string, value: unknown) => {
    updateNode(selectedId, { props: { ...node.props, [key]: value } })
  }
  const handleStyleChange = (key: string, value: unknown) => {
    updateNode(selectedId, { style: { ...node.style, [key]: value } })
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-800">Design</h2>
        <button
          onClick={() => confirm('Delete this element?') && deleteNode(selectedId)}
          className="text-xs text-red-500 hover:text-red-600"
        >
          Delete
        </button>
      </div>
      <div className="p-4">
        <Section title="Position & Size">
          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <input
                type="number"
                value={node.style.left}
                onChange={(e) => handleStyleChange('left', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Y">
              <input
                type="number"
                value={node.style.top}
                onChange={(e) => handleStyleChange('top', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Width">
              <input
                type="number"
                value={node.style.width ?? ''}
                onChange={(e) => handleStyleChange('width', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="auto"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Height">
              <input
                type="number"
                value={node.style.height ?? ''}
                onChange={(e) => handleStyleChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="auto"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
          </div>
        </Section>

        {node.type === 'Text' && (
          <Section title="Text">
            <Field label="Content">
              <textarea
                value={(node.props.content as string) || ''}
                onChange={(e) => handlePropChange('content', e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Font Size">
              <input
                type="number"
                value={node.style.fontSize ?? 16}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 16)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Color">
              <input
                type="color"
                value={node.style.color || '#000000'}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-8 border border-gray-200 rounded cursor-pointer"
              />
            </Field>
          </Section>
        )}

        {node.type === 'Image' && (
          <Section title="Image">
            <Field label="URL">
              <input
                type="url"
                value={(node.props.src as string) || ''}
                onChange={(e) => handlePropChange('src', e.target.value)}
                placeholder="https://..."
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Alt">
              <input
                type="text"
                value={(node.props.alt as string) || ''}
                onChange={(e) => handlePropChange('alt', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
          </Section>
        )}

        {node.type === 'Button' && (
          <Section title="Button">
            <Field label="Label">
              <input
                type="text"
                value={(node.props.label as string) || ''}
                onChange={(e) => handlePropChange('label', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <Field label="Link">
              <input
                type="url"
                value={(node.props.href as string) || ''}
                onChange={(e) => handlePropChange('href', e.target.value)}
                placeholder="https://..."
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="BG">
                <input
                  type="color"
                  value={node.style.backgroundColor || '#3b82f6'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-full h-8 border border-gray-200 rounded cursor-pointer"
                />
              </Field>
              <Field label="Text">
                <input
                  type="color"
                  value={node.style.color || '#ffffff'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-full h-8 border border-gray-200 rounded cursor-pointer"
                />
              </Field>
            </div>
          </Section>
        )}

        {node.type === 'Container' && (
          <Section title="Box">
            <Field label="Background">
              <input
                type="color"
                value={node.style.backgroundColor || '#f3f4f6'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-full h-8 border border-gray-200 rounded cursor-pointer"
              />
            </Field>
            <Field label="Border Radius">
              <input
                type="number"
                value={node.style.borderRadius ?? 0}
                onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]"
              />
            </Field>
          </Section>
        )}
      </div>
    </div>
  )
}
