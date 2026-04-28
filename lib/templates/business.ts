// "Business Website" template — corporate one-pager:
// Header → Hero → Services (3 cards) → Contact form + Map → Footer.
//
// Node ids are namespaced with `tpl-biz-` so they never collide with
// hand-placed ids users create later.
import type { ComponentNode, PageSchema } from '@/types/schema'
import type { Template } from './types'

const id = (name: string) => `tpl-biz-${name}`

const nodes: ComponentNode[] = [
  // ─── Header ────────────────────────────────────────────────────────────────
  {
    id: id('header-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 0, top: 0, width: 1200, height: 72, backgroundColor: '#0f172a' },
  },
  {
    id: id('header-brand'),
    type: 'Heading',
    props: { content: 'ACME Co.', level: 3 },
    style: { position: 'absolute', left: 60, top: 22, width: 200, height: 30, fontSize: 22, fontWeight: 700, color: '#ffffff' },
  },
  {
    id: id('header-nav-1'),
    type: 'Text',
    props: { content: 'Home' },
    style: { position: 'absolute', left: 820, top: 28, width: 60, height: 20, fontSize: 14, color: '#e5e7eb' },
  },
  {
    id: id('header-nav-2'),
    type: 'Text',
    props: { content: 'Services' },
    style: { position: 'absolute', left: 900, top: 28, width: 80, height: 20, fontSize: 14, color: '#e5e7eb' },
  },
  {
    id: id('header-nav-3'),
    type: 'Text',
    props: { content: 'Contact' },
    style: { position: 'absolute', left: 1010, top: 28, width: 80, height: 20, fontSize: 14, color: '#e5e7eb' },
  },

  // ─── Hero ──────────────────────────────────────────────────────────────────
  {
    id: id('hero-title'),
    type: 'Heading',
    props: { content: 'Grow Your Business Online', level: 1 },
    style: { position: 'absolute', left: 60, top: 160, width: 580, height: 110, fontSize: 48, fontWeight: 800, color: '#0f172a' },
  },
  {
    id: id('hero-sub'),
    type: 'Text',
    props: {
      content:
        'We help small businesses launch beautiful, fast websites in minutes — drag, drop, publish. No code required.',
    },
    style: { position: 'absolute', left: 60, top: 290, width: 580, height: 80, fontSize: 18, color: '#475569' },
  },
  {
    id: id('hero-cta-1'),
    type: 'Button',
    props: { label: 'Get Started', href: '#' },
    style: {
      position: 'absolute', left: 60, top: 410, width: 160, height: 48,
      backgroundColor: '#2b579a', color: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 600,
    },
  },
  {
    id: id('hero-cta-2'),
    type: 'Button',
    props: { label: 'Learn More', href: '#about' },
    style: {
      position: 'absolute', left: 240, top: 410, width: 160, height: 48,
      backgroundColor: '#e2e8f0', color: '#0f172a', borderRadius: 6, fontSize: 16, fontWeight: 600,
    },
  },
  {
    id: id('hero-image'),
    type: 'Image',
    props: { src: 'https://placehold.co/480x340/2b579a/ffffff?text=Your+Brand', alt: 'Hero image' },
    style: { position: 'absolute', left: 680, top: 140, width: 480, height: 340, borderRadius: 12 },
  },

  // ─── Divider ───────────────────────────────────────────────────────────────
  {
    id: id('divider-1'),
    type: 'Divider',
    props: {},
    style: { position: 'absolute', left: 60, top: 540, width: 1080, height: 1, backgroundColor: '#e2e8f0' },
  },

  // ─── Services section ──────────────────────────────────────────────────────
  {
    id: id('services-title'),
    type: 'Heading',
    props: { content: 'What We Do', level: 2 },
    style: { position: 'absolute', left: 60, top: 600, width: 1080, height: 52, fontSize: 36, fontWeight: 700, color: '#0f172a', textAlign: 'center' },
  },
  // Card 1
  {
    id: id('svc-1-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 60, top: 700, width: 340, height: 280, backgroundColor: '#f8fafc', borderRadius: 12 },
  },
  {
    id: id('svc-1-title'),
    type: 'Heading',
    props: { content: 'Web Design', level: 3 },
    style: { position: 'absolute', left: 92, top: 740, width: 280, height: 32, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  },
  {
    id: id('svc-1-text'),
    type: 'Text',
    props: { content: 'Modern, responsive sites tailored to your brand. Mobile-first and lightning fast.' },
    style: { position: 'absolute', left: 92, top: 790, width: 280, height: 160, fontSize: 14, color: '#475569' },
  },
  // Card 2
  {
    id: id('svc-2-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 430, top: 700, width: 340, height: 280, backgroundColor: '#f8fafc', borderRadius: 12 },
  },
  {
    id: id('svc-2-title'),
    type: 'Heading',
    props: { content: 'Branding', level: 3 },
    style: { position: 'absolute', left: 462, top: 740, width: 280, height: 32, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  },
  {
    id: id('svc-2-text'),
    type: 'Text',
    props: { content: 'Logos, color palettes, typography. A consistent identity across every touchpoint.' },
    style: { position: 'absolute', left: 462, top: 790, width: 280, height: 160, fontSize: 14, color: '#475569' },
  },
  // Card 3
  {
    id: id('svc-3-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 800, top: 700, width: 340, height: 280, backgroundColor: '#f8fafc', borderRadius: 12 },
  },
  {
    id: id('svc-3-title'),
    type: 'Heading',
    props: { content: 'Marketing', level: 3 },
    style: { position: 'absolute', left: 832, top: 740, width: 280, height: 32, fontSize: 22, fontWeight: 700, color: '#0f172a' },
  },
  {
    id: id('svc-3-text'),
    type: 'Text',
    props: { content: 'SEO, analytics, and growth strategies that turn visitors into loyal customers.' },
    style: { position: 'absolute', left: 832, top: 790, width: 280, height: 160, fontSize: 14, color: '#475569' },
  },

  // ─── Divider ───────────────────────────────────────────────────────────────
  {
    id: id('divider-2'),
    type: 'Divider',
    props: {},
    style: { position: 'absolute', left: 60, top: 1040, width: 1080, height: 1, backgroundColor: '#e2e8f0' },
  },

  // ─── Contact section ───────────────────────────────────────────────────────
  {
    id: id('contact-title'),
    type: 'Heading',
    props: { content: 'Get In Touch', level: 2 },
    style: { position: 'absolute', left: 60, top: 1100, width: 1080, height: 52, fontSize: 36, fontWeight: 700, color: '#0f172a', textAlign: 'center' },
  },
  {
    id: id('contact-sub'),
    type: 'Text',
    props: { content: "We'd love to hear from you. Drop us a line and we'll respond within one business day." },
    style: { position: 'absolute', left: 60, top: 1170, width: 1080, height: 28, fontSize: 16, color: '#475569', textAlign: 'center' },
  },
  {
    id: id('contact-name'),
    type: 'Input',
    props: { label: 'Name', placeholder: 'Jane Doe', type: 'text' },
    style: { position: 'absolute', left: 60, top: 1240, width: 500, height: 70 },
  },
  {
    id: id('contact-email'),
    type: 'Input',
    props: { label: 'Email', placeholder: 'jane@example.com', type: 'email' },
    style: { position: 'absolute', left: 60, top: 1330, width: 500, height: 70 },
  },
  {
    id: id('contact-msg'),
    type: 'Input',
    props: { label: 'Message', placeholder: 'How can we help?', type: 'text' },
    style: { position: 'absolute', left: 60, top: 1420, width: 500, height: 70 },
  },
  {
    id: id('contact-submit'),
    type: 'Button',
    props: { label: 'Send Message', href: '#' },
    style: {
      position: 'absolute', left: 60, top: 1510, width: 200, height: 48,
      backgroundColor: '#2b579a', color: '#ffffff', borderRadius: 6, fontSize: 16, fontWeight: 600,
    },
  },
  {
    id: id('contact-map'),
    type: 'Map',
    props: { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
    style: { position: 'absolute', left: 620, top: 1240, width: 520, height: 320, borderRadius: 12 },
  },

  // ─── Footer ────────────────────────────────────────────────────────────────
  {
    id: id('footer-bg'),
    type: 'Container',
    props: {},
    style: { position: 'absolute', left: 0, top: 1900, width: 1200, height: 100, backgroundColor: '#0f172a' },
  },
  {
    id: id('footer-text'),
    type: 'Text',
    props: { content: '© 2026 ACME Co. All rights reserved.' },
    style: { position: 'absolute', left: 0, top: 1938, width: 1200, height: 24, fontSize: 14, color: '#cbd5e1', textAlign: 'center' },
  },
]

const schema: PageSchema = {
  canvas: { width: 1200, height: 2000, background: '#ffffff' },
  meta: { title: 'Business Website' },
  nodes,
}

const thumbnailSvg = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <rect width="320" height="200" fill="#ffffff"/>
  <rect x="0" y="0" width="320" height="22" fill="#0f172a"/>
  <rect x="12" y="8" width="48" height="6" fill="#e2e8f0"/>
  <rect x="240" y="9" width="20" height="4" fill="#cbd5e1"/>
  <rect x="266" y="9" width="20" height="4" fill="#cbd5e1"/>
  <rect x="292" y="9" width="20" height="4" fill="#cbd5e1"/>
  <rect x="20" y="42" width="120" height="10" rx="2" fill="#0f172a"/>
  <rect x="20" y="58" width="100" height="6" rx="2" fill="#0f172a"/>
  <rect x="20" y="78" width="160" height="6" rx="2" fill="#94a3b8"/>
  <rect x="20" y="88" width="140" height="6" rx="2" fill="#94a3b8"/>
  <rect x="20" y="106" width="44" height="14" rx="3" fill="#2b579a"/>
  <rect x="70" y="106" width="44" height="14" rx="3" fill="#e2e8f0"/>
  <rect x="200" y="42" width="100" height="78" rx="6" fill="#2b579a"/>
  <rect x="20" y="142" width="84" height="44" rx="4" fill="#f1f5f9"/>
  <rect x="118" y="142" width="84" height="44" rx="4" fill="#f1f5f9"/>
  <rect x="216" y="142" width="84" height="44" rx="4" fill="#f1f5f9"/>
  <rect x="28" y="150" width="40" height="5" rx="1" fill="#0f172a"/>
  <rect x="28" y="160" width="60" height="3" rx="1" fill="#94a3b8"/>
  <rect x="28" y="166" width="50" height="3" rx="1" fill="#94a3b8"/>
</svg>`

export const businessTemplate: Template = {
  id: 'business',
  name: 'Business Website',
  description: 'Corporate one-pager — hero, services, contact form, and map.',
  category: 'business',
  thumbnailSvg,
  schema,
}
