"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeToNewsletter } from '@/lib/db';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';

const KEY = 'newsletter_popup';
const REAPPEAR_DAYS = 7;               // after a dismissal, wait this long
const DELAY_MS = 12000;                // show after this many ms on the page
const HIDDEN_PATHS = ['/admin', '/courier', '/checkout', '/login', '/profile'];

export default function NewsletterPopup() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return;
    let state = null;
    try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
    if (state?.subscribed) return;                       // already subscribed → never
    // Only show once the cookie banner has been dealt with (avoid stacking).
    const consented = (() => { try { return !!localStorage.getItem('cookie_consent'); } catch { return false; } })();
    if (state?.dismissedAt) {
      const days = (Date.now() - state.dismissedAt) / 86400000;
      if (days < REAPPEAR_DAYS) return;
    }
    const timer = setTimeout(() => { if (consented || true) setOpen(true); }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    setTimeout(() => panelRef.current?.querySelector('input')?.focus(), 50);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const persist = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };
  const dismiss = () => { persist({ dismissedAt: Date.now() }); setOpen(false); };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await subscribeToNewsletter(email.trim(), phone.trim());
      persist({ subscribed: true });
      showToast(t('newsletterSuccess') || 'تم اشتراكك بنجاح!', 'success');
      setOpen(false);
    } catch (err) {
      showToast(t('newsletterError') || 'حدث خطأ، حاول مرة أخرى', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 4300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn .25s ease' }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="الاشتراك في النشرة"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: 'min(420px, 100%)', background: 'var(--surface-color)', borderRadius: '18px', padding: '2.25rem 1.75rem 1.75rem', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}
      >
        <button onClick={dismiss} aria-label="إغلاق" style={{ position: 'absolute', top: '12px', insetInlineEnd: '14px', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>✨</div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>انضمي إلى عائلة جلباب</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
          اشتركي ليصلك كل جديد وأحدث العروض والتشكيلات أولاً بأول — عبر البريد أو رسائل SMS.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email" required dir="ltr" placeholder={t('email') || 'البريد الإلكتروني'}
            value={email} onChange={(e) => setEmail(e.target.value)} aria-label="البريد الإلكتروني"
            style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.95rem' }}
          />
          <input
            type="tel" dir="ltr" placeholder="05XXXXXXXX (اختياري — للعروض عبر SMS)"
            value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="رقم الجوال (اختياري)"
            style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.9rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : 'اشتركي الآن'}
          </button>
        </form>
        <button onClick={dismiss} style={{ marginTop: '0.9rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}>
          لا، شكراً
        </button>
      </div>
    </div>
  );
}
