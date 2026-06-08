// Israeli tax-document builder (חשבונית מס/קבלה or קבלה for עוסק פטור).
//
// Consumer prices on the site INCLUDE VAT (per חוק הגנת הצרכן), so for an
// עוסק מורשה we back the VAT out of the gross total:
//     net = total / (1 + rate) ; vat = total − net
// For an עוסק פטור no VAT is charged and the document is a קבלה.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const ils = (n) => `₪${(Number(n) || 0).toFixed(2)}`;

export function computeInvoice(order, settings = {}) {
  const isPatur = settings.businessType === 'osek_patur';
  const vatRate = isPatur ? 0 : Number(settings.vatRate ?? 18);
  const rate = vatRate / 100;
  const totalIncl = Number(order.total) || 0;
  const net = isPatur ? totalIncl : totalIncl / (1 + rate);
  const vat = totalIncl - net;
  return { isPatur, vatRate, totalIncl, net, vat };
}

export function invoiceDisplayNumber(order, settings = {}) {
  if (!order.invoiceNumber) return '—';
  const prefix = settings.invoicePrefix || '';
  return `${prefix}${String(order.invoiceNumber).padStart(5, '0')}`;
}

// copy: 'original' (מקור — seller's record) | 'copy' (העתק — customer)
export function invoiceHtml(order, settings = {}, { copy = 'copy' } = {}) {
  const { isPatur, vatRate, totalIncl, net, vat } = computeInvoice(order, settings);
  const docTitle = isPatur ? 'קבלה' : 'חשבונית מס/קבלה';
  const copyLabel = copy === 'original' ? 'מקור' : 'העתק';
  const num = invoiceDisplayNumber(order, settings);
  const issued = order.invoiceIssuedAt || order.date || order.createdAt;
  const issuedStr = issued ? new Date(issued).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

  const c = order.customerInfo || order.shipping || {};
  const buyerName = c.fullName || '—';
  const buyerAddr = [c.city, c.neighborhood, c.street, c.address].filter(Boolean).join(', ');
  const buyerPhone = c.phone || c.phone1 || '';
  const buyerBiz = c.invoiceBusinessName || '';
  const buyerBizId = c.invoiceTaxId || '';

  const payMap = { cash: 'מזומן (בעת מסירה)', card: 'כרטיס אשראי', paypal: 'PayPal' };
  const payMethod = payMap[order.paymentMethod] || order.paymentMethod || '';
  const paidLabel = order.paymentStatus === 'paid' ? 'שולם' : (order.paymentMethod === 'cash' ? 'לתשלום במזומן בעת מסירה' : 'ממתין לתשלום');

  const lines = [];
  (order.items || []).forEach((it) => {
    const qty = Number(it.quantity) || 1;
    const unit = Number(it.price) || 0;
    const desc = `${it.title || ''}${it.selectedColor ? ` — ${it.selectedColor}` : ''}${it.selectedSize && it.selectedSize !== 'عام' ? ` (${it.selectedSize})` : ''}`;
    lines.push(`<tr><td>${esc(desc)}</td><td style="text-align:center;">${qty}</td><td style="text-align:left;">${ils(unit)}</td><td style="text-align:left;">${ils(unit * qty)}</td></tr>`);
  });
  if (Number(order.discount) > 0) lines.push(`<tr><td>הנחה${order.promoCode ? ` (${esc(order.promoCode)})` : ''}</td><td></td><td></td><td style="text-align:left;color:#16a34a;">-${ils(order.discount)}</td></tr>`);
  if (Number(order.shipping) > 0) lines.push(`<tr><td>דמי משלוח</td><td style="text-align:center;">1</td><td style="text-align:left;">${ils(order.shipping)}</td><td style="text-align:left;">${ils(order.shipping)}</td></tr>`);

  const summary = isPatur
    ? `<tr><td class="lbl">סה"כ לתשלום</td><td class="amt total">${ils(totalIncl)}</td></tr>
       <tr><td colspan="2" class="note">עוסק פטור — לא נגבה מע"מ.</td></tr>`
    : `<tr><td class="lbl">סה"כ לפני מע"מ</td><td class="amt">${ils(net)}</td></tr>
       <tr><td class="lbl">מע"מ ${vatRate}%</td><td class="amt">${ils(vat)}</td></tr>
       <tr><td class="lbl total">סה"כ לתשלום (כולל מע"מ)</td><td class="amt total">${ils(totalIncl)}</td></tr>`;

  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${docTitle} ${esc(num)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,'Segoe UI',sans-serif;color:#1f2937;max-width:820px;margin:0 auto;padding:28px;line-height:1.6;background:#fff}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:18px}
    .doc{font-size:1.6rem;font-weight:800}
    .copy{display:inline-block;border:1.5px solid #111;border-radius:6px;padding:2px 12px;font-weight:700;margin-top:6px}
    .seller{font-size:.95rem}
    .seller b{font-size:1.1rem}
    .meta{margin:14px 0;display:flex;gap:30px;flex-wrap:wrap;font-size:.92rem}
    .box{background:#f8f8f8;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:.92rem}
    table.items{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:.92rem}
    table.items th,table.items td{border-bottom:1px solid #e5e7eb;padding:8px 6px;text-align:right}
    table.items th{background:#f3f4f6}
    table.sum{width:280px;margin-inline-start:auto;border-collapse:collapse;font-size:.95rem}
    table.sum td{padding:6px 8px}
    table.sum .amt{text-align:left;font-variant-numeric:tabular-nums}
    table.sum .total{font-weight:800;font-size:1.05rem;border-top:2px solid #111}
    .note{color:#6b7280;font-size:.82rem}
    .ftr{margin-top:26px;border-top:1px solid #e5e7eb;padding-top:12px;color:#6b7280;font-size:.8rem;text-align:center}
    .print{margin:18px 0;text-align:center}
    .print button{background:#111;color:#fff;border:none;border-radius:8px;padding:10px 26px;font-size:1rem;cursor:pointer}
    @media print{.print{display:none}body{padding:0}}
  </style></head><body>
    <div class="hd">
      <div class="seller">
        <b>${esc(settings.legalBusinessName || settings.storeName || 'JILBABSTORE')}</b><br/>
        ${settings.businessAddress ? esc(settings.businessAddress) + '<br/>' : ''}
        ${isPatur ? 'עוסק פטור' : 'עוסק מורשה'}${settings.businessTaxId ? ` מס׳ ${esc(settings.businessTaxId)}` : ''}
      </div>
      <div style="text-align:left;">
        <div class="doc">${docTitle}</div>
        <div class="copy">${copyLabel}</div>
      </div>
    </div>

    <div class="meta">
      <div><b>מספר מסמך:</b> ${esc(num)}</div>
      <div><b>תאריך:</b> ${esc(issuedStr)}</div>
      <div><b>מס׳ הזמנה:</b> ${esc(String(order.id || '').slice(0, 8).toUpperCase())}</div>
    </div>

    <div class="box">
      <b>לכבוד:</b> ${esc(buyerName)}${buyerBiz ? ` — ${esc(buyerBiz)}` : ''}${buyerBizId ? ` (ע.מ/ח.פ ${esc(buyerBizId)})` : ''}<br/>
      ${buyerAddr ? esc(buyerAddr) + '<br/>' : ''}
      ${buyerPhone ? 'טל׳: ' + esc(buyerPhone) : ''}
    </div>

    <table class="items">
      <thead><tr><th>תיאור</th><th style="text-align:center;">כמות</th><th style="text-align:left;">מחיר יח׳</th><th style="text-align:left;">סה"כ</th></tr></thead>
      <tbody>${lines.join('')}</tbody>
    </table>

    <table class="sum">${summary}</table>

    <div class="box" style="margin-top:16px;">
      <b>אמצעי תשלום:</b> ${esc(payMethod)} — ${esc(paidLabel)}
    </div>

    <div class="print"><button onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF</button></div>
    <div class="ftr">מסמך זה הופק ממערכת ${esc(settings.storeName || 'JILBABSTORE')}. ${isPatur ? '' : 'המחירים כוללים מע"מ כחוק.'}</div>
  </body></html>`;
}
