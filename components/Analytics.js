'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const GA_MEASUREMENT_ID = 'G-2MZ6GCKN1H';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Privacy-preserving: only load analytics after explicit cookie consent.
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    const check = () => setConsented(localStorage.getItem('cookie_consent') === 'accepted');
    check();
    window.addEventListener('cookie-consent-changed', check);
    return () => window.removeEventListener('cookie-consent-changed', check);
  }, []);

  useEffect(() => {
    if (consented && pathname && window.gtag) {
      const url = pathname + searchParams.toString();
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, consented]);

  if (!consented) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
