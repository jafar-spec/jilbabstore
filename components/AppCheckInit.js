"use client";
import { useEffect } from 'react';
import { getApp, getApps } from 'firebase/app';

// Initializes Firebase App Check (reCAPTCHA v3) on BOTH Firebase apps — the
// customer (default) app and the 'staff' app — so that if App Check enforcement
// is enabled, neither the storefront nor the admin/courier panel is blocked.
// Safe no-op when the site key isn't set.
export default function AppCheckInit() {
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || typeof window === 'undefined') return;
    (async () => {
      try {
        const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
        const apps = [getApp(), getApps().find(a => a.name === 'staff')].filter(Boolean);
        for (const app of apps) {
          try {
            initializeAppCheck(app, {
              provider: new ReCaptchaV3Provider(siteKey),
              isTokenAutoRefreshEnabled: true,
            });
          } catch { /* already initialized for this app */ }
        }
      } catch (e) {
        // App Check SDK unavailable / unsupported environment — ignore.
      }
    })();
  }, []);
  return null;
}
