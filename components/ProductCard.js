"use client";
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';
import { localized } from '@/lib/localize';
import Link from 'next/link';
import Image from 'next/image';

// Shared product card used by the homepage grid and the /shop browser.
export default function ProductCard({ product, rating }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { t, lang } = useLanguage();

  const hasVariants = product.variants && product.variants.length > 0;
  const totalStock = (product.variants || []).reduce((s, v) => s + ((Number(v.stock) || 0) - (Number(v.reserved) || 0)), 0);
  const soldOut = hasVariants && totalStock <= 0;
  const isNew = !!product.isNewArrival;
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image || '/assets/black_jilbab_1779926556174.png'];
  const displayTitle = localized(product, 'title', lang);

  return (
    <div className="product-card reveal">
      <div className="product-image-container" style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4' }}>
        <Link href={`/product/${product.id}`} className="product-image" style={{ width: '100%', height: '100%', position: 'relative', display: 'block' }}>
          <Image src={imgs[0]} alt={displayTitle} fill quality={90} sizes="(max-width: 768px) 50vw, 470px" style={{ objectFit: 'cover', opacity: soldOut ? 0.82 : 1 }} />
          {imgs[1] && (
            <Image className="img-hover" src={imgs[1]} alt="" aria-hidden="true" fill quality={90} sizes="(max-width: 768px) 50vw, 470px" style={{ objectFit: 'cover' }} />
          )}
        </Link>

        <div style={{ position: 'absolute', top: '10px', insetInlineStart: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          {soldOut
            ? <span className="card-badge card-badge--out">{lang === 'he' ? 'אזל' : lang === 'en' ? 'Sold out' : 'نفد'}</span>
            : isNew && <span className="card-badge card-badge--new">{lang === 'he' ? 'חדש' : lang === 'en' ? 'New' : 'جديد'}</span>}
        </div>

        <button
          className="wish-btn"
          onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
          aria-label={isInWishlist(product.id) ? `إزالة ${displayTitle} من المفضلة` : `إضافة ${displayTitle} إلى المفضلة`}
          aria-pressed={isInWishlist(product.id)}
        >
          <i className={isInWishlist(product.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} style={{ color: isInWishlist(product.id) ? '#e74c3c' : 'var(--text-secondary)', fontSize: '1.1rem', transition: 'all 0.3s' }}></i>
        </button>

        {/* Action overlays the image — hidden until hover on desktop, always shown on touch */}
        <div className="card-actions">
          {soldOut ? (
            <button className="add-to-cart" disabled>{lang === 'he' ? 'אזל מהמלאי' : lang === 'en' ? 'Sold out' : 'نفد المخزون'}</button>
          ) : hasVariants ? (
            <Link href={`/product/${product.id}`} className="add-to-cart" style={{ display: 'block', textAlign: 'center' }}>{t('chooseSize')}</Link>
          ) : (
            <button className="add-to-cart" onClick={() => addToCart(product)}>{t('addToCart')}</button>
          )}
        </div>
      </div>
      <div className="product-info">
        <Link href={`/product/${product.id}`}><h3 className="product-title">{displayTitle}</h3></Link>
        {rating?.count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0 4px', fontSize: '0.8rem' }}>
            {[...Array(5)].map((_, i) => (
              <i key={i} className="fa-solid fa-star" style={{ color: i < Math.round(rating.avg) ? '#e0b34a' : '#e2ddd6', fontSize: '0.72rem' }}></i>
            ))}
            <span style={{ color: 'var(--text-secondary)' }}>({rating.count})</span>
          </div>
        )}
        <p className="product-price">{product.price} {t('price')}</p>
      </div>
    </div>
  );
}
