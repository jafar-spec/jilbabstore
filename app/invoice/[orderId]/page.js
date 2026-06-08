"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { auth, staffAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Renders the tax document for an order. Resolves whichever session is active
// (staff → מקור, customer → העתק) and asks the server for the rendered HTML.
export default function InvoicePage() {
  const { orderId } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let done = false;

    const fetchInvoice = async (user) => {
      if (done || !user) return;
      done = true;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error === 'Forbidden' ? 'אין לך הרשאה לצפות במסמך זה.'
            : err.error === 'NotIssued' ? 'החשבונית תופק לאחר אישור התשלום או מסירת ההזמנה.'
            : 'לא ניתן להפיק את המסמך.';
          setMessage(msg);
          setStatus('error');
          return;
        }
        const html = await res.text();
        // Replace the document with the standalone, printable invoice.
        document.open();
        document.write(html);
        document.close();
      } catch {
        setMessage('אירעה שגיאה בעת הפקת המסמך.');
        setStatus('error');
      }
    };

    // Prefer the staff session (Original); fall back to the customer session (Copy).
    const unsubStaff = onAuthStateChanged(staffAuth, (u) => { if (u) fetchInvoice(u); });
    const unsubCust = onAuthStateChanged(auth, (u) => { if (u) fetchInvoice(u); });

    // If neither session resolves a user shortly, prompt to sign in.
    const t = setTimeout(() => {
      if (!done) { setMessage('יש להתחבר לחשבון כדי לצפות בחשבונית.'); setStatus('error'); }
    }, 4000);

    return () => { unsubStaff(); unsubCust(); clearTimeout(t); };
  }, [orderId]);

  if (status === 'error') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', direction: 'rtl' }}>
        <i className="fa-solid fa-file-invoice" style={{ fontSize: '2.5rem', color: 'var(--text-secondary)' }} />
        <p style={{ fontSize: '1.05rem' }}>{message}</p>
        <a href="/profile" className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', textDecoration: 'none' }}>איזור אישי</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <p style={{ color: 'var(--text-secondary)' }}><i className="fa-solid fa-spinner fa-spin" /> מפיק מסמך…</p>
    </div>
  );
}
