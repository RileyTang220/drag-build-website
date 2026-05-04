// Tiny browser-side Server-Sent Events parser.
//
// `EventSource` is GET-only, so for a POST + SSE response (like our AI
// generation route) we read `response.body` with the Streams API and
// split chunks on the SSE record separator (`\n\n`). Each record may
// hold multiple `field: value` lines; we only need `data:` here.
//
// Yields one parsed JSON event per record. Tolerates partial chunks
// (which happen when a record straddles a TCP packet boundary).

export async function* readSseEvents<T>(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<T, void, void> {
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE records are separated by a blank line (\n\n).
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const record = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const data = parseDataField(record)
        if (data == null) continue
        try {
          yield JSON.parse(data) as T
        } catch {
          // Malformed JSON — skip rather than blow up the whole stream.
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

function parseDataField(record: string): string | null {
  // Multiple `data:` lines in one record concatenate with newlines per
  // the SSE spec. We don't need that for our route (single-line JSON),
  // but it costs nothing to handle correctly.
  const lines = record.split('\n')
  const dataParts: string[] = []
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trim())
    }
  }
  return dataParts.length === 0 ? null : dataParts.join('\n')
}
