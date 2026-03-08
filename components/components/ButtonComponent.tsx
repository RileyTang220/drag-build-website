// Button component for rendering buttons
interface ButtonComponentProps {
  label?: string
  href?: string
  backgroundColor?: string
  color?: string
  borderRadius?: number
}

export function ButtonComponent({
  label = 'Button',
  href = '#',
  backgroundColor,
  color,
  borderRadius,
}: ButtonComponentProps) {
  const buttonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: backgroundColor || '#3b82f6',
    color: color || '#ffffff',
    borderRadius: borderRadius ? `${borderRadius}px` : '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  }

  if (href && href !== '#') {
    return (
      <a href={href} style={buttonStyle}>
        {label}
      </a>
    )
  }

  return <button style={buttonStyle}>{label}</button>
}
