// "Restaurant Website" template — food service one-pager:
// Header → Hero → Menu (4 dishes) → Reservation form → Address + Map → Footer.
import type { ComponentNode, PageSchema } from '@/types/schema'
import type { Template } from './types'

const id = (name: string) => `tpl-rst-${name}`

const dishes = [
  {
    name: 'Margherita Pizza',
    desc: 'San Marzano tomatoes, fresh mozzarella, basil.',
    price: '$14',
    img: 'https://placehold.co/280x180/dc2626/ffffff?text=Margherita',
  },
  {
    name: 'Truffle Risotto',
    desc: 'Carnaroli rice, black truffle, parmesan.',
    price: '$22',
    img: 'https://placehold.co/280x180/059669/ffffff?text=Risotto',
  },
  {
    name: 'Grilled Salmon',
    desc: 'Atlantic salmon, lemon-dill butter, asparagus.',
    price: '$26',
    img: 'https://placehold.co/280x180/0284c7/ffffff?text=Salmon',
  },
  {
    name: 'Tiramisu',
    desc: 'Espresso, mascarpone, ladyfingers, cocoa.',
    price: '$9',
    img: 'https://placehold.co/280x180/92400e/ffffff?text=Tiramisu',
  },
] as const

const dishNodes: ComponentNode[] = dishes.flatMap((dish, i) => {
  const col = i % 2
  const row = Math.floor(i / 2)
  const x = 60 + col * 560
  const y = 1130 + row * 320
  return [
    {
      id: id(`dish-${i}-img`),
      type: 'Image',
      props: { src: dish.img, alt: dish.name },
      style: { position: 'absolute', left: x, top: y, width: 200, height: 280, borderRadius: 8 },
    },
    {
      id: id(`dish-${i}-name`),
      type: 'Heading',
      props: { content: dish.name, level: 3 },
      style: { position: 'absolute', left: x + 220, top: y + 16, width: 280, height: 32, fontSize: 22, fontWeight: 700, color: '#1c1917' },
    },
    {
      id: id(`dish-${i}-price`),
      type: 'Text',
      props: { content: dish.price },
      style: { position: 'absolute', left: x + 220, top: y + 56, width: 280, height: 24, fontSize: 18, fontWeight: 600, color: '#dc2626' },
    },
    {
      id: id(`dish-${i}-desc`),
      type: 'Text',
      props: { content: dish.desc },
      style: { position: 'absolute', left: x + 220, top: y + 96, width: 280, height: 100, fontSize: 14, color: '#57534e' },
    },
  ] as ComponentNode[]
})

