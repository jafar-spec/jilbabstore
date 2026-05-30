"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/lib/db';

export default function SearchOverlay({ isOpen, onClose }) {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [products, setProducts] = useState([]);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
      if (products.length === 0) {
        getProducts().then(setProducts).catch(console.error);
      }
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setResults([]);
    }
  }, [isOpen, products.length]);

  useEffect(() => {
    if (query.trim().length > 1) {
      const lowerQuery = query.toLowerCase();
      const filtered = products.filter(p => 
        p.title?.toLowerCase().includes(lowerQuery) || 
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.category?.toLowerCase().includes(lowerQuery)
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', fontSize: '2rem', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: lang === 'en' ? '20px' : 'auto', right: lang === 'ar' ? '20px' : 'auto', fontSize: '1.5rem', color: 'var(--text-secondary)' }}></i>
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder') || "ابحث عن المنتجات..."}
            style={{
              width: '100%',
              padding: '1.5rem 3.5rem',
              fontSize: '1.5rem',
              border: 'none',
              borderBottom: '3px solid var(--accent-color)',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
          {results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => {
                    onClose();
                    router.push(`/product/${product.id}`);
                  }}
                  style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid var(--glass-border)' }}
                  className="search-result-card"
                >
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <Image src={product.image || (product.images && product.images[0]) || '/assets/logo.png'} alt={product.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{product.title}</h3>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>₪{product.price}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim().length > 1 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
              <h2>لا توجد نتائج مطابقة لبحثك</h2>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
