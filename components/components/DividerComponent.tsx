// Divider component — horizontal rule
import React from 'react'

interface DividerProps {
  backgroundColor?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  borderColor?: string
  borderWidth?: number
}

export function DividerComponent({
  backgroundColor = '#e5e7eb',
  borderStyle,
  borderColor,
  borderWidth,
}: DividerProps) {
  // If user picked a borderStyle (dashed/dotted) render as a top-border line;
  // otherwise render a solid filled line via backgroundColor. This avoids
  // forcing every divider to use border properties.
  const useBorder = Boolean(borderStyle)
  return (
    <div
      role="separator"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: useBorder ? 'transparent' : backgroundColor,
        borderTop: useBorder
          ? `${borderWidth ?? 1}px ${borderStyle} ${borderColor ?? '#9ca3af'}`
          : undefined,
      }}
    />
  )
}
