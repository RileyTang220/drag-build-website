// Text component for rendering text content.
//
// Defaults are intentionally undefined — the wrapper sets `color` via inline
// style which children inherit, and forcing `'#000000'` here would silently
// override a user-picked color when the prop wasn't explicitly threaded
// through (which happened in the runtime renderer).
interface TextComponentProps {
  content?: string
  fontSize?: number
  color?: string
  fontWeight?: string | number
  textAlign?: 'left' | 'center' | 'right'
}

export function TextComponent({
  content = 'Text',
  fontSize,
  color,
  fontWeight,
  textAlign,
}: TextComponentProps) {
  return (
    <div
      style={{
        fontSize: fontSize ? `${fontSize}px` : undefined,
        color,
        fontWeight,
        textAlign,
        width: '100%',
        height: '100%',
        whiteSpace: 'pre-wrap',
      }}
    >
      {content}
    </div>
  )
}
