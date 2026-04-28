// Shared template type
import type { PageSchema } from '@/types/schema'

export interface TemplateMeta {
  /** Stable id used in URLs and the API. Lowercase, dash-separated. */
  id: string
  /** Display name in the gallery. */
  name: string
  /** One-line description shown on the card. */
  description: string
  /** Category tag for filtering / grouping. */
  category: 'business' | 'food' | 'portfolio' | 'landing' | 'blank'
  /** Inline SVG markup used as a thumbnail (no external assets). */
  thumbnailSvg: string
}

export interface Template extends TemplateMeta {
  /** Pre-built page schema; will be cloned when a user picks the template. */
  schema: PageSchema
}
