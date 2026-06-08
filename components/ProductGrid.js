"use client";
import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/ProductCard';

export default function ProductGrid({ title, products, subsections = [], emptyMessage, ratings = {} }) {
  const { t, lang } = useLanguage();
  const [activeSubsection, setActiveSubsection] = useState(null);
  const [activeSubSub, setActiveSubSub] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, price_asc, price_desc
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Distinct categories present in the current product set (for the filter).
  const categories = [...new Set((products || []).map(p => p.category).filter(Boolean))];
  const colorOpts = [...new Set((products || []).flatMap(p => [...(p.colors || []).map(c => c.name), ...(p.variants || []).map(v => v.color)]).filter(Boolean))];
  const sizeOpts = [...new Set((products || []).flatMap(p => (p.variants || []).map(v => v.size)).filter(Boolean))];
  const availOf = (p) => (p.variants || []).reduce((s, v) => s + ((Number(v.stock) || 0) - (Number(v.reserved) || 0)), 0);

  // Match a product to the active subsection by its subsectionId, OR — for
  // legacy products that were only tagged with a free-text `category` — by
  // matching that category against the subsection's Arabic/English name.
  const activeSub = subsections.find(s => s.id === activeSubsection);
  const matchesSubsection = (p) => {
    if (p.subsectionId) return p.subsectionId === activeSubsection;
    if (!activeSub) return false;
    const cat = (p.category || '').toLowerCase().trim();
    if (!cat) return false;
    return cat === (activeSub.name_en || '').toLowerCase().trim()
        || cat === (activeSub.name_ar || '').toLowerCase().trim();
  };

  // Count products per subsection (for the chip badges).
  const countForSub = (sub) => products.filter(p => p.subsectionId
    ? p.subsectionId === sub.id
    : ((p.category || '').toLowerCase().trim() === (sub.name_en || '').toLowerCase().trim()
       || (p.category || '').toLowerCase().trim() === (sub.name_ar || '').toLowerCase().trim())).length;

  const deeper = activeSub?.subs || [];

  let filteredProducts = activeSubsection
    ? products.filter(matchesSubsection)
    : [...products];
  if (activeSubSub) filteredProducts = filteredProducts.filter(p => p.subSubId === activeSubSub);

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
  if (colorFilter) {
    filteredProducts = filteredProducts.filter(p => (p.colors || []).some(c => c.name === colorFilter) || (p.variants || []).some(v => v.color === colorFilter));
  }
  if (sizeFilter) {
    filteredProducts = filteredProducts.filter(p => (p.variants || []).some(v => v.size === sizeFilter));
  }
  if (inStockOnly) {
    filteredProducts = filteredProducts.filter(p => !(p.variants?.length) || availOf(p) > 0);
  }

  // Apply Sorting (on a copy so we never mutate the products prop)
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
    // date_desc — newest first by createdAt (older products without it sort last)
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Re-reveal whenever the visible set changes, so filtered-in cards (rendered
  // after mount) don't stay stuck at opacity:0.
  useScrollReveal([activeSubsection, activeSubSub, category, priceMin, priceMax, sortBy, colorFilter, sizeFilter, inStockOnly, filteredProducts.length]);

  return (
    <section className="products">
      {title && <h2 className="section-title reveal"><span>{title}</span></h2>}

      {/* Sub-section Filter Tabs */}
      {subsections && subsections.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem', padding: '0 5%' }}>
          <button
            onClick={() => { setActiveSubsection(null); setActiveSubSub(null); }}
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
              onClick={() => { setActiveSubsection(sub.id); setActiveSubSub(null); }}
              style={{
                padding: '6px 18px', borderRadius: '99px', border: '1.5px solid var(--border-color)',
                background: activeSubsection === sub.id ? 'var(--text-primary)' : 'transparent',
                color: activeSubsection === sub.id ? 'var(--bg-color)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.25s',
                letterSpacing: '0.04em'
              }}
            >
              {lang === 'ar' ? sub.name_ar : lang === 'he' ? (sub.name_he || sub.name_en) : sub.name_en}
              <span style={{ opacity: 0.55, marginInlineStart: '6px', fontSize: '0.78rem' }}>{countForSub(sub)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Deeper category chips — when the active sub-section has children */}
      {activeSubsection && deeper.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '-1rem', marginBottom: '2rem', padding: '0 5%' }}>
          <button onClick={() => setActiveSubSub(null)} style={{ padding: '5px 15px', borderRadius: '99px', border: '1px solid var(--border-color)', background: activeSubSub === null ? 'var(--text-primary)' : 'transparent', color: activeSubSub === null ? 'var(--bg-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {lang === 'ar' ? 'الكل' : lang === 'he' ? 'הכל' : 'All'}
          </button>
          {deeper.map(ss => {
            const n = products.filter(p => p.subSubId === ss.id).length;
            return (
              <button key={ss.id} onClick={() => setActiveSubSub(activeSubSub === ss.id ? null : ss.id)} style={{ padding: '5px 15px', borderRadius: '99px', border: '1px solid var(--border-color)', background: activeSubSub === ss.id ? 'var(--text-primary)' : 'transparent', color: activeSubSub === ss.id ? 'var(--bg-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: n === 0 ? 0.45 : 1 }}>
                {lang === 'ar' ? ss.name_ar : lang === 'he' ? (ss.name_he || ss.name_en) : ss.name_en}
                <span style={{ opacity: 0.55, marginInlineStart: '5px', fontSize: '0.74rem' }}>{n}</span>
              </button>
            );
          })}
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

            {colorOpts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{lang === 'he' ? 'צבע' : lang === 'en' ? 'Color' : 'اللون'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {colorOpts.map(c => (
                    <button key={c} type="button" onClick={() => setColorFilter(colorFilter === c ? '' : c)} className={`shop-pill${colorFilter === c ? ' on' : ''}`}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {sizeOpts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{lang === 'he' ? 'מידה' : lang === 'en' ? 'Size' : 'المقاس'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {sizeOpts.map(s => (
                    <button key={s} type="button" onClick={() => setSizeFilter(sizeFilter === s ? '' : s)} className={`shop-pill${sizeFilter === s ? ' on' : ''}`}>{s}</button>
                  ))}
                </div>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
              {lang === 'he' ? 'במלאי בלבד' : lang === 'en' ? 'In stock only' : 'المتوفر فقط'}
            </label>

            <button
              onClick={() => { setPriceMin(''); setPriceMax(''); setCategory(''); setSortBy('date_desc'); setColorFilter(''); setSizeFilter(''); setInStockOnly(false); }}
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
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} rating={ratings[product.id]} />
            ))}
        </div>
      )}
    </section>
  );
}
