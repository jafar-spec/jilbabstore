"use client";
import { useEffect } from 'react';

// Pass `deps` (e.g. the filtered product list) so the observer re-attaches to
// newly rendered `.reveal` elements. Without this, content that appears after
// mount (e.g. after filtering) stays at opacity:0 — present but invisible.
export function useScrollReveal(deps = []) {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, {
      threshold: 0.1, // Trigger when 10% of the element is visible
      rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach((reveal) => {
      // Safety net: if the element is already within the viewport (common right
      // after a filter re-render), reveal it immediately so it can never get
      // stuck invisible while the observer settles.
      const rect = reveal.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        reveal.classList.add('active');
      }
      observer.observe(reveal);
    });

    return () => {
      reveals.forEach((reveal) => observer.unobserve(reveal));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
