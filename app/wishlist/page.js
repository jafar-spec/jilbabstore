"use client";
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';
import ProductGrid from '@/components/ProductGrid';
import Link from 'next/link';

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const { lang, t } = useLanguage();

  return (
    <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 2rem', minHeight: '60vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
        {t('wishlistTitle')} ❤️
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        {t('wishlistSubtitle')}
      </p>

      {wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <i className="fa-regular fa-heart" style={{ fontSize: '4rem', color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }}></i>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('wishlistEmpty')}</h2>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            {t('browseStore')}
          </Link>
        </div>
      ) : (
        <ProductGrid 
          title="" 
          products={wishlist} 
          emptyMessage={t('noProducts')} 
        />
      )}
    </div>
  );
}
