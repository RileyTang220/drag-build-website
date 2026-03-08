// Editor page route
import { Editor } from '@/components/editor/Editor'

export default async function EditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const { pageId } = await params
  return <Editor pageId={pageId} />
}
