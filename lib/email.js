import { Resend } from 'resend';

// Server-only email helper. No-op if RESEND_API_KEY isn't configured so it
// never breaks a build or a request.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build_purposes');

// Resend's always-available sender — used as a fallback if a custom EMAIL_FROM
// domain isn't verified yet, so confirmations never silently disappear.
const SAFE_FROM = 'Jilbab Store <onboarding@resend.dev>';

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return { skipped: true };
  const recipients = Array.isArray(to) ? to : [to];
  const preferredFrom = process.env.EMAIL_FROM || SAFE_FROM;

  const trySend = async (from) => resend.emails.send({ from, to: recipients, subject, html });

  try {
    const res = await trySend(preferredFrom);
    // Resend returns { error } in the body (not a throw) when the domain isn't
    // verified — fall back to the always-valid sender in that case.
    if (res?.error && preferredFrom !== SAFE_FROM) {
      console.warn('Custom sender rejected, retrying with default:', res.error?.message || res.error);
      const fb = await trySend(SAFE_FROM);
      return fb?.error ? { error: fb.error } : { data: fb.data, usedFallback: true };
    }
    return res?.error ? { error: res.error } : { data: res.data };
  } catch (e) {
    // Hard error (e.g. unverified domain throws) — retry once with the default.
    if (preferredFrom !== SAFE_FROM) {
      try {
        const fb = await trySend(SAFE_FROM);
        return fb?.error ? { error: fb.error } : { data: fb.data, usedFallback: true };
      } catch (e2) {
        console.error('Email send failed (with fallback):', e2);
        return { error: e2.message };
      }
    }
    console.error('Email send failed:', e);
    return { error: e.message };
  }
}

// Shared brand wrapper for transactional emails.
export const emailLayout = (inner) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
    <div style="text-align:center;font-size:1.4rem;font-weight:800;letter-spacing:.1em;color:#7c3aed;margin-bottom:16px;">JILBABSTORE</div>
    ${inner}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="font-size:12px;color:#9ca3af;text-align:center;">© Jilbab Store</p>
  </div>`;

export const orderConfirmationHtml = (order, orderId) => {
  const rows = (order.items || []).map(it => `
    <tr>
      <td style="padding:6px 0;">${it.title} ${it.selectedSize && it.selectedSize !== 'عام' ? `(${it.selectedSize})` : ''} × ${it.quantity}</td>
      <td style="padding:6px 0;text-align:right;">₪${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
    </tr>`).join('');
  const num = String(orderId).slice(0, 8).toUpperCase();
  return emailLayout(`
    <h2 style="color:#111827;">شكراً لطلبك! / Thank you for your order</h2>
    <p>تم استلام طلبك رقم <strong>#${num}</strong> بنجاح. سنبدأ في تجهيزه.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${rows}</table>
    <table style="width:100%;font-size:14px;">
      <tr><td>المجموع الفرعي</td><td style="text-align:right;">₪${Number(order.subtotal || 0).toFixed(2)}</td></tr>
      ${order.discount > 0 ? `<tr><td>الخصم</td><td style="text-align:right;color:#16a34a;">-₪${Number(order.discount).toFixed(2)}</td></tr>` : ''}
      <tr><td>الشحن</td><td style="text-align:right;">${order.shipping > 0 ? `₪${Number(order.shipping).toFixed(2)}` : 'مجاني'}</td></tr>
      <tr><td style="font-weight:800;padding-top:8px;">الإجمالي</td><td style="text-align:right;font-weight:800;padding-top:8px;">₪${Number(order.total || 0).toFixed(2)}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280;">طريقة الدفع: ${order.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : 'PayPal'}</p>`);
};

export const lowStockAlertHtml = (hits) => emailLayout(`
  <h2 style="color:#b45309;">⚠️ تنبيه: مخزون منخفض</h2>
  <p>العناصر التالية وصلت إلى حد التنبيه أو أقل:</p>
  <ul>${hits.map(h => `<li><strong>${h.title}</strong> — ${h.size} — المتاح: ${h.available}</li>`).join('')}</ul>`);

// Back-in-stock notification to a shopper who asked to be told.
export const backInStockHtml = ({ productTitle, size, color, url }) => emailLayout(`
  <h2 style="color:#111827;">عاد المنتج للتوفّر! / Back in stock</h2>
  <p>المنتج الذي كنتِ تنتظرينه أصبح متوفراً الآن:</p>
  <p style="font-size:16px;font-weight:700;margin:12px 0;">${productTitle || ''}${size ? ` — ${size}` : ''}${color ? ` — ${color}` : ''}</p>
  <p style="font-size:13px;color:#6b7280;">سارعي قبل نفاد الكمية مجدداً.</p>
  ${url ? `<p style="text-align:center;margin-top:18px;"><a href="${url}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">عرض المنتج</a></p>` : ''}`);

// Abandoned-cart reminder.
export const abandonedCartHtml = ({ name, items, total, url }) => {
  const rows = (items || []).map(it => `
    <tr><td style="padding:6px 0;">${it.title} × ${it.quantity}</td>
    <td style="padding:6px 0;text-align:right;">₪${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td></tr>`).join('');
  return emailLayout(`
    <h2 style="color:#111827;">نسيتِ شيئاً في سلتك 🛍️</h2>
    <p>${name ? `مرحباً ${name}، ` : ''}ما زالت منتجاتك بانتظارك. أكملي طلبك قبل نفادها:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${rows}</table>
    <p style="font-weight:800;">الإجمالي التقريبي: ₪${Number(total || 0).toFixed(2)}</p>
    ${url ? `<p style="text-align:center;margin-top:18px;"><a href="${url}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;display:inline-block;">أكملي طلبك</a></p>` : ''}`);
};

// Sent to the store owner when a new order comes in, so orders are never missed.
export const newOrderAdminHtml = (order, orderId) => {
  const c = order.customerInfo || {};
  const rows = (order.items || []).map(it => `
    <tr>
      <td style="padding:6px 0;">${it.title}${it.selectedColor ? ` — ${it.selectedColor}` : ''}${it.selectedSize && it.selectedSize !== 'عام' ? ` (${it.selectedSize})` : ''} × ${it.quantity}</td>
      <td style="padding:6px 0;text-align:right;">₪${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
    </tr>`).join('');
  const num = String(orderId).slice(0, 8).toUpperCase();
  const pay = order.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : order.paymentMethod === 'card' ? 'بطاقة (مدفوع)' : 'PayPal';
  return emailLayout(`
    <h2 style="color:#111827;">🛒 طلب جديد #${num}</h2>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;">${rows}</table>
    <p style="font-weight:800;">الإجمالي: ₪${Number(order.total || 0).toFixed(2)} — ${pay}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0;" />
    <p style="font-size:14px;line-height:1.8;margin:0;">
      <strong>العميل:</strong> ${c.fullName || '—'}<br/>
      <strong>الهاتف:</strong> ${c.phone || c.phone1 || '—'}<br/>
      <strong>المدينة:</strong> ${c.city || '—'}<br/>
      <strong>العنوان:</strong> ${c.address || c.street || '—'}<br/>
      <strong>البريد:</strong> ${c.email || '—'}
    </p>`);
};
