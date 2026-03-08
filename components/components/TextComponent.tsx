// Text component for rendering text content
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
        color: color || '#000000',
        fontWeight,
        textAlign,
        width: '100%',
        height: '100%',
      }}
    >
      {content}
    </div>
  )
}
