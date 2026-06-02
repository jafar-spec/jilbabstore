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
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, price_asc, price_desc
  useScrollReveal();

  // Distinct categories present in the current product set (for the filter).
  const categories = [...new Set((products || []).map(p => p.category).filter(Boolean))];

  let filteredProducts = activeSubsection
    ? products.filter(p => p.subsectionId === activeSubsection)
    : [...products];

  // Apply Price + Category Filters
  if (priceMin) {
    filteredProducts = filteredProducts.filter(p => Number(p.price) >= Number(priceMin));
  }
  if (priceMax) {
    filteredProducts = filteredProducts.filter(p => Number(p.price) <= Number(priceMax));
  }
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  // Apply Sorting (on a copy so we never mutate the products prop)
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
    // date_desc — newest first by createdAt (older products without it sort last)
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

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
              {lang === 'ar' ? sub.name_ar : lang === 'he' ? (sub.name_he || sub.name_en) : sub.name_en}
            </button>
          ))}
        </div>
      )}

      {/* Filter Toggle Button & Filter Panel */}
      <div style={{ padding: '0 5%', marginBottom: '2rem' }}>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <i className="fa-solid fa-sliders"></i> {t('filters') || 'تصفية وترتيب'}
        </button>

        {showFilters && (
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--surface-color)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>الحد الأدنى للسعر (₪)</label>
              <input 
                type="number" 
                value={priceMin} 
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', width: '120px', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>الحد الأقصى للسعر (₪)</label>
              <input 
                type="number" 
                value={priceMax} 
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="1000"
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', width: '120px', color: 'var(--text-primary)' }}
              />
            </div>

            {categories.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>الفئة</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', minWidth: '150px' }}
                >
                  <option value="">{lang === 'en' ? 'All categories' : lang === 'he' ? 'כל הקטגוריות' : 'كل الفئات'}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>ترتيب حسب</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', minWidth: '150px' }}
              >
                <option value="date_desc">الأحدث</option>
                <option value="price_asc">السعر: من الأقل للأعلى</option>
                <option value="price_desc">السعر: من الأعلى للأقل</option>
              </select>
            </div>

            <button
              onClick={() => { setPriceMin(''); setPriceMax(''); setCategory(''); setSortBy('date_desc'); }}
              style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', textDecoration: 'underline', padding: '0.6rem' }}
            >
              إعادة ضبط
            </button>
          </div>
        )}
      </div>
      
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
