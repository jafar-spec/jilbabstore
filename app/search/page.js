"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductGrid from '@/components/ProductGrid';
import CartSidebar from '@/components/CartSidebar';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/db').then(({ getProducts }) => {
      getProducts().then((data) => {
        setProducts(data);
        setLoading(false);
      }).catch((err) => {
        console.error("Failed to load products for search", err);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (query) {
      const lowerQuery = query.toLowerCase();
      setFiltered(products.filter(p => 
        p.title?.toLowerCase().includes(lowerQuery) || 
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.category?.toLowerCase().includes(lowerQuery)
      ));
    } else {
      setFiltered(products);
    }
  }, [query, products, loading]);

  return (
    <main>
      
      <div style={{ paddingTop: '100px', minHeight: '60vh' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>جاري البحث...</p>
          </div>
        ) : (
          <ProductGrid 
            title={`نتائج البحث عن: "${query}"`} 
            products={filtered} 
            emptyMessage="عذراً، لم نتمكن من العثور على منتجات مطابقة لبحثك." 
          />
        )}
      </div>
      
      
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{textAlign: 'center', padding: '100px'}}>جاري التحميل...</div>}>
      <SearchContent />
    </Suspense>
  );
}
