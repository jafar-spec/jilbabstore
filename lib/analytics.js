// Fire a GA4 event if analytics is loaded (it only loads after cookie consent,
// so this is a safe no-op otherwise).
export const track = (name, params = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
};

export const productItem = (p, qty = 1) => ({
  item_id: p.sku || p.id,
  item_name: p.title,
  price: Number(p.price) || 0,
  quantity: qty,
});
