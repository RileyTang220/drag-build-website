// Button component for rendering buttons.
//
// We let unset props fall through as `undefined` rather than baking in
// fallback colors here — when the runtime renderer forgets to pass `color`
// through from `node.style`, hard-coded fallbacks silently overwrite the
// user's choice on the published page (see Bug: heading/text/box color
// not changing in preview/publish).
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
    backgroundColor,
    color,
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    border: 'none',
    cursor: 'pointer',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    textDecoration: 'none',
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
