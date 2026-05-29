"use client";
import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#FFFFFF' }}>
      <div style={{ background: '#FFF5F5', padding: '4rem', borderRadius: '24px', textAlign: 'center', maxWidth: '600px', width: '100%', border: '1px solid #FFCCCC' }}>
        <i className="fa-solid fa-circle-xmark" style={{ fontSize: '5rem', color: '#FF3B30', marginBottom: '2rem' }}></i>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700', letterSpacing: '-0.02em', color: '#1D1D1F' }}>فشلت عملية الدفع</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '3rem', color: '#86868B' }}>
          عذراً، لم نتمكن من معالجة عملية الدفع الخاصة بك. يرجى التأكد من صحة البيانات أو تجربة بطاقة أخرى.
        </p>
        <Link href="/checkout" className="btn-primary" style={{ display: 'inline-block', background: '#1D1D1F' }}>
          العودة للمحاولة مجدداً
        </Link>
      </div>
    </div>
  );
}
