// Simple empty-state placeholder used across admin tabs.
export default function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.3 }}></i>
      <p style={{ fontSize: '1.2rem' }}>{text}</p>
    </div>
  );
}
