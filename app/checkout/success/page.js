"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [info, setInfo] = useState({ order: '', total: '', pay: '' });

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      setInfo({
        order: p.get('order') || p.get('txId') || '',
        total: p.get('total') || '',
        pay: p.get('pay') || '',
      });
    } catch (e) {}
  }, []);

  const isCash = info.pay === 'cash';
  const heading = isCash ? 'تم استلام طلبك بنجاح' : 'تم تأكيد طلبك بنجاح';
  const orderNum = info.order ? info.order.slice(0, 8).toUpperCase() : 'غير متوفر';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-color)' }}>
      <div style={{ background: 'var(--surface-color)', padding: '3rem 2.5rem', borderRadius: '24px', textAlign: 'center', maxWidth: '600px', width: '100%', border: '1px solid var(--glass-border)' }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: '4.5rem', color: '#16a34a', marginBottom: '1.5rem' }}></i>
        <h1 style={{ fontSize: '2.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>{heading}</h1>
        <p style={{ fontSize: '1.05rem', marginBottom: '2rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          شكراً لتسوقكِ من متجر جلباب 💜<br />
          {isCash ? 'سنتواصل معكِ لتأكيد التوصيل، والدفع نقداً عند الاستلام.' : 'لقد استلمنا طلبكِ وسنبدأ في تجهيزه.'}
        </p>

        <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>رقم الطلب</p>
          <strong style={{ fontSize: '1.6rem', letterSpacing: '1px', fontVariantNumeric: 'tabular-nums' }}>#{orderNum}</strong>
          {info.total && (
            <div style={{ marginTop: '0.75rem', color: 'var(--accent-color)', fontWeight: 700, fontSize: '1.15rem' }}>
              ₪{Number(info.total).toFixed(2)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {info.order && (
            <Link href={`/track?order=${info.order}`} className="btn-primary" style={{ padding: '0.85rem 1.6rem', borderRadius: '10px' }}>
              <i className="fa-solid fa-truck-fast" style={{ marginInlineEnd: '8px' }} /> تتبّع الطلب
            </Link>
          )}
          <Link href="/profile" style={{ padding: '0.85rem 1.6rem', borderRadius: '10px', border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
            طلباتي والفاتورة
          </Link>
          <Link href="/" style={{ padding: '0.85rem 1.6rem', borderRadius: '10px', border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
            متابعة التسوّق
          </Link>
        </div>
      </div>
    </div>
  );
}
