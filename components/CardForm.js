"use client";
import { useState } from 'react';

/*
 * Credit-card form — UI + client-side validation only.
 *
 * PCI NOTE: the raw card number stays inside this component and is NEVER sent to
 * our server or stored. When you wire a real gateway, replace these inputs with
 * the provider's hosted/tokenized fields (Stripe Elements, CreditGuard hosted
 * page, etc.) and pass the resulting *token* up via onChange — not the PAN.
 *
 * onChange({ valid, brand, last4 }) — only non-sensitive metadata bubbles up.
 */

const luhnValid = (num) => {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 12) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
};

const detectBrand = (num) => {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return '';
};

const expiryValid = (exp) => {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const end = new Date(year, month, 0, 23, 59, 59); // last day of that month
  return end >= now;
};

const inputStyle = {
  width: '100%', padding: '12px 15px', borderRadius: '8px',
  border: '1px solid var(--border-color)', background: 'var(--surface-color)',
  fontFamily: 'inherit', fontSize: '1rem', letterSpacing: '0.04em'
};

export default function CardForm({ onChange }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const brand = detectBrand(number);

  const emit = (next) => {
    const n = next.number ?? number;
    const e = next.expiry ?? expiry;
    const c = next.cvv ?? cvv;
    const nm = next.name ?? name;
    const valid = !!nm.trim() && luhnValid(n) && expiryValid(e) && /^\d{3,4}$/.test(c.trim());
    onChange?.({ valid, brand: detectBrand(n), last4: n.replace(/\D/g, '').slice(-4) });
  };

  const onNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 19);
    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
    setNumber(grouped); emit({ number: grouped });
  };
  const onExpiry = (v) => {
    let d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    setExpiry(d); emit({ expiry: d });
  };

  return (
    <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <i className="fa-solid fa-lock" style={{ color: '#28a745' }}></i> دفع آمن ومشفّر — بياناتك محمية ولا تُخزَّن على خوادمنا.
      </p>
      <label className="sr-only" htmlFor="cc-name">اسم حامل البطاقة</label>
      <input id="cc-name" type="text" autoComplete="cc-name" placeholder="الاسم على البطاقة" value={name}
        onChange={e => { setName(e.target.value); emit({ name: e.target.value }); }} style={{ ...inputStyle, marginBottom: '0.75rem' }} />

      <label className="sr-only" htmlFor="cc-number">رقم البطاقة</label>
      <div style={{ position: 'relative' }}>
        <input id="cc-number" type="text" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
          value={number} onChange={e => onNumber(e.target.value)} style={inputStyle} />
        {brand && <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{brand}</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label className="sr-only" htmlFor="cc-exp">تاريخ الانتهاء</label>
          <input id="cc-exp" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={expiry} onChange={e => onExpiry(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="sr-only" htmlFor="cc-cvv">رمز التحقق CVV</label>
          <input id="cc-cvv" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" value={cvv}
            onChange={e => { const c = e.target.value.replace(/\D/g, '').slice(0, 4); setCvv(c); emit({ cvv: c }); }} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
