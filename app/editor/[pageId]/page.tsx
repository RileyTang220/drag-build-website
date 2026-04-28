// Editor page route
import { Editor } from '@/components/editor/Editor'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function EditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const { pageId } = await params
  return (
    <ErrorBoundary scope="Editor">
      <Editor pageId={pageId} />
    </ErrorBoundary>
  )
}
