"use client";
import { useEffect } from 'react';

export function useScrollReveal() {
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
      observer.observe(reveal);
    });

    return () => {
      reveals.forEach((reveal) => observer.unobserve(reveal));
    };
  }, []);
}
