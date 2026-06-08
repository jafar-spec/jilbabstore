// Pick the right language variant of a field, following the same suffix
// convention used for hero titles (field_en / field_he), with an Arabic
// fallback. lang is 'ar' | 'en' | 'he'.
export const localized = (obj, field, lang) => {
  if (!obj) return '';
  if (lang && lang !== 'ar') {
    const v = obj[`${field}_${lang}`];
    if (v && String(v).trim()) return v;
  }
  return obj[field] || '';
};
