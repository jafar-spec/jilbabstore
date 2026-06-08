"use client";
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// Sticky quick-jump bar for the top-level sections (نسائي / رجالي / أطفال …).
// Sticks just under the fixed header, scroll-spies the section in view, and
// scrolls smoothly on tap. Horizontally scrollable on mobile.
export default function CategoryBar({ sections }) {
  const { lang } = useLanguage();
  const [active, setActive] = useState(null);
  const [topOffset, setTopOffset] = useState(104);

  // Measure the fixed header so the bar sticks right beneath it.
  useEffect(() => {
    const measure = () => setTopOffset(document.querySelector('header')?.offsetHeight || 104);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Scroll-spy: the last section whose top has crossed beneath the bar is active.
  useEffect(() => {
    if (!sections?.length) return;
    const onScroll = () => {
      const line = topOffset + 64;
      let current = sections[0]?.id || null;
      for (const s of sections) {
        const el = document.getElementById(`section-${s.id}`);
        if (el && el.getBoundingClientRect().top - line <= 8) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections, topOffset]);

  const go = (id) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (topOffset + 56);
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const title = (s) => (lang === 'en' ? (s.title_en || s.title_ar) : lang === 'he' ? (s.title_he || s.title_en || s.title_ar) : s.title_ar) || s.title_ar || '';

  if (!sections || sections.length === 0) return null;

  return (
    <nav className="category-bar" style={{ top: topOffset }} aria-label="التصنيفات">
      <div className="category-bar-inner">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={`cat-chip${active === s.id ? ' active' : ''}`}
            aria-current={active === s.id ? 'true' : undefined}
          >
            {title(s)}
          </button>
        ))}
      </div>
    </nav>
  );
}
