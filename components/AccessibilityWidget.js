"use client";
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'a11y_prefs';
const DEFAULTS = { fontScale: 100, contrast: false, readable: false, links: false, reduceMotion: false };

const apply = (p) => {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.style.fontSize = `${p.fontScale || 100}%`;
  el.classList.toggle('a11y-contrast', !!p.contrast);
  el.classList.toggle('a11y-readable', !!p.readable);
  el.classList.toggle('a11y-links', !!p.links);
  el.classList.toggle('a11y-reduce-motion', !!p.reduceMotion);
};

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULTS);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  // Load + apply saved preferences on mount.
  useEffect(() => {
    let saved = DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    setPrefs(saved);
    apply(saved);
  }, []);

  const update = (patch) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      apply(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => update(DEFAULTS);

  // Close on Escape; focus first control when opening.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    setTimeout(() => panelRef.current?.querySelector('button, input')?.focus(), 50);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const Toggle = ({ label, icon, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
        padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
        border: active ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
        background: active ? 'rgba(124,58,237,0.08)' : 'var(--bg-color)',
        color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'start'
      }}
    >
      <i className={icon} aria-hidden="true" style={{ width: '20px', textAlign: 'center' }}></i>
      <span style={{ flex: 1 }}>{label}</span>
      <span aria-hidden="true" style={{ fontSize: '0.75rem', color: active ? 'var(--accent-color)' : 'var(--text-secondary)' }}>{active ? 'مُفعّل' : ''}</span>
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="خيارات إمكانية الوصول"
        aria-expanded={open}
        title="إمكانية الوصول"
        style={{
          // Physical left (not inset-inline) so it stays clear of the
          // customer-service widget on the right in this RTL layout.
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 3000,
          width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--accent-color)', color: '#fff', fontSize: '1.4rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <i className="fa-solid fa-universal-access" aria-hidden="true"></i>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="إعدادات إمكانية الوصول"
          style={{
            position: 'fixed', bottom: '84px', left: '20px', zIndex: 3000,
            width: 'min(300px, calc(100vw - 40px))', background: 'var(--surface-color)',
            border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <strong style={{ fontSize: '1rem' }}><i className="fa-solid fa-universal-access" aria-hidden="true" style={{ marginInlineEnd: '6px', color: 'var(--accent-color)' }}></i> إمكانية الوصول</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>

          {/* Text size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
            <i className="fa-solid fa-text-height" aria-hidden="true" style={{ width: '20px', textAlign: 'center' }}></i>
            <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>حجم الخط</span>
            <button type="button" aria-label="تصغير الخط" onClick={() => update({ fontScale: Math.max(80, prefs.fontScale - 10) })} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', fontWeight: 700 }}>−</button>
            <span aria-live="polite" style={{ minWidth: '42px', textAlign: 'center', fontSize: '0.85rem' }}>{prefs.fontScale}%</span>
            <button type="button" aria-label="تكبير الخط" onClick={() => update({ fontScale: Math.min(150, prefs.fontScale + 10) })} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', fontWeight: 700 }}>+</button>
          </div>

          <Toggle label="تباين عالٍ" icon="fa-solid fa-circle-half-stroke" active={prefs.contrast} onClick={() => update({ contrast: !prefs.contrast })} />
          <Toggle label="خط سهل القراءة" icon="fa-solid fa-font" active={prefs.readable} onClick={() => update({ readable: !prefs.readable })} />
          <Toggle label="إبراز الروابط" icon="fa-solid fa-link" active={prefs.links} onClick={() => update({ links: !prefs.links })} />
          <Toggle label="تقليل الحركة" icon="fa-solid fa-person-walking" active={prefs.reduceMotion} onClick={() => update({ reduceMotion: !prefs.reduceMotion })} />

          <button type="button" onClick={reset} style={{ marginTop: '0.25rem', padding: '0.6rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" style={{ marginInlineEnd: '6px' }}></i> إعادة الضبط
          </button>
        </div>
      )}
    </>
  );
}
