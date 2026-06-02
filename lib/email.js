import { Resend } from 'resend';

// Server-only email helper. No-op if RESEND_API_KEY isn't configured so it
// never breaks a build or a request.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build_purposes');

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return { skipped: true };
  try {
    const data = await resend.emails.send({
      from: 'Jilbab Store <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    return { data };
  } catch (e) {
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
