// Heading component (H1–H6)
import React from 'react'

interface HeadingProps {
  content?: string
  level?: number
  color?: string
  fontSize?: number
  fontWeight?: string | number
  textAlign?: 'left' | 'center' | 'right'
}

const SAFE_LEVELS: ReadonlyArray<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6]

export function HeadingComponent({
  content = 'Heading',
  level = 2,
  color,
  fontSize,
  fontWeight,
  textAlign,
}: HeadingProps) {
  const safeLevel = (SAFE_LEVELS.find((l) => l === level) ?? 2) as 1 | 2 | 3 | 4 | 5 | 6
  const Tag = `h${safeLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return (
    <Tag
      style={{
        margin: 0,
        color,
        fontSize: fontSize ? `${fontSize}px` : undefined,
        fontWeight,
        textAlign,
        lineHeight: 1.2,
      }}
    >
      {content}
    </Tag>
  )
}
