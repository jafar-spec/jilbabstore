"use client";
import { useEffect } from 'react';
import { getApp } from 'firebase/app';

// Initializes Firebase App Check (reCAPTCHA v3) on the customer app. Safe no-op
// if the site key isn't set. Enforcement is toggled separately in the Firebase
// console (App Check → enforce), so adding this can't break traffic on its own.
export default function AppCheckInit() {
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || typeof window === 'undefined') return;
    (async () => {
      try {
        const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
        initializeAppCheck(getApp(), {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        // Already initialized or unsupported environment — ignore.
      }
    })();
  }, []);
  return null;
}
