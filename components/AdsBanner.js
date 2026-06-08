"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

// Helper: pick the right language field from an ad object
const pick = (obj, field, lang) =>
  obj?.[`${field}_${lang}`] || obj?.[`${field}_ar`] || obj?.[field] || '';

// Only treat a CTA link as navigable if it's a real internal path or an
// http(s) URL. Anything else (e.g. placeholder text) is ignored so it can't
// 404 on prefetch/click.
const isExternal = (h) => /^https?:\/\//i.test(h);
const safeHref = (h) => (typeof h === 'string' && (h.startsWith('/') || isExternal(h)) ? h.trim() : null);

const ctaStyle = {
  display: 'inline-block', background: '#fff', color: '#1c1a19',
  padding: '0.8rem 2.2rem', fontSize: '0.82rem', fontWeight: 700,
  letterSpacing: '0.05em', textDecoration: 'none', borderRadius: '999px',
  transition: 'all 0.3s', border: '1.5px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.22)'
};
const ctaOver = (e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; };
const ctaOut = (e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1c1a19'; };

export default function AdsBanner() {
  const { storeSettings, lang } = useLanguage();
  const isRtl = lang !== 'en';
  const [current, setCurrent] = useState(0);

  const ads = (storeSettings?.ads || []).filter(ad => ad.active && (ad.imageUrl || ad.title || ad[`title_${lang}`] || ad.title_ar));

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % ads.length), 5000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (!ads.length) return null;

  const ad = ads[current];

  return (
    <section style={{ background: 'var(--bg-color)', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 5%, 5rem)' }}>
      {/* Contained, rounded promo card (separates it cleanly from the hero) */}
      <div style={{ position: 'relative', maxWidth: '1320px', margin: '0 auto', height: 'clamp(220px, 34vw, 460px)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
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
              <Image src={a.imageUrl} alt={a.title || 'Ad Banner'} fill sizes="100vw" quality={72} priority={idx === current} style={{ objectFit: 'cover' }} />
            )}
            {/* Refined overlay — darker on the text (inline-start) side */}
            <div style={{ position: 'absolute', inset: 0, background: isRtl
              ? 'linear-gradient(to left, rgba(20,16,18,0.62) 0%, rgba(20,16,18,0.18) 55%, transparent 100%)'
              : 'linear-gradient(to right, rgba(20,16,18,0.62) 0%, rgba(20,16,18,0.18) 55%, transparent 100%)' }} />

            {/* Text Content */}
            {(pick(a,'title',lang) || pick(a,'subtitle',lang)) && (
              <div style={{
                position: 'absolute', insetInlineStart: 'clamp(1.5rem, 6%, 6rem)', top: '50%', transform: 'translateY(-50%)',
                color: '#fff', maxWidth: '540px', textAlign: isRtl ? 'right' : 'left'
              }}>
                {pick(a,'badge',lang) && (
                  <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', padding: '5px 16px', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1.1rem', borderRadius: '999px' }}>
                    {pick(a,'badge',lang)}
                  </span>
                )}
                {pick(a,'title',lang) && (
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.7rem, 4vw, 3.1rem)', fontWeight: 700, margin: '0 0 0.6rem', lineHeight: 1.15, textShadow: '0 2px 18px rgba(0,0,0,0.4)' }}>
                    {pick(a,'title',lang)}
                  </h2>
                )}
                {pick(a,'subtitle',lang) && (
                  <p style={{ fontSize: 'clamp(0.92rem, 1.5vw, 1.18rem)', opacity: 0.95, margin: '0 0 1.6rem', lineHeight: 1.55, textShadow: '0 1px 10px rgba(0,0,0,0.35)' }}>
                    {pick(a,'subtitle',lang)}
                  </p>
                )}
                {(() => {
                  const href = safeHref(a.linkUrl || pick(a, 'linkUrl', lang));
                  const text = pick(a, 'linkText', lang);
                  if (!href || !text) return null;
                  return isExternal(href) ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" style={ctaStyle} onMouseEnter={ctaOver} onMouseLeave={ctaOut}>
                      {text}
                    </a>
                  ) : (
                    <Link href={href} prefetch={false} style={ctaStyle} onMouseEnter={ctaOver} onMouseLeave={ctaOut}>
                      {text}
                    </Link>
                  );
                })()}
              </div>
            )}
          </div>
        ))}

        {/* Dots */}
        {ads.length > 1 && (
          <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
            {ads.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                style={{
                  width: idx === current ? '26px' : '9px', height: '9px',
                  borderRadius: '999px', border: 'none', padding: 0, cursor: 'pointer',
                  background: idx === current ? '#fff' : 'rgba(255,255,255,0.55)',
                  transition: 'all 0.4s ease'
                }}
                aria-label={`Go to ad ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
