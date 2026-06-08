"use client";
import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ShopBrowser from '@/components/ShopBrowser';
import { getProducts, getSections, getReviewStats } from '@/lib/db';

const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-');

function Inner() {
  const params = useParams();
  const segs = Array.isArray(params.slug) ? params.slug.map(decodeURIComponent) : [];
  const [data, setData] = useState({ products: [], sections: [], ratings: {}, loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [p, s, r] = await Promise.all([getProducts(), getSections(), getReviewStats()]);
        setData({ products: p || [], sections: s || [], ratings: r || {}, loading: false });
      } catch (e) { console.error('shop load', e); setData(d => ({ ...d, loading: false })); }
    })();
  }, []);

  // Resolve /shop/<section>/<subsection> path → ids.
  let initialSection = '', initialSub = '';
  if (data.sections.length && segs.length) {
    const sec = data.sections.find(x => norm(x.title_en) === norm(segs[0]) || norm(x.title_ar) === norm(segs[0]) || x.id === segs[0]);
    if (sec) {
      initialSection = sec.id;
      if (segs[1]) {
        const ss = (sec.subsections || []).find(y => norm(y.name_en) === norm(segs[1]) || norm(y.name_ar) === norm(segs[1]) || y.id === segs[1]);
        if (ss) initialSub = ss.id;
      }
    }
  }

  return (
    <ShopBrowser
      key={`${initialSection}|${initialSub}|${data.loading}`}
      products={data.products}
      sections={data.sections}
      ratings={data.ratings}
      loading={data.loading}
      initialSection={initialSection}
      initialSub={initialSub}
    />
  );
}

export default function ShopSlugPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
