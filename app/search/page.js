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

  useEffect(() => {
    try {
      const localProducts = JSON.parse(localStorage.getItem('store_products') || '[]');
      setProducts(localProducts);
    } catch (error) {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
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
  }, [query, products]);

  return (
    <main>
      
      <div style={{ paddingTop: '100px', minHeight: '60vh' }}>
        <ProductGrid 
          title={`نتائج البحث عن: "${query}"`} 
          products={filtered} 
          emptyMessage="عذراً، لم نتمكن من العثور على منتجات مطابقة لبحثك." 
        />
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
