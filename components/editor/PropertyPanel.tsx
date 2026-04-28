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

const inputCls =
  'w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#2b579a] focus:border-[#2b579a]'

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
                className={inputCls}
              />
            </Field>
            <Field label="Y">
              <input
                type="number"
                value={node.style.top}
                onChange={(e) => handleStyleChange('top', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
            <Field label="Width">
              <input
                type="number"
                value={node.style.width ?? ''}
                onChange={(e) => handleStyleChange('width', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="auto"
                className={inputCls}
              />
            </Field>
            <Field label="Height">
              <input
                type="number"
                value={node.style.height ?? ''}
                onChange={(e) => handleStyleChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="auto"
                className={inputCls}
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
                className={inputCls}
              />
            </Field>
            <Field label="Font Size">
              <input
                type="number"
                value={node.style.fontSize ?? 16}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 16)}
                className={inputCls}
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

        {node.type === 'Heading' && (
          <Section title="Heading">
            <Field label="Content">
              <input
                type="text"
                value={(node.props.content as string) || ''}
                onChange={(e) => handlePropChange('content', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Level">
              <select
                value={(node.props.level as number) ?? 2}
                onChange={(e) => handlePropChange('level', parseInt(e.target.value))}
                className={inputCls}
              >
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <option key={l} value={l}>
                    H{l}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Font Size">
                <input
                  type="number"
                  value={node.style.fontSize ?? 32}
                  onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 32)}
                  className={inputCls}
                />
              </Field>
              <Field label="Weight">
                <select
                  value={String(node.style.fontWeight ?? 700)}
                  onChange={(e) => handleStyleChange('fontWeight', parseInt(e.target.value))}
                  className={inputCls}
                >
                  {[400, 500, 600, 700, 800].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Color">
              <input
                type="color"
                value={node.style.color || '#111827'}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-8 border border-gray-200 rounded cursor-pointer"
              />
            </Field>
            <Field label="Align">
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => handleStyleChange('textAlign', a)}
                    className={`flex-1 py-1.5 text-xs rounded border ${
                      node.style.textAlign === a
                        ? 'bg-[#2b579a] text-white border-[#2b579a]'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
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
                className={inputCls}
              />
            </Field>
            <Field label="Alt">
              <input
                type="text"
                value={(node.props.alt as string) || ''}
                onChange={(e) => handlePropChange('alt', e.target.value)}
                className={inputCls}
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
                className={inputCls}
              />
            </Field>
            <Field label="Link">
              <input
                type="url"
                value={(node.props.href as string) || ''}
                onChange={(e) => handlePropChange('href', e.target.value)}
                placeholder="https://..."
                className={inputCls}
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
                className={inputCls}
              />
            </Field>
          </Section>
        )}

        {node.type === 'Divider' && (
          <Section title="Divider">
            <Field label="Color">
              <input
                type="color"
                value={node.style.backgroundColor || '#e5e7eb'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-full h-8 border border-gray-200 rounded cursor-pointer"
              />
            </Field>
            <Field label="Style">
              <select
                value={node.style.borderStyle ?? 'solid'}
                onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
                className={inputCls}
              >
                <option value="solid">Solid (filled)</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </Field>
            <Field label="Thickness (px)">
              <input
                type="number"
                min={1}
                max={20}
                value={node.style.height ?? 1}
                onChange={(e) => handleStyleChange('height', parseInt(e.target.value) || 1)}
                className={inputCls}
              />
            </Field>
          </Section>
        )}

        {node.type === 'Input' && (
          <Section title="Input">
            <Field label="Label">
              <input
                type="text"
                value={(node.props.label as string) || ''}
                onChange={(e) => handlePropChange('label', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Placeholder">
              <input
                type="text"
                value={(node.props.placeholder as string) || ''}
                onChange={(e) => handlePropChange('placeholder', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Type">
              <select
                value={(node.props.type as string) || 'text'}
                onChange={(e) => handlePropChange('type', e.target.value)}
                className={inputCls}
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="url">URL</option>
                <option value="number">Number</option>
                <option value="search">Search</option>
              </select>
            </Field>
          </Section>
        )}

        {node.type === 'Map' && (
          <Section title="Map">
            <Field label="Address">
              <textarea
                value={(node.props.address as string) || ''}
                onChange={(e) => handlePropChange('address', e.target.value)}
                rows={2}
                placeholder="e.g. 1600 Amphitheatre Parkway, Mountain View"
                className={inputCls}
              />
            </Field>
            <Field label="Border Radius">
              <input
                type="number"
                value={node.style.borderRadius ?? 0}
                onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </Section>
        )}
      </div>
    </div>
  )
}
