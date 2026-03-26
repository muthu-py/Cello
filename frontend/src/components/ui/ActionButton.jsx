/**
 * @param {{
 *   children: React.ReactNode,
 *   variant?: 'solid'|'ghost',
 *   type?: 'button'|'submit',
 *   disabled?: boolean,
 *   onClick?: () => void,
 * }} props
 */
export default function ActionButton({
  children,
  variant = 'solid',
  type = 'button',
  disabled,
  onClick,
}) {
  const isGhost = variant === 'ghost';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-condensed)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '8px 16px',
        borderRadius: 'var(--radius-panel)',
        border: isGhost ? 'var(--border-default)' : '1px solid transparent',
        background: isGhost ? 'transparent' : 'var(--rust)',
        color: isGhost ? 'var(--text-primary)' : 'var(--text-inverse)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
