"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import ProductCard from '@/components/ProductCard';

const norm = (s) => (s || '').toString().trim().toLowerCase();

export default function ShopBrowser({ products = [], sections = [], ratings = {}, loading = false, initialSection = '', initialSub = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { t, lang } = useLanguage();

  const [section, setSection] = useState(initialSection || sp.get('section') || '');
  const [sub, setSub] = useState(initialSub || sp.get('sub') || '');
  const [subsub, setSubsub] = useState(sp.get('subsub') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'date_desc');
  const [min, setMin] = useState(sp.get('min') || '');
  const [max, setMax] = useState(sp.get('max') || '');
  const [color, setColor] = useState(sp.get('color') || '');
  const [size, setSize] = useState(sp.get('size') || '');
  const [instock, setInstock] = useState(sp.get('instock') === '1');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keep state → URL (shareable / back-button), without scroll jumps.
  useEffect(() => {
    const q = new URLSearchParams();
    if (section) q.set('section', section);
    if (sub) q.set('sub', sub);
    if (subsub) q.set('subsub', subsub);
    if (sort && sort !== 'date_desc') q.set('sort', sort);
    if (min) q.set('min', min);
    if (max) q.set('max', max);
    if (color) q.set('color', color);
    if (size) q.set('size', size);
    if (instock) q.set('instock', '1');
    const qs = q.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, sub, subsub, sort, min, max, color, size, instock]);

  const sectionObj = sections.find(s => s.id === section) || null;
  const subsections = sectionObj?.subsections || [];

  const sName = (s) => (lang === 'en' ? (s.title_en || s.title_ar) : lang === 'he' ? (s.title_he || s.title_en || s.title_ar) : s.title_ar) || s.title_ar || '';
  const subName = (ss) => (lang === 'ar' ? ss.name_ar : lang === 'he' ? (ss.name_he || ss.name_en) : ss.name_en) || ss.name_ar || '';

  const matchesSub = (p, ss) => p.subsectionId
    ? p.subsectionId === ss.id
    : (norm(p.category) === norm(ss.name_en) || norm(p.category) === norm(ss.name_ar));

  const avail = (p) => (p.variants || []).reduce((s, v) => s + ((Number(v.stock) || 0) - (Number(v.reserved) || 0)), 0);

  // Facet option lists (scoped to the chosen section for relevance).
  const scoped = useMemo(() => section ? products.filter(p => p.sectionId === section) : products, [products, section]);
  const colorOpts = useMemo(() => {
    const set = new Set();
    scoped.forEach(p => { (p.colors || []).forEach(c => c?.name && set.add(c.name)); (p.variants || []).forEach(v => v?.color && set.add(v.color)); });
    return [...set];
  }, [scoped]);
  const sizeOpts = useMemo(() => {
    const set = new Set();
    scoped.forEach(p => (p.variants || []).forEach(v => v?.size && set.add(v.size)));
    return [...set];
  }, [scoped]);

  // Final filtered + sorted list.
  const result = useMemo(() => {
    let list = scoped;
    if (sub && sectionObj) { const ss = subsections.find(x => x.id === sub); if (ss) list = list.filter(p => matchesSub(p, ss)); }
    if (subsub) list = list.filter(p => p.subSubId === subsub);
    if (min) list = list.filter(p => Number(p.price) >= Number(min));
    if (max) list = list.filter(p => Number(p.price) <= Number(max));
    if (color) list = list.filter(p => (p.colors || []).some(c => c.name === color) || (p.variants || []).some(v => v.color === color));
    if (size) list = list.filter(p => (p.variants || []).some(v => v.size === size));
    if (instock) list = list.filter(p => !(p.variants?.length) || avail(p) > 0);
    list = [...list].sort((a, b) => {
      if (sort === 'price_asc') return Number(a.price) - Number(b.price);
      if (sort === 'price_desc') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, sub, subsub, min, max, color, size, instock, sort]);

  const subObj = subsections.find(x => x.id === sub) || null;
  const deeper = subObj?.subs || [];

  // Activate the cards' scroll-reveal (they ship with opacity:0 until observed).
  useScrollReveal([result.length, loading, section, sub]);

  const clearAll = () => { setSub(''); setSubsub(''); setMin(''); setMax(''); setColor(''); setSize(''); setInstock(false); setSort('date_desc'); };
  const activeCount = [sub, subsub, min, max, color, size, instock ? '1' : ''].filter(Boolean).length;

  const L = (ar, he, en) => (lang === 'he' ? he : lang === 'en' ? en : ar);

  // ---- Facet panel (shared by desktop sidebar + mobile sheet) ----
  const Facets = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div>
        <div className="shop-facet-h">{L('السعر', 'מחיר', 'Price')} (₪)</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder={L('من', 'מ-', 'Min')} style={facetInput} />
          <input type="number" value={max} onChange={e => setMax(e.target.value)} placeholder={L('إلى', 'עד', 'Max')} style={facetInput} />
        </div>
      </div>
      {colorOpts.length > 0 && (
        <div>
          <div className="shop-facet-h">{L('اللون', 'צבע', 'Color')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {colorOpts.map(c => (
              <button key={c} onClick={() => setColor(color === c ? '' : c)} className={`shop-pill${color === c ? ' on' : ''}`}>{c}</button>
            ))}
          </div>
        </div>
      )}
      {sizeOpts.length > 0 && (
        <div>
          <div className="shop-facet-h">{L('المقاس', 'מידה', 'Size')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sizeOpts.map(s => (
              <button key={s} onClick={() => setSize(size === s ? '' : s)} className={`shop-pill${size === s ? ' on' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
        <input type="checkbox" checked={instock} onChange={e => setInstock(e.target.checked)} />
        {L('المتوفر فقط', 'במלאי בלבד', 'In stock only')}
      </label>
      {activeCount > 0 && (
        <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.88rem', alignSelf: 'flex-start' }}>
          {L('مسح كل الفلاتر', 'נקה הכל', 'Clear all')}
        </button>
      )}
    </div>
  );

  return (
    <main style={{ paddingTop: 'clamp(120px, 16vw, 150px)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 4% 4rem' }}>
        <h1 className="section-title" style={{ marginBottom: '1.25rem' }}>{L('تسوّقي', 'חנות', 'Shop')}</h1>

        {/* Section chips */}
        <div className="shop-chiprow">
          <button onClick={() => { setSection(''); setSub(''); setSubsub(''); }} className={`cat-chip${!section ? ' active' : ''}`}>{L('الكل', 'הכל', 'All')}
            <span style={{ opacity: 0.55, marginInlineStart: '6px', fontSize: '0.78rem' }}>{products.length}</span>
          </button>
          {sections.map(s => (
            <button key={s.id} onClick={() => { setSection(s.id); setSub(''); setSubsub(''); }} className={`cat-chip${section === s.id ? ' active' : ''}`}>
              {sName(s)}
              <span style={{ opacity: 0.55, marginInlineStart: '6px', fontSize: '0.78rem' }}>{products.filter(p => p.sectionId === s.id).length}</span>
            </button>
          ))}
        </div>

        {/* Subsection chips for the chosen section */}
        {subsections.length > 0 && (
          <div className="shop-chiprow" style={{ marginTop: '0.5rem' }}>
            <button onClick={() => { setSub(''); setSubsub(''); }} className={`cat-chip${!sub ? ' active' : ''}`} style={{ fontSize: '0.82rem' }}>{L('الكل', 'הכל', 'All')}</button>
            {subsections.map(ss => {
              const n = scoped.filter(p => matchesSub(p, ss)).length;
              return (
                <button key={ss.id} onClick={() => { setSub(sub === ss.id ? '' : ss.id); setSubsub(''); }} className={`cat-chip${sub === ss.id ? ' active' : ''}`} style={{ fontSize: '0.82rem', opacity: n === 0 ? 0.45 : 1 }}>
                  {subName(ss)}<span style={{ opacity: 0.55, marginInlineStart: '6px', fontSize: '0.76rem' }}>{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Deeper category chips (third level) — when a sub-section with children is active */}
        {sub && deeper.length > 0 && (
          <div className="shop-chiprow" style={{ marginTop: '0.5rem' }}>
            <button onClick={() => setSubsub('')} className={`cat-chip${!subsub ? ' active' : ''}`} style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>{L('الكل', 'הכל', 'All')}</button>
            {deeper.map(ss => {
              const n = scoped.filter(p => p.subSubId === ss.id).length;
              return (
                <button key={ss.id} onClick={() => setSubsub(subsub === ss.id ? '' : ss.id)} className={`cat-chip${subsub === ss.id ? ' active' : ''}`} style={{ fontSize: '0.78rem', padding: '0.4rem 1rem', opacity: n === 0 ? 0.45 : 1 }}>
                  {subName(ss)}<span style={{ opacity: 0.55, marginInlineStart: '6px', fontSize: '0.72rem' }}>{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar: result count + sort + mobile filter button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '1.25rem 0', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.length} {L('منتج', 'מוצרים', 'products')}</span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="shop-filter-btn" onClick={() => setSheetOpen(true)}>
              <i className="fa-solid fa-sliders"></i> {L('تصفية', 'סינון', 'Filters')}{activeCount ? ` (${activeCount})` : ''}
            </button>
            <select value={sort} onChange={e => setSort(e.target.value)} style={facetInput}>
              <option value="date_desc">{L('الأحدث', 'החדש ביותר', 'Newest')}</option>
              <option value="price_asc">{L('السعر: تصاعدي', 'מחיר: עולה', 'Price: low→high')}</option>
              <option value="price_desc">{L('السعر: تنازلي', 'מחיר: יורד', 'Price: high→low')}</option>
            </select>
          </div>
        </div>

        {/* Active-filter chips */}
        {activeCount > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {sub && sectionObj && <Chip onX={() => { setSub(''); setSubsub(''); }}>{subName(subsections.find(x => x.id === sub) || {})}</Chip>}
            {subsub && <Chip onX={() => setSubsub('')}>{subName(deeper.find(x => x.id === subsub) || {})}</Chip>}
            {color && <Chip onX={() => setColor('')}>{color}</Chip>}
            {size && <Chip onX={() => setSize('')}>{L('مقاس', 'מידה', 'Size')} {size}</Chip>}
            {(min || max) && <Chip onX={() => { setMin(''); setMax(''); }}>₪{min || '0'}–{max || '∞'}</Chip>}
            {instock && <Chip onX={() => setInstock(false)}>{L('المتوفر فقط', 'במלאי', 'In stock')}</Chip>}
          </div>
        )}

        {/* Layout: desktop sidebar + grid */}
        <div className="shop-layout">
          <aside className="shop-sidebar"><Facets /></aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div className="product-grid">
                {[...Array(6)].map((_, i) => <div key={i} className="shop-skeleton" />)}
              </div>
            ) : result.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)', background: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>🔍</div>
                <p>{L('لا توجد منتجات مطابقة', 'לא נמצאו מוצרים', 'No matching products')}</p>
                {activeCount > 0 && <button onClick={clearAll} className="btn-primary" style={{ marginTop: '1rem', padding: '0.6rem 1.4rem', display: 'inline-block', width: 'auto' }}>{L('مسح الفلاتر', 'נקה סינון', 'Clear filters')}</button>}
              </div>
            ) : (
              <div className="product-grid shop-grid-fade" key={`${section}|${sub}|${color}|${size}|${sort}|${min}|${max}|${instock}`}>
                {result.map(p => <ProductCard key={p.id} product={p} rating={ratings[p.id]} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter bottom-sheet */}
      {sheetOpen && (
        <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '82vh', overflowY: 'auto', background: 'var(--bg-color)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '1.25rem 1.25rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1.1rem' }}>{L('تصفية', 'סינון', 'Filters')}</strong>
              <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <Facets />
            <button onClick={() => setSheetOpen(false)} className="btn-primary" style={{ marginTop: '1.5rem', padding: '0.9rem' }}>
              {L(`عرض ${result.length} منتج`, `הצג ${result.length} מוצרים`, `Show ${result.length} products`)}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const facetInput = { flex: 1, padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' };

function Chip({ children, onX }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.35rem 0.8rem', borderRadius: '999px', background: 'var(--accent-soft)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>
      {children}
      <button onClick={onX} aria-label="إزالة" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, lineHeight: 1 }}><i className="fa-solid fa-xmark"></i></button>
    </span>
  );
}
