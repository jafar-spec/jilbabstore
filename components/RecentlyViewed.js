"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProductById } from '@/lib/db';
import { useLanguage } from '@/context/LanguageContext';

const STORAGE_KEY = 'recently_viewed';

// Append a product id to the recently-viewed list (most-recent first, max 8).
export function recordRecentlyViewed(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(x => x !== id);
    list.unshift(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 8)));
  } catch { /* ignore */ }
}

export default function RecentlyViewed({ excludeId, ratings = {} }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { ids = []; }
    ids = ids.filter(id => id !== excludeId).slice(0, 6);
    if (ids.length === 0) return;
    Promise.all(ids.map(id => getProductById(id).catch(() => null)))
      .then(list => setItems(list.filter(Boolean)));
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="products" style={{ paddingTop: '2rem' }}>
      <h2 className="section-title"><span>{t('recentlyViewed') || 'شاهدتِ مؤخراً'}</span></h2>
      <div className="product-grid">
        {items.map(product => (
          <div className="product-card" key={product.id}>
            <div className="product-image-container" style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4' }}>
              <Link href={`/product/${product.id}`} className="product-image" style={{ width: '100%', height: '100%', position: 'relative', display: 'block' }}>
                <Image
                  src={(product.images && product.images[0]) || product.image || '/assets/black_jilbab_1779926556174.png'}
                  alt={product.title}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </Link>
            </div>
            <div className="product-info">
              <Link href={`/product/${product.id}`}><h3 className="product-title">{product.title}</h3></Link>
              {ratings[product.id]?.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0 4px', fontSize: '0.8rem' }}>
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fa-solid fa-star" style={{ color: i < Math.round(ratings[product.id].avg) ? '#f1c40f' : '#e0e0e0', fontSize: '0.75rem' }}></i>
                  ))}
                  <span style={{ color: 'var(--text-secondary)' }}>({ratings[product.id].count})</span>
                </div>
              )}
              <p className="product-price">{product.price} {t('price')}</p>
              <Link href={`/product/${product.id}`} className="add-to-cart" style={{ display: 'block', textAlign: 'center' }}>
                {t('viewDetails') || 'عرض'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
