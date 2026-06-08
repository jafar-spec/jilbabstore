"use client";
import { useEffect, useState } from 'react';
import { getPage } from '@/lib/db';
import { PAGE_DEFAULTS, resolvePage } from '@/lib/pageContent';
import { useLanguage } from '@/context/LanguageContext';
import InfoPage, { Section } from '@/components/InfoPage';

// Renders an editable page from Firestore, falling back to the built-in
// defaults until an admin saves content. Language-aware: shows the Hebrew
// variant when the visitor's language is Hebrew, otherwise the Arabic base.
export default function InfoPageContent({ slug }) {
  const { lang } = useLanguage();
  const [data, setData] = useState(PAGE_DEFAULTS[slug] || { title: '', blocks: [] });

  useEffect(() => {
    let active = true;
    getPage(slug)
      .then((stored) => {
        if (!active) return;
        // Shallow-merge over defaults so a saved doc that lacks the Hebrew
        // variant still inherits the built-in Hebrew default.
        if (stored) setData({ ...(PAGE_DEFAULTS[slug] || {}), ...stored });
      })
      .catch(() => { /* keep defaults */ });
    return () => { active = false; };
  }, [slug]);

  const { title, blocks } = resolvePage(data, lang);

  return (
    <InfoPage title={title}>
      {(Array.isArray(blocks) ? blocks : []).map((b, i) => (
        <Section key={i} heading={b.heading}>
          {String(b.body || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map((p, j) => <p key={j} style={{ marginBottom: '0.5rem' }}>{p}</p>)}
        </Section>
      ))}
    </InfoPage>
  );
}
