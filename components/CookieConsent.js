"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Privacy-first cookie banner. Analytics stays off until the visitor accepts.
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setShow(true);
    } catch { /* ignore */ }
  }, []);

  const decide = (value) => {
    try { localStorage.setItem('cookie_consent', value); } catch { /* ignore */ }
    window.dispatchEvent(new Event('cookie-consent-changed'));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div role="dialog" aria-label="Cookie consent" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 4000,
      background: 'var(--surface-color)', borderTop: '1px solid var(--glass-border)',
      boxShadow: '0 -6px 24px rgba(0,0,0,0.12)', padding: '1rem 1.25rem',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
    }}>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', flex: '1 1 320px', textAlign: 'center' }}>
        نستخدم ملفات تعريف الارتباط لتحسين تجربتك وقياس أداء الموقع. يمكنك القبول أو الرفض.{' '}
        <Link href="/privacy" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>سياسة الخصوصية</Link>
      </p>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button onClick={() => decide('declined')} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
          رفض
        </button>
        <button onClick={() => decide('accepted')} className="btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
          قبول
        </button>
      </div>
    </div>
  );
}
