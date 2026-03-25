import './ActionButton.css';
export default function ActionButton({ children, variant = 'solid', onClick, disabled }) {
    return <button className={`action-btn action-btn--${variant}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
