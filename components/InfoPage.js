// Shared layout for simple informational/legal pages.
export default function InfoPage({ title, children }) {
  return (
    <main>
      <div style={{ paddingTop: '100px', minHeight: '60vh', maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px', lineHeight: 1.9 }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold' }}>{title}</h1>
        <div style={{ background: 'var(--glass-strong)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Section({ heading, children }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      {heading && <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>{heading}</h2>}
      <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </section>
  );
}
