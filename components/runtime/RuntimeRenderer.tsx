// Runtime renderer - safely renders published pages.
//
// The whole page is wrapped in a single <form>: any submit-mode Button
// triggers a POST to /api/forms/[pageId] with every Input's value collected
// via FormData. This is intentionally simple — one logical form per page —
// because the editor doesn't (yet) have a "Form group" container concept.
'use client'

import React, { useEffect, useState } from 'react'
import {
  COMPONENT_TYPES,
  PageSchema,
  ComponentNode,
  ComponentStyle,
} from '@/types/schema'
import {
  BREAKPOINT_CANVAS_WIDTH,
  detectBreakpoint,
  effectiveStyle,
  type Breakpoint,
} from '@/lib/editor/breakpoints'
import { TextComponent } from '../components/TextComponent'
import { HeadingComponent } from '../components/HeadingComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'
import { DividerComponent } from '../components/DividerComponent'
import { InputComponent } from '../components/InputComponent'
import { MapComponent } from '../components/MapComponent'

interface RuntimeRendererProps {
  schema: PageSchema
  /**
   * Page id required to POST form submissions. When omitted, submit
   * buttons render but do nothing — useful for previewing schemas
   * without a backing page row.
   */
  pageId?: string
  /**
   * Force a specific breakpoint instead of deriving it from viewport
   * width. Used by the editor's Preview button (`?preview=mobile`) so
   * authors can validate their tablet/mobile overrides from a desktop
   * browser without resizing the window.
   */
  forceBreakpoint?: Breakpoint
}

const ALLOWED_TYPES: ReadonlySet<string> = new Set(COMPONENT_TYPES)

const ALLOWED_STYLE_PROPS = [
  'position',
  'left',
  'top',
  'width',
  'height',
  'zIndex',
  'fontSize',
  'color',
  'backgroundColor',
  'borderColor',
  'borderStyle',
  'borderWidth',
  'borderRadius',
  'padding',
  'margin',
  'textAlign',
  'fontWeight',
]

const PX_PROPS = new Set([
  'left',
  'top',
  'width',
  'height',
  'fontSize',
  'borderRadius',
  'borderWidth',
  'padding',
  'margin',
])

const SELF_PAINTING_TYPES = new Set(['Container', 'Input', 'Map', 'Divider'])

function sanitizeStyle(style: ComponentStyle | Record<string, unknown>): React.CSSProperties {
  const sanitized: React.CSSProperties = {}
  const styleObj = style as Record<string, unknown>
  for (const key of ALLOWED_STYLE_PROPS) {
    if (styleObj[key] !== undefined) {
      const value = styleObj[key]
      if (PX_PROPS.has(key) && typeof value === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanitized[key as keyof React.CSSProperties] = `${value}px` as any
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanitized[key as keyof React.CSSProperties] = value as any
      }
    }
  }
  return sanitized
}

function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) return '#'
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return url
  }
  return '#'
}

/**
 * Convert an Input's label into a key that satisfies the formSubmission
 * Zod regex (`^[a-zA-Z0-9 ._-]+$`). Replace illegal runs with `_` and
 * cap at 64 chars. We sanitize on the client AND the server validates,
 * so weird characters never reach the database.
 */
function sanitizeFieldName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ._-]+/g, '_').trim().slice(0, 64)
  return cleaned || 'field'
}

