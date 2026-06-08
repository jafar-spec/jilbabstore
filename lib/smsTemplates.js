// Editable SMS notification templates. Stored in store_settings.smsTemplates;
// these are the fallback defaults. Placeholders in {braces} are substituted at
// send time.
export const SMS_TEMPLATE_DEFS = [
  { key: 'orderCustomer', label: 'تأكيد الطلب (يُرسل للعميل)', placeholders: '{orderNum} {total} {store}',
    def: 'تم استلام طلبك #{orderNum} بقيمة ₪{total} من {store}. سنتواصل معك لتأكيد التوصيل.' },
  { key: 'orderOwner', label: 'طلب جديد (يُرسل لك)', placeholders: '{orderNum} {total} {name} {phone} {city}',
    def: '🛒 طلب جديد #{orderNum} — ₪{total} | {name} | {phone} | {city}' },
  { key: 'shipped', label: 'تم التجهيز/الشحن (يُرسل للعميل)', placeholders: '{orderNum} {store}',
    def: 'تم تجهيز طلبك #{orderNum} وهو جاهز للشحن. سنخطرك عند خروجه للتوصيل. {store}' },
  { key: 'outForDelivery', label: 'جاري التوصيل (يُرسل للعميل)', placeholders: '{orderNum} {store}',
    def: 'طلبك #{orderNum} في الطريق إليك الآن! {store}' },
  { key: 'delivered', label: 'تم التوصيل (يُرسل للعميل)', placeholders: '{orderNum} {store}',
    def: 'تم توصيل طلبك #{orderNum} بنجاح. شكراً لتسوقك من {store}!' },
];

export const DEFAULT_SMS_TEMPLATES = Object.fromEntries(SMS_TEMPLATE_DEFS.map(t => [t.key, t.def]));

// Merge saved overrides over the defaults.
export const resolveSmsTemplates = (saved) => ({ ...DEFAULT_SMS_TEMPLATES, ...(saved || {}) });

// Replace {key} tokens with values (missing → empty string).
export const fillTemplate = (tpl, vars = {}) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
