"use client";
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';
import { subscribeToNewsletter } from '@/lib/db';
import { useToast } from '@/context/ToastContext';

export default function Footer() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await subscribeToNewsletter(email);
      showToast(t('newsletterSuccess'), 'success');
      setEmail('');
    } catch (err) {
      console.error(err);
      showToast(t('newsletterError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer id="about" style={{ background: 'var(--surface-color)', color: 'var(--text-primary)', padding: '6rem 5% 3rem', marginTop: '6rem', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', justifyContent: 'space-between' }}>
        
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: '400', letterSpacing: '0.1em' }}>
            {t('storeName').toUpperCase()}
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
            {t('aboutStore')}
          </p>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('importantLinks')}</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href="/#shop" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('shop')}</Link></li>
            <li><Link href="/search?q=jilbab" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('jilbabs')}</Link></li>
            <li><Link href="/search?q=khimar" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('khimars')}</Link></li>
          </ul>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('newsletterTitle')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: '1.8' }}>{t('newsletterSubtitle')}</p>
          <form onSubmit={handleSubscribe} style={{ display: 'flex', borderBottom: '1px solid var(--text-primary)', paddingBottom: '0.5rem', marginTop: '1rem' }}>
            <input 
              type="email" 
              placeholder={t('newsletterPlaceholder')} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)' }} 
            />
            <button disabled={loading} type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
              {loading ? '...' : t('subscribe')}
            </button>
          </form>
        </div>

      </div>
      
      <div style={{ maxWidth: '1200px', margin: '4rem auto 0', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
        <p>&copy; {new Date().getFullYear()} {t('storeName')}. {t('allRightsReserved')}</p>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none', transition: 'var(--transition)' }}>{t('privacyPolicy')}</Link>
          <Link href="/returns" style={{ color: 'inherit', textDecoration: 'none', transition: 'var(--transition)' }}>{t('returnPolicy')}</Link>
        </div>
      </div>
    </footer>
  );
}
