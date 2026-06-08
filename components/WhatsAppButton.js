"use client";
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

const HIDDEN = ['/admin', '/courier', '/checkout', '/invoice', '/packing'];

// Normalize a phone to wa.me digits (E.164 without '+'). Israeli 0-prefix → 972.
function toWa(num) {
  let d = String(num || '').replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '972' + d.slice(1);
  return d;
}

export default function WhatsAppButton() {
  const pathname = usePathname();
  const { lang, storeSettings } = useLanguage();
  if (HIDDEN.some(p => pathname?.startsWith(p))) return null;

  // Same source as the footer's WhatsApp icon.
  const raw = (storeSettings?.socials?.whatsapp || storeSettings?.whatsapp || storeSettings?.alertPhone || storeSettings?.contactPhone || '').trim();
  if (!raw) return null;

  const msg = lang === 'he' ? 'שלום, יש לי שאלה לגבי המוצרים' : lang === 'en' ? 'Hello, I have a question about your products' : 'مرحباً، لدي استفسار عن المنتجات';

  // If the admin entered a full link (wa.me / api.whatsapp / http…), use it
  // verbatim (exactly like the footer). Otherwise build a wa.me link from digits.
  let href;
  if (/^https?:\/\//i.test(raw)) {
    href = raw;
  } else {
    const num = toWa(raw);
    if (!num) return null;
    href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      aria-label="WhatsApp"
      style={{
        position: 'fixed', bottom: '6.2rem', insetInlineEnd: '1.6rem', zIndex: 1090,
        width: '52px', height: '52px', borderRadius: '50%',
        background: '#25D366', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.6rem', boxShadow: '0 6px 20px rgba(37,211,102,0.45)',
        textDecoration: 'none', transition: 'transform 0.25s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <i className="fa-brands fa-whatsapp"></i>
    </a>
  );
}
