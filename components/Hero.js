"use client";
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Hero() {
  const { t, lang, storeSettings } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);

  const heroTitle = storeSettings?.[`heroTitle_${lang}`] || storeSettings?.heroTitle || t('heroTitle');
  const heroSubtitle = storeSettings?.[`heroSubtitle_${lang}`] || storeSettings?.heroSubtitle || t('heroSubtitle');
  const isRtl = lang !== 'en';

  // Floating offer card pulls from the admin-managed ads (first active one).
  const pickAd = (o, f) => o?.[`${f}_${lang}`] || o?.[`${f}_ar`] || o?.[f] || '';
  const offer = (storeSettings?.ads || []).find(a => a.active && (pickAd(a, 'title') || pickAd(a, 'badge')));
  const offerHref = (() => {
    const h = offer && (offer.linkUrl || pickAd(offer, 'linkUrl'));
    return (typeof h === 'string' && (h.startsWith('/') || /^https?:\/\//i.test(h))) ? h.trim() : null;
  })();

  const images = [
    storeSettings?.heroImgLeft || "/assets/beige_jilbab_1779926569451.png",
    storeSettings?.heroImgMiddle || "/assets/black_jilbab_1779926556174.png",
    storeSettings?.heroImgRight || "/assets/hero_jilbab_store_1779926544481.png"
  ].filter(Boolean);

  // Only the first hero image loads up front (it's the LCP); the rest mount
  // shortly after so they don't compete for bandwidth on first paint.
  const [allLoaded, setAllLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAllLoaded(true), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleScroll = (e) => {
    e.preventDefault();
    const el = document.getElementById('shop');
    if (el) {
      window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
    }
  };

  return (
    <section 
      id="home"
      style={{
        position: 'relative',
        height: '86vh',
        minHeight: '560px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-color)'
      }}
    >
      {/* Background Image Carousel (Full Width) with gentle Ken-Burns zoom */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {images.map((imgSrc, idx) => (idx !== 0 && !allLoaded) ? null : (
          <Image
            key={idx}
            src={imgSrc}
            alt={`Hero Banner ${idx + 1}`}
            fill
            sizes="100vw"
            quality={72}
            style={{
              objectFit: 'cover',
              objectPosition: 'center top',
              opacity: idx === currentIdx ? 1 : 0,
              transform: idx === currentIdx ? 'scale(1.06)' : 'scale(1)',
              transition: 'opacity 1.5s ease-in-out, transform 6s ease-out'
            }}
            priority={idx === 0}
          />
        ))}
        {/* Editorial scrim: soft warm vignette, darker toward the bottom */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(28,22,18,0.30) 0%, rgba(28,22,18,0.12) 40%, rgba(28,22,18,0.45) 100%)' }}></div>
      </div>

      {/* Hero Content Block */}
      <div 
        className="hero-content-block"
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          color: '#ffffff',
          padding: '2rem',
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}
      >
        <span
          className="hero-animate-text"
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            fontWeight: 600,
            opacity: 0.92,
            paddingBottom: '0.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.5)'
          }}
        >
          {lang === 'he' ? 'קולקציה חדשה' : lang === 'en' ? 'New Collection' : 'تشكيلة جديدة'}
        </span>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.6rem, 6.5vw, 5rem)',
            fontWeight: '700',
            lineHeight: '1.08',
            letterSpacing: '0.01em',
            margin: 0,
            textShadow: '0 2px 24px rgba(0,0,0,0.3)'
          }}
          className="hero-animate-text hero-animate-delay-1"
        >
          {heroTitle}
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            fontWeight: '400',
            maxWidth: '520px',
            margin: '0 auto',
            opacity: 0.95,
            lineHeight: '1.6',
            textShadow: '0 1px 12px rgba(0,0,0,0.3)'
          }}
          className="hero-animate-text hero-animate-delay-2"
        >
          {heroSubtitle}
        </p>

        <a
          href="#shop"
          onClick={handleScroll}
          className="hero-animate-text hero-animate-delay-3"
          style={{
            display: 'inline-block',
            backgroundColor: '#ffffff',
            color: 'var(--text-primary)',
            padding: '0.95rem 2.8rem',
            fontSize: '0.95rem',
            fontWeight: '700',
            letterSpacing: '0.06em',
            borderRadius: '999px',
            marginTop: '0.75rem',
            transition: 'all 0.35s var(--ease-out-expo)',
            border: '1.5px solid #ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.22)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          {t('shopNow')}
        </a>
      </div>

      {/* Floating frosted offer card (integrated promo) */}
      {offer && (
        <a
          href={offerHref || '#shop'}
          onClick={offerHref ? undefined : handleScroll}
          className="hero-offer"
          style={{
            position: 'absolute',
            bottom: 'clamp(1.5rem, 4vw, 3rem)',
            insetInlineStart: 'clamp(1.25rem, 5%, 4rem)',
            zIndex: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.4rem',
            padding: '1.4rem 1.9rem',
            maxWidth: 'min(92vw, 560px)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(18px) saturate(165%)',
            WebkitBackdropFilter: 'blur(18px) saturate(165%)',
            border: '1px solid rgba(255,255,255,0.34)',
            borderRadius: 'var(--radius-xl)',
            color: '#fff',
            textDecoration: 'none',
            boxShadow: '0 16px 44px rgba(0,0,0,0.30)'
          }}
        >
          {pickAd(offer, 'badge') && (
            <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 15px', borderRadius: '999px', background: 'rgba(255,255,255,0.24)', border: '1px solid rgba(255,255,255,0.38)' }}>
              {pickAd(offer, 'badge')}
            </span>
          )}
          <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, textAlign: 'start' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pickAd(offer, 'title') || (lang === 'he' ? 'מבצע מיוחד' : lang === 'en' ? 'Special offer' : 'عرض خاص')}
            </strong>
            {pickAd(offer, 'subtitle') && (
              <span style={{ fontSize: '0.95rem', opacity: 0.92, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pickAd(offer, 'subtitle')}
              </span>
            )}
          </span>
          <i className={`fa-solid ${isRtl ? 'fa-arrow-left' : 'fa-arrow-right'}`} style={{ flexShrink: 0, fontSize: '1.1rem', opacity: 0.95 }}></i>
        </a>
      )}

      {/* Carousel Dots */}
      {images.length > 1 && (
        <div className="hero-dots" style={{
          position: 'absolute',
          bottom: 'clamp(1.75rem, 4vw, 3.2rem)',
          insetInlineEnd: 'clamp(1.25rem, 5%, 4rem)',
          zIndex: 3,
          display: 'flex',
          gap: '0.5rem'
        }}>
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              style={{
                width: idx === currentIdx ? '26px' : '9px',
                height: '9px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: idx === currentIdx ? '#ffffff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 1px 5px rgba(0,0,0,0.3)',
                transition: 'all 0.4s var(--ease-out-expo)'
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
