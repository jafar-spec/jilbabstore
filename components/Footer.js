"use client";
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';
import { subscribeToNewsletter } from '@/lib/db';
import { useToast } from '@/context/ToastContext';

const SocialIcon = ({ href, icon, label, color }) => {
  const [hovered, setHovered] = useState(false);
  if (!href) return null;
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '42px', height: '42px', borderRadius: '50%',
        background: hovered ? color : 'var(--surface-color)',
        border: `1.5px solid ${hovered ? color : 'var(--border-color)'}`,
        color: hovered ? '#fff' : 'var(--text-secondary)',
        fontSize: '1.1rem', transition: 'all 0.3s ease', textDecoration: 'none'
      }}
    >
      <i className={icon}></i>
    </a>
  );
};

export default function Footer() {
  const { t, storeSettings } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const socials = storeSettings?.socials || {};

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

  const hasSocials = Object.values(socials).some(v => v);

  return (
    <footer id="about" style={{ background: 'var(--surface-color)', color: 'var(--text-primary)', padding: '6rem 5% 3rem', marginTop: '6rem', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', justifyContent: 'space-between' }}>
        
        {/* Brand Column */}
        <div style={{ flex: '1 1 260px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '1rem', fontWeight: '400', letterSpacing: '0.1em' }}>
            {(storeSettings?.storeName || t('storeName')).toUpperCase()}
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {t('aboutStore')}
          </p>
          {/* Social Media Icons */}
          {hasSocials && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <SocialIcon href={socials.instagram} icon="fa-brands fa-instagram" label="Instagram" color="#E1306C" />
              <SocialIcon href={socials.facebook} icon="fa-brands fa-facebook-f" label="Facebook" color="#1877F2" />
              <SocialIcon href={socials.tiktok} icon="fa-brands fa-tiktok" label="TikTok" color="#010101" />
              <SocialIcon href={socials.whatsapp} icon="fa-brands fa-whatsapp" label="WhatsApp" color="#25D366" />
              <SocialIcon href={socials.snapchat} icon="fa-brands fa-snapchat" label="Snapchat" color="#FFFC00" />
              <SocialIcon href={socials.youtube} icon="fa-brands fa-youtube" label="YouTube" color="#FF0000" />
              <SocialIcon href={socials.twitter} icon="fa-brands fa-x-twitter" label="X (Twitter)" color="#000000" />
              <SocialIcon href={socials.telegram} icon="fa-brands fa-telegram" label="Telegram" color="#0088CC" />
            </div>
          )}
        </div>

        {/* Links Column */}
        <div style={{ flex: '1 1 180px' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('importantLinks')}</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href="/#shop" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('shop')}</Link></li>
            <li><Link href="/track" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('trackOrder')}</Link></li>
            <li><Link href="/wishlist" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('wishlist')}</Link></li>
            <li><Link href="/profile" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('profile')}</Link></li>
            <li><Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('privacyPolicy')}</Link></li>
            <li><Link href="/returns" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', transition: 'var(--transition)' }}>{t('returnPolicy')}</Link></li>
          </ul>
        </div>

        {/* Shipping & Newsletter Column */}
        <div style={{ flex: '1 1 300px' }}>
          {/* Shipping Info */}
          {storeSettings?.freeShippingThreshold && (
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-color)15, var(--accent-color)05)',
              border: '1px solid var(--accent-color)33',
              borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '2rem',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <i className="fa-solid fa-truck-fast" style={{ fontSize: '1.4rem', color: 'var(--accent-color)' }}></i>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Free Shipping / شحن مجاني
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  On orders above ₪{storeSettings.freeShippingThreshold}
                </div>
              </div>
            </div>
          )}

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
        <p>&copy; {new Date().getFullYear()} {storeSettings?.storeName || t('storeName')}. {t('allRightsReserved')}</p>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none', transition: 'var(--transition)' }}>{t('privacyPolicy')}</Link>
          <Link href="/returns" style={{ color: 'inherit', textDecoration: 'none', transition: 'var(--transition)' }}>{t('returnPolicy')}</Link>
        </div>
      </div>
    </footer>
  );
}
