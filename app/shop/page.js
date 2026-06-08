"use client";
import { Suspense, useEffect, useState } from 'react';
import ShopBrowser from '@/components/ShopBrowser';
import { getProducts, getSections, getReviewStats } from '@/lib/db';

function ShopInner() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, s, r] = await Promise.all([getProducts(), getSections(), getReviewStats()]);
        setProducts(p || []); setSections(s || []); setRatings(r || {});
      } catch (e) { console.error('shop load', e); }
      finally { setLoading(false); }
    })();
  }, []);

  return <ShopBrowser products={products} sections={sections} ratings={ratings} loading={loading} />;
}

export default function ShopPage() {
  return <Suspense fallback={null}><ShopInner /></Suspense>;
}
