import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // Default to Node — every test in this repo so far is pure logic.
    // Switch a specific file to jsdom with `// @vitest-environment jsdom`
    // when we start adding component tests.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only measure the code we actually intend to cover. Excluding the
      // Next.js app/ tree, generated/ and node_modules keeps the report
      // honest about what's tested vs ignored.
      include: [
        'lib/**',
        'components/registry.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/generated/**',
        '**/.next/**',
        'lib/prisma.ts', // thin singleton, integration-only
        'lib/auth.ts',   // NextAuth glue, integration-only
      ],
    },
  },
  resolve: {
    alias: {
      // Mirror tsconfig.json `paths` so `@/foo` resolves the same way.
      '@': path.resolve(__dirname, '.'),
    },
  },
})
