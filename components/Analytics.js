'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// GA4 measurement ID — env-configurable, falls back to the existing property.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-2MZ6GCKN1H';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reflect cookie-consent changes into Google Consent Mode. The tag is always
  // present (so GA detects the connection), but analytics/ad storage stays
  // DENIED until the visitor accepts cookies — privacy-compliant.
  useEffect(() => {
    const apply = () => {
      if (typeof window.gtag !== 'function') return;
      const accepted = (() => { try { return localStorage.getItem('cookie_consent') === 'accepted'; } catch { return false; } })();
      window.gtag('consent', 'update', {
        analytics_storage: accepted ? 'granted' : 'denied',
        ad_storage: accepted ? 'granted' : 'denied',
        ad_user_data: accepted ? 'granted' : 'denied',
        ad_personalization: accepted ? 'granted' : 'denied',
      });
    };
    apply();
    window.addEventListener('cookie-consent-changed', apply);
    return () => window.removeEventListener('cookie-consent-changed', apply);
  }, []);

  // Track SPA route changes.
  useEffect(() => {
    if (!pathname || typeof window.gtag !== 'function') return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            // Consent Mode v2 — default to denied until the visitor accepts cookies.
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
            try {
              if (localStorage.getItem('cookie_consent') === 'accepted') {
                gtag('consent', 'update', { analytics_storage:'granted', ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted' });
              }
            } catch (e) {}
            gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
          `,
        }}
      />
    </>
  );
}
