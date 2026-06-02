"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { getProducts, matchesProduct } from '@/lib/db';

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
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    // Debounce so we filter ~250ms after the user stops typing.
    const handle = setTimeout(() => {
      const filtered = products.filter(p => matchesProduct(p, q)).slice(0, 24);
      setResults(filtered);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, products]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      pointerEvents: isOpen ? 'auto' : 'none',
      visibility: isOpen ? 'visible' : 'hidden',
      transition: 'visibility 0.4s'
    }}>
      {/* Backdrop */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        onClick={onClose}
      />

      {/* Ribbon Container */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        maxHeight: '80vh',
        backgroundColor: 'var(--bg-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 2rem 3rem 2rem',
        boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                router.push(`/search?q=${encodeURIComponent(query)}`);
                onClose();
              }
            }}
            style={{ position: 'relative', marginBottom: '2rem', flexShrink: 0 }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: lang === 'en' ? '20px' : 'auto', right: lang === 'ar' ? '20px' : 'auto', fontSize: '1.5rem', color: 'var(--accent-color)' }}></i>
            <input 
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder') || "ابحث عن المنتجات..."}
              style={{
                width: '100%',
                padding: '1.2rem 3.5rem',
                fontSize: '1.2rem',
                border: '2px solid var(--glass-border)',
                borderRadius: '50px',
                background: 'var(--surface-color)',
                outline: 'none',
                color: 'var(--text-primary)',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </form>

          <div style={{ overflowY: 'auto', paddingRight: '1rem', paddingBottom: '1rem' }}>
            {results.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {results.map((product) => (
                  <div 
                    key={product.id} 
                    onClick={() => {
                      onClose();
                      router.push(`/product/${product.id}`);
                    }}
                    style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '16px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--glass-border)' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={product.image || (product.images && product.images[0]) || '/assets/logo.png'} alt={product.title} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{product.title}</h3>
                      <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>₪{product.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim().length > 1 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
                <i className="fa-solid fa-box-open" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                <h3 style={{ margin: 0 }}>لا توجد نتائج مطابقة لبحثك</h3>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