function renderNode(
  node: ComponentNode,
  bp: Breakpoint,
  desktopWidth: number,
  isNested: boolean = false,
): React.ReactNode {
  if (!ALLOWED_TYPES.has(node.type)) return null

  const eff = effectiveStyle(node, bp, desktopWidth)
  // Replace node.style with the merged-for-breakpoint style downstream.
  const styledNode = { ...node, style: eff }

  const style = sanitizeStyle(eff)
  if (SELF_PAINTING_TYPES.has(node.type)) {
    delete (style as Record<string, unknown>).backgroundColor
    delete (style as Record<string, unknown>).borderColor
    delete (style as Record<string, unknown>).borderWidth
    delete (style as Record<string, unknown>).borderStyle
    delete (style as Record<string, unknown>).borderRadius
  }

  const Wrapper = isNested ? React.Fragment : 'div'
  const wrapperProps = isNested ? {} : { style }

  switch (node.type) {
    case 'Text':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <TextComponent
            {...node.props}
            color={eff.color}
            fontSize={eff.fontSize}
            fontWeight={eff.fontWeight}
            textAlign={eff.textAlign}
          />
        </Wrapper>
      )
    case 'Heading':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <HeadingComponent
            {...node.props}
            color={eff.color}
            fontSize={eff.fontSize}
            fontWeight={eff.fontWeight}
            textAlign={eff.textAlign}
          />
        </Wrapper>
      )
    case 'Image':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ImageComponent {...node.props} />
        </Wrapper>
      )
    case 'Button': {
      const buttonProps = {
        ...node.props,
        href: sanitizeUrl(node.props.href),
      }
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ButtonComponent
            {...buttonProps}
            backgroundColor={eff.backgroundColor}
            color={eff.color}
            borderRadius={eff.borderRadius}
          />
        </Wrapper>
      )
    }
    case 'Container':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: eff.backgroundColor || 'transparent',
              border: eff.borderWidth
                ? `${eff.borderWidth}px solid ${eff.borderColor || '#000000'}`
                : undefined,
              borderRadius: eff.borderRadius ? `${eff.borderRadius}px` : undefined,
              padding: eff.padding ? `${eff.padding}px` : undefined,
              position: 'relative',
            }}
          >
            {styledNode.children?.map((child: ComponentNode) =>
              renderNode(child, bp, desktopWidth, true),
            )}
          </div>
        </Wrapper>
      )
    case 'Divider':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <DividerComponent
            backgroundColor={eff.backgroundColor}
            borderStyle={eff.borderStyle}
            borderColor={eff.borderColor}
            borderWidth={eff.borderWidth}
          />
        </Wrapper>
      )
    case 'Input': {
      const label = (node.props.label as string) || ''
      const explicitName = (node.props.name as string) || ''
      const fieldName = sanitizeFieldName(explicitName || label || 'field')
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <InputComponent
            {...node.props}
            name={fieldName}
            color={eff.color}
            fontSize={eff.fontSize}
            backgroundColor={eff.backgroundColor}
            borderColor={eff.borderColor}
            borderRadius={eff.borderRadius}
          />
        </Wrapper>
      )
    }
    case 'Map':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <MapComponent
            {...node.props}
            borderRadius={eff.borderRadius}
          />
        </Wrapper>
      )
    default:
      return null
  }
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export function RuntimeRenderer({
  schema,
  pageId,
  forceBreakpoint,
}: RuntimeRendererProps) {
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Pick a breakpoint either explicitly (preview mode) or from the live
  // viewport width. Resize listener kept active in both modes so authors
  // can still see fluid behavior of the *other* breakpoints if they
  // resize the window.
  const [bp, setBp] = useState<Breakpoint>(forceBreakpoint ?? 'desktop')
  useEffect(() => {
    if (forceBreakpoint) {
      setBp(forceBreakpoint)
      return
    }
    const compute = () => setBp(detectBreakpoint(window.innerWidth))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [forceBreakpoint])

  // Canvas width follows the breakpoint so a "Mobile" preview literally
  // shows a 375px-wide canvas, not desktop-styled content squeezed into
  // the viewport. Height scales by the SAME factor so a tall desktop
  // page doesn't end up with a half-empty mobile canvas.
  const canvasWidth = BREAKPOINT_CANVAS_WIDTH[bp] ?? schema.canvas.width
  const widthFactor = canvasWidth / schema.canvas.width
  const canvasHeight = Math.round(schema.canvas.height * widthFactor)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pageId) {
      setStatus('error')
      setError('Form submission is only available on the published page.')
      return
    }
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value !== 'string') continue
      const safeKey = sanitizeFieldName(key)
      // Skip empty fields so we don't submit a junk record on a button
      // click without any actual input.
      const trimmed = value.trim()
      if (!trimmed) continue
      fields[safeKey] = trimmed.slice(0, 5000)
    }

    if (Object.keys(fields).length === 0) {
      setStatus('error')
      setError('Please fill in at least one field before submitting.')
      return
    }

    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch(`/api/forms/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }
      setStatus('success')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  const banner = (() => {
    if (status === 'submitting') return null
    if (status === 'success') {
      return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded shadow text-sm">
          Thanks! Your submission was received.
        </div>
      )
    }
    if (status === 'error' && error) {
      return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded shadow text-sm">
          {error}
        </div>
      )
    }
    return null
  })()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      {banner}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: schema.canvas.background || '#ffffff',
          opacity: status === 'submitting' ? 0.7 : 1,
          pointerEvents: status === 'submitting' ? 'none' : 'auto',
        }}
      >
        {schema.nodes.map((node) =>
          renderNode(node, bp, schema.canvas.width, false),
        )}
      </form>
    </div>
  )
}
