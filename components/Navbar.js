"use client";
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CategorySidebar from './CategorySidebar';
import { getSections } from '@/lib/db';
import Image from 'next/image';

export default function Navbar() {
  const { cartCount, toggleCart } = useCart();
  const { lang, setLang, t, storeSettings } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getSections().then(setSections).catch(console.error);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleScrollToSection = (e, id) => {
    if (pathname === '/') {
      e.preventDefault();
      const el = document.getElementById(`section-${id}`);
      if (el) {
        window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
      }
    }
  };

  return (
    <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}>
      <div style={{
        background: 'var(--accent-color)',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 10px',
        fontSize: '0.75rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: '300',
        lineHeight: '1.4'
      }}>
        {t('announcement')}
      </div>

      <div className="navbar" style={{ position: 'relative' }}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            aria-label="Menu" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 300 }}
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image src={storeSettings?.logoUrl || "/assets/logo.png"} alt="Logo" width={35} height={35} style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
            <span>{storeSettings ? storeSettings.storeName.toUpperCase() : t('storeName').toUpperCase()}</span>
          </Link>
        </div>

        <nav className="nav-container hide-mobile">
          <ul className="nav-links" style={{ display: 'flex', gap: '1.5rem', listStyle: 'none' }}>
            <li><Link href="/">{t('home')}</Link></li>
            {sections.map(sec => {
              const secTitleKey = sec.title_en ? sec.title_en.toLowerCase() : '';
              const secTitle = t(secTitleKey) !== secTitleKey ? t(secTitleKey) : (lang === 'en' ? sec.title_en : sec.title_ar);
              return (
                <li key={sec.id}>
                  <Link href={`/#section-${sec.id}`} onClick={(e) => handleScrollToSection(e, sec.id)}>
                    {secTitle}
                  </Link>
                </li>
              );
            })}
            <li><Link href="/track" style={{ color: 'var(--accent-color)' }}>{t('trackOrder')}</Link></li>
          </ul>
        </nav>

        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <form onSubmit={handleSearch} className="search-bar hide-mobile">
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn" style={{ fontWeight: 300 }}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </form>

          <div className="language-switcher" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
              <span style={{ cursor: 'pointer', color: lang === 'en' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => setLang('en')}>EN</span>
              <span style={{ cursor: 'pointer', color: lang === 'he' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => setLang('he')}>HE</span>
              <span style={{ cursor: 'pointer', color: lang === 'ar' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => setLang('ar')}>AR</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/track" className="hide-mobile" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }} title={t('trackOrder')}>
              <i className="fa-solid fa-truck-fast"></i>
            </Link>
            <Link href="/wishlist" className="hide-mobile" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }} title={t('wishlist')}>
              <i className="fa-regular fa-heart"></i>
            </Link>
            <Link href="/profile" className="hide-mobile" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', textDecoration: 'none' }} title={t('profile')}>
              <i className="fa-solid fa-user"></i>
            </Link>
            <button className="cart-icon" onClick={toggleCart} aria-label="Cart" style={{ fontWeight: 300, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <i className="fa-solid fa-bag-shopping" style={{ fontSize: '1.2rem' }}></i>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>
      <CategorySidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} sections={sections} />
    </header>
  );
}
