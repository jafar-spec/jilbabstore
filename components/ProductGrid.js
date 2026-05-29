"use client";
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import { useWishlist } from '@/context/WishlistContext';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductGrid({ title, products, subsections = [], emptyMessage }) {
  const { addToCart } = useCart();
  const { t, lang } = useLanguage();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [activeSubsection, setActiveSubsection] = useState(null);
  useScrollReveal();

  const filteredProducts = activeSubsection
    ? products.filter(p => p.subsectionId === activeSubsection)
    : products;

  return (
    <section className="products">
      {title && <h2 className="section-title reveal"><span>{title}</span></h2>}

      {/* Sub-section Filter Tabs */}
      {subsections && subsections.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem', padding: '0 5%' }}>
          <button
            onClick={() => setActiveSubsection(null)}
            style={{
              padding: '6px 18px', borderRadius: '99px', border: '1.5px solid var(--border-color)',
              background: activeSubsection === null ? 'var(--text-primary)' : 'transparent',
              color: activeSubsection === null ? 'var(--bg-color)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.25s',
              letterSpacing: '0.04em'
            }}
          >
            {lang === 'ar' ? 'الكل' : lang === 'he' ? 'הכל' : 'All'}
          </button>
          {subsections.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubsection(sub.id)}
              style={{
                padding: '6px 18px', borderRadius: '99px', border: '1.5px solid var(--border-color)',
                background: activeSubsection === sub.id ? 'var(--text-primary)' : 'transparent',
                color: activeSubsection === sub.id ? 'var(--bg-color)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.25s',
                letterSpacing: '0.04em'
              }}
            >
              {lang === 'ar' ? sub.name_ar : lang === 'he' ? sub.name_he : sub.name_en}
            </button>
          ))}
        </div>
      )}
      
      {!filteredProducts || filteredProducts.length === 0 ? (
        <div className="reveal" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            <p>{emptyMessage || t('noProducts')}</p>
        </div>
      ) : (
        <div className="product-grid" id="product-grid">
            {filteredProducts.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              return (
              <div className="product-card reveal" key={product.id}>
                  <div className="product-image-container" style={{ position: 'relative', height: '300px', width: '100%' }}>
                    <Link href={`/product/${product.id}`} className="product-image" style={{ width: '100%', height: '100%', position: 'relative', display: 'block' }}>
                      <Image 
                        src={(product.images && product.images.length > 0) ? product.images[0] : (product.image || '/assets/black_jilbab_1779926556174.png')} 
                        alt={product.title} 
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </Link>
                    <button 
                      onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', zIndex: 10 }}
                    >
                      <i className={isInWishlist(product.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"} style={{ color: isInWishlist(product.id) ? '#e74c3c' : 'var(--text-secondary)', fontSize: '1.2rem', transition: 'all 0.3s' }}></i>
                    </button>
                  </div>
                  <div className="product-info">
                      <Link href={`/product/${product.id}`}><h3 className="product-title">{product.title}</h3></Link>
                      <p className="product-price">{product.price} {t('price')}</p>
                      
                      {hasVariants ? (
                        <Link href={`/product/${product.id}`} className="add-to-cart" style={{ display: 'block', textAlign: 'center' }}>
                          {t('chooseSize')}
                        </Link>
                      ) : (
                        <button className="add-to-cart" onClick={() => addToCart(product)}>
                            {t('addToCart')}
                        </button>
                      )}
                  </div>
              </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