const nodes: ComponentNode[] = [
  // ─── Header ────────────────────────────────────────────────────────────────
  {
    id: id('header-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 0, top: 0, width: 1200, height: 72, backgroundColor: '#1c1917' },
  },
  {
    id: id('header-brand'),
    type: 'Heading',
    props: { content: 'Trattoria Luna', level: 3 },
    style: { position: 'absolute', left: 60, top: 22, width: 260, height: 30, fontSize: 22, fontWeight: 700, color: '#fef3c7' },
  },
  {
    id: id('header-nav-1'),
    type: 'Text',
    props: { content: 'Menu' },
    style: { position: 'absolute', left: 880, top: 28, width: 60, height: 20, fontSize: 14, color: '#fef3c7' },
  },
  {
    id: id('header-nav-2'),
    type: 'Text',
    props: { content: 'Reserve' },
    style: { position: 'absolute', left: 950, top: 28, width: 80, height: 20, fontSize: 14, color: '#fef3c7' },
  },
  {
    id: id('header-nav-3'),
    type: 'Text',
    props: { content: 'Visit' },
    style: { position: 'absolute', left: 1050, top: 28, width: 60, height: 20, fontSize: 14, color: '#fef3c7' },
  },

  // ─── Hero ──────────────────────────────────────────────────────────────────
  {
    id: id('hero-bg'),
    type: 'Image',
    props: { src: 'https://placehold.co/1200x400/1c1917/fef3c7?text=Authentic+Italian', alt: 'Restaurant hero' },
    style: { position: 'absolute', left: 0, top: 72, width: 1200, height: 420 },
  },
  {
    id: id('hero-title'),
    type: 'Heading',
    props: { content: 'Authentic Italian, Lovingly Made', level: 1 },
    style: { position: 'absolute', left: 60, top: 200, width: 700, height: 110, fontSize: 48, fontWeight: 800, color: '#fef3c7' },
  },
  {
    id: id('hero-sub'),
    type: 'Text',
    props: { content: 'Family recipes, wood-fired ovens, and a menu that changes with the seasons.' },
    style: { position: 'absolute', left: 60, top: 320, width: 600, height: 60, fontSize: 18, color: '#fde68a' },
  },
  {
    id: id('hero-cta'),
    type: 'Button',
    props: { label: 'Reserve a Table', href: '#reserve' },
    style: {
      position: 'absolute', left: 60, top: 410, width: 200, height: 48,
      backgroundColor: '#dc2626', color: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 600,
    },
  },

  // ─── Menu section ──────────────────────────────────────────────────────────
  {
    id: id('menu-title'),
    type: 'Heading',
    props: { content: 'Our Menu', level: 2 },
    style: { position: 'absolute', left: 60, top: 560, width: 1080, height: 52, fontSize: 40, fontWeight: 800, color: '#1c1917', textAlign: 'center' },
  },
  {
    id: id('menu-sub'),
    type: 'Text',
    props: { content: 'A curated selection of seasonal favorites.' },
    style: { position: 'absolute', left: 60, top: 624, width: 1080, height: 28, fontSize: 16, color: '#78716c', textAlign: 'center' },
  },
  {
    id: id('menu-divider'),
    type: 'Divider',
    props: {},
    style: { position: 'absolute', left: 540, top: 680, width: 120, height: 3, backgroundColor: '#dc2626' },
  },

  // Dish cards (generated above)
  ...dishNodes,

  // ─── Reservation section ───────────────────────────────────────────────────
  {
    id: id('reserve-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 0, top: 1820, width: 1200, height: 480, backgroundColor: '#fef3c7' },
  },
  {
    id: id('reserve-title'),
    type: 'Heading',
    props: { content: 'Make a Reservation', level: 2 },
    style: { position: 'absolute', left: 60, top: 1860, width: 1080, height: 52, fontSize: 36, fontWeight: 700, color: '#1c1917', textAlign: 'center' },
  },
  {
    id: id('reserve-sub'),
    type: 'Text',
    props: { content: 'We confirm reservations within 30 minutes during opening hours.' },
    style: { position: 'absolute', left: 60, top: 1920, width: 1080, height: 28, fontSize: 16, color: '#78716c', textAlign: 'center' },
  },
  {
    id: id('reserve-name'),
    type: 'Input',
    props: { label: 'Name', placeholder: 'Your full name', type: 'text' },
    style: { position: 'absolute', left: 200, top: 1980, width: 380, height: 70 },
  },
  {
    id: id('reserve-phone'),
    type: 'Input',
    props: { label: 'Phone', placeholder: '+1 555 0100', type: 'tel' },
    style: { position: 'absolute', left: 620, top: 1980, width: 380, height: 70 },
  },
  {
    id: id('reserve-date'),
    type: 'Input',
    props: { label: 'Date & Time', placeholder: 'Fri, May 8 at 7pm', type: 'text' },
    style: { position: 'absolute', left: 200, top: 2070, width: 380, height: 70 },
  },
  {
    id: id('reserve-party'),
    type: 'Input',
    props: { label: 'Party size', placeholder: '2', type: 'number' },
    style: { position: 'absolute', left: 620, top: 2070, width: 380, height: 70 },
  },
  {
    id: id('reserve-submit'),
    type: 'Button',
    props: { label: 'Reserve Table', href: '#' },
    style: {
      position: 'absolute', left: 500, top: 2180, width: 200, height: 52,
      backgroundColor: '#dc2626', color: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 700,
    },
  },

  // ─── Visit section (address + map) ─────────────────────────────────────────
  {
    id: id('visit-title'),
    type: 'Heading',
    props: { content: 'Visit Us', level: 2 },
    style: { position: 'absolute', left: 60, top: 2360, width: 1080, height: 52, fontSize: 36, fontWeight: 700, color: '#1c1917', textAlign: 'center' },
  },
  {
    id: id('visit-address-label'),
    type: 'Heading',
    props: { content: 'Address', level: 4 },
    style: { position: 'absolute', left: 60, top: 2450, width: 480, height: 28, fontSize: 16, fontWeight: 600, color: '#1c1917' },
  },
  {
    id: id('visit-address'),
    type: 'Text',
    props: { content: '221B Baker Street\nLondon, NW1 6XE' },
    style: { position: 'absolute', left: 60, top: 2480, width: 480, height: 60, fontSize: 16, color: '#57534e' },
  },
  {
    id: id('visit-hours-label'),
    type: 'Heading',
    props: { content: 'Hours', level: 4 },
    style: { position: 'absolute', left: 60, top: 2560, width: 480, height: 28, fontSize: 16, fontWeight: 600, color: '#1c1917' },
  },
  {
    id: id('visit-hours'),
    type: 'Text',
    props: { content: 'Tue–Sun · 5pm – 10pm\nClosed Mondays' },
    style: { position: 'absolute', left: 60, top: 2590, width: 480, height: 60, fontSize: 16, color: '#57534e' },
  },
  {
    id: id('visit-map'),
    type: 'Map',
    props: { address: '221B Baker Street, London' },
    style: { position: 'absolute', left: 600, top: 2440, width: 540, height: 280, borderRadius: 12 },
  },

  // ─── Footer ────────────────────────────────────────────────────────────────
  {
    id: id('footer-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 0, top: 2780, width: 1200, height: 80, backgroundColor: '#1c1917' },
  },
  {
    id: id('footer-text'),
    type: 'Text',
    props: { content: '© 2026 Trattoria Luna · Open Tue–Sun · Reservations recommended' },
    style: { position: 'absolute', left: 0, top: 2810, width: 1200, height: 24, fontSize: 14, color: '#fef3c7', textAlign: 'center' },
  },
]

const schema: PageSchema = {
  canvas: { width: 1200, height: 2860, background: '#ffffff' },
  meta: { title: 'Restaurant Website' },
  nodes,
}

const thumbnailSvg = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <rect width="320" height="200" fill="#ffffff"/>
  <rect x="0" y="0" width="320" height="22" fill="#1c1917"/>
  <rect x="12" y="8" width="80" height="6" fill="#fde68a"/>
  <rect x="240" y="9" width="22" height="4" fill="#fde68a"/>
  <rect x="270" y="9" width="22" height="4" fill="#fde68a"/>
  <rect x="0" y="22" width="320" height="58" fill="#1c1917"/>
  <rect x="20" y="42" width="160" height="10" rx="2" fill="#fde68a"/>
  <rect x="20" y="58" width="100" height="5" rx="2" fill="#fbbf24"/>
  <rect x="20" y="68" width="40" height="8" rx="2" fill="#dc2626"/>
  <text x="160" y="100" font-size="9" font-family="serif" fill="#1c1917" text-anchor="middle" font-weight="bold">Our Menu</text>
  <line x1="146" y1="106" x2="174" y2="106" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="20" y="116" width="48" height="36" rx="3" fill="#dc2626"/>
  <rect x="76" y="116" width="60" height="6" rx="1" fill="#1c1917"/>
  <rect x="76" y="126" width="20" height="4" rx="1" fill="#dc2626"/>
  <rect x="76" y="134" width="60" height="3" rx="1" fill="#94a3b8"/>
  <rect x="76" y="140" width="50" height="3" rx="1" fill="#94a3b8"/>
  <rect x="160" y="116" width="48" height="36" rx="3" fill="#059669"/>
  <rect x="216" y="116" width="60" height="6" rx="1" fill="#1c1917"/>
  <rect x="216" y="126" width="20" height="4" rx="1" fill="#dc2626"/>
  <rect x="216" y="134" width="60" height="3" rx="1" fill="#94a3b8"/>
  <rect x="216" y="140" width="50" height="3" rx="1" fill="#94a3b8"/>
  <rect x="0" y="160" width="320" height="40" fill="#fef3c7"/>
  <text x="160" y="176" font-size="8" font-family="sans-serif" fill="#1c1917" text-anchor="middle" font-weight="bold">Make a Reservation</text>
  <rect x="100" y="184" width="50" height="10" rx="2" fill="#ffffff" stroke="#d6d3d1"/>
  <rect x="158" y="184" width="50" height="10" rx="2" fill="#dc2626"/>
</svg>`

export const restaurantTemplate: Template = {
  id: 'restaurant',
  name: 'Restaurant',
  description: 'Menu, reservations, hours, and map for food service businesses.',
  category: 'food',
  thumbnailSvg,
  schema,
}
