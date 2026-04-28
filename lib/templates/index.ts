// Template registry — single place to register new templates.
//
// Each template is a static, type-checked PageSchema. We deep-clone the
// schema before handing it to the API so multiple users picking the same
// template don't share node references.
import type { Template, TemplateMeta } from './types'
import { businessTemplate } from './business'
import { restaurantTemplate } from './restaurant'

const TEMPLATES: readonly Template[] = [businessTemplate, restaurantTemplate]

export function listTemplates(): TemplateMeta[] {
  return TEMPLATES.map(({ id, name, description, category, thumbnailSvg }) => ({
    id,
    name,
    description,
    category,
    thumbnailSvg,
  }))
}

export function getTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null
}

/**
 * Return a deep clone of the template's schema, safe to mutate / persist.
 *
 * `structuredClone` is available in Node 18+ / modern browsers. We avoid the
 * JSON-roundtrip alternative because it would silently drop `undefined`s and
 * coerce dates — fine for these schemas today, but a footgun later.
 */
export function cloneTemplateSchema(id: string) {
  const tpl = getTemplate(id)
  if (!tpl) return null
  return structuredClone(tpl.schema)
}

export type { Template, TemplateMeta }
