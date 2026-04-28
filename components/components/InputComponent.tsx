// Input form field.
//
// Two render modes (controlled by `editable`):
//   - Editor canvas (editable=false) — readonly so dragging never gets
//     stolen by text input focus, and the user configures the field via
//     the property panel rather than typing into the canvas.
//   - Published runtime (editable=true) — fully interactive so site
//     visitors can actually fill the form.
//
// Real submission still requires a backend endpoint per form; this
// component is presentational. See README "Form submission" for the
// recommended pattern (POST /api/forms/[pageId] webhook).
'use client'

import React, { useState } from 'react'

interface InputProps {
  label?: string
  placeholder?: string
  type?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  borderRadius?: number
  /** When false the input is read-only (editor canvas). Default true. */
  editable?: boolean
  /** Hidden field name used if/when the parent form is submitted. */
  name?: string
}

const ALLOWED_INPUT_TYPES = new Set([
  'text',
  'email',
  'tel',
  'url',
  'number',
  'search',
  'password',
])

export function InputComponent({
  label,
  placeholder,
  type = 'text',
  fontSize,
  color,
  backgroundColor,
  borderColor = '#d1d5db',
  borderRadius,
  editable = true,
  name,
}: InputProps) {
  const safeType = ALLOWED_INPUT_TYPES.has(type) ? type : 'text'
  // Local state only matters when editable. Keeps the input feeling responsive
  // on the published page without requiring a parent form controller.
  const [value, setValue] = useState('')

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            color: color ?? '#374151',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}
      <input
        type={safeType}
        name={name ?? label}
        placeholder={placeholder}
        readOnly={!editable}
        value={editable ? value : ''}
        onChange={editable ? (e) => setValue(e.target.value) : undefined}
        // Stop click / pointer events from bubbling up to the dnd-kit
        // wrapper in the editor; even though the field is readOnly there,
        // we still don't want a click on the field to register as a drag
        // start when the user is just trying to focus it.
        onPointerDownCapture={editable ? undefined : (e) => e.stopPropagation()}
        style={{
          flex: 1,
          minHeight: 36,
          padding: '8px 12px',
          fontSize: fontSize ? `${fontSize}px` : 14,
          color: color ?? '#111827',
          backgroundColor: backgroundColor ?? '#ffffff',
          border: `1px solid ${borderColor}`,
          borderRadius: borderRadius ? `${borderRadius}px` : 6,
          outline: 'none',
        }}
      />
    </div>
  )
}
