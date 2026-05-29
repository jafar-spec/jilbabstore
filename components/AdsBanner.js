"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function AdsBanner() {
  const { storeSettings } = useLanguage();
  const [current, setCurrent] = useState(0);

  const ads = (storeSettings?.ads || []).filter(ad => ad.active && (ad.imageUrl || ad.title));

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % ads.length), 5000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (!ads.length) return null;

  const ad = ads[current];

  return (
    <section style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'var(--surface-color)' }}>
      {/* Slides */}
      <div style={{ position: 'relative', height: 'clamp(200px, 35vw, 480px)' }}>
        {ads.map((a, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute', inset: 0,
              opacity: idx === current ? 1 : 0,
              transition: 'opacity 0.9s ease-in-out',
              pointerEvents: idx === current ? 'auto' : 'none'
            }}
          >
            {a.imageUrl && (
              <Image src={a.imageUrl} alt={a.title || 'Ad Banner'} fill style={{ objectFit: 'cover' }} />
            )}
            {/* Overlay gradient */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />

            {/* Text Content */}
            {(a.title || a.subtitle) && (
              <div style={{
                position: 'absolute', left: 'clamp(1.5rem, 5%, 5rem)', top: '50%', transform: 'translateY(-50%)',
                color: '#fff', maxWidth: '500px'
              }}>
                {a.badge && (
                  <span style={{ display: 'inline-block', background: 'var(--accent-color)', color: '#fff', padding: '4px 14px', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>
                    {a.badge}
                  </span>
                )}
                {a.title && (
                  <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)', fontWeight: 700, margin: '0 0 0.5rem', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {a.title}
                  </h2>
                )}
                {a.subtitle && (
                  <p style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.15rem)', opacity: 0.9, margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                    {a.subtitle}
                  </p>
                )}
                {a.linkUrl && a.linkText && (
                  <Link
                    href={a.linkUrl}
                    style={{
                      display: 'inline-block', background: '#fff', color: '#000',
                      padding: '0.75rem 2rem', fontSize: '0.85rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none',
                      transition: 'all 0.3s', border: '2px solid #fff'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                  >
                    {a.linkText}
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dots */}
      {ads.length > 1 && (
        <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              style={{
                width: idx === current ? '24px' : '8px', height: '8px',
                borderRadius: '4px', border: 'none', padding: 0, cursor: 'pointer',
                background: idx === current ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.4s ease'
              }}
              aria-label={`Go to ad ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
