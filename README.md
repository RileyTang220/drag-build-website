# Drag Website Builder

A visual drag-and-drop website builder, built with Next.js, TypeScript, and PostgreSQL.

## Features

- **Visual Editor**: Drag-and-drop components with absolute positioning
- **Component Library**: Text, Image, Button, and Container components
- **Property Panel**: Edit component properties and styles
- **Auto-save**: Drafts are automatically saved with debouncing
- **Publish**: Create immutable published versions of pages
- **Public Access**: Published pages accessible via `/p/[pageId]`
- **User Authentication**: Google OAuth login via NextAuth
- **Data Isolation**: Users can only access/modify their own pages

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google Provider
- **Drag & Drop**: @dnd-kit
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)
   - `NEXTAUTH_SECRET`: A random secret string
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

3. **Set up database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth routes
│   │   ├── pages/                  # Page CRUD API
│   │   └── public/                 # Public page API
│   ├── dashboard/                 # User dashboard
│   ├── editor/[pageId]/            # Editor page
│   └── p/[pageId]/                 # Public page view
├── components/
│   ├── components/                 # Component library
│   ├── editor/                     # Editor components
│   └── runtime/                    # Runtime renderer
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── prisma.ts                   # Prisma client
│   └── utils.ts                     # Utilities
├── prisma/
│   └── schema.prisma               # Database schema
├── store/
│   └── editorStore.ts              # Zustand store
└── types/
    └── schema.ts                   # TypeScript types
```

## Usage

1. **Sign in**: Visit the app and sign in with Google
2. **Create page**: Click "Create New Page" on the dashboard
3. **Edit**: Drag components from the palette to the canvas
4. **Configure**: Select a component to edit its properties
5. **Publish**: Click "Publish" to make the page publicly accessible
6. **Share**: Share the `/p/[pageId]` link

## Database Schema

- **users**: User accounts (managed by NextAuth)
- **pages**: Page metadata and draft schemas
- **page_versions**: Immutable published versions

## Security

- All API routes verify user authentication
- User data isolation enforced at database level
- All API inputs validated with Zod (shape, types, size, depth, unique ids)
- Page schema capped at 500 nodes / 1MB / depth 8
- Runtime renderer uses whitelist for components and styles
- URLs are sanitized to prevent XSS attacks
- Editor and Runtime are wrapped in React error boundaries; route-level
  `error.tsx` and `global-error.tsx` catch server errors

## AI page generation

The `/templates` page exposes an AI generator powered by DeepSeek's
OpenAI-compatible Chat Completions API with function calling. The user
types a brief, and the model is forced to call our `create_page`
function whose JSON-Schema parameters mirror a subset of `pageSchemaZ`.
The resulting arguments go through the **same Zod validator** the editor
uses, so any drift between model output and the runtime renderer is
caught before a Page row is written.

- Vendor: DeepSeek via the `openai` SDK with `baseURL: https://api.deepseek.com/v1`
- Model: `deepseek-chat` (V3 — fast and cheap)
- Hard caps: prompt 10–1000 chars, max 50 nodes, single Page per call
- Per-user rate limit: 10 generations / hour (in-memory; replace with
  Redis in production)
- Auth required — anonymous traffic is rejected at the route boundary
- Requires `DEEPSEEK_API_KEY` env var; without it the route returns
  500 and the rest of the app keeps working
- Streaming: `stream: true` + SSE response to the browser; client
  consumes via `lib/sse.ts` (POST + ReadableStream parser since
  `EventSource` is GET-only)

System prompt embeds component conventions (Heading levels, Image must
be `placehold.co`, Button action types, color discipline) so the model
returns layouts that fit our schema's grammar.

## Responsive breakpoints

Each `ComponentNode` has a base `style` (= desktop) plus optional
`styleOverrides.tablet` / `styleOverrides.mobile` partial overrides. At
render time the effective style is `base ∪ override`, so overrides only
need to specify the fields that differ.

- **Editor**: a toolbar switcher (Desktop / Tablet / Mobile) sets the
  current breakpoint. The artboard re-clamps to that breakpoint's canvas
  width (768 / 375). Property panel writes go to the right slot — base
  `style` on desktop, `styleOverrides[bp]` on tablet/mobile. Drag handlers
  read effective dimensions via `effectiveStyle`.
- **Runtime**: `RuntimeRenderer` listens to `window` resize events and
  picks a breakpoint via `detectBreakpoint(viewportWidth)`. Thresholds
  match Tailwind's `sm` (640) and `lg` (1024) — the same schema renders
  three different layouts depending on the visitor's screen.
- **Validation**: the Zod schema accepts `styleOverrides` as a strict
  partial of the base style with `position` excluded (always `'absolute'`).

## Real-time collaboration (MVP)

The editor runs a Yjs CRDT session per page so multiple browser tabs / users
editing the same page see each other's changes in real time, plus live
cursors and selection outlines.

- Transport: `y-webrtc` peer-to-peer (signaling via `wss://signaling.yjs.dev`).
  Zero infrastructure — works as long as both peers can reach the public
  signaling server. For production, deploy a private signaling server and
  TURN server.
- Data: a single `Y.Map` ("app") holds the page schema. Local store
  changes push into Yjs; remote schema replaces local state with `zundo`
  history paused so peer edits don't pollute *your* undo stack.
- Awareness: `y-protocols/awareness` carries each user's color, name,
  pointer position (canvas-space, throttled via `requestAnimationFrame`),
  and currently selected node id.

### Try it locally

1. `npm run dev`
2. Open the same `/editor/<pageId>` URL in two browser windows
3. Drag an element in one window → watch it move in the other
4. Move your cursor over the canvas → watch your colored arrow + name
   appear in the other window

### Known MVP limitations

- Whole-schema replace ≈ "last write wins" on concurrent edits to the same
  field. Promoting nodes into a `Y.Array<Y.Map>` would give per-field CRDT.
- Public signaling (`signaling.yjs.dev`) is best-effort; corporate networks
  may block WebRTC. Production should run a dedicated signaling + TURN.
- Auto-save races: every connected client writes to Postgres on its own
  debounce. Final state still converges via Yjs; only the persisted state
  is "last writer wins" at the DB layer.

## Testing

Pure logic is covered by Vitest:

```bash
npm run test           # watch
npm run test:run       # one-shot (used by CI)
npm run test:coverage  # report under coverage/
```

Test files live in `tests/`. Targets so far: snapping algorithm, Zod
validators (page schema, form submission, API errors), component registry,
and template integrity (every template must round-trip through `pageSchemaZ`).

## Continuous Integration

GitHub Actions runs four parallel jobs on every push and PR to `main`:

- `lint` — ESLint
- `typecheck` — `tsc --noEmit`
- `build` — `prisma generate && next build`
- `test` — `vitest run`

A fifth `db-migrate` job runs only on `main` after the four above pass; it
applies pending Prisma migrations against the production database via a
GitHub `production` Environment with required reviewer approval.

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

