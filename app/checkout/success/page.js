"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [txId, setTxId] = useState('غير متوفر');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('txId');
      if (id) setTxId(id);
    } catch (e) {}
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#FFFFFF' }}>
      <div style={{ background: '#F5F5F7', padding: '4rem', borderRadius: '24px', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: '5rem', color: '#1D1D1F', marginBottom: '2rem' }}></i>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700', letterSpacing: '-0.02em' }}>تم الدفع بنجاح</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#86868B' }}>
          شكراً لتسوقك من متجر جلباب. لقد استلمنا طلبك والدفع بنجاح.
        </p>
        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', marginBottom: '3rem', border: '1px solid #D2D2D7' }}>
          <p style={{ fontSize: '0.9rem', color: '#86868B', marginBottom: '0.5rem' }}>رقم الطلب / المرجع</p>
          <strong style={{ fontSize: '1.8rem', letterSpacing: '1px', color: '#1D1D1F', fontVariantNumeric: 'tabular-nums' }}>{txId}</strong>
        </div>
        <Link href="/" className="btn-primary" style={{ display: 'inline-block', background: '#1D1D1F' }}>
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
