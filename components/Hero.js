"use client";
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Hero() {
  const { t, lang, storeSettings } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);

  const heroTitle = storeSettings?.[`heroTitle_${lang}`] || storeSettings?.heroTitle || t('heroTitle');
  const heroSubtitle = storeSettings?.[`heroSubtitle_${lang}`] || storeSettings?.heroSubtitle || t('heroSubtitle');

  const images = [
    storeSettings?.heroImgLeft || "/assets/beige_jilbab_1779926569451.png",
    storeSettings?.heroImgMiddle || "/assets/black_jilbab_1779926556174.png",
    storeSettings?.heroImgRight || "/assets/hero_jilbab_store_1779926544481.png"
  ].filter(Boolean);

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
        height: '80vh',
        minHeight: '600px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#f7f7f7'
      }}
    >
      {/* Background Image Carousel (Full Width) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {images.map((imgSrc, idx) => (
          <Image 
            key={idx}
            src={imgSrc} 
            alt={`Hero Banner ${idx + 1}`} 
            fill
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center top',
              opacity: idx === currentIdx ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out'
            }}
            priority={idx === 0}
          />
        ))}
        {/* Subtle Dark Overlay for Text Readability */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)', transition: 'background-color 1.5s' }}></div>
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
        <h1 
          style={{ 
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
            fontWeight: '700',
            lineHeight: '1.1',
            letterSpacing: '0.02em',
            margin: 0,
            textTransform: 'uppercase'
          }}
          className="hero-animate-text"
        >
          {heroTitle}
        </h1>
        
        <p 
          style={{
            fontSize: '1.25rem',
            fontWeight: '400',
            maxWidth: '500px',
            margin: '0 auto',
            opacity: 0.9,
            lineHeight: '1.5'
          }}
          className="hero-animate-text hero-animate-delay-1"
        >
          {heroSubtitle}
        </p>
        
        <a 
          href="#shop" 
          onClick={handleScroll}
          className="hero-animate-text hero-animate-delay-2"
          style={{ 
            display: 'inline-block',
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '1rem 3rem',
            fontSize: '1rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '1rem',
            transition: 'all 0.3s ease',
            border: '1px solid #ffffff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#000000';
          }}
        >
          {t('shopNow')}
        </a>
      </div>

      {/* Carousel Dots */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          zIndex: 2,
          display: 'flex',
          gap: '0.5rem'
        }}>
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: idx === currentIdx ? '#ffffff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                padding: 0,
                transition: 'background-color 0.3s'
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
