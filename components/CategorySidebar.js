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
          
          <Link href="/" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
            {t('home')}
          </Link>

          {sections.map(sec => {
            const secTitleKey = sec.title_en ? sec.title_en.toLowerCase() : '';
            const secTitle = t(secTitleKey) !== secTitleKey ? t(secTitleKey) : (lang === 'en' ? sec.title_en : sec.title_ar);
            return (
              <Link 
                key={sec.id}
                href={`/#section-${sec.id}`}
                onClick={(e) => handleScrollToSection(e, sec.id)}
                style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                {secTitle}
              </Link>
            );
          })}
          
          <Link href="/profile" onClick={onClose} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
            {t('profile')}
          </Link>
        </div>
      </div>
    </>
  );
}
