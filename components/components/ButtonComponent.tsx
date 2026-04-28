// Button component for rendering buttons.
//
// Two `action` modes:
//   - 'link'   (default) — renders <a href> for navigation
//   - 'submit' — renders <button type="submit"> so a parent <form> can
//                catch it. Used by the form-submission feature.
//
// Visual props (color / bg / radius) are passed through from `node.style`
// at the renderer layer. We intentionally do NOT bake fallback colors here
// — if the renderer forgets to pass a value, we'd rather inherit than
// silently overwrite the user's choice (see prior bug: "颜色没有改变").
interface ButtonComponentProps {
  label?: string
  href?: string
  /** 'link' = anchor; 'submit' = form submit button. */
  action?: 'link' | 'submit'
  backgroundColor?: string
  color?: string
  borderRadius?: number
}

export function ButtonComponent({
  label = 'Button',
  href = '#',
  action = 'link',
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

  if (action === 'submit') {
    return (
      <button type="submit" style={buttonStyle}>
        {label}
      </button>
    )
  }

  if (href && href !== '#') {
    return (
      <a href={href} style={buttonStyle}>
        {label}
      </a>
    )
  }

  return (
    <button type="button" style={buttonStyle}>
      {label}
    </button>
  )
}
