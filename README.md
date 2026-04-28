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

## Continuous Integration

GitHub Actions runs three parallel jobs on every push and PR to `main`:

- `lint` — ESLint
- `typecheck` — `tsc --noEmit`
- `build` — `prisma generate && next build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Development Roadmap

- [ ] Undo/redo functionality
- [ ] Component resizing
- [ ] Image upload support
- [ ] More component types
- [ ] Custom domains
- [ ] Collaboration features
