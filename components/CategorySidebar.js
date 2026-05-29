"use client";
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function CategorySidebar({ isOpen, onClose, sections = [] }) {
  const { t, lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleScrollToSection = (e, id) => {
    if (pathname === '/') {
      e.preventDefault();
      const el = document.getElementById(`section-${id}`);
      if (el) {
        window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
      }
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <>
      <div 
        className={`cart-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      ></div>

      <div className={`category-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>{t('collections') || 'الأقسام'}</h2>
          <button className="close-cart" onClick={onClose} aria-label="Close Sidebar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ marginBottom: '1rem' }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const q = e.target.q.value;
              if (q.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(q)}`;
              }
            }} style={{ display: 'flex', borderBottom: '1.5px solid var(--text-secondary)' }}>
              <input 
                name="q"
                type="text" 
                placeholder={t('searchPlaceholder') || 'Search...'} 
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', padding: '0.5rem 0' }}
              />
              <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
          </div>

          <Link href="/" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-house"></i> {t('home')}
          </Link>

          {sections.map(sec => {
            const secTitleKey = sec.title_en ? sec.title_en.toLowerCase() : '';
            const secTitle = t(secTitleKey) !== secTitleKey ? t(secTitleKey) : (lang === 'en' ? sec.title_en : sec.title_ar);
            return (
              <Link 
                key={sec.id}
                href={`/#section-${sec.id}`}
                onClick={(e) => handleScrollToSection(e, sec.id)}
                style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <i className="fa-solid fa-layer-group"></i> {secTitle}
              </Link>
            );
          })}
          
          <Link href="/track" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-truck-fast"></i> {t('trackOrder') || 'Track Order'}
          </Link>

          <Link href="/wishlist" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-heart"></i> {t('wishlist') || 'Wishlist'}
          </Link>

          <Link href="/profile" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-user"></i> {t('profile')}
          </Link>
        </div>
      </div>
    </>
  );
}
